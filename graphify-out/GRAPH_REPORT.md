# Graph Report - guwahati-run  (2026-10-19)

## Corpus Check
- 150 files · ~77,924 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 1148 nodes · 4132 edges · 52 communities (48 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c127aba`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- kit.tsx
- money.tsx
- core/auth.ts
- backend/package.json
- tick.ts
- dependencies
- add-bill.tsx
- docs-server.ts
- app/_layout.tsx
- expo
- package.json
- print.tsx
- compilerOptions
- data/trip.ts
- trip-engine.ts
- report-pdf.ts
- confirmtkt.ts
- sessionFrom
- CLAUDE.md
- react-native
- github.ts
- tsconfig.json
- locations.ts
- plan.tsx
- scripts
- watch-sync.ts
- data.ts
- devDependencies
- Guwahati Run: setup, deploy and install
- trip.test.ts
- lib/auth.ts
- vercel.json
- AGENTS.md
- serverDb
- T
- selftest/route.ts
- TEAM
- time.ts
- wallet.tsx
- train.tsx
- istDateKey
- radius
- onboarding/index.tsx
- live-track.ts
- alerts.ts
- useTheme
- checklist.tsx
- links.ts
- location.ts
- watchers.ts
- features/trip.ts

## God Nodes (most connected - your core abstractions)
1. `T()` - 121 edges
2. `useTheme()` - 83 edges
3. `Card()` - 81 edges
4. `Button()` - 61 edges
5. `serverDb()` - 58 edges
6. `Section()` - 53 edges
7. `ms()` - 50 edges
8. `hhmm()` - 45 edges
9. `useAuth()` - 45 edges
10. `useFeed()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `Settings()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/settings.tsx → backend/lib/auth.ts
- `TicketScreen()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/(tabs)/ticket.tsx → backend/lib/auth.ts
- `TrainScreen()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/(tabs)/train.tsx → backend/lib/auth.ts
- `Dev()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/tools/dev.tsx → backend/lib/auth.ts
- `TripFile()` --calls--> `isDeveloper()`  [EXTRACTED]
  src/app/tools/trip-file.tsx → backend/lib/auth.ts

## Import Cycles
- None detected.

## Communities (52 total, 4 thin omitted)

### Community 0 - "kit.tsx"
Cohesion: 0.18
Nodes (13): expo-haptics, @expo/vector-icons, CalendarRow(), Item, PARENT, TEAM, Check(), IconName (+5 more)

### Community 1 - "money.tsx"
Cohesion: 0.12
Nodes (28): GRANT, rebookingLoss(), DocRow, CATEGORIES, categoryLabel(), Expense, ExpenseCategory, ClaimDoc (+20 more)

### Community 2 - "core/auth.ts"
Cohesion: 0.16
Nodes (17): Check, GithubHealth, JobRun, JOBS, loadRuns(), selfTest(), api(), currentSession() (+9 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, typescript (+30 more)

### Community 4 - "tick.ts"
Cohesion: 0.12
Nodes (27): maxDuration, POST(), maxDuration, POST(), BERTH_TYPES, isDue(), JobName, JobResult (+19 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, expo, expo-background-task, expo-build-properties, expo-constants, expo-document-picker, expo-file-system, expo-font (+32 more)

### Community 6 - "add-bill.tsx"
Cohesion: 0.12
Nodes (28): Entry, expo-document-picker, expo-image-manipulator, expo-image-picker, expo-web-browser, DOC_NAMES, Form(), Kind (+20 more)

### Community 7 - "docs-server.ts"
Cohesion: 0.13
Nodes (26): GET(), GET(), maxDuration, DELETE(), maxDuration, PATCH(), maxDuration, POST() (+18 more)

### Community 8 - "app/_layout.tsx"
Cohesion: 0.23
Nodes (12): @expo-google-fonts/manrope, expo-splash-screen, expo-status-bar, react-native-url-polyfill, ErrorBoundary(), FeedSync(), RootLayout(), loadSession() (+4 more)

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (27): config, { getDefaultConfig }, eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript (+19 more)

### Community 11 - "print.tsx"
Cohesion: 0.17
Nodes (21): CONNECTIONS, Deadline, DEADLINES, Leg, REMINDERS, evaluate(), maxWl(), minChance() (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "data/trip.ts"
Cohesion: 0.07
Nodes (32): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, Connection, DeadlineId, DEMO_CHECKLIST (+24 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.13
Nodes (21): GET(), Block, BLOCKS, PLACES, buildSteps(), ConnectionState, istMidnight(), legHealth() (+13 more)

### Community 15 - "report-pdf.ts"
Cohesion: 0.17
Nodes (21): REPORT, defaultSummary(), legTimeline(), A4, appendix(), BuildInput, buildReport(), cover() (+13 more)

### Community 16 - "confirmtkt.ts"
Cohesion: 0.13
Nodes (25): addDays(), chance(), confirmtkt, CtAvail, CtLive, CtPnr, fetchLive(), getAvailability() (+17 more)

### Community 17 - "sessionFrom"
Cohesion: 0.23
Nodes (12): GET(), maxDuration, GET(), POST(), Table, TABLES, GET(), PUT() (+4 more)

### Community 19 - "react-native"
Cohesion: 0.42
Nodes (6): react-native-webview, mapHtml(), MapPoint, MapView(), MapView(), radius

### Community 20 - "github.ts"
Cohesion: 0.18
Nodes (18): GET(), maxDuration, config(), createFile(), deleteFile(), DOCS_ROOT, encodePath(), gh() (+10 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "locations.ts"
Cohesion: 0.31
Nodes (7): GET(), GET(), LegLive, effectiveLocations(), LocationRow, PersonLocation, tripData()

### Community 23 - "plan.tsx"
Cohesion: 0.20
Nodes (14): PersonId, mapsLink(), duration(), expo-linear-gradient, CLASS, DetailLine(), Details(), KIND (+6 more)

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "watch-sync.ts"
Cohesion: 0.15
Nodes (27): DELETE(), fail(), maxDuration, PATCH(), POST(), station(), alertChange(), fetchWatch() (+19 more)

### Community 26 - "data.ts"
Cohesion: 0.17
Nodes (13): Checkin, clearFeed(), clock, clockOffset, EMPTY, Feed, Raw, store (+5 more)

### Community 27 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, eslint, eslint-config-expo, @types/react, typescript, vitest

### Community 28 - "Guwahati Run: setup, deploy and install"
Cohesion: 0.13
Nodes (13): Code graph, Guwahati Run, Run locally, Structure, What it does, 1. Server (Vercel): two one-time changes, 2. Get the Android app, 3. First open, on each phone (+5 more)

### Community 29 - "trip.test.ts"
Cohesion: 0.10
Nodes (12): between(), byTrain, CACHE, here, index, km(), numbers, OUT (+4 more)

### Community 30 - "lib/auth.ts"
Cohesion: 0.14
Nodes (19): POST(), attendeePassword(), DEVELOPER, enc, hmac(), isPerson(), login(), Role (+11 more)

### Community 31 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, ignoreCommand, installCommand, $schema

### Community 33 - "serverDb"
Cohesion: 0.11
Nodes (23): GET(), Row, GET(), POST(), DELETE(), POST(), maxDuration, POST() (+15 more)

### Community 34 - "T"
Cohesion: 0.06
Nodes (152): claimDocuments(), grantEstimate(), PassengerLive, storedChoice(), ago(), hhmm(), stamp(), weekdayDate() (+144 more)

### Community 35 - "selftest/route.ts"
Cohesion: 0.21
Nodes (14): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), FALLBACK_TRAINS (+6 more)

### Community 36 - "TEAM"
Cohesion: 0.48
Nodes (6): EVENT, TEAM, facts(), highlights(), linkedinPost(), xPost()

### Community 37 - "time.ts"
Cohesion: 0.14
Nodes (14): ECATERING_URL, istMidnight(), MEALS, MealStop, planMeals(), StopTime, WaterStop, countdownParts() (+6 more)

### Community 38 - "wallet.tsx"
Cohesion: 0.19
Nodes (14): USEFUL_NUMBERS, react-native, react-native-safe-area-context, styles, call(), LOST, styles, Props (+6 more)

### Community 39 - "train.tsx"
Cohesion: 0.21
Nodes (15): Track, TrackPoint, AvgDelay(), Legend(), PointRow(), styles, TestRun, Tracked() (+7 more)

### Community 40 - "istDateKey"
Cohesion: 0.30
Nodes (12): cache, GET(), maxDuration, averageDelays(), loadRuns(), MAX_RUNS, runDelays(), SavedRun (+4 more)

### Community 41 - "radius"
Cohesion: 0.35
Nodes (6): MapStation, trainMapHtml(), TrainMap(), TrainMapProps, TrainMap(), TRAIN_MODEL_JS

### Community 42 - "onboarding/index.tsx"
Cohesion: 0.31
Nodes (12): Choice(), Onboarding(), finish(), submit(), Point(), RouteDots(), Step, styles (+4 more)

### Community 43 - "live-track.ts"
Cohesion: 0.30
Nodes (10): at(), bearing(), buildTrack(), cap(), dayLabel(), lateText(), nextAfter(), TrackState (+2 more)

### Community 44 - "alerts.ts"
Cohesion: 0.15
Nodes (14): expo-background-task, expo-notifications, expo-secure-store, expo-task-manager, @react-native-async-storage/async-storage, edit(), onSignOut(), syncTrip() (+6 more)

### Community 45 - "useTheme"
Cohesion: 0.26
Nodes (10): expo-router, SPECS, TabsLayout(), VISIBLE, ToolsLayout(), sharingState(), Divider(), FloatingTabBar() (+2 more)

### Community 46 - "checklist.tsx"
Cohesion: 0.29
Nodes (9): Packing(), CheckItem, Checklist(), add(), cols(), EVERYONE, progress(), short() (+1 more)

### Community 48 - "location.ts"
Cohesion: 0.19
Nodes (11): expo-location, allTrains, createStore(), useStore(), Fix, keepSendingWhileOpen(), LOCATION_TASK, send() (+3 more)

### Community 51 - "watchers.ts"
Cohesion: 0.14
Nodes (24): Berth, LegId, TransferOption, buildBriefing(), name(), rank(), runWatchers(), Store (+16 more)

### Community 52 - "features/trip.ts"
Cohesion: 0.16
Nodes (19): BACKUPS, LEGS, EMPTY_LIVE, FRESH_MS, ms(), instructionFor(), isHackathonMode(), ParsedStatus (+11 more)

## Knowledge Gaps
- **25 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `typescript`, `@types/node` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 373 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `wallet.tsx` to `kit.tsx`, `money.tsx`, `T`, `add-bill.tsx`, `train.tsx`, `app/_layout.tsx`, `radius`, `package.json`, `onboarding/index.tsx`, `print.tsx`, `alerts.ts`, `checklist.tsx`, `location.ts`, `react-native`, `plan.tsx`, `data.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `money.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `features/trip.ts` to `serverDb`, `istDateKey`, `package.json`, `live-track.ts`, `trip.test.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `tick.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12258064516129032 - nodes in this community are weakly interconnected._