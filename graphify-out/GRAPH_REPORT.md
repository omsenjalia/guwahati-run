# Graph Report - guwahati-run  (2026-10-19)

## Corpus Check
- 143 files · ~74,515 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 1112 nodes · 3953 edges · 54 communities (50 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fa76f05d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kit.tsx
- grant.tsx
- selftest/route.ts
- backend/package.json
- tick.ts
- dependencies
- add-bill.tsx
- docs-server.ts
- checklist.tsx
- expo
- package.json
- ticket.tsx
- compilerOptions
- phases.ts
- trip-engine.ts
- LEGS
- time.ts
- core/auth.ts
- CLAUDE.md
- features/trip.ts
- (tabs)/index.tsx
- tsconfig.json
- report-data.ts
- weather.ts
- scripts
- serverDb
- data.ts
- devDependencies
- Guwahati Run: setup, deploy and install
- trip.test.ts
- location.tsx
- vercel.json
- AGENTS.md
- serverDb
- Page
- watchers.ts
- T
- github.ts
- print.tsx
- grant.tsx
- useTheme
- ref_react
- onboarding/index.tsx
- Card
- location.ts
- features/trip.ts
- confirmtkt.ts
- locations.ts
- index.ts
- wallet.tsx
- trip-sync.ts
- run
- PaperBackup

## God Nodes (most connected - your core abstractions)
1. `T()` - 117 edges
2. `Card()` - 78 edges
3. `useTheme()` - 78 edges
4. `Button()` - 59 edges
5. `serverDb()` - 54 edges
6. `Section()` - 52 edges
7. `ms()` - 48 edges
8. `hhmm()` - 44 edges
9. `useFeed()` - 44 edges
10. `useAuth()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `t()` --calls--> `ms()`  [EXTRACTED]
  src/features/track.test.ts → backend/lib/time.ts
- `Settings()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/settings.tsx → backend/lib/auth.ts
- `Dev()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/tools/dev.tsx → backend/lib/auth.ts
- `TripFile()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/tools/trip-file.tsx → backend/lib/auth.ts
- `uploadBill()` --calls--> `extFor()`  [EXTRACTED]
  src/features/upload.ts → backend/lib/documents.ts

## Import Cycles
- None detected.

## Communities (54 total, 4 thin omitted)

### Community 0 - "kit.tsx"
Cohesion: 0.12
Nodes (29): expo-haptics, @expo/vector-icons, react-native, CalendarRow(), Item, More(), PARENT, TEAM (+21 more)

### Community 1 - "grant.tsx"
Cohesion: 0.18
Nodes (18): A4, appendix(), BuildInput, buildReport(), cover(), expenseTable(), fetchAll(), GREY (+10 more)

### Community 2 - "selftest/route.ts"
Cohesion: 0.21
Nodes (14): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), FALLBACK_TRAINS (+6 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, typescript (+30 more)

### Community 4 - "tick.ts"
Cohesion: 0.14
Nodes (24): maxDuration, POST(), maxDuration, POST(), Berth, BERTH_TYPES, isDue(), JobName (+16 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, expo, expo-background-task, expo-constants, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/manrope (+31 more)

### Community 6 - "add-bill.tsx"
Cohesion: 0.16
Nodes (16): CATEGORIES, expo-document-picker, expo-image-manipulator, expo-image-picker, DOC_NAMES, Kind, KINDS, styles (+8 more)

### Community 7 - "docs-server.ts"
Cohesion: 0.13
Nodes (27): GET(), GET(), maxDuration, DELETE(), maxDuration, PATCH(), maxDuration, POST() (+19 more)

### Community 8 - "checklist.tsx"
Cohesion: 0.28
Nodes (8): db, useRows(), CheckItem, cols(), EVERYONE, progress(), short(), useChecklist()

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (26): config, { getDefaultConfig }, eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript (+18 more)

### Community 11 - "ticket.tsx"
Cohesion: 0.25
Nodes (20): DEADLINES, evaluate(), maxWl(), minChance(), canBoard(), chartTime(), legPassengers(), legSituation() (+12 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "phases.ts"
Cohesion: 0.14
Nodes (15): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, PlaceId, IIT_TO_KYQ_MIN, inFreeTime() (+7 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.11
Nodes (25): GET(), Block, BLOCKS, CONNECTIONS, buildSteps(), ConnectionState, connectionStates(), instructionFor() (+17 more)

### Community 15 - "LEGS"
Cohesion: 0.19
Nodes (11): maxDuration, POST(), REPORT, DocRow, Expense, ExpenseCategory, DOCS_ROOT, ClaimDoc (+3 more)

### Community 16 - "time.ts"
Cohesion: 0.16
Nodes (15): POST(), countdownParts(), dateKeyFmt, dayFmt, duration(), MIN, timeFmt, weekdayFmt (+7 more)

### Community 17 - "core/auth.ts"
Cohesion: 0.24
Nodes (12): expo-web-browser, selfTest(), api(), currentSession(), signOut(), signOutHooks, store, API_URL (+4 more)

### Community 19 - "features/trip.ts"
Cohesion: 0.20
Nodes (14): Leg, at(), bearing(), buildTrack(), cap(), dayLabel(), lateText(), nextAfter() (+6 more)

### Community 20 - "(tabs)/index.tsx"
Cohesion: 0.16
Nodes (32): USEFUL_NUMBERS, ago(), computeNow(), describeWeather(), react-native-safe-area-context, Settings(), styles, CheckinCard() (+24 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "report-data.ts"
Cohesion: 0.24
Nodes (11): GRANT, rebookingLoss(), TEAM, GrantLine, csvCell(), fareCounts(), legTimeline(), reportCsv() (+3 more)

### Community 23 - "weather.ts"
Cohesion: 0.17
Nodes (5): Place, syncWeather(), Weather, fetchWeather(), fetchWeatherMany()

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "serverDb"
Cohesion: 0.11
Nodes (38): DELETE(), fail(), maxDuration, PATCH(), POST(), station(), alertChange(), fetchWatch() (+30 more)

### Community 26 - "data.ts"
Cohesion: 0.21
Nodes (10): Checkin, clock, clockOffset, EMPTY, Feed, Raw, store, useLive() (+2 more)

### Community 27 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, eslint, eslint-config-expo, @types/react, typescript, vitest

### Community 28 - "Guwahati Run: setup, deploy and install"
Cohesion: 0.13
Nodes (13): Code graph, Guwahati Run, Run locally, Structure, What it does, 1. Server (Vercel): two one-time changes, 2. Get the Android app, 3. First open, on each phone (+5 more)

### Community 29 - "trip.test.ts"
Cohesion: 0.09
Nodes (13): between(), byTrain, CACHE, here, index, km(), numbers, OUT (+5 more)

### Community 30 - "location.tsx"
Cohesion: 0.08
Nodes (34): POST(), GET(), maxDuration, GET(), POST(), Table, TABLES, GET() (+26 more)

### Community 31 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, ignoreCommand, installCommand, $schema

### Community 33 - "serverDb"
Cohesion: 0.13
Nodes (20): GET(), Row, GET(), DELETE(), POST(), POST(), registerDeployUrl(), deriveSecret() (+12 more)

### Community 34 - "Page"
Cohesion: 0.11
Nodes (30): AddBill(), Form(), run(), PickTile(), checkIn(), CheckNow(), check(), Alert (+22 more)

### Community 35 - "watchers.ts"
Cohesion: 0.08
Nodes (40): BACKUPS, Connection, Deadline, DeadlineId, DEMO_CHECKLIST, EVENT_SCHEDULE, INITIAL_EXPENSES, IRCTC_BOOK_URL (+32 more)

### Community 36 - "T"
Cohesion: 0.16
Nodes (38): storedChoice(), hhmm(), stamp(), Plan(), StepRow(), TransferCard(), Alternatives(), ChoiceBanner() (+30 more)

### Community 37 - "github.ts"
Cohesion: 0.29
Nodes (14): GET(), config(), createFile(), deleteFile(), encodePath(), gh(), githubConfigured(), GitHubError (+6 more)

### Community 38 - "print.tsx"
Cohesion: 0.21
Nodes (14): EVENT, PLACES, REMINDERS, Entry, facts(), highlights(), linkedinPost(), xPost() (+6 more)

### Community 39 - "grant.tsx"
Cohesion: 0.23
Nodes (12): claimDocuments(), grantEstimate(), defaultSummary(), expo-file-system, expo-sharing, Grant(), ReportCard(), rupees() (+4 more)

### Community 40 - "useTheme"
Cohesion: 0.16
Nodes (22): expectedReceipts(), expo-router, SPECS, TabsLayout(), VISIBLE, DocumentsCard(), ExpenseItem(), ICONS (+14 more)

### Community 41 - "ref_react"
Cohesion: 0.33
Nodes (7): react-native-webview, MapStation, trainMapHtml(), TrainMap(), TrainMapProps, TrainMap(), TRAIN_MODEL_JS

### Community 42 - "onboarding/index.tsx"
Cohesion: 0.12
Nodes (28): TRIP, expo-linear-gradient, Choice(), Onboarding(), finish(), submit(), Point(), RouteDots() (+20 more)

### Community 43 - "Card"
Cohesion: 0.15
Nodes (27): BayDiagram(), Dev(), DevData, JOBS, JobsCard(), JsonEditor(), run(), LiveTestCard() (+19 more)

### Community 44 - "location.ts"
Cohesion: 0.11
Nodes (26): expo-background-task, @expo-google-fonts/manrope, expo-location, expo-notifications, expo-splash-screen, expo-status-bar, expo-task-manager, react-native-url-polyfill (+18 more)

### Community 45 - "features/trip.ts"
Cohesion: 0.17
Nodes (19): LegId, PersonId, EMPTY_LIVE, ECATERING_URL, istMidnight(), MEALS, MealStop, planMeals() (+11 more)

### Community 46 - "confirmtkt.ts"
Cohesion: 0.21
Nodes (15): addDays(), chance(), CtAvail, CtLive, CtPnr, fetchLive(), getAvailability(), getJson() (+7 more)

### Community 47 - "locations.ts"
Cohesion: 0.27
Nodes (8): GET(), GET(), LegLive, effectiveLocations(), FRESH_MS, LocationRow, PersonLocation, tripData()

### Community 48 - "index.ts"
Cohesion: 0.24
Nodes (10): confirmtkt, PROVIDERS, Sourced, Availability, AvailabilityQuery, BerthCode, LiveRunningStatus, PnrPassenger (+2 more)

### Community 49 - "wallet.tsx"
Cohesion: 0.62
Nodes (6): weekdayDate(), onTicket(), TteScreen(), Wallet(), openDoc(), trainLegs()

### Community 51 - "trip-sync.ts"
Cohesion: 0.70
Nodes (4): applyTrip(), isObj(), Obj, patchInPlace()

### Community 52 - "run"
Cohesion: 0.50
Nodes (4): add(), move(), remove(), run()

## Knowledge Gaps
- **24 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `typescript`, `@types/node` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 365 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `trip.test.ts` to `serverDb`, `package.json`, `features/trip.ts`, `features/trip.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `kit.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `kit.tsx` to `Page`, `T`, `add-bill.tsx`, `grant.tsx`, `useTheme`, `print.tsx`, `package.json`, `onboarding/index.tsx`, `location.ts`, `ticket.tsx`, `Card`, `checklist.tsx`, `time.ts`, `wallet.tsx`, `ref_react`, `(tabs)/index.tsx`, `serverDb`, `data.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `tick.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13675213675213677 - nodes in this community are weakly interconnected._