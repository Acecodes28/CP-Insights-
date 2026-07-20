import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

// Shown inline wherever a feature (streaks, groups) needs a primaryHandle
// but the user hasn't linked one yet. Keeps the ask lightweight - one
// input, inline, no separate settings page required to get started.
export default function LinkHandlePrompt({ onLinked, message }) {
  const { linkHandle } = useAuth();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    try {
      const handle = await linkHandle(value.trim());
      onLinked?.(handle);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="link-handle-prompt">
      <p>{message || "Link your Codeforces handle to use this feature."}</p>
      <form onSubmit={handleSubmit} className="link-handle-form">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your Codeforces handle"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? "Linking…" : "Link handle"}
        </button>
      </form>
      {error && <p className="link-handle-error">{error}</p>}
    </div>
  );
}
