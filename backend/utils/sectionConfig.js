// Mirrors "Subject Specific Instructions" PDF exactly.
// Durations are in seconds everywhere for simplicity on the frontend timer.

export const TEST_STRUCTURE = [
  {
    key: "numerical",
    label: "Numerical Ability",
    type: "mcq",
    items: 20,
    durationSec: 25 * 60,
    generation: "groq",
  },
  {
    key: "reasoning",
    label: "Reasoning Ability",
    type: "mcq",
    items: 20,
    durationSec: 25 * 60,
    generation: "groq",
  },
  {
    key: "advanced_quant_reasoning",
    label: "Advanced Quantitative and Reasoning Ability",
    type: "mcq",
    items: 14,
    durationSec: 25 * 60,
    generation: "groq",
  },
  {
    key: "verbal",
    label: "Verbal Ability",
    type: "verbal_group",
    items: 25,
    durationSec: 26 * 60,
    generation: "groq",
    subsections: [
      {
        key: "sentence_completion",
        label: "Sentence Completion",
        type: "one_word",
        items: 20,
        perItemSec: 25,
        instructions:
          'Type one word that best fits the meaning of the sentence. Type only one word. You have 25 seconds per sentence.',
      },
      {
        key: "passage_recall",
        label: "Passage Recall",
        type: "passage_recall",
        items: 4, // 4 passages, "4+4" = 4 read+write cycles
        readSec: 30,
        writeSec: 90,
        instructions:
          "You will have 30 seconds to read a paragraph. It will then disappear. You then have 90 seconds to reconstruct it in your own words. Scored for accurate content, not verbatim memorization.",
      },
      {
        key: "email_writing",
        label: "Email Writing",
        type: "long_form",
        items: 1,
        durationSec: 540,
        minWords: 100,
        instructions:
          "Read the situation and write an email addressing the issues described. You have 9 minutes and must write at least 100 words.",
      },
    ],
  },
  {
    key: "coding_easy",
    label: "Advanced Coding - Easy",
    type: "coding",
    difficulty: "easy",
    items: 1,
    durationSec: 35 * 60,
    generation: "groq",
  },
  {
    key: "break",
    label: "Break",
    type: "break",
    durationSec: 60,
  },
  {
    key: "coding_medium",
    label: "Advanced Coding - Medium",
    type: "coding",
    difficulty: "medium",
    items: 1,
    durationSec: 55 * 60,
    generation: "groq",
  },
];

// Coding rounds are restricted to C++ only.
export const SUPPORTED_LANGUAGES = [
  { name: "C++", groqName: "cpp" }, // compiled via Wandbox (compiler: gcc-head)
];

export function getSectionByKey(key) {
  for (const s of TEST_STRUCTURE) {
    if (s.key === key) return s;
    if (s.subsections) {
      const sub = s.subsections.find((x) => x.key === key);
      if (sub) return sub;
    }
  }
  return null;
}
