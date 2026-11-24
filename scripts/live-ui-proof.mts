/**
 * Browser-only proof driver for the live Colony deployment.
 *
 * Usage:
 *   node --import tsx scripts/live-ui-proof.mts party
 *   node --import tsx scripts/live-ui-proof.mts niche
 *   node --import tsx scripts/live-ui-proof.mts audit
 *
 * The only app traffic caused by this script is the app's own UI traffic.
 * Answer choices and Spider routes are computed from the checked-in catalog,
 * then typed/clicked into the rendered page. No direct gameplay API calls are
 * made by the driver.
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { ENTITY_SEEDS, entitySlug } from "../content/catalog/entities";
import { COUNTRIES } from "../content/catalog/countries";
import { PROMPTS } from "../content/catalog/prompts";
import { HOPPER_QUESTIONS } from "../content/catalog/hopper";
import { GRAPH_ENTITIES, GRAPH_EDGES } from "../content/catalog/graph";

const BASE = process.env.COLONY_LIVE_URL ?? "https://colony-csw.vercel.app";
const OUT = path.join(process.cwd(), "evidence", "ui-browser");
const HOST_NICK = "UIHost";
const GUEST_NICK = "UIGuest";

type Monitor = {
  label: string;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
};

type Attempt = {
  host: Page;
  guest: Page;
  hostContext: BrowserContext;
  guestContext: BrowserContext;
  hostMonitor: Monitor;
  guestMonitor: Monitor;
  cleanup: () => Promise<void>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const progress = (...args: unknown[]) => {
  const line = `[ui ${new Date().toISOString()}] ${args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`;
  console.error(line);
  appendFileSync("/tmp/ui-progress.log", `${line}\n`);
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Catalog-derived pools and routes
// ---------------------------------------------------------------------------

type Pool = { id: string; kind: "anthill" | "beehive"; text: string; names: string[]; uniqueNames: string[] };

type SeedEntity = {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  attrs: Record<string, string>;
};

function buildPools() {
  const entities: SeedEntity[] = [];
  const ids = new Set<string>();
  const add = (entity: SeedEntity) => {
    if (ids.has(entity.id)) return;
    ids.add(entity.id);
    entities.push(entity);
  };

  for (const entity of ENTITY_SEEDS) add({ ...entity });
  for (const [country, capital, continent, landlocked] of COUNTRIES) {
    add({
      id: `country_${entitySlug(country)}`,
      name: country,
      type: "country",
      aliases: [],
      attrs: { continent, landlocked: String(landlocked) },
    });
    add({
      id: `capital_${entitySlug(capital)}`,
      name: capital,
      type: "capital",
      aliases: [],
      attrs: { continent, country: `country_${entitySlug(country)}` },
    });
  }
  for (const entity of GRAPH_ENTITIES) {
    add({ id: entity.id, name: entity.name, type: entity.type, aliases: [], attrs: {} });
  }

  const byType = new Map<string, SeedEntity[]>();
  const nameCounts = new Map<string, number>();
  for (const entity of entities) {
    const key = normalize(entity.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    const list = byType.get(entity.type) ?? [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  const pools = new Map<string, Pool>();
  for (const prompt of PROMPTS) {
    let pool = byType.get(prompt.type) ?? [];
    for (const [key, value] of Object.entries(prompt.attrs ?? {})) {
      pool = pool.filter((entity) => entity.attrs[key] === value);
    }
    if (prompt.initial) {
      pool = pool.filter((entity) => entity.name.toUpperCase().startsWith(prompt.initial as string));
    }
    const seen = new Set<string>();
    pool = pool.filter((entity) => {
      const key = normalize(entity.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const names = pool.map((entity) => entity.name);
    pools.set(`${prompt.kind}:${prompt.text}`, {
      id: prompt.id,
      kind: prompt.kind,
      text: prompt.text,
      names,
      // A name that exists in another entity type can be reported as ambiguous
      // by the answer index. Prefer unique canonical names for UI answers.
      uniqueNames: names.filter((name) => (nameCounts.get(normalize(name)) ?? 0) === 1),
    });
  }
  return { pools, entities };
}

const { pools } = buildPools();

const NICHE_IDS = new Set([
  "anthill.country_north_america",
  "anthill.country_oceania",
  "anthill.capital_asia",
  "anthill.capital_africa",
  "anthill.capital_north_america",
  "anthill.capital_south_america",
  "anthill.dinosaur",
  "anthill.greek_figure",
  "anthill.flower",
  "anthill.tree",
  "anthill.gemstone",
  "anthill.game_console",
  "anthill.shakespeare_play",
  "anthill.bone",
  "anthill.moon",
  "anthill.volcano",
  "anthill.river",
  "anthill.mountain",
  "anthill.sea",
  "anthill.currency",
]);

function poolFor(kind: "anthill" | "beehive", text: string) {
  return pools.get(`${kind}:${text}`) ?? null;
}

type GraphPath = { names: string[]; ids: string[]; strands: number } | null;

function buildSpiderPath(startName: string, targetName: string): GraphPath {
  const names = new Map(GRAPH_ENTITIES.map((entity) => [entity.id, entity.name]));
  const idByName = new Map(GRAPH_ENTITIES.map((entity) => [entity.name, entity.id]));
  const start = idByName.get(startName);
  const target = idByName.get(targetName);
  if (!start || !target) return null;

  const adjacency = new Map<string, Set<string>>();
  for (const edge of GRAPH_EDGES) {
    const a = adjacency.get(edge.from) ?? new Set<string>();
    a.add(edge.to);
    adjacency.set(edge.from, a);
    if (edge.inverse) {
      const b = adjacency.get(edge.to) ?? new Set<string>();
      b.add(edge.from);
      adjacency.set(edge.to, b);
    }
  }

  const queue: string[][] = [[start]];
  const seen = new Set<string>([start]);
  while (queue.length) {
    const route = queue.shift()!;
    const last = route[route.length - 1];
    if (last === target) {
      return {
        ids: route,
        names: route.map((id) => names.get(id) ?? id),
        strands: route.length - 1,
      };
    }
    for (const next of adjacency.get(last) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...route, next]);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Browser state helpers
// ---------------------------------------------------------------------------

function attachMonitor(page: Page, label: string): Monitor {
  const monitor: Monitor = { label, consoleErrors: [], pageErrors: [], failedRequests: [], badResponses: [] };
  page.on("console", (message) => {
    if (message.type() === "error") monitor.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => monitor.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request failed";
    if (failure.includes("ERR_ABORTED")) return;
    monitor.failedRequests.push(`${request.method()} ${request.url()} — ${failure}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      monitor.badResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return monitor;
}

async function newAttempt(
  browser: Browser,
  opts: { hostViewport: { width: number; height: number }; guestViewport: { width: number; height: number } },
): Promise<Attempt> {
  const hostContext = await browser.newContext({ viewport: opts.hostViewport, locale: "en-US" });
  const guestContext = await browser.newContext({ viewport: opts.guestViewport, locale: "en-US" });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const hostMonitor = attachMonitor(host, "host");
  const guestMonitor = attachMonitor(guest, "guest");
  return {
    host,
    guest,
    hostContext,
    guestContext,
    hostMonitor,
    guestMonitor,
    cleanup: async () => {
      await hostContext.close().catch(() => undefined);
      await guestContext.close().catch(() => undefined);
    },
  };
}

async function waitFor(check: () => Promise<boolean>, timeout: number, message: string) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch {
      // The page may be between renders or navigations.
    }
    await sleep(200);
  }
  throw new Error(`Timed out: ${message}`);
}

async function bodyText(page: Page) {
  return page.locator("body").innerText();
}

async function waitForText(page: Page, text: string, timeout = 20_000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
}

async function overflowSnapshot(page: Page, label: string) {
  return page.evaluate((name) => {
    const viewportWidth = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className.slice(0, 100) : "",
          text: (element.textContent ?? "").trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter((entry) => entry.right > viewportWidth + 1 || entry.left < -1)
      .slice(0, 8);
    return { label: name, viewportWidth, scrollWidth, overflow: scrollWidth > viewportWidth + 1, elements };
  }, label);
}

async function zineSnapshot(page: Page, label: string) {
  return page.evaluate((name) => {
    const h1 = document.querySelector("h1");
    const card = document.querySelector(".prompt-card, main .card");
    const bodyStyle = getComputedStyle(document.body);
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const cardStyle = card ? getComputedStyle(card) : null;
    return {
      label: name,
      bodyBackground: bodyStyle.backgroundColor,
      h1FontFamily: h1Style?.fontFamily ?? null,
      cardBorderWidth: cardStyle?.borderTopWidth ?? null,
      cardBoxShadow: cardStyle?.boxShadow ?? null,
      promptCard: Boolean(document.querySelector(".prompt-card")),
    };
  }, label);
}

function errorsOf(monitor: Monitor) {
  return {
    consoleErrors: monitor.consoleErrors,
    pageErrors: monitor.pageErrors,
    failedRequests: monitor.failedRequests,
    badResponses: monitor.badResponses,
  };
}

// ---------------------------------------------------------------------------
// UI actions
// ---------------------------------------------------------------------------

async function createRoom(
  page: Page,
  settings: { nickname: string; mode: "party" | "anthill"; rounds: number; spiderSeconds?: number; hopperSeconds?: number },
) {
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await page.getByLabel("Your nickname").fill(settings.nickname);
  if (settings.mode === "anthill") {
    await page.locator("button.mode-card").filter({ hasText: "Anthill" }).first().click();
  }
  await page.locator('input[type="number"]').first().fill(String(settings.rounds));
  if (settings.mode === "party") {
    await page.locator("select").nth(0).selectOption(String(settings.spiderSeconds ?? 60));
    await page.locator("select").nth(1).selectOption(String(settings.hopperSeconds ?? 15));
  }
  await page.getByRole("button", { name: "Create room" }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 20_000 });
  const code = page.url().split("/room/")[1].split(/[/?#]/)[0].toUpperCase();
  await waitForText(page, "Room code", 20_000);
  return code;
}

async function joinRoom(page: Page, code: string, nickname: string) {
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await page.getByLabel("Room code").fill(code);
  await page.getByLabel("Nickname").fill(nickname);
  const join = page.getByRole("button", { name: "Join room" });
  // Wait for React's submit handler, then retry once if the form did a native GET.
  await page.waitForTimeout(500);
  await join.click();
  try {
    await page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 12_000 });
  } catch {
    await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
    await page.getByLabel("Room code").fill(code);
    await page.getByLabel("Nickname").fill(nickname);
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Join room" }).click();
    await page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 20_000 });
  }
  await waitForText(page, "Players", 20_000);
}

async function startMatch(host: Page, guest: Page) {
  await waitFor(async () => (await bodyText(host)).includes("Players"), 20_000, "host lobby");
  await waitFor(async () => (await bodyText(host)).includes(GUEST_NICK), 20_000, "guest in host lobby");
  const ready = guest.getByRole("button", { name: "I'm ready" });
  await ready.waitFor({ state: "visible", timeout: 20_000 });
  await ready.click();
  await waitFor(
    async () => (await guest.locator('button[aria-pressed="true"]').count()) > 0,
    10_000,
    "guest ready",
  );
  await waitFor(async () => {
    const button = host.getByRole("button", { name: "Start match" });
    return (await button.count()) > 0 && (await button.first().isEnabled());
  }, 20_000, "Start match enabled");
  await host.getByRole("button", { name: "Start match" }).click();
  await waitFor(async () => /round 1 of/i.test(await bodyText(host)), 20_000, "round one countdown");
}

async function activeMode(page: Page): Promise<string | null> {
  const checks: Array<[string, string]> = [
    ["spider", 'input[placeholder*="Search an entity"]'],
    ["hopper", "#hopper-answer"],
    ["beehive", "#beehive-answer"],
    ["anthill", "#anthill-answer"],
  ];
  for (const [mode, selector] of checks) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) return mode;
  }
  return null;
}

async function waitForMode(page: Page, timeout = 35_000): Promise<string> {
  let result: string | null = null;
  await waitFor(async () => {
    const body = await bodyText(page);
    if (body.toLowerCase().includes("final match results")) {
      result = "final";
      return true;
    }
    if (/round \d+ results/i.test(body)) {
      result = "results";
      return true;
    }
    result = await activeMode(page);
    return !!result;
  }, timeout, "active minigame or results");
  return result!;
}

async function waitForResults(page: Page, timeout = 45_000, expectedRound?: number) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const body = await bodyText(page).catch(() => "");
    const match = body.match(/round (\d+) results/i);
    if (match) {
      const current = Number(match[1]);
      if (expectedRound && current > expectedRound) {
        throw new Error(`Skipped round ${expectedRound} results; page is on round ${current} results`);
      }
      return;
    }
    await sleep(200);
  }
  throw new Error(`Timed out: round results (expected round ${expectedRound ?? "?"})`);
}

async function readResults(page: Page) {
  const heading = await page
    .locator("h2")
    .filter({ hasText: /^(Anthill|Beehive|Spider Web|Hopper)$/ })
    .first()
    .innerText()
    .catch(() => "");
  const podium = await page.locator(".podium-row").allInnerTexts();
  return { heading, podium };
}

async function clickContinue(host: Page) {
  const button = host.getByRole("button", { name: "Continue now" });
  await button.waitFor({ state: "visible", timeout: 20_000 });
  await waitFor(async () => button.first().isEnabled(), 20_000, "Continue now enabled");
  await button.click();
}

async function submitAnthill(page: Page, pool: string[], target = 5) {
  const input = page.locator("#anthill-answer");
  const submit = page.locator("form.answer-form button[type=submit]");
  let accepted = 0;
  let attempts = 0;
  const acceptedNames: string[] = [];
  for (const candidate of pool) {
    if (accepted >= target || attempts >= 14) break;
    attempts += 1;
    const before = await page.locator(".answer-row").count();
    await input.fill(candidate);
    await submit.click();
    await page.waitForTimeout(1_100);
    const after = await page.locator(".answer-row").count();
    if (after > before) {
      accepted += 1;
      acceptedNames.push(candidate);
    }
  }
  return { accepted, attempts, acceptedNames };
}

async function submitHopper(page: Page, questionText: string) {
  const question = HOPPER_QUESTIONS.find((entry) => entry.text === questionText);
  if (!question) throw new Error(`No local Hopper question for: ${questionText}`);
  const input = page.locator("#hopper-answer");
  const submit = page.locator("form.answer-form button[type=submit]");
  const candidates = question.buckets.map((bucket) => bucket.canonical);
  let saved = "";
  for (const candidate of candidates) {
    await input.fill(candidate);
    await submit.click();
    await page.waitForTimeout(1_000);
    const notice = await page.locator(".notice").first().innerText().catch(() => "");
    if (notice.includes("Saved:")) {
      saved = notice;
      break;
    }
  }
  return { saved, bucketCount: candidates.length };
}

async function findBeehiveTurn(host: Page, guest: Page) {
  let active: Page | null = null;
  await waitFor(async () => {
    for (const page of [host, guest]) {
      const input = page.locator("#beehive-answer");
      if ((await input.count()) === 0 || !(await input.isEnabled().catch(() => false))) continue;
      const notice = await page.locator(".notice").first().innerText().catch(() => "");
      if (!notice.toLowerCase().includes("your turn")) continue;
      active = page;
      return true;
    }
    return false;
  }, 20_000, "Beehive active turn");
  return active!;
}

async function submitBeehive(page: Page, pool: string[]) {
  const input = page.locator("#beehive-answer");
  const submit = page.locator("form.answer-form button[type=submit]");
  let accepted = false;
  let used = await page.locator(".answer-list .answer-row").count().catch(() => 0);
  let usedName = "";
  for (const candidate of pool.slice(0, 12)) {
    if (!(await input.isEnabled().catch(() => false))) break;
    await input.fill(candidate);
    await page.waitForTimeout(250);
    if (await submit.isDisabled().catch(() => true)) continue;
    await submit.click({ timeout: 7_000 }).catch(() => undefined);
    await page.waitForTimeout(1_400);
    const usedCount = await page.locator(".answer-list .answer-row").count();
    if (usedCount > used) {
      accepted = true;
      used = usedCount;
      usedName = candidate;
      break;
    }
  }
  return { accepted, used, usedName };
}

async function addSpiderNode(page: Page, name: string) {
  const search = page.locator('input[placeholder*="Search an entity"]');
  await search.waitFor({ state: "visible", timeout: 10_000 });
  await waitFor(async () => search.isEnabled().catch(() => false), 15_000, `Spider search enabled for ${name}`);
  progress(`spider type ${name}`);
  await search.fill(name);
  await page.locator(".suggestion").first().waitFor({ state: "visible", timeout: 12_000 });
  const suggestions = page.locator(".suggestion");
  const count = await suggestions.count();
  let clicked = false;
  for (let index = 0; index < count; index += 1) {
    const label = (await suggestions.nth(index).locator("strong").innerText().catch(() => "")).trim();
    if (normalize(label) === normalize(name)) {
      await suggestions.nth(index).click();
      clicked = true;
      break;
    }
  }
  if (!clicked) throw new Error(`No exact Spider suggestion for ${name}; saw ${await suggestions.allInnerTexts()}`);
  await page.waitForTimeout(350);
  progress(`spider added ${name}; chain=${JSON.stringify(await page.locator(".chain-node").allInnerTexts())}`);
}

async function playSpider(page: Page) {
  const prompt = await page.locator(".prompt-text").innerText();
  const [start, target] = prompt.split("→").map((part) => part.trim());
  if (!start || !target) throw new Error(`Could not read Spider prompt: ${prompt}`);
  const route = buildSpiderPath(start, target);
  if (!route) throw new Error(`No local Spider route for ${start} -> ${target}`);
  progress(`spider route ${route.names.join(" -> ")}`);
  for (const node of route.names.slice(1)) {
    await addSpiderNode(page, node);
  }
  await page.waitForTimeout(1_000);
  const feedback = await page.locator(".feedback").last().innerText().catch(() => "");
  const chain = await page.locator(".chain-node").allInnerTexts();
  return { start, target, route: route.names, strands: route.strands, feedback, chain };
}

async function playPartyMatch(attempt: Attempt) {
  const { host, guest } = attempt;
  const result: {
    code?: string;
    rounds: Array<Record<string, unknown>>;
    final?: Record<string, unknown>;
    nicheInParty: boolean;
    lobbyOverflow: unknown;
  } = { rounds: [], nicheInParty: false };

  await createRoom(host, { nickname: HOST_NICK, mode: "party", rounds: 4, spiderSeconds: 60, hopperSeconds: 15 });
  const code = host.url().split("/room/")[1].split(/[/?#]/)[0].toUpperCase();
  result.code = code;
  await joinRoom(guest, code, GUEST_NICK);
  await waitForText(host, GUEST_NICK, 15_000);
  result.lobbyOverflow = await overflowSnapshot(host, "party-lobby-desktop");
  await screenshot(host, "party-lobby-desktop.png");
  await startMatch(host, guest);

  toast: for (let roundIndex = 1; roundIndex <= 4; roundIndex += 1) {
    const mode = await waitForMode(host, 35_000);
    if (mode === "results") throw new Error(`Round ${roundIndex} entered results before active play`);
    if (mode === "final") break;
    progress(`round ${roundIndex} active: ${mode}`);
    const promptText = await host.locator(".prompt-text").innerText();
    const round: Record<string, unknown> = { index: roundIndex, mode, prompt: promptText };
    const nicheInfo = mode === "anthill" ? poolFor("anthill", promptText) : null;
    round.promptId = nicheInfo?.id ?? null;
    round.nichePrompt = nicheInfo ? NICHE_IDS.has(nicheInfo.id) : false;
    round.poolSize = nicheInfo?.names.length ?? null;
    if (round.nichePrompt) result.nicheInParty = true;
    await screenshot(host, `party-round-${roundIndex}-${mode}.png`);

    if (mode === "anthill") {
      const pool = poolFor("anthill", promptText);
      if (!pool) throw new Error(`No local Anthill pool for: ${promptText}`);
      const [hostAnswers, guestAnswers] = await Promise.all([
        submitAnthill(host, pool.uniqueNames),
        submitAnthill(guest, [...pool.uniqueNames].reverse()),
      ]);
      round.hostAnswers = hostAnswers;
      round.guestAnswers = guestAnswers;
      round.poolCount = pool.names.length;
    } else if (mode === "beehive") {
      const pool = poolFor("beehive", promptText);
      if (!pool) throw new Error(`No local Beehive pool for: ${promptText}`);
      let active = await findBeehiveTurn(host, guest);
      let answer = await submitBeehive(active, pool.uniqueNames);
      if (!answer.accepted) {
        active = await findBeehiveTurn(host, guest);
        answer = await submitBeehive(active, pool.uniqueNames);
      }
      const activeName = active === host ? "host" : "guest";
      round.active = activeName;
      round.beehiveAnswer = answer;
      round.poolCount = pool.names.length;
    } else if (mode === "hopper") {
      const hostAnswer = await submitHopper(host, promptText);
      const guestAnswer = await submitHopper(guest, promptText);
      round.hostAnswer = hostAnswer;
      round.guestAnswer = guestAnswer;
    } else if (mode === "spider") {
      const t0 = Date.now();
      const [hostPath, guestPath] = await Promise.all([playSpider(host), playSpider(guest)]);
      round.hostPath = hostPath;
      round.guestPath = guestPath;
      progress(`spider play completed in ${Date.now() - t0}ms`);
    }

    progress(`round ${roundIndex} waiting for results`);
    await waitForResults(host, 50_000, roundIndex);
    await screenshot(host, `party-results-${roundIndex}.png`);
    result.rounds.push({ ...round, results: await readResults(host) });
    await clickContinue(host);
    if (roundIndex < 4) {
      await waitFor(
        async () => new RegExp(`round ${roundIndex + 1} of`, "i").test(await bodyText(host)),
        25_000,
        `round ${roundIndex + 1} countdown`,
      );
    }
  }

  await waitForText(host, "Favorite mode", 20_000);
  const hostVote = host.locator('section[aria-labelledby="vote-heading"]').getByRole("button").first();
  await hostVote.click().catch(() => undefined);
  await waitForText(guest, "Favorite mode", 20_000);
  const guestVote = guest.locator('section[aria-labelledby="vote-heading"]').getByRole("button").first();
  await guestVote.click().catch(() => undefined);

  await waitForText(host, "Final match results", 30_000);
  await waitForText(guest, "Final match results", 30_000);
  await screenshot(host, "party-final-host.png");
  await screenshot(guest, "party-final-guest.png");
  const hostFinal = await host.locator(".podium-row").allInnerTexts();
  const guestFinal = await guest.locator(".podium-row").allInnerTexts();
  result.final = {
    host: hostFinal,
    guest: guestFinal,
    hostText: (await bodyText(host)).slice(0, 4_000),
    guestText: (await bodyText(guest)).slice(0, 4_000),
  };
  return result;
}

async function pageWaitForInactiveTurn(host: Page, guest: Page) {
  // A completed Beehive turn hands the turn to the other player. The inactive
  // page's input is disabled; the round will settle after that turn times out.
  await waitFor(
    async () => {
      const hostEnabled = await host.locator("#beehive-answer").isEnabled().catch(() => false);
      const guestEnabled = await guest.locator("#beehive-answer").isEnabled().catch(() => false);
      return !hostEnabled && !guestEnabled;
    },
    25_000,
    "both Beehive inputs inactive after the completed turn",
  ).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Niche-room proof
// ---------------------------------------------------------------------------

async function playNicheMatch(browser: Browser) {
  const diagnostics: Array<Record<string, unknown>> = [];
  for (let attemptIndex = 1; attemptIndex <= 8; attemptIndex += 1) {
    const attempt = await newAttempt(browser, {
      hostViewport: { width: 390, height: 844 },
      guestViewport: { width: 1440, height: 1000 },
    });
    try {
      await createRoom(attempt.host, { nickname: HOST_NICK, mode: "anthill", rounds: 1 });
      const code = attempt.host.url().split("/room/")[1].split(/[/?#]/)[0].toUpperCase();
      await joinRoom(attempt.guest, code, GUEST_NICK);
      await waitForText(attempt.host, GUEST_NICK, 15_000);
      const lobbyOverflow = await overflowSnapshot(attempt.host, `niche-lobby-mobile-attempt-${attemptIndex}`);
      await screenshot(attempt.host, `niche-lobby-mobile-attempt-${attemptIndex}.png`);
      await startMatch(attempt.host, attempt.guest);
      const mode = await waitForMode(attempt.host, 25_000);
      if (mode !== "anthill") throw new Error(`Niche room opened as ${mode}, expected Anthill`);
      const promptText = await attempt.host.locator(".prompt-text").innerText();
      const pool = poolFor("anthill", promptText);
      diagnostics.push({
        attempt: attemptIndex,
        code,
        prompt: promptText,
        promptId: pool?.id ?? null,
        niche: pool ? NICHE_IDS.has(pool.id) : false,
        poolSize: pool?.names.length ?? null,
      });
      if (!pool || !NICHE_IDS.has(pool.id)) {
        await attempt.cleanup();
        continue;
      }

      const activeOverflow = await overflowSnapshot(attempt.host, "niche-active-mobile");
      const activeZine = await zineSnapshot(attempt.host, "niche-active-mobile");
      await screenshot(attempt.host, "niche-active-mobile.png");
      const [hostAnswers, guestAnswers] = await Promise.all([
        submitAnthill(attempt.host, pool.uniqueNames),
        submitAnthill(attempt.guest, [...pool.uniqueNames].reverse()),
      ]);
      await waitForResults(attempt.host, 50_000);
      await screenshot(attempt.host, "niche-results-mobile.png");
      const results = await readResults(attempt.host);
      await clickContinue(attempt.host);
      await waitForText(attempt.host, "Final match results", 25_000);
      await waitForText(attempt.guest, "Final match results", 25_000);
      const finalOverflow = await overflowSnapshot(attempt.host, "niche-final-mobile");
      await screenshot(attempt.host, "niche-final-mobile.png");
      const hostFinal = await attempt.host.locator(".podium-row").allInnerTexts();
      const guestFinal = await attempt.guest.locator(".podium-row").allInnerTexts().catch(() => []);
      return {
        code,
        prompt: promptText,
        promptId: pool.id,
        poolSize: pool.names.length,
        niche: true,
        attempts: attemptIndex,
        diagnostics,
        lobbyOverflow,
        activeOverflow,
        activeZine,
        finalOverflow,
        hostAnswers,
        guestAnswers,
        results,
        final: hostFinal,
        guestFinal,
        monitors: {
          host: errorsOf(attempt.hostMonitor),
          guest: errorsOf(attempt.guestMonitor),
        },
      };
    } finally {
      // The successful branch returns before cleanup so the caller can read
      // nothing from closed pages; evidence has already been written.
      if (diagnostics.length && diagnostics[diagnostics.length - 1]?.attempt === attemptIndex) {
        const chosen = diagnostics[diagnostics.length - 1]?.niche === true;
        if (!chosen) await attempt.cleanup();
      }
    }
  }
  throw new Error(`No niche Anthill prompt appeared after 8 rooms: ${JSON.stringify(diagnostics)}`);
}

// ---------------------------------------------------------------------------
// Static UI audit
// ---------------------------------------------------------------------------

async function staticAudit(browser: Browser) {
  const pages = [
    { path: "/create", expected: "Create a room" },
    { path: "/join", expected: "Join a room" },
    { path: "/how-to-play", expected: "How to play" },
  ];
  const results: Array<Record<string, unknown>> = [];

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    for (const entry of pages) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const monitor = attachMonitor(page, `${viewport.name}${entry.path}`);
      try {
        await page.goto(`${BASE}${entry.path}`, { waitUntil: "domcontentloaded" });
        await waitForText(page, entry.expected, 20_000);
        await page.waitForTimeout(500);
        const overflow = await overflowSnapshot(page, `${viewport.name}${entry.path}`);
        const zine = await zineSnapshot(page, `${viewport.name}${entry.path}`);
        const text = await bodyText(page);
        await screenshot(page, `static-${viewport.name}-${entry.path.replaceAll("/", "-")}.png`);
        results.push({
          path: entry.path,
          viewport: viewport.name,
          bodyHasExpected: text.includes(entry.expected),
          overflow,
          zine,
          errors: errorsOf(monitor),
        });
      } finally {
        await context.close();
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const command = process.argv[2] ?? "party";
  try {
    if (command === "party") {
      const attempt = await newAttempt(browser, {
        hostViewport: { width: 1440, height: 1000 },
        guestViewport: { width: 1440, height: 1000 },
      });
      try {
        const party = await playPartyMatch(attempt);
        const summary = {
          generatedAt: new Date().toISOString(),
          base: BASE,
          command,
          party,
          checks: {
            host: errorsOf(attempt.hostMonitor),
            guest: errorsOf(attempt.guestMonitor),
          },
        };
        writeFileSync(path.join(OUT, "party-summary.json"), JSON.stringify(summary, null, 2));
        console.log(JSON.stringify(summary, null, 2));
      } finally {
        await attempt.cleanup();
      }
    } else if (command === "niche") {
      const niche = await playNicheMatch(browser);
      const summary = {
        generatedAt: new Date().toISOString(),
        base: BASE,
        command,
        niche,
      };
      writeFileSync(path.join(OUT, "niche-summary.json"), JSON.stringify(summary, null, 2));
      console.log(JSON.stringify(summary, null, 2));
    } else if (command === "audit") {
      const audit = await staticAudit(browser);
      const summary = { generatedAt: new Date().toISOString(), base: BASE, command, audit };
      writeFileSync(path.join(OUT, "static-audit.json"), JSON.stringify(summary, null, 2));
      console.log(JSON.stringify(summary, null, 2));
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
