import { GoogleGenAI } from "@google/genai";

const modelName =
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}

type GeminiRequest = {
  prompt: string;
  systemPrompt: string;
};

export async function generateFarmResponse({
  prompt,
  systemPrompt,
}: GeminiRequest): Promise<string> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 600,
    },
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
