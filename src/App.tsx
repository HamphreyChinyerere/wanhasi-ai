import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  CloudSun,
  Database,
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
import AccountSettingsScreen from "./AccountSettingsScreen";
import ChatComposer from "./ChatComposer";
import UserHistoryScreen from "./UserHistoryScreen";

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
import { loadFarmMemory } from "./farmMemory";
import type { FarmProfile } from "./farmAssistant";

import "./App.css";
import "./theme.css";

type Screen =
  | "voice"
  | "weather"
  | "settings"
  | "help"
  | "history";

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
  const [typedLoading, setTypedLoading] = useState(false);

  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(null);
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
        setFarmProfile(null);
        setRecentChats([]);
        setAuthLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const profileSnapshot = await getDoc(
          doc(db, "users", currentUser.uid),
        );

        setOnboardingComplete(
          profileSnapshot.exists() &&
            profileSnapshot.data().onboardingComplete === true,
        );

        const savedFarmProfile = await loadFarmMemory(currentUser.uid);
        setFarmProfile(savedFarmProfile);
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

  const updateChatMessages = (
    chatId: string,
    message: TranscriptMessage,
  ) => {
    setRecentChats((current) =>
      current.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...(chat.messages ?? []), message],
            }
          : chat,
      ),
    );
  };

  const ensureChat = async (firstMessage: string) => {
    let chatId = activeChatIdRef.current;

    if (chatId) {
      return chatId;
    }

    const title = firstMessage
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

    return chatId;
  };

  const handleNewChat = () => {
    setTranscripts([]);
    setStatus("Ready to talk");
    setWeather(null);
    setWeatherStatus("");
    setTypedLoading(false);
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
    const chatId =
      role === "user"
        ? await ensureChat(text)
        : activeChatIdRef.current;

    if (!chatId) {
      return;
    }

    await saveChatMessage(user.uid, chatId, {
      role,
      text,
    });

    updateChatMessages(chatId, { role, text });
  };

  const requestDevicePermissions = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    stream.getTracks().forEach((track) => track.stop());

    if (!navigator.geolocation) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (error) => reject(error),
        );
      });
    } catch {
      console.warn("Location permission is optional.");
    }
  };

  const handleStartVoice = async () => {
    try {
      await requestDevicePermissions();

      setScreen("voice");
      setStatus("Connecting...");

      const socket = await connectVoiceAgent((message) => {
        console.log("AssemblyAI voice event:", message);

        if (message.type === "session.ready") {
          setStatus("Connected to WaNhasi");
        }

          if (message.type === "reply.started") {
            setStatus("WaNhasi is speaking...");
          }

          if (message.type === "reply.done") {
            setStatus("Ready to talk");
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

  const handleSendTyped = async (message: string) => {
    const prompt = message.trim();

    if (!prompt || typedLoading) {
      return;
    }

    setScreen("voice");
    setTypedLoading(true);

    const chatId = await ensureChat(prompt);

    const userMessage: TranscriptMessage = {
      role: "user",
      text: prompt,
    };

    setTranscripts((current) => [...current, userMessage]);
    await saveChatMessage(user.uid, chatId, userMessage);
    updateChatMessages(chatId, userMessage);

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          farmProfile,
        }),
      });

      if (!response.ok) {
        throw new Error("Gemini request failed.");
      }

      const result = (await response.json()) as { text?: string };
      const answer =
        result.text?.trim() ||
        "I could not generate a response right now.";

      const assistantMessage: TranscriptMessage = {
        role: "assistant",
        text: answer,
      };

      setTranscripts((current) => [...current, assistantMessage]);
      await saveChatMessage(user.uid, chatId, assistantMessage);
      updateChatMessages(chatId, assistantMessage);
    } catch (error) {
      console.error("Typed chat failed:", error);

      const errorMessage: TranscriptMessage = {
        role: "assistant",
        text: "I could not connect to WaNhasi right now. Please try again.",
      };

      setTranscripts((current) => [...current, errorMessage]);
    } finally {
      setTypedLoading(false);
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
            throw new Error("Weather request failed.");
          }

          setWeather((await response.json()) as WeatherResult);
          setWeatherStatus("Weather updated");
        } catch (error) {
          console.error(error);
          setWeatherStatus("Could not load weather.");
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
            type="button"
            className="icon-button sidebar-toggle"
            onClick={() => setSidebarOpen((current) => !current)}
            aria-label={
              sidebarOpen ? "Collapse sidebar" : "Open sidebar"
            }
          >
            <Menu size={19} />
          </button>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={handleNewChat}
        >
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
                      type="button"
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

          <button type="button" onClick={() => setScreen("history")}>
            <Database size={17} />
            {sidebarOpen && <span>Your data</span>}
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
                type="button"
                className={
                  status === "Connected to WaNhasi"
                    ? "voice-orb is-connected"
                    : "voice-orb"
                }
                onClick={() => void handleStartVoice()}
                aria-label="Start voice chat"
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

              <ChatComposer
                onSend={handleSendTyped}
                onStartVoice={() => void handleStartVoice()}
                disabled={typedLoading}
              />
            </section>
          )}

          {screen === "weather" && (
            <section className="weather-screen">
              <span className="eyebrow">LOCAL WEATHER</span>
              <h1>Weather for your farm</h1>

              <button
                type="button"
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
                    <strong>
                      {weather.current.temperature_2m}°C
                    </strong>
                  </div>

                  <div className="weather-details">
                    <span>
                      High {weather.daily.temperature_2m_max[0]}°C
                    </span>
                    <span>
                      Low {weather.daily.temperature_2m_min[0]}°C
                    </span>
                    <span>
                      Rain{" "}
                      {weather.daily
                        .precipitation_probability_max[0]}
                      %
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {screen === "settings" && (
            <AccountSettingsScreen
              userId={user.uid}
              email={user.email ?? ""}
              uid={user.uid}
              mode={mode}
              initialProfile={farmProfile ?? undefined}
              onToggleMode={() =>
                setMode((current) =>
                  current === "dark" ? "light" : "dark",
                )
              }
              onSwitchProfile={logoutUser}
              onSignOut={logoutUser}
              onBack={() => setScreen("voice")}
            />
          )}

          {screen === "history" && (
            <UserHistoryScreen
              email={user.email ?? ""}
              uid={user.uid}
              chats={recentChats}
              onBack={() => setScreen("voice")}
            />
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