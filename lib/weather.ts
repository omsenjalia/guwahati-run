import type { Place } from "@/data/trip";

/** Open-Meteo: free, no API key. Shared by the client and the weather job. */

export type Weather = {
  placeId: string;
  tempC: number;
  code: number;
  todayMax: number;
  todayMin: number;
  rainChance: number;
  fetchedAt: number;
};

export async function fetchWeather(place: Place): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FKolkata&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json();
  return {
    placeId: place.id,
    tempC: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    todayMax: Math.round(j.daily.temperature_2m_max[0]),
    todayMin: Math.round(j.daily.temperature_2m_min[0]),
    rainChance: j.daily.precipitation_probability_max[0] ?? 0,
    fetchedAt: Date.now(),
  };
}

/** WMO weather code to a short phrase. */
export function describeWeather(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog or haze";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Thunderstorm";
}
