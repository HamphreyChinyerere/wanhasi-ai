import { useState } from "react";
import "./App.css";
import { connectVoiceAgent } from "./voiceAgent";

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
  const [status, setStatus] = useState("Not connected");
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [weatherStatus, setWeatherStatus] = useState("");

  const handleStartVoice = async () => {
    try {
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

  const handleCurrentWeather = async () => {
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
        setWeatherStatus(
          "Location permission was denied. You can enter a town instead.",
        );
      },
    );
  };

  return (
    <main>
      <h1>WaNhasi AI</h1>
      <p>Your farming voice assistant</p>

      <button onClick={handleStartVoice}>
        Start WaNhasi
      </button>

      <p>Status: {status}</p>

      <button onClick={handleCurrentWeather}>
        Use My Current Location
      </button>

      <p>{weatherStatus}</p>

      {weather?.current && weather.daily && (
        <section>
          <h2>Current Weather</h2>
          <p>Temperature: {weather.current.temperature_2m}°C</p>
          <p>High: {weather.daily.temperature_2m_max[0]}°C</p>
          <p>Low: {weather.daily.temperature_2m_min[0]}°C</p>
          <p>
            Rain chance:{" "}
            {weather.daily.precipitation_probability_max[0]}%
          </p>
        </section>
      )}

      <section>
        {transcripts.map((transcript, index) => (
          <p key={`${transcript}-${index}`}>{transcript}</p>
        ))}
      </section>
    </main>
  );
}

export default App;