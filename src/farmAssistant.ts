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

export type WeatherSummary = {
  temperature: number;
  high: number;
  low: number;
  rainChance: number;
  weatherCode?: number;
};

export const FARM_LANGUAGES: FarmLanguage[] = [
  "English",
  "Shona",
  "Ndebele",
];

export function buildFarmSystemPrompt(
  profile?: FarmProfile,
): string {
  const language = profile?.language ?? "English";
  const location = profile?.location ?? "Zimbabwe";
  const crops = profile?.crops?.join(", ") || "the farmer's crops";
  const soilType = profile?.soilType || "unknown soil type";

  return `
You are WaNhasi, a practical farming voice assistant for farmers in Zimbabwe.

Always:
- Speak naturally and clearly.
- Reply in ${language} unless the farmer asks for another language.
- Give practical, low-cost advice suitable for Zimbabwe.
- Consider the farmer's location: ${location}.
- Consider the farmer's crops: ${crops}.
- Consider the soil type: ${soilType}.
- Ask a short follow-up question when important information is missing.
- Never invent weather, prices, disease diagnoses, or measurements.
- Explain uncertainty clearly.
- Keep responses concise for voice conversations.

When weather data is available:
- Explain what the weather means for farming.
- Recommend practical actions such as planting, irrigation, spraying,
  harvesting, shade, drainage, or frost/rain protection.
- Mention when the recommendation depends on the crop or soil.

The farmer's preferred language is ${language}.
`;
}

export function getWeatherActionAdvice(
  weather: WeatherSummary,
  profile?: FarmProfile,
): string {
  const cropText = profile?.crops?.length
    ? profile.crops.join(", ")
    : "your crops";

  const advice: string[] = [];

  if (weather.rainChance >= 60) {
    advice.push(
      `Rain is likely, so delay spraying and check drainage around ${cropText}.`,
    );
  }

  if (weather.rainChance <= 20 && weather.temperature >= 28) {
    advice.push(
      `Dry and warm conditions are expected, so inspect ${cropText} for water stress and irrigate early if needed.`,
    );
  }

  if (weather.low <= 5) {
    advice.push(
      "Cold conditions are possible, so protect sensitive seedlings from frost.",
    );
  }

  if (weather.high >= 35) {
    advice.push(
      "Very hot conditions are expected, so avoid midday field work and monitor livestock and crops for heat stress.",
    );
  }

  if (advice.length === 0) {
    advice.push(
      `Conditions look moderate. Continue checking ${cropText} and follow your normal farm schedule.`,
    );
  }

  return advice.join(" ");
}