# Guwahati Run: setup and deploy

Everything here is clicking in a browser except one optional command. Do it once, ideally by 25 Oct.

## 1. What's already done

- GitHub: private repo `omsenjalia/guwahati-run` with all the code.
- Supabase: project created, SQL files run (`supabase/schema.sql`, `supabase/002_expenses.sql`, and `supabase/003_confirmed_trip.sql` for the prep checklist and receipts).
- `.env` in the repo holds every key the app needs (committed on purpose; the repo is private).

## 2. Put it online (Vercel, free)

1. Go to **vercel.com** and choose **Continue with GitHub**.
2. **Add New** → **Project** → find `guwahati-run` → **Import**.
3. Open **Environment Variables**. Open `.env` from the repo, copy everything, and paste it into the first Key box. Vercel splits it into separate variables.
4. Click **Deploy** and wait about 2 minutes.
5. Vercel shows your address, like `guwahati-run-xyz.vercel.app`. That's the app.

From now on, every change pushed to GitHub redeploys automatically.

## 2b. Receipts in GitHub

Bills, tickets, certificates and reports are saved in this repo's `documents/` folder (private). The app does it from the server with a token; phones never see it.

1. In Vercel: **Settings** → **Environment Variables**, add:
   - `GITHUB_RECEIPTS_TOKEN`: the fine-grained token (this repo only, Contents read and write)
   - `GITHUB_RECEIPTS_REPO`: `omsenjalia/guwahati-run`
2. **Deployments** → latest → **⋯** → **Redeploy**.
3. Check: **Team** → **System status** → **Data sources health** → "Receipts storage" is green.

Commits that only add files under `documents/` don't rebuild the site (`vercel.json`). Because the app commits to `main`, run `git pull` before pushing code from the laptop.

To replace the token (it expires): github.com → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → the token → **Regenerate token**, then paste the new value into Vercel and `.env.local`, and redeploy.

## 3. Switch on the automation

1. On your phone, open the Vercel address and sign in with the team passcode.
   This first sign-in tells Supabase where the app lives. Supabase then calls it every 5 minutes, so the app runs even when nobody has it open.
2. Wait 5 to 10 minutes, then open **Team** → **System status and data self-test** (bottom of the page).
3. Check that **Background jobs** shows green ticks with recent times.
4. Press **Run self-test**. All rows should be green. This proves ConfirmTkt answers from the cloud servers, not just from home internet.

If the jobs stay empty after 15 minutes, open Supabase → **SQL Editor** and run:

```sql
select base_url from private.app_config;
```

It should show your Vercel address. If it's empty, sign in on the phone once more.

## 4. Install on every phone

### Android (Chrome)
1. Open the Vercel address in **Chrome** and sign in.
2. Menu **⋮** → **Add to Home screen** (or **Install app**).
3. Open it from the home screen.

### iPhone (Safari, iOS 16.4 or newer)
1. Open the address in **Safari** and sign in.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open it from the home screen. Alerts only work from the home screen app on iPhone.

### Then, on each phone
1. **Team** → **Whose phone is this?** → tap your name.
2. **Team** → **Alerts on this phone** → **Turn on alerts** → **Allow**. You should get "Alerts are on".
3. Open every tab once with internet. The app saves a full offline copy.
4. Test offline: turn on airplane mode, close the app fully, reopen it. Everything should still show.

## 5. Fill in the blanks (any time, from your phone)

Edit `data/trip.ts` on github.com: open the file, tap the **pencil**, change, then **Commit changes**. Vercel redeploys in about 2 minutes.

- Each person's `phone`, `guardian` (name, relation, phone) and `role`.
- `PICKUP`: who collects you at Anand at 01:42 on 4 Nov.
- `TRANSFERS`: first-metro times (06:20 Ahmedabad, 05:30 Delhi are estimates) and fares.
- `EVENT_SCHEDULE` and `VENUE_NOTES`: update when the official schedule arrives (tbc items).
- `REPORT.teamName`: used in the report file name.

## 6. Share with parents

Send parents the Vercel address and the `PARENT_PASSCODE` (from `.env`). They land on a read-only page: where you are, the next arrival, delays and the latest check-ins. No PNRs and no money.

## 7. Calendar (optional)

**Timeline** → **Add to calendar** subscribes your phone's calendar. Times update by themselves as trains run late.

## Environment variables

| Name | What it's for | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Database address | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Phones connect to the database (reads nothing without a team sign-in) | Supabase → API Keys |
| `SUPABASE_SECRET_KEY` | Background jobs write data. Full access: server only | Supabase → API Keys |
| `TEAM_PASSCODE` | Passcode for the 4 of you | You choose |
| `PARENT_PASSCODE` | Passcode for the parent page | You choose |
| `AUTH_SECRET` | Signs the login cookie. Changing it signs everyone out | Random |
| `CALENDAR_TOKEN` | Secret part of the calendar link | Random |
| `CRON_SECRET` | Proves the 5-minute calls really come from Supabase | Random, also stored in the database by the SQL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications | Generated once |
| `GITHUB_RECEIPTS_TOKEN` | Saves receipts to GitHub. Server only, never committed (Vercel and `.env.local` only) | GitHub fine-grained token |
| `GITHUB_RECEIPTS_REPO` | Which repo: `omsenjalia/guwahati-run` | You |
| `NOTIFY_WEBHOOK_URL` (optional) | Copy of every alert to a webhook, for a future WhatsApp bridge | Later |

To change a passcode: edit `.env` on GitHub **and** the same variable in Vercel (Settings → Environment Variables), then redeploy.

## If something looks wrong

- **Red "Automatic updates stopped" banner**: open the System page. If no job ran recently, check Vercel is up and step 3.
- **"Live updates failing"**: ConfirmTkt didn't answer. The app keeps showing the last known data (marked stale) and keeps retrying every 5 minutes. A backup source can be added in `lib/providers/`.
- **Testing a moment of the trip**: add `?at=2026-10-29T04:00` to any address. `?at=off` goes back to real time.

## Before 25 Oct checklist

- [ ] Deployed on Vercel, self-test all green from the System page
- [ ] All 4 phones installed, names picked, alerts on, offline test passed
- [ ] Phone numbers, parents and pickup filled in
- [ ] DigiLocker set up on every phone (Aadhaar or driving licence)
- [ ] Paper backup printed (Team → Paper backup)
- [ ] HOD approval for the grant ticked in the Grant tab
- [ ] `supabase/003_confirmed_trip.sql` run, GitHub variables in Vercel, "Receipts storage" green
- [ ] All 5 e-tickets uploaded (Money → Add receipt → Ticket)
