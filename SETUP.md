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

## 4. Edit trip details

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push (old website alerts) |
| `GITHUB_RECEIPTS_TOKEN`, `GITHUB_RECEIPTS_REPO` | Saves bills to `documents/` |

The app itself needs no secrets: it talks to `https://guwahati-run.vercel.app` (change in `src/core/config.ts` or with `EXPO_PUBLIC_API_URL`).

## If something looks wrong

- **Settings → System → Background tracking** says "Needs a look": the 5-minute job stopped. In Supabase → SQL Editor run `select base_url from private.app_config;` and check it shows the Vercel address.
- **"Can't reach the server"** in the app: check Vercel's latest deployment is green and Root Directory is `backend`.
- **A parent sees "Location off · with Heet"**: their child's phone hasn't shared in 45 minutes, so the freshest friend's location is shown instead.
