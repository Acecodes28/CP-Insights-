const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ProblemLog = require("../models/ProblemLog");
const { syncProblemLogs, getProblemLogs } = require("../services/problemLogService");

// All routes here require a logged-in user
router.use(protect);

// GET /api/problems - sync from CF (if primaryHandle is linked) then
// return the full list. Sync failures are swallowed and reported via
// `syncError` rather than failing the whole request, so a stale CF API
// or rate limit doesn't hide problems the user already has star/notes on.
router.get("/", async (req, res) => {
  const user = req.user;
  if (!user.primaryHandle) {
    return res.status(400).json({ error: "Link your Codeforces handle first" });
  }

  let syncError = null;
  try {
    await syncProblemLogs(user._id, user.primaryHandle);
  } catch (err) {
    console.error("Error syncing problem logs:", err.message);
    syncError = "Could not refresh from Codeforces - showing last saved data";
  }

  try {
    const problems = await getProblemLogs(user._id);
    return res.json({ problems, syncError });
  } catch (err) {
    console.error("Error loading problem logs:", err.message);
    return res.status(500).json({ error: "Could not load your problem log" });
  }
});

// PATCH /api/problems/:problemKey - update starred/note on one problem.
// Only touches fields actually present in the body so a star-toggle
// request can't accidentally blank out an existing note, or vice versa.
router.patch("/:problemKey", async (req, res) => {
  const { problemKey } = req.params;
  const { starred, note } = req.body;

  if (starred === undefined && note === undefined) {
    return res.status(400).json({ error: "Nothing to update - provide starred and/or note" });
  }
  if (note !== undefined && typeof note !== "string") {
    return res.status(400).json({ error: "note must be a string" });
  }
  if (note !== undefined && note.length > 5000) {
    return res.status(400).json({ error: "note is too long (max 5000 characters)" });
  }
  if (starred !== undefined && typeof starred !== "boolean") {
    return res.status(400).json({ error: "starred must be a boolean" });
  }

  const update = {};
  if (starred !== undefined) update.starred = starred;
  if (note !== undefined) update.note = note;

  try {
    const updated = await ProblemLog.findOneAndUpdate(
      { user: req.user._id, problemKey },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Problem not found in your log" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("Error updating problem log:", err.message);
    return res.status(500).json({ error: "Could not update this problem" });
  }
});

module.exports = router;
