import { useEffect, useRef, useState } from "react";
import api from "../../api/axios.js";
import Timer from "../../components/Timer.jsx";
import SectionLoadError from "../../components/SectionLoadError.jsx";

export default function SentenceCompletion({ attemptId, step, onDone }) {
  const [questions, setQuestions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [word, setWord] = useState("");
  const [answers, setAnswers] = useState({});
  const submittedRef = useRef(false);

  useEffect(() => {
    api
      .get(`/attempts/${attemptId}/section/${step.key}`)
      .then(({ data }) => setQuestions(data.questions))
      .catch((err) => setLoadError(err.response?.data?.message));
  }, [attemptId, step.key]);

  function goNext(currentWord) {
    const answer = (currentWord ?? word).trim().split(/\s+/)[0] || "";
    const nextAnswers = { ...answers, [current]: answer };
    setAnswers(nextAnswers);
    setWord("");

    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      submit(nextAnswers);
    }
  }

  async function submit(finalAnswers) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const payload = questions.map((_, i) => ({
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
  if (!questions) return <div className="page-center">Generating sentence completion items...</div>;

  const q = questions[current];

  return (
    <div className="section-shell">
      <div className="section-header">
        <h2>Sentence Completion</h2>
        <div className="section-header-right">
          <span className="muted">
            Item {current + 1} / {questions.length}
          </span>
          <Timer durationSec={step.perItemSec} onExpire={() => goNext()} resetKey={`${step.key}-${current}`} />
        </div>
      </div>

      <div className="card question-card">
        <p className="muted small">Type ONE word that best fits the meaning of the sentence.</p>
        <p className="question-prompt">{q.prompt}</p>
        <input
          className="text-input"
          autoFocus
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goNext()}
          placeholder="Type one word..."
        />
      </div>

      <div className="section-footer">
        <button className="btn btn-primary" onClick={() => goNext()}>
          {current < questions.length - 1 ? "Next" : "Submit Section"}
        </button>
      </div>
    </div>
  );
}
