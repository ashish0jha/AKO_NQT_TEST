# AKO — TCS NQT-style Mock Test App

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

1. Register an account (stored in your MongoDB), then add your Groq API key
   from **Navbar → API Key** — tests can't be generated until this is set.
2. On the dashboard, click **Start Test** (or **Start New Test** / **Resume
   Test**, depending on your history) on the admit-card panel. This walks
   you through all 7 groups in order, each with its own timer that mirrors
   the PDF exactly. Sections auto-submit when time runs out.
3. At the end you land on a Results page with an overall score, a
   colored score bar per section, and a per-question breakdown (correct
   answers for MCQs, AI feedback for subjective sections, pass/fail summary
   for coding).
4. Your dashboard keeps a history of every attempt with scores, and
   **Attempt New Test** always starts a genuinely new attempt with freshly
   generated questions.

## What changed in this update
- **Fixed "Next" breaking mid-test**: consecutive sections of the same kind
  (Numerical → Reasoning → Advanced Quant/Reasoning are all `mcq`) were
  reusing the same React component instance instead of remounting, so
  `submittedRef`, `current`, and `answers` from the previous section leaked
  into the next one. Every section is rendered with an explicit `key={step.key}`
  prop directly on the JSX element in `TestRunner.jsx` (not inside a spread
  props object, which React warns against), forcing a clean remount per section.
- **Exam-style MCQ UI**: `MCQSection.jsx` has the question-palette layout
  (Answered / Not Answered / Not Visited / Marked for Review counts + a
  jump-to-question grid), Mark for Review & Next, Clear Response, Save &
  Next, a Submit confirmation summary, a Question Paper viewer, and a Report
  Error form.
- **Instructions page**: shown once before a fresh attempt starts
  (`InstructionsPage.jsx`), matching the legend/rules from the reference
  screenshots. Skipped automatically when resuming an in-progress attempt.
- **Quit Test**: a Quit Test button is always visible during the test
  (`TestRunner.jsx`). Confirming it scores whatever sections were already
  submitted and marks the attempt `abandoned` (`POST /attempts/:id/abandon`).
  The Results page shows a "Test quit early" flag plus an **Attempt New
  Test** button.
- **Coding rounds are C++ only**, both in the backend
  (`SUPPORTED_LANGUAGES` in `sectionConfig.js`) and the frontend (language
  selector removed, fixed C++ starter code). Execution runs via
  **Wandbox** (`wandboxService.js`, compiler `gcc-head`) — free, no signup,
  no API key.
- **True resume**: the current step index is checkpointed to the attempt
  (`POST /attempts/:id/progress`) as you move through the wizard, and
  clicking "Resume" on the dashboard reopens the attempt at that exact
  step instead of restarting the wizard from Step 1.
- **Report Error**: a lightweight `POST /attempts/:id/report-error` stores
  a free-text note (with section/question context) against the attempt for
  later review — it doesn't block or change the test flow.
- **Per-user Groq API keys**: each user supplies their own Groq API key
  (Navbar → API Key) instead of the app running on one shared server-side
  key. It's encrypted (`utils/crypto.js`, AES-256-GCM) before being stored
  on the `User` document and is required — via `requireGroqKey` middleware
  — on every route that calls Groq. A deployed instance costs its owner $0
  in Groq usage regardless of how many people use it. If a section fails to
  generate (e.g. the key was removed mid-session in another tab), the
  section shows an inline error instead of hanging on "Generating..."
  forever (`SectionLoadError.jsx`).
- **Exact question counts**: sections that ask Groq for a specific number of
  items (20 numerical, 20 reasoning, 14 advanced reasoning, 20 sentence
  completion) sometimes got back fewer than asked — Groq just stopping
  short, not erroring — especially on larger counts. `generateMCQSet` /
  `generateSentenceCompletion` validate each item's shape and, if the batch
  comes up short, run up to 2 more top-up calls asking only for the
  remainder (explicitly telling the model not to repeat what's already been
  generated) until the count is met or 3 rounds are exhausted. `max_tokens`
  on these calls was also raised so a large batch can't get silently
  truncated mid-JSON.
- **Fixed blank email scoring 90/100**: submitting an empty email used to
  still get sent to Groq to grade, which occasionally hallucinated a high
  score for nothing. `submitSection` now checks for a blank response first
  and scores it `0` directly, skipping the Groq call entirely
  (`testController.js`, `email_writing` branch).
- **Redesigned UI**: moved off the generic dark/violet look to a dedicated
  "admit card" identity — a ticket-style dashboard hero, a split brand panel
  on Login/Register, a real site footer (hidden during an active test), and
  Space Grotesk/IBM Plex Sans/IBM Plex Mono typography throughout.
- **Show/hide password**: Login and Register password fields have an eye-icon
  toggle (`PasswordInput.jsx`) instead of a plain masked input.

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
  and the code has a fallback parser. `generateMCQSet` and
  `generateSentenceCompletion` additionally validate + top-up short/malformed
  batches (see above), but `generatePassage`, `generateEmailScenario`, and
  `generateCodingProblem` don't have that same retry logic yet — a genuinely
  malformed response from Groq on those will still throw a 500 (surfaced to
  the candidate via `SectionLoadError.jsx` rather than a hang) instead of
  auto-retrying.
- **Security**: private test cases are never sent to the frontend; only
  public-test-case pass/fail is shown during "Compile & Test". Each user's
  Groq API key is encrypted at rest (`ENCRYPTION_KEY`) and never returned to
  the client — only a masked preview (e.g. `gsk_••••••••abcd`) is.
