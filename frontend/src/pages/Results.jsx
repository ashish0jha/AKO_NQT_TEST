import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios.js";
import { STEPS } from "../testStructure.js";

function scoreColor(score) {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--warn)";
  return "var(--danger)";
}

export default function Results() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    api.get(`/attempts/${attemptId}`).then(({ data }) => setAttempt(data));
  }, [attemptId]);

  if (!attempt) return <div className="page-center">Loading results...</div>;

  const isAbandoned = attempt.status === "abandoned";
  const totalSteps = STEPS.length;
  const doneSteps = attempt.sections.length;
  const overall = attempt.overallScore;

  return (
    <div className="container">
      <div className="card results-summary">
        {isAbandoned && <span className="badge badge-in_progress results-flag">Test quit early</span>}
        <div className="results-score-row">
          <h1 className="results-score-big">
            {overall ?? "—"}
            <span>%</span>
          </h1>
          <span className="muted">Overall score</span>
        </div>
        <p className="muted">
          {doneSteps} of {totalSteps} section{totalSteps === 1 ? "" : "s"} completed
          {isAbandoned ? " before quitting" : ""} on{" "}
          {new Date(attempt.completedAt || attempt.createdAt).toLocaleString()}
        </p>
        <div className="results-actions">
          <Link to="/" className="btn btn-ghost">
            Back to Dashboard
          </Link>
          <RetakeButton />
        </div>
      </div>

      {attempt.sections.map((s) => (
        <div key={s.key} className="card section-result">
          <div className="section-result-header">
            <h2>{s.label}</h2>
            <span className="badge">{s.sectionScore ?? "—"}%</span>
          </div>
          {typeof s.sectionScore === "number" && (
            <div className="section-score-bar-track">
              <div
                className="section-score-bar-fill"
                style={{ width: `${s.sectionScore}%`, background: scoreColor(s.sectionScore) }}
              />
            </div>
          )}

          {s.questions.map((q, i) => (
            <div key={i} className="result-question">
              {q.options && q.options.length > 0 ? (
                <>
                  <p className="question-prompt">{q.prompt}</p>
                  <p className={q.isCorrect ? "answer-correct" : "answer-wrong"}>
                    Your answer: {q.userAnswer || "(blank)"}{" "}
                    {q.isCorrect ? "✓" : `✗ (correct: ${q.correctAnswer})`}
                  </p>
                </>
              ) : q.rawResponseText !== undefined && q.aiScore !== undefined ? (
                <>
                  <p className="question-prompt">{q.prompt}</p>
                  <p className="muted small">Your response:</p>
                  <p>{q.rawResponseText || "(blank)"}</p>
                  <p className="answer-correct">
                    Score: {q.aiScore}/100 - {q.aiFeedback}
                  </p>
                </>
              ) : q.correctAnswer ? (
                <>
                  <p className="question-prompt">{q.prompt}</p>
                  <p className={q.isCorrect ? "answer-correct" : "answer-wrong"}>
                    Your answer: {q.userAnswer || "(blank)"}{" "}
                    {q.isCorrect ? "✓" : `✗ (reference: ${q.correctAnswer})`}
                    {q.aiFeedback ? ` - ${q.aiFeedback}` : ""}
                  </p>
                </>
              ) : (
                <p className="muted small">Coding round - see pass rate above.</p>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="results-actions">
        <Link to="/" className="btn btn-ghost">
          Back to Dashboard
        </Link>
        <RetakeButton />
      </div>
    </div>
  );
}

function RetakeButton() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  async function startNew() {
    setStarting(true);
    try {
      const { data } = await api.post("/attempts/start");
      navigate(`/test/${data.attemptId}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <button className="btn btn-primary" onClick={startNew} disabled={starting}>
      {starting ? "Preparing..." : "Attempt New Test"}
    </button>
  );
}
