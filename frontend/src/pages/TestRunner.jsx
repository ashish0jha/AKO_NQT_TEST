import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { STEPS } from "../testStructure.js";
import api from "../api/axios.js";
import InstructionsPage from "../components/InstructionsPage.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import MCQSection from "./sections/MCQSection.jsx";
import SentenceCompletion from "./sections/SentenceCompletion.jsx";
import PassageRecall from "./sections/PassageRecall.jsx";
import EmailWriting from "./sections/EmailWriting.jsx";
import CodingSection from "./sections/CodingSection.jsx";
import Break from "./sections/Break.jsx";

export default function TestRunner() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(true);

  const step = STEPS[stepIndex];

  // On load, check whether this attempt already has progress (e.g. the user
  // clicked "Resume" from the dashboard). If so, skip straight past the
  // instructions and pick up at the last saved step instead of restarting.
  useEffect(() => {
    let cancelled = false;
    api
      .get(`/attempts/${attemptId}`)
      .then(({ data }) => {
        if (cancelled) return;
        if (data.status !== "in_progress") {
          navigate(`/results/${attemptId}`, { replace: true });
          return;
        }
        const resumeIndex = Math.min(data.lastStepIndex || 0, STEPS.length - 1);
        if (resumeIndex > 0 || (data.sections && data.sections.length > 0)) {
          setStepIndex(resumeIndex);
          setShowInstructions(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingAttempt(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Warn before an accidental tab close / refresh mid-test.
  useEffect(() => {
    if (showInstructions || finishing) return;
    function handler(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showInstructions, finishing]);

  // Best-effort progress checkpoint, so a resumed "in progress" attempt on
  // the dashboard can be picked back up close to where it left off.
  useEffect(() => {
    if (showInstructions) return;
    api.post(`/attempts/${attemptId}/progress`, { stepIndex }).catch(() => {});
  }, [attemptId, stepIndex, showInstructions]);

  function handleSectionDone() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finishAttempt();
    }
  }

  async function finishAttempt() {
    setFinishing(true);
    await api.post(`/attempts/${attemptId}/complete`);
    navigate(`/results/${attemptId}`);
  }

  async function confirmQuit() {
    setQuitting(true);
    try {
      await api.post(`/attempts/${attemptId}/abandon`);
    } finally {
      navigate(`/results/${attemptId}`);
    }
  }

  if (loadingAttempt) {
    return <div className="page-center">Loading your test...</div>;
  }

  if (showInstructions) {
    return <InstructionsPage onStart={() => setShowInstructions(false)} />;
  }

  if (finishing) {
    return <div className="page-center">Scoring your test...</div>;
  }

  return (
    <div className="test-runner">
      <div className="test-runner-topbar">
        <ProgressBar current={stepIndex} total={STEPS.length} />
        <button className="btn btn-quit" onClick={() => setShowQuitConfirm(true)} disabled={quitting}>
          Quit Test
        </button>
      </div>

      {/* key=step.key forces a full remount when moving between sections
          (including consecutive sections of the same "kind"), so each
          section starts with fresh state instead of reusing stale
          current-question / answers / submitted state from the previous
          one - this was the cause of "Next" silently breaking after the
          first couple of sections. */}
      {renderStep(step, attemptId, handleSectionDone)}

      {showQuitConfirm && (
        <ConfirmDialog
          title="Quit the test?"
          message="Sections you've already submitted will still be scored, but anything left will count as not attempted. This can't be undone."
          confirmLabel={quitting ? "Quitting..." : "Quit Test"}
          danger
          onCancel={() => setShowQuitConfirm(false)}
          onConfirm={confirmQuit}
        />
      )}
    </div>
  );
}

function renderStep(step, attemptId, onDone) {
  const props = { attemptId, step, onDone };
  switch (step.kind) {
    case "mcq":
      return <MCQSection key={step.key} {...props} />;
    case "sentence_completion":
      return <SentenceCompletion key={step.key} {...props} />;
    case "passage_recall":
      return <PassageRecall key={step.key} {...props} />;
    case "email_writing":
      return <EmailWriting key={step.key} {...props} />;
    case "coding":
      return <CodingSection key={step.key} {...props} />;
    case "break":
      return <Break key={step.key} step={step} onDone={onDone} />;
    default:
      return null;
  }
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
      <span className="progress-label">
        Step {current + 1} of {total}
      </span>
    </div>
  );
}
