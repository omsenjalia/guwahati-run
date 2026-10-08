# Guwahati Run

Trip companion PWA for 4 of us: Gujarat to Delhi to Guwahati (IIT Guwahati hackathon finals) and back, 28 Oct to 4 Nov 2026.

**Setting it up or deploying? Follow [SETUP.md](SETUP.md).**

## What it does

- **Now**: next step with countdown, instruction, platform and berth, trip health, plan B when a connection is at risk, metro-or-cab transfer plan, next deadline with a live verdict, check-ins, weather.
- **Timeline**: every leg, transfer, meal and sleep block with live times; Maps, Uber, Ola, Rapido links; subscribable calendar.
- **Tickets**: per-passenger status and confirmation chance, chart time, coach order on the platform, SMS-139 fallback, plain-English advice.
- **Money**: shared expenses, who owes whom, bill photos, fares vs target.
- **Grant**: BVM SSIP reimbursement estimate (both fare rules), document checklist, PDF and Excel claim.
- **Team**: members, alerts, packing lists, guides, journal, paper backup, system status.
- **Hackathon** (replaces Timeline from 30 Oct evening): countdown, schedule, rest rotation, task board, pitch timer, demo checklist.
- **SOS**: share location and train details, 112 and 139, nearest hospital, lost-item steps.
- **Parents**: separate passcode, read-only page with position, arrivals and check-ins.

Fully automatic: Supabase calls `/api/jobs/tick` every 5 minutes. It syncs PNRs (every 30 min, 15 around chart time), live running status, weather and timetables, then evaluates connections, transfers and deadlines, and sends push alerts.

## The one file you might edit

`data/trip.ts` holds all static trip data. Live data is fetched automatically and layered on top.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with `TEAM_PASSCODE` from `.env`. Add `?at=2026-10-29T03:30` to preview any moment.

## Structure

```
app/(app)/            Screens behind the team passcode
app/parent/           Parent page (parent passcode)
app/api/jobs/tick     Background brain, called by Supabase every 5 min
app/api/...           Session, push, parent data, calendar, self-test
components/           Screens and shared UI
data/trip.ts          All static trip data
data/guides.ts        Station guides and explore list
lib/providers/        Train data sources with failover (ConfirmTkt first)
lib/jobs/             Tick scheduler and watchers (alerts, deadlines)
lib/trip-engine.ts    Now/next, health, buffers, chart times
lib/notify.ts         Single alert pipeline: push now, WhatsApp later
public/sw.js          Offline copy and push notifications
supabase/*.sql        Database setup (run in the SQL editor)
```
