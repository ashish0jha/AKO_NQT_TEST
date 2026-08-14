import Timer from "../../components/Timer.jsx";

export default function Break({ step, onDone }) {
  return (
    <div className="page-center">
      <div className="card break-card">
        <h2>Break</h2>
        <p className="muted">Take a short breather before the next coding round.</p>
        <Timer durationSec={step.durationSec} onExpire={() => onDone(null)} resetKey="break" />
        <button className="btn btn-ghost" onClick={() => onDone(null)}>
          Skip break
        </button>
      </div>
    </div>
  );
}
