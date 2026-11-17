import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePageMeta } from "../lib/usePageMeta";

export default function NotFound() {
  const { isLight } = useTheme();

  usePageMeta({
    title: "Page not found",
    description: "The page you are looking for does not exist in Wisdom Vault.",
    path: "/404",
    robots: "noindex,follow",
  });

  return (
    <main id="main-content" tabIndex={-1} style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <div
          aria-hidden="true"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "clamp(64px, 18vw, 120px)",
            fontWeight: 800,
            lineHeight: 1,
            color: isLight ? "rgba(2,132,199,0.25)" : "rgba(0,240,255,0.18)",
            marginBottom: 12,
          }}
        >
          404
        </div>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 18,
          letterSpacing: 2,
          color: isLight ? "#1e293b" : "#e0f0ff",
          marginBottom: 10,
        }}>
          PAGE NOT FOUND
        </h1>
        <p style={{ color: isLight ? "#64748b" : "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>
          This route is not part of the vault. Head back to the subjects and documents.
        </p>
        <Link
          to="/"
          className="wv-action-btn"
          style={{
            display: "inline-block",
            padding: "11px 22px",
            border: isLight ? "1px solid rgba(2,132,199,0.35)" : "1px solid rgba(0,240,255,0.3)",
            borderRadius: 8,
            background: isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.08)",
            color: isLight ? "#0284c7" : "#00f0ff",
            textDecoration: "none",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          RETURN HOME
        </Link>
      </div>
    </main>
  );
}
