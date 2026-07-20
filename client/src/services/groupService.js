import api from "./api";

async function createGroup({ name, description, visibility }) {
  try {
    const res = await api.post("/groups", { name, description, visibility });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to create group");
  }
}

async function fetchMyGroups() {
  try {
    const res = await api.get("/groups/mine");
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load your groups");
  }
}

async function fetchPublicGroups() {
  try {
    const res = await api.get("/groups/public");
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load public groups");
  }
}

async function joinGroup({ groupId, joinCode }) {
  try {
    const res = await api.post("/groups/join", { groupId, joinCode });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to join group");
  }
}

async function fetchGroup(id) {
  try {
    const res = await api.get(`/groups/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load group");
  }
}

async function fetchGroupFeed(id) {
  try {
    const res = await api.get(`/groups/${id}/feed`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load group feed");
  }
}

async function fetchGroupChallenges(id) {
  try {
    const res = await api.get(`/groups/${id}/challenges`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load challenges");
  }
}

async function fetchGroupStreaks(id) {
  try {
    const res = await api.get(`/groups/${id}/streaks`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to load group streaks");
  }
}

async function createGroupChallenge(id, options = {}) {
  try {
    const res = await api.post(`/groups/${id}/challenges`, options);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || "Failed to create challenge");
  }
}

export {
  createGroup,
  fetchMyGroups,
  fetchPublicGroups,
  joinGroup,
  fetchGroup,
  fetchGroupFeed,
  fetchGroupChallenges,
  fetchGroupStreaks,
  createGroupChallenge,
};
