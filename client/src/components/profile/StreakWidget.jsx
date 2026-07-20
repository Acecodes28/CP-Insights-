import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchStreak, updateStreakFilters } from "../../services/profileService";
import LinkHandlePrompt from "./LinkHandlePrompt";

const FILTER_LABELS = {
  min_rating: (f) => `At least one solve ≥ ${f.value} rating`,
  min_count_per_day: (f) => `At least ${f.value} solves per day`,
  distinct_tags_per_week: (f) => `${f.value}+ distinct tags this week`,
  min_count_per_week_above_rating: (f) => `${f.value}+ solves ≥ ${f.rating} rating this week`,
};

const MILESTONE_LABELS = {
  3: "3-day spark",
  7: "One week strong",
  14: "Two-week streak",
  30: "30-day streak",
  50: "50-day streak",
  100: "Century streak",
  200: "200-day streak",
  365: "Full year streak",
};

function FilterBuilder({ filters, onChange }) {
  const [type, setType] = useState("min_rating");
  const [value, setValue] = useState(1400);
  const [rating, setRating] = useState(1400);

  function addFilter() {
    const newFilter = { type, value: Number(value) };
    if (type === "min_count_per_week_above_rating") newFilter.rating = Number(rating);
    onChange([...filters, newFilter]);
  }

  function removeFilter(idx) {
    onChange(filters.filter((_, i) => i !== idx));
  }

  return (
    <div className="streak-filter-builder">
      <div className="streak-filter-list">
        <div className="streak-filter-chip streak-filter-floor">1 solve / day (required)</div>
        {filters.map((f, i) => (
          <div key={i} className="streak-filter-chip">
            {FILTER_LABELS[f.type](f)}
            <button onClick={() => removeFilter(i)} aria-label="Remove filter">×</button>
          </div>
        ))}
      </div>

      <div className="streak-filter-add">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="min_rating">Min rating per day</option>
          <option value="min_count_per_day">Min solves per day</option>
          <option value="distinct_tags_per_week">Distinct tags per week</option>
          <option value="min_count_per_week_above_rating">Solves/week above rating</option>
        </select>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="value"
        />
        {type === "min_count_per_week_above_rating" && (
          <input
            type="number"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="rating"
          />
        )}
        <button onClick={addFilter} className="streak-filter-add-btn">Add</button>
      </div>
    </div>
  );
}

export default function StreakWidget() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [editingFilters, setEditingFilters] = useState(false);
  const [savingFilters, setSavingFilters] = useState(false);

  function load() {
    setState((s) => ({ ...s, loading: true }));
    fetchStreak()
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((err) => setState({ loading: false, error: err.message, data: null }));
  }

  useEffect(() => {
    if (user?.primaryHandle) load();
    else setState({ loading: false, error: "", data: null });
  }, [user?.primaryHandle]);

  async function handleFiltersChange(filters) {
    setSavingFilters(true);
    try {
      await updateStreakFilters(filters);
      load();
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    } finally {
      setSavingFilters(false);
    }
  }

  if (!user?.primaryHandle) {
    return <LinkHandlePrompt onLinked={load} message="Link your Codeforces handle to start a streak." />;
  }

  if (state.loading) {
    return <div className="rec-item rec-item-skeleton" />;
  }

  if (state.error) {
    return <p className="dashboard-empty-text">Couldn't load your streak right now.</p>;
  }

  const { current, longest, filters, newMilestones } = state.data;

  return (
    <div className="streak-widget">
      <div className="streak-hero">
        <span className="streak-flame">🔥</span>
        <div>
          <span className="streak-current">{current}</span>
          <span className="streak-current-label">day streak</span>
        </div>
        <div className="streak-longest">
          Longest: <strong>{longest}</strong>
        </div>
      </div>

      {newMilestones && newMilestones.length > 0 && (
        <div className="streak-milestone-banner">
          🏅 New milestone{newMilestones.length > 1 ? "s" : ""}: {newMilestones.map((m) => MILESTONE_LABELS[m] || `${m} days`).join(", ")}
        </div>
      )}

      <button className="streak-edit-toggle" onClick={() => setEditingFilters((v) => !v)}>
        {editingFilters ? "Done" : "Customize streak rules"}
      </button>

      {editingFilters && (
        <FilterBuilder filters={filters} onChange={handleFiltersChange} />
      )}

      {!editingFilters && filters.length > 0 && (
        <div className="streak-filter-list streak-filter-list-readonly">
          {filters.map((f, i) => (
            <div key={i} className="streak-filter-chip">
              {FILTER_LABELS[f.type](f)}
            </div>
          ))}
        </div>
      )}

      {savingFilters && <p className="dashboard-empty-text">Saving…</p>}
    </div>
  );
}
