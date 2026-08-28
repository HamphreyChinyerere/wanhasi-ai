type WeatherAdviceInput = {
  temperature: number;
  high: number;
  low: number;
  rainChance: number;
  crops?: string[];
};

export function createWeatherAdvice({
  temperature,
  high,
  low,
  rainChance,
  crops = [],
}: WeatherAdviceInput): string {
  const cropText = crops.length > 0
    ? crops.join(", ")
    : "your crops";

  const advice: string[] = [];

  if (rainChance >= 60) {
    advice.push(
      `Rain is likely. Delay spraying, check drainage, and protect harvested produce.`
    );
  }

  if (rainChance <= 20 && high >= 28) {
    advice.push(
      `Conditions are dry and warm. Inspect ${cropText} for water stress and irrigate early if needed.`
    );
  }

  if (low <= 5) {
    advice.push(
      "Cold conditions are possible. Protect young seedlings and sensitive crops from frost."
    );
  }

  if (high >= 35) {
    advice.push(
      "Very hot conditions are expected. Avoid midday field work and monitor crops and livestock for heat stress."
    );
  }

  if (advice.length === 0) {
    advice.push(
      `Conditions are moderate. Continue monitoring ${cropText} and follow your normal farm schedule.`
    );
  }

  return advice.join(" ");
}