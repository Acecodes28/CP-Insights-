import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchMyGroups, fetchPublicGroups, createGroup, joinGroup } from "../services/groupService";
import LinkHandlePrompt from "../components/profile/LinkHandlePrompt";
import "../styles/groups.css";

function CreateGroupForm({ onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("invite-only");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const group = await createGroup({ name, description, visibility });
      onCreated(group);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="group-create-form">
      <input
        type="text"
        placeholder="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
      />
      <input
        type="text"
        placeholder="Short description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={280}
      />
      <div className="group-visibility-toggle">
        <label>
          <input
            type="radio"
            checked={visibility === "invite-only"}
            onChange={() => setVisibility("invite-only")}
          />
          Invite-only
        </label>
        <label>
          <input
            type="radio"
            checked={visibility === "public"}
            onChange={() => setVisibility("public")}
          />
          Public
        </label>
      </div>
      <button type="submit" disabled={loading || !name.trim()}>
        {loading ? "Creating…" : "Create group"}
      </button>
      {error && <p className="link-handle-error">{error}</p>}
    </form>
  );
}

function JoinByCodeForm({ onJoined }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const group = await joinGroup({ joinCode: code.trim() });
      onJoined(group);
      setCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="group-join-form">
      <input
        type="text"
        placeholder="Invite code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" disabled={loading || !code.trim()}>
        {loading ? "Joining…" : "Join"}
      </button>
      {error && <p className="link-handle-error">{error}</p>}
    </form>
  );
}

export default function GroupsPage() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    setLoading(true);
    Promise.all([fetchMyGroups(), fetchPublicGroups()])
      .then(([mine, pub]) => {
        setMyGroups(mine);
        setPublicGroups(pub);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.primaryHandle) loadAll();
    else setLoading(false);
  }, [user?.primaryHandle]);

  if (!user?.primaryHandle) {
    return (
      <div className="page-shell groups-page">
        <h1>Groups</h1>
        <div className="card groups-link-card">
          <LinkHandlePrompt
            onLinked={loadAll}
            message="Link your Codeforces handle to create or join groups."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell groups-page">
      <div className="groups-header">
        <div>
          <h1>Groups</h1>
          <p className="dashboard-subtitle">Track challenges and progress together with people you know.</p>
        </div>
      </div>

      <div className="groups-grid">
        <div className="groups-col-main">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Your groups</h2>
            </div>

            {loading && <p className="dashboard-empty-text">Loading…</p>}

            {!loading && myGroups.length === 0 && (
              <p className="dashboard-empty-text">You haven't joined any groups yet.</p>
            )}

            {!loading && myGroups.length > 0 && (
              <div className="group-card-grid">
                {myGroups.map((g) => (
                  <Link to={`/groups/${g._id}`} key={g._id} className="group-card">
                    <h3>{g.name}</h3>
                    <p>{g.description || "No description"}</p>
                    <div className="group-card-meta">
                      <span>{g.members.length} member{g.members.length !== 1 ? "s" : ""}</span>
                      <span className={`group-visibility-badge group-visibility-${g.visibility}`}>
                        {g.visibility === "public" ? "Public" : "Invite-only"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {!loading && publicGroups.length > 0 && (
            <section className="dashboard-panel card">
              <div className="dashboard-panel-header">
                <h2>Discover public groups</h2>
              </div>
              <div className="group-card-grid">
                {publicGroups.map((g) => (
                  <div key={g._id} className="group-card group-card-discover">
                    <h3>{g.name}</h3>
                    <p>{g.description || "No description"}</p>
                    <div className="group-card-meta">
                      <span>{g.members.length} member{g.members.length !== 1 ? "s" : ""}</span>
                      <button
                        onClick={async () => {
                          await joinGroup({ groupId: g._id });
                          loadAll();
                        }}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="groups-col-side">
          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Create a group</h2>
            </div>
            <CreateGroupForm onCreated={loadAll} />
          </section>

          <section className="dashboard-panel card">
            <div className="dashboard-panel-header">
              <h2>Have an invite code?</h2>
            </div>
            <JoinByCodeForm onJoined={loadAll} />
          </section>
        </div>
      </div>
    </div>
  );
}
