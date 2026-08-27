import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  CloudSun,
  Clock3,
  LayoutDashboard,
  Menu,
  Mic,
  Moon,
  Plug,
  Plus,
  Settings,
  Sun,
  UserCircle,
} from "lucide-react";
import AuthScreen from "./AuthScreen";
import OnboardingScreen from "./OnboardingScreen";
import { logoutUser, watchAuthState } from "./auth";
import { db } from "./firebase";
import { connectVoiceAgent } from "./voiceAgent";
import "./App.css";
import "./theme.css";

type Screen = "home" | "voice" | "weather";

type WeatherResult = {
  current?: {
    temperature_2m: number;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [status, setStatus] = useState("Not connected");
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("");

  useEffect(() => {
    return watchAuthState(async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setOnboardingComplete(false);
        setAuthLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const profile = await getDoc(doc(db, "users", currentUser.uid));

        setOnboardingComplete(
          profile.exists() &&
            profile.data().onboardingComplete === true,
        );
      } catch (error) {
        console.error("Could not load user profile:", error);
        setOnboardingComplete(false);
      } finally {
        setAuthLoading(false);
        setProfileLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  if (authLoading || profileLoading) {
    return <main>Loading WaNhasi...</main>;
  }

  if (!user) {
    return <AuthScreen onAuthenticated={() => undefined} />;
  }

  if (!onboardingComplete) {
    return (
      <OnboardingScreen
        userId={user.uid}
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

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

  const handleNewChat = () => {
    setTranscripts([]);
    setStatus("Not connected");
    setScreen("home");
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="app-shell">
            <aside className={sidebarOpen ? "sidebar" : "sidebar collapsed"}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img
              src="/brand/wanhasi-logo.svg"
              alt="WaNhasi"
              className="wanhasi-logo"
            />
          </div>

          <div className="sidebar-controls">
            <button
              className="icon-button"
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              aria-label="Toggle light and dark mode"
            >
              {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              className="icon-button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        <button className="new-chat-button" onClick={handleNewChat}>
          <Plus size={18} />
          <span>New chat</span>
        </button>

        <nav className="sidebar-nav">
          <button>
            <Clock3 size={18} />
            <span>Search chats</span>
          </button>

          <button>
            <Plug size={18} />
            <span>Plugins</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <nav className="sidebar-footer-links">
          <button>
            <Plus size={17} />
            <span>See plans and pricing</span>
          </button>

          <button>
            <Settings size={17} />
            <span>Settings</span>
          </button>

          <button>
            <UserCircle size={17} />
            <span>Help</span>
          </button>
        </nav>

        <button className="profile-button" onClick={handleLogout}>
          <UserCircle size={20} />

          <span>
            <strong>{user.email ?? "Your profile"}</strong>
            <small>Sign out</small>
          </span>
        </button>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>
            )}
          </div>
        </header>

        <main className="screen-content">
          {screen === "home" && (
            <section className="empty-dashboard" aria-label="New chat">
              <div className="chat-composer">
                <span>Message WaNhasi...</span>

                <button
                  className="composer-mic"
                  onClick={handleStartVoice}
                  aria-label="Start voice chat"
                >
                  <Mic size={20} />
                </button>
              </div>
            </section>
          )}

          {screen === "voice" && (
            <section className="voice-screen">
              <span className="eyebrow">VOICE ASSISTANT</span>
              <h1>Talk to WaNhasi</h1>

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

              <button
                className="location-button"
                onClick={handleCurrentWeather}
              >
                <CloudSun size={18} />
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
                      Rain{" "}
                      {weather.daily.precipitation_probability_max[0]}%
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
            <LayoutDashboard size={19} />
            <span>Home</span>
          </button>

          <button
            className={screen === "voice" ? "nav-item active" : "nav-item"}
            onClick={() => setScreen("voice")}
          >
            <Mic size={19} />
            <span>Speak</span>
          </button>

          <button
            className={screen === "weather" ? "nav-item active" : "nav-item"}
            onClick={() => setScreen("weather")}
          >
            <CloudSun size={19} />
            <span>Weather</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;