const axios = require("axios");
const Streak = require("../models/Streak");

const CF_BASE_URL = "https://codeforces.com/api";
const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

function toUTCDateString(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + "T00:00:00Z");
  const b = new Date(dateStrB + "T00:00:00Z");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

async function getAcceptedByDay(handle, sinceSeconds) {
  const res = await axios.get(`${CF_BASE_URL}/user.status?handle=${handle}`);
  if (res.data.status !== "OK" || !Array.isArray(res.data.result)) {
    throw new Error("Could not load submissions from Codeforces");
  }

  const byDay = new Map();
  const seenProblemPerDay = new Set();

  for (const sub of res.data.result) {
    if (sub.verdict !== "OK") continue;
    if (sinceSeconds && sub.creationTimeSeconds < sinceSeconds) continue;

    const day = toUTCDateString(sub.creationTimeSeconds);
    const problemKey = `${day}-${sub.problem.contestId}-${sub.problem.index}`;
    if (seenProblemPerDay.has(problemKey)) continue;
    seenProblemPerDay.add(problemKey);

    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({
      contestId: sub.problem.contestId,
      index: sub.problem.index,
      rating: sub.problem.rating || null,
      tags: sub.problem.tags || [],
      creationTimeSeconds: sub.creationTimeSeconds,
    });
  }

  return byDay;
}

function dayMeetsFloorAndDayFilters(daySolves, filters) {
  if (!daySolves || daySolves.length === 0) return false;

  for (const f of filters) {
    if (f.type === "min_rating") {
      const hasQualifying = daySolves.some((s) => s.rating && s.rating >= f.value);
      if (!hasQualifying) return false;
    }
    if (f.type === "min_count_per_day") {
      if (daySolves.length < f.value) return false;
    }
  }
  return true;
}

function weekMeetsWeekFilters(byDay, weekDates, filters) {
  const weekSolves = weekDates.flatMap((d) => byDay.get(d) || []);

  for (const f of filters) {
    if (f.type === "distinct_tags_per_week") {
      const tagSet = new Set(weekSolves.flatMap((s) => s.tags));
      if (tagSet.size < f.value) return false;
    }
    if (f.type === "min_count_per_week_above_rating") {
      const qualifying = weekSolves.filter((s) => s.rating && s.rating >= f.rating);
      if (qualifying.length < f.value) return false;
    }
  }
  return true;
}

function last7DatesEnding(dateStr) {
  const dates = [];
  const base = new Date(dateStr + "T00:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function evaluateStreak(streakDoc) {
  const today = toUTCDateString(Date.now() / 1000);

  const startFrom = streakDoc.lastMaintainedDate
    ? streakDoc.lastMaintainedDate
    : toUTCDateString(Date.now() / 1000 - 86400);

  const daysSinceLast = daysBetween(startFrom, today);
  if (daysSinceLast === 0 && streakDoc.lastMaintainedDate) {
    return { streak: streakDoc, newMilestones: [] };
  }

  const sinceSeconds = Math.floor(Date.now() / 1000) - 40 * 86400;
  const byDay = await getAcceptedByDay(streakDoc.handle, sinceSeconds);

  const dayFilters = streakDoc.filters.filter(
    (f) => f.type === "min_rating" || f.type === "min_count_per_day"
  );
  const weekFilters = streakDoc.filters.filter(
    (f) => f.type === "distinct_tags_per_week" || f.type === "min_count_per_week_above_rating"
  );

  const cursor = new Date(startFrom + "T00:00:00Z");
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  const todayDate = new Date(today + "T00:00:00Z");

  let current = streakDoc.lastMaintainedDate ? streakDoc.current : 0;
  let broke = false;

  while (cursor <= todayDate) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const daySolves = byDay.get(dateStr) || [];

    const floorAndDayOk = dayMeetsFloorAndDayFilters(daySolves, dayFilters);
    const weekOk = weekFilters.length === 0 || weekMeetsWeekFilters(byDay, last7DatesEnding(dateStr), weekFilters);

    if (floorAndDayOk && weekOk) {
      current += 1;
      streakDoc.lastMaintainedDate = dateStr;
    } else if (dateStr === today) {
      break;
    } else {
      current = 0;
      broke = true;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const newMilestones = [];
  if (!broke || current > 0) {
    for (const m of MILESTONES) {
      if (current >= m && !streakDoc.milestonesAwarded.includes(m)) {
        newMilestones.push(m);
      }
    }
  }

  streakDoc.current = current;
  streakDoc.longest = Math.max(streakDoc.longest, current);
  streakDoc.milestonesAwarded.push(...newMilestones);
  await streakDoc.save();

  return { streak: streakDoc, newMilestones };
}

async function getOrCreateStreak(userId, handle) {
  let streak = await Streak.findOne({ user: userId });
  if (!streak) {
    streak = await Streak.create({ user: userId, handle, filters: [] });
  }
  return streak;
}

module.exports = { evaluateStreak, getOrCreateStreak, MILESTONES };
