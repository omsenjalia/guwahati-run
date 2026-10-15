import type { Place } from "@/data/trip";
import type { Weather } from "@/lib/live-types";

export type { Weather };

/** Open-Meteo: free, no API key. Shared by the client and the weather job. */

export async function fetchWeather(place: Place): Promise<Weather> {
  const [w] = await fetchWeatherMany([place]);
  return w;
}

/** One request for many places. */
export async function fetchWeatherMany(places: Place[]): Promise<Weather[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${places.map((p) => p.lat).join(",")}` +
    `&longitude=${places.map((p) => p.lon).join(",")}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&timezone=Asia%2FKolkata&forecast_days=16`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const body = await res.json();
  const list = Array.isArray(body) ? body : [body];
  const fetchedAt = Date.now();
  return list.map((j, i) => ({
    placeId: places[i].id,
    tempC: Math.round(j.current.temperature_2m),
    code: j.current.weather_code,
    todayMax: Math.round(j.daily.temperature_2m_max[0]),
    todayMin: Math.round(j.daily.temperature_2m_min[0]),
    rainChance: j.daily.precipitation_probability_max[0] ?? 0,
    // The last forecast day sometimes comes back with blank temperatures; skip those.
    days: (j.daily.time as string[]).flatMap((date, d) =>
      j.daily.temperature_2m_max[d] == null || j.daily.temperature_2m_min[d] == null
        ? []
        : [{
            date,
            max: Math.round(j.daily.temperature_2m_max[d]),
            min: Math.round(j.daily.temperature_2m_min[d]),
            rainChance: j.daily.precipitation_probability_max[d] ?? 0,
            code: j.daily.weather_code[d],
          }],
    ),
    fetchedAt,
  }));
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
