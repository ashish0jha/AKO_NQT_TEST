import axios from "axios";

/**
 * Code execution is delegated to Wandbox (wandbox.org), a free public
 * online compilation service, rather than exec()'ing candidate code
 * ourselves. Running untrusted C++ locally is a real security hole
 * (arbitrary code execution on your server) — Wandbox runs it in an
 * isolated sandbox instead.
 *
 * No signup, no API key. Single endpoint:
 *   POST https://wandbox.org/api/compile.json
 *
 * Since the app only ever compiles C++, the compiler is hardcoded to
 * gcc-head (latest GCC trunk on Wandbox) with a C++17 standard switch.
 *
 * Response shape (relevant fields):
 *   compiler_output / compiler_error / compiler_message  - compile step
 *   program_output  / program_error  / program_message   - run step,
 *     present ONLY if compilation succeeded and the binary actually ran
 *   status  - the executed program's exit code, as a string (e.g. "0")
 *   signal  - set instead of status if the program was killed (e.g. timeout)
 */
const WANDBOX_URL = "https://wandbox.org/api/compile.json";
const COMPILER = "gcc-head";
const OPTIONS = "warning,gnu++17"; // -Wall -Wextra -std=gnu++17

/**
 * Submits source code + stdin, waits for the sandboxed result, and
 * returns { stdout, stderr, compileOutput, status }.
 */
export async function runSubmission({ sourceCode, stdin }) {
  let data;
  try {
    ({ data } = await axios.post(
      WANDBOX_URL,
      {
        compiler: COMPILER,
        code: sourceCode,
        stdin: stdin || "",
        options: OPTIONS,
        save: false,
      },
      { headers: { "Content-Type": "application/json" } }
    ));
  } catch (err) {
    throw new Error(
      `Wandbox request failed: ${err.response?.status || ""} ${err.message}`.trim()
    );
  }

  const programRan = data.program_message !== undefined;

  if (!programRan) {
    // Compilation itself failed (or was rejected) before any run happened.
    return {
      stdout: "",
      stderr: "",
      compileOutput: (data.compiler_message || data.compiler_error || data.compiler_output || "Compilation failed").trim(),
      status: "Compilation error",
    };
  }

  return {
    stdout: (data.program_output || "").trim(),
    stderr: data.program_error || "",
    compileOutput: "",
    status: data.signal
      ? `Runtime error (${data.signal})`
      : data.status === "0"
      ? "Accepted"
      : `Exited with status ${data.status}`,
  };
}

/**
 * Runs one submission against every test case (public + private) and
 * reports pass/fail per case, without leaking private inputs/outputs
 * back to the client (call this only from the backend, then strip
 * private case details before responding to the frontend).
 */
export async function runAgainstTestCases({ sourceCode, testCases }) {
  const results = [];
  for (const tc of testCases) {
    const r = await runSubmission({ sourceCode, stdin: tc.input });
    results.push({
      passed: r.stdout.trim() === String(tc.output).trim() && !r.stderr && !r.compileOutput,
      stdout: r.stdout,
      stderr: r.stderr,
      compileOutput: r.compileOutput,
      status: r.status,
    });
  }
  return results;
}
