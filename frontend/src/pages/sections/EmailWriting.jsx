import { useEffect, useRef, useState } from "react";
import api from "../../api/axios.js";
import Timer from "../../components/Timer.jsx";
import SectionLoadError from "../../components/SectionLoadError.jsx";

export default function EmailWriting({ attemptId, step, onDone }) {
  const [situation, setSituation] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [text, setText] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}/section/${step.key}`)
      .then(({ data }) => setSituation(data.questions[0].prompt))
      .catch((err) => setLoadError(err.response?.data?.message));
  }, [attemptId, step.key]);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const { data } = await api.post(`/attempts/${attemptId}/section/${step.key}/submit`, {
      answers: [{ index: 0, userAnswer: text, timeTakenSec: 0 }],
    });
    onDone(data.sectionScore);
  }

  if (loadError) return <SectionLoadError message={loadError} />;
  if (!situation) return <div className="page-center">Generating your email prompt...</div>;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="section-shell">
      <div className="section-header">
        <h2>Email Writing</h2>
        <div className="section-header-right">
          <span className={`muted ${wordCount < step.minWords ? "" : "word-ok"}`}>
            {wordCount} / {step.minWords} words
          </span>
          <Timer durationSec={step.durationSec} onExpire={submit} resetKey={step.key} />
        </div>
      </div>

      <div className="card question-card">
        <p className="muted small">Situation</p>
        <p className="question-prompt">{situation}</p>
        <textarea
          className="text-area"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your email here (minimum 100 words)..."
        />
      </div>

      <div className="section-footer">
        <button className="btn btn-primary" onClick={submit}>
          Submit Section
        </button>
      </div>
    </div>
  );
}
