const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { evaluateStreak, getOrCreateStreak } = require("../services/streakService");

const VALID_FILTER_TYPES = [
  "min_rating",
  "min_count_per_day",
  "distinct_tags_per_week",
  "min_count_per_week_above_rating",
];

function validateFilters(filters) {
  if (!Array.isArray(filters)) return "filters must be an array";
  for (const f of filters) {
    if (!VALID_FILTER_TYPES.includes(f.type)) return `Unknown filter type: ${f.type}`;
    if (typeof f.value !== "number" || f.value <= 0) return `Filter "${f.type}" needs a positive numeric value`;
    if (f.type === "min_count_per_week_above_rating" && typeof f.rating !== "number") {
      return "min_count_per_week_above_rating requires a rating threshold";
    }
  }
  return null;
}

// GET /api/streak - current user's streak, re-evaluated against live CF data first
router.get("/", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user.primaryHandle) {
      return res.status(400).json({ error: "Link your Codeforces handle first" });
    }

    const streak = await getOrCreateStreak(user._id, user.primaryHandle);
    const { streak: updated, newMilestones } = await evaluateStreak(streak);

    return res.json({
      current: updated.current,
      longest: updated.longest,
      filters: updated.filters,
      lastMaintainedDate: updated.lastMaintainedDate,
      newMilestones,
      milestonesAwarded: updated.milestonesAwarded,
    });
  } catch (err) {
    console.error("Error evaluating streak:", err.message);
    return res.status(500).json({ error: "Could not load streak" });
  }
});

// PUT /api/streak/filters - replace the stacked filter list
router.put("/filters", protect, async (req, res) => {
  try {
    const { filters } = req.body;
    const validationError = validateFilters(filters || []);
    if (validationError) return res.status(400).json({ error: validationError });

    const user = req.user;
    if (!user.primaryHandle) {
      return res.status(400).json({ error: "Link your Codeforces handle first" });
    }

    const streak = await getOrCreateStreak(user._id, user.primaryHandle);
    streak.filters = filters;
    await streak.save();

    return res.json({ filters: streak.filters });
  } catch (err) {
    console.error("Error updating streak filters:", err.message);
    return res.status(500).json({ error: "Could not update filters" });
  }
});

module.exports = router;
