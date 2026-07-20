const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// All routes here require a logged-in user
router.use(protect);

// GET /api/saved-handles - list current user's saved handles, most recent first
router.get("/", async (req, res) => {
  const sorted = [...req.user.savedHandles].sort((a, b) => b.addedAt - a.addedAt);
  return res.json(sorted);
});

// POST /api/saved-handles - add a handle to current user's saved list
router.post("/", async (req, res) => {
  const { handle } = req.body;
  if (!handle) {
    return res.status(400).json({ error: "Handle is required" });
  }

  const cleanHandle = handle.toLowerCase().trim();
  const user = await User.findById(req.user._id);

  const alreadySaved = user.savedHandles.some((h) => h.handle === cleanHandle);
  if (alreadySaved) {
    // Not an error - just move it to "most recent" by updating addedAt
    const entry = user.savedHandles.find((h) => h.handle === cleanHandle);
    entry.addedAt = new Date();
  } else {
    user.savedHandles.push({ handle: cleanHandle });
  }

  await user.save();
  return res.status(200).json(user.savedHandles);
});

// DELETE /api/saved-handles/:handle - remove a saved handle
router.delete("/:handle", async (req, res) => {
  const cleanHandle = req.params.handle.toLowerCase().trim();
  const user = await User.findById(req.user._id);

  user.savedHandles = user.savedHandles.filter((h) => h.handle !== cleanHandle);
  await user.save();

  return res.json(user.savedHandles);
});

module.exports = router;
