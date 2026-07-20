const mongoose = require("mongoose");

// One streak config per user (per their primaryHandle). The floor - at
// least 1 accepted solve per day - is enforced in code (streakService.js),
// not stored here, since it's non-negotiable. What IS stored are the
// OPTIONAL extra conditions a user can stack on top, each scoped to
// "today" or "this week" depending on the filter type.
const StreakFilterSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["min_rating", "min_count_per_day", "distinct_tags_per_week", "min_count_per_week_above_rating"],
      required: true,
    },
    // Generic numeric threshold - meaning depends on `type`:
    //   min_rating                    -> at least one solve/day >= this rating
    //   min_count_per_day             -> at least this many solves/day (>= 1, since floor already guarantees 1)
    //   distinct_tags_per_week        -> at least this many distinct tags across the week
    //   min_count_per_week_above_rating -> paired with `rating` below: N solves this week at/above that rating
    value: { type: Number, required: true },
    rating: { type: Number, default: null }, // only used by min_count_per_week_above_rating
  },
  { _id: false }
);

const StreakSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    handle: { type: String, required: true, lowercase: true, trim: true },

    filters: [StreakFilterSchema],

    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },

    lastMaintainedDate: { type: String, default: null },

    milestonesAwarded: [{ type: Number }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Streak", StreakSchema);
