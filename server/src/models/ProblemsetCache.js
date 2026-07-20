const mongoose = require("mongoose");

// Singleton-style collection: one document holding the entire Codeforces
// problemset (problems.all()), refreshed on a TTL. This exists so the
// recommendation engine never has to hit the CF API on a per-user-request
// basis for problem data — it hits Mongo, which is fast and free, and only
// falls back to the CF API when the cache is empty or stale (problems.all()
// changes rarely — new problems appear roughly weekly at most).
const ProblemsetCacheSchema = new mongoose.Schema({
  key: { type: String, default: "problemset", unique: true },

  problems: [
    {
      contestId: Number,
      index: String,
      name: String,
      rating: Number,
      tags: [String],
    },
  ],

  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProblemsetCache", ProblemsetCacheSchema);
