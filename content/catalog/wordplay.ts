/**
 * Wordplay pack. These are closed-list word games: every accepted answer is a
 * real English word that satisfies the prompt, not an AI guess.
 */

export type WordplayPrompt = {
  id: string;
  text: string;
  scope: string;
  scopeNoun: string;
  answers: string[];
};

export const WORDPLAY_PROMPTS: WordplayPrompt[] = [
  {
    id: "anthill.wordplay.cake_rhyme",
    text: "Name a word that rhymes with cake.",
    scope: "Common English words with the same ending sound as cake.",
    scopeNoun: "word that rhymes with cake",
    answers: ["bake", "brake", "break", "fake", "flake", "lake", "make", "rake", "sake", "snake", "stake", "take", "wake"],
  },
  {
    id: "anthill.wordplay.cat_rhyme",
    text: "Name a word that rhymes with cat.",
    scope: "Common English words with the same ending sound as cat.",
    scopeNoun: "word that rhymes with cat",
    answers: ["bat", "chat", "flat", "hat", "mat", "pat", "rat", "sat", "splat", "that", "vat"],
  },
  {
    id: "anthill.wordplay.blue_rhyme",
    text: "Name a word that rhymes with blue.",
    scope: "Common English words with the same ending sound as blue.",
    scopeNoun: "word that rhymes with blue",
    answers: ["clue", "crew", "dew", "drew", "flew", "glue", "knew", "new", "shoe", "stew", "true", "two", "view"],
  },
  {
    id: "anthill.wordplay.star_rhyme",
    text: "Name a word that rhymes with star.",
    scope: "Common English words with the same ending sound as star.",
    scopeNoun: "word that rhymes with star",
    answers: ["bar", "car", "far", "guitar", "jar", "scar", "tar", "spar", "char", "cigar"],
  },
  {
    id: "anthill.wordplay.palindrome",
    text: "Name a palindrome.",
    scope: "A word that reads the same forwards and backwards.",
    scopeNoun: "palindrome",
    answers: ["civic", "deified", "kayak", "level", "madam", "noon", "racecar", "radar", "refer", "rotor", "stats", "tenet", "minim"],
  },
  {
    id: "anthill.wordplay.double_letters",
    text: "Name a word with a double letter.",
    scope: "A common English word containing two identical letters in a row.",
    scopeNoun: "word with a double letter",
    answers: ["balloon", "book", "bottle", "coffee", "happy", "kitten", "letter", "puzzle", "rabbit", "summer", "tree", "yellow", "little", "dinner"],
  },
  {
    id: "anthill.wordplay.z_word",
    text: "Name a word containing the letter Z.",
    scope: "A common English word that contains z.",
    scopeNoun: "word containing Z",
    answers: ["buzz", "crazy", "frozen", "lazy", "puzzle", "zero", "zebra", "zone", "zoom", "hazard", "amazing", "blizzard", "size"],
  },
  {
    id: "anthill.wordplay.tion_word",
    text: "Name a word ending in -tion.",
    scope: "A common English noun ending with the letters tion.",
    scopeNoun: "word ending in -tion",
    answers: ["action", "attention", "celebration", "creation", "education", "fiction", "invention", "motion", "nation", "question", "station", "vacation", "vision"],
  },
  {
    id: "anthill.wordplay.silent_letter",
    text: "Name a word with a silent first letter.",
    scope: "A common English word whose first letter is not pronounced.",
    scopeNoun: "word with a silent first letter",
    answers: ["gnome", "gnat", "knee", "knife", "knight", "knock", "know", "psalm", "psychology", "wreck", "wrap", "write", "hour", "honest"],
  },
  {
    id: "anthill.wordplay.all_vowels",
    text: "Name a word containing all five vowels.",
    scope: "A common English word containing a, e, i, o and u at least once.",
    scopeNoun: "word containing all five vowels",
    answers: ["abstemious", "adventitious", "facetious", "facetiously", "sequoia", "educational", "authorize", "euphoria", "outrageous", "simultaneous", "tenacious"],
  },
  {
    id: "anthill.wordplay.compound_word",
    text: "Name a compound word.",
    scope: "A common English word made from two smaller words.",
    scopeNoun: "compound word",
    answers: ["backpack", "basketball", "bedroom", "bookshelf", "butterfly", "campfire", "cupcake", "doorbell", "firefly", "football", "keyboard", "lighthouse", "rainbow", "toothbrush"],
  },
];
