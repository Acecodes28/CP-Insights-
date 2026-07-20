const mongoose = require("mongoose");
const crypto = require("crypto");

// Groups are intentionally lightweight: membership + settings live here,
// but challenges and feed entries are separate collections (see
// GroupChallenge.js, GroupFeedEntry.js). Embedding those would mean this
// document keeps growing forever as a group stays active, which both
// risks MongoDB's 16MB document cap on a long-lived group and makes every
// "just show me group settings" fetch pull in unrelated history.
const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 280, default: "" },

    visibility: {
      type: String,
      enum: ["public", "invite-only"],
      default: "invite-only",
    },

    // Only meaningful for invite-only groups - a short shareable code.
    // Public groups can be found/joined without one, but we still generate
    // it so a public group's admin can flip visibility later without a
    // migration.
    joinCode: {
      type: String,
      default: () => crypto.randomBytes(4).toString("hex"), // e.g. "a1b2c3d4"
      unique: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // Snapshot of the handle this member was using when they joined -
        // kept in sync via a lightweight update whenever it changes, so
        // group-wide queries (feed, challenge attempts) don't need to
        // join back to User just to know "whose handle is this".
        handle: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

GroupSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model("Group", GroupSchema);
