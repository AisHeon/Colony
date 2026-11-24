import type { Rarity } from "./config";
import { cleanAnswer, displayAnswer, editDistance, looseKey, normalizeKey } from "./normalize";

/**
 * Answer validation. Pure functions over a pre-built index so the same rules
 * can be exercised by unit tests without a database.
 */

export type AnswerCandidate = {
  entityId: string;
  name: string;
  aliases: string[];
  rarity: Rarity;
  type: string;
  description?: string;
};

export type GlobalEntity = {
  entityId: string;
  name: string;
  type: string;
  description?: string;
};

export type PromptSpec = {
  id: string;
  text: string;
  scope: string;
  scopeNoun: string;
  expectedTypes: string[];
  rejectTypes?: Record<string, string>;
};

export type AnswerIndex = {
  candidates: AnswerCandidate[];
  byKey: Map<string, AnswerCandidate[]>;
  byLoose: Map<string, AnswerCandidate[]>;
  globalByKey: Map<string, GlobalEntity>;
};

export type ReasonCode =
  | "ACCEPTED_EXACT"
  | "ACCEPTED_ALIAS"
  | "ACCEPTED_CORRECTED"
  | "AMBIGUOUS"
  | "KNOWN_WRONG_TYPE"
  | "OUT_OF_SCOPE"
  | "TOO_BROAD"
  | "UNKNOWN_OR_UNVERIFIED"
  | "ALREADY_SUBMITTED_BY_YOU"
  | "ALREADY_USED_THIS_ROUND"
  | "NOT_YOUR_TURN"
  | "ROUND_CLOSED"
  | "RATE_LIMITED"
  | "INVALID_PAYLOAD"
  | "EMPTY";

export type ValidationResult =
  | {
      code: "ACCEPTED_EXACT" | "ACCEPTED_ALIAS" | "ACCEPTED_CORRECTED";
      entityId: string;
      name: string;
      rarity: Rarity;
      type: string;
      correctedFrom?: string;
      viaAlias?: string;
      message: string;
    }
  | {
      code: "AMBIGUOUS";
      options: Array<{ entityId: string; name: string; description?: string }>;
      message: string;
    }
  | {
      code: "KNOWN_WRONG_TYPE" | "OUT_OF_SCOPE" | "TOO_BROAD" | "UNKNOWN_OR_UNVERIFIED";
      message: string;
      suggestion?: string;
    };

export const TYPE_LABELS: Record<string, string> = {
  pokemon_species: "Pokémon species",
  pokemon_trainer: "Pokémon Trainer",
  pokemon_move: "Pokémon move",
  pokemon_location: "Pokémon location",
  minecraft_item: "Minecraft item",
  minecraft_mob: "Minecraft mob",
  minecraft_block: "Minecraft block",
  country: "sovereign country",
  city: "city",
  capital: "capital city",
  continent: "continent",
  candy_product: "candy product",
  candy_brand: "candy brand",
  company: "company/brand",
  person: "person",
  fictional_character: "fictional character",
  franchise: "franchise name",
  place: "place",
  work: "work of fiction",
  organization: "organization",
  food: "food",
  product: "product",
  object: "object",
  animal: "animal",
  plant: "plant",
  material: "material",
  sport: "sport",
  vehicle: "vehicle",
  landmark: "landmark",
  species: "species",
  fictional_place: "fictional place",
  fictional_object: "fictional object",
  country_group: "group of countries",
  history_person: "historical person",
  history_event: "historical event",
  history_place: "historical place",
  history_work: "historical document",
  wordplay_answer: "wordplay answer",
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export type AcceptedResult = {
  code: "ACCEPTED_EXACT" | "ACCEPTED_ALIAS" | "ACCEPTED_CORRECTED";
  entityId: string;
  name: string;
  rarity: Rarity;
  type: string;
  correctedFrom?: string;
  viaAlias?: string;
  message: string;
};

export function isAcceptedAnswer(result: ValidationResult): result is AcceptedResult {
  return (
    result.code === "ACCEPTED_EXACT" ||
    result.code === "ACCEPTED_ALIAS" ||
    result.code === "ACCEPTED_CORRECTED"
  );
}

export function buildAnswerIndex(
  candidates: AnswerCandidate[],
  globals: GlobalEntity[] = [],
): AnswerIndex {
  const byKey = new Map<string, AnswerCandidate[]>();
  const byLoose = new Map<string, AnswerCandidate[]>();
  const seen = new Set<string>();

  const add = (map: Map<string, AnswerCandidate[]>, key: string, candidate: AnswerCandidate) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    if (!list.some((entry) => entry.entityId === candidate.entityId)) list.push(candidate);
    map.set(key, list);
  };

  for (const candidate of candidates) {
    if (seen.has(candidate.entityId)) continue;
    seen.add(candidate.entityId);
    add(byKey, normalizeKey(candidate.name), candidate);
    add(byLoose, looseKey(candidate.name), candidate);
    for (const alias of candidate.aliases) {
      add(byKey, normalizeKey(alias), candidate);
      add(byLoose, looseKey(alias), candidate);
    }
  }

  const globalByKey = new Map<string, GlobalEntity>();
  for (const entity of globals) {
    const key = normalizeKey(entity.name);
    if (key && !globalByKey.has(key)) globalByKey.set(key, entity);
  }

  return { candidates, byKey, byLoose, globalByKey };
}

function exactMatches(index: AnswerIndex, input: string): AnswerCandidate[] {
  const key = normalizeKey(input);
  return index.byKey.get(key) ?? index.byLoose.get(looseKey(input)) ?? [];
}

function correctedMatches(index: AnswerIndex, input: string): AnswerCandidate[] {
  const key = normalizeKey(input);
  if ([...key].length < 4) return [];
  const out: AnswerCandidate[] = [];
  for (const candidate of index.candidates) {
    const names = [candidate.name, ...candidate.aliases];
    for (const name of names) {
      const target = normalizeKey(name);
      if ([...target].length < 4) continue;
      if (editDistance(key, target, 1) <= 1) {
        out.push(candidate);
        break;
      }
    }
  }
  return out;
}

export function acceptanceMessage(
  result: { code: "ACCEPTED_ALIAS" | "ACCEPTED_CORRECTED"; name: string },
  submitted: string,
): string {
  if (result.code === "ACCEPTED_CORRECTED") {
    return `Accepted as ${result.name} — corrected “${displayAnswer(submitted)}”.`;
  }
  return `Accepted as ${result.name}.`;
}

/** Validate one raw answer against the prompt's frozen answer list. */
export function validateAnswer(index: AnswerIndex, spec: PromptSpec, raw: string): ValidationResult {
  const cleaned = cleanAnswer(raw);
  if (!cleaned) return { code: "UNKNOWN_OR_UNVERIFIED", message: "Enter an answer." };

  const matches = exactMatches(index, cleaned);

  if (matches.length > 1) {
    return {
      code: "AMBIGUOUS",
      options: matches.map((m) => ({
        entityId: m.entityId,
        name: m.name,
        description: m.description,
      })),
      message: `Which one do you mean? ${matches.map((m) => m.name).join(" or ")}.`,
    };
  }

  if (matches.length === 1) {
    const candidate = matches[0];
    const isCanonical = normalizeKey(cleaned) === normalizeKey(candidate.name);
    if (isCanonical) {
      return {
        code: "ACCEPTED_EXACT",
        entityId: candidate.entityId,
        name: candidate.name,
        rarity: candidate.rarity,
        type: candidate.type,
        message: `Accepted: ${candidate.name}.`,
      };
    }
    const result = {
      code: "ACCEPTED_ALIAS" as const,
      entityId: candidate.entityId,
      name: candidate.name,
      rarity: candidate.rarity,
      type: candidate.type,
      viaAlias: cleaned,
    };
    return { ...result, message: acceptanceMessage(result, cleaned) };
  }

  // The input may be a real entity that simply is not part of this prompt.
  const global = index.globalByKey.get(normalizeKey(cleaned));
  if (global && index.candidates.every((c) => c.entityId !== global.entityId)) {
    const expected = new Set(spec.expectedTypes);
    if (!expected.has(global.type)) {
      const noun = spec.scopeNoun || "answer";
      const override = spec.rejectTypes?.[global.type];
      const reason = override
        ? override.replace(/\{name\}/g, global.name)
        : `${global.name} is a ${typeLabel(global.type)}, not a ${noun}.`;
      return { code: "KNOWN_WRONG_TYPE", message: reason };
    }
    return {
      code: "OUT_OF_SCOPE",
      message: `${global.name} is not in this prompt's verified list. Scope: ${spec.scope}`,
    };
  }

  const near = correctedMatches(index, cleaned);
  if (near.length > 1) {
    return {
      code: "AMBIGUOUS",
      options: near.map((m) => ({
        entityId: m.entityId,
        name: m.name,
        description: m.description,
      })),
      message: `We found more than one possible match. Which did you mean? ${near
        .map((m) => m.name)
        .join(" or ")}.`,
    };
  }
  if (near.length === 1) {
    const candidate = near[0];
    const result = {
      code: "ACCEPTED_CORRECTED" as const,
      entityId: candidate.entityId,
      name: candidate.name,
      rarity: candidate.rarity,
      type: candidate.type,
      correctedFrom: cleaned,
    };
    return { ...result, message: acceptanceMessage(result, cleaned) };
  }

  return {
    code: "UNKNOWN_OR_UNVERIFIED",
    message: `We don't recognize “${displayAnswer(cleaned)}” in this prompt's verified list yet. It may be missing — you can report it after the round.`,
  };
}
