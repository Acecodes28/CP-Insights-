require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const profileRoutes = require("./routes/profileRoutes");
const authRoutes = require("./routes/authRoutes");
const savedHandleRoutes = require("./routes/savedHandleRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const contestRoutes = require("./routes/contestRoutes");
const streakRoutes = require("./routes/streakRoutes");
const groupRoutes = require("./routes/groupRoutes");
const duelRoutes = require("./routes/duelRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const problemLogRoutes = require("./routes/problemLogRoutes");
const { startGroupPolling } = require("./services/groupFeedService");
const { initDuelSocket } = require("./sockets/duelSocket");

const app = express();
const httpServer = http.createServer(app);

// CLIENT_URL supports a comma-separated list, e.g.
//   CLIENT_URL=https://cp-insights.vercel.app,https://cp-insights-lovat.vercel.app
// This exists because Vercel gives every project (and every git branch
// preview) its own generated *.vercel.app URL, on top of whatever custom
// domain you eventually add - a single hardcoded origin breaks the moment
// you create a new Vercel project or push a preview branch. If CLIENT_URL
// is unset, every origin is allowed (useful for local dev only - set
// CLIENT_URL in production).
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsOriginCheck(origin, callback) {
  // No Origin header (curl, server-to-server, some mobile clients) - allow.
  if (!origin) return callback(null, true);
  // No allowlist configured - allow everything (dev convenience).
  if (allowedOrigins.length === 0) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error(`CORS: origin ${origin} is not in the allowed list`));
}

const io = new Server(httpServer, {
  cors: { origin: corsOriginCheck },
});

connectDB();

app.use(cors({ origin: corsOriginCheck }));
app.use(express.json());

app.use("/api/profile", profileRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/saved-handles", savedHandleRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/streak", streakRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/duels", duelRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/problems", problemLogRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

initDuelSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`CP Insights server running on port ${PORT}`);
  startGroupPolling();
});
