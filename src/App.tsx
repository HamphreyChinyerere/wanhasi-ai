import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  CloudSun,
  Menu,
  Mic,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Search,
  Settings,
  Trash2,
  UserCircle,
} from "lucide-react";
import AuthScreen from "./AuthScreen";
import HelpScreen from "./HelpScreen";
import OnboardingScreen from "./OnboardingScreen";
import ProfileMenu from "./ProfileMenu";
import {
  createChat,
  listRecentChats,
  removeChat,
  renameChat,
  saveChatMessage,
  toggleChatPin,
  type ChatRecord,
} from "./chatStore";
import { logoutUser, watchAuthState } from "./auth";
import { db } from "./firebase";
import { connectVoiceAgent } from "./voiceAgent";
import "./App.css";
import "./theme.css";

type Screen = "home" | "voice" | "weather" | "settings" | "help";

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
  const [mode, setMode] = useState<"dark" | "light">(() => {
    return localStorage.getItem("wanhasi-mode") === "light"
      ? "light"
      : "dark";
  });

  const [status, setStatus] = useState("Not connected");
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("");

  const [recentChats, setRecentChats] = useState<ChatRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [openChatMenu, setOpenChatMenu] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const activeChatIdRef = useRef<string | null>(null);

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
    localStorage.setItem("wanhasi-mode", mode);
  }, [mode]);

  useEffect(() => {
    if (!user) return;

    void listRecentChats(user.uid)
      .then(setRecentChats)
      .catch((error) => {
        console.error("Could not load recent chats:", error);
      });
  }, [user]);

  const filteredChats = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) return recentChats;

    return recentChats.filter((chat) =>
      chat.title.toLowerCase().includes(search),
    );
  }, [recentChats, searchText]);

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

  const handleNewChat = () => {
    setTranscripts([]);
    setStatus("Not connected");
    setWeather(null);
    setWeatherStatus("");
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setScreen("home");
  };

  const handleOpenChat = (chat: ChatRecord) => {
    activeChatIdRef.current = chat.id;
    setActiveChatId(chat.id);

    setTranscripts(
      (chat.messages ?? []).map((message) => {
        const speaker = message.role === "user" ? "You" : "WaNhasi";
        return `${speaker}: ${message.text}`;
      }),
    );

    setStatus("Chat loaded");
    setScreen("voice");
    setOpenChatMenu(null);
  };

  const handleStartVoice = async () => {
    try {
      setScreen("voice");
      setStatus("Connecting...");

      const socket = await connectVoiceAgent((message) => {
        if (message.type === "session.ready") {
          setStatus("Connected to WaNhasi");
        }

        if (message.type === "transcript.user" && message.text) {
          const text = message.text.trim();
          const line = `You: ${text}`;

          setTranscripts((current) =>
            current.at(-1) === line ? current : [...current, line],
          );

          void (async () => {
            let chatId = activeChatIdRef.current;

            if (!chatId) {
              const title = text
                .split(/\s+/)
                .slice(0, 7)
                .join(" ");

              chatId = await createChat(user.uid, title);
              activeChatIdRef.current = chatId;
              setActiveChatId(chatId);

              setRecentChats((current) => [
                {
                  id: chatId as string,
                  title,
                  messages: [],
                },
                ...current,
              ]);
            }

            await saveChatMessage(user.uid, chatId, {
              role: "user",
              text,
            });
          })().catch((error) => {
            console.error("Could not save user message:", error);
          });
        }

        if (message.type === "transcript.agent" && message.text) {
          const text = message.text.trim();
          const line = `WaNhasi: ${text}`;

          setTranscripts((current) =>
            current.at(-1) === line ? current : [...current, line],
          );

          const chatId = activeChatIdRef.current;

          if (chatId) {
            void saveChatMessage(user.uid, chatId, {
              role: "assistant",
              text,
            }).catch((error) => {
              console.error("Could not save assistant message:", error);
            });
          }
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

          setWeather((await response.json()) as WeatherResult);
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

  const handleRename = async (chat: ChatRecord) => {
    const title = renameValue.trim();

    if (!title) return;

    await renameChat(user.uid, chat.id, title);

    setRecentChats((current) =>
      current.map((item) =>
        item.id === chat.id ? { ...item, title } : item,
      ),
    );

    setRenamingChatId(null);
    setRenameValue("");
  };

  const handleDelete = async (chatId: string) => {
    await removeChat(user.uid, chatId);

    setRecentChats((current) =>
      current.filter((chat) => chat.id !== chatId),
    );

    if (activeChatIdRef.current === chatId) {
      setActiveChatId(null);
      activeChatIdRef.current = null;
      setTranscripts([]);
      setScreen("home");
    }

    setOpenChatMenu(null);
  };

  const handleTogglePin = async (chat: ChatRecord) => {
    const pinned = !chat.pinned;

    await toggleChatPin(user.uid, chat.id, pinned);

    setRecentChats((current) =>
      current
        .map((item) =>
          item.id === chat.id ? { ...item, pinned } : item,
        )
        .sort((first, second) =>
          first.pinned === second.pinned
            ? 0
            : first.pinned
              ? -1
              : 1,
        ),
    );

    setOpenChatMenu(null);
  };

  return (
    <div className="app-shell">
      <aside className={sidebarOpen ? "sidebar" : "sidebar collapsed"}>
        <div className="sidebar-header">
          {sidebarOpen && (
            <div className="sidebar-brand">
              <img
                src="/brand/wanhasi-logo.svg"
                alt="WaNhasi"
                className="wanhasi-logo"
              />
              <strong>WaNhasi</strong>
            </div>
          )}

          <button
            className="icon-button sidebar-toggle"
            onClick={() => setSidebarOpen((current) => !current)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          >
            <Menu size={19} />
          </button>
        </div>

        <button className="new-chat-button" onClick={handleNewChat}>
          <Plus size={18} />
          {sidebarOpen && <span>New chat</span>}
        </button>

        <nav className="sidebar-nav">
          <button
            type="button"
            onClick={() => setSearchOpen((current) => !current)}
          >
            <Search size={18} />
            {sidebarOpen && <span>Search chats</span>}
          </button>

          {sidebarOpen && searchOpen && (
            <input
              className="chat-search-input"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
          )}
        </nav>

        {sidebarOpen && (
          <section className="recent-section">
            <div className="sidebar-label">Recent chats</div>

            {filteredChats.length === 0 ? (
              <span className="empty-recent">No conversations yet</span>
            ) : (
              filteredChats.map((chat) => (
                <div className="recent-chat-row" key={chat.id}>
                  {renamingChatId === chat.id ? (
                    <input
                      className="rename-chat-input"
                      value={renameValue}
                      onChange={(event) =>
                        setRenameValue(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleRename(chat);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="recent-item"
                      onClick={() => handleOpenChat(chat)}
                    >
                      
                      <span>{chat.title}</span>
                      {chat.pinned && <Pin size={13} />}
                    </button>
                  )}

                  <button
                    className="chat-menu-button"
                    onClick={() =>
                      setOpenChatMenu((current) =>
                        current === chat.id ? null : chat.id,
                      )
                    }
                    aria-label={`Options for ${chat.title}`}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openChatMenu === chat.id && (
                    <div className="chat-actions-menu">
                      <button
                        onClick={() => {
                          setRenameValue(chat.title);
                          setRenamingChatId(chat.id);
                          setOpenChatMenu(null);
                        }}
                      >
                        <Pencil size={14} />
                        Rename
                      </button>

                      <button onClick={() => void handleTogglePin(chat)}>
                        <Pin size={14} />
                        {chat.pinned ? "Unpin" : "Pin"}
                      </button>

                      <button
                        className="delete-chat-action"
                        onClick={() => void handleDelete(chat.id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        <div className="sidebar-spacer" />

        <nav className="sidebar-footer-links">
          <button type="button" onClick={() => setScreen("settings")}>
            <Settings size={17} />
            {sidebarOpen && <span>Settings</span>}
          </button>

          <button type="button" onClick={() => setScreen("help")}>
            <UserCircle size={17} />
            {sidebarOpen && <span>Help</span>}
          </button>
        </nav>

        <ProfileMenu
          email={user.email ?? "Your profile"}
          onSwitchProfile={logoutUser}
          onSignOut={logoutUser}
        />
      </aside>

      <div className="app-main">
        <header className="topbar" />

        <main className="screen-content">
          {screen === "home" && (
            <section className="empty-dashboard">
              <div className="chat-composer">
                <span>Message WaNhasi...</span>

                <button
                  className="composer-mic"
                  onClick={() => void handleStartVoice()}
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

              <button
                className="voice-orb"
                onClick={() => void handleStartVoice()}
              >
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

          {screen === "settings" && (
            <section className="settings-screen">
              <span className="eyebrow">SETTINGS</span>
              <h1>Settings</h1>

              <div className="settings-card">
                <div>
                  <strong>Appearance</strong>
                  <p>Choose how WaNhasi looks.</p>
                </div>

                <button
                  className="settings-theme-button"
                  onClick={() =>
                    setMode((current) =>
                      current === "dark" ? "light" : "dark",
                    )
                  }
                >
                  Switch to {mode === "dark" ? "light" : "dark"} mode
                </button>
              </div>
            </section>
          )}

          {screen === "help" && (
            <HelpScreen onBack={() => setScreen("home")} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;