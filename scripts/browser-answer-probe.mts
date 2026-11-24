/**
 * Real-browser probe for the Anthill answer box.
 *
 * Opens a live two-player Anthill room in Chromium and measures:
 *  - how long the server-rendered room takes to become interactive,
 *  - keystroke-to-paint latency and correctness while SSE snapshots arrive,
 *  - focus/caret stability across those snapshots,
 *  - time from submit to visible acknowledgement and to a verdict,
 *  - recovery of the input after a rejected and a duplicate answer.
 *
 * Usage: BASE_URL=https://colony-csw.vercel.app npx tsx scripts/browser-answer-probe.mts
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import { HISTORY_GROUPS, HISTORY_PROMPTS } from "../content/catalog/history";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const hostUrl = new URL(base);

type Jar = { cookie: string };

async function api(jar: Jar, path: string, init: RequestInit = {}) {
  const res = await fetch(base + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(jar.cookie ? { cookie: jar.cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) jar.cookie = setCookie.split(";")[0];
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function answersFor(promptText: string): string[] {
  const prompt = HISTORY_PROMPTS.find((entry) => entry.text === promptText);
  if (!prompt) return [];
  const group = (HISTORY_GROUPS as Record<string, { answers: string[] }>)[prompt.group];
  return (group?.answers ?? []).map((raw) => raw.split("|")[0]);
}

type Room = {
  code: string;
  host: Jar;
  second: Jar;
  promptText: string;
  answers: string[];
  roundId: string;
  startAt: number;
};

async function openMatch(): Promise<Room> {
  const host: Jar = { cookie: "" };
  const second: Jar = { cookie: "" };
  const created = await api(host, "/api/rooms", {
    method: "POST",
    body: JSON.stringify({ nickname: "Hostie", settings: { mode: "anthill", rounds: 1, packs: ["world_history"] } }),
  });
  if (created.status !== 201) throw new Error(`create failed ${created.status}`);
  const code = created.body.roomCode as string;
  await api(second, `/api/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ code, nickname: "Second" }),
  });
  await api(second, `/api/rooms/${code}/intent`, {
    method: "POST",
    body: JSON.stringify({ requestId: `ready-${Date.now()}`, intent: { type: "room:ready", ready: true } }),
  });
  const started = await api(host, `/api/rooms/${code}/intent`, {
    method: "POST",
    body: JSON.stringify({ requestId: `start-${Date.now()}`, intent: { type: "match:start" } }),
  });
  if (started.status !== 200) throw new Error(`start failed ${JSON.stringify(started.body)}`);

  let snapshot: any = null;
  const waitStart = Date.now();
  while (Date.now() - waitStart < 20000) {
    const state = await api(host, `/api/rooms/${code}/state`);
    snapshot = state.body?.snapshot;
    if (snapshot?.round?.phase === "active") break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (snapshot?.round?.phase !== "active") throw new Error("round never became active");
  const promptText = String(snapshot.round.prompt.text);
  return {
    code,
    host,
    second,
    promptText,
    answers: answersFor(promptText),
    roundId: String(snapshot.round.id),
    startAt: Date.now(),
  };
}

async function contextFor(browser: Awaited<ReturnType<typeof chromium.launch>>, jar: Jar): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const value = jar.cookie.replace(/^colony_guest=/, "");
  await context.addCookies([
    {
      name: "colony_guest",
      value,
      domain: hostUrl.hostname,
      path: "/",
      httpOnly: true,
      secure: hostUrl.protocol === "https:",
      sameSite: "Lax",
    },
  ]);
  return context;
}

const INSTRUMENT = () => {
  const w = window as unknown as Record<string, unknown>;
  w.__snapshots = 0;
  w.__lastSnapshotAt = 0;
  w.__keys = [];
  w.__long = [];
  const origAdd = EventSource.prototype.addEventListener;
  EventSource.prototype.addEventListener = function (type: string, listener: never, opts?: never) {
    if (type === "snapshot") {
      const wrapped = (event: Event) => {
        (window as unknown as Record<string, number>).__snapshots =
          ((window as unknown as Record<string, number>).__snapshots ?? 0) + 1;
        (window as unknown as Record<string, number>).__lastSnapshotAt = performance.now();
        return (listener as unknown as (e: Event) => void).call(this, event);
      };
      return origAdd.call(this, type, wrapped as never, opts);
    }
    return origAdd.call(this, type, listener, opts);
  };

  document.addEventListener(
    "keydown",
    (event) => {
      const input = document.getElementById("anthill-answer") as HTMLInputElement | null;
      if (!input || document.activeElement !== input) return;
      const at = performance.now();
      requestAnimationFrame(() => {
        const keys = (window as unknown as Record<string, unknown>).__keys as unknown[];
        keys.push({
          at,
          frame: performance.now() - at,
          key: (event as KeyboardEvent).key,
          value: input.value,
          caret: input.selectionStart,
          active: document.activeElement?.id || document.activeElement?.tagName || null,
        });
      });
    },
    true,
  );

  try {
    new PerformanceObserver((list) => {
      const target = (window as unknown as Record<string, unknown>).__long as unknown[];
      for (const entry of list.getEntries()) target.push({ at: entry.startTime, ms: Math.round(entry.duration) });
    }).observe({ entryTypes: ["longtask"] });
  } catch {
    /* older engines */
  }
};

type ConsoleProblem = { type: string; text: string };

async function openRoom(browser: Awaited<ReturnType<typeof chromium.launch>>, jar: Jar, code: string) {
  const context = await contextFor(browser, jar);
  const page = await context.newPage();
  const problems: ConsoleProblem[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push({ type: message.type(), text: message.text().slice(0, 300) });
    }
  });
  page.on("pageerror", (error) => problems.push({ type: "pageerror", text: error.message.slice(0, 300) }));
  await context.addInitScript(INSTRUMENT);

  const navigationStarted = Date.now();
  await page.goto(`${base}/room/${code}`, { waitUntil: "commit" });

  // The room is server-rendered, so the input can be in the DOM long before React
  // is listening. A click on the sound toggle only sticks once hydration is done.
  const interactiveMs = await (async () => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const clicked = await page
        .evaluate(() => {
          const button = [...document.querySelectorAll("button")].find((entry) =>
            /sound/i.test(entry.textContent ?? ""),
          ) as HTMLButtonElement | undefined;
          if (!button) return null;
          button.click();
          return button.textContent ?? "";
        })
        .catch(() => null);
      if (clicked === null) {
        await page.waitForTimeout(25);
        continue;
      }
      await page.waitForTimeout(30);
      const flipped = await page
        .evaluate(() => {
          const button = [...document.querySelectorAll("button")].find((entry) =>
            /sound/i.test(entry.textContent ?? ""),
          );
          return /sound on/i.test(button?.textContent ?? "");
        })
        .catch(() => false);
      if (flipped) return Date.now() - navigationStarted;
      await page.waitForTimeout(40);
    }
    return -1;
  })();

  // Leave the toggle off so audio never plays during measurements.
  await page
    .evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((entry) =>
        /sound on/i.test(entry.textContent ?? ""),
      ) as HTMLButtonElement | undefined;
      button?.click();
    })
    .catch(() => undefined);

  return { context, page, problems, interactiveMs };
}

async function waitForInput(page: Page, timeout = 20_000) {
  await page.waitForSelector("#anthill-answer", { state: "visible", timeout });
  await page.waitForFunction(
    () => document.querySelector("#anthill-answer") !== null && document.readyState === "complete",
    undefined,
    { timeout },
  );
}

async function typeAndMeasure(page: Page, text: string) {
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__keys = [];
  });
  const started = Date.now();
  await page.type("#anthill-answer", text, { delay: 45 });
  const typedMs = Date.now() - started;
  const result = await page.evaluate(() => {
    const input = document.getElementById("anthill-answer") as HTMLInputElement;
    const keys = (window as unknown as Record<string, unknown>).__keys as Array<{
      at: number;
      frame: number;
      key: string;
      value: string;
      caret: number | null;
      active: string | null;
    }>;
    const frames = keys.map((entry) => entry.frame).sort((a, b) => a - b);
    return {
      value: input.value,
      caret: input.selectionStart,
      active: document.activeElement?.id || null,
      keystrokes: keys.length,
      frameLatency: {
        p50: frames[Math.floor(frames.length / 2)] ?? null,
        p95: frames[Math.floor(frames.length * 0.95)] ?? null,
        max: frames[frames.length - 1] ?? null,
      },
      lostFocus: keys.filter((entry) => entry.active !== "anthill-answer").length,
      caretJumps: keys.filter((entry) => entry.caret !== entry.value.length).length,
      snapshots: (window as unknown as Record<string, number>).__snapshots,
      longs: ((window as unknown as Record<string, unknown>).__long as Array<{ at: number; ms: number }>) ?? [],
    };
  });
  return { typedMs, ...result };
}

const RUN = Number(process.env.CYCLES ?? 1);
const out: Record<string, unknown> = { base, cycles: RUN };

const browser = await chromium.launch();

try {
  for (let cycle = 0; cycle < RUN; cycle += 1) {
    // ---------------------------------------------------------------- hydration
    const roomA = await openMatch();
    const a = await openRoom(browser, roomA.host, roomA.code);
    await waitForInput(a.page);
    // Force a fresh navigation to measure from a cold HTML response, reusing the
    // same room so the server-rendered room already has an active round.
    await a.page.goto(`${base}/room/${roomA.code}`, { waitUntil: "commit" });
    const navStart = Date.now();
    const interactive = await (async () => {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const clicked = await a.page
          .evaluate(() => {
            const button = [...document.querySelectorAll("button")].find((entry) =>
              /sound/i.test(entry.textContent ?? ""),
            ) as HTMLButtonElement | undefined;
            if (!button) return null;
            button.click();
            return true;
          })
          .catch(() => null);
        if (clicked === null) {
          await a.page.waitForTimeout(25);
          continue;
        }
        await a.page.waitForTimeout(30);
        const flipped = await a.page
          .evaluate(() => {
            const button = [...document.querySelectorAll("button")].find((entry) =>
              /sound/i.test(entry.textContent ?? ""),
            );
            return /sound on/i.test(button?.textContent ?? "");
          })
          .catch(() => false);
        if (flipped) return Date.now() - navStart;
        await a.page.waitForTimeout(40);
      }
      return -1;
    })();
    await a.page
      .evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((entry) =>
          /sound on/i.test(entry.textContent ?? ""),
        ) as HTMLButtonElement | undefined;
        button?.click();
      })
      .catch(() => undefined);

    await waitForInput(a.page);
    await a.page.click("#anthill-answer");

    // --------------------------------------------------------- idle typing
    const idleTyping = await typeAndMeasure(a.page, "abcdefghijklmnop");
    await a.page.evaluate(() => {
      const input = document.getElementById("anthill-answer") as HTMLInputElement;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await a.page.waitForTimeout(120);

    // -------------------------------------------------- typing under snapshots
    const secondOut = roomA.second;
    let submitting = true;
    const flood = (async () => {
      let index = 0;
      while (submitting) {
        const answer = roomA.answers[index % Math.max(1, roomA.answers.length)];
        await api(secondOut, `/api/rooms/${roomA.code}/intent`, {
          method: "POST",
          body: JSON.stringify({
            requestId: `flood-${index}-${Date.now()}`,
            intent: { type: "answer:submit", text: answer, roundId: roomA.roundId },
          }),
        });
        index += 1;
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
    })();
    await a.page.waitForTimeout(250);
    const beforeSnapshots = await a.page.evaluate(
      () => (window as unknown as Record<string, number>).__snapshots ?? 0,
    );
    const streamingTyping = await typeAndMeasure(a.page, "zyxwvutsrqponmlkj");
    const afterSnapshots = await a.page.evaluate(
      () => (window as unknown as Record<string, number>).__snapshots ?? 0,
    );
    submitting = false;
    await flood;

    // ------------------------------------------------- submit acknowledgement
    await a.page.evaluate(() => {
      const input = document.getElementById("anthill-answer") as HTMLInputElement;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    });
    await a.page.waitForTimeout(80);
    const submitStart = Date.now();
    await a.page.type("#anthill-answer", "qqq not a real answer");
    await a.page.press("#anthill-answer", "Enter");
    const pendingMs = await a.page
      .waitForSelector(".answer-card.is-pending", { timeout: 3000 })
      .then(() => Date.now() - submitStart)
      .catch(() => -1);
    const clearedMs = await a.page
      .waitForFunction(() => (document.getElementById("anthill-answer") as HTMLInputElement).value === "", undefined, {
        timeout: 3000,
      })
      .then(() => Date.now() - submitStart)
      .catch(() => -1);
    const verdictMs = await a.page
      .waitForSelector(".answer-card.is-rejected", { timeout: 15_000 })
      .then(() => Date.now() - submitStart)
      .catch(() => -1);
    const rejectedText = await a.page
      .locator(".answer-card.is-rejected .answer-speech")
      .first()
      .textContent()
      .catch(() => null);

    // -------------------------------------------------- recovery after verdict
    const recovery = await typeAndMeasure(a.page, "recovered");

    // ------------------------------------------------- duplicate answer restore
    await a.page.evaluate(() => {
      const input = document.getElementById("anthill-answer") as HTMLInputElement;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    });
    await a.page.type("#anthill-answer", roomA.answers[0], { delay: 10 });
    const dupStart = Date.now();
    await a.page.press("#anthill-answer", "Enter");
    const dupVerdictMs = await a.page
      .waitForSelector(".answer-card.is-rejected", { timeout: 15_000 })
      .then(() => Date.now() - dupStart)
      .catch(() => -1);
    await a.page.waitForTimeout(120);
    const afterDup = await a.page.evaluate(() => {
      const input = document.getElementById("anthill-answer") as HTMLInputElement;
      return { value: input.value, active: document.activeElement?.id ?? null };
    });

    out[`cycle${cycle}`] = {
      room: roomA.code,
      prompt: roomA.promptText,
      hydrationMs: interactive,
      firstOpenInteractiveMs: a.interactiveMs,
      idleTyping: {
        value: idleTyping.value,
        keystrokes: idleTyping.keystrokes,
        frameLatency: idleTyping.frameLatency,
        lostFocus: idleTyping.lostFocus,
        caretJumps: idleTyping.caretJumps,
      },
      streamingTyping: {
        value: streamingTyping.value,
        keystrokes: streamingTyping.keystrokes,
        frameLatency: streamingTyping.frameLatency,
        lostFocus: streamingTyping.lostFocus,
        caretJumps: streamingTyping.caretJumps,
        active: streamingTyping.active,
        snapshotsDuringTyping: afterSnapshots - beforeSnapshots,
        longTasks: streamingTyping.longs.map((entry) => entry.ms),
      },
      submit: { pendingMs, clearedMs, verdictMs, rejectedText },
      recovery: {
        value: recovery.value,
        keystrokes: recovery.keystrokes,
        frameLatency: recovery.frameLatency,
        active: recovery.active,
      },
      duplicate: { verdictMs: dupVerdictMs, ...afterDup },
      consoleProblems: a.problems.slice(0, 8),
    };

    await a.context.close();
    await a.page.waitForTimeout(50).catch(() => undefined);
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(out, null, 2));
