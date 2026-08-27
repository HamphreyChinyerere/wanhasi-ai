type HelpScreenProps = {
  onBack: () => void;
};

function HelpScreen({ onBack }: HelpScreenProps) {
  return (
    <section className="help-screen">
      <span className="eyebrow">HELP CENTER</span>
      <h1>How can we help?</h1>

      <div className="help-card">
        <h2>Using WaNhasi</h2>
        <p>
          Start a voice chat and ask questions about farming, weather,
          crops, and your location.
        </p>
      </div>

      <div className="help-card">
        <h2>Weather access</h2>
        <p>
          Allow location access when prompted to receive weather for
          your current location.
        </p>
      </div>

      <div className="help-card">
        <h2>Need more help?</h2>
        <p>
          Contact the WaNhasi support team if something is not working.
        </p>
        <a href="mailto:support@wanhasi.ai">Contact support</a>
      </div>

      <button className="settings-theme-button" onClick={onBack}>
        Back to chat
      </button>
    </section>
  );
}

export default HelpScreen;