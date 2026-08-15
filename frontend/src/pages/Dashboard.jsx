import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import GroqKeyModal from "../components/GroqKeyModal.jsx";

const GROUP_PREVIEW = [
  { label: "Numerical Ability", items: 20, minutes: 25 },
  { label: "Reasoning Ability", items: 20, minutes: 25 },
  { label: "Advanced Quantitative and Reasoning Ability", items: 14, minutes: 25 },
  { label: "Verbal Ability", items: 25, minutes: 26 },
  { label: "Advanced Coding - Easy (C++)", items: 1, minutes: 35 },
  { label: "Break", items: null, minutes: 1 },
  { label: "Advanced Coding - Medium (C++)", items: 1, minutes: 55 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [starting, setStarting] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    api.get("/attempts").then(({ data }) => setHistory(data)).catch(() => {});
  }, []);

  async function startTest() {
    if (!user?.hasGroqKey) {
      setShowKeyModal(true);
      return;
    }
    setStarting(true);
    try {
      const { data } = await api.post("/attempts/start");
      navigate(`/test/${data.attemptId}`);
    } finally {
      setStarting(false);
    }
  }

  const latest = history[0];
  const hasInProgress = latest && latest.status === "in_progress";
  const hasCompleted = history.some((a) => a.status !== "in_progress");
  const lastFinished = history.find((a) => a.status !== "in_progress");

  const statusClass = hasInProgress ? "progress" : hasCompleted ? "done" : "new";
  const statusLabel = hasInProgress
    ? "In progress — resume where you left off"
    : hasCompleted
    ? "Last attempt completed"
    : "Not started yet";

  return (
    <div className="container">
      <section className="ticket">
        <div className="ticket-main">
          <span className="ticket-eyebrow">Admit card</span>
          <h1>TCS NQT-style Mock Test</h1>
          <p className="muted">
            81 items across 7 groups, 192 minutes total — matching the official pattern exactly.
            Questions are generated fresh by AI every attempt. Coding rounds are C++ only,
            compiled live.
          </p>

          {!user?.hasGroqKey && (
            <div className="groq-key-banner">
              <span className="dot dot-marked">!</span>
              <span>
                Add your free Groq API key to generate questions.{" "}
                <button className="link-btn" onClick={() => setShowKeyModal(true)}>
                  Add key
                </button>
              </span>
            </div>
          )}

          <table className="ticket-structure">
            <thead>
              <tr>
                <th>Group</th>
                <th>Items</th>
                <th>Minutes</th>
              </tr>
            </thead>
            <tbody>
              {GROUP_PREVIEW.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td>{g.items ?? "—"}</td>
                  <td>{g.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ticket-divider" />

        <div className="ticket-stub">
          <div>
            <div className="ticket-stub-label">Status</div>
            <div className="ticket-status">
              <span className={`ticket-status-dot ${statusClass}`} />
              {statusLabel}
            </div>
          </div>

          <div className="ticket-barcode" />

          <div className="ticket-stub-actions">
            {hasInProgress ? (
              <button className="btn btn-primary" onClick={() => navigate(`/test/${latest._id}`)}>
                Resume Test
              </button>
            ) : (
              <button className="btn btn-primary" onClick={startTest} disabled={starting}>
                {starting ? "Preparing your test…" : hasCompleted ? "Start New Test" : "Start Test"}
              </button>
            )}
            {hasCompleted && lastFinished && (
              <button
                className="btn btn-ghost btn-on-dark"
                onClick={() => navigate(`/results/${lastFinished._id}`)}
              >
                View last result
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-title-row">
          <h2>Your attempt history</h2>
          {history.length > 0 && <span className="muted small">{history.length} total</span>}
        </div>
        {history.length === 0 && <p className="muted">No attempts yet — start your first test above.</p>}
        {history.length > 0 && (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((a) => (
                <tr key={a._id}>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${a.status}`}>{a.status.replace("_", " ")}</span>
                  </td>
                  <td>{typeof a.overallScore === "number" ? `${a.overallScore}%` : "—"}</td>
                  <td>
                    {a.status === "in_progress" ? (
                      <button className="btn btn-ghost" onClick={() => navigate(`/test/${a._id}`)}>
                        Resume
                      </button>
                    ) : (
                      <button className="btn btn-ghost" onClick={() => navigate(`/results/${a._id}`)}>
                        View result
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showKeyModal && (
        <GroqKeyModal onClose={() => setShowKeyModal(false)} onSaved={() => setShowKeyModal(false)} />
      )}
    </div>
  );
}
