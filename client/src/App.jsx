import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DuelProvider } from "./context/DuelContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import IncomingChallengeModal from "./components/duels/IncomingChallengeModal";
import "./styles/navbar.css";
import "./styles/footer.css";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import DuelsPage from "./pages/DuelsPage";
import DuelMatchPage from "./pages/DuelMatchPage";
import ProgressPage from "./pages/ProgressPage";

export default function App() {
  return (
    <AuthProvider>
      <DuelProvider>
        <BrowserRouter>
          <div className="app-shell">
            <Navbar />
            <IncomingChallengeModal />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/profile/:handle" element={<ProfilePage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groups"
                  element={
                    <ProtectedRoute>
                      <GroupsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groups/:id"
                  element={
                    <ProtectedRoute>
                      <GroupDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/duels"
                  element={
                    <ProtectedRoute>
                      <DuelsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/duels/:id"
                  element={
                    <ProtectedRoute>
                      <DuelMatchPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progress"
                  element={
                    <ProtectedRoute>
                      <ProgressPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </DuelProvider>
    </AuthProvider>
  );
}