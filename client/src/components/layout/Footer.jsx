import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell site-footer-inner">
        <div className="footer-brand-col">
          <Link to="/" className="footer-brand">
            <Logo size={22} />
            <span>CP Insights</span>
          </Link>
          <p>
            An independent analytics dashboard for Codeforces — rating history, difficulty
            spread, and tag strengths, made easy to actually see.
          </p>
        </div>

        <nav className="footer-link-col" aria-label="Product">
          <h4>Product</h4>
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/#faq">FAQ</a>
        </nav>

        <nav className="footer-link-col" aria-label="Account">
          <h4>Account</h4>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </nav>

        <nav className="footer-link-col" aria-label="References">
          <h4>References</h4>
          <a href="https://codeforces.com" target="_blank" rel="noopener noreferrer">
            Codeforces
          </a>
          <a href="https://codeforces.com/apiHelp" target="_blank" rel="noopener noreferrer">
            API docs
          </a>
        </nav>
      </div>

      <hr className="gold-rule" />

      <div className="page-shell site-footer-bottom">
        <p>Built independently. Not affiliated with Codeforces.</p>
        <p>&copy; {new Date().getFullYear()} CP Insights</p>
      </div>
    </footer>
  );
}
