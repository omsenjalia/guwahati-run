# Guwahati Run: setup, deploy and install

## 1. Server (Vercel): two one-time changes

The server code moved into the `backend/` folder, so Vercel needs to know.

1. Go to **vercel.com** → the `guwahati-run` project → **Settings** → **Build and Deployment**.
2. **Root Directory** → **Edit** → type `backend` → **Save**.
3. **Settings** → **Environment Variables** → **Add New**:
   - Key: `ATTENDEE_PASSWORDS`
   - Value: `oms:1234,omk:1234,heet:1234,sujal:1234`
   - **Save**.
4. **Deployments** → latest → **⋯** → **Redeploy**.

To change someone's password later: edit `ATTENDEE_PASSWORDS` in Vercel (and in `backend/.env`), then redeploy. The person ids are `oms` (Om Senjalia), `omk` (Omkumar Vaghela), `heet` (Heet Gajera), `sujal` (Sujal Khatri).

Parents use `PARENT_PASSCODE` (in `backend/.env` and Vercel), same as before.

Everything else stays as it was: Supabase still calls the server every 5 minutes, receipts still go to `documents/`. Commits that only touch the app or `documents/` don't redeploy the server.

## 2. Get the Android app

Every push to `main` that changes the app builds a new APK automatically (about 15 minutes).

1. On the phone, open **github.com/omsenjalia/guwahati-run/releases** (signed in to GitHub).
2. Open the newest **Guwahati Run N** → tap the `.apk` file to download.
3. Open the download. If Android asks, allow **Install unknown apps** for your browser, then **Install**.
4. Updating later: install the newer APK over the old one. You stay signed in.

To build without pushing: GitHub → **Actions** → **Android APK** → **Run workflow**.

Parents without GitHub access: download the APK yourself and send it to them on WhatsApp (as a document).

## 3. First open, on each phone

**Attendees**
1. **I'm on the trip** → your name → password.
2. **Allow location**, then pick **Allow all the time** on the next screen. This lets the app share your location every 30 minutes even when closed.
3. If you skipped it: Home → **Location sharing** → **Turn on**.
4. Some phones (Xiaomi, Oppo, Vivo, Samsung) stop background apps to save battery: Settings → Apps → Guwahati Run → Battery → **Unrestricted**.

**Parents**
1. **I'm a parent** → your child's name → the parent passcode.

## 4. Alerts (notifications), on each phone

Alerts (chart prepared, PNR changes, delays, deadlines) need no setup on the server. The app checks for new ones by itself, so **an alert can arrive up to about 30 minutes late**. Opening the app checks straight away.

1. Install the newest APK (section 2) and open it.
2. When Android asks **Allow Guwahati Run to send you notifications?**, tap **Allow**.
3. Android Settings → Apps → Guwahati Run → Battery → **Unrestricted** (otherwise the phone may stop the checks to save battery).
4. If you tapped Don't allow: Android Settings → Apps → Guwahati Run → Notifications → turn on.

Attendees get every alert. Parents get only trip alerts (chart prepared, connections, wake-ups, daily briefing, hackathon rest times), never PNR numbers, ticket changes, booking deadlines or money.

## 5. Edit trip details

`backend/data/trip.ts` holds all static trip data. Edit it on github.com (pencil icon → **Commit changes**). The server redeploys by itself; the app picks up the change in the next APK.

## Environment variables (server, in Vercel)

| Name | What it's for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Database address and public key |
| `SUPABASE_SECRET_KEY` | Background jobs write data. Server only |
| `ATTENDEE_PASSWORDS` | Each attendee's password, `id:password` pairs |
| `PARENT_PASSCODE` | Passcode for parents |
| `AUTH_SECRET` | Signs sign-in tokens. Changing it signs everyone out |
| `CALENDAR_TOKEN` | Secret part of the calendar link |
| `CRON_SECRET` | Proves the 5-minute calls come from Supabase |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push (old website alerts). App alerts need nothing here |
| `GITHUB_RECEIPTS_TOKEN`, `GITHUB_RECEIPTS_REPO` | Saves bills to `documents/` |
| `GROQ_API_KEY` | The Chat tab's AI (Groq). Server only, never in the app. Optional: without it, Chat still answers common questions from the collected trip data |
| `GROQ_MODEL` | Optional. Defaults to `openai/gpt-oss-120b` (same as WeatherGPT); `llama-3.3-70b-versatile` is a faster alternative |

The app itself needs no secrets: it talks to `https://guwahati-run.vercel.app` (change in `src/core/config.ts` or with `EXPO_PUBLIC_API_URL`).

## Chat assistant (Groq)

The Chat tab works with no setup, answering from the data the app already collects (times, delays, ticket status, weather, IRCTC food prices, money, locations). To switch on the full AI assistant, like WeatherGPT's:

1. Get a free key at **console.Groq.com**.
2. Vercel → the `guwahati-run` project → **Settings** → **Environment Variables** → add `GROQ_API_KEY` (and optionally `GROQ_MODEL`) → **Save** → redeploy.
3. Open the app's Chat tab: the "AI is off" note disappears once the server sees the key (the tab checks `GET /api/chat`).

Notes: the key lives only on the server; the app calls `/api/chat` with its normal sign-in token. Parents are served a PNR-free view, nobody's raw GPS coordinates are sent to Groq, and the assistant is read-only (it can check a PNR or train live, never book or cancel). If Groq is down or over quota, chat quietly falls back to the collected-data answers.

## If something looks wrong

- **Settings → System → Background tracking** says "Needs a look": the 5-minute job stopped. In Supabase → SQL Editor run `select base_url from private.app_config;` and check it shows the Vercel address.
- **"Can't reach the server"** in the app: check Vercel's latest deployment is green and Root Directory is `backend`.
- **No alerts on a phone**: they can be up to 30 minutes late. Check the phone has the newest APK, notifications are on and battery is Unrestricted (section 4), then open the app (it checks on every open).
- **A parent sees "Location off · with Heet"**: their child's phone hasn't shared in 45 minutes, so the freshest friend's location is shown instead.
