import { useEffect, useRef, useState } from "react";
import api from "../../api/axios.js";
import Timer from "../../components/Timer.jsx";
import SectionLoadError from "../../components/SectionLoadError.jsx";

// Coding rounds are C++ only.
const LANGUAGE = "C++";
const STARTER_CPP =
  "#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n    // Read from stdin, print to stdout\n    return 0;\n}\n";

export default function CodingSection({ attemptId, step, onDone }) {
  const [problem, setProblem] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const language = LANGUAGE;
  const [code, setCode] = useState(STARTER_CPP);
  const [runResults, setRunResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    api
      .get(`/coding/${attemptId}/section/${step.key}`)
      .then(({ data }) => setProblem(data))
      .catch((err) => setLoadError(err.response?.data?.message));
  }, [attemptId, step.key]);

  async function runPublic() {
    setRunning(true);
    setRunResults(null);
    try {
      const { data } = await api.post(`/coding/${attemptId}/section/${step.key}/run`, {
        language,
        sourceCode: code,
      });
      setRunResults(data.results);
    } finally {
      setRunning(false);
    }
  }

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const { data } = await api.post(`/coding/${attemptId}/section/${step.key}/submit`, {
        language,
        sourceCode: code,
      });
      onDone(data.sectionScore);
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(
        err.response?.data?.message ||
          "Couldn't evaluate your submission — this is usually a slow/unavailable compiler service. Try again."
      );
    }
  }

  if (loadError) return <SectionLoadError message={loadError} />;
  if (!problem) return <div className="page-center">Generating your coding problem...</div>;

  if (submitting) {
    return (
      <div className="page-center page-center-col">
        <p>Evaluating your code against all test cases...</p>
        <p className="muted small">This runs your solution through the full test suite - it can take up to a minute.</p>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <div className="section-header">
        <h2>{step.label}</h2>
        <Timer durationSec={step.durationSec} onExpire={submit} resetKey={step.key} />
      </div>

      {submitError && (
        <div className="alert-error">
          {submitError} <button className="link-btn" onClick={submit}>Try again</button>
        </div>
      )}

      <div className="coding-layout">
        <div className="card coding-statement">
          <h3>{problem.title}</h3>
          <pre className="statement-text">{problem.statement}</pre>
          <h4>Sample test cases</h4>
          {problem.publicTestCases.map((tc, i) => (
            <div key={i} className="testcase">
              <div>
                <strong>Input</strong>
                <pre>{tc.input}</pre>
              </div>
              <div>
                <strong>Expected output</strong>
                <pre>{tc.output}</pre>
              </div>
            </div>
          ))}
        </div>

        <div className="card coding-editor">
          <div className="coding-editor-toolbar">
            <span className="lang-badge">C++</span>
            <button className="btn btn-ghost" onClick={runPublic} disabled={running}>
              {running ? "Running..." : "Compile & Test"}
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit & Next"}
            </button>
          </div>
          <textarea
            className="code-area"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {runResults && (
            <div className="run-results">
              {runResults.map((r, i) => (
                <div key={i} className={`run-result ${r.passed ? "pass" : "fail"}`}>
                  <span>Public test {i + 1}: {r.passed ? "Passed" : "Failed"}</span>
                  {!r.passed && (
                    <pre>{r.compileOutput || r.stderr || `Got: ${r.stdout}`}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
