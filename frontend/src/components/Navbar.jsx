import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GroqKeyModal from "./GroqKeyModal.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        AKO<span>.</span>
      </Link>
      <nav>
        {user ? (
          <>
            <button className="navbar-key-btn" onClick={() => setShowKeyModal(true)}>
              <span className={`navbar-key-dot ${user.hasGroqKey ? "ok" : "warn"}`} />
              API Key
            </button>
            <span className="navbar-user">
              <span className="navbar-avatar">{initial}</span>
              {user.name.split(" ")[0]}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost" to="/login">
              Log in
            </Link>
            <Link className="btn btn-primary" to="/register">
              Sign up
            </Link>
          </>
        )}
      </nav>

      {showKeyModal && <GroqKeyModal onClose={() => setShowKeyModal(false)} />}
    </header>
  );
}
