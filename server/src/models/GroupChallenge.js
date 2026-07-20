const mongoose = require("mongoose");

// A single "bonus" problem for the group, not a daily checklist item.
// attempts[] tracks who's solved it (checked automatically the same way
// the feed poller works - see groupFeedService.js) so this doubles as a
// mini-leaderboard for that one problem without needing a separate model.
const GroupChallengeSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },

    contestId: { type: Number, required: true },
    problemIndex: { type: String, required: true },
    problemName: { type: String, required: true },
    problemRating: { type: Number, default: null },
    tags: [String],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Challenges run for a window (default 1 week) rather than indefinitely,
    // so "this week's challenge" stays a meaningful, closable event instead
    // of an ever-growing backlog of stale problems.
    opensAt: { type: Date, default: Date.now },
    closesAt: { type: Date, required: true },

    solvedBy: [
      {
        handle: { type: String, required: true, lowercase: true, trim: true },
        solvedAtSeconds: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

GroupChallengeSchema.index({ group: 1, closesAt: -1 });

module.exports = mongoose.model("GroupChallenge", GroupChallengeSchema);
