import type { Place } from "@/data/trip";

/** Deep links that open the native Google Maps, Uber and Ola apps when installed. */

export function mapsLink(from: Place, to: Place, mode: "transit" | "driving" = "transit") {
  const p = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${p}`;
}

export function uberLink(from: Place, to: Place) {
  const p = new URLSearchParams({
    action: "setPickup",
    "pickup[latitude]": String(from.lat),
    "pickup[longitude]": String(from.lon),
    "pickup[nickname]": from.name,
    "dropoff[latitude]": String(to.lat),
    "dropoff[longitude]": String(to.lon),
    "dropoff[nickname]": to.name,
  });
  return `https://m.uber.com/ul/?${p}`;
}

export function olaLink(from: Place, to: Place) {
  const p = new URLSearchParams({
    lat: String(from.lat),
    lng: String(from.lon),
    drop_lat: String(to.lat),
    drop_lng: String(to.lon),
  });
  return `https://book.olacabs.com/?${p}`;
}

export const telLink = (n: string) => `tel:${n.replace(/\s+/g, "")}`;
