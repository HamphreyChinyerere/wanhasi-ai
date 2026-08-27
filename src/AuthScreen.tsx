import { useState } from "react";
import type { FormEvent } from "react";
import {
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

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.25Z"
      />
      <path
        fill="#34A853"
        d="M12 21.96c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.96Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 14.05a5.86 5.86 0 0 1 0-3.76V7.76H3.3a9.76 9.76 0 0 0 0 8.82l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.26c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.83 3.36 14.63 2.04 12 2.04a9.74 9.74 0 0 0-8.7 5.72l3.24 2.53C7.31 7.98 9.46 6.26 12 6.26Z"
      />
    </svg>
  );
}

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
          <GoogleIcon />
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
            {isRegistering ? (
                <span>
                Already have an account? <strong>Sign in</strong>
                </span>
            ) : (
                <span>
                New to <strong>WaNhasi</strong>? Create an account
                </span>
            )}
            </button>
      </section>
    </main>
  );
}

export default AuthScreen;