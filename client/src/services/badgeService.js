import api from "./api";

async function fetchMyBadges() {
  try {
    const res = await api.get("/badges/me");
    return res.data; // { elo, duelStats, badges: [...] }
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load badges");
  }
}

async function fetchUserBadges(userId) {
  try {
    const res = await api.get(`/badges/user/${userId}`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load badges");
  }
}

export { fetchMyBadges, fetchUserBadges };
