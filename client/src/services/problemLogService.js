import api from "./api";

async function fetchProblemLogs() {
  try {
    const res = await api.get("/problems");
    return res.data; // { problems: [...], syncError: string | null }
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load your problem log");
  }
}

async function updateProblemLog(problemKey, updates) {
  try {
    const res = await api.patch(`/problems/${encodeURIComponent(problemKey)}`, updates);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to update this problem");
  }
}

async function fetchMyContests() {
  try {
    const res = await api.get("/contests/mine");
    return res.data; // { contests: [...] }
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load your contest history");
  }
}

export { fetchProblemLogs, updateProblemLog, fetchMyContests };
