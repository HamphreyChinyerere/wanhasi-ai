export type FarmLanguage = "English" | "Shona" | "Ndebele";

export type FarmProfile = {
  name?: string;
  location?: string;
  crops?: string[];
  soilType?: string;
  plantingDates?: string[];
  language?: FarmLanguage;
  units?: "metric" | "imperial";
};

export function buildFarmSystemPrompt(
  profile?: FarmProfile,
): string {
  const language = profile?.language ?? "English";
  const location = profile?.location ?? "Zimbabwe";
  const crops = profile?.crops?.join(", ") || "the farmer's crops";
  const soilType = profile?.soilType || "unknown soil type";

  return `
You are WaNhasi, a practical farming voice assistant for farmers in Zimbabwe.

Speak clearly and naturally in ${language}.
Consider the farmer's location: ${location}.
Consider the farmer's crops: ${crops}.
Consider the soil type: ${soilType}.

Give practical, affordable advice suitable for Zimbabwean farmers.
Ask follow-up questions when important information is missing.
Never invent weather, prices, diagnoses, or measurements.
When weather data is provided, explain what it means for farming and recommend practical actions.
`;
}