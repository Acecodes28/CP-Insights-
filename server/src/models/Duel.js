const mongoose = require("mongoose");

// One document per duel, covering its entire lifecycle from challenge/queue
// through best-of-3 rounds to a final result. Rounds are embedded (not a
// separate collection) since a duel only ever has up to 3 and the whole
// thing is short-lived - no unbounded-growth concern like the group feed.
const DuelRoundSchema = new mongoose.Schema(
  {
    contestId: { type: Number, required: true },
    problemIndex: { type: String, required: true },
    problemName: { type: String, required: true },
    problemRating: { type: Number, default: null },
    tags: [String],

    startedAt: { type: Date, required: true },
    // Set once a round resolves - "handle" of whoever got there first, or
    // null for a round that timed out with neither side solving it.
    winnerHandle: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    resolution: {
      type: String,
      enum: ["solved", "timeout", null],
      default: null,
    },
  },
  { _id: false }
);

const DuelSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "active", "completed", "declined", "cancelled"],
      default: "pending",
      index: true,
    },

    // How the duel was formed - direct challenge vs matchmaking queue.
    // Kept mainly for display ("Matched via queue" vs "Challenged by X")
    // and because only challenges have an inviter/invitee distinction.
    source: { type: String, enum: ["challenge", "matchmaking"], required: true },

    players: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        handle: { type: String, required: true, lowercase: true, trim: true },
        ratingAtStart: { type: Number, default: null },
      },
    ],

    // Only meaningful for source: "challenge" - who initiated, so the
    // invitee's client knows to show an accept/decline prompt rather than
    // "waiting for opponent".
    challengerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    difficultyMin: { type: Number, default: null },
    difficultyMax: { type: Number, default: null },

    rounds: [DuelRoundSchema],
    // Tracks wins per handle for quick "who's leading" reads without
    // recomputing from rounds[] on every socket event.
    scores: { type: Map, of: Number, default: {} },

    winnerHandle: { type: String, default: null }, // set when status becomes "completed"

    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DuelSchema.index({ "players.user": 1, status: 1 });

module.exports = mongoose.model("Duel", DuelSchema);
