# Guwahati Run

Trip companion PWA for 4 of us: Gujarat to Delhi to Guwahati (IIT Guwahati hackathon finals) and back, 28 Oct to 4 Nov 2026.

**Setting it up or deploying? Follow [SETUP.md](SETUP.md).**

## What it does

- **Now**: switches by date. Before the trip: countdown, trip status, prep progress, next important date, Guwahati forecast. Travel days: current step with live delay, our seats, next action with leave-by, metro-or-cab plan, journey bar, food stations. Hackathon: submission countdown, rest rotation. Free time: leave-IIT-by. After: trip stats, final report, settle up, recap post.
- **Timeline**: every leg, transfer, meal and sleep block with live times; Maps, Uber, Ola, Rapido links; subscribable calendar.
- **Tickets**: static cards with "Can board" and a Check on IRCTC link. North East Express (the one waitlisted ticket) keeps live status, chance, waitlist graph and Plan B. **Wallet**: every ticket offline, with a full-screen "show to TTE" mode.
- **Money**: receipts (photo or PDF) saved to the private repo's `documents/` folder, offline upload queue, who owes whom, receipt checklist, rail cost per person.
- **Grant**: BVM SSIP estimate, document checklist, final PDF report (cover, summary, expenses with receipt numbers, requested vs spent, every receipt attached) and Excel.
- **Team**: members, alerts, packing lists, guides, journal, paper backup, system status.
- **Hackathon** (replaces Timeline from 30 Oct evening): countdown, schedule, rest rotation, task board, pitch timer, demo checklist.
- **SOS**: share location and train details, 112 and 139, nearest hospital, lost-item steps.
- **Parents**: separate passcode, read-only page with position, arrivals and check-ins.

Fully automatic: Supabase calls `/api/jobs/tick` every 5 minutes. It tracks the North East Express PNR (every 6h, hourly from 26 Oct, every 15 min from 28 Oct 16:00 until the chart), live running status for whichever train we're on, weather and timetables, then evaluates connections, transfers and deadlines, and sends push alerts.

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
lib/github.ts         Private repo storage for receipts (server only)
lib/report-pdf.ts     Final report for the college (pdf-lib)
documents/            Receipts, tickets, certificates, reports (written by the app)
public/sw.js          Offline copy and push notifications
supabase/*.sql        Database setup (run in the SQL editor)
```
