const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const CFProfile = require("../models/CFProfile");
const { buildProfileData } = require("../services/codeforcesService");

const CF_BASE_URL = "https://codeforces.com/api";

// In-memory cache (module-level, survives across requests but not restarts).
// Contest list changes infrequently enough that a short TTL is plenty —
// no need for a DB round trip on every dashboard load.
let cache = { data: null, fetchedAt: 0 };
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/contests
// Returns { upcoming: [...], recent: [...] } — upcoming contests sorted
// soonest-first, and the last few finished ones for context.
router.get("/", async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.fetchedAt < TTL_MS) {
      return res.json(cache.data);
    }

    const response = await axios.get(`${CF_BASE_URL}/contest.list`);
    if (response.data.status !== "OK" || !Array.isArray(response.data.result)) {
      throw new Error("Codeforces contest list unavailable");
    }

    const all = response.data.result;

    const upcoming = all
      .filter((c) => c.phase === "BEFORE")
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        name: c.name,
        startTimeSeconds: c.startTimeSeconds,
        durationSeconds: c.durationSeconds,
        type: c.type,
      }));

    const recent = all
      .filter((c) => c.phase === "FINISHED")
      .sort((a, b) => b.startTimeSeconds - a.startTimeSeconds)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        startTimeSeconds: c.startTimeSeconds,
        durationSeconds: c.durationSeconds,
        type: c.type,
      }));

    const payload = { upcoming, recent };
    cache = { data: payload, fetchedAt: Date.now() };

    return res.json(payload);
  } catch (err) {
    console.error("Error fetching contest list:", err.message);
    if (cache.data) {
      // Serve stale cache rather than fail outright
      return res.json(cache.data);
    }
    return res.status(502).json({ error: "Could not load contest list from Codeforces" });
  }
});

// GET /api/contests/mine - rated contests the current user's linked handle
// has appeared in, newest first. Reads straight from the CFProfile cache
// (already populated by profileRoutes/codeforcesService), so this doesn't
// hit the CF API itself - it just reshapes data that's already stored.
// A slightly stale rating history here is fine since the source profile
// gets refreshed every time the user actually visits their profile page.
router.get("/mine", protect, async (req, res) => {
  const { primaryHandle } = req.user;
  if (!primaryHandle) {
    return res.status(400).json({ error: "Link your Codeforces handle first" });
  }

  try {
    const handle = primaryHandle.toLowerCase().trim();
    let profile = await CFProfile.findOne({ handle });

    if (!profile) {
      // No cached profile yet (e.g. user linked a handle but never
      // visited their own /profile/:handle page) - fetch it live once
      // and cache it, same as profileRoutes does, so /mine works
      // standalone instead of silently returning an empty list.
      const freshData = await buildProfileData(handle);
      profile = await CFProfile.findOneAndUpdate(
        { handle },
        { ...freshData, handle, fetchedAt: new Date() },
        { new: true, upsert: true }
      );
    }

    const contests = [...profile.ratingHistory]
      .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
      .map((entry) => ({
        contestId: entry.contestId,
        contestName: entry.contestName,
        rank: entry.rank,
        oldRating: entry.oldRating,
        newRating: entry.newRating,
        delta: entry.newRating - entry.oldRating,
        ratingUpdateTimeSeconds: entry.ratingUpdateTimeSeconds,
      }));

    return res.json({ contests });
  } catch (err) {
    console.error("Error loading user's contest history:", err.message);
    return res.status(500).json({ error: "Could not load your contest history" });
  }
});

module.exports = router;
