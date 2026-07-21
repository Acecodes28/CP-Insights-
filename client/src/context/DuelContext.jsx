import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const DuelContext = createContext(null);

// Derives the socket server URL from the same env var the REST client
// uses, just stripping the "/api" suffix - so this never needs its own
// separate env var and always points at the same backend as everything else.
function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

export function DuelProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [activeDuel, setActiveDuel] = useState(null);
  const [queueStatus, setQueueStatus] = useState("idle"); // idle | queued
  const [duelError, setDuelError] = useState("");

  // Listener registries so multiple components (e.g. a duel list page and
  // the live match screen) can each react to duel:updated without
  // stomping on each other's handlers.
  const listenersRef = useRef(new Set());

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const token = localStorage.getItem("cpInsightsToken");
    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("duel:error", (msg) => setDuelError(msg));

    socket.on("duel:challenge-received", (duel) => setIncomingChallenge(duel));
    socket.on("duel:challenge-sent", (duel) => setActiveDuel(duel));
    socket.on("duel:declined", (duel) => {
      setIncomingChallenge((prev) => (prev?._id === duel._id ? null : prev));
      setActiveDuel((prev) => (prev?._id === duel._id ? duel : prev));
    });

    socket.on("duel:matched", (duel) => {
      setQueueStatus("idle");
      setActiveDuel(duel);
    });
    socket.on("duel:started", (duel) => {
      setIncomingChallenge(null);
      setActiveDuel(duel);
    });
    socket.on("duel:updated", (duel) => {
      setActiveDuel(duel);
      listenersRef.current.forEach((fn) => fn(duel));
    });

    socket.on("duel:queue-joined", () => setQueueStatus("queued"));
    socket.on("duel:queue-left", () => setQueueStatus("idle"));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const challenge = useCallback((opponentHandle, difficultyMin, difficultyMax) => {
    setDuelError("");
    socketRef.current?.emit("duel:challenge", { opponentHandle, difficultyMin, difficultyMax });
  }, []);

  const acceptChallenge = useCallback((duelId) => {
    socketRef.current?.emit("duel:accept", { duelId });
  }, []);

  const declineChallenge = useCallback((duelId) => {
    socketRef.current?.emit("duel:decline", { duelId });
    setIncomingChallenge(null);
  }, []);

  const joinQueue = useCallback((minRating, maxRating) => {
    setDuelError("");
    socketRef.current?.emit("duel:queue-join", { minRating, maxRating });
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit("duel:queue-leave");
  }, []);

  const joinDuelRoom = useCallback((duelId) => {
    socketRef.current?.emit("duel:join-room", { duelId });
  }, []);

  const forfeitRound = useCallback((duelId) => {
    setDuelError("");
    socketRef.current?.emit("duel:forfeit-round", { duelId });
  }, []);

  const forfeitMatch = useCallback((duelId) => {
    setDuelError("");
    socketRef.current?.emit("duel:forfeit-match", { duelId });
  }, []);

  // Lets a component subscribe to raw duel:updated events (e.g. to react
  // to a SPECIFIC duel id rather than whatever's currently "active" in
  // context state) without a second socket connection.
  const onDuelUpdate = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const clearActiveDuel = useCallback(() => setActiveDuel(null), []);

  return (
    <DuelContext.Provider
      value={{
        connected,
        incomingChallenge,
        activeDuel,
        queueStatus,
        duelError,
        challenge,
        acceptChallenge,
        declineChallenge,
        joinQueue,
        leaveQueue,
        joinDuelRoom,
        forfeitRound,
        forfeitMatch,
        onDuelUpdate,
        clearActiveDuel,
      }}
    >
      {children}
    </DuelContext.Provider>
  );
}

export function useDuel() {
  const ctx = useContext(DuelContext);
  if (!ctx) throw new Error("useDuel must be used within a DuelProvider");
  return ctx;
}
