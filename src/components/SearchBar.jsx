import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { scoreContent, scoreSubject, SEARCH_MIN_SCORE } from "../lib/search";

let searchCache = { data: null, fetchedAt: 0 };
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

export function clearSearchCache() {
  searchCache = { data: null, fetchedAt: 0 };
}

async function fetchSearchData() {
  if (searchCache.data && Date.now() - searchCache.fetchedAt < SEARCH_CACHE_TTL) {
    return searchCache.data;
  }

  const [contentRes, subjectRes] = await Promise.all([
    supabase
      .from("content")
      .select("id, title, type, subject_id, subjects(name, code)")
      .order("created_at", { ascending: false }),
    supabase.from("subjects").select("id, name, code"),
  ]);

  const data = {
    contents: contentRes.data || [],
    subjects: subjectRes.data || [],
  };

  searchCache = { data, fetchedAt: Date.now() };
  return data;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { isLight } = useTheme();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    fetchSearchData().catch(() => {});
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      setSearched(false);
      setLoading(false);
      return;
    }

    setSearched(false);
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchSearchData();
        if (cancelled) return;

        const term = query.trim();

        const contentResults = data.contents
          .map(item => ({ item, score: scoreContent(term, item) }))
          .filter(result => result.score >= SEARCH_MIN_SCORE)
          .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
          .slice(0, 6)
          .map(({ item }) => ({
            id: item.id,
            label: item.title,
            sublabel: item.subjects?.name || "",
            type: item.type,
            kind: "content",
          }));

        const subjectResults = data.subjects
          .map(subject => ({ subject, score: scoreSubject(term, subject) }))
          .filter(result => result.score >= SEARCH_MIN_SCORE)
          .sort((a, b) => b.score - a.score || a.subject.name.localeCompare(b.subject.name))
          .slice(0, 3)
          .map(({ subject }) => ({
            id: subject.id,
            label: subject.name,
            sublabel: subject.code,
            type: "subject",
            kind: "subject",
          }));

        const results = [...contentResults, ...subjectResults];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setActiveIndex(-1);
        setSearched(true);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setShowSuggestions(false);
          setSearched(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(index => (index + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(index => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(suggestions[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const getTypeColor = (type) => {
    if (isLight) {
      if (type === "note") return "#0284c7";
      if (type === "qb") return "#7c3aed";
      if (type === "paper") return "#d97706";
      if (type === "subject") return "#059669";
      return "#0284c7";
    }
    if (type === "note") return "#00f0ff";
    if (type === "qb") return "#a855f7";
    if (type === "paper") return "#f59e0b";
    if (type === "subject") return "#10b981";
    return "#00f0ff";
  };

  const getTypeLabel = (type) => {
    if (type === "note") return "NOTE";
    if (type === "qb") return "QB";
    if (type === "paper") return "PAPER";
    if (type === "subject") return "SUBJECT";
    return type?.toUpperCase();
  };

  const handleSelect = (item) => {
    setShowSuggestions(false);
    setQuery("");
    setActiveIndex(-1);
    if (item.kind === "content") {
      navigate(`/pdf/${item.id}`);
    } else {
      navigate(`/?subject=${item.id}`);
    }
  };

  const showEmptyState =
    !loading && searched && suggestions.length === 0 && query.trim().length >= 2;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ position: "relative" }}>
        <svg
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 20,
            height: 20,
            opacity: isLight ? 0.75 : 0.5,
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="11" cy="11" r="7" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="2" />
          <path d="M21 21l-4-4" stroke={isLight ? "#0284c7" : "#00f0ff"} strokeWidth="2" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search notes, question banks, papers..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={e => {
            e.target.style.borderColor = isLight
              ? "rgba(2,132,199,0.7)"
              : "rgba(0,240,255,0.65)";
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={e => {
            e.target.style.borderColor = isLight
              ? "rgba(2, 132, 199, 0.35)"
              : "rgba(0,240,255,0.3)";
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "16px 68px 16px 48px",
            background: isLight ? "rgba(244, 235, 206, 0.95)" : "rgba(0,240,255,0.05)",
            border: isLight ? "1px solid rgba(2, 132, 199, 0.35)" : "1px solid rgba(0,240,255,0.3)",
            borderRadius: 12,
            color: isLight ? "#1e293b" : "#e0f0ff",
            fontSize: 15,
            outline: "none",
            boxShadow: query
              ? (isLight ? "0 4px 20px rgba(2, 132, 199, 0.2)" : "0 0 20px rgba(0,240,255,0.15)")
              : (isLight ? "0 2px 12px rgba(0, 0, 0, 0.04)" : "none"),
            transition: "all 0.3s ease",
            boxSizing: "border-box",
          }}
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: loading ? 42 : 14,
              top: "50%",
              transform: "translateY(-50%)",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              color: isLight ? "#64748b" : "rgba(224,240,255,0.45)",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ✕
          </button>
        )}

        {loading && (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              border: isLight ? "2px solid rgba(2,132,199,0.25)" : "2px solid rgba(0,240,255,0.3)",
              borderTop: isLight ? "2px solid #0284c7" : "2px solid #00f0ff",
              borderRadius: "50%",
              animation: "wv-spin 0.8s linear infinite",
            }}
          />
        )}
      </div>

      {(showSuggestions || showEmptyState) && (
        <div
          className="wv-search-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: isLight ? "rgba(247, 239, 218, 0.98)" : "rgba(8,8,30,0.97)",
            border: isLight ? "1px solid rgba(2,132,199,0.25)" : "1px solid rgba(0,240,255,0.25)",
            borderRadius: 12,
            backdropFilter: "blur(20px)",
            overflow: "hidden",
            boxShadow: isLight
              ? "0 12px 36px rgba(0,0,0,0.12), 0 2px 8px rgba(2,132,199,0.08)"
              : "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {showEmptyState ? (
            <div
              style={{
                padding: "18px 16px",
                textAlign: "center",
                fontSize: 13,
                color: isLight ? "#64748b" : "rgba(255,255,255,0.45)",
              }}
            >
              No matches found for "{query.trim()}"
            </div>
          ) : (
            suggestions.map((item, i) => (
            <div
              key={i}
              onClick={() => handleSelect(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                cursor: "pointer",
                background: i === activeIndex
                  ? (isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.08)")
                  : "transparent",
                borderBottom: i < suggestions.length - 1
                  ? (isLight ? "1px solid rgba(2,132,199,0.1)" : "1px solid rgba(0,240,255,0.08)")
                  : "none",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 4,
                  color: getTypeColor(item.type),
                  background: `${getTypeColor(item.type)}18`,
                  border: `1px solid ${getTypeColor(item.type)}40`,
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {getTypeLabel(item.type)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    color: isLight ? "#1e293b" : "#e0f0ff",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </div>
                {item.sublabel && (
                  <div
                    style={{
                      fontSize: 11,
                      color: isLight ? "#0284c7" : "rgba(0,240,255,0.5)",
                      marginTop: 2,
                    }}
                  >
                    {item.sublabel}
                  </div>
                )}
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                style={{ opacity: isLight ? 0.6 : 0.3, flexShrink: 0 }}
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke={isLight ? "#0284c7" : "#00f0ff"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}