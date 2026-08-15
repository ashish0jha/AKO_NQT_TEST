export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="/" className="brand">
              Admit<span>.</span>
            </a>
            <p className="footer-tagline">
              A full-length, exam-console mock test that mirrors the TCS NQT section pattern —
              timed rounds, a real question palette, and a fresh paper every attempt.
            </p>
          </div>
          <div className="footer-engine">
            <span className="footer-engine-title">Live under the hood</span>
            <span className="footer-engine-row">
              <span className="footer-engine-dot" /> Questions generated per attempt by Groq
            </span>
            <span className="footer-engine-row">
              <span className="footer-engine-dot" /> C++ compiled &amp; run via Wandbox (gcc-head)
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} Admit. Independent practice tool — not affiliated with or endorsed by TCS.</span>
          <span>Built for practice, not proctoring.</span>
        </div>
      </div>
    </footer>
  );
}
