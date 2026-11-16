import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Invalid credentials. Access denied.");
    } else {
      navigate("/admin");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(0,240,255,0.05)",
    border: "1px solid rgba(0,240,255,0.2)",
    borderRadius: 10,
    color: "#e0f0ff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    display: "block",
    fontSize: 10,
    color: "rgba(0,240,255,0.6)",
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: 2,
    marginBottom: 8,
  };

  return (
    <div className="wv-fade-in" style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "#080818",
      overflowY: "auto",
      display: "flex",
      padding: 20,
    }}>
      <button onClick={() => navigate("/")} className="wv-action-btn" style={{
        position: "absolute", top: 20, left: 20,
        display: "flex", alignItems: "center", gap: 6,
        background: "transparent", border: "none",
        color: "rgba(0,240,255,0.5)", cursor: "pointer",
        fontSize: 12, fontFamily: "'Orbitron', sans-serif",
        letterSpacing: 1, padding: 0,
      }}>
        ← BACK TO HOME
      </button>

      <div className="wv-scale-in" style={{
        width: "100%", maxWidth: 400,
        margin: "auto",
        background: "rgba(0,240,255,0.03)",
        border: "1px solid rgba(0,240,255,0.2)",
        borderRadius: 20, padding: 36,
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 40px rgba(0,240,255,0.08)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #00f0ff, transparent)",
        }} />

        <div style={{
          width: 60, height: 60,
          background: "rgba(0,240,255,0.08)",
          border: "1px solid rgba(0,240,255,0.3)",
          borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 0 20px rgba(0,240,255,0.15)",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2"
              stroke="#00f0ff" strokeWidth="1.5" fill="rgba(0,240,255,0.1)" />
            <path d="M7 11V7a5 5 0 0110 0v4"
              stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.5" fill="#00f0ff" />
          </svg>
        </div>

        <h2 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 18, fontWeight: 700,
          color: "#00f0ff", textAlign: "center",
          letterSpacing: 3, marginBottom: 6,
          textShadow: "0 0 15px rgba(0,240,255,0.4)",
        }}>
          ADMIN ACCESS
        </h2>
        <p style={{
          textAlign: "center", fontSize: 12,
          color: "rgba(255,255,255,0.3)",
          marginBottom: 28, letterSpacing: 0.5,
        }}>
          Authorized personnel only
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter admin email"
              autoComplete="username"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "rgba(0,240,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(0,240,255,0.2)"}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "rgba(0,240,255,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(0,240,255,0.2)"}
            />
          </div>

          {error && (
            <div
              key={error}
              className="wv-shake"
              style={{
                padding: "10px 14px",
                background: "rgba(255,60,60,0.1)",
                border: "1px solid rgba(255,60,60,0.3)",
                borderRadius: 8, color: "#ff8080",
                fontSize: 13, marginBottom: 16, textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="wv-action-btn"
            style={{
              width: "100%", padding: 14,
              background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,240,255,0.05))",
              border: "1px solid rgba(0,240,255,0.4)",
              borderRadius: 10, color: "#00f0ff",
              fontSize: 13, fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 2,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: (!email || !password) ? 0.5 : 1,
              animation: loading ? "wv-pulse 1s ease-in-out infinite" : "none",
            }}
          >
            {loading ? "VERIFYING..." : "ENTER VAULT"}
          </button>
        </form>

        <style>{`input::placeholder { color: rgba(255,255,255,0.2); }`}</style>
      </div>
    </div>
  );
}
