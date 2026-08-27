import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    message: "WaNhasi backend is running",
  });
});

app.get("/api/voice-token", async (_request, response) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey || apiKey === "your_key_goes_here") {
    response.status(500).json({ error: "AssemblyAI API key is not configured" });
    return;
  }

  const tokenUrl = new URL("https://agents.assemblyai.com/v1/token");
  tokenUrl.searchParams.set("expires_in_seconds", "300");

  const tokenResponse = await fetch(tokenUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await tokenResponse.json();

  if (!tokenResponse.ok) {
    response.status(tokenResponse.status).json(data);
    return;
  }

  response.json(data);
});

app.get("/api/weather", async (request, response) => {
  const location = String(request.query.location ?? "").trim();

  if (!location) {
    response.status(400).json({ error: "Location is required" });
    return;
  }

  try {
    const geocodingUrl = new URL(
      "https://geocoding-api.open-meteo.com/v1/search",
    );

    geocodingUrl.searchParams.set("name", location);
    geocodingUrl.searchParams.set("count", "1");
    geocodingUrl.searchParams.set("language", "en");
    geocodingUrl.searchParams.set("format", "json");

    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
      }>;
    };

    const place = geocodingData.results?.[0];

    if (!place) {
      response.status(404).json({ error: "Location not found" });
      return;
    }

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(place.latitude));
    weatherUrl.searchParams.set("longitude", String(place.longitude));
    weatherUrl.searchParams.set(
      "current",
      "temperature_2m,weather_code",
    );
    weatherUrl.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
    );
    weatherUrl.searchParams.set("forecast_days", "1");
    weatherUrl.searchParams.set("timezone", "auto");

    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    response.json({
      location: place.name,
      country: place.country,
      current: weatherData.current,
      daily: weatherData.daily,
    });
  } catch (error) {
    console.error("Weather request failed:", error);
    response.status(502).json({ error: "Could not fetch weather data" });
  }
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});