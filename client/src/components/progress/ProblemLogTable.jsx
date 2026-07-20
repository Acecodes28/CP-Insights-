import { useMemo, useState } from "react";
import { updateProblemLog } from "../../services/problemLogService";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "solved", label: "Solved" },
  { key: "attempted", label: "Attempted" },
  { key: "starred", label: "Starred" },
];

function problemUrl(problem) {
  // CF problem URLs need a contest ID - problems without one (e.g. gym/
  // problemset-only entries) don't have a reliable direct link, so we
  // just don't render a link for those rather than guessing a bad URL.
  if (!problem.contestId) return null;
  return `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;
}

function NoteEditor({ problem, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(problem.note || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProblemLog(problem.problemKey, { note: value });
      onSaved(updated);
      setEditing(false);
    } catch {
      // Swallow - the textarea stays open with the unsaved value so the
      // user doesn't lose what they typed and can just retry Save.
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button className="problem-note-trigger" onClick={() => setEditing(true)}>
        {problem.note ? (
          <span className="problem-note-preview">{problem.note}</span>
        ) : (
          <span className="problem-note-placeholder">+ Add note</span>
        )}
      </button>
    );
  }

  return (
    <div className="problem-note-editor">
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={5000}
        rows={3}
        placeholder="What tripped you up, the trick, revisit later, etc."
      />
      <div className="problem-note-actions">
        <button
          className="problem-note-cancel"
          onClick={() => {
            setValue(problem.note || "");
            setEditing(false);
          }}
          disabled={saving}
        >
          Cancel
        </button>
        <button className="problem-note-save" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function ProblemLogTable({ problems, onProblemUpdated }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");

  const allTags = useMemo(() => {
    const set = new Set();
    for (const p of problems) {
      for (const t of p.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [problems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter((p) => {
      if (statusFilter === "solved" && p.status !== "solved") return false;
      if (statusFilter === "attempted" && p.status !== "attempted") return false;
      if (statusFilter === "starred" && !p.starred) return false;
      if (tagFilter && !p.tags.includes(tagFilter)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.problemKey.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [problems, search, statusFilter, tagFilter]);

  async function toggleStar(problem) {
    // Optimistic update so starring feels instant; the parent's state
    // update via onProblemUpdated is what actually persists the change.
    onProblemUpdated({ ...problem, starred: !problem.starred });
    try {
      const updated = await updateProblemLog(problem.problemKey, { starred: !problem.starred });
      onProblemUpdated(updated);
    } catch {
      // Roll back on failure
      onProblemUpdated(problem);
    }
  }

  if (problems.length === 0) {
    return (
      <p className="dashboard-empty-text">
        No problems synced yet — solve or attempt something on Codeforces and refresh this page.
      </p>
    );
  }

  return (
    <div className="problem-log">
      <div className="problem-log-controls">
        <input
          type="text"
          className="problem-log-search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="problem-log-status-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              className={`problem-log-filter-chip ${statusFilter === f.key ? "problem-log-filter-chip-active" : ""}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <select className="problem-log-tag-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="problem-log-count">
        {filtered.length} of {problems.length} problem{problems.length !== 1 ? "s" : ""}
      </p>

      <div className="problem-log-table">
        <div className="problem-log-row problem-log-row-header">
          <span className="problem-log-col-star" />
          <span className="problem-log-col-name">Problem</span>
          <span className="problem-log-col-rating">Rating</span>
          <span className="problem-log-col-status">Status</span>
          <span className="problem-log-col-note">Note</span>
        </div>

        {filtered.map((p) => {
          const url = problemUrl(p);
          return (
            <div key={p.problemKey} className="problem-log-row">
              <button
                className={`problem-log-star ${p.starred ? "problem-log-star-active" : ""}`}
                onClick={() => toggleStar(p)}
                aria-label={p.starred ? "Unstar" : "Star"}
                title={p.starred ? "Unstar" : "Star"}
              >
                {p.starred ? "★" : "☆"}
              </button>

              <div className="problem-log-col-name">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="problem-log-name-link">
                    {p.name || p.problemKey}
                  </a>
                ) : (
                  <span>{p.name || p.problemKey}</span>
                )}
                {p.tags.length > 0 && (
                  <div className="problem-log-tags">
                    {p.tags.map((t) => (
                      <span key={t} className="problem-log-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span className="problem-log-col-rating mono">{p.rating || "—"}</span>

              <span className={`problem-log-status-badge problem-log-status-${p.status}`}>
                {p.status === "solved" ? "Solved" : "Attempted"}
              </span>

              <div className="problem-log-col-note">
                <NoteEditor problem={p} onSaved={onProblemUpdated} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
