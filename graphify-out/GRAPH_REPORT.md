# Graph Report - guwahati-run  (2026-10-18)

## Corpus Check
- 134 files · ~66,696 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 1057 nodes · 3791 edges · 40 communities (36 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `49f08a6a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ticket.tsx
- grant.tsx
- watch-sync.ts
- backend/package.json
- tick.ts
- dependencies
- print.tsx
- report-pdf.ts
- wallet.tsx
- expo
- package.json
- deadline-rules.ts
- compilerOptions
- phases.ts
- trip-engine.ts
- serverDb
- live-types.ts
- core/auth.ts
- CLAUDE.md
- ticket.tsx
- T
- tsconfig.json
- app/_layout.tsx
- weather.ts
- scripts
- notify.ts
- data.ts
- devDependencies
- Guwahati Run: setup, deploy and install
- trip-sync.ts
- location.tsx
- vercel.json
- AGENTS.md
- metro.config.js
- vitest
- watchers.ts
- bits.tsx
- time.ts
- (tabs)/index.tsx

## God Nodes (most connected - your core abstractions)
1. `T()` - 113 edges
2. `useTheme()` - 76 edges
3. `Card()` - 75 edges
4. `Button()` - 57 edges
5. `serverDb()` - 54 edges
6. `Section()` - 51 edges
7. `ms()` - 44 edges
8. `useAuth()` - 43 edges
9. `hhmm()` - 42 edges
10. `useFeed()` - 42 edges

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

## Communities (40 total, 4 thin omitted)

### Community 0 - "ticket.tsx"
Cohesion: 0.06
Nodes (71): expectedReceipts(), expo-haptics, expo-router, @expo/vector-icons, react-native, react-native-safe-area-context, react-native-webview, Choice() (+63 more)

### Community 1 - "grant.tsx"
Cohesion: 0.10
Nodes (38): GRANT, rebookingLoss(), claimDocuments(), grantEstimate(), GrantLine, csvCell(), defaultSummary(), fareCounts() (+30 more)

### Community 2 - "watch-sync.ts"
Cohesion: 0.06
Nodes (66): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), DELETE() (+58 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (39): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, typescript (+31 more)

### Community 4 - "tick.ts"
Cohesion: 0.17
Nodes (21): maxDuration, POST(), BERTH_TYPES, isDue(), JobResult, liveDue(), logged(), markStale() (+13 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, expo, expo-background-task, expo-constants, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/manrope (+31 more)

### Community 6 - "print.tsx"
Cohesion: 0.52
Nodes (6): DEADLINES, legBerths(), esc(), paperHtml(), short(), statusOf()

### Community 7 - "report-pdf.ts"
Cohesion: 0.05
Nodes (65): GET(), maxDuration, GET(), GET(), maxDuration, DELETE(), maxDuration, PATCH() (+57 more)

### Community 8 - "wallet.tsx"
Cohesion: 0.50
Nodes (7): onTicket(), seatFor(), TteScreen(), Wallet(), useRows(), openDoc(), useDocs()

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (26): eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript, main, name (+18 more)

### Community 11 - "deadline-rules.ts"
Cohesion: 0.32
Nodes (14): Deadline, evaluate(), maxWl(), minChance(), Verdict, duration(), canBoard(), chartTime() (+6 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "phases.ts"
Cohesion: 0.06
Nodes (33): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, Connection, DeadlineId, DEMO_CHECKLIST (+25 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.09
Nodes (32): GET(), Block, BLOCKS, CONNECTIONS, buildSteps(), computeNow(), ConnectionState, instructionFor() (+24 more)

### Community 15 - "serverDb"
Cohesion: 0.23
Nodes (11): GET(), POST(), DELETE(), POST(), POST(), POST(), registerDeployUrl(), deriveSecret() (+3 more)

### Community 16 - "live-types.ts"
Cohesion: 0.17
Nodes (13): Berth, EMPTY_LIVE, LegLive, LiveState, PassengerLive, ECATERING_URL, istMidnight(), MEALS (+5 more)

### Community 17 - "core/auth.ts"
Cohesion: 0.27
Nodes (9): currentSession(), Role, Session, signOutHooks, store, API_URL, SUPABASE_KEY, SUPABASE_URL (+1 more)

### Community 19 - "ticket.tsx"
Cohesion: 0.14
Nodes (29): BACKUPS, Leg, BACKUP, byId(), choiceText(), PRIMARY, storedChoice(), ms() (+21 more)

### Community 20 - "T"
Cohesion: 0.06
Nodes (120): Entry, facts(), highlights(), linkedinPost(), xPost(), ago(), stamp(), weekdayDate() (+112 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "app/_layout.tsx"
Cohesion: 0.16
Nodes (17): expo-background-task, @expo-google-fonts/manrope, expo-notifications, expo-splash-screen, expo-status-bar, expo-task-manager, react-native-url-polyfill, FeedSync() (+9 more)

### Community 23 - "weather.ts"
Cohesion: 0.17
Nodes (5): Place, Weather, describeWeather(), fetchWeather(), fetchWeatherMany()

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "notify.ts"
Cohesion: 0.19
Nodes (11): GET(), Row, Alert, AlertKind, Channel, channels, forParent(), PARENT_KINDS (+3 more)

### Community 26 - "data.ts"
Cohesion: 0.21
Nodes (10): Checkin, clock, EMPTY, Feed, offset, Raw, store, useLive() (+2 more)

### Community 27 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, eslint, eslint-config-expo, @types/react, typescript, vitest

### Community 28 - "Guwahati Run: setup, deploy and install"
Cohesion: 0.13
Nodes (13): Code graph, Guwahati Run, Run locally, Structure, What it does, 1. Server (Vercel): two one-time changes, 2. Get the Android app, 3. First open, on each phone (+5 more)

### Community 29 - "trip-sync.ts"
Cohesion: 0.70
Nodes (4): applyTrip(), isObj(), Obj, patchInPlace()

### Community 30 - "location.tsx"
Cohesion: 0.07
Nodes (43): POST(), GET(), POST(), Table, TABLES, GET(), PUT(), maxDuration (+35 more)

### Community 31 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, ignoreCommand, installCommand, $schema

### Community 33 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, expo

### Community 35 - "watchers.ts"
Cohesion: 0.18
Nodes (18): TransferOption, TRANSFERS, buildBriefing(), name(), rank(), runWatchers(), Store, returnLeaveBy() (+10 more)

### Community 36 - "bits.tsx"
Cohesion: 0.21
Nodes (24): PLACES, countdownParts(), dayMonth(), hhmm(), StatusHero(), Plan(), StepRow(), TransferCard() (+16 more)

### Community 40 - "time.ts"
Cohesion: 0.33
Nodes (4): dateKeyFmt, dayFmt, timeFmt, weekdayFmt

### Community 41 - "(tabs)/index.tsx"
Cohesion: 0.16
Nodes (20): USEFUL_NUMBERS, expo-constants, expo-location, Settings(), styles, checkpointLabel(), styles, savedSession() (+12 more)

## Knowledge Gaps
- **24 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `typescript`, `@types/node` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 347 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `ticket.tsx` to `grant.tsx`, `bits.tsx`, `print.tsx`, `report-pdf.ts`, `wallet.tsx`, `(tabs)/index.tsx`, `package.json`, `trip-engine.ts`, `ticket.tsx`, `T`, `app/_layout.tsx`, `data.ts`, `location.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ticket.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.061031664964249235 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `grant.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09568627450980392 - nodes in this community are weakly interconnected._
- **Why does `pdf-lib` connect `backend/package.json` to `grant.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `watch-sync.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05754385964912281 - nodes in this community are weakly interconnected._