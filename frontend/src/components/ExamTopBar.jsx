export default function ExamTopBar({ label, onOpenQuestionPaper, onReportError }) {
  return (
    <div className="exam-topbar">
      <span className="exam-topbar-label">{label}</span>
      <div className="exam-topbar-actions">
        {onOpenQuestionPaper && (
          <button className="exam-topbar-btn" onClick={onOpenQuestionPaper}>
            ▶ Question Paper
          </button>
        )}
        {onReportError && (
          <button className="exam-topbar-btn exam-topbar-btn-warn" onClick={onReportError}>
            ⚠ Report Error
          </button>
        )}
      </div>
    </div>
  );
}
