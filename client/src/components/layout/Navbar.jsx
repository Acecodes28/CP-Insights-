import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";
import ConfirmDialog from "./ConfirmDialog";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
    setConfirmingLogout(false);
  }

  return (
    <nav className="navbar">
      <div className="page-shell navbar-inner">
        <Link to="/" className="navbar-brand">
          <Logo size={26} />
          <span>CP Insights</span>
        </Link>

        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/dashboard" className="navbar-link">
                Dashboard
              </Link>
              <Link to="/progress" className="navbar-link">
                My Progress
              </Link>
              <Link to="/groups" className="navbar-link">
                Groups
              </Link>
              <Link to="/duels" className="navbar-link">
                Duels
              </Link>
              <span className="navbar-user">{user.name}</span>
              <button className="navbar-logout" onClick={() => setConfirmingLogout(true)}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">
                Log in
              </Link>
              <Link to="/signup" className="navbar-cta">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingLogout}
        title="Log out?"
        message="You'll need to sign back in to access your dashboard, streaks, and duels."
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </nav>
  );
}
