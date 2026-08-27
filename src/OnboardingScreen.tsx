import { useState } from "react";
import type { FormEvent } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./auth.css";

type OnboardingScreenProps = {
  userId: string;
  onComplete: () => void;
};

function OnboardingScreen({
  userId,
  onComplete,
}: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [farmingFocus, setFarmingFocus] = useState("");
  const [language, setLanguage] = useState("English");
  const [units, setUnits] = useState("Celsius");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    setError("");

    if (step === 1 && !displayName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (step === 2 && !location.trim()) {
      setError("Please enter your farming area.");
      return;
    }

    setStep((current) => Math.min(current + 1, 3));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!farmingFocus.trim()) {
      setError("Please tell us what you farm.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          displayName: displayName.trim(),
          location: location.trim(),
          farmingFocus: farmingFocus.trim(),
          language,
          units,
          onboardingComplete: true,
          createdAt: serverTimestamp(),
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
      <section className="auth-card onboarding-card">
        <img
          src="/brand/wanhasi-logo.svg"
          alt="WaNhasi"
          className="onboarding-logo"
        />

        <div className="onboarding-progress">
          <span className={step >= 1 ? "active" : ""}>1</span>
          <span className={step >= 2 ? "active" : ""}>2</span>
          <span className={step >= 3 ? "active" : ""}>3</span>
        </div>

        {step === 1 && (
          <>
            <span className="eyebrow">LET’S GET STARTED</span>
            <h1>Tell us about you</h1>
            <p className="auth-description">
              WaNhasi will use this to make your experience personal.
            </p>

            <label>
              Your name
              <input
                className="form-control"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                autoFocus
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <span className="eyebrow">YOUR FARM</span>
            <h1>Where do you farm?</h1>
            <p className="auth-description">
              This helps us provide relevant local advice and weather.
            </p>

            <label>
              Farming area
              <input
                className="form-control"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="For example, Harare"
                autoFocus
              />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <span className="eyebrow">YOUR PREFERENCES</span>
            <h1>Personalise WaNhasi</h1>
            <p className="auth-description">
              You can change these preferences later.
            </p>

            <label>
              What do you farm?
              <input
                className="form-control"
                value={farmingFocus}
                onChange={(event) => setFarmingFocus(event.target.value)}
                placeholder="Crops, livestock, or both"
                autoFocus
              />
            </label>

            <label>
              Preferred language
              <select
                className="form-control"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option>English</option>
                <option>Shona</option>
                <option>Ndebele</option>
              </select>
            </label>

            <label>
              Temperature units
              <select
                className="form-control"
                value={units}
                onChange={(event) => setUnits(event.target.value)}
              >
                <option>Celsius</option>
                <option>Fahrenheit</option>
              </select>
            </label>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="onboarding-actions">
          {step > 1 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setStep((current) => current - 1)}
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="auth-submit"
              onClick={handleNext}
            >
              Continue
            </button>
          ) : (
            <form onSubmit={handleSubmit}>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Saving..." : "Finish setup"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default OnboardingScreen;