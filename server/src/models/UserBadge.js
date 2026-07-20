const mongoose = require("mongoose");

// One document per (user, badgeId). Progress is stored even for badges
// not yet unlocked - this is what powers the "see your progress toward
// locked badges" view for the badge owner, vs. the public view which
// only shows unlocked entries (filtered at the route layer, not here -
// this model stores the full truth regardless of who's allowed to see it).
const UserBadgeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    badgeId: { type: String, required: true }, // matches an id in badgeCatalog.js

    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date, default: null },

    progressCurrent: { type: Number, default: 0 },
    progressTarget: { type: Number, required: true },
  },
  { timestamps: true }
);

UserBadgeSchema.index({ user: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model("UserBadge", UserBadgeSchema);
