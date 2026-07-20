const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/authMiddleware");

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are all required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Password gets hashed automatically by the pre-save hook on User model
    const user = await User.create({ name, email, password });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      savedHandles: user.savedHandles,
      primaryHandle: user.primaryHandle,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({ error: "Something went wrong creating your account" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Deliberately vague error message (not "wrong password" vs "no account") -
    // this avoids leaking which emails are registered.
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      savedHandles: user.savedHandles,
      primaryHandle: user.primaryHandle,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Something went wrong logging you in" });
  }
});

// GET /api/auth/me - returns current user based on token, used to
// restore login state on page refresh (token lives in localStorage,
// but we still verify it's valid against the DB on every app load)
router.get("/me", protect, async (req, res) => {
  return res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    savedHandles: req.user.savedHandles,
    primaryHandle: req.user.primaryHandle,
  });
});

// PUT /api/auth/primary-handle - link (or change) the CF handle that
// represents this account for streaks and group features. Validates
// against the live CF API first so we never store a handle that doesn't
// exist - a broken primaryHandle would silently break streaks/groups
// with confusing downstream errors.
router.put("/primary-handle", protect, async (req, res) => {
  try {
    const { handle } = req.body;
    if (!handle || !handle.trim()) {
      return res.status(400).json({ error: "Handle is required" });
    }

    const normalized = handle.trim().toLowerCase();
    const axios = require("axios");
    const verifyRes = await axios
      .get(`https://codeforces.com/api/user.info?handles=${normalized}`)
      .catch(() => null);

    if (!verifyRes || verifyRes.data.status !== "OK" || !verifyRes.data.result?.[0]) {
      return res.status(404).json({ error: `Handle "${handle}" not found on Codeforces` });
    }

    const cfUser = verifyRes.data.result[0];

    req.user.primaryHandle = normalized;

    // Only capture the baseline the FIRST time a handle is linked - if
    // someone changes their linked handle later, we don't want to reset
    // their "since joining" progress and let them re-earn Personal Best
    // etc. by linking a fresh/lower-rated handle.
    if (!req.user.ratingBaseline?.capturedAt) {
      req.user.ratingBaseline = {
        rating: cfUser.rating || 0,
        rank: cfUser.rank || "unrated",
        capturedAt: new Date(),
      };
      req.user.lowestRatingSinceBaseline = cfUser.rating || 0;
    }

    await req.user.save();

    return res.json({ primaryHandle: req.user.primaryHandle });
  } catch (err) {
    console.error("Error linking primary handle:", err.message);
    return res.status(500).json({ error: "Could not link handle" });
  }
});

// GET /api/auth/by-handle/:handle - resolves a CF handle to a CP Insights
// userId, if that handle is someone's linked primaryHandle. Used by the
// profile page to know whether to show a public badge shelf (only
// possible for handles that belong to an actual CP Insights account).
// Deliberately returns nothing more than the id - no email, no other
// account details - since this is reachable for ANY handle someone
// searches, not just their own.
router.get("/by-handle/:handle", protect, async (req, res) => {
  try {
    const handle = req.params.handle.toLowerCase().trim();
    const user = await User.findOne({ primaryHandle: handle }).select("_id");
    if (!user) return res.status(404).json({ error: "No linked account for this handle" });
    return res.json({ userId: user._id });
  } catch (err) {
    console.error("Error resolving handle to user:", err.message);
    return res.status(500).json({ error: "Could not resolve handle" });
  }
});

module.exports = router;
