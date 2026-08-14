# PNQT-style Mock Test App

A full-stack mock assessment platform that reproduces the exact section/timing
pattern from your `Subject_Specific_Instructions_PNQT.pdf`:

| Group | Items | Minutes |
|---|---|---|
| Numerical Ability | 20 | 25 |
| Reasoning Ability | 20 | 25 |
| Advanced Quantitative and Reasoning Ability | 14 | 25 |
| Verbal Ability (Sentence Completion 20 @25s, Passage Recall 4×[30s read/90s write], Email Writing 1 @9min) | 25 | 26 |
| Advanced Coding – Easy | 1 | 35 |
| Break | – | 1 |
| Advanced Coding – Medium | 1 | 55 |

Every question, passage, email scenario, and coding problem is generated live
by **Groq** on each attempt, so no two attempts are the same. Subjective
answers (sentence completion, passage recall, email writing) are also graded
by Groq. Coding submissions run in a real sandboxed compiler (**Wandbox**)
against 2 public + 5 private test cases per problem, exactly like the PDF
describes.

**Groq usage runs on each candidate's own API key**, not a shared
server-side one — every user pastes their own free key in-app (Navbar → API
Key), which is encrypted and stored against their account in MongoDB, and
reused for every attempt they take after that. This means deploying this
app costs its owner nothing in Groq usage, however many people use it.

## Stack
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth
- **Frontend**: React (Vite), React Router
- **AI**: Groq (chat completions, JSON mode) — per-user API keys, encrypted at rest
- **Code execution**: Wandbox (wandbox.org, `gcc-head` compiler — free, no signup, no API key)

## 1. Configure your keys

```
cd backend
cp .env.example .env
```

Open `.env` and replace the placeholders:
- `MONGODB_URI` — replace `mmmm` with your real MongoDB connection string
- `JWT_SECRET` — set this to any long random string
- `ENCRYPTION_KEY` — set this to a **different** long random string. This is
  NOT a Groq key — it's the server-side secret used to encrypt each user's
  Groq API key before it's saved to Mongo (see `backend/utils/crypto.js`).
  Keep it stable in production: rotating it makes every previously-saved
  Groq key unreadable, and each user would need to re-paste theirs.
- Code execution needs no key at all — coding rounds compile via the public
  Wandbox API (`gcc-head`)
- Optionally change `GROQ_MODEL` (defaults to `llama-3.3-70b-versatile`)

You (the deployer) do **not** need a Groq API key yourself — there's no
`GROQ_API_KEY` env var anymore. Each signed-in user adds their own from
**Navbar → API Key** the first time they use the app:
1. Open [console.groq.com/keys](https://console.groq.com/keys) and sign in
   (free, no card required).
2. Click **Create API Key**, name it anything, click **Submit**.
3. Copy the key (starts with `gsk_`, shown once).
4. Paste it into the "API Key" modal in the app and save.

The app verifies the key against Groq before saving it, so a typo is caught
immediately instead of failing partway through a test.

## 2. Install & run the backend

```
cd backend
npm install
npm run dev      # nodemon, or `npm start` for plain node
```
Runs on http://localhost:5000

## 3. Install & run the frontend

```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 and proxies `/api` calls to the backend.

## 4. Use it

1. Register an account (stored in your MongoDB).
2. Click "Start New Mock Test" — this walks you through all 7 groups in
   order, each with its own timer that mirrors the PDF exactly. Sections
   auto-submit when time runs out.
3. At the end you land on a Results page with an overall score, per-section
   scores, and per-question breakdown (correct answers for MCQs, AI feedback
   for subjective sections, pass/fail summary for coding).
4. Your dashboard keeps a history of every attempt with scores.

## What changed in this update
- **Fixed "Next" breaking mid-test**: consecutive sections of the same kind
  (Numerical → Reasoning → Advanced Quant/Reasoning are all `mcq`) were
  reusing the same React component instance instead of remounting, so
  `submittedRef`, `current`, and `answers` from the previous section leaked
  into the next one. Every section is now rendered with `key={step.key}` in
  `TestRunner.jsx`, forcing a clean remount per section.
- **Exam-style MCQ UI**: `MCQSection.jsx` now has the question-palette layout
  (Answered / Not Answered / Not Visited / Marked for Review counts + a
  jump-to-question grid), Mark for Review & Next, Clear Response, Save &
  Next, a Submit confirmation summary, a Question Paper viewer, and a Report
  Error form.
- **Instructions page**: shown once before a fresh attempt starts
  (`InstructionsPage.jsx`), matching the legend/rules from the reference
  screenshots. Skipped automatically when resuming an in-progress attempt.
- **Quit Test**: a Quit Test button is now always visible during the test
  (`TestRunner.jsx`). Confirming it scores whatever sections were already
  submitted and marks the attempt `abandoned` (`POST /attempts/:id/abandon`).
  The Results page shows a "Test quit early" flag plus "Restart Quiz".
- **Coding rounds are C++ only** now, both in the backend
  (`SUPPORTED_LANGUAGES` in `sectionConfig.js`) and the frontend (language
  selector removed, fixed C++ starter code). Execution moved from Judge0 to
  **Wandbox** (`wandboxService.js`, compiler `gcc-head`) — free, no signup,
  no API key.
- **Resume**: the current step index is checkpointed to the attempt
  (`POST /attempts/:id/progress`) as you move through the wizard, and
  clicking "Resume" on the dashboard now reopens the attempt at that step
  instead of restarting the whole flow from Step 1.
- **Report Error**: a lightweight `POST /attempts/:id/report-error` stores
  a free-text note (with section/question context) against the attempt for
  later review — it doesn't block or change the test flow.
- **Per-user Groq API keys**: each user now supplies their own Groq API key
  (Navbar → API Key) instead of the app running on one shared server-side
  key. It's encrypted (`utils/crypto.js`, AES-256-GCM) before being stored
  on the `User` document and is required — via `requireGroqKey` middleware
  — on every route that calls Groq. Means a deployed instance costs its
  owner $0 in Groq usage regardless of how many people use it.
- **Exact question counts**: sections that ask Groq for a specific number of
  items (20 numerical, 20 reasoning, 14 advanced reasoning, 20 sentence
  completion) sometimes got back fewer than asked — Groq just stopping
  short, not erroring — especially on larger counts. `generateMCQSet` /
  `generateSentenceCompletion` now validate each item's shape and, if the
  batch comes up short, run up to 2 more top-up calls asking only for the
  remainder (explicitly telling the model not to repeat what's already been
  generated) until the count is met or 3 rounds are exhausted. `max_tokens`
  on these calls was also raised so a large batch can't get silently
  truncated mid-JSON.

### Things worth adding next
- A visible full test palette (currently spans one section at a time, not
  the whole 81-item test) if you want a single continuous exam view instead
  of a section-by-section wizard.
- Tab-switch/focus-loss detection (currently only a "confirm before leaving
  the tab" prompt) if you want stricter proctoring signals.
- Per-question `timeTakenSec` is still hardcoded to `0` when submitting —
  wire it up from the palette's `current` question timestamps if you want
  per-question timing analytics.

## Notes / things you may want to extend
- **Wandbox is a shared public service with no published rate limit or SLA**
  — it's genuinely free and keyless, but it's someone else's community
  server, not a dedicated judge. Each "Compile & Test" and final submit
  costs one request per test case run, so heavy concurrent testing could
  see slower responses or occasional failures. `wandboxService.js` is a
  single small module, so swapping in another backend (self-hosted Judge0,
  Piston, etc.) later just means rewriting that one file.
- **Groq JSON reliability**: prompts request `response_format: json_object`
  and the code has a fallback parser, but occasionally the model may still
  return malformed JSON on obscure inputs — the current code will throw a
  500 in that rare case; you may want to add a retry.
- **Resuming**: if a user closes the tab mid-attempt, `Resume` on the
  dashboard reopens the same attempt at step 0 of the flow (it doesn't yet
  remember which step they were on) — questions already generated for that
  attempt are reused rather than regenerated, but the wizard restarts from
  the top. Worth fixing if you want true resume-from-where-you-left-off.
- **Security**: private test cases are never sent to the frontend; only
  public-test-case pass/fail is shown during "Compile & Test".
#   A K O _ N Q T _ T E S T  
 