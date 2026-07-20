import { createContext, useContext, useState, useEffect } from "react";
import {
  login as loginRequest,
  signup as signupRequest,
  fetchCurrentUser,
  linkPrimaryHandle,
} from "../services/authService";

const AuthContext = createContext(null);

// Wrap the whole app in this (see App.jsx) so any component can call
// useAuth() to read the current user or trigger login/logout.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check localStorage on first load

  // On first mount: if a token is already saved from a previous session,
  // verify it's still valid by asking the backend who it belongs to.
  // This is what keeps someone logged in across a page refresh.
  useEffect(() => {
    const token = localStorage.getItem("cpInsightsToken");
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then((userData) => setUser(userData))
      .catch(() => {
        // Token was invalid/expired - clear it so we don't keep retrying
        localStorage.removeItem("cpInsightsToken");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await loginRequest(email, password);
    localStorage.setItem("cpInsightsToken", data.token);
    setUser(data);
  }

  async function signup(name, email, password) {
    const data = await signupRequest(name, email, password);
    localStorage.setItem("cpInsightsToken", data.token);
    setUser(data);
  }

  function logout() {
    localStorage.removeItem("cpInsightsToken");
    setUser(null);
  }

  async function linkHandle(handle) {
    const data = await linkPrimaryHandle(handle);
    setUser((prev) => ({ ...prev, primaryHandle: data.primaryHandle }));
    return data.primaryHandle;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, linkHandle }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook every component uses to read auth state: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
