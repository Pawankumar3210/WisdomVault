import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import useUserLibrary from "../lib/useUserLibrary";
import { formatRelativeTime } from "../lib/format";

const TYPE_LABELS = { note: "NOTE", qb: "QB", paper: "PAPER" };

function getTypeColor(type, isLight) {
  if (type === "qb") return isLight ? "#7c3aed" : "#a855f7";
  if (type === "paper") return isLight ? "#d97706" : "#f59e0b";
  return isLight ? "#0284c7" : "#00f0ff";
}

function LibraryCard({ item, timestamp, isLight, onRemove }) {
  const color = getTypeColor(item.type, isLight);

  return (
    <div style={{
      position: "relative",
      minWidth: 0,
      background: isLight ? "rgba(244,235,206,0.9)" : "rgba(0,240,255,0.03)",
      border: isLight ? "1px solid rgba(2,132,199,0.18)" : "1px solid rgba(0,240,255,0.14)",
      borderRadius: 12,
    }}>
      <Link
        to={`/pdf/${item.id}`}
        style={{
          display: "block",
          padding: "12px 14px",
          paddingRight: onRemove ? 46 : 14,
          textDecoration: "none",
        }}
      >
        <span style={{
          display: "inline-block",
          padding: "2px 7px",
          marginBottom: 7,
          borderRadius: 4,
          border: `1px solid ${color}40`,
          background: `${color}14`,
          color,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          fontFamily: "'Orbitron', sans-serif",
        }}>
          {TYPE_LABELS[item.type] || "DOCUMENT"}
        </span>
        <div style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          color: isLight ? "#1e293b" : "#e0f0ff",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.4,
          overflowWrap: "anywhere",
        }}>
          {item.title}
        </div>
        <div style={{
          marginTop: 5,
          color: isLight ? "#64748b" : "rgba(255,255,255,0.45)",
          fontSize: 10.5,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {item.subjects?.name}
        </div>
        {timestamp && (
          <div style={{
            marginTop: 7,
            color: isLight ? "#0284c7" : "rgba(0,240,255,0.55)",
            fontSize: 10,
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 0.5,
          }}>
            {formatRelativeTime(timestamp)}
          </div>
        )}
      </Link>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.title} from saved documents`}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            background: isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.06)",
            border: isLight ? "1px solid rgba(2,132,199,0.25)" : "1px solid rgba(0,240,255,0.2)",
            borderRadius: 7,
            color: isLight ? "#0284c7" : "#00f0ff",
            cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function LibrarySection({ title, items, isLight, tone, onClear, onRemove }) {
  if (!items.length) return null;

  return (
    <section aria-labelledby={`library-${tone}`} style={{ marginBottom: 28 }}>
      <h2 id={`library-${tone}`} style={{
        margin: 0,
        marginBottom: onClear ? 8 : 10,
        color: isLight ? "#0284c7" : "#67e8f9",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
      }}>
        {title}
      </h2>

      {onClear && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear recently viewed documents"
            className="wv-action-btn"
            style={{
              minHeight: 34,
              padding: "7px 16px",
              background: isLight ? "rgba(220,38,38,0.06)" : "rgba(255,107,107,0.08)",
              border: isLight ? "1px solid rgba(220,38,38,0.45)" : "1px solid rgba(255,107,107,0.4)",
              borderRadius: 7,
              color: isLight ? "#dc2626" : "#ff6b6b",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            CLEAR
          </button>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
        gap: 10,
      }}>
        {items.map(({ item, timestamp }) => (
          <LibraryCard
            key={item.id}
            item={item}
            timestamp={timestamp}
            isLight={isLight}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

export default function PersonalLibrary({ contents = [] }) {
  const { isLight } = useTheme();
  const { recent, bookmarks, clearRecent, removeBookmark } = useUserLibrary();

  const contentMap = useMemo(
    () => new Map(contents.map(item => [item.id, item])),
    [contents]
  );

  const recentItems = recent
    .map(entry => ({ item: contentMap.get(entry.id), timestamp: entry.viewedAt }))
    .filter(entry => entry.item)
    .slice(0, 6);

  const savedItems = bookmarks
    .map(entry => ({ item: contentMap.get(entry.id), timestamp: entry.savedAt }))
    .filter(entry => entry.item)
    .slice(0, 6);

  if (!recentItems.length && !savedItems.length) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 32px" }}>
      <LibrarySection
        title="PICK UP WHERE YOU LEFT OFF"
        items={recentItems}
        isLight={isLight}
        tone="recent"
        onClear={recentItems.length ? clearRecent : undefined}
      />
      <LibrarySection
        title="SAVED FOR LATER"
        items={savedItems}
        isLight={isLight}
        tone="saved"
        onRemove={removeBookmark}
      />
    </div>
  );
}
