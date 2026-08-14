import { useEffect, useRef, useState } from "react";
import api from "../../api/axios.js";
import Timer from "../../components/Timer.jsx";
import SectionLoadError from "../../components/SectionLoadError.jsx";

export default function PassageRecall({ attemptId, step, onDone }) {
  const [passages, setPassages] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState("reading"); // reading | writing
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState({});
  const submittedRef = useRef(false);

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}/section/${step.key}`)
      .then(({ data }) => setPassages(data.questions))
      .catch((err) => setLoadError(err.response?.data?.message));
  }, [attemptId, step.key]);

  function startWriting() {
    setPhase("writing");
  }

  function finishWriting(currentText) {
    const nextAnswers = { ...answers, [current]: currentText ?? text };
    setAnswers(nextAnswers);
    setText("");

    if (current < passages.length - 1) {
      setCurrent((c) => c + 1);
      setPhase("reading");
    } else {
      submit(nextAnswers);
    }
  }

  async function submit(finalAnswers) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const payload = passages.map((_, i) => ({
      index: i,
      userAnswer: finalAnswers[i] || "",
      timeTakenSec: 0,
    }));
    const { data } = await api.post(`/attempts/${attemptId}/section/${step.key}/submit`, {
      answers: payload,
    });
    onDone(data.sectionScore);
  }

  if (loadError) return <SectionLoadError message={loadError} />;
  if (!passages) return <div className="page-center">Generating passages...</div>;

  const p = passages[current];

  return (
    <div className="section-shell">
      <div className="section-header">
        <h2>Passage Recall</h2>
        <div className="section-header-right">
          <span className="muted">
            Passage {current + 1} / {passages.length} - {phase === "reading" ? "Read" : "Write"}
          </span>
          {phase === "reading" ? (
            <Timer durationSec={step.readSec} onExpire={startWriting} resetKey={`read-${current}`} />
          ) : (
            <Timer
              durationSec={step.writeSec}
              onExpire={() => finishWriting()}
              resetKey={`write-${current}`}
            />
          )}
        </div>
      </div>

      <div className="card question-card">
        {phase === "reading" ? (
          <p className="question-prompt">{p.prompt}</p>
        ) : (
          <>
            <p className="muted small">
              Reconstruct the passage from memory, in your own words. It will not reappear.
            </p>
            <textarea
              className="text-area"
              autoFocus
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write what you remember..."
            />
          </>
        )}
      </div>

      <div className="section-footer">
        {phase === "reading" ? (
          <button className="btn btn-primary" onClick={startWriting}>
            I'm done reading
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => finishWriting()}>
            {current < passages.length - 1 ? "Next Passage" : "Submit Section"}
          </button>
        )}
      </div>
    </div>
  );
}
