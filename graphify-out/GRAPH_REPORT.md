# Graph Report - guwahati-run  (2026-10-19)

## Corpus Check
- 145 files · ~75,801 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 1125 nodes · 3998 edges · 58 communities (52 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `051b2c4d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- train.tsx
- report-data.ts
- delays/route.ts
- backend/package.json
- tick.ts
- dependencies
- add-bill.tsx
- docs-server.ts
- app/_layout.tsx
- expo
- package.json
- ticket.tsx
- compilerOptions
- phases.ts
- trip-engine.ts
- report-pdf.ts
- post.ts
- sessionFrom
- CLAUDE.md
- features/trip.ts
- github.ts
- tsconfig.json
- live-types.ts
- weather.ts
- scripts
- watches.tsx
- data.ts
- devDependencies
- Guwahati Run: setup, deploy and install
- trip.test.ts
- lib/auth.ts
- vercel.json
- AGENTS.md
- serverDb
- Card
- watchers.ts
- data/trip.ts
- (tabs)/index.tsx
- grant.tsx
- useTheme
- T
- radius
- onboarding/index.tsx
- hackathon.tsx
- core/auth.ts
- features/trip.ts
- useAuth
- print.tsx
- sos.tsx
- refresh
- transfer-planner.ts
- meal-planner.ts
- time.ts
- TEAM
- vitest
- tripData
- run

## God Nodes (most connected - your core abstractions)
1. `T()` - 119 edges
2. `useTheme()` - 82 edges
3. `Card()` - 80 edges
4. `Button()` - 59 edges
5. `serverDb()` - 54 edges
6. `Section()` - 52 edges
7. `ms()` - 48 edges
8. `hhmm()` - 44 edges
9. `useFeed()` - 44 edges
10. `useAuth()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `Settings()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/settings.tsx → backend/lib/auth.ts
- `Dev()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/tools/dev.tsx → backend/lib/auth.ts
- `TripFile()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/tools/trip-file.tsx → backend/lib/auth.ts
- `uploadBill()` --calls--> `extFor()`  [EXTRACTED]
  src/features/upload.ts → backend/lib/documents.ts
- `ExpenseItem()` --calls--> `categoryLabel()`  [EXTRACTED]
  src/app/(tabs)/money.tsx → backend/lib/expenses.ts

## Import Cycles
- None detected.

## Communities (58 total, 6 thin omitted)

### Community 0 - "train.tsx"
Cohesion: 0.12
Nodes (27): StepKind, expo-haptics, @expo/vector-icons, react-native, react-native-safe-area-context, CalendarRow(), Item, More() (+19 more)

### Community 1 - "report-data.ts"
Cohesion: 0.21
Nodes (13): LEGS, rebookingLoss(), CATEGORIES, categoryLabel(), Expense, ExpenseCategory, ClaimDoc, Expected (+5 more)

### Community 2 - "delays/route.ts"
Cohesion: 0.24
Nodes (9): cache, GET(), maxDuration, maxDuration, RoutePoint, ROUTES, BACKUPS, Delays (+1 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, typescript (+30 more)

### Community 4 - "tick.ts"
Cohesion: 0.14
Nodes (24): maxDuration, POST(), maxDuration, POST(), BERTH_TYPES, isDue(), JobName, JobResult (+16 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, expo, expo-background-task, expo-build-properties, expo-constants, expo-document-picker, expo-file-system, expo-font (+32 more)

### Community 6 - "add-bill.tsx"
Cohesion: 0.13
Nodes (23): expo-document-picker, expo-image-manipulator, expo-image-picker, expo-web-browser, AddBill(), DOC_NAMES, Form(), Kind (+15 more)

### Community 7 - "docs-server.ts"
Cohesion: 0.13
Nodes (27): GET(), GET(), maxDuration, DELETE(), maxDuration, PATCH(), maxDuration, POST() (+19 more)

### Community 8 - "app/_layout.tsx"
Cohesion: 0.23
Nodes (12): @expo-google-fonts/manrope, expo-splash-screen, expo-status-bar, react-native-url-polyfill, ErrorBoundary(), FeedSync(), RootLayout(), loadSession() (+4 more)

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (28): config, { getDefaultConfig }, eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript (+20 more)

### Community 11 - "ticket.tsx"
Cohesion: 0.27
Nodes (20): evaluate(), maxWl(), minChance(), dayMonth(), hhmm(), stamp(), canBoard(), chartTime() (+12 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "phases.ts"
Cohesion: 0.13
Nodes (15): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, PlaceId, TRIP, IIT_TO_KYQ_MIN (+7 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.14
Nodes (17): Block, BLOCKS, CONNECTIONS, ConnectionState, istMidnight(), legHealth(), legTitle(), MAJOR_PRIORITY (+9 more)

### Community 15 - "report-pdf.ts"
Cohesion: 0.14
Nodes (24): maxDuration, POST(), REPORT, DOCS_ROOT, defaultSummary(), legTimeline(), A4, appendix() (+16 more)

### Community 16 - "post.ts"
Cohesion: 0.48
Nodes (6): EVENT, Entry, facts(), highlights(), linkedinPost(), xPost()

### Community 17 - "sessionFrom"
Cohesion: 0.26
Nodes (11): GET(), GET(), POST(), Table, TABLES, GET(), PUT(), POST() (+3 more)

### Community 19 - "features/trip.ts"
Cohesion: 0.20
Nodes (16): at(), bearing(), buildTrack(), cap(), dayLabel(), lateText(), nextAfter(), Track (+8 more)

### Community 20 - "github.ts"
Cohesion: 0.19
Nodes (17): GET(), maxDuration, config(), createFile(), deleteFile(), encodePath(), gh(), githubConfigured() (+9 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "live-types.ts"
Cohesion: 0.14
Nodes (16): GET(), GET(), Berth, PersonId, PLACES, EMPTY_LIVE, LegLive, PassengerLive (+8 more)

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "watches.tsx"
Cohesion: 0.05
Nodes (72): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), DELETE() (+64 more)

### Community 26 - "data.ts"
Cohesion: 0.16
Nodes (15): Checkin, clearFeed(), clock, clockOffset, EMPTY, Feed, Raw, store (+7 more)

### Community 27 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, eslint, eslint-config-expo, @types/react, typescript, vitest

### Community 28 - "Guwahati Run: setup, deploy and install"
Cohesion: 0.13
Nodes (13): Code graph, Guwahati Run, Run locally, Structure, What it does, 1. Server (Vercel): two one-time changes, 2. Get the Android app, 3. First open, on each phone (+5 more)

### Community 29 - "trip.test.ts"
Cohesion: 0.12
Nodes (12): between(), byTrain, CACHE, here, index, km(), numbers, OUT (+4 more)

### Community 30 - "lib/auth.ts"
Cohesion: 0.14
Nodes (19): POST(), attendeePassword(), DEVELOPER, enc, hmac(), isPerson(), login(), Role (+11 more)

### Community 31 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, ignoreCommand, installCommand, $schema

### Community 33 - "serverDb"
Cohesion: 0.14
Nodes (20): GET(), Row, GET(), DELETE(), POST(), POST(), registerDeployUrl(), deriveSecret() (+12 more)

### Community 34 - "Card"
Cohesion: 0.10
Nodes (46): storedChoice(), BayDiagram(), ChoiceBanner(), Dev(), DevData, JOBS, JobsCard(), JsonEditor() (+38 more)

### Community 35 - "watchers.ts"
Cohesion: 0.22
Nodes (17): Verdict, buildBriefing(), name(), rank(), runWatchers(), Store, returnLeaveBy(), BACKUP (+9 more)

### Community 36 - "data/trip.ts"
Cohesion: 0.11
Nodes (18): Connection, Deadline, DeadlineId, DEMO_CHECKLIST, EVENT_SCHEDULE, INITIAL_EXPENSES, IRCTC_BOOK_URL, IRCTC_PNR_URL (+10 more)

### Community 37 - "(tabs)/index.tsx"
Cohesion: 0.16
Nodes (38): ago(), describeWeather(), Settings(), styles, CheckinCard(), checkpointLabel(), Home(), ShareCard() (+30 more)

### Community 38 - "grant.tsx"
Cohesion: 0.15
Nodes (21): claimDocuments(), Alert, Alerts(), ICON, loadAlerts(), Grant(), ReportCard(), rupees() (+13 more)

### Community 39 - "useTheme"
Cohesion: 0.16
Nodes (22): expectedReceipts(), expo-router, SPECS, TabsLayout(), VISIBLE, DocumentsCard(), ExpenseItem(), ICONS (+14 more)

### Community 40 - "T"
Cohesion: 0.22
Nodes (18): duration(), expo-linear-gradient, StepRow(), AvgDelay(), Legend(), PointRow(), Timetable(), Tracked() (+10 more)

### Community 41 - "radius"
Cohesion: 0.19
Nodes (12): react-native-webview, mapHtml(), MapPoint, MapView(), MapView(), radius, MapStation, trainMapHtml() (+4 more)

### Community 42 - "onboarding/index.tsx"
Cohesion: 0.25
Nodes (14): Choice(), Onboarding(), finish(), submit(), Point(), RouteDots(), Step, styles (+6 more)

### Community 43 - "hackathon.tsx"
Cohesion: 0.24
Nodes (13): weekdayDate(), BoardCard, COLUMNS, RestCard(), short(), Status, styles, onTicket() (+5 more)

### Community 44 - "core/auth.ts"
Cohesion: 0.12
Nodes (25): expo-background-task, expo-notifications, expo-secure-store, expo-task-manager, @react-native-async-storage/async-storage, selfTest(), api(), currentSession() (+17 more)

### Community 45 - "features/trip.ts"
Cohesion: 0.27
Nodes (10): ParsedStatus, coachKind(), coachList(), focusLeg(), isSeated(), lastPassed(), liveEnd(), liveStart() (+2 more)

### Community 46 - "useAuth"
Cohesion: 0.28
Nodes (11): Packing(), useAuth(), CheckItem, Checklist(), add(), cols(), EVERYONE, progress() (+3 more)

### Community 47 - "print.tsx"
Cohesion: 0.27
Nodes (10): DEADLINES, Leg, LiveState, legBerths(), personBerth(), esc(), paperHtml(), short() (+2 more)

### Community 48 - "sos.tsx"
Cohesion: 0.27
Nodes (10): USEFUL_NUMBERS, computeNow(), instructionFor(), expo-location, call(), LOST, Sos(), share() (+2 more)

### Community 49 - "refresh"
Cohesion: 0.24
Nodes (10): run(), checkIn(), CheckNow(), check(), edit(), runJobs(), refresh(), syncTrip() (+2 more)

### Community 51 - "transfer-planner.ts"
Cohesion: 0.28
Nodes (8): LegId, TransferOption, TRANSFERS, minutesOfDayIst(), plan(), toMin(), TransferPlan, Health

### Community 52 - "meal-planner.ts"
Cohesion: 0.25
Nodes (8): ECATERING_URL, istMidnight(), MEALS, MealStop, planMeals(), StopTime, WaterStop, HOUR

### Community 53 - "time.ts"
Cohesion: 0.29
Nodes (5): countdownParts(), dateKeyFmt, dayFmt, timeFmt, weekdayFmt

### Community 54 - "TEAM"
Cohesion: 0.33
Nodes (5): GRANT, TEAM, grantEstimate(), GrantLine, ReportRow

### Community 57 - "run"
Cohesion: 0.50
Nodes (4): add(), move(), remove(), run()

## Knowledge Gaps
- **25 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `typescript`, `@types/node` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 370 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `train.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12436974789915967 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `package.json`, `features/trip.ts`, `features/trip.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `train.tsx` to `Card`, `(tabs)/index.tsx`, `add-bill.tsx`, `useTheme`, `app/_layout.tsx`, `grant.tsx`, `package.json`, `onboarding/index.tsx`, `ticket.tsx`, `hackathon.tsx`, `core/auth.ts`, `print.tsx`, `sos.tsx`, `T`, `useAuth`, `radius`, `watches.tsx`, `data.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `tick.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._