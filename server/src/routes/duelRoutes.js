const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Duel = require("../models/Duel");

// GET /api/duels/mine - duel history + any pending/active duels for the
// current user. Used on page load so the UI has something to render
// before a socket connection is even established, and so refreshing
// mid-duel doesn't lose your place.
router.get("/mine", protect, async (req, res) => {
  try {
    const duels = await Duel.find({ "players.user": req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.json(duels);
  } catch (err) {
    console.error("Error fetching duels:", err.message);
    return res.status(500).json({ error: "Could not load duel history" });
  }
});

// GET /api/duels/:id - a single duel's full state (used to hydrate the
// live match view on load/refresh, before/alongside the socket connection)
router.get("/:id", protect, async (req, res) => {
  try {
    const duel = await Duel.findById(req.params.id);
    if (!duel) return res.status(404).json({ error: "Duel not found" });

    const isPlayer = duel.players.some((p) => p.user.toString() === req.user._id.toString());
    if (!isPlayer) return res.status(403).json({ error: "Not a participant in this duel" });

    return res.json(duel);
  } catch (err) {
    console.error("Error fetching duel:", err.message);
    return res.status(500).json({ error: "Could not load duel" });
  }
});

module.exports = router;
