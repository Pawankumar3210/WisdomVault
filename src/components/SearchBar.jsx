import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { fetchVaultData } from "../lib/contentCache";
import { scoreContent, scoreSubject, SEARCH_MIN_SCORE } from "../lib/search";
import { trackEvent } from "../lib/analytics";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [isSubjectFallback, setIsSubjectFallback] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const inputRef = useRef(null);
  const trackedZero = useRef("");
  const { isLight } = useTheme();

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    fetchVaultData().catch(() => {});
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        document.querySelector('[aria-modal="true"]')
      ) {
        return;
      }

      const searchInput = document.getElementById("vault-search");
      if (!searchInput) return;

      event.preventDefault();
      searchInput.focus();
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      setSearched(false);
      setLoading(false);
      setDataError(false);
      setIsSubjectFallback(false);
      return;
    }

    setSearched(false);
    setDataError(false);
    setIsSubjectFallback(false);
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchVaultData();
        if (cancelled) return;

        const term = query.trim();

        const contentMatches = data.contents
          .map(item => ({ item, score: scoreContent(term, item) }))
          .filter(result => result.score >= SEARCH_MIN_SCORE)
          .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

        const contentResults = contentMatches
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

        let results = [...contentResults, ...subjectResults];

        if (results.length === 0) {
          const counts = data.contents.reduce((map, item) => {
            if (item.subject_id) map.set(item.subject_id, (map.get(item.subject_id) || 0) + 1);
            return map;
          }, new Map());

          results = data.subjects
            .map(subject => ({
              subject,
              score: scoreSubject(term, subject),
              count: counts.get(subject.id) || 0,
            }))
            .filter(result => result.count > 0)
            .sort((a, b) =>
              b.score - a.score ||
              b.count - a.count ||
              a.subject.name.localeCompare(b.subject.name)
            )
            .slice(0, 3)
            .map(({ subject, count }) => ({
              id: subject.id,
              label: subject.name,
              sublabel: `${subject.code} · ${count} ${count === 1 ? "document" : "documents"}`,
              type: "subject",
              kind: "subject",
              fallback: true,
            }));

          setIsSubjectFallback(results.length > 0);
        }

        setSuggestions(results);
        setShowSuggestions(results.length > 0 && document.activeElement === inputRef.current);
        setActiveIndex(-1);
        setSearched(true);

        if (contentResults.length === 0 && subjectResults.length === 0 && trackedZero.current !== term) {
          trackedZero.current = term;
          trackEvent("search_zero_results", { query: term.slice(0, 80) });
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setShowSuggestions(false);
          setSearched(true);
          setDataError(true);
          setIsSubjectFallback(false);
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

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
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
    if (!item) return;
    trackEvent("search_select", {
      query: query.trim().slice(0, 80),
      resultType: item.kind,
      resultId: item.kind === "content" ? item.id : undefined,
    });
    setShowSuggestions(false);
    setQuery("");
    setActiveIndex(-1);
    if (item.kind === "content") {
      navigate(`/pdf/${item.id}`);
    } else {
      navigate(`/?subject=${item.id}`);
    }
  };

  const dropdownOpen = showSuggestions || (searched && suggestions.length === 0) || dataError;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ position: "relative" }}>
        <label htmlFor="vault-search" className="wv-sr-only">
          Search notes, question banks, and papers
        </label>
        <svg
          aria-hidden="true"
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
          id="vault-search"
          type="text"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls={suggestions.length > 0 ? "vault-search-list" : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `vault-search-option-${activeIndex}` : undefined}
          aria-keyshortcuts="/"
          placeholder="Search notes, question banks, papers..."
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={event => {
            setFocused(true);
            event.target.style.borderColor = isLight
              ? "rgba(2,132,199,0.7)"
              : "rgba(0,240,255,0.65)";
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={event => {
            setFocused(false);
            event.target.style.borderColor = isLight
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
              right: loading ? 46 : 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
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

        {!query && !loading && !focused && (
          <span aria-hidden="true" style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 5,
            border: isLight ? "1px solid rgba(2,132,199,0.25)" : "1px solid rgba(0,240,255,0.2)",
            color: isLight ? "#64748b" : "rgba(255,255,255,0.35)",
            fontSize: 11,
            fontFamily: "'Orbitron', sans-serif",
            pointerEvents: "none",
          }}>
            /
          </span>
        )}

        {loading && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 18,
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

      <div className="wv-sr-only" role="status" aria-live="polite">
        {loading
          ? "Searching"
          : searched && !dataError
            ? isSubjectFallback
              ? `No exact matches. ${suggestions.length} subject suggestions available`
              : `${suggestions.length} suggestions available`
            : dataError
              ? "Search is temporarily unavailable"
              : ""}
      </div>

      {dropdownOpen && (
        <div
          id="vault-search-results"
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
          {dataError ? (
            <div role="alert" style={{
              padding: "18px 16px",
              textAlign: "center",
              fontSize: 13,
              color: isLight ? "#b91c1c" : "#ff9090",
            }}>
              Search is temporarily unavailable. Please try again.
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{
              padding: "18px 16px",
              textAlign: "center",
              fontSize: 13,
              color: isLight ? "#64748b" : "rgba(255,255,255,0.45)",
            }}>
              No matches found for "{query.trim()}"
            </div>
          ) : (
            <>
              {isSubjectFallback && (
                <div style={{
                  padding: "11px 16px 9px",
                  color: isLight ? "#64748b" : "rgba(255,255,255,0.45)",
                  fontSize: 11,
                  lineHeight: 1.5,
                  borderBottom: isLight ? "1px solid rgba(2,132,199,0.1)" : "1px solid rgba(0,240,255,0.08)",
                }}>
                  No exact matches for "{query.trim()}". Try a subject:
                </div>
              )}
              <div id="vault-search-list" role="listbox" aria-label={isSubjectFallback ? "Subject suggestions" : "Search suggestions"}>
              {suggestions.map((item, index) => (
                <div
                  key={`${item.kind}-${item.id}-${index}`}
                  id={`vault-search-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleSelect(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: index === activeIndex
                      ? (isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.08)")
                      : "transparent",
                    borderBottom: index < suggestions.length - 1
                      ? (isLight ? "1px solid rgba(2,132,199,0.1)" : "1px solid rgba(0,240,255,0.08)")
                      : "none",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
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
                    aria-hidden="true"
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
              ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
