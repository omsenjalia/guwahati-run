import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { api } from "@/core/api";
import { onSignOut, savedSession } from "@/core/auth";
import { cacheGet, cacheSet } from "@/core/storage";

/**
 * Alerts without a push service: the phone asks the server for new rows of the
 * notifications table (GET /api/alerts) and shows them as local notifications.
 * Checked every ~15 min in the background (Android decides exactly when), in the
 * attendees' 30-minute location task, and whenever the app comes to the front.
 * So an alert can arrive up to ~30 min late.
 */

export const ALERTS_TASK = "gr-check-alerts";
const LAST = "gr-alerts-last";
const CHANNEL = "alerts";
const FIRST_RUN_MS = 6 * 3600 * 1000;

type Feed = { alerts: { id: number; title: string; body: string | null }[]; last: number | null };

// Show alerts even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let running: Promise<void> | null = null;
/** Fetches and shows new alerts; never throws. Concurrent calls share one run so nothing shows twice. */
export function checkAlerts() {
  running ??= check().finally(() => (running = null));
  return running;
}

async function check() {
  if (Platform.OS === "web" || !(await savedSession())) return;
  try {
    const last = await cacheGet<number>(LAST);
    // First run: only the last ~6 hours, not the whole history.
    const q = last ? `after=${last}` : `since=${Date.now() - FIRST_RUN_MS}`;
    const feed = await api<Feed>(`/api/alerts?${q}`);
    for (const a of feed.alerts) {
      await Notifications.scheduleNotificationAsync({ content: { title: a.title, body: a.body ?? undefined }, trigger: { channelId: CHANNEL } });
    }
    if (feed.last) await cacheSet(LAST, feed.last);
  } catch {
    // Offline: the next check picks them up.
  }
}

// Must be defined at the top level so Android can run it with the app in the background.
if (Platform.OS !== "web") {
  TaskManager.defineTask(ALERTS_TASK, async () => {
    await checkAlerts();
    return BackgroundTask.BackgroundTaskResult.Success;
  });
}

/** After sign-in (attendee or parent): ask to show notifications and start the background checks. */
export async function startAlerts() {
  if (Platform.OS === "web") return;
  try {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Trip alerts", importance: AndroidImportance.HIGH });
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) await Notifications.requestPermissionsAsync();
    if (!(await TaskManager.isTaskRegisteredAsync(ALERTS_TASK))) {
      await BackgroundTask.registerTaskAsync(ALERTS_TASK, { minimumInterval: 15 });
    }
  } catch {}
  await checkAlerts();
}

onSignOut(async () => {
  if (Platform.OS === "web") return;
  if (await TaskManager.isTaskRegisteredAsync(ALERTS_TASK).catch(() => false)) await BackgroundTask.unregisterTaskAsync(ALERTS_TASK).catch(() => {});
  await cacheSet(LAST, null);
});
