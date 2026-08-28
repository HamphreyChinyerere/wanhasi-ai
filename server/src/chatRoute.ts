import { Router } from "express";
import {
  buildFarmSystemPrompt,
  type FarmProfile,
} from "./farmAssistant.js";
import { generateFarmResponse } from "./geminiService.js";

const chatRouter = Router();

type ChatRequestBody = {
  prompt?: string;
  farmProfile?: FarmProfile;
};

chatRouter.post("/chat", async (request, response) => {
  const { prompt, farmProfile } =
    request.body as ChatRequestBody;

  if (!prompt || typeof prompt !== "string") {
    response.status(400).json({
      error: "A prompt is required.",
    });
    return;
  }

  try {
    const text = await generateFarmResponse({
      prompt: prompt.trim(),
      systemPrompt: buildFarmSystemPrompt(farmProfile),
    });

    response.json({ text });
  } catch (error) {
    console.error("Gemini chat error:", error);

    response.status(500).json({
      error: "Unable to generate a response right now.",
    });
  }
});

export default chatRouter;
