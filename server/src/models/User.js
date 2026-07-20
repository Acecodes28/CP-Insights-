const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // Handles this user has searched/saved, most recent first.
    // We keep this here (not a separate collection) because it's a
    // small array per user, always fetched together with the user,
    // and never queried independently - a classic case for embedding
    // instead of referencing.
    savedHandles: [
      {
        handle: { type: String, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // The single CF handle that represents "this account" for features
    // that need exactly one identity per user (streaks, group feeds,
    // group membership). Distinct from savedHandles, which is just a
    // watchlist and can contain handles that aren't the user's own.
    // Nullable: a user can use the dashboard/profile lookup features
    // without ever linking a handle, and only needs to set this the
    // first time they try to join a group or start a streak.
    primaryHandle: {
      type: String,
      default: null,
      trim: true,
    },

    // Internal CP Insights Elo, distinct from CF's own rating - this is
    // purely a ladder for duels within this app, starting everyone at a
    // shared baseline (800) since a fresh system has no game history to
    // calibrate against. Updated after every completed duel via
    // eloService.js using the standard expected-score formula.
    elo: {
      type: Number,
      default: 800,
    },
    duelStats: {
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
    },

    // Snapshot taken the moment primaryHandle is linked - the baseline
    // several badges compare against ("reached a new tier SINCE joining",
    // "new all-time peak SINCE joining"). Without a fixed starting point,
    // "Tier Climber" would be unearnable by someone who joined already at
    // a high rank, and "Personal Best" would trivially fire for anyone
    // whose CF peak predates this app entirely.
    ratingBaseline: {
      rating: { type: Number, default: null },
      rank: { type: String, default: null },
      capturedAt: { type: Date, default: null },
    },
    // Tracks the lowest rating seen since baseline capture, purely to
    // detect "Comeback Kid" (recovered from a real dip to a new peak) -
    // updated on every profile fetch/badge evaluation, not just once.
    lowestRatingSinceBaseline: { type: Number, default: null },
  },
  { timestamps: true }
);

// Hash the password automatically whenever it's set/changed.
// This runs BEFORE save, so routes never handle raw password hashing -
// they just create/update a User with a plain password and this takes care of it.
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare a plain-text login attempt against the stored hash.
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
