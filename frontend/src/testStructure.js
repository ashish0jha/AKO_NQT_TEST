// Client-side mirror of backend/utils/sectionConfig.js, flattened into an
// ordered list of steps the TestRunner walks through one at a time.
// Only used for UI flow/timers - actual questions & scoring come from the API.

export const STEPS = [
  { key: "numerical", label: "Numerical Ability", kind: "mcq", items: 20, durationSec: 25 * 60 },
  { key: "reasoning", label: "Reasoning Ability", kind: "mcq", items: 20, durationSec: 25 * 60 },
  {
    key: "advanced_quant_reasoning",
    label: "Advanced Quantitative and Reasoning Ability",
    kind: "mcq",
    items: 14,
    durationSec: 25 * 60,
  },
  {
    key: "sentence_completion",
    label: "Verbal Ability - Sentence Completion",
    kind: "sentence_completion",
    items: 20,
    perItemSec: 25,
  },
  {
    key: "passage_recall",
    label: "Verbal Ability - Passage Recall",
    kind: "passage_recall",
    items: 4,
    readSec: 30,
    writeSec: 90,
  },
  {
    key: "email_writing",
    label: "Verbal Ability - Email Writing",
    kind: "email_writing",
    items: 1,
    durationSec: 540,
    minWords: 100,
  },
  {
    key: "coding_easy",
    label: "Advanced Coding - Easy",
    kind: "coding",
    durationSec: 35 * 60,
  },
  { key: "break", label: "Break", kind: "break", durationSec: 60 },
  {
    key: "coding_medium",
    label: "Advanced Coding - Medium",
    kind: "coding",
    durationSec: 55 * 60,
  },
];
