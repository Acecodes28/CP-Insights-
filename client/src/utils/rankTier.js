const RANK_COLOR_VAR = {
  newbie: "--rank-newbie",
  pupil: "--rank-pupil",
  specialist: "--rank-specialist",
  expert: "--rank-expert",
  "candidate master": "--rank-candidate-master",
  master: "--rank-master",
  "international master": "--rank-master",
  grandmaster: "--rank-grandmaster",
  "international grandmaster": "--rank-grandmaster",
  "legendary grandmaster": "--rank-legendary",
};

function normalizeRank(rank) {
  return (rank || "unrated").toLowerCase().trim();
}

function getRankColorVar(rank) {
  const key = normalizeRank(rank);
  return RANK_COLOR_VAR[key] || "--rank-newbie";
}

function resolveRankColor(rank) {
  const cssVar = getRankColorVar(rank);
  if (typeof window === "undefined") return "#7A7367";
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || "#7A7367";
}

function formatRankLabel(rank) {
  const key = normalizeRank(rank);
  if (key === "unrated") return "Unrated";
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

export { getRankColorVar, resolveRankColor, formatRankLabel };