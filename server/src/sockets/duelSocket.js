const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Duel = require("../models/Duel");
const CFProfile = require("../models/CFProfile");
const {
  checkActiveRound,
  createChallenge,
  acceptChallenge,
  createMatchmakingDuel,
  forfeitRound,
  forfeitMatch,
  POLL_INTERVAL_MS,
} = require("../services/duelService");

const onlineUsers = new Map();
const queue = new Map();
const activePollers = new Map();

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No auth token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("User no longer exists"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Invalid auth token"));
  }
}

function startPollingDuel(io, duelId) {
  if (activePollers.has(duelId)) return;

  const interval = setInterval(async () => {
    try {
      const duel = await Duel.findById(duelId);
      if (!duel || duel.status !== "active") {
        clearInterval(interval);
        activePollers.delete(duelId);
        if (duel) io.to(`duel:${duelId}`).emit("duel:updated", duel);
        return;
      }

      const { resolved, duel: updated } = await checkActiveRound(duel);
      if (resolved) {
        io.to(`duel:${duelId}`).emit("duel:updated", updated);
        if (updated.status === "completed") {
          clearInterval(interval);
          activePollers.delete(duelId);
        }
      }
    } catch (err) {
      console.error(`Duel poller error for ${duelId}:`, err.message);
    }
  }, POLL_INTERVAL_MS);

  activePollers.set(duelId, interval);
}

function tryMatchmake(io, userId) {
  const me = queue.get(userId);
  if (!me) return;

  for (const [otherId, other] of queue.entries()) {
    if (otherId === userId) continue;
    const overlap = me.rating >= other.minRating && me.rating <= other.maxRating &&
                     other.rating >= me.minRating && other.rating <= me.maxRating;
    if (!overlap) continue;

    queue.delete(userId);
    queue.delete(otherId);

    createMatchmakingDuel(
      { userId, handle: me.handle, rating: me.rating },
      { userId: otherId, handle: other.handle, rating: other.rating }
    ).then((duel) => {
      const duelId = duel._id.toString();
      io.sockets.sockets.get(me.socketId)?.join(`duel:${duelId}`);
      io.sockets.sockets.get(other.socketId)?.join(`duel:${duelId}`);
      io.to(`duel:${duelId}`).emit("duel:matched", duel);
      startPollingDuel(io, duelId);
    }).catch((err) => {
      console.error("Matchmaking duel creation failed:", err.message);
    });

    return;
  }
}

function initDuelSocket(io) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    socket.on("duel:challenge", async ({ opponentHandle, difficultyMin, difficultyMax }) => {
      try {
        if (!socket.user.primaryHandle) {
          return socket.emit("duel:error", "Link your Codeforces handle first");
        }
        const opponent = await User.findOne({ primaryHandle: opponentHandle.toLowerCase().trim() });
        if (!opponent) {
          return socket.emit("duel:error", "That handle hasn't linked an account on CP Insights");
        }

        const [challengerProfile, opponentProfile] = await Promise.all([
          CFProfile.findOne({ handle: socket.user.primaryHandle }),
          CFProfile.findOne({ handle: opponent.primaryHandle }),
        ]);

        const duel = await createChallenge({
          challengerUser: socket.user._id,
          challengerHandle: socket.user.primaryHandle,
          challengerRating: challengerProfile?.summary?.currentRating || null,
          opponentUser: opponent._id,
          opponentHandle: opponent.primaryHandle,
          opponentRating: opponentProfile?.summary?.currentRating || null,
          difficultyMin: difficultyMin || 1200,
          difficultyMax: difficultyMax || 1600,
        });

        socket.join(`duel:${duel._id}`);
        const opponentSocketId = onlineUsers.get(opponent._id.toString());
        if (opponentSocketId) {
          io.sockets.sockets.get(opponentSocketId)?.join(`duel:${duel._id}`);
          io.to(opponentSocketId).emit("duel:challenge-received", duel);
        }
        socket.emit("duel:challenge-sent", duel);
      } catch (err) {
        console.error("duel:challenge error:", err.message);
        socket.emit("duel:error", "Could not send challenge");
      }
    });

    socket.on("duel:accept", async ({ duelId }) => {
      try {
        const duel = await Duel.findById(duelId);
        if (!duel || duel.status !== "pending") {
          return socket.emit("duel:error", "This challenge is no longer available");
        }
        const updated = await acceptChallenge(duel);
        socket.join(`duel:${duelId}`);
        io.to(`duel:${duelId}`).emit("duel:started", updated);
        startPollingDuel(io, duelId);
      } catch (err) {
        console.error("duel:accept error:", err.message);
        socket.emit("duel:error", "Could not accept challenge");
      }
    });

    socket.on("duel:decline", async ({ duelId }) => {
      try {
        const duel = await Duel.findById(duelId);
        if (!duel) return;
        duel.status = "declined";
        await duel.save();
        io.to(`duel:${duelId}`).emit("duel:declined", duel);
      } catch (err) {
        console.error("duel:decline error:", err.message);
      }
    });

    socket.on("duel:queue-join", async ({ minRating, maxRating }) => {
      if (!socket.user.primaryHandle) {
        return socket.emit("duel:error", "Link your Codeforces handle first");
      }
      // Rating isn't stored on User - pull it from the CFProfile cache
      // (populated whenever this handle's profile page has been loaded)
      // so matchmaking uses their real current rating, not a guess.
      const profile = await CFProfile.findOne({ handle: socket.user.primaryHandle });
      const rating = profile?.summary?.currentRating || 1200;

      queue.set(userId, {
        socketId: socket.id,
        handle: socket.user.primaryHandle,
        rating,
        minRating: minRating || 800,
        maxRating: maxRating || 3500,
        joinedAt: Date.now(),
      });
      socket.emit("duel:queue-joined");
      tryMatchmake(io, userId);
    });

    socket.on("duel:queue-leave", () => {
      queue.delete(userId);
      socket.emit("duel:queue-left");
    });

    socket.on("duel:forfeit-round", async ({ duelId }) => {
      try {
        const duel = await Duel.findById(duelId);
        if (!duel) return socket.emit("duel:error", "Duel not found");
        if (duel.status !== "active") {
          return socket.emit("duel:error", "This duel isn't active");
        }

        // Never trust the client to only call this on its own match -
        // confirm the requesting user is actually one of the two players
        // before touching anything, same check forfeit-match uses below.
        const me = duel.players.find((p) => p.user.toString() === userId);
        if (!me) return socket.emit("duel:error", "You're not a player in this duel");

        const updated = await forfeitRound(duel, me.handle);
        io.to(`duel:${duelId}`).emit("duel:updated", updated);
        if (updated.status === "completed") {
          const poller = activePollers.get(duelId);
          if (poller) {
            clearInterval(poller);
            activePollers.delete(duelId);
          }
        }
      } catch (err) {
        console.error("duel:forfeit-round error:", err.message);
        socket.emit("duel:error", err.message || "Could not forfeit this round");
      }
    });

    socket.on("duel:forfeit-match", async ({ duelId }) => {
      try {
        const duel = await Duel.findById(duelId);
        if (!duel) return socket.emit("duel:error", "Duel not found");

        const me = duel.players.find((p) => p.user.toString() === userId);
        if (!me) return socket.emit("duel:error", "You're not a player in this duel");

        const updated = await forfeitMatch(duel, me.handle);
        io.to(`duel:${duelId}`).emit("duel:updated", updated);

        const poller = activePollers.get(duelId);
        if (poller) {
          clearInterval(poller);
          activePollers.delete(duelId);
        }
      } catch (err) {
        console.error("duel:forfeit-match error:", err.message);
        socket.emit("duel:error", err.message || "Could not forfeit this match");
      }
    });

    socket.on("duel:join-room", async ({ duelId }) => {
      const duel = await Duel.findById(duelId);
      if (!duel) return socket.emit("duel:error", "Duel not found");
      socket.join(`duel:${duelId}`);
      socket.emit("duel:updated", duel);
      if (duel.status === "active") startPollingDuel(io, duelId);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      queue.delete(userId);
    });
  });
}

module.exports = { initDuelSocket };
