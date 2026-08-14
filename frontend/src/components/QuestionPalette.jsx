// Renders the right-hand "Choose a Question" panel used by exam-style
// sections: status counters + a grid of numbered buttons color-coded by
// status, matching the classic TCS-NQT-style palette.
//
// statuses (per question index):
//   "not_visited"        - gray, never opened
//   "not_answered"       - red, opened but no answer saved
//   "answered"           - green, answer saved
//   "marked"             - purple, marked for review, no answer saved
//   "answered_marked"    - purple with green dot, answered AND marked

export default function QuestionPalette({
  candidateLabel = "Candidate",
  total,
  statuses,
  current,
  onJump,
}) {
  const counts = { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 };
  for (let i = 0; i < total; i++) {
    const s = statuses[i] || "not_visited";
    counts[s] = (counts[s] || 0) + 1;
  }

  return (
    <aside className="palette-panel">
      <div className="palette-user">
        <div className="palette-avatar">👤</div>
        <span>{candidateLabel}</span>
      </div>

      <div className="palette-counts">
        <div className="palette-count">
          <span className="dot dot-answered">{counts.answered}</span>
          <span>Answered</span>
        </div>
        <div className="palette-count">
          <span className="dot dot-not_answered">{counts.not_answered}</span>
          <span>Not Answered</span>
        </div>
        <div className="palette-count">
          <span className="dot dot-not_visited">{counts.not_visited}</span>
          <span>Not Visited</span>
        </div>
        <div className="palette-count">
          <span className="dot dot-marked">{counts.marked}</span>
          <span>Marked for Review</span>
        </div>
        <div className="palette-count palette-count-wide">
          <span className="dot dot-answered_marked">{counts.answered_marked}</span>
          <span>Answered &amp; Marked for Review (will be considered for evaluation)</span>
        </div>
      </div>

      <p className="palette-heading">Choose a Question</p>
      <div className="palette-grid">
        {Array.from({ length: total }).map((_, i) => {
          const status = statuses[i] || "not_visited";
          const isCurrent = i === current;
          return (
            <button
              key={i}
              className={`palette-cell dot-${status} ${isCurrent ? "palette-cell-current" : ""}`}
              onClick={() => onJump(i)}
              title={`Question ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
