# Graph Report - guwahati-run  (2026-10-18)

## Corpus Check
- 102 files · ~47,572 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .example 1)

## Summary
- 843 nodes · 2479 edges · 33 communities (30 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8ccad08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ticket.tsx
- report-pdf.ts
- watch-sync.ts
- backend/package.json
- tick.ts
- dependencies
- data/trip.ts
- report-pdf.ts
- deadline-rules.ts
- expo
- package.json
- watchers.ts
- compilerOptions
- phases.ts
- trip-engine.ts
- (tabs)/index.tsx
- time.ts
- confirmtkt.ts
- CLAUDE.md
- features/trip.ts
- selftest/route.ts
- tsconfig.json
- serverDb
- weather.ts
- scripts
- lib/auth.ts
- locations.ts
- devDependencies
- Guwahati Run: setup, deploy and install
- metro.config.js
- vitest
- vercel.json
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `T()` - 54 edges
2. `useTheme()` - 53 edges
3. `serverDb()` - 47 edges
4. `ms()` - 33 edges
5. `hhmm()` - 27 edges
6. `Card()` - 27 edges
7. `dayMonth()` - 25 edges
8. `react-native` - 24 edges
9. `Home()` - 24 edges
10. `CoachView()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Money()` --calls--> `reportRows()`  [EXTRACTED]
  src/app/(tabs)/money.tsx → backend/lib/report-data.ts
- `StatusHero()` --calls--> `ms()`  [EXTRACTED]
  src/app/(tabs)/index.tsx → backend/lib/time.ts
- `statusLine()` --calls--> `ms()`  [EXTRACTED]
  src/app/(tabs)/train.tsx → backend/lib/time.ts
- `TrainScreen()` --calls--> `ms()`  [EXTRACTED]
  src/app/(tabs)/train.tsx → backend/lib/time.ts
- `legTimes()` --calls--> `ms()`  [EXTRACTED]
  src/features/bits.tsx → backend/lib/time.ts

## Import Cycles
- None detected.

## Communities (33 total, 3 thin omitted)

### Community 0 - "ticket.tsx"
Cohesion: 0.08
Nodes (80): countdownParts(), dayMonth(), duration(), hhmm(), expo-haptics, expo-router, @expo/vector-icons, react-native (+72 more)

### Community 1 - "report-pdf.ts"
Cohesion: 0.11
Nodes (31): GRANT, rebookingLoss(), REPORT, TEAM, GrantLine, csvCell(), defaultSummary(), fareCounts() (+23 more)

### Community 2 - "watch-sync.ts"
Cohesion: 0.15
Nodes (27): DELETE(), fail(), maxDuration, PATCH(), POST(), station(), alertChange(), fetchWatch() (+19 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, pdf-lib, react, react-dom, @supabase/supabase-js, web-push (+30 more)

### Community 4 - "tick.ts"
Cohesion: 0.16
Nodes (23): maxDuration, POST(), BERTH_TYPES, isDue(), JobName, JobResult, liveDue(), logged() (+15 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, expo, expo-constants, expo-document-picker, expo-file-system, expo-font, @expo-google-fonts/manrope, expo-haptics (+27 more)

### Community 6 - "data/trip.ts"
Cohesion: 0.09
Nodes (24): Block, BLOCKS, Connection, Deadline, DeadlineId, DEMO_CHECKLIST, EVENT_SCHEDULE, INITIAL_EXPENSES (+16 more)

### Community 7 - "report-pdf.ts"
Cohesion: 0.06
Nodes (51): GET(), GET(), DELETE(), maxDuration, PATCH(), maxDuration, POST(), commitMessage() (+43 more)

### Community 8 - "deadline-rules.ts"
Cohesion: 0.21
Nodes (22): Berth, DEADLINES, IRCTC_BOOK_URL, IRCTC_PNR_URL, evaluate(), maxWl(), minChance(), canBoard() (+14 more)

### Community 9 - "expo"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, permissions, predictiveBackGestureEnabled (+17 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (27): eslint, react, react-dom, @supabase/supabase-js, @types/react, typescript, main, name (+19 more)

### Community 11 - "watchers.ts"
Cohesion: 0.14
Nodes (16): BACKUPS, CONNECTIONS, Leg, REST_PLAN, TATKAL_BOOKER, Verdict, name(), rank() (+8 more)

### Community 12 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 13 - "phases.ts"
Cohesion: 0.12
Nodes (17): EXPLORE, EXPLORE_RETURN_MARGIN_MIN, ExploreSpot, STATION_GUIDES, StationGuide, EVENT, PlaceId, TRIP (+9 more)

### Community 14 - "trip-engine.ts"
Cohesion: 0.11
Nodes (26): GET(), EMPTY_LIVE, LegLive, LiveState, PassengerLive, buildSteps(), computeNow(), connectionStates() (+18 more)

### Community 15 - "(tabs)/index.tsx"
Cohesion: 0.06
Nodes (84): PersonId, USEFUL_NUMBERS, PersonLocation, ago(), weekdayDate(), describeWeather(), @expo-google-fonts/manrope, expo-splash-screen (+76 more)

### Community 16 - "time.ts"
Cohesion: 0.22
Nodes (9): LegId, ECATERING_URL, istMidnight(), MEALS, MealStop, planMeals(), StopTime, WaterStop (+1 more)

### Community 17 - "confirmtkt.ts"
Cohesion: 0.13
Nodes (26): addDays(), chance(), confirmtkt, CtAvail, CtLive, CtPnr, fetchLive(), getAvailability() (+18 more)

### Community 19 - "features/trip.ts"
Cohesion: 0.31
Nodes (12): LEGS, storedChoice(), ms(), TicketScreen(), coachList(), focusLeg(), isSeated(), liveEnd() (+4 more)

### Community 20 - "selftest/route.ts"
Cohesion: 0.20
Nodes (14): Check, dmy(), GET(), timed(), Alternative, dmy(), GET(), FALLBACK_TRAINS (+6 more)

### Community 21 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): expo/tsconfig.base.json, compilerOptions, allowImportingTsExtensions, noEmit, paths, strict, exclude, extends (+4 more)

### Community 22 - "serverDb"
Cohesion: 0.15
Nodes (18): GET(), Row, DELETE(), POST(), maxDuration, POST(), Alert, AlertKind (+10 more)

### Community 23 - "weather.ts"
Cohesion: 0.18
Nodes (4): Place, Weather, fetchWeather(), fetchWeatherMany()

### Community 24 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, android, graph, lint, start, test, typecheck, web

### Community 25 - "lib/auth.ts"
Cohesion: 0.13
Nodes (21): POST(), POST(), registerDeployUrl(), attendeePassword(), deriveSecret(), enc, hmac(), isPerson() (+13 more)

### Community 26 - "locations.ts"
Cohesion: 0.19
Nodes (11): POST(), GET(), sessionFrom(), effectiveLocations(), FRESH_MS, LocationRow, dateKeyFmt, dayFmt (+3 more)

### Community 27 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, eslint, eslint-config-expo, @types/react, typescript, vitest

### Community 28 - "Guwahati Run: setup, deploy and install"
Cohesion: 0.13
Nodes (13): Code graph, Guwahati Run, Run locally, Structure, What it does, 1. Server (Vercel): two one-time changes, 2. Get the Android app, 3. First open, on each phone (+5 more)

### Community 29 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, expo

### Community 31 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, framework, ignoreCommand, installCommand, $schema

## Knowledge Gaps
- **26 isolated node(s):** `@supabase/supabase-js`, `react`, `react-dom`, `@types/node`, `@types/react` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 309 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `@supabase/supabase-js`, `react`, `react-dom` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ticket.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07732784259894761 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `ticket.tsx` to `deadline-rules.ts`, `package.json`, `report-pdf.ts`, `(tabs)/index.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `report-pdf.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11382113821138211 - nodes in this community are weakly interconnected._
- **Why does `pdf-lib` connect `backend/package.json` to `report-pdf.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `watch-sync.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14623655913978495 - nodes in this community are weakly interconnected._