import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthBrandPanel from "../components/AuthBrandPanel.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel />
      <div className="auth-panel-form">
        <form className="card auth-card" onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p className="muted">Log in to continue your mock test prep.</p>
          {error && <div className="alert-error">{error}</div>}
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? "Logging in..." : "Log in"}
          </button>
          <p className="muted small">
            No account? <Link to="/register">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
