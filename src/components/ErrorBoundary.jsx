import React from "react";
import { captureError } from "../lib/monitoring";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    captureError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          background: "#080818",
          color: "#e0f0ff",
          textAlign: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ fontSize: 44, color: "#ff6060" }}>!</div>
        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: "#ff8080",
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          SOMETHING WENT WRONG
        </h1>
        <p style={{ maxWidth: 420, color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
          The vault hit an unexpected error. Reload the page to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "11px 24px",
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.35)",
            borderRadius: 8,
            color: "#00f0ff",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 1,
          }}
        >
          RELOAD PAGE
        </button>
      </div>
    );
  }
}
