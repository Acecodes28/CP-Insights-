const axios = require("axios");

const CF_BASE_URL = "https://codeforces.com/api";

function toUTCDateString(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

/**
 * Builds a full year of daily accepted-solve counts for a handle, in the
 * GitHub-heatmap style CF's own activity graph uses. Returns EVERY day in
 * the window (including zero-count days), since a heatmap needs the full
 * grid to render correctly, not just active days.
 */
async function getActivityHeatmap(handle, days = 365) {
  const res = await axios.get(`${CF_BASE_URL}/user.status?handle=${handle}`);
  if (res.data.status !== "OK" || !Array.isArray(res.data.result)) {
    throw new Error("Could not load submissions from Codeforces");
  }

  const cutoffSeconds = Math.floor(Date.now() / 1000) - days * 86400;
  const countsByDay = new Map();
  const seenPerDay = new Set(); // dedupe multiple ACs on the same problem same day

  for (const sub of res.data.result) {
    if (sub.verdict !== "OK") continue;
    if (sub.creationTimeSeconds < cutoffSeconds) continue;

    const day = toUTCDateString(sub.creationTimeSeconds);
    const dedupeKey = `${day}-${sub.problem.contestId}-${sub.problem.index}`;
    if (seenPerDay.has(dedupeKey)) continue;
    seenPerDay.add(dedupeKey);

    countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
  }

  // Fill every day in the window, including zeros, so the frontend can
  // render a complete grid without having to backfill gaps itself.
  const result = [];
  const cursor = new Date(cutoffSeconds * 1000);
  cursor.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    result.push({ date: dateStr, count: countsByDay.get(dateStr) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const totalActive = result.filter((d) => d.count > 0).length;
  const maxCount = Math.max(0, ...result.map((d) => d.count));

  return { days: result, totalActiveDays: totalActive, maxCount };
}

module.exports = { getActivityHeatmap };
