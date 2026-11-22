import assert from "node:assert/strict";
import test from "node:test";
import { hopperScore, placementPoints, PLACEMENT_POINTS, RARITIES } from "../src/lib/config";
import {
  anthillLedger,
  anthillTotals,
  awardPlacements,
  competitionRanking,
  hopperRankScoreSafe,
  spiderPathScore,
} from "../src/lib/scoring";
import { buildPlaylist } from "../src/lib/party";
import { editDistance, normalizeKey, normalizeNickname } from "../src/lib/normalize";
import {
  buildAnswerIndex,
  isAcceptedAnswer,
  validateAnswer,
  type AnswerCandidate,
  type PromptSpec,
} from "../src/lib/validation";
import { validateRoute, findDirectEdge, type RouteEdge } from "../src/lib/game/spider";

// ---------------------------------------------------------------------------
// Placement table
// ---------------------------------------------------------------------------
test("placement points match the published table", () => {
  assert.deepEqual([...PLACEMENT_POINTS], [900, 750, 600, 450, 300, 200, 100, 75, 50]);
  assert.equal(placementPoints(1), 900);
  assert.equal(placementPoints(9), 50);
  assert.equal(placementPoints(10), 0);
  assert.equal(placementPoints(20), 0);
  assert.equal(placementPoints(0), 0);
});

test("two-player round awards 900 and 750", () => {
  const placements = competitionRanking([
    { memberId: "a", score: 500 },
    { memberId: "b", score: 100 },
  ]);
  const points = awardPlacements(placements, new Set(["a", "b"]));
  assert.equal(points.get("a"), 900);
  assert.equal(points.get("b"), 750);
});

test("competition ranking shares places and skips the next", () => {
  const placements = competitionRanking([
    { memberId: "a", score: 500 },
    { memberId: "b", score: 500 },
    { memberId: "c", score: 300 },
    { memberId: "d", score: 100 },
  ]);
  assert.equal(placements.get("a"), 1);
  assert.equal(placements.get("b"), 1);
  assert.equal(placements.get("c"), 3);
  assert.equal(placements.get("d"), 4);
  const points = awardPlacements(placements, new Set(["a", "b", "c", "d"]));
  assert.equal(points.get("a"), 900);
  assert.equal(points.get("b"), 900);
  assert.equal(points.get("c"), 600);
  assert.equal(points.get("d"), 450);
});

test("no-participation players receive zero and no placement", () => {
  const placements = new Map([["a", 1]]);
  const points = awardPlacements(placements, new Set(["a", "b"]));
  assert.equal(points.get("a"), 900);
  assert.equal(points.get("b"), 0);
});

// ---------------------------------------------------------------------------
// Anthill
// ---------------------------------------------------------------------------
test("all five rarity values are exact", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(RARITIES).map(([key, value]) => [key, value.value])),
    { forager: 100, soldier: 200, royal: 300, queen: 500, apex: 1000 },
  );
});

test("fixed 50% sharing applies once for any number of matching players", () => {
  const one = anthillLedger([{ memberId: "a", entityId: "x", base: 1000 }]);
  assert.equal(one[0].contribution, 1000);
  assert.equal(one[0].shared, false);

  const two = anthillLedger([
    { memberId: "a", entityId: "x", base: 1000 },
    { memberId: "b", entityId: "x", base: 1000 },
  ]);
  assert.deepEqual(two.map((row) => row.contribution), [500, 500]);

  const three = anthillLedger([
    { memberId: "a", entityId: "x", base: 1000 },
    { memberId: "b", entityId: "x", base: 1000 },
    { memberId: "c", entityId: "x", base: 1000 },
  ]);
  assert.deepEqual(three.map((row) => row.contribution), [500, 500, 500]);
  assert.deepEqual(three.map((row) => row.sharers), [3, 3, 3]);

  const twenty = anthillLedger(
    Array.from({ length: 20 }, (_, index) => ({
      memberId: `m${index}`,
      entityId: "x",
      base: 200,
    })),
  );
  assert.ok(twenty.every((row) => row.contribution === 100));
  assert.ok(twenty.every((row) => row.sharers === 20));
});

test("single-player answers keep their full rarity value", () => {
  const ledger = anthillLedger([
    { memberId: "a", entityId: "apex", base: 1000 },
    { memberId: "b", entityId: "forager", base: 100 },
  ]);
  const totals = anthillTotals(ledger);
  assert.equal(totals.get("a"), 1000);
  assert.equal(totals.get("b"), 100);
});

test("sharing totals survive a player leaving because the ledger is derived", () => {
  const accepted = [
    { memberId: "a", entityId: "x", base: 200 },
    { memberId: "b", entityId: "x", base: 200 },
  ];
  const before = anthillTotals(anthillLedger(accepted));
  const after = anthillTotals(anthillLedger(accepted.filter((row) => row.memberId !== "b")));
  // Removing history would be wrong; the real engine keeps the row. This asserts
  // the ledger stays a pure function of accepted rows.
  assert.equal(before.get("a"), 100);
  assert.equal(after.get("a"), 200);
});

test("rarityForValue round-trips every tier", () => {
  for (const value of Object.values(RARITIES)) {
    const ledger = anthillLedger([{ memberId: "a", entityId: "e", base: value.value }]);
    assert.equal(ledger[0].rarity, Object.keys(RARITIES).find((key) => RARITIES[key as keyof typeof RARITIES].value === value.value));
  }
});

// ---------------------------------------------------------------------------
// Normalization and validation
// ---------------------------------------------------------------------------
test("normalization folds case, spacing and curly apostrophes", () => {
  assert.equal(normalizeKey("  PIKACHU   "), "pikachu");
  assert.equal(normalizeKey("Hershey’s Milk Chocolate Bar"), normalizeKey("Hershey's Milk Chocolate Bar"));
  assert.equal(normalizeNickname("  Double   Dip "), "double dip");
});

test("meaningful symbols are preserved", () => {
  assert.notEqual(normalizeKey("Nidoran♀"), normalizeKey("Nidoran♂"));
  assert.equal(normalizeKey("Nidoran♀"), "nidoran♀");
});

test("Damerau-Levenshtein counts a transposition as one edit", () => {
  assert.equal(editDistance("pikachu", "pikchu", 1), 1);
  assert.equal(editDistance("pikachu", "pikachuu", 1), 1);
  assert.equal(editDistance("pikachu", "pikachuuu", 1), 2);
  assert.equal(editDistance("nidoran♀", "nidoran♂", 1), 1);
});

const pikachu: AnswerCandidate = {
  entityId: "pokemon_pikachu",
  name: "Pikachu",
  aliases: ["pika"],
  rarity: "forager",
  type: "pokemon_species",
};
const charizard: AnswerCandidate = {
  entityId: "pokemon_charizard",
  name: "Charizard",
  aliases: [],
  rarity: "soldier",
  type: "pokemon_species",
};
const nidoranF: AnswerCandidate = {
  entityId: "pokemon_nidoran_f",
  name: "Nidoran♀",
  aliases: [],
  rarity: "queen",
  type: "pokemon_species",
};
const nidoranM: AnswerCandidate = {
  entityId: "pokemon_nidoran_m",
  name: "Nidoran♂",
  aliases: [],
  rarity: "queen",
  type: "pokemon_species",
};

const index = buildAnswerIndex(
  [pikachu, charizard, nidoranF, nidoranM],
  [
    { entityId: "pokemon_pikachu", name: "Pikachu", type: "pokemon_species" },
    { entityId: "trainer_ash", name: "Ash Ketchum", type: "pokemon_trainer" },
    { entityId: "company_hershey", name: "Hershey", type: "company" },
  ],
);

const spec: PromptSpec = {
  id: "anthill.pokemon_species",
  text: "Name a Pokémon species.",
  scope: "Species only.",
  scopeNoun: "Pokémon species",
  expectedTypes: ["pokemon_species"],
  rejectTypes: { pokemon_trainer: "{name} is a Trainer, not a Pokémon species." },
};

test("exact, alias and corrected answers are visible in the result", () => {
  const exact = validateAnswer(index, spec, "pikachu");
  assert.equal(exact.code, "ACCEPTED_EXACT");
  assert.ok(isAcceptedAnswer(exact));
  assert.equal(exact.name, "Pikachu");

  const alias = validateAnswer(index, spec, "PIKA");
  assert.equal(alias.code, "ACCEPTED_ALIAS");
  assert.match(alias.message, /Pikachu/);

  const corrected = validateAnswer(index, spec, "pikchu");
  assert.equal(corrected.code, "ACCEPTED_CORRECTED");
  assert.match(corrected.message, /corrected/);
});

test("short names are never recklessly autocorrected", () => {
  const result = validateAnswer(index, spec, "pik");
  assert.equal(result.code, "UNKNOWN_OR_UNVERIFIED");
});

test("similar valid candidates produce ambiguity instead of a guess", () => {
  const ambiguous = buildAnswerIndex([nidoranF, nidoranM]);
  const result = validateAnswer(
    ambiguous,
    { ...spec, expectedTypes: ["pokemon_species"] },
    "Nidoran",
  );
  assert.ok(result.code === "AMBIGUOUS" || result.code === "UNKNOWN_OR_UNVERIFIED");
});

test("known wrong-type entities get a factual explanation", () => {
  const result = validateAnswer(index, spec, "Ash Ketchum");
  assert.equal(result.code, "KNOWN_WRONG_TYPE");
  assert.match(result.message, /Trainer/);
});

test("unknown strings are described honestly", () => {
  const result = validateAnswer(index, spec, "Flibbertigibbet");
  assert.equal(result.code, "UNKNOWN_OR_UNVERIFIED");
  assert.match(result.message, /don't recognize/);
});

// ---------------------------------------------------------------------------
// Hopper
// ---------------------------------------------------------------------------
test("Hopper rank scores follow the table", () => {
  assert.equal(hopperScore(1), 1000);
  assert.equal(hopperScore(2), 750);
  assert.equal(hopperScore(3), 500);
  assert.equal(hopperScore(4), 300);
  assert.equal(hopperScore(5), 150);
  assert.equal(hopperScore(6), 50);
  assert.equal(hopperScore(0), 0);
  assert.equal(hopperRankScoreSafe(2), 750);
});

test("Hopper matching players tie legitimately", () => {
  const placements = competitionRanking([
    { memberId: "a", score: 1000 },
    { memberId: "b", score: 1000 },
    { memberId: "c", score: 750 },
  ]);
  assert.equal(placements.get("a"), 1);
  assert.equal(placements.get("b"), 1);
  assert.equal(placements.get("c"), 3);
});

// ---------------------------------------------------------------------------
// Spider Web
// ---------------------------------------------------------------------------
test("Spider Web path score is floor(1000 / strands)", () => {
  assert.equal(spiderPathScore(1), 1000);
  assert.equal(spiderPathScore(2), 500);
  assert.equal(spiderPathScore(3), 333);
  assert.equal(spiderPathScore(4), 250);
  assert.equal(spiderPathScore(0), 0);
});

const edgeList = [
  {
    id: "e1",
    from_entity: "homer",
    predicate: "works_at",
    to_entity: "plant",
    forward_label: "works at",
    inverse_label: "has employee",
    source: "test",
  },
  {
    id: "e2",
    from_entity: "plant",
    predicate: "produces",
    to_entity: "waste",
    forward_label: "produces",
    inverse_label: "is produced by",
    source: "test",
  },
  {
    id: "e3",
    from_entity: "waste",
    predicate: "located_in",
    to_entity: "silo",
    forward_label: "is located in",
    inverse_label: null,
    source: "test",
  },
];
const graph = {
  edges: edgeList,
  byId: new Map(edgeList.map((edge) => [edge.id, edge])),
  entities: new Map([
    ["homer", { entityId: "homer", name: "Homer Simpson", type: "character" }],
    ["plant", { entityId: "plant", name: "Plant", type: "place" }],
    ["waste", { entityId: "waste", name: "Nuclear waste", type: "material" }],
    ["silo", { entityId: "silo", name: "Silo", type: "place" }],
  ]),
};

test("Spider Web accepts a forward route and counts strands", () => {
  const route = validateRoute(graph as never, ["homer", "plant", "waste"], "homer", "waste", 10);
  assert.equal(route.ok, true);
  if (route.ok) {
    assert.equal(route.edges.length, 2);
    assert.deepEqual(route.edges.map((edge) => edge.direction), ["forward", "forward"]);
  }
});

test("Spider Web traverses an inverse label in the allowed direction", () => {
  const edge = findDirectEdge(graph as never, "plant", "homer");
  assert.ok(edge);
  assert.equal(edge?.direction, "inverse");
  assert.equal(edge?.label, "has employee");
});

test("Spider Web rejects reverse traversal when no inverse label exists", () => {
  assert.equal(findDirectEdge(graph as never, "silo", "waste"), null);
});

test("Spider Web rejects repeats, wrong starts and incomplete routes", () => {
  assert.equal(
    (validateRoute(graph as never, ["homer", "plant", "homer"], "homer", "waste", 10) as { reason: string }).reason,
    "repeat",
  );
  assert.equal(
    (validateRoute(graph as never, ["plant", "waste"], "homer", "waste", 10) as { reason: string }).reason,
    "start",
  );
  assert.equal(
    (validateRoute(graph as never, ["homer", "plant"], "homer", "waste", 10) as { reason: string }).reason,
    "incomplete",
  );
  assert.equal(
    (validateRoute(graph as never, ["homer", "plant", "waste"], "homer", "waste", 1) as { reason: string }).reason,
    "too_long",
  );
});

test("Spider Web rejects an invented edge", () => {
  const route = validateRoute(graph as never, ["homer", "waste"], "homer", "waste", 10);
  assert.equal(route.ok, false);
  if (!route.ok) assert.equal(route.reason, "unknown_edge");
});

// ---------------------------------------------------------------------------
// Party
// ---------------------------------------------------------------------------
test("Party playlist covers all four modes before repeating", () => {
  const playlist = buildPlaylist(4);
  assert.equal(playlist.length, 4);
  assert.equal(new Set(playlist).size, 4);
  assert.ok(!playlist.includes("party" as never));
});

test("Party playlist never repeats across a bag boundary when it can avoid it", () => {
  for (let seed = 0; seed < 25; seed += 1) {
    let value = seed + 1;
    const rng = () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
    const playlist = buildPlaylist(20, rng);
    assert.equal(playlist.length, 20);
    for (let index = 1; index < playlist.length; index += 1) {
      assert.notEqual(playlist[index], playlist[index - 1], `seed ${seed} repeated at ${index}`);
    }
  }
});

test("Party with one round plays exactly one minigame round", () => {
  const playlist = buildPlaylist(1);
  assert.equal(playlist.length, 1);
  assert.ok(["anthill", "beehive", "spider", "hopper"].includes(playlist[0]));
});

test("Party round counts are clamped by the caller but the bag is honest", () => {
  assert.equal(buildPlaylist(0).length, 0);
  assert.equal(buildPlaylist(8).length, 8);
});
