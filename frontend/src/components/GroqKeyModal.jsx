import { useEffect, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Modal from "./Modal.jsx";

const GROQ_KEYS_URL = "https://console.groq.com/keys";

export default function GroqKeyModal({ onClose, onSaved }) {
  const { refreshUser } = useAuth();
  const [preview, setPreview] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get("/auth/groq-key")
      .then(({ data }) => setPreview(data.hasGroqKey ? data.preview : null))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function save() {
    setError("");
    if (!apiKey.trim()) {
      setError("Paste your Groq API key first.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put("/auth/groq-key", { apiKey: apiKey.trim() });
      setPreview(data.preview);
      setApiKey("");
      await refreshUser();
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the key. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      await api.delete("/auth/groq-key");
      setPreview(null);
      await refreshUser();
    } catch {
      setError("Could not remove the key. Try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal title="Your Groq API key" onClose={onClose} width="520px">
      <p className="muted small">
        This test generates every question live with Groq, and it runs on <b>your own</b> Groq
        API key — not a shared one — so it keeps working however this app is hosted, at no cost
        to whoever deployed it. Groq's free tier is generous enough for a full mock test.
      </p>

      <div className="groq-key-safety">
        <span className="groq-key-safety-icon">🔒</span>
        <div>
          <strong>Your key is encrypted and safe.</strong>
          <p className="muted small">
            It's encrypted (AES-256) before it's ever saved, and stored in that encrypted form —
            never as plain text. It's never shown to other users, never displayed back to you
            after saving (only a masked preview like <span className="mono">gsk_••••••••ab12</span>),
            and is used only on the server to call Groq on your behalf when you take a test.
          </p>
        </div>
      </div>

      <div className="groq-key-steps">
        <h4>How to get a free key</h4>
        <ol className="instructions-list">
          <li>
            Open{" "}
            <a href={GROQ_KEYS_URL} target="_blank" rel="noreferrer">
              console.groq.com/keys
            </a>{" "}
            and sign in (Google/GitHub/email — free, no card required).
          </li>
          <li>
            Click <strong>Create API Key</strong>, give it any name, and click <strong>Submit</strong>.
          </li>
          <li>Copy the key shown (it starts with <code>gsk_</code> and is only shown once).</li>
          <li>Paste it below and click Save.</li>
        </ol>
      </div>

      {checking ? (
        <p className="muted small">Checking your saved key...</p>
      ) : preview ? (
        <div className="groq-key-current">
          <span className="dot dot-answered">✓</span>
          <span>
            Key saved: <span className="mono">{preview}</span>
          </span>
        </div>
      ) : (
        <p className="muted small">No key saved yet — tests can't be generated until you add one.</p>
      )}

      {error && <div className="alert-error">{error}</div>}

      <input
        className="text-input"
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="gsk_..."
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <p className="muted small groq-key-input-note">🔒 Encrypted before it's stored — safe to paste here.</p>

      <div className="confirm-dialog-actions">
        {preview && (
          <button className="btn btn-ghost" onClick={remove} disabled={removing}>
            {removing ? "Removing..." : "Remove key"}
          </button>
        )}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : preview ? "Update key" : "Save key"}
        </button>
      </div>
    </Modal>
  );
}
