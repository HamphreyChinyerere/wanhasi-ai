import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

type OnboardingScreenProps = {
  userId: string;
  onComplete: () => void;
};

function OnboardingScreen({
  userId,
  onComplete,
}: OnboardingScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [farmingFocus, setFarmingFocus] = useState("");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          displayName,
          location,
          farmingFocus,
          language,
          onboardingComplete: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      onComplete();
    } catch (submitError) {
      console.error(submitError);
      setError("Could not save your details. Please try again.");
    } finally {
      setLoading(false);
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

        <span className="eyebrow">WELCOME TO WANHASI</span>
        <h1>Tell us about your farm</h1>
        <p>
          This helps WaNhasi provide more useful and relevant advice.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Your name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              required
            />
          </label>

          <label>
            Farming area
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="For example, Harare"
              required
            />
          </label>

          <label>
            What do you farm?
            <input
              value={farmingFocus}
              onChange={(event) => setFarmingFocus(event.target.value)}
              placeholder="Crops, livestock, or both"
              required
            />
          </label>

          <label>
            Preferred language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option>English</option>
              <option>Shona</option>
              <option>Ndebele</option>
            </select>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default OnboardingScreen;