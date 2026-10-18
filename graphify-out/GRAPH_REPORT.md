# Graph Report - guwahati-run  (2026-10-18)

## Corpus Check
- 97 files · ~46,756 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .example 1)

## Summary
- 829 nodes · 2431 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5f7d419`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ticket.tsx
- report-pdf.ts
- tick.ts
- backend/package.json
- lib/auth.ts
- dependencies
- data/trip.ts
- confirmtkt.ts
- features/trip.ts
- expo
- package.json
- watchers.ts
- compilerOptions
- phases.ts
- trip-engine.ts
- data.ts
- time.ts
- Guwahati Run: setup and deploy
- deadline-rules.ts
- upload.ts
- core/auth.ts
- tsconfig.json
- location.ts
- app/_layout.tsx
- scripts
- ticket-choice.ts
- devDependencies
- Guwahati Run
- metro.config.js
- vitest
- vercel.json
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `T()` - 54 edges
2. `useTheme()` - 53 edges
3. `serverDb()` - 45 edges
4. `ms()` - 33 edges
5. `hhmm()` - 27 edges
6. `Card()` - 27 edges
7. `dayMonth()` - 25 edges
8. `Home()` - 24 edges
9. `react-native` - 23 edges
10. `CoachView()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `uploadBill()` --calls--> `extFor()`  [EXTRACTED]
  src/features/upload.ts → backend/lib/documents.ts
- `Money()` --calls--> `reportRows()`  [EXTRACTED]
  src/app/(tabs)/money.tsx → backend/lib/report-data.ts
- `StatusHero()` --calls--> `ms()`  [EXTRACTED]
  src/app/(tabs)/index.tsx → backend/lib/time.ts
- `StatusHero()` --calls--> `hhmm()`  [EXTRACTED]
  src/app/(tabs)/index.tsx → backend/lib/time.ts
- `StepRow()` --calls--> `hhmm()`  [EXTRACTED]
  src/app/(tabs)/plan.tsx → backend/lib/time.ts

## Import Cycles
- None detected.

## Communities (33 total, 4 thin omitted)

### Community 0 - "ticket.tsx"
Cohesion: 0.07
Nodes (109): TEAM, USEFUL_NUMBERS, ago(), weekdayDate(), describeWeather(), expo-haptics, expo-router, @expo/vector-icons (+101 more)

### Community 1 - "report-pdf.ts"
Cohesion: 0.05
Nodes (75): GET(), GET(), DELETE(), maxDuration, PATCH(), maxDuration, POST(), maxDuration (+67 more)

### Community 2 - "tick.ts"
Cohesion: 0.05
Nodes (75): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), DELETE() (+67 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, web-push (+30 more)

### Community 4 - "lib/auth.ts"
Cohesion: 0.10
Nodes (28): POST(), maxDuration, POST(), POST(), GET(), attendeePassword(), enc, hmac() (+20 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, expo, expo-constants, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/manrope, expo-haptics (+27 more)

### Community 6 - "data/trip.ts"
Cohesion: 0.09
Nodes (27): GET(), Berth, Block, BLOCKS, Connection, DeadlineId, DEMO_CHECKLIST, EVENT_SCHEDULE (+19 more)

### Community 7 - "confirmtkt.ts"
Cohesion: 0.13
Nodes (26): addDays(), chance(), confirmtkt, CtAvail, CtLive, CtPnr, fetchLive(), getAvailability() (+18 more)

### Community 8 - "features/trip.ts"
Cohesion: 0.19
Nodes (25): Leg, storedChoice(), duration(), ms(), legBerths(), personBerth(), statusLine(), StopRow() (+17 more)

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.08
Nodes (25): eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript, main, name (+17 more)

### Community 11 - "watchers.ts"
Cohesion: 0.16
Nodes (22): REST_PLAN, TATKAL_BOOKER, TransferOption, TRANSFERS, buildBriefing(), name(), rank(), runWatchers() (+14 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "phases.ts"
Cohesion: 0.12
Nodes (16): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, EVENT, PlaceId, TRIP (+8 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.14
Nodes (17): computeNow(), instructionFor(), isHackathonMode(), istMidnight(), legHealth(), MAJOR_PRIORITY, MEALS, mealsFor() (+9 more)

### Community 15 - "data.ts"
Cohesion: 0.14
Nodes (15): expo-secure-store, @react-native-async-storage/async-storage, Checkin, clock, EMPTY, Feed, offset, Raw (+7 more)

### Community 16 - "time.ts"
Cohesion: 0.14
Nodes (13): ECATERING_URL, istMidnight(), MEALS, MealStop, planMeals(), StopTime, WaterStop, countdownParts() (+5 more)

### Community 17 - "Guwahati Run: setup and deploy"
Cohesion: 0.12
Nodes (15): 1. What's already done, 2. Put it online (Vercel, free), 2b. Receipts in GitHub, 3. Switch on the automation, 4. Install on every phone, 5. Fill in the blanks (any time, from your phone), 6. Share with parents, 7. Calendar (optional) (+7 more)

### Community 18 - "deadline-rules.ts"
Cohesion: 0.28
Nodes (14): CONNECTIONS, Deadline, DEADLINES, evaluate(), maxWl(), minChance(), Verdict, decideChoice() (+6 more)

### Community 19 - "upload.ts"
Cohesion: 0.18
Nodes (12): MAX_IMAGE_BYTES, MAX_PDF_BYTES, expo-file-system, expo-image-manipulator, AddBill(), save(), refresh(), newId() (+4 more)

### Community 20 - "core/auth.ts"
Cohesion: 0.22
Nodes (12): api(), currentSession(), onSignOut(), Role, savedSession(), Session, signOut(), signOutHooks (+4 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "location.ts"
Cohesion: 0.24
Nodes (8): expo-location, expo-task-manager, Fix, keepSendingWhileOpen(), LOCATION_TASK, send(), sendNow(), shareStatus

### Community 23 - "app/_layout.tsx"
Cohesion: 0.31
Nodes (8): @expo-google-fonts/manrope, expo-splash-screen, expo-status-bar, react-native-url-polyfill, FeedSync(), RootLayout(), loadSession(), useFeedSync()

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "ticket-choice.ts"
Cohesion: 0.33
Nodes (6): LegId, BACKUP, byId(), choiceText(), PRIMARY, TicketChoice

### Community 27 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, eslint, eslint-config-expo, @types/react, typescript, vitest

### Community 28 - "Guwahati Run"
Cohesion: 0.33
Nodes (5): Guwahati Run, Run locally, Structure, The one file you might edit, What it does

### Community 29 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, expo

## Knowledge Gaps
- **26 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `@types/node`, `@types/react` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ticket.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07174103237095363 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `ticket.tsx` to `features/trip.ts`, `package.json`, `data.ts`, `upload.ts`, `location.ts`, `app/_layout.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `report-pdf.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050669772859638904 - nodes in this community are weakly interconnected._
- **Why does `pdf-lib` connect `backend/package.json` to `report-pdf.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `tick.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05293383270911361 - nodes in this community are weakly interconnected._