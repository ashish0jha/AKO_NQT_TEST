export default function AuthBrandPanel() {
  return (
    <div className="auth-panel-brand">
      <span className="auth-brand-eyebrow">TCS NQT-style mock test</span>
      <h1 className="auth-brand-title">Sit the full test before you sit the real one.</h1>
      <p className="auth-brand-copy">
        81 items across 7 timed sections — numerical, reasoning, verbal, and two C++ coding
        rounds — with a real question palette, a live compiler, and AI-graded subjective
        sections. A fresh paper every attempt.
      </p>
      <div className="auth-brand-stats">
        <div className="auth-brand-stat">
          <b>7</b>
          <span>Sections</span>
        </div>
        <div className="auth-brand-stat">
          <b>81</b>
          <span>Items</span>
        </div>
        <div className="auth-brand-stat">
          <b>192</b>
          <span>Minutes</span>
        </div>
      </div>
    </div>
  );
}
