import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { downloadPdf } from "../lib/download";
import { trackEvent } from "../lib/analytics";
import useUserLibrary from "../lib/useUserLibrary";

export default function SubjectCard({ subject, contents, expanded, onExpand, onCollapse, index = 0 }) {
  const navigate = useNavigate();
  const { isLight } = useTheme();
  const { bookmarks, toggleBookmark } = useUserLibrary();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  const handleDownload = async (item) => {
    if (downloadingId) return;
    setDownloadingId(item.id);
    setDownloadError(null);
    try {
      await downloadPdf(item.pdf_url, item.title, {
        type: item.type,
        subject: subject.code,
        source: "subject_card",
      });
      setDownloadedId(item.id);
      setTimeout(() => {
        setDownloadedId(current => (current === item.id ? null : current));
      }, 2200);
    } catch (error) {
      setDownloadError({ id: item.id, message: error.message });
    } finally {
      setDownloadingId(current => (current === item.id ? null : current));
    }
  };

  const handleBookmark = (item) => {
    const saved = toggleBookmark(item.id);
    trackEvent("document_bookmark", {
      type: item.type,
      subject: subject.code,
      action: saved ? "saved" : "removed",
      source: "subject_card",
    });
  };

  const isItemSaved = (id) => bookmarks.some(bookmark => bookmark.id === id);

  const handleKeyDown = (event) => {
    if (expanded) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onExpand?.();
    }
  };

  const notes = contents?.filter(c => c.type === "note") || [];
  const qbs = contents?.filter(c => c.type === "qb") || [];
  const papers = contents?.filter(c => c.type === "paper") || [];

  const handleCardClick = () => {
    if (!expanded) onExpand?.();
  };

  const handleBack = (e) => {
    e.stopPropagation();
    onCollapse?.();
  };

  const stats = [
    { label: "Notes", count: notes.length, color: isLight ? "#0284c7" : "#00f0ff" },
    { label: "Q-Banks", count: qbs.length, color: isLight ? "#7c3aed" : "#a855f7" },
    { label: "Papers", count: papers.length, color: isLight ? "#d97706" : "#f59e0b" },
  ];

  const defaultBorder = isLight ? "rgba(2, 132, 199, 0.22)" : "rgba(0,240,255,0.15)";
  const defaultShadow = isLight ? "0 4px 20px rgba(2, 132, 199, 0.06)" : "none";
  const hoverBorder = isLight ? "rgba(2, 132, 199, 0.55)" : "rgba(0,240,255,0.5)";
  const hoverShadow = isLight ? "0 8px 30px rgba(2, 132, 199, 0.16)" : "0 0 30px rgba(0,240,255,0.2)";

  return (
    <div 
      id={`subject-card-${subject.id}`}
      className="wv-subject-card"
      role={!expanded ? "button" : undefined}
      tabIndex={!expanded ? 0 : undefined}
      aria-expanded={!expanded ? false : undefined}
      aria-label={!expanded ? `Open ${subject.name}` : undefined}
      onKeyDown={handleKeyDown}
      style={{
        background: isLight ? "rgba(244, 235, 206, 0.95)" : "rgba(0,240,255,0.03)",
        border: `1px solid ${defaultBorder}`,
        borderRadius: 16,
        padding: expanded ? 24 : 20,
        backdropFilter: "blur(12px)",
        boxShadow: defaultShadow,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: expanded ? "default" : "pointer",
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: 84,
        animationDelay: `${Math.min(index, 8) * 55}ms`,
      }}
      onClick={!expanded ? handleCardClick : undefined}
      onMouseEnter={e => {
        if (!expanded) {
          e.currentTarget.style.borderColor = hoverBorder;
          e.currentTarget.style.boxShadow = hoverShadow;
          e.currentTarget.style.transform = "translateY(-4px)";
        }
      }}
      onMouseLeave={e => {
        if (!expanded) {
          e.currentTarget.style.borderColor = defaultBorder;
          e.currentTarget.style.boxShadow = defaultShadow;
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Back Button */}
      {expanded && (
        <button
          onClick={handleBack}
          className="wv-action-btn"
          style={{
            position: "absolute",
            top: 16,
            left: 20,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: isLight ? "rgba(2, 132, 199, 0.1)" : "rgba(0,240,255,0.1)",
            border: isLight ? "1px solid rgba(2, 132, 199, 0.4)" : "1px solid rgba(0,240,255,0.4)",
            color: isLight ? "#0284c7" : "#67e8f9",
            padding: "8px 18px",
            borderRadius: 50,
            fontSize: 12.5,
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 1,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          ← CLOSE SUBJECT 
        </button>
      )}

      {/* Subject Header */}
      <div style={{ marginBottom: expanded ? 20 : 16, paddingTop: expanded ? 50 : 0 }}>
        <div style={{
          fontSize: 11,
          color: isLight ? "#0284c7" : "rgba(0,240,255,0.6)",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: 2.5,
          marginBottom: 6,
          fontWeight: 600,
        }}>
          {subject.code}
        </div>
        <div style={{
          fontSize: expanded ? 20 : 17,
          fontWeight: 700,
          color: isLight ? "#1e293b" : "#e0f0ff",
          letterSpacing: 0.5,
          lineHeight: 1.3,
        }}>
          {subject.name}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: expanded ? 24 : 16 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            textAlign: "center",
            padding: "11px 8px",
            background: isLight ? `${s.color}12` : `${s.color}10`,
            border: isLight ? `1px solid ${s.color}35` : `1px solid ${s.color}30`,
            borderRadius: 10,
            boxShadow: isLight ? "0 2px 6px rgba(0,0,0,0.03)" : "none",
          }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{
              fontSize: 10,
              fontWeight: isLight ? 600 : 400,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.5)",
              marginTop: 3,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="wv-expand-content">
          {[
            { label: "Notes", items: notes, color: isLight ? "#0284c7" : "#00f0ff" },
            { label: "Question Banks", items: qbs, color: isLight ? "#7c3aed" : "#a855f7" },
            { label: "Previous Papers", items: papers, color: isLight ? "#d97706" : "#f59e0b" },
          ].map((section, si) => (
            section.items.length > 0 && (
              <div key={si} style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: section.color,
                  letterSpacing: 2, fontFamily: "'Orbitron', sans-serif",
                  marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: section.color }} />
                  {section.label.toUpperCase()}
                </div>

                {section.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className="wv-card-item"
                    style={{
                      padding: "16px 18px",
                      background: isLight ? "rgba(238, 227, 196, 0.9)" : "rgba(255,255,255,0.03)",
                      border: isLight ? "1px solid rgba(2, 132, 199, 0.15)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      marginBottom: 10,
                      boxShadow: isLight ? "0 2px 6px rgba(0,0,0,0.03)" : "none",
                      animationDelay: `${Math.min(itemIndex, 8) * 40}ms`,
                    }}
                  >
                    <div style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: isLight ? "#1e293b" : "#e0f0ff",
                      marginBottom: 12,
                    }}>
                      {item.title}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => navigate(`/pdf/${item.id}`)}
                        aria-label={`View ${item.title}`}
                        className="wv-action-btn"
                        style={{
                          flex: 1, padding: "10px",
                          background: isLight ? `${section.color}15` : `${section.color}15`,
                          border: isLight ? `1px solid ${section.color}50` : `1px solid ${section.color}40`,
                          borderRadius: 8,
                          color: section.color, fontSize: 12.5, fontFamily: "'Orbitron', sans-serif",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        👁️ VIEW
                      </button>
                      <button
                        onClick={() => handleDownload(item)}
                        disabled={downloadingId === item.id}
                        aria-label={`Download ${item.title}`}
                        aria-busy={downloadingId === item.id}
                        className="wv-action-btn"
                        style={{
                          flex: 1, padding: "10px",
                          background: isLight ? `${section.color}15` : `${section.color}15`,
                          border: isLight ? `1px solid ${section.color}50` : `1px solid ${section.color}40`,
                          borderRadius: 8,
                          color: section.color, fontSize: 12.5, fontFamily: "'Orbitron', sans-serif",
                          cursor: downloadingId === item.id ? "wait" : "pointer",
                          transition: "all 0.2s ease",
                          opacity: downloadingId && downloadingId !== item.id ? 0.6 : 1,
                        }}
                      >
                        {downloadingId === item.id
                          ? "SAVING..."
                          : downloadedId === item.id
                            ? "SAVED"
                            : "⬇️ DOWNLOAD"}
                      </button>
                      <button
                        onClick={() => handleBookmark(item)}
                        aria-label={`${isItemSaved(item.id) ? "Remove" : "Save"} ${item.title} ${isItemSaved(item.id) ? "from" : "to"} saved documents`}
                        aria-pressed={isItemSaved(item.id)}
                        className="wv-action-btn"
                        style={{
                          flex: "0 0 42px",
                          minHeight: 40,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          background: isItemSaved(item.id)
                            ? (isLight ? `${section.color}22` : `${section.color}20`)
                            : "transparent",
                          border: isLight ? `1px solid ${section.color}50` : `1px solid ${section.color}40`,
                          borderRadius: 8,
                          color: section.color,
                          cursor: "pointer",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={isItemSaved(item.id) ? "currentColor" : "none"} aria-hidden="true">
                          <path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {downloadError?.id === item.id && (
                      <p role="alert" style={{
                        color: isLight ? "#b91c1c" : "#ff9090",
                        fontSize: 10.5,
                        marginTop: 8,
                        lineHeight: 1.5,
                      }}>
                        {downloadError.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          ))}
        </div>
      )}

      {!expanded && (
        <div style={{
          textAlign: "center", marginTop: 12,
          color: isLight ? "#0284c7" : "#67e8f9",
          fontSize: 12.5, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1.5,
          fontWeight: 600,
        }}>
          CLICK TO EXPAND SUBJECT →
        </div>
      )}
    </div>
  );
}