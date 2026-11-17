import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import FuturisticLoader from "../components/FuturisticLoader";
import { downloadPdf } from "../lib/download";
import { trackEvent } from "../lib/analytics";
import { usePageMeta } from "../lib/usePageMeta";
import { formatFileSize, formatRelativeTime } from "../lib/format";
import { loadPdfMetadata } from "../lib/pdfMetadata";
import { sharePdf } from "../lib/share";
import useUserLibrary from "../lib/useUserLibrary";
import { recordPdfView } from "../lib/userLibrary";

function isMobilePdfEnvironment() {
  if (typeof window === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const isPhoneOrTablet = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const isIPadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
  return isPhoneOrTablet || isIPadDesktopMode || window.matchMedia("(max-width: 760px)").matches;
}

export default function PDFViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [isMobile, setIsMobile] = useState(isMobilePdfEnvironment);
  const [showInline, setShowInline] = useState(false);
  const [metadata, setMetadata] = useState({ fileSize: null, pageCount: null });
  const [lastViewedAt, setLastViewedAt] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const trackedView = useRef(false);
  const { isLight } = useTheme();
  const { bookmarks, toggleBookmark } = useUserLibrary();

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("content")
      .select("*, subjects(name)")
      .eq("id", id)
      .single();

    if (fetchError) {
      setError("This document could not be found or is temporarily unavailable.");
      setContent(null);
    } else {
      setContent(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    trackedView.current = false;
    fetchContent();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const handleChange = () => setIsMobile(isMobilePdfEnvironment());
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    if (!content || trackedView.current) return;
    trackedView.current = true;
    trackEvent("pdf_view", {
      type: content.type,
      subject: content.subjects?.name || "",
    });
    setLastViewedAt(recordPdfView(content.id));
  }, [content]);

  useEffect(() => {
    setMetadata({ fileSize: null, pageCount: null });
    if (!content?.pdf_url) return undefined;

    const controller = new AbortController();
    let active = true;

    loadPdfMetadata(content.pdf_url, { signal: controller.signal })
      .then(result => {
        if (active) setMetadata(result);
      })
      .catch(() => {});

    return () => {
      active = false;
      controller.abort();
    };
  }, [content?.pdf_url]);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const timer = setTimeout(() => setShareStatus(""), 2600);
    return () => clearTimeout(timer);
  }, [shareStatus]);

  usePageMeta({
    title: content?.title || (error ? "Document unavailable" : "Loading document"),
    description: content
      ? `${content.title}${content.subjects?.name ? ` from ${content.subjects.name}` : ""} on Wisdom Vault.`
      : "Read CSE 5th Semester documents on Wisdom Vault.",
    path: `/pdf/${id}`,
    type: "article",
    robots: error ? "noindex,follow" : "index,follow",
  });

  const getTypeColor = (type) => {
    if (isLight) {
      if (type === "note") return "#0284c7";
      if (type === "qb") return "#7c3aed";
      if (type === "paper") return "#d97706";
      return "#0284c7";
    }
    if (type === "note") return "#00f0ff";
    if (type === "qb") return "#a855f7";
    if (type === "paper") return "#f59e0b";
    return "#00f0ff";
  };

  const getTypeLabel = (type) => {
    if (type === "note") return "NOTE";
    if (type === "qb") return "QUESTION BANK";
    if (type === "paper") return "PREVIOUS PAPER";
    return type ? type.toUpperCase() : "";
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (content?.subject_id) {
      navigate(`/?subject=${content.subject_id}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleDownload = async (event) => {
    event.preventDefault();
    if (downloading || !content?.pdf_url) return;

    setDownloading(true);
    setDownloadError("");
    try {
      await downloadPdf(content.pdf_url, content.title, {
        type: content.type,
        subject: content.subjects?.name || "",
        source: "pdf_viewer",
      });
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2200);
    } catch (downloadFailure) {
      setDownloadError(downloadFailure.message);
    } finally {
      setDownloading(false);
    }
  };

  const bookmarked = content ? bookmarks.some(bookmark => bookmark.id === content.id) : false;
  const metadataParts = [
    formatFileSize(metadata.fileSize),
    metadata.pageCount ? `${metadata.pageCount} ${metadata.pageCount === 1 ? "page" : "pages"}` : "",
  ].filter(Boolean);

  const handleBookmark = () => {
    if (!content) return;
    const saved = toggleBookmark(content.id);
    trackEvent("document_bookmark", {
      type: content.type,
      subject: content.subjects?.name || "",
      action: saved ? "saved" : "removed",
      source: "pdf_viewer",
    });
  };

  const handleShare = async () => {
    if (!content) return;

    try {
      const result = await sharePdf({
        title: content.title,
        subjectName: content.subjects?.name || "",
        path: `/pdf/${content.id}`,
      });

      if (result.status === "shared") setShareStatus("SHARED");
      else if (result.status === "copied") setShareStatus("LINK COPIED");
      else if (result.status === "failed") setShareStatus("COULD NOT SHARE LINK");

      trackEvent("document_share", {
        type: content.type,
        subject: content.subjects?.name || "",
        method: result.status,
      });
    } catch {
      setShareStatus("COULD NOT SHARE LINK");
    }
  };

  const handleOpenPdf = () => {
    if (!content?.pdf_url) return;
    trackEvent("pdf_open_external", {
      type: content.type,
      subject: content.subjects?.name || "",
    });
  };

  if (loading) return <FuturisticLoader text="LOADING DOCUMENT" />;

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        padding: 20,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, color: isLight ? "#dc2626" : "#ff6060" }}>!</div>
        <div
          role="alert"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: isLight ? "#dc2626" : "#ff6060",
            fontSize: 16,
            letterSpacing: 2,
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={fetchContent} className="wv-action-btn" style={{
            padding: "10px 24px",
            background: isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.08)",
            border: isLight ? "1px solid rgba(2,132,199,0.35)" : "1px solid rgba(0,240,255,0.3)",
            borderRadius: 8,
            color: isLight ? "#0284c7" : "#00f0ff",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "'Orbitron', sans-serif",
          }}>
            TRY AGAIN
          </button>
          <button onClick={() => navigate("/")} className="wv-action-btn" style={{
            padding: "10px 24px",
            background: "transparent",
            border: isLight ? "1px solid rgba(2,132,199,0.35)" : "1px solid rgba(0,240,255,0.3)",
            borderRadius: 8,
            color: isLight ? "#0284c7" : "#00f0ff",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "'Orbitron', sans-serif",
          }}>
            BACK TO HOME
          </button>
        </div>
      </div>
    );
  }

  const typeColor = getTypeColor(content?.type);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <div className="wv-pdf-toolbar" style={{
        background: isLight ? "rgba(250, 243, 224, 0.95)" : "rgba(8,8,24,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: isLight ? "1px solid rgba(2, 132, 199, 0.18)" : "1px solid rgba(0,240,255,0.15)",
        boxShadow: isLight ? "0 2px 10px rgba(0,0,0,0.04)" : "none",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 10,
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}>
        <button onClick={handleBack} aria-label="Go back" className="wv-action-btn" style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 12px",
          minHeight: 40,
          background: isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.06)",
          border: isLight ? "1px solid rgba(2,132,199,0.3)" : "1px solid rgba(0,240,255,0.2)",
          borderRadius: 8,
          color: isLight ? "#0284c7" : "#00f0ff",
          cursor: "pointer",
          fontSize: 11,
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: 1,
          flexShrink: 0,
        }}>
          ← BACK
        </button>

        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: isLight ? "#0f172a" : "#e0f0ff",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {content?.title}
          </div>
          <div style={{
            fontSize: 11,
            color: isLight ? "#64748b" : "rgba(255,255,255,0.4)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {[content?.subjects?.name, ...metadataParts, lastViewedAt ? `Last opened ${formatRelativeTime(lastViewedAt)}` : ""]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          <ThemeToggle />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleBookmark}
            aria-label={bookmarked ? "Remove from saved documents" : "Save for later"}
            aria-pressed={bookmarked}
            className="wv-action-btn"
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              background: bookmarked
                ? (isLight ? "rgba(2,132,199,0.16)" : "rgba(0,240,255,0.14)")
                : (isLight ? "rgba(2,132,199,0.06)" : "rgba(0,240,255,0.06)"),
              border: isLight ? "1px solid rgba(2,132,199,0.3)" : "1px solid rgba(0,240,255,0.25)",
              borderRadius: 8,
              color: isLight ? "#0284c7" : "#00f0ff",
              cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} aria-hidden="true">
              <path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this document"
            className="wv-action-btn"
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              background: isLight ? "rgba(2,132,199,0.06)" : "rgba(0,240,255,0.06)",
              border: isLight ? "1px solid rgba(2,132,199,0.3)" : "1px solid rgba(0,240,255,0.25)",
              borderRadius: 8,
              color: isLight ? "#0284c7" : "#00f0ff",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 4,
            color: typeColor,
            background: `${typeColor}18`,
            border: `1px solid ${typeColor}40`,
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 1,
            display: isMobile ? "none" : "inline",
          }}>
            {getTypeLabel(content?.type)}
          </span>

          <a
            href={content?.pdf_url}
            onClick={handleDownload}
            rel="noreferrer"
            className="wv-action-btn"
            aria-busy={downloading}
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 12px",
              minHeight: 40,
              background: isLight ? "rgba(2,132,199,0.1)" : "rgba(0,240,255,0.1)",
              border: isLight ? "1px solid rgba(2,132,199,0.35)" : "1px solid rgba(0,240,255,0.3)",
              borderRadius: 8,
              color: isLight ? "#0284c7" : "#00f0ff",
              textDecoration: "none",
              fontSize: 11,
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 1,
              transition: "all 0.2s ease",
              cursor: downloading ? "wait" : "pointer",
              pointerEvents: downloading ? "none" : "auto",
              whiteSpace: "nowrap",
            }}
          >
            {downloading ? "SAVING..." : downloaded ? "SAVED" : "DOWNLOAD"}
          </a>
        </div>
      </div>

      {shareStatus && (
        <div role="status" style={{
          padding: "8px 16px",
          background: isLight ? "rgba(2,132,199,0.07)" : "rgba(0,240,255,0.08)",
          borderBottom: isLight ? "1px solid rgba(2,132,199,0.16)" : "1px solid rgba(0,240,255,0.16)",
          color: isLight ? "#0284c7" : "#67e8f9",
          fontSize: 11,
          textAlign: "center",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: 1,
        }}>
          {shareStatus}
        </div>
      )}

      {downloadError && (
        <div role="alert" style={{
          padding: "10px 16px",
          background: isLight ? "rgba(239,68,68,0.08)" : "rgba(255,60,60,0.1)",
          borderBottom: isLight ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,60,60,0.2)",
          color: isLight ? "#b91c1c" : "#ff9090",
          fontSize: 12,
          textAlign: "center",
        }}>
          {downloadError}
        </div>
      )}

      <main id="main-content" tabIndex={-1} style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <h1 className="wv-sr-only">{content?.title}</h1>
        {isMobile && !showInline ? (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 18px",
            background: isLight ? "#EFE2C5" : "#101024",
          }}>
            <div style={{
              width: "100%",
              maxWidth: 420,
              textAlign: "center",
              padding: 26,
              background: isLight ? "rgba(250,243,224,0.98)" : "rgba(8,8,30,0.96)",
              border: isLight ? "1px solid rgba(2,132,199,0.25)" : "1px solid rgba(0,240,255,0.2)",
              borderRadius: 18,
              boxShadow: isLight ? "0 12px 36px rgba(0,0,0,0.1)" : "0 0 40px rgba(0,240,255,0.08)",
            }}>
              <div aria-hidden="true" style={{ fontSize: 46, marginBottom: 12 }}>📄</div>
              <div style={{
                fontSize: 10,
                color: typeColor,
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: 2,
                marginBottom: 8,
              }}>
                {getTypeLabel(content?.type)}
              </div>
              <h2 style={{
                fontSize: 18,
                lineHeight: 1.45,
                color: isLight ? "#1e293b" : "#e0f0ff",
                marginBottom: 8,
              }}>
                {content?.title}
              </h2>
              <p style={{
                fontSize: 12,
                color: isLight ? "#64748b" : "rgba(255,255,255,0.45)",
                marginBottom: metadataParts.length || lastViewedAt ? 10 : 22,
              }}>
                {content?.subjects?.name}
              </p>

              {(metadataParts.length > 0 || lastViewedAt) && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "6px 14px",
                  marginBottom: 22,
                  color: isLight ? "#0284c7" : "rgba(0,240,255,0.65)",
                  fontSize: 10.5,
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 0.5,
                }}>
                  {metadataParts.map(part => <span key={part}>{part}</span>)}
                  {lastViewedAt && <span>LAST OPENED {formatRelativeTime(lastViewedAt).toUpperCase()}</span>}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href={content?.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenPdf}
                  className="wv-action-btn"
                  style={{
                    display: "block",
                    padding: "13px 18px",
                    background: isLight ? "rgba(2,132,199,0.1)" : "rgba(0,240,255,0.1)",
                    border: isLight ? "1px solid rgba(2,132,199,0.4)" : "1px solid rgba(0,240,255,0.35)",
                    borderRadius: 10,
                    color: isLight ? "#0284c7" : "#00f0ff",
                    textDecoration: "none",
                    fontSize: 12,
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: 1,
                  }}
                >
                  OPEN PDF IN BROWSER
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="wv-action-btn"
                  style={{
                    padding: "13px 18px",
                    minHeight: 46,
                    background: "transparent",
                    border: isLight ? "1px solid rgba(2,132,199,0.3)" : "1px solid rgba(0,240,255,0.25)",
                    borderRadius: 10,
                    color: isLight ? "#0284c7" : "#00f0ff",
                    cursor: downloading ? "wait" : "pointer",
                    fontSize: 12,
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: 1,
                  }}
                >
                  {downloading ? "SAVING..." : downloaded ? "DOWNLOADED" : "DOWNLOAD PDF"}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleBookmark}
                    aria-pressed={bookmarked}
                    className="wv-action-btn"
                    style={{
                      flex: 1,
                      minHeight: 44,
                      padding: "11px 10px",
                      background: bookmarked
                        ? (isLight ? "rgba(2,132,199,0.14)" : "rgba(0,240,255,0.12)")
                        : "transparent",
                      border: isLight ? "1px solid rgba(2,132,199,0.3)" : "1px solid rgba(0,240,255,0.25)",
                      borderRadius: 10,
                      color: isLight ? "#0284c7" : "#00f0ff",
                      cursor: "pointer",
                      fontSize: 10.5,
                      fontFamily: "'Orbitron', sans-serif",
                      letterSpacing: 0.5,
                    }}
                  >
                    {bookmarked ? "REMOVE FROM SAVED" : "SAVE FOR LATER"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="wv-action-btn"
                    style={{
                      flex: "0 0 96px",
                      minHeight: 44,
                      padding: "11px 10px",
                      background: "transparent",
                      border: isLight ? "1px solid rgba(2,132,199,0.3)" : "1px solid rgba(0,240,255,0.25)",
                      borderRadius: 10,
                      color: isLight ? "#0284c7" : "#00f0ff",
                      cursor: "pointer",
                      fontSize: 10.5,
                      fontFamily: "'Orbitron', sans-serif",
                      letterSpacing: 0.5,
                    }}
                  >
                    SHARE
                  </button>
                </div>
              </div>

              <p style={{
                marginTop: 16,
                color: isLight ? "#64748b" : "rgba(255,255,255,0.35)",
                fontSize: 11,
                lineHeight: 1.6,
              }}>
                Mobile PDFs open best in your device's built-in viewer. You can still try the inline viewer below.
              </p>
              <button
                type="button"
                onClick={() => setShowInline(true)}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  color: isLight ? "#0284c7" : "#67e8f9",
                  fontSize: 11,
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 8,
                }}
              >
                Try inline viewer
              </button>
            </div>
          </div>
        ) : (
          <div className="wv-pdf-frame" style={{
            width: "100%",
            flex: 1,
            minHeight: 0,
            background: isLight ? "#EFE2C5" : "#1a1a2e",
            transition: "background 0.3s ease",
          }}>
            <iframe
              src={content?.pdf_url ? `${content.pdf_url}#toolbar=1&navpanes=0&view=FitH` : ""}
              title={content?.title || "PDF Viewer"}
              style={{ width: "100%", height: "100%", minHeight: "60vh", border: "none" }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
