import { PLAYABLE_MODES, type PlayableMode } from "./config";

export type Rng = () => number;

/** Fisher-Yates using the supplied RNG (crypto-backed in production). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Party playlist: shuffled bags of all four minigames. A bag is fully consumed
 * before the next is shuffled, and a bag boundary never repeats a mode when an
 * alternative exists. With four or more rounds every mode appears before any
 * repeat.
 */
export function buildPlaylist(
  roundCount: number,
  rng: Rng = Math.random,
  pool: PlayableMode[] = PLAYABLE_MODES,
): PlayableMode[] {
  const modes = pool.length ? pool : PLAYABLE_MODES;
  const count = Math.max(0, Math.floor(roundCount));
  const out: PlayableMode[] = [];
  let bag: PlayableMode[] = [];

  while (out.length < count) {
    if (bag.length === 0) {
      bag = shuffle(modes, rng);
      const previous = out[out.length - 1];
      if (previous && bag[0] === previous) {
        const alternative = bag.findIndex((mode) => mode !== previous);
        if (alternative > 0) {
          [bag[0], bag[alternative]] = [bag[alternative], bag[0]];
        }
      }
    }
    const next = bag.shift();
    if (!next) break;
    out.push(next);
  }

  return out;
}
