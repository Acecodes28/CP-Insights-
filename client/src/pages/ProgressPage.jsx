import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchProblemLogs, fetchMyContests } from "../services/problemLogService";
import LinkHandlePrompt from "../components/profile/LinkHandlePrompt";
import ProblemLogTable from "../components/progress/ProblemLogTable";
import MyContestsList from "../components/progress/MyContestsList";
import "../styles/dashboard.css";
import "../styles/progress.css";

const TABS = [
  { key: "problems", label: "Problems" },
  { key: "contests", label: "Contests" },
];

export default function ProgressPage() {
  const { user, linkHandle } = useAuth();
  const [tab, setTab] = useState("problems");

  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [contests, setContests] = useState([]);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [contestsError, setContestsError] = useState("");

  function loadProblems() {
    setProblemsLoading(true);
    setLoadError("");
    fetchProblemLogs()
      .then((res) => {
        setProblems(res.problems);
        setSyncError(res.syncError);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setProblemsLoading(false));
  }

  function loadContests() {
    setContestsLoading(true);
    setContestsError("");
    fetchMyContests()
      .then((res) => setContests(res.contests))
      .catch((err) => setContestsError(err.message))
      .finally(() => setContestsLoading(false));
  }

  useEffect(() => {
    if (!user?.primaryHandle) {
      setProblemsLoading(false);
      setContestsLoading(false);
      return;
    }
    loadProblems();
    loadContests();
  }, [user?.primaryHandle]);

  function handleProblemUpdated(updated) {
    setProblems((prev) => prev.map((p) => (p.problemKey === updated.problemKey ? updated : p)));
  }

  const solvedCount = problems.filter((p) => p.status === "solved").length;
  const starredCount = problems.filter((p) => p.starred).length;

  if (!user?.primaryHandle) {
    return (
      <div className="page-shell progress-page">
        <h1>My Progress</h1>
        <div className="card progress-link-card">
          <LinkHandlePrompt
            onLinked={linkHandle}
            message="Link your Codeforces handle to track your solved problems, notes, and contest history."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell progress-page">
      <div className="progress-header">
        <div>
          <h1>My Progress</h1>
          <p className="dashboard-subtitle">
            Everything you've solved or attempted on Codeforces as {user.primaryHandle}, in one place.
          </p>
        </div>

        {!problemsLoading && problems.length > 0 && (
          <div className="progress-summary-pills">
            <span className="progress-summary-pill">{solvedCount} solved</span>
            <span className="progress-summary-pill">{problems.length - solvedCount} attempted</span>
            <span className="progress-summary-pill progress-summary-pill-gold">{starredCount} starred</span>
          </div>
        )}
      </div>

      <div className="progress-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`progress-tab ${tab === t.key ? "progress-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="dashboard-panel card progress-panel">
        {tab === "problems" && (
          <>
            {syncError && <p className="progress-sync-warning">{syncError}</p>}
            {problemsLoading && <p className="dashboard-empty-text">Loading your problems…</p>}
            {!problemsLoading && loadError && <p className="dashboard-empty-text">{loadError}</p>}
            {!problemsLoading && !loadError && (
              <ProblemLogTable problems={problems} onProblemUpdated={handleProblemUpdated} />
            )}
          </>
        )}

        {tab === "contests" && (
          <>
            {contestsLoading && <p className="dashboard-empty-text">Loading your contests…</p>}
            {!contestsLoading && contestsError && <p className="dashboard-empty-text">{contestsError}</p>}
            {!contestsLoading && !contestsError && <MyContestsList contests={contests} />}
          </>
        )}
      </section>
    </div>
  );
}
