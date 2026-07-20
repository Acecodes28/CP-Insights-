import SignupForm from "../components/auth/SignupForm";
import "../styles/auth.css";

export default function SignupPage() {
  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <span className="auth-brand mono">CP INSIGHTS</span>
          <h1>Create your account</h1>
          <p>Save handles and revisit your CP journey anytime</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
