import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import ParticleBackground from "./components/ParticleBackground";
import Header from "./components/Header";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import PDFViewer from "./pages/PDFViewer";
import InstallPwaPrompt from "./components/InstallPwaPrompt";
import { useSession } from "./lib/useSession";

function ProtectedRoute({ children }) {
  const session = useSession();
  if (session === undefined) {
    return (
      <div role="status" aria-live="polite" style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00f0ff",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 12,
        letterSpacing: 2,
      }}>
        CHECKING ACCESS...
      </div>
    );
  }
  return session ? children : <Navigate to="/admin/login" />;
}

function MainLayout() {
  const { isLight } = useTheme();
  const location = useLocation();

  // Force dark theme inside admin dashboard
  const isAdminDashboard =
    location.pathname === "/admin" ||
    (location.pathname.startsWith("/admin") && location.pathname !== "/admin/login");
  const activeIsLight = !isAdminDashboard && isLight;

  useEffect(() => {
    if (isAdminDashboard) {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      if (isLight) {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    }
  }, [isAdminDashboard, isLight]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: activeIsLight ? "#FAF3E0" : "#080818",
        color: activeIsLight ? "#1e293b" : "#e0f0ff",
        fontFamily: "'Inter', sans-serif",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <ParticleBackground />
      <InstallPwaPrompt />
      <Analytics />
      <div key={location.pathname} className="wv-page-transition">
        <Routes>
          <Route path="/pdf/:id" element={<PDFViewer />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <>
                <Header />
                <Home />
              </>
            }
          />
          <Route
            path="*"
            element={
              <>
                <Header />
                <NotFound />
              </>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}