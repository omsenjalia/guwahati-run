# Guwahati Run

Trip companion app for 4 of us: Gujarat to Delhi to Guwahati (IIT Guwahati hackathon finals) and back, 28 Oct to 4 Nov 2026, and for our parents following along.

An Android app (Expo / React Native) plus the server that tracks trains in the background (Next.js API on Vercel, Supabase).

**Setting it up, deploying or installing? Follow [SETUP.md](SETUP.md).**

## What it does

Sign in as **an attendee** (your name + your password) or **a parent** (whose parent you are + the parent passcode).

| Tab | Parents | Attendees |
|---|---|---|
| Home | Countdown or current step, next train with their child's seat, where they are, connections, weather | Same, plus your seat, location sharing and emergency numbers |
| Train | Live running status station by station (like NTES): delay, platform, where the train is | Same |
| Ticket | | PNR status while waitlisted (chart time, chance, Plan B). Once RAC or confirmed: coach position on the platform, coach, berth, bay diagram, platform |
| Plan | The whole trip day by day, times shifted live by delays | Same |
| Location | Map and list of everyone; if a phone's location is off, a friend's fix is used | |
| Money | Total spent, per person, by category, grant estimate | Same, plus **Add a bill** (photo or PDF, goes to `documents/` and the college report) |
| Chat | Ask the assistant where they are, if the train is on time, when they arrive (never PNR numbers) | Same, plus their own seat/PNR status with a live "check now", connections, IRCTC food prices, delay history |

Attendees' phones send their location every 30 minutes, also with the app closed (Android shows a small "sharing location" notification).

The server does the rest automatically: Supabase calls `/api/jobs/tick` every 5 minutes to track PNRs (every ticket in the 3 days before departure, the Avadh Assam Express more often), live running status, weather and timetables, and to send alerts.

The **Chat** assistant (like WeatherGPT's) answers from that same collected data. With `GROQ_API_KEY` set on the server (never in the app) it reasons over the trip context with Groq and can call read-only tools for fresh checks (live PNR/running status, weather, IRCTC food prices, delay history); without a key it still answers the common questions straight from the collected data. See `backend/lib/chat*.ts` and SETUP.md.

## Structure

```
src/app/              Screens (Expo Router): onboarding, (tabs)/*, settings, add-bill
src/core/             Sign-in, server calls, the data feed, storage
src/features/         Location sharing, bill upload, shared trip helpers (+ tests)
src/ui/               Theme, components, tab bar, map
assets/images/        App icon (icon-source.svg is the source), splash
backend/              The server (deploy this folder on Vercel)
  data/trip.ts          All static trip data: the one file you might edit
  app/api/              auth, parent/state (the app's data feed), location, docs, jobs/tick...
  lib/                  Trip logic shared with the app, train providers, background jobs
  supabase/*.sql        Database setup
documents/            Receipts, tickets, reports (written by the server)
graphify-out/         Code graph (graphify)
.github/workflows/    Builds the Android APK
```

The app imports the trip data and trip logic straight from `backend/data` and `backend/lib`, so there is one copy.

## Run locally

```bash
npm install
npm --prefix backend install
npm --prefix backend run dev -- -p 3000
```

In a second terminal (with `EXPO_PUBLIC_API_URL=http://localhost:3000` in `.env.local`):

```bash
npx expo start --web
```

Add `?at=2026-10-29T14:00` to the web address to preview any moment of the trip.

Checks: `npm run typecheck`, `npm test`, `npm run lint`.

## Code graph

`graphify update .` rebuilds `graphify-out/graph.json` (also runs automatically after every commit via git hooks). `graphify query "how does location sharing work"` answers questions from it.
