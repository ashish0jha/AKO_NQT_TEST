import Attempt from "../models/Attempt.js";
import { TEST_STRUCTURE, getSectionByKey } from "../utils/sectionConfig.js";
import {
  generateMCQSet,
  generateSentenceCompletion,
  generatePassage,
  generateEmailScenario,
  scoreSentenceCompletion,
  scorePassageRecall,
  scoreEmail,
} from "../services/groqService.js";

// Public structure (durations/labels) with any coding answer fields stripped.
function publicStructure() {
  return TEST_STRUCTURE.map(({ key, label, type, items, durationSec, subsections, difficulty }) => ({
    key,
    label,
    type,
    items,
    durationSec,
    difficulty,
    subsections: subsections?.map((s) => ({
      key: s.key,
      label: s.label,
      type: s.type,
      items: s.items,
      perItemSec: s.perItemSec,
      readSec: s.readSec,
      writeSec: s.writeSec,
      durationSec: s.durationSec,
      minWords: s.minWords,
      instructions: s.instructions,
    })),
  }));
}

export async function startAttempt(req, res) {
  try {
    const attempt = await Attempt.create({ user: req.userId, sections: [] });
    res.status(201).json({ attemptId: attempt._id, structure: publicStructure() });
  } catch (err) {
    res.status(500).json({ message: "Could not start attempt", error: err.message });
  }
}

async function findOwnedAttempt(id, userId) {
  const attempt = await Attempt.findById(id);
  if (!attempt) return null;
  if (String(attempt.user) !== String(userId)) return null;
  return attempt;
}

function stripAnswers(section) {
  return {
    key: section.key,
    label: section.label,
    type: section.type,
    questions: section.questions.map((q) => ({
      prompt: q.prompt,
      options: q.options,
      // correctAnswer intentionally omitted from client response
    })),
  };
}

// Generates (once) and returns a section's questions, stripped of answers.
export async function getSection(req, res) {
  try {
    const { id, key } = req.params;
    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    let section = attempt.sections.find((s) => s.key === key);
    if (section) return res.json(stripAnswers(section));

    const config = getSectionByKey(key);
    if (!config) return res.status(400).json({ message: "Unknown section key" });

    let questions = [];

    if (["numerical", "reasoning", "advanced_quant_reasoning"].includes(key)) {
      const label = getSectionByKey(key).label;
      const raw = await generateMCQSet(req.groqApiKey, label, config.items);
      questions = raw.map((q) => ({
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));
    } else if (key === "sentence_completion") {
      const raw = await generateSentenceCompletion(req.groqApiKey, config.items);
      questions = raw.map((q) => ({ prompt: q.prompt, correctAnswer: q.correctAnswer }));
    } else if (key === "passage_recall") {
      const passages = [];
      for (let i = 0; i < config.items; i++) passages.push(await generatePassage(req.groqApiKey));
      questions = passages.map((p) => ({ prompt: p.passage }));
    } else if (key === "email_writing") {
      const scenario = await generateEmailScenario(req.groqApiKey);
      questions = [{ prompt: scenario.situation }];
    } else {
      return res.status(400).json({ message: "This section is handled by the coding endpoints" });
    }

    section = {
      key,
      label: config.label,
      type: config.type,
      startedAt: new Date(),
      questions,
    };
    attempt.sections.push(section);
    await attempt.save();

    const saved = attempt.sections.find((s) => s.key === key);
    res.json(stripAnswers(saved));
  } catch (err) {
    res.status(500).json({ message: "Could not generate section", error: err.message });
  }
}

// Scores a submitted section. Body: { answers: [{ index, userAnswer, timeTakenSec }] }
export async function submitSection(req, res) {
  try {
    const { id, key } = req.params;
    const { answers = [] } = req.body;
    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const section = attempt.sections.find((s) => s.key === key);
    if (!section) return res.status(400).json({ message: "Section not generated yet" });

    let totalScore = 0;

    if (["numerical", "reasoning", "advanced_quant_reasoning"].includes(key)) {
      let correctCount = 0;
      section.questions.forEach((q, i) => {
        const ans = answers.find((a) => a.index === i);
        q.userAnswer = ans?.userAnswer ?? "";
        q.timeTakenSec = ans?.timeTakenSec ?? 0;
        q.isCorrect = q.userAnswer.trim() === (q.correctAnswer || "").trim();
        if (q.isCorrect) correctCount++;
      });
      totalScore = section.questions.length ? (correctCount / section.questions.length) * 100 : 0;
    } else if (key === "sentence_completion") {
      let correctCount = 0;
      for (let i = 0; i < section.questions.length; i++) {
        const q = section.questions[i];
        const ans = answers.find((a) => a.index === i);
        q.userAnswer = ans?.userAnswer ?? "";
        q.timeTakenSec = ans?.timeTakenSec ?? 0;
        if (q.userAnswer.trim()) {
          const graded = await scoreSentenceCompletion(req.groqApiKey, q.prompt, q.correctAnswer, q.userAnswer);
          q.isCorrect = !!graded.isCorrect;
          q.aiFeedback = graded.feedback;
        } else {
          q.isCorrect = false;
        }
        if (q.isCorrect) correctCount++;
      }
      totalScore = section.questions.length ? (correctCount / section.questions.length) * 100 : 0;
    } else if (key === "passage_recall") {
      let sum = 0;
      for (let i = 0; i < section.questions.length; i++) {
        const q = section.questions[i];
        const ans = answers.find((a) => a.index === i);
        q.rawResponseText = ans?.userAnswer ?? "";
        q.timeTakenSec = ans?.timeTakenSec ?? 0;
        const graded = await scorePassageRecall(req.groqApiKey, q.prompt, q.rawResponseText || "");
        q.aiScore = graded.score ?? 0;
        q.aiFeedback = graded.feedback;
        sum += q.aiScore;
      }
      totalScore = section.questions.length ? sum / section.questions.length : 0;
    } else if (key === "email_writing") {
      const q = section.questions[0];
      const ans = answers.find((a) => a.index === 0);
      q.rawResponseText = ans?.userAnswer ?? "";
      q.timeTakenSec = ans?.timeTakenSec ?? 0;
      if (!q.rawResponseText.trim()) {
        // Don't ask Groq to grade nothing - it was occasionally scoring a
        // blank submission as high as 90/100. An empty answer is always 0.
        q.aiScore = 0;
        q.aiFeedback = "No response was submitted.";
      } else {
        const graded = await scoreEmail(req.groqApiKey, q.prompt, q.rawResponseText);
        q.aiScore = graded.score ?? 0;
        q.aiFeedback = `${graded.feedback}${
          graded.wordCount < 100 ? ` (Only ${graded.wordCount} words - minimum is 100.)` : ""
        }`;
      }
      totalScore = q.aiScore;
    } else {
      return res.status(400).json({ message: "Use the coding submit endpoint for this section" });
    }

    section.sectionScore = Math.round(totalScore);
    section.completedAt = new Date();
    await attempt.save();

    res.json({ sectionScore: section.sectionScore, questions: section.questions });
  } catch (err) {
    res.status(500).json({ message: "Could not score section", error: err.message });
  }
}

// Called when the user hits "Quit Test". Scores whatever sections were
// already submitted (same averaging logic as a normal completion) and marks
// the attempt as abandoned so the dashboard/results page can tell the
// difference from a full completion.
export async function abandonAttempt(req, res) {
  try {
    const attempt = await findOwnedAttempt(req.params.id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    if (attempt.status === "in_progress") {
      const scored = attempt.sections.filter((s) => typeof s.sectionScore === "number");
      attempt.overallScore = scored.length
        ? Math.round(scored.reduce((sum, s) => sum + s.sectionScore, 0) / scored.length)
        : 0;
      attempt.status = "abandoned";
      attempt.completedAt = new Date();
      await attempt.save();
    }

    res.json({ overallScore: attempt.overallScore, sections: attempt.sections, status: attempt.status });
  } catch (err) {
    res.status(500).json({ message: "Could not quit attempt", error: err.message });
  }
}

// Lightweight "Report Error" - just records the note against the attempt so
// it can be reviewed later; doesn't block or change the test flow.
export async function reportError(req, res) {
  try {
    const { id } = req.params;
    const { sectionKey, message } = req.body;
    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Please describe the issue before submitting." });
    }
    attempt.reportedIssues.push({ sectionKey, message: message.trim() });
    await attempt.save();
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Could not submit report", error: err.message });
  }
}

// Saves which step of the flow the candidate is on, so a page refresh or a
// resumed "in progress" attempt can jump back to the right section instead
// of restarting the whole wizard from step 0.
export async function saveProgress(req, res) {
  try {
    const { id } = req.params;
    const { stepIndex } = req.body;
    const attempt = await findOwnedAttempt(id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status === "in_progress" && Number.isInteger(stepIndex)) {
      attempt.lastStepIndex = stepIndex;
      await attempt.save();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Could not save progress", error: err.message });
  }
}

export async function completeAttempt(req, res) {
  try {
    const attempt = await findOwnedAttempt(req.params.id, req.userId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const scored = attempt.sections.filter((s) => typeof s.sectionScore === "number");
    attempt.overallScore = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + s.sectionScore, 0) / scored.length)
      : 0;
    attempt.status = "completed";
    attempt.completedAt = new Date();
    await attempt.save();

    res.json({ overallScore: attempt.overallScore, sections: attempt.sections });
  } catch (err) {
    res.status(500).json({ message: "Could not complete attempt", error: err.message });
  }
}

export async function getAttempt(req, res) {
  const attempt = await findOwnedAttempt(req.params.id, req.userId);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  res.json(attempt);
}

export async function listAttempts(req, res) {
  const attempts = await Attempt.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .select("status overallScore startedAt completedAt createdAt");
  res.json(attempts);
}