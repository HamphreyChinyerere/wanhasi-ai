import { useState } from "react";
import type { FormEvent } from "react";
import {
  Globe2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import {
  loginUser,
  registerUser,
  signInWithGoogle,
} from "./auth";
import "./auth.css";

type AuthScreenProps = {
  onAuthenticated: () => void;
};

function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser(email.trim(), password);
      } else {
        await loginUser(email.trim(), password);
      }

      onAuthenticated();
    } catch {
      setError(
        isRegistering
          ? "Could not create your account. Check your details."
          : "Could not sign in. Check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      onAuthenticated();
    } catch {
      setError("Google sign-in was cancelled or failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img
          src="/brand/wanhasi-logo.svg"
          alt="WaNhasi"
          className="onboarding-logo"
        />

        <span className="eyebrow">WANHASI AI</span>

        <h1>{isRegistering ? "Create your account" : "Welcome back"}</h1>

        <p className="auth-description">
          {isRegistering
            ? "Create your account and get farming guidance built for you."
            : "Continue with your farming assistant."}
        </p>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <Globe2 size={18} />
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email address
            <div className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className="auth-input">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete={
                  isRegistering ? "new-password" : "current-password"
                }
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError("");
          }}
        >
          {isRegistering
            ? "Already have an account? Sign in"
            : "New to WaNhasi? Create an account"}
        </button>
      </section>
    </main>
  );
}

export default AuthScreen;