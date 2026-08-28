import { useState } from "react";
import { FARM_LANGUAGES, type FarmLanguage, type FarmProfile } from "./farmAssistant";
import { saveFarmMemory } from "./farmMemory";

type AccountSettingsScreenProps = {
  userId: string;
  email: string;
  uid: string;
  mode: "dark" | "light";
  initialProfile?: FarmProfile;
  onToggleMode: () => void;
  onSwitchProfile: () => void;
  onSignOut: () => void;
  onBack: () => void;
};

function AccountSettingsScreen({
  userId,
  email,
  uid,
  mode,
  initialProfile,
  onToggleMode,
  onSwitchProfile,
  onSignOut,
  onBack,
}: AccountSettingsScreenProps) {
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [location, setLocation] = useState(
    initialProfile?.location ?? "",
  );
  const [crops, setCrops] = useState(
    initialProfile?.crops?.join(", ") ?? "",
  );
  const [soilType, setSoilType] = useState(
    initialProfile?.soilType ?? "",
  );
  const [language, setLanguage] = useState<FarmLanguage>(
    initialProfile?.language ?? "English",
  );
  const [saveStatus, setSaveStatus] = useState("");

  const handleSaveFarmDetails = async () => {
    setSaveStatus("Saving...");

    try {
      await saveFarmMemory(userId, {
        name: name.trim(),
        location: location.trim(),
        crops: crops
          .split(",")
          .map((crop) => crop.trim())
          .filter(Boolean),
        soilType: soilType.trim(),
        language,
      });

      setSaveStatus("Farm details saved");
    } catch (error) {
      console.error("Could not save farm details:", error);
      setSaveStatus("Could not save farm details");
    }
  };

  return (
    <section className="account-settings-screen">
      <span className="eyebrow">ACCOUNT SETTINGS</span>
      <h1>Settings</h1>

      <div className="settings-group">
        <h2>Account</h2>

        <div className="settings-row">
          <strong>Email address</strong>
          <span>{email}</span>
        </div>

        <div className="settings-row">
          <strong>User ID</strong>
          <code>{uid}</code>
        </div>
      </div>

      <div className="settings-group">
        <h2>Appearance</h2>

        <div className="settings-row">
          <div>
            <strong>Theme</strong>
            <span>
              Current theme: {mode === "dark" ? "Dark" : "Light"}
            </span>
          </div>

          <button
            type="button"
            className="settings-action-button"
            onClick={onToggleMode}
          >
            Switch to {mode === "dark" ? "light" : "dark"}
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h2>Farm profile</h2>

        <label className="settings-field">
          <span>Farmer name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
        </label>

        <label className="settings-field">
          <span>Farm location</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Town or farming area"
          />
        </label>

        <label className="settings-field">
          <span>Crops</span>
          <input
            value={crops}
            onChange={(event) => setCrops(event.target.value)}
            placeholder="Maize, tobacco, tomatoes"
          />
        </label>

        <label className="settings-field">
          <span>Soil type</span>
          <input
            value={soilType}
            onChange={(event) => setSoilType(event.target.value)}
            placeholder="Clay, sandy, loam"
          />
        </label>

        <label className="settings-field">
          <span>Preferred language</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as FarmLanguage)
            }
          >
            {FARM_LANGUAGES.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="settings-action-button"
          onClick={() => void handleSaveFarmDetails()}
        >
          Save farm details
        </button>

        {saveStatus && <span className="settings-status">{saveStatus}</span>}
      </div>

      <div className="settings-group">
        <h2>Profile</h2>

        <div className="settings-actions">
          <button
            type="button"
            className="settings-action-button"
            onClick={onSwitchProfile}
          >
            Switch profile
          </button>

          <button
            type="button"
            className="settings-danger-button"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>

      <button
        type="button"
        className="settings-back-button"
        onClick={onBack}
      >
        Back to chat
      </button>
    </section>
  );
}

export default AccountSettingsScreen;