import LoginForm from "../components/auth/LoginForm";
import "../styles/auth.css";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="auth-brand mono">CP INSIGHTS</span>
          <h1>Welcome back</h1>
          <p>Log in to see your saved handles</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
