const mongoose = require("mongoose");

// One document per (group, member, solved problem). Populated entirely by
// the polling job in groupFeedService.js - never written to by a manual
// "post" endpoint, per the automatic-feed-only design.
const GroupFeedEntrySchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    handle: { type: String, required: true, lowercase: true, trim: true },

    contestId: { type: Number, required: true },
    problemIndex: { type: String, required: true },
    problemName: { type: String, required: true },
    problemRating: { type: Number, default: null },
    tags: [String],

    // When the AC submission actually happened on Codeforces, not when we
    // polled it - lets the feed sort/display by true solve time.
    solvedAtSeconds: { type: Number, required: true },
  },
  { timestamps: true }
);

// A member can't have two feed entries for the same problem in the same
// group - the poller upserts against this to stay idempotent even if it
// runs twice over the same submission window.
GroupFeedEntrySchema.index(
  { group: 1, handle: 1, contestId: 1, problemIndex: 1 },
  { unique: true }
);

// Primary read pattern: "give me the last N entries for this group,
// newest first" - covered directly by this compound index.
GroupFeedEntrySchema.index({ group: 1, solvedAtSeconds: -1 });

module.exports = mongoose.model("GroupFeedEntry", GroupFeedEntrySchema);
