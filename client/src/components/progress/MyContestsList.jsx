function formatDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MyContestsList({ contests }) {
  if (contests.length === 0) {
    return (
      <p className="dashboard-empty-text">
        No rated contests yet — once you've competed in a rated round, it'll show up here.
      </p>
    );
  }

  return (
    <div className="my-contests-list">
      {contests.map((c) => {
        const positive = c.delta > 0;
        const flat = c.delta === 0;
        return (
          <div key={c.contestId} className="my-contest-row">
            <div className="my-contest-main">
              <span className="my-contest-name">{c.contestName}</span>
              <span className="my-contest-date">{formatDate(c.ratingUpdateTimeSeconds)}</span>
            </div>

            <div className="my-contest-stats">
              <span className="my-contest-rank">Rank {c.rank}</span>
              <span className="my-contest-rating mono">
                {c.oldRating} → {c.newRating}
              </span>
              <span
                className={`my-contest-delta mono ${
                  flat ? "my-contest-delta-flat" : positive ? "my-contest-delta-up" : "my-contest-delta-down"
                }`}
              >
                {flat ? "±0" : positive ? `+${c.delta}` : c.delta}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
