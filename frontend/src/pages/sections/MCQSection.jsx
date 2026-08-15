import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import Timer from "../../components/Timer.jsx";
import QuestionPalette from "../../components/QuestionPalette.jsx";
import ExamTopBar from "../../components/ExamTopBar.jsx";
import Modal from "../../components/Modal.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import SectionLoadError from "../../components/SectionLoadError.jsx";

export default function MCQSection({ attemptId, step, onDone }) {
  const [questions, setQuestions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // committed answers: index -> option string
  const [draft, setDraft] = useState(null); // uncommitted radio selection for the open question
  const [visited, setVisited] = useState({});
  const [marked, setMarked] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showQuestionPaper, setShowQuestionPaper] = useState(false);
  const [showReportError, setShowReportError] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportErrorMsg] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}/section/${step.key}`)
      .then(({ data }) => {
        setQuestions(data.questions);
        setVisited({ 0: true });
      })
      .catch((err) => setLoadError(err.response?.data?.message));
  }, [attemptId, step.key]);

  // Whenever the open question changes, load its draft from whatever is
  // already committed (jumping away without saving discards the draft, by
  // design, exactly like the reference exam UI).
  useEffect(() => {
    setDraft(answers[current] ?? null);
    setVisited((v) => (v[current] ? v : { ...v, [current]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  function statusFor(i) {
    const answered = answers[i] !== undefined && answers[i] !== null && answers[i] !== "";
    const isMarked = !!marked[i];
    if (isMarked && answered) return "answered_marked";
    if (isMarked) return "marked";
    if (answered) return "answered";
    if (visited[i]) return "not_answered";
    return "not_visited";
  }

  function goTo(i) {
    setCurrent(i);
  }

  function commitAndAdvance({ markReview }) {
    setAnswers((prev) => ({ ...prev, [current]: draft ?? prev[current] ?? "" }));
    if (markReview) {
      setMarked((prev) => ({ ...prev, [current]: true }));
    }
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else if (!markReview) {
      // Save & Next on the LAST question used to be a dead-end no-op
      // (nowhere left to advance to). It now offers the same
      // submit-or-review confirmation the Submit button shows.
      setShowSubmitConfirm(true);
    }
  }

  function clearResponse() {
    setDraft(null);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[current];
      return next;
    });
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    // make sure whatever is currently selected but not yet saved is included
    const finalAnswers = { ...answers, [current]: draft ?? answers[current] ?? "" };
    const payload = questions.map((_, i) => ({
      index: i,
      userAnswer: finalAnswers[i] || "",
      timeTakenSec: 0,
    }));
    try {
      const { data } = await api.post(`/attempts/${attemptId}/section/${step.key}/submit`, {
        answers: payload,
      });
      onDone(data.sectionScore);
    } catch (err) {
      setSubmitting(false);
    }
  }

  async function sendReport() {
    if (!reportText.trim()) return;
    setSendingReport(true);
    setReportErrorMsg("");
    try {
      await api.post(`/attempts/${attemptId}/report-error`, {
        sectionKey: step.key,
        message: `Q${current + 1} (${step.label}): ${reportText.trim()}`,
      });
      setReportSent(true);
      setReportText("");
      setTimeout(() => {
        setReportSent(false);
        setShowReportError(false);
      }, 1200);
    } catch (err) {
      setReportErrorMsg(
        err.response?.data?.message || "Couldn't submit the report — check your connection and try again."
      );
    } finally {
      setSendingReport(false);
    }
  }

  if (loadError) return <SectionLoadError message={loadError} />;
  if (!questions) return <div className="page-center">Generating {step.label} questions...</div>;

  const q = questions[current];
  const counts = summarize(questions.length, statusFor);

  return (
    <div className="exam-shell">
      <ExamTopBar
        label={step.label}
        onOpenQuestionPaper={() => setShowQuestionPaper(true)}
        onReportError={() => setShowReportError(true)}
      />

      <div className="exam-body">
        <div className="exam-main">
          <div className="exam-meta-row">
            <span className="muted">
              Marks for correct response: <b className="word-ok">1.00</b> &nbsp;|&nbsp; Negative
              marking: <b>0.00</b>
            </span>
            <Timer durationSec={step.durationSec} onExpire={submit} resetKey={step.key} />
          </div>

          <div className="card question-card">
            <p className="muted small">Question No. {current + 1}</p>
            <p className="question-prompt">{q.prompt}</p>
            <div className="options">
              {(q.options || []).map((opt) => (
                <label
                  key={opt}
                  className={`option ${draft === opt ? "option-selected" : ""}`}
                  onClick={(e) => {
                    // clicking the already-selected option again deselects it
                    if (draft === opt) {
                      e.preventDefault();
                      setDraft(null);
                    }
                  }}
                >
                  <input type="radio" name={`q-${current}`} checked={draft === opt} onChange={() => setDraft(opt)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="section-footer exam-footer">
            <div className="exam-footer-left">
              <button className="btn btn-ghost" onClick={() => commitAndAdvance({ markReview: true })}>
                Mark for Review &amp; Next
              </button>
              <button className="btn btn-ghost" onClick={clearResponse}>
                Clear Response
              </button>
            </div>
            <div className="exam-footer-right">
              <button className="btn btn-primary" onClick={() => commitAndAdvance({ markReview: false })}>
                Save &amp; Next
              </button>
              <button className="btn btn-submit" onClick={() => setShowSubmitConfirm(true)} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>

        <QuestionPalette
          total={questions.length}
          statuses={Object.fromEntries(questions.map((_, i) => [i, statusFor(i)]))}
          current={current}
          onJump={goTo}
        />
      </div>

      {showQuestionPaper && (
        <Modal title={`${step.label} - Question Paper`} onClose={() => setShowQuestionPaper(false)} width="640px">
          <div className="question-paper-list">
            {questions.map((qq, i) => (
              <p key={i}>
                <strong>Q{i + 1}.</strong> {qq.prompt}
              </p>
            ))}
          </div>
          <p className="muted small">Options for multiple choice questions are not shown here.</p>
        </Modal>
      )}

      {showReportError && (
        <Modal
          title="Report an Error"
          onClose={() => {
            setShowReportError(false);
            setReportErrorMsg("");
          }}
          width="440px"
        >
          {reportSent ? (
            <p className="word-ok">Thanks, your report was submitted.</p>
          ) : (
            <>
              <p className="muted small">Describe what's wrong with Question {current + 1}.</p>
              <textarea
                className="text-area"
                rows={4}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="e.g. none of the options are correct..."
              />
              {reportError && <div className="alert-error">{reportError}</div>}
              <div className="confirm-dialog-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowReportError(false);
                    setReportErrorMsg("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={sendReport}
                  disabled={!reportText.trim() || sendingReport}
                >
                  {sendingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showSubmitConfirm && (
        <ConfirmDialog
          title={`Submit ${step.label}?`}
          message={
            <div className="submit-summary">
              <p>
                Answered: <b className="word-ok">{counts.answered + counts.answered_marked}</b>
              </p>
              <p>
                Not Answered: <b className="answer-wrong">{counts.not_answered}</b>
              </p>
              <p>
                Not Visited: <b>{counts.not_visited}</b>
              </p>
              <p>
                Marked for Review: <b>{counts.marked + counts.answered_marked}</b>
              </p>
              <p className="muted small">Once submitted you cannot change your answers for this section.</p>
            </div>
          }
          confirmLabel="Submit"
          onCancel={() => setShowSubmitConfirm(false)}
          onConfirm={() => {
            setShowSubmitConfirm(false);
            submit();
          }}
        />
      )}
    </div>
  );
}

function summarize(total, statusForFn) {
  const counts = { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 };
  for (let i = 0; i < total; i++) {
    const s = statusForFn(i);
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}
