import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { API_URL } from "@/core/config";
import { onSignOut, savedSession } from "@/core/auth";
import { createStore, useStore } from "@/core/store";

/**
 * Attendees' phones send their location to the server every 30 minutes,
 * even with the app closed (an Android foreground service keeps it alive and
 * shows a small "sharing location" notification). Parents see it on the
 * Location tab; if one phone's location is off, the server uses another
 * attendee's fix instead (they travel together).
 */

export const LOCATION_TASK = "gr-share-location";
const EVERY_MS = 30 * 60 * 1000;

type Fix = { latitude: number; longitude: number; accuracy?: number | null };

/** Last send result, for the status card. */
export const shareStatus = createStore<{ lastSentAt?: number; error?: string }>({});
export const useShareStatus = () => useStore(shareStatus);

async function send(coords: Fix, at: number) {
  // Read from storage: in the background the in-memory session may be gone.
  const s = await savedSession();
  if (s?.role !== "team") return;
  try {
    const res = await fetch(`${API_URL}/api/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
      body: JSON.stringify({ lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy ?? null, at }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    shareStatus.set({ lastSentAt: Date.now() });
  } catch (e) {
    shareStatus.set((p) => ({ ...p, error: e instanceof Error ? e.message : String(e) }));
  }
}

// Must be defined at the top level so Android can run it with the app in the background.
if (Platform.OS !== "web") {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const latest = data.locations[data.locations.length - 1];
    await send(latest.coords, latest.timestamp);
  });
}

export type ShareState = "on" | "foreground-only" | "off" | "unsupported";

/** Asks for location (then "Allow all the time") and starts sharing. */
export async function startSharing(): Promise<ShareState> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return "off";
  void sendNow();
  if (Platform.OS === "web") return "foreground-only";
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") return "foreground-only";
  if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false))) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: EVERY_MS,
      distanceInterval: 0,
      deferredUpdatesInterval: EVERY_MS,
      foregroundService: {
        notificationTitle: "Guwahati Run",
        notificationBody: "Sharing your location with the parents every 30 minutes",
        notificationColor: "#2446C7",
        killServiceOnDestroy: false,
      },
    });
  }
  return "on";
}

export async function stopSharing() {
  if (Platform.OS === "web") return;
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

/** Current state, without asking for anything. */
export async function sharingState(): Promise<ShareState> {
  const fg = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (fg?.status !== "granted") return "off";
  if (Platform.OS === "web") return "foreground-only";
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  return running ? "on" : "foreground-only";
}

/** One fix right now (app open), e.g. on launch and on "Share now". */
export async function sendNow() {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await send(pos.coords, pos.timestamp);
  } catch (e) {
    shareStatus.set((p) => ({ ...p, error: e instanceof Error ? e.message : String(e) }));
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
/** While the app is open (and on the web build, which has no background task): send every 30 min. */
export function keepSendingWhileOpen() {
  if (timer) return;
  void sendNow();
  timer = setInterval(() => void sendNow(), EVERY_MS);
}

onSignOut(async () => {
  if (timer) clearInterval(timer);
  timer = undefined;
  await stopSharing();
});
