# Graph Report - guwahati-run  (2026-10-19)

## Corpus Check
- 144 files · ~74,890 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 1118 nodes · 3968 edges · 43 communities (39 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5901ce2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- train.tsx
- money.tsx
- selftest/route.ts
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
- phases.ts
- trip-engine.ts
- report-pdf.ts
- time.ts
- sessionFrom
- CLAUDE.md
- features/trip.ts
- github.ts
- tsconfig.json
- PersonId
- weather.ts
- scripts
- serverDb
- data.ts
- devDependencies
- Guwahati Run: setup, deploy and install
- trip.test.ts
- lib/auth.ts
- vercel.json
- AGENTS.md
- serverDb
- T
- watchers.ts
- data/trip.ts
- trip-sync.ts
- (tabs)/index.tsx
- alerts.ts
- features/trip.ts
- confirmtkt.ts

## God Nodes (most connected - your core abstractions)
1. `T()` - 118 edges
2. `useTheme()` - 80 edges
3. `Card()` - 79 edges
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

## Communities (43 total, 4 thin omitted)

### Community 0 - "train.tsx"
Cohesion: 0.06
Nodes (61): PLACES, duration(), personBerth(), expo-haptics, expo-router, @expo/vector-icons, react-native, react-native-safe-area-context (+53 more)

### Community 1 - "money.tsx"
Cohesion: 0.13
Nodes (25): GRANT, rebookingLoss(), TEAM, DocRow, CATEGORIES, categoryLabel(), Expense, ExpenseCategory (+17 more)

### Community 2 - "selftest/route.ts"
Cohesion: 0.23
Nodes (13): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), NE_ALTERNATIVES (+5 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (39): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, typescript (+31 more)

### Community 4 - "tick.ts"
Cohesion: 0.11
Nodes (32): maxDuration, POST(), maxDuration, POST(), POST(), BERTH_TYPES, isDue(), JobName (+24 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, expo, expo-background-task, expo-build-properties, expo-constants, expo-document-picker, expo-file-system, expo-font (+32 more)

### Community 6 - "add-bill.tsx"
Cohesion: 0.10
Nodes (34): DocKind, expo-document-picker, expo-image-picker, expo-web-browser, DOC_NAMES, Kind, KINDS, styles (+26 more)

### Community 7 - "docs-server.ts"
Cohesion: 0.14
Nodes (25): GET(), GET(), maxDuration, DELETE(), maxDuration, PATCH(), maxDuration, POST() (+17 more)

### Community 8 - "app/_layout.tsx"
Cohesion: 0.23
Nodes (12): @expo-google-fonts/manrope, expo-splash-screen, expo-status-bar, react-native-url-polyfill, ErrorBoundary(), FeedSync(), RootLayout(), loadSession() (+4 more)

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (28): config, { getDefaultConfig }, eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript (+20 more)

### Community 11 - "print.tsx"
Cohesion: 0.27
Nodes (16): REMINDERS, evaluate(), maxWl(), minChance(), canBoard(), chartTime(), legBerths(), legPassengers() (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "phases.ts"
Cohesion: 0.12
Nodes (17): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, PlaceId, TRANSFERS, TRIP (+9 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.11
Nodes (25): GET(), Block, BLOCKS, buildSteps(), computeNow(), connectionStates(), instructionFor(), isHackathonMode() (+17 more)

### Community 15 - "report-pdf.ts"
Cohesion: 0.18
Nodes (20): defaultSummary(), reportTotals(), A4, appendix(), BuildInput, buildReport(), cover(), expenseTable() (+12 more)

### Community 16 - "time.ts"
Cohesion: 0.18
Nodes (12): EVENT, Entry, facts(), highlights(), linkedinPost(), xPost(), countdownParts(), dateKeyFmt (+4 more)

### Community 17 - "sessionFrom"
Cohesion: 0.15
Nodes (16): GET(), maxDuration, GET(), POST(), Table, TABLES, GET(), maxDuration (+8 more)

### Community 19 - "features/trip.ts"
Cohesion: 0.15
Nodes (15): LEGS, at(), bearing(), buildTrack(), cap(), dayLabel(), lateText(), nextAfter() (+7 more)

### Community 20 - "github.ts"
Cohesion: 0.22
Nodes (17): GET(), maxDuration, REPORT, config(), createFile(), deleteFile(), DOCS_ROOT, encodePath() (+9 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "PersonId"
Cohesion: 0.24
Nodes (9): GET(), GET(), PersonId, LegLive, effectiveLocations(), FRESH_MS, LocationRow, PersonLocation (+1 more)

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "serverDb"
Cohesion: 0.15
Nodes (26): DELETE(), fail(), maxDuration, PATCH(), POST(), station(), alertChange(), fetchWatch() (+18 more)

### Community 26 - "data.ts"
Cohesion: 0.14
Nodes (15): run(), checkIn(), CheckNow(), check(), runJobs(), Checkin, clock, clockOffset (+7 more)

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
Cohesion: 0.12
Nodes (21): GET(), Row, GET(), POST(), DELETE(), POST(), POST(), registerDeployUrl() (+13 more)

### Community 34 - "T"
Cohesion: 0.05
Nodes (158): claimDocuments(), grantEstimate(), storedChoice(), ago(), hhmm(), stamp(), weekdayDate(), watchTitle() (+150 more)

### Community 35 - "watchers.ts"
Cohesion: 0.11
Nodes (22): CONNECTIONS, Leg, REST_PLAN, TATKAL_BOOKER, TransferOption, Verdict, name(), rank() (+14 more)

### Community 36 - "data/trip.ts"
Cohesion: 0.10
Nodes (22): Berth, Connection, Deadline, DeadlineId, DEADLINES, DEMO_CHECKLIST, EVENT_SCHEDULE, FALLBACK_TRAINS (+14 more)

### Community 37 - "trip-sync.ts"
Cohesion: 0.70
Nodes (4): applyTrip(), isObj(), Obj, patchInPlace()

### Community 42 - "(tabs)/index.tsx"
Cohesion: 0.11
Nodes (29): USEFUL_NUMBERS, expo-constants, expo-location, Onboarding(), finish(), submit(), RouteDots(), styles (+21 more)

### Community 44 - "alerts.ts"
Cohesion: 0.15
Nodes (14): expo-background-task, expo-notifications, expo-secure-store, expo-task-manager, @react-native-async-storage/async-storage, edit(), onSignOut(), useRows() (+6 more)

### Community 45 - "features/trip.ts"
Cohesion: 0.16
Nodes (20): LegId, EMPTY_LIVE, LiveState, ECATERING_URL, istMidnight(), MEALS, MealStop, planMeals() (+12 more)

### Community 46 - "confirmtkt.ts"
Cohesion: 0.13
Nodes (25): addDays(), chance(), confirmtkt, CtAvail, CtLive, CtPnr, fetchLive(), getAvailability() (+17 more)

## Knowledge Gaps
- **25 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `typescript`, `@types/node` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 367 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `features/trip.ts` to `serverDb`, `package.json`, `features/trip.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `train.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06310958118187034 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `money.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `train.tsx` to `money.tsx`, `T`, `data/trip.ts`, `add-bill.tsx`, `app/_layout.tsx`, `package.json`, `(tabs)/index.tsx`, `print.tsx`, `alerts.ts`, `data.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._