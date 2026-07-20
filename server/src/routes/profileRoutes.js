const express = require("express");
const router = express.Router();
const CFProfile = require("../models/CFProfile");
const { buildProfileData } = require("../services/codeforcesService");
const { getActivityHeatmap } = require("../services/activityService");

const CACHE_TTL_HOURS = parseFloat(process.env.CACHE_TTL_HOURS) || 6;

function isCacheFresh(fetchedAt) {
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  return ageHours < CACHE_TTL_HOURS;
}

// GET /api/profile/:handle
// This is the read-through cache: check Mongo first, only hit the
// Codeforces API if we have no record OR the record is stale.
router.get("/:handle", async (req, res) => {
  const handle = req.params.handle.toLowerCase().trim();

  if (!handle) {
    return res.status(400).json({ error: "Handle is required" });
  }

  try {
    const cached = await CFProfile.findOne({ handle });

    if (cached && isCacheFresh(cached.fetchedAt)) {
      return res.json({ source: "cache", data: cached });
    }

    // Cache miss or stale - hit the real Codeforces API
    const freshData = await buildProfileData(handle);

    const updated = await CFProfile.findOneAndUpdate(
      { handle },
      { ...freshData, handle, fetchedAt: new Date() },
      { new: true, upsert: true }
    );

    return res.json({ source: "live", data: updated });
  } catch (err) {
    if (err.message === "Handle not found on Codeforces") {
      return res.status(404).json({ error: `Handle "${handle}" not found on Codeforces` });
    }
    console.error("Error fetching profile:", err.message);
    return res.status(500).json({ error: "Something went wrong fetching this profile" });
  }
});

// GET /api/profile/:handle/activity - daily solve-activity heatmap data,
// CF-heatmap style. Not cached in Mongo like the main profile (would need
// its own TTL/invalidation story for 365 data points) - this always hits
// CF live, since user.status is already a single cheap call and the
// heatmap is refreshed far less often than the profile page itself.
router.get("/:handle/activity", async (req, res) => {
  const handle = req.params.handle.toLowerCase().trim();
  if (!handle) {
    return res.status(400).json({ error: "Handle is required" });
  }

  try {
    const heatmap = await getActivityHeatmap(handle);
    return res.json(heatmap);
  } catch (err) {
    console.error("Error building activity heatmap:", err.message);
    return res.status(500).json({ error: "Could not load activity data" });
  }
});

module.exports = router;
