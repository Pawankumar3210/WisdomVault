import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import SearchBar from "../components/SearchBar";
import SubjectCard from "../components/SubjectCard";
import FuturisticLoader from "../components/FuturisticLoader";
import TopLoadingBar from "../components/TopLoadingBar";
import AnimatedCounter from "../components/AnimatedCounter";
import TypewriterText from "../components/TypewriterText";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import PersonalLibrary from "../components/PersonalLibrary";
import { fetchVaultData } from "../lib/contentCache";
import { usePageMeta } from "../lib/usePageMeta";

export default function Home() {
  const [subjects, setSubjects] = useState([]);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const filterSubject = searchParams.get("subject");
  const openSubject = searchParams.get("open");
  const expandedSubjectId = filterSubject || openSubject;
  const { isLight } = useTheme();

  usePageMeta({
    title: "CSE 5th Semester Notes, Question Banks & Papers",
    description:
      "Access CSE 5th Semester notes, question banks, and previous year papers instantly on Wisdom Vault.",
    path: "/",
  });

  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchVaultData({ force });
      setSubjects(data.subjects);
      setContents(data.contents);
    } catch {
      setError("Could not load the vault. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loading || error || !expandedSubjectId) return;
    const card = document.getElementById(`subject-card-${expandedSubjectId}`);
    if (card) {
      requestAnimationFrame(() =>
        card.scrollIntoView({ behavior: "auto", block: "start" })
      );
    }
  }, [loading, error, expandedSubjectId]);

  const handleExpand = (subjectId) => {
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    next.set("subject", subjectId);
    setSearchParams(next);
  };

  const handleCollapse = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("subject");
    next.delete("open");
    setSearchParams(next, { replace: true });
  };

  const filteredSubjects = expandedSubjectId
    ? subjects.filter(s => s.id === expandedSubjectId)
    : subjects;

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopLoadingBar loading={loading} />

      {/* WRAPPER FOR MAIN CONTENT TO PUSH FOOTER DOWN */}
      <main id="main-content" tabIndex={-1} style={{ flex: 1 }}>
        <h1 className="wv-sr-only">Wisdom Vault CSE 5th Semester Notes, Question Banks and Previous Papers</h1>
        {/* HERO SECTION */}
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px 40px",
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              background: isLight ? "rgba(2,132,199,0.08)" : "rgba(0,240,255,0.08)",
              border: isLight
                ? "1px solid rgba(2,132,199,0.25)"
                : "1px solid rgba(0,240,255,0.2)",
              borderRadius: 30,
              fontSize: 15,
              fontWeight: 600,
              color: isLight ? "#0284c7" : "#00f0ff",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 2,
              marginBottom: 20,
              transition: "all 0.3s ease",
            }}
          >
            CSE 5TH SEMESTER
          </div>

          <TypewriterText
            text={`"Knowledge is the only treasure that grows when shared."`}
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(18px, 3.2vw, 26px)",
              fontWeight: 500,
              color: isLight ? "#0284c7" : "#00f0ff",
              marginBottom: 28,
              letterSpacing: 1,
              lineHeight: 1.8,
              fontStyle: "italic",
              maxWidth: 600,
              margin: "0 auto 36px",
              textShadow: isLight
                ? "0 0 15px rgba(2,132,199,0.25)"
                : "0 0 20px rgba(0,240,255,0.6), 0 0 40px rgba(0,240,255,0.3)",
              textAlign: "center",
              transition: "color 0.3s ease, text-shadow 0.3s ease",
            }}
          />

          <SearchBar />
        </div>

        {/* STATS BAR */}
        <Reveal delay={60}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              padding: "0 20px 40px",
              flexWrap: "wrap",
            }}
          >
            <AnimatedCounter
              target={contents.filter(c => c.type === "note").length}
              color={isLight ? "#0284c7" : "#00f0ff"}
              label="Notes"
            />
            <AnimatedCounter
              target={contents.filter(c => c.type === "qb").length}
              color={isLight ? "#7c3aed" : "#a855f7"}
              label="Question Banks"
            />
            <AnimatedCounter
              target={contents.filter(c => c.type === "paper").length}
              color={isLight ? "#d97706" : "#f59e0b"}
              label="Question Papers"
            />
            <AnimatedCounter
              target={subjects.length}
              color={isLight ? "#059669" : "#10b981"}
              label="Subjects"
            />
          </div>
        </Reveal>

        {!expandedSubjectId && !loading && !error && (
          <PersonalLibrary contents={contents} />
        )}

        {/* SUBJECTS SECTION */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>
          {filterSubject && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: isLight ? "#0284c7" : "rgba(0,240,255,0.6)",
                  fontFamily: "'Orbitron', sans-serif",
                }}
              >
                Filtered by subject
              </div>
              <Link
                to="/"
                style={{
                  fontSize: 12,
                  color: isLight ? "#0284c7" : "#00f0ff",
                  textDecoration: "none",
                  padding: "5px 12px",
                  border: isLight
                    ? "1px solid rgba(2,132,199,0.35)"
                    : "1px solid rgba(0,240,255,0.3)",
                  borderRadius: 6,
                  background: isLight ? "rgba(2,132,199,0.06)" : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                ← Show All
              </Link>
            </div>
          )}

          {loading ? (
            <FuturisticLoader text="LOADING VAULT" />
          ) : error ? (
            <div role="alert" style={{
              padding: "32px 20px",
              textAlign: "center",
              border: isLight ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,96,96,0.3)",
              borderRadius: 14,
              background: isLight ? "rgba(239,68,68,0.05)" : "rgba(255,60,60,0.06)",
            }}>
              <p style={{ color: isLight ? "#b91c1c" : "#ff9090", fontSize: 14, marginBottom: 14 }}>
                {error}
              </p>
              <button type="button" onClick={() => fetchData(true)} className="wv-action-btn" style={{
                padding: "10px 18px",
                border: isLight ? "1px solid rgba(2,132,199,0.35)" : "1px solid rgba(0,240,255,0.3)",
                borderRadius: 8,
                background: "transparent",
                color: isLight ? "#0284c7" : "#00f0ff",
                cursor: "pointer",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                letterSpacing: 1,
              }}>
                TRY AGAIN
              </button>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 20px",
                color: isLight ? "#64748b" : "rgba(255,255,255,0.2)",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: 2,
                  color: isLight ? "#334155" : "inherit",
                }}
              >
                NO SUBJECTS YET
              </div>
              <div style={{ fontSize: 13, marginTop: 8 }}>
                Admin needs to add subjects and upload content
              </div>
            </div>
          ) : (
            <Reveal delay={120}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: expandedSubjectId
                    ? "minmax(280px, 640px)"
                    : "repeat(auto-fill, minmax(280px, 1fr))",
                  justifyContent: expandedSubjectId ? "center" : "stretch",
                  gap: 20,
                }}
              >
                {filteredSubjects.map((subject, index) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    index={index}
                    contents={contents.filter(c => c.subject_id === subject.id)}
                    expanded={expandedSubjectId === subject.id}
                    onExpand={() => handleExpand(subject.id)}
                    onCollapse={handleCollapse}
                  />
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </main>

      {/* FOOTER PLACEMENT */}
      <Footer />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}