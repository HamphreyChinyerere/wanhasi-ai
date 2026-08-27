import { useState } from "react";
import { LockKeyhole, Mail, Sprout } from "lucide-react";
import { loginUser, registerUser } from "./auth";

type AuthScreenProps = {
  onAuthenticated: () => void;
};

function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser(email, password);
      } else {
        await loginUser(email, password);
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

  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          border: "1px solid #294936",
          borderRadius: "24px",
          background: "#10291b",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-grid",
              padding: "14px",
              borderRadius: "16px",
              background: "#176b3a",
              color: "#d4a72c",
            }}
          >
            <Sprout size={28} />
          </div>

          <h1>{isRegistering ? "Create your account" : "Welcome back"}</h1>

          <p style={{ color: "#aebdaf" }}>
            {isRegistering
              ? "Start your journey with WaNhasi."
              : "Continue with your farming assistant."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginTop: "22px" }}>
            Email
            <div className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </label>

          <label style={{ display: "block", marginTop: "16px" }}>
            Password
            <div className="auth-input">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
          </label>

          {error && (
            <p style={{ color: "#f28b82", lineHeight: 1.4 }}>{error}</p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
            style={{ width: "100%", marginTop: "24px" }}
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
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError("");
          }}
          style={{
            width: "100%",
            marginTop: "16px",
            border: 0,
            background: "transparent",
            color: "#d4a72c",
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