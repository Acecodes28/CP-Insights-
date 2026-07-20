const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const UserBadge = require("../models/UserBadge");
const { evaluateBadgesForUser, BADGE_CATALOG } = require("../services/badgeService");

// GET /api/badges/me - full trophy cabinet for the logged-in user: every
// badge in the catalog, unlocked or not, with live progress. Re-evaluates
// against current data first (fast for most categories - only the CF-info
// ones make extra network calls) so the cabinet never shows stale progress.
router.get("/me", protect, async (req, res) => {
  try {
    if (!req.user.primaryHandle) {
      return res.status(400).json({ error: "Link your Codeforces handle to track badges" });
    }
    const badges = await evaluateBadgesForUser(req.user._id);
    return res.json({ elo: req.user.elo, duelStats: req.user.duelStats, badges });
  } catch (err) {
    console.error("Error evaluating badges:", err.message);
    return res.status(500).json({ error: "Could not load badges" });
  }
});

// GET /api/badges/user/:userId - PUBLIC-FACING view (still requires being
// logged in to call it, same as everything else, but shows only what a
// visitor should see): unlocked badges only, no progress on locked ones,
// no hint that locked badges even exist beyond their basic catalog info.
// This is the deliberate split from /me - /me is "what I see about myself",
// this is "what others see about me".
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const unlockedBadges = await UserBadge.find({ user: user._id, unlocked: true });
    const unlockedIds = new Set(unlockedBadges.map((b) => b.badgeId));

    const publicBadges = BADGE_CATALOG.filter((b) => unlockedIds.has(b.id)).map((b) => {
      const record = unlockedBadges.find((ub) => ub.badgeId === b.id);
      return { ...b, unlocked: true, unlockedAt: record.unlockedAt };
    });

    return res.json({ elo: user.elo, duelStats: user.duelStats, badges: publicBadges });
  } catch (err) {
    console.error("Error loading public badges:", err.message);
    return res.status(500).json({ error: "Could not load badges" });
  }
});

module.exports = router;
