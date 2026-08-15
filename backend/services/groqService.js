import axios from "axios";

const GROQ_URL = "https://api.groq.com/openai/v1";

function client(apiKey) {
  if (!apiKey) {
    throw new Error("No Groq API key was provided for this request.");
  }
  return axios.create({
    baseURL: GROQ_URL,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
}

/**
 * Calls Groq chat completions and parses the reply as JSON.
 * We instruct the model to return ONLY JSON to keep parsing reliable.
 * apiKey is always the CANDIDATE's own key (see models/User.js /
 * middleware/auth.js requireGroqKey) — every attempt runs on the test-taker's
 * own Groq quota, not a shared server-side key.
 *
 * Retries the whole call (fresh generation, not just re-parsing the same
 * text) up to `retries` times if the response comes back malformed/
 * truncated - this used to be a hard failure on the first bad response,
 * which is what made loading a section occasionally take several manual
 * page-reloads before it happened to succeed. Auth/rate-limit errors are
 * NOT retried since they'll just fail identically every time.
 */
async function callGroqJSON(
  apiKey,
  systemPrompt,
  userPrompt,
  { temperature = 0.8, maxTokens = 4000, retries = 2 } = {}
) {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const api = client(apiKey);

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await api.post("/chat/completions", {
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const text = data?.choices?.[0]?.message?.content ?? "{}";
      try {
        return JSON.parse(text);
      } catch {
        // fallback: strip code fences if the model added them anyway
        const cleaned = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
      }
    } catch (err) {
      lastErr = err;
      if (err.response && [401, 403, 429].includes(err.response.status)) {
        throw err; // bad/rate-limited key - retrying won't help
      }
    }
  }
  throw lastErr;
}

const JSON_ONLY_RULE =
  "Respond with ONLY a single valid JSON object/array as specified. No markdown, no commentary, no code fences.";

/**
 * Same system+user prompt every call was producing near-identical
 * "canonical" output (the classic train-speed MCQ, the classic
 * reverse-a-string coding problem) because nothing in the prompt ever
 * changed between attempts, and LLMs default to their highest-probability
 * completion for a generic, repeated request.
 *
 * Fix: every generation call now (a) forces a specific randomly-picked
 * topic/subtopic instead of leaving "vary the topic" to chance, and
 * (b) includes a random nonce so the model isn't literally seeing the
 * same prompt twice — both measurably break the "always the same
 * answer" pattern.
 */
function pickTopics(pool, n) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function nonce() {
  return Math.random().toString(36).slice(2, 10);
}

// Rough token budget so a 20-25 item request doesn't get silently truncated
// mid-JSON by the completion hitting max_tokens (which was the biggest
// cause of "fewer questions than asked for" — the model would emit a
// complete JSON array for however many items fit before the cutoff, so no
// error was ever thrown, just a short-but-valid result).
function tokenBudget(perItem, count, floor = 1200) {
  return Math.min(7800, Math.max(floor, Math.round(perItem * count + 800)));
}

const MCQ_TOPIC_POOLS = {
  numerical: [
    "percentages", "profit and loss", "ratio and proportion", "time and work",
    "time speed and distance", "simple and compound interest", "averages",
    "number series", "mixtures and alligation", "probability", "permutations and combinations",
  ],
  reasoning: [
    "blood relations", "coding-decoding", "seating arrangement", "syllogisms",
    "direction sense", "series and analogy", "puzzles", "data sufficiency",
    "clock and calendar", "statement and conclusion",
  ],
  quant_reasoning: [
    "data interpretation (tables/charts)", "logical sequences", "venn diagrams",
    "critical reasoning", "number puzzles", "ranking and ordering", "cryptarithmetic",
  ],
};

const CODING_TOPIC_POOL = [
  "arrays and prefix sums", "string manipulation", "hashing/frequency counting",
  "two pointers", "sorting-based logic", "basic recursion", "stacks and queues",
  "greedy scheduling", "simple graph traversal (BFS/DFS)", "matrix traversal",
  "simulation of a real-world process (inventory, billing, scheduling)",
];

const CODING_FLAVOR_POOL = [
  "an e-commerce order system", "a banking/transactions scenario", "a warehouse/inventory system",
  "a social-media feed", "a ride-booking system", "a library management system",
  "a gaming leaderboard", "a chat/notification system", "a plain algorithmic puzzle (no story wrapper)",
];

const PASSAGE_TOPIC_POOL = [
  "a workplace productivity tip", "a science/technology fact", "a history/geography snippet",
  "an environmental/sustainability topic", "a health and wellness fact", "a business/economics concept",
  "a space/astronomy fact", "a psychology/behavioral-science fact",
];

const EMAIL_SITUATION_POOL = [
  "a scheduling conflict", "a customer complaint", "a project delay", "requesting a deadline extension",
  "escalating a vendor issue", "onboarding a new team member", "declining a meeting request politely",
  "following up on unpaid dues", "reporting a technical outage to stakeholders",
];

function mcqPoolFor(sectionLabel) {
  const s = sectionLabel.toLowerCase();
  if (s.includes("numerical")) return MCQ_TOPIC_POOLS.numerical;
  if (s.includes("reasoning") && s.includes("advanced")) return MCQ_TOPIC_POOLS.quant_reasoning;
  if (s.includes("reasoning")) return MCQ_TOPIC_POOLS.reasoning;
  return [...MCQ_TOPIC_POOLS.numerical, ...MCQ_TOPIC_POOLS.reasoning];
}

function isValidMCQ(q) {
  return (
    q &&
    typeof q.prompt === "string" &&
    q.prompt.trim() &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((o) => typeof o === "string" && o.trim()) &&
    typeof q.correctAnswer === "string" &&
    q.options.includes(q.correctAnswer)
  );
}

/**
 * Generates EXACTLY `count` MCQs. Groq (like most chat models) will
 * sometimes just hand back fewer items than asked for a large count in one
 * shot — no error, no truncation, it just stops short. So this tops up the
 * shortfall with follow-up calls (up to 3 rounds total) instead of quietly
 * shipping a shorter section than the test format requires.
 */
export async function generateMCQSet(apiKey, sectionLabel, count) {
  const system = `You are an expert item-writer for ADVANCED corporate pre-employment aptitude tests (like the harder tier of TCS NQT / Cognizant GenC PNQT). You write multi-step questions, not single-step recall, and you are meticulous about correctness. ${JSON_ONLY_RULE}`;
  const topics = pickTopics(mcqPoolFor(sectionLabel), Math.min(count, 6));
  const collected = [];
  const seenPrompts = new Set();

  for (let round = 0; round < 3 && collected.length < count; round++) {
    const remaining = count - collected.length;
    const avoid = collected.length
      ? `\nDo not repeat or lightly reword any of these already-used prompts: ${collected
          .slice(-12)
          .map((q) => `"${q.prompt}"`)
          .join(", ")}.`
      : "";
    const user = `Generate exactly ${remaining} multiple-choice questions for the section "${sectionLabel}".
Distribute the questions across these specific sub-topics (use each at least once, repeat/mix as needed to reach ${remaining}): ${topics.join(", ")}.

Difficulty: ADVANCED, not beginner. Each question must require at least two reasoning/calculation steps chained together (e.g. combine two concepts, require an intermediate value before the final answer, or need careful elimination of close distractors) — not a single-formula plug-in or a fact any candidate would already know by heart. Still solvable within about 60-75 seconds by a well-prepared candidate.

Before finalizing each question: solve it yourself step by step internally, compute the exact correct value/answer, double-check your arithmetic and logic, and confirm exactly ONE of the 4 options matches your solution while the other 3 are plausible-but-wrong distractors (not vague, not off-by-a-trivial-amount duplicates, not multiple options that could both be argued correct). If you find an error or ambiguity while checking, fix the question before including it — never include a question you have not verified this way. Do this checking silently in your own reasoning — do NOT write out your steps or show your work anywhere in the output. Each item's "explanation" field must be ONE short sentence stating the answer, not your working.

Return JSON: {"questions": [{"prompt": string, "options": [4 strings], "correctAnswer": string (must exactly match one option), "explanation": string}]}
Every item MUST have exactly 4 options and a correctAnswer that exactly matches one of them. You MUST return exactly ${remaining} items — not fewer.
Use fresh numbers/names/scenarios — do not reuse the most common textbook example for a topic.${avoid}
[session ${nonce()}]`;
    const result = await callGroqJSON(apiKey, system, user, {
      temperature: 0.9,
      maxTokens: tokenBudget(210, remaining),
    });
    const batch = Array.isArray(result.questions) ? result.questions.filter(isValidMCQ) : [];
    for (const q of batch) {
      if (seenPrompts.has(q.prompt)) continue;
      seenPrompts.add(q.prompt);
      collected.push(q);
      if (collected.length === count) break;
    }
  }

  if (collected.length < count) {
    console.warn(
      `[groqService] generateMCQSet("${sectionLabel}") only produced ${collected.length}/${count} valid items after 3 rounds.`
    );
  }
  return collected;
}

function isValidBlank(item) {
  return (
    item &&
    typeof item.prompt === "string" &&
    item.prompt.includes("_____") &&
    typeof item.correctAnswer === "string" &&
    item.correctAnswer.trim().split(/\s+/).length === 1
  );
}

/** Same top-up strategy as generateMCQSet, for the same reason. */
export async function generateSentenceCompletion(apiKey, count) {
  const system = `You write "sentence completion" items for the ADVANCED tier of verbal-ability aptitude tests. You are meticulous about each item having exactly one defensible correct answer. ${JSON_ONLY_RULE}`;
  const collected = [];
  const seenPrompts = new Set();

  for (let round = 0; round < 3 && collected.length < count; round++) {
    const remaining = count - collected.length;
    const avoid = collected.length
      ? `\nDo not repeat or lightly reword any of these already-used sentences: ${collected
          .slice(-12)
          .map((q) => `"${q.prompt}"`)
          .join(", ")}.`
      : "";
    const user = `Generate exactly ${remaining} sentences, each with exactly one blank (shown as "_____"), where a single word best completes the sentence's meaning.
Cover a mix of everyday, workplace, and general-knowledge contexts. Avoid reusing well-known textbook example sentences.

Difficulty: ADVANCED. Use moderately sophisticated vocabulary (not basic/everyday words like "happy" or "big") and sentence structures where the surrounding context genuinely has to be read carefully — avoid sentences where several common words could all fit equally well. Before finalizing each item, check that your chosen word is clearly the single best fit given the full sentence's meaning and tone, not just "a" word that fits grammatically.

Return JSON: {"items": [{"prompt": "sentence with _____", "correctAnswer": "single word"}]}
You MUST return exactly ${remaining} items — not fewer.${avoid}
[session ${nonce()}]`;
    const result = await callGroqJSON(apiKey, system, user, {
      temperature: 0.9,
      maxTokens: tokenBudget(70, remaining, 800),
    });
    const batch = Array.isArray(result.items) ? result.items.filter(isValidBlank) : [];
    for (const q of batch) {
      if (seenPrompts.has(q.prompt)) continue;
      seenPrompts.add(q.prompt);
      collected.push(q);
      if (collected.length === count) break;
    }
  }

  if (collected.length < count) {
    console.warn(
      `[groqService] generateSentenceCompletion only produced ${collected.length}/${count} valid items after 3 rounds.`
    );
  }
  return collected;
}

export async function generatePassage(apiKey) {
  const system = `You write short passages (90-130 words) for a "read then reconstruct from memory" exercise. ${JSON_ONLY_RULE}`;
  const topic = pickTopics(PASSAGE_TOPIC_POOL, 1)[0];
  const user = `Generate one short passage (90-130 words) on this topic: ${topic}.
Make it a fresh, specific angle on the topic (not a generic overview), suitable for a candidate to read once and then reconstruct in their own words.
Return JSON: {"passage": string, "topic": string}
[session ${nonce()}]`;
  return callGroqJSON(apiKey, system, user, { temperature: 0.95, maxTokens: 600 });
}

export async function generateEmailScenario(apiKey) {
  const system = `You write workplace-situation prompts for an "email writing" assessment item. ${JSON_ONLY_RULE}`;
  const situation = pickTopics(EMAIL_SITUATION_POOL, 1)[0];
  const user = `Generate one realistic workplace situation of this type: ${situation}.
Give it specific, fresh details (names/roles/context can be generic placeholders, but the scenario itself should feel concrete, not templated) that the candidate must address in an email of at least 100 words.
Return JSON: {"situation": string, "toneGuidance": string}
[session ${nonce()}]`;
  return callGroqJSON(apiKey, system, user, { temperature: 0.95, maxTokens: 500 });
}

export async function generateCodingProblem(apiKey, difficulty) {
  const system = `You write hands-on coding problems for an online-assessment platform. Problems must have a single unambiguous correct output per input, no floating point ambiguity, and no ambiguous formatting. You are meticulous: you mentally trace through your own test cases before finalizing to make sure every input/output pair is actually correct. ${JSON_ONLY_RULE}`;
  const topic = pickTopics(CODING_TOPIC_POOL, 1)[0];
  const flavor = pickTopics(CODING_FLAVOR_POOL, 1)[0];
  const difficultyNote =
    difficulty === "easy"
      ? "Should require combining the technique with at least one extra twist (an edge case to handle, a second pass over the data, or a small transformation) — not a single-line trivial application of it."
      : "Should require layering the technique with a second concept (e.g. the technique plus sorting, plus a greedy choice, plus state tracking) so it takes real problem-solving, not just recognizing a textbook pattern.";
  const user = `Generate one ${difficulty} coding problem solvable in C++ within ${
    difficulty === "easy" ? "35" : "55"
  } minutes.
Base it on this core technique: ${topic}. Wrap it in this scenario: ${flavor}. ${difficultyNote}
Do not reuse a well-known textbook problem verbatim (e.g. plain "reverse a string", "FizzBuzz", "check palindrome") — invent a distinct problem that uses the technique.

Before finalizing: mentally trace through the actual algorithm for each test case input you write, step by step, and confirm the output you wrote is EXACTLY what that algorithm produces (including formatting, spacing, and edge cases like empty input or ties) — do not guess an output. Do this tracing silently in your own reasoning — do NOT include your step-by-step trace anywhere in the output JSON.

Return JSON:
{
  "title": string,
  "statement": string (include input format, output format, and constraints),
  "publicTestCases": [{"input": string, "output": string}, {"input": string, "output": string}],
  "privateTestCases": [ 5 objects like above, DIFFERENT from the public ones, covering edge cases ]
}
Inputs/outputs must be exact strings as they'd be fed to stdin and expected on stdout (no trailing explanations).
[session ${nonce()}]`;
  return callGroqJSON(apiKey, system, user, { temperature: 0.8, maxTokens: 2400 });
}

export async function scoreSentenceCompletion(apiKey, prompt, correctAnswer, userAnswer) {
  // Deterministic-ish, but allow Groq to judge close synonyms fairly.
  const system = `You grade single-word "sentence completion" answers leniently for valid synonyms but strictly for meaning-changing words. ${JSON_ONLY_RULE}`;
  const user = `Sentence: "${prompt}"
Reference answer: "${correctAnswer}"
Candidate's answer: "${userAnswer}"
Return JSON: {"isCorrect": boolean, "feedback": string (max 15 words)}`;
  return callGroqJSON(apiKey, system, user, { temperature: 0.2, maxTokens: 200 });
}

export async function scorePassageRecall(apiKey, originalPassage, userReconstruction) {
  const system = `You grade passage-reconstruction answers for accurate content and understanding, not verbatim wording. ${JSON_ONLY_RULE}`;
  const user = `Original passage: "${originalPassage}"
Candidate's reconstruction (written from memory, in their own words): "${userReconstruction}"
Score 0-100 for how accurately and completely the key content was captured.
Return JSON: {"score": number, "feedback": string (max 40 words)}`;
  return callGroqJSON(apiKey, system, user, { temperature: 0.3, maxTokens: 300 });
}

export async function scoreEmail(apiKey, situation, emailText) {
  const system = `You grade professional email-writing responses for tone, clarity, completeness in addressing the situation, and grammar. ${JSON_ONLY_RULE}`;
  const user = `Situation: "${situation}"
Candidate's email (must be >= 100 words): "${emailText}"
Score 0-100.
Return JSON: {"score": number, "feedback": string (max 60 words), "wordCount": number}`;
  return callGroqJSON(apiKey, system, user, { temperature: 0.3, maxTokens: 350 });
}
