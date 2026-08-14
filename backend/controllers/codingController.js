import Attempt from "../models/Attempt.js";
import { getSectionByKey, SUPPORTED_LANGUAGES } from "../utils/sectionConfig.js";
import { generateCodingProblem } from "../services/groqService.js";
import { runAgainstTestCases } from "../services/wandboxService.js";

async function findOwnedAttempt(id, userId) {
  const attempt = await Attempt.findById(id);
  if (!attempt) return null;
  if (String(attempt.user) !== String(userId)) return null;
  return attempt;
}

// Generates (once, cached on the attempt doc) and returns a coding problem,
// WITHOUT leaking the 5 private test cases to the client.
export async function getCodingProblem(req, res) {
  try {
    const { id, key } = req.params; // key: coding_easy | coding_medium
    const config = getSectionByKey(key);
    if (!config || config.type !== "coding") {
      return res.status(400).json({ message: "Unknown coding section" });
    }

    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    let section = attempt.sections.find((s) => s.key === key);
    if (!section) {
      const problem = await generateCodingProblem(req.groqApiKey, config.difficulty);
      section = {
        key,
        label: config.label,
        type: "coding",
        startedAt: new Date(),
        questions: [
          {
            prompt: JSON.stringify({
              title: problem.title,
              statement: problem.statement,
              publicTestCases: problem.publicTestCases,
              privateTestCases: problem.privateTestCases, // stored server-side only
            }),
          },
        ],
      };
      attempt.sections.push(section);
      await attempt.save();
      section = attempt.sections.find((s) => s.key === key);
    }

    const data = JSON.parse(section.questions[0].prompt);
    res.json({
      title: data.title,
      statement: data.statement,
      publicTestCases: data.publicTestCases,
      languages: SUPPORTED_LANGUAGES.map((l) => l.name),
    });
  } catch (err) {
    res.status(500).json({ message: "Could not generate coding problem", error: err.message });
  }
}

// "Compile & Test" against the 2 public cases only, for candidate feedback.
export async function runPublicTests(req, res) {
  try {
    const { id, key } = req.params;
    const { language, sourceCode } = req.body;
    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const section = attempt.sections.find((s) => s.key === key);
    if (!section) return res.status(400).json({ message: "Problem not generated yet" });

    const data = JSON.parse(section.questions[0].prompt);
    const results = await runAgainstTestCases({
      sourceCode,
      testCases: data.publicTestCases,
    });
    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: "Run failed", error: err.message });
  }
}

// Final submit: runs against all 2 public + 5 private cases, scores, and
// stores the result. Private test case contents are never sent back.
export async function submitCoding(req, res) {
  try {
    const { id, key } = req.params;
    const { language, sourceCode } = req.body;
    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const section = attempt.sections.find((s) => s.key === key);
    if (!section) return res.status(400).json({ message: "Problem not generated yet" });

    const data = JSON.parse(section.questions[0].prompt);
    const allCases = [...data.publicTestCases, ...data.privateTestCases];
    const results = await runAgainstTestCases({
      sourceCode,
      testCases: allCases,
    });

    const passedCount = results.filter((r) => r.passed).length;
    const sectionScore = Math.round((passedCount / allCases.length) * 100);

    section.questions[0].userAnswer = language;
    section.questions[0].rawResponseText = sourceCode;
    section.sectionScore = sectionScore;
    section.completedAt = new Date();
    await attempt.save();

    res.json({
      sectionScore,
      passedCount,
      totalCases: allCases.length,
      // only show pass/fail for public cases in detail; private stays summarized
      publicResults: results.slice(0, data.publicTestCases.length),
    });
  } catch (err) {
    res.status(500).json({ message: "Submit failed", error: err.message });
  }
}
