const mongoose = require("mongoose");

// One document per (user, problem). This is the persistence layer behind
// the "My Progress" page: every problem the user's CF handle has ever
// touched gets a row here, refreshed from CF on each sync, PLUS whatever
// the user has added on top (star, note) which sync must never overwrite.
//
// problemKey mirrors the "${contestId}-${index}" convention already used
// in codeforcesService.aggregateSubmissions, so the two stay compatible.
const ProblemLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    problemKey: { type: String, required: true },
    contestId: { type: Number, default: null },
    index: { type: String, default: null }, // CF problem index within contest, e.g. "A", "B2"
    name: { type: String, default: "" },
    rating: { type: Number, default: null },
    tags: { type: [String], default: [] },

    // Derived from CF submissions on every sync - "solved" wins permanently
    // over "attempted" (a later re-sync can never downgrade a problem the
    // user has already solved, even if CF submission history is paginated
    // differently next time).
    status: {
      type: String,
      enum: ["solved", "attempted"],
      required: true,
    },
    lastSubmissionTimeSeconds: { type: Number, default: null },

    // User-added, never touched by sync logic
    starred: { type: Boolean, default: false },
    note: { type: String, default: "", maxlength: 5000 },
  },
  { timestamps: true }
);

// A user can only have one log row per problem
ProblemLogSchema.index({ user: 1, problemKey: 1 }, { unique: true });

module.exports = mongoose.model("ProblemLog", ProblemLogSchema);
