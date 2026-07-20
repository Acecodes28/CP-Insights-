import api from "./api";

// Each function here does ONE thing: call an endpoint and return clean data
// or throw a readable error message. AuthContext (next file) is what actually
// manages state/localStorage - these functions know nothing about React.

async function signup(name, email, password) {
  try {
    const res = await api.post("/auth/signup", { name, email, password });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Signup failed");
  }
}

async function login(email, password) {
  try {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Login failed");
  }
}

async function fetchCurrentUser() {
  try {
    const res = await api.get("/auth/me");
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load user");
  }
}

async function linkPrimaryHandle(handle) {
  try {
    const res = await api.put("/auth/primary-handle", { handle });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to link handle");
  }
}

async function lookupUserByHandle(handle) {
  try {
    const res = await api.get(`/auth/by-handle/${handle}`);
    return res.data;
  } catch (err) {
    return null; // no linked account for this handle - not an error state, just means no badges to show
  }
}

export { signup, login, fetchCurrentUser, linkPrimaryHandle, lookupUserByHandle };
