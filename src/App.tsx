import { useEffect, useState } from "react";
import {
  CloudSun,
  LayoutDashboard,
  MapPin,
  Mic,
  Moon,
  Sprout,
  Sun,
} from "lucide-react";
import "./App.css";
import "./theme.css";
import { connectVoiceAgent } from "./voiceAgent";

type Screen = "home" | "voice" | "weather";

type WeatherResult = {
  current?: {
    temperature_2m: number;
    weather_code: number;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [status, setStatus] = useState("Not connected");
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("");
  const [theme, setTheme] = useState("green");
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  const handleStartVoice = async () => {
    try {
      setScreen("voice");
      setStatus("Connecting...");

      const socket = await connectVoiceAgent((message) => {
        if (message.type === "session.ready") {
          setStatus("Connected to WaNhasi");
        }

        if (message.type === "transcript.user" && message.text) {
          setTranscripts((current) => {
            const line = `You: ${message.text}`;
            return current.at(-1) === line ? current : [...current, line];
          });
        }

        if (message.type === "transcript.agent" && message.text) {
          setTranscripts((current) => {
            const line = `WaNhasi: ${message.text}`;
            return current.at(-1) === line ? current : [...current, line];
          });
        }
      });

      socket.addEventListener("error", () => {
        setStatus("Connection failed");
      });
    } catch (error) {
      setStatus("Connection failed");
      console.error(error);
    }
  };

  const handleCurrentWeather = () => {
    if (!navigator.geolocation) {
      setWeatherStatus("Location is not supported on this device.");
      return;
    }

    setWeatherStatus("Requesting your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          setWeatherStatus("Loading current weather...");

          const response = await fetch(
            `http://localhost:3001/api/weather/current?latitude=${latitude}&longitude=${longitude}`,
          );

          if (!response.ok) {
            throw new Error("Weather request failed");
          }

          const data = (await response.json()) as WeatherResult;
          setWeather(data);
          setWeatherStatus("Weather updated");
        } catch (error) {
          setWeatherStatus("Could not load weather.");
          console.error(error);
        }
      },
      () => {
        setWeatherStatus("Location permission was denied.");
      },
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sprout size={20} />
          </div>
          <div>
            <strong>WaNhasi</strong>
            <span>Farming assistant</span>
          </div>
        </div>

        <select
          className="theme-select"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          aria-label="Choose color theme"
        >
          <option value="green">Green + Gold</option>
          <option value="blue">Blue</option>
          <option value="violet">Violet</option>
          <option value="red">Red</option>
        </select>

        <button
          className="theme-button"
          onClick={() => setMode(mode === "dark" ? "light" : "dark")}
          aria-label="Toggle light and dark mode"
        >
          {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="screen-content">
        {screen === "home" && (
          <>
            <section className="hero-card">
              <span className="eyebrow">YOUR FARMING COMPANION</span>
              <h1>Grow smarter with WaNhasi.</h1>
              <p>Ask questions, understand your weather, and make better farming decisions.</p>
              <button className="primary-button" onClick={handleStartVoice}>
                <Mic size={18} />
                Start a conversation
              </button>
            </section>

            <div className="section-heading">
              <h2>Quick actions</h2>
              <span>Today</span>
            </div>

            <section className="action-grid">
              <button className="action-card" onClick={() => setScreen("weather")}>
                <div className="icon-badge gold">
                  <CloudSun size={22} />
                </div>
                <strong>Farm weather</strong>
                <span>Check conditions</span>
              </button>

              <button className="action-card" onClick={handleStartVoice}>
                <div className="icon-badge green">
                  <Mic size={22} />
                </div>
                <strong>Ask WaNhasi</strong>
                <span>Get farming advice</span>
              </button>
            </section>
          </>
        )}

        {screen === "voice" && (
          <section className="voice-screen">
            <span className="eyebrow">VOICE ASSISTANT</span>
            <h1>How can I help?</h1>

            <button className="voice-orb" onClick={handleStartVoice}>
              <Mic size={42} />
            </button>

            <p className="voice-status">{status}</p>

            <div className="transcript-card">
              {transcripts.length === 0 ? (
                <span>Your conversation will appear here.</span>
              ) : (
                transcripts.map((transcript, index) => (
                  <p key={`${transcript}-${index}`}>{transcript}</p>
                ))
              )}
            </div>
          </section>
        )}

        {screen === "weather" && (
          <section>
            <span className="eyebrow">LOCAL WEATHER</span>
            <h1>Weather for your farm</h1>

            <button className="location-button" onClick={handleCurrentWeather}>
              <MapPin size={18} />
              Use my current location
            </button>

            <p className="weather-status">{weatherStatus}</p>

            {weather?.current && weather.daily && (
              <div className="weather-card">
                <CloudSun size={42} />
                <div>
                  <span>Current temperature</span>
                  <strong>{weather.current.temperature_2m}°C</strong>
                </div>
                <div className="weather-details">
                  <span>High {weather.daily.temperature_2m_max[0]}°C</span>
                  <span>Low {weather.daily.temperature_2m_min[0]}°C</span>
                  <span>
                    Rain {weather.daily.precipitation_probability_max[0]}%
                  </span>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={screen === "home" ? "nav-item active" : "nav-item"}
          onClick={() => setScreen("home")}
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>

        <button
          className={screen === "voice" ? "nav-item active" : "nav-item"}
          onClick={() => setScreen("voice")}
        >
          <Mic size={20} />
          <span>Speak</span>
        </button>

        <button
          className={screen === "weather" ? "nav-item active" : "nav-item"}
          onClick={() => setScreen("weather")}
        >
          <CloudSun size={20} />
          <span>Weather</span>
        </button>
      </nav>
    </div>
  );
}

export default App;