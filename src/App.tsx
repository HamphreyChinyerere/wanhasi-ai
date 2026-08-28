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
import UserHistoryScreen from "./UserHistoryScreen";

type Screen = "voice" | "weather" | "settings" | "help" | "history";

type TranscriptMessage = {
  role: "user" | "assistant";
  text: string;
};

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

  const [screen, setScreen] = useState<Screen>("voice");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [mode, setMode] = useState<"dark" | "light">(() => {
    return localStorage.getItem("wanhasi-mode") === "light"
      ? "light"
      : "dark";
  });

  const [status, setStatus] = useState("Ready to talk");
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("");

  const [recentChats, setRecentChats] = useState<ChatRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
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
        const profile = await getDoc(
          doc(db, "users", currentUser.uid),
        );

        console.log("Authenticated UID:", currentUser.uid);
        console.log("Profile exists:", profile.exists());
        console.log("Profile data:", profile.data());

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
    if (!user) {
      return;
    }

    void listRecentChats(user.uid)
      .then(setRecentChats)
      .catch((error) => {
        console.error("Could not load recent chats:", error);
      });
  }, [user]);

  const filteredChats = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) {
      return recentChats;
    }

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
    setStatus("Ready to talk");
    setWeather(null);
    setWeatherStatus("");
    activeChatIdRef.current = null;
    setOpenChatMenu(null);
    setRenamingChatId(null);
    setScreen("voice");
  };

  const handleOpenChat = (chat: ChatRecord) => {
    activeChatIdRef.current = chat.id;

    setTranscripts(
      (chat.messages ?? []).map((message) => ({
        role: message.role,
        text: message.text,
      })),
    );

    setStatus("Chat loaded");
    setScreen("voice");
    setOpenChatMenu(null);
  };

  const saveVoiceMessage = async (
    role: "user" | "assistant",
    text: string,
  ) => {
    let chatId = activeChatIdRef.current;

    if (!chatId && role === "user") {
      const title = text
        .trim()
        .split(/\s+/)
        .slice(0, 7)
        .join(" ");

      chatId = await createChat(user.uid, title);
      activeChatIdRef.current = chatId;

      setRecentChats((current) => [
        {
          id: chatId as string,
          title,
          pinned: false,
          messages: [],
        },
        ...current,
      ]);
    }

    if (chatId) {
      await saveChatMessage(user.uid, chatId, {
        role,
        text,
      });
    }
  };

  const requestDevicePermissions = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported.");
    }

    const microphoneStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

    microphoneStream
      .getTracks()
      .forEach((track) => track.stop());

    if (!navigator.geolocation) {
      console.warn("Location access is unavailable.");
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (error) => reject(error),
        );
      });
    } catch (error) {
      console.warn("Location permission is optional:", error);
    }
  };

  const handleStartVoice = async () => {
    try {
      await requestDevicePermissions();

      setScreen("voice");
      setStatus("Connecting...");

      const socket = await connectVoiceAgent((message) => {
        if (message.type === "session.ready") {
          setStatus("Connected to WaNhasi");
        }

        if (message.type === "transcript.user" && message.text) {
          const text = message.text.trim();

          setTranscripts((current) => {
            const previous = current.at(-1);

            if (previous?.role === "user" && previous.text === text) {
              return current;
            }

            return [...current, { role: "user", text }];
          });

          void saveVoiceMessage("user", text).catch((error) => {
            console.error("Could not save user message:", error);
          });
        }

        if (message.type === "transcript.agent" && message.text) {
          const text = message.text.trim();

          setTranscripts((current) => {
            const previous = current.at(-1);

            if (previous?.role === "assistant") {
              return [
                ...current.slice(0, -1),
                { role: "assistant", text },
              ];
            }

            return [...current, { role: "assistant", text }];
          });

          void saveVoiceMessage("assistant", text).catch((error) => {
            console.error("Could not save assistant message:", error);
          });
        }
      });

      socket.addEventListener("error", () => {
        setStatus("Connection failed");
      });
    } catch (error) {
      setStatus("Microphone permission is required.");
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

    if (!title) {
      return;
    }

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
      activeChatIdRef.current = null;
      setTranscripts([]);
      setScreen("voice");
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
                    type="button"
                    className="chat-menu-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenChatMenu((current) =>
                        current === chat.id ? null : chat.id,
                      );
                    }}
                    aria-label={`Options for ${chat.title}`}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openChatMenu === chat.id && (
                    <div className="chat-actions-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setRenameValue(chat.title);
                          setRenamingChatId(chat.id);
                          setOpenChatMenu(null);
                        }}
                      >
                        <Pencil size={14} />
                        Rename
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleTogglePin(chat)}
                      >
                        <Pin size={14} />
                        {chat.pinned ? "Unpin" : "Pin"}
                      </button>

                      <button
                        type="button"
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
          {screen === "voice" && (
            <section className="voice-screen">
              <span className="eyebrow">VOICE ASSISTANT</span>
              <h1>Talk to WaNhasi</h1>

              <button
                className={
                    status === "Connected to WaNhasi"
                      ? "voice-orb is-connected"
                      : "voice-orb"
                  }
                onClick={() => void handleStartVoice()}
              >
                <Mic size={42} />
              </button>

              <p className="voice-status">{status}</p>

              <div className="transcript-card">
                {transcripts.length === 0 ? (
                  <span>Your conversation will appear here.</span>
                ) : (
                  transcripts.map((message, index) => (
                    <div
                      className={`message-bubble ${message.role}`}
                      key={`${message.role}-${index}-${message.text}`}
                    >
                      <small>
                        {message.role === "user" ? "You" : "WaNhasi"}
                      </small>
                      <p>{message.text}</p>
                    </div>
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
            <HelpScreen onBack={() => setScreen("voice")} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;