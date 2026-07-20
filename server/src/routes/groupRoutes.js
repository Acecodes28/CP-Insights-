const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Group = require("../models/Group");
const GroupFeedEntry = require("../models/GroupFeedEntry");
const GroupChallenge = require("../models/GroupChallenge");
const { pickChallengeProblem } = require("../services/challengeService");
const { evaluateStreak, getOrCreateStreak } = require("../services/streakService");

function requireHandle(req, res) {
  if (!req.user.primaryHandle) {
    res.status(400).json({ error: "Link your Codeforces handle before using groups" });
    return null;
  }
  return req.user.primaryHandle;
}

function isMember(group, userId) {
  // Works whether members.user is a raw ObjectId (not yet populated) or a
  // populated User document (has ._id) - populate() replaces m.user with
  // the full document, and calling .toString() on that document does NOT
  // return the bare hex id, so we must check for a populated shape first.
  return group.members.some((m) => {
    const memberId = m.user && m.user._id ? m.user._id : m.user;
    return memberId.toString() === userId.toString();
  });
}

// POST /api/groups - create a group. Creator is auto-added as admin.
router.post("/", protect, async (req, res) => {
  try {
    const handle = requireHandle(req, res);
    if (!handle) return;

    const { name, description, visibility } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const group = await Group.create({
      name: name.trim(),
      description: (description || "").trim(),
      visibility: visibility === "public" ? "public" : "invite-only",
      createdBy: req.user._id,
      members: [{ user: req.user._id, handle, role: "admin" }],
    });

    return res.status(201).json(group);
  } catch (err) {
    console.error("Error creating group:", err.message);
    return res.status(500).json({ error: "Could not create group" });
  }
});

// GET /api/groups/mine - groups the current user belongs to
router.get("/mine", protect, async (req, res) => {
  try {
    const groups = await Group.find({ "members.user": req.user._id }).sort({ updatedAt: -1 });
    return res.json(groups);
  } catch (err) {
    console.error("Error fetching groups:", err.message);
    return res.status(500).json({ error: "Could not load your groups" });
  }
});

// GET /api/groups/public - browse public groups not yet joined
router.get("/public", protect, async (req, res) => {
  try {
    const groups = await Group.find({
      visibility: "public",
      "members.user": { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.json(groups);
  } catch (err) {
    console.error("Error fetching public groups:", err.message);
    return res.status(500).json({ error: "Could not load public groups" });
  }
});

// POST /api/groups/join - join a public group by id, or any group by join code
router.post("/join", protect, async (req, res) => {
  try {
    const handle = requireHandle(req, res);
    if (!handle) return;

    const { groupId, joinCode } = req.body;
    if (!groupId && !joinCode) {
      return res.status(400).json({ error: "Provide a groupId or joinCode" });
    }

    const group = groupId ? await Group.findById(groupId) : await Group.findOne({ joinCode });
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!joinCode && group.visibility !== "public") {
      return res.status(403).json({ error: "This group requires an invite code" });
    }

    if (isMember(group, req.user._id)) {
      return res.status(409).json({ error: "You're already in this group" });
    }

    group.members.push({ user: req.user._id, handle, role: "member" });
    await group.save();

    return res.json(group);
  } catch (err) {
    console.error("Error joining group:", err.message);
    return res.status(500).json({ error: "Could not join group" });
  }
});

// GET /api/groups/:id - group details + members (feed/challenges are separate endpoints
// so a group settings view doesn't have to pull the whole feed history)
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members.user", "name");
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: "You're not a member of this group" });
    }
    return res.json(group);
  } catch (err) {
    console.error("Error fetching group:", err.message);
    return res.status(500).json({ error: "Could not load group" });
  }
});

// GET /api/groups/:id/feed - recent auto-populated activity, newest first
router.get("/:id/feed", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: "You're not a member of this group" });
    }

    const entries = await GroupFeedEntry.find({ group: group._id })
      .sort({ solvedAtSeconds: -1 })
      .limit(50);

    return res.json(entries);
  } catch (err) {
    console.error("Error fetching group feed:", err.message);
    return res.status(500).json({ error: "Could not load group feed" });
  }
});

// GET /api/groups/:id/challenges - active + recent challenges for this group
router.get("/:id/challenges", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: "You're not a member of this group" });
    }

    const challenges = await GroupChallenge.find({ group: group._id })
      .sort({ closesAt: -1 })
      .limit(10);

    return res.json(challenges);
  } catch (err) {
    console.error("Error fetching challenges:", err.message);
    return res.status(500).json({ error: "Could not load challenges" });
  }
});

// POST /api/groups/:id/challenges - create a new bonus challenge for the group.
// Any member can propose one (not just admins) - keeps friction low for a
// small group of friends, matching how you described this feature.
router.post("/:id/challenges", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: "You're not a member of this group" });
    }

    const { minRating, maxRating, durationDays } = req.body;
    const problem = await pickChallengeProblem({
      minRating: minRating || 1700,
      maxRating: maxRating || 2400,
    });

    const closesAt = new Date(Date.now() + (durationDays || 7) * 86400 * 1000);

    const challenge = await GroupChallenge.create({
      group: group._id,
      contestId: problem.contestId,
      problemIndex: problem.index,
      problemName: problem.name,
      problemRating: problem.rating,
      tags: problem.tags,
      createdBy: req.user._id,
      closesAt,
    });

    return res.status(201).json(challenge);
  } catch (err) {
    console.error("Error creating challenge:", err.message);
    return res.status(500).json({ error: "Could not create challenge" });
  }
});

// GET /api/groups/:id/streaks - every member's personal streak, shown
// together for group motivation. Streaks themselves are still personal
// (tied to the user, not the group - the same streak a member has here
// is the same one shown on their own dashboard), this just aggregates
// them for a shared view so a group can see who's keeping theirs alive.
router.get("/:id/streaks", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members.user", "name");
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!isMember(group, req.user._id)) {
      return res.status(403).json({ error: "You're not a member of this group" });
    }

    const results = [];
    for (const member of group.members) {
      const memberId = member.user && member.user._id ? member.user._id : member.user;
      try {
        const streak = await getOrCreateStreak(memberId, member.handle);
        const { streak: updated } = await evaluateStreak(streak);
        results.push({
          handle: member.handle,
          name: member.user?.name,
          current: updated.current,
          longest: updated.longest,
        });
      } catch (err) {
        // One member's CF hiccup shouldn't blank out the whole list
        results.push({ handle: member.handle, name: member.user?.name, current: null, longest: null });
      }
    }

    results.sort((a, b) => (b.current || 0) - (a.current || 0));
    return res.json(results);
  } catch (err) {
    console.error("Error fetching group streaks:", err.message);
    return res.status(500).json({ error: "Could not load group streaks" });
  }
});

module.exports = router;
