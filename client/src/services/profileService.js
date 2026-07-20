import api from "./api";

async function fetchProfile(handle) {
  try {
    const res = await api.get(`/profile/${handle}`);
    return res.data; // { source: "cache" | "live", data: CFProfile }
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to fetch this handle");
  }
}

async function fetchSavedHandles() {
  try {
    const res = await api.get("/saved-handles");
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load saved handles");
  }
}

async function saveHandle(handle) {
  try {
    const res = await api.post("/saved-handles", { handle });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to save handle");
  }
}

async function removeSavedHandle(handle) {
  try {
    const res = await api.delete(`/saved-handles/${handle}`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to remove handle");
  }
}

async function fetchRecommendations(handle) {
  try {
    const res = await api.get(`/recommendations/${handle}`);
    return res.data; // { handle, currentRating, recommendations: [...] }
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load recommendations");
  }
}

async function fetchContests() {
  try {
    const res = await api.get("/contests");
    return res.data; // { upcoming: [...], recent: [...] }
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load contests");
  }
}

async function fetchStreak() {
  try {
    const res = await api.get("/streak");
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load streak");
  }
}

async function updateStreakFilters(filters) {
  try {
    const res = await api.put("/streak/filters", { filters });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to update streak filters");
  }
}

async function fetchActivityHeatmap(handle) {
  try {
    const res = await api.get(`/profile/${handle}/activity`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load activity data");
  }
}

export {
  fetchProfile,
  fetchSavedHandles,
  saveHandle,
  removeSavedHandle,
  fetchRecommendations,
  fetchContests,
  fetchStreak,
  updateStreakFilters,
  fetchActivityHeatmap,
};