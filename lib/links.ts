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

/**
 * Rapido has no public deep link that pre-fills pickup/drop. On Android this
 * opens the Rapido app (Play Store if missing); elsewhere the Rapido site.
 */
export function rapidoLink(isAndroid: boolean) {
  const site = "https://www.rapido.bike";
  return isAndroid
    ? `intent://#Intent;package=com.rapido.passenger;S.browser_fallback_url=${encodeURIComponent(
        "https://play.google.com/store/apps/details?id=com.rapido.passenger",
      )};end`
    : site;
}

/**
 * Pre-filled SMS. Works with basic signal and no mobile data, e.g. PNR
 * status from 139: body "PNR 1234567890". iOS uses "&body=", Android "?body=".
 */
export function smsLink(to: string, body: string, isIOS: boolean) {
  return `sms:${to}${isIOS ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

export const telLink = (n: string) => `tel:${n.replace(/\s+/g, "")}`;
