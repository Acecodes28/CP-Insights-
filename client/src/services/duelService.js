import api from "./api";

async function fetchMyDuels() {
  try {
    const res = await api.get("/duels/mine");
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load duel history");
  }
}

async function fetchDuel(id) {
  try {
    const res = await api.get(`/duels/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load duel");
  }
}

export { fetchMyDuels, fetchDuel };
