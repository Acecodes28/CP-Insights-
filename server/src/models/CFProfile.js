const mongoose = require("mongoose");

// This single document stores EVERYTHING we need for one handle:
// raw info, raw rating history, raw submissions, and the aggregations
// we compute from them. Storing computed aggregations alongside raw data
// means the frontend never has to re-crunch thousands of submissions,
// and we only redo that work when the cache actually expires.
const CFProfileSchema = new mongoose.Schema(
  {
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Raw response from user.info
    userInfo: {
      rating: Number,
      maxRating: Number,
      rank: String,
      maxRank: String,
      titlePhoto: String,
      contribution: Number,
      friendOfCount: Number,
      registrationTimeSeconds: Number,
    },

    // Raw response from user.rating - one entry per rated contest
    ratingHistory: [
      {
        contestId: Number,
        contestName: String,
        rank: Number,
        oldRating: Number,
        newRating: Number,
        ratingUpdateTimeSeconds: Number,
      },
    ],

    // Computed aggregation: solved problems bucketed by difficulty range
    // e.g. { "800-1000": 12, "1100-1300": 8, ... }
    difficultyBuckets: {
      type: Map,
      of: Number,
      default: {},
    },

    // Computed aggregation: tag -> { solved, attempted }
    // e.g. { "graphs": { solved: 5, attempted: 9 }, "dp": {...} }
    tagStats: {
      type: Map,
      of: {
        solved: { type: Number, default: 0 },
        attempted: { type: Number, default: 0 },
      },
      default: {},
    },

    // Simple summary numbers so the dashboard header doesn't need
    // to recompute from arrays every time it renders
    summary: {
      totalSolved: { type: Number, default: 0 },
      currentRating: Number,
      maxRating: Number,
      rank: String,
    },

    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CFProfile", CFProfileSchema);
