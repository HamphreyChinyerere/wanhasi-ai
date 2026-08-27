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

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});