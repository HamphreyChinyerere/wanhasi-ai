type AccountSettingsScreenProps = {
  email: string;
  uid: string;
  mode: "dark" | "light";
  onToggleMode: () => void;
  onSwitchProfile: () => void;
  onSignOut: () => void;
  onBack: () => void;
};

function AccountSettingsScreen({
  email,
  uid,
  mode,
  onToggleMode,
  onSwitchProfile,
  onSignOut,
  onBack,
}: AccountSettingsScreenProps) {
  return (
    <section className="account-settings-screen">
      <span className="eyebrow">ACCOUNT SETTINGS</span>
      <h1>Settings</h1>

      <div className="settings-group">
        <h2>Account</h2>

        <div className="settings-row">
          <div>
            <strong>Email address</strong>
            <span>{email}</span>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <strong>User ID</strong>
            <code>{uid}</code>
          </div>
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