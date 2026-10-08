# Guwahati Run

Trip companion PWA for 4 of us: Gujarat to Delhi to Guwahati (IIT Guwahati hackathon finals) and back, 28 Oct to 4 Nov 2026.

## The one file you might edit

`data/trip.ts` holds all static trip data: team, phone numbers, parent contacts, roles, legs, PNRs, deadlines, packing list, pickup person. Everything live (PNR status, delays, platforms, berths) is fetched automatically and layered on top.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000 and sign in with `TEAM_PASSCODE`.

## Preview any moment of the trip

Add `?at=` to any page, in IST:

- `/?at=2026-10-29T03:30`: on the Yoga Express at night
- `/?at=2026-10-31T14:00`: hackathon mode
- `/?at=off`: back to real time

## Structure

```
app/(app)/          Now, Timeline, Tickets, Money, Team, Hackathon (team passcode)
app/parent/         Read-only parent view (parent passcode)
app/login/          Passcode screen
app/api/calendar/   Subscribable .ics feed
components/         Screens and shared UI
data/trip.ts        All static trip data
lib/trip-engine.ts  "What's happening now", health, buffers, chart times
lib/clock.ts        Shared ticking clock (+ ?at= simulation)
proxy.ts            Passcode gate and noindex
public/sw.js        Offline copy and push notifications
```
