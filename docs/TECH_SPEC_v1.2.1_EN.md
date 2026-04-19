# Voxora Technical Specification

**Applies to: v1.3.0**  
**Audience: engineering and implementation — architecture, modules, data flow, operations**

*Chinese edition: [TECH_SPEC_v1.2.1.md](./TECH_SPEC_v1.2.1.md)*

---

## 1. Repository and runtime

| Item | Notes |
|------|--------|
| Shape | **pnpm workspace monorepo** |
| `client/` | **Expo SDK 54** + **Expo Router** + React Native; styling mainly **Uniwind + Tailwind** (`client/global.css`) |
| `server/` | **Node.js + Express**, REST prefix **`/api/v1`** |
| Root `package.json` | Aggregates scripts (e.g. `lint`); **keep semver aligned** with **`version` in `client/app.config.ts`** (currently v1.3.0) |

Typical local dev: **`coze dev`** or per-package scripts per repo rules; production build flows live under `.cozeproj` / `README.md` (**do not edit** Coze-injected `.cozeproj` / `.coze` mechanics).

---

## 2. Frontend (`client`)

### 2.1 Routing

- **Root stack**: `client/app/_layout.tsx`  
  - Mostly `headerShown: false`; some routes use modal `presentation`.  
  - Meet-the-Future full-screen route: **`meet-future-detail`**.  
- **Tabs**: `client/app/(tabs)/_layout.tsx`  
  - `index` (home), `family`, `moments`, `profile`; center **`add-placeholder`** hosts custom **AddButton** (add menu + **tab-level voice commands**).

### 2.2 Safe routing and params

- `useSafeRouter` / `useSafeSearchParams` (`client/hooks/useSafeRouter.ts`): params travel as **Base64-wrapped JSON** so `push` and `useLocalSearchParams` stay consistent and survive special characters.  
- **Meet the Future detail** receives `planId` (and similar) into `MeetFutureDetailScreen`.

### 2.3 Home and the “dual card”

- Implementation: `client/screens/home/index.tsx`.  
- **Time Gallery**: `FlatList` of memory nodes; `ListFooterComponent` pads for the tab bar (`useBottomTabBarHeight`, etc.).  
- **Meet the Future**: `MeetFuturePanel` (`client/components/MeetFuturePanel.tsx`) embedded on the same screen; local `corridorTab` toggles `memories` / `future`.  
- `MeetFuturePanel` uses **`useFocusEffect`** to **`loadFuturePlans()`** when the tab gains focus so titles do not stay stale after returning from detail.

### 2.4 Meet the Future: local data model

- Module: `client/utils/meetFutureStorage.ts`  
- **AsyncStorage** key: `voxora_meet_future_plans_v1`  
- Types (summary):  
  - `FuturePlan`: `id`, `kind` (`trip` | `birthday` | `party` | `gathering`), `title`, `dateLabel`, `status` (`brainstorm` | `locked`), optional `entries`, `summary`, `summaryUpdatedAt`  
  - `FuturePlanEntry`: `authorLabel`, `text`, `source` (`text` | `voice`), `createdAt`, `id`  
- Helpers: `loadFuturePlans`, `saveFuturePlans`, `getFuturePlanById`, `updateFuturePlan`.

### 2.5 Detail screen and summarize

- Screen: `client/screens/meet-future-detail/index.tsx`  
- Route file: `client/app/meet-future-detail.tsx` → default export of the screen above.  
- **Messages**: `updateFuturePlan` appends `entries`; voice uses **`VoiceInput` `mode="transcribe"`** → `source: 'voice'`.  
- **Summarize**: `POST ${getBackendBaseUrl()}/api/v1/future-plans/summarize` with JSON `title`, `kind` (already localized display string), `entries` (`authorLabel` + `text`). On success, persist `summary` / `summaryUpdatedAt`.  
- **Title edit**: `updateFuturePlan` updates `title` locally; the stack’s **native title** may still show i18n `home.futureDetailTitle` (independent of card title — can be unified later if product wants).

### 2.6 Backend base URL

- `client/utils/backend.ts` — `getBackendBaseUrl()`  
  - Handles **`EXPO_PUBLIC_BACKEND_BASE_URL`**, Coze case where **`EXPO_PACKAGER_PROXY_URL` shares the API origin** so Metro is not mistaken for the API host, etc. — see inline comments.

### 2.7 i18n

- `client/locales/i18n.ts`: `zh-CN`, `en`, `hi`; keys grouped under `home.*`, `tab.*`, etc.

### 2.8 Static analysis

```bash
npm run lint              # client + server
npm run lint:client       # client only
npm run lint:server       # server only
```

---

## 3. Backend (`server`)

### 3.1 Boot and configuration

- Entry: `server/src/index.ts`  
- **Env load order (important)**: `server/src/load-env.ts` loads `server/.env` first, then **repo root `.env` with override**, so keys resolve regardless of `process.cwd()`.

### 3.2 Mounted routes (selected)

| Prefix | Module | Role |
|--------|--------|------|
| `/api/v1/health` | inline | `summarize.gemini` / `localLlm`, `supabase` / whether memories list uses service role, etc. |
| `/api/v1/memories` | `routes/memories` | Memories CRUD, summaries, … |
| `/api/v1/families` | `routes/families` | Families |
| `/api/v1/pets` | `routes/pets` | Pets |
| `/api/v1/vlogs` | `routes/vlogs` | Vlogs |
| `/api/v1/voice` | `routes/voice` | Voice |
| `/api/v1/upload` | `routes/upload` | Uploads; without object storage, files land under `data/local-uploads/...` and are served statically |
| `/api/v1/video` | `routes/video` | Video |
| **`/api/v1/future-plans`** | **`routes/future-plans`** | **Meet the Future: list GET/PUT + summarize POST** |

### 3.2.1 Meet the Future: list sync (v1.3.0+)

- **`GET /api/v1/future-plans`**: `{ ok: true, plans }` from **`server/data/future-plans/plans.json`** (under `server/data/`, gitignored).  
- **`PUT /api/v1/future-plans`**: body `{ plans }`, light validation, full-file overwrite.  
- **Client**: `syncFuturePlansWithServer()` on tab/detail focus; if server is empty and device has cards, **PUT seeds the server**; each `saveFuturePlans` **async PUT** (failures ignored offline). **Multi-device MVP**: when the server has data, it wins and overwrites local AsyncStorage.

### 3.3 `POST /api/v1/future-plans/summarize`

- Implementation: `server/src/routes/future-plans.ts`  
- Body (JSON):  
  - `title`: required string  
  - `kind`: optional, folded into the Gemini prompt  
  - `entries`: `{ authorLabel?, text? }[]`  
- Behavior:  
  1. If **`isGeminiSummarizeConfigured()`**: **`geminiGenerateFreeform`** (`server/src/lib/gemini-summarize.ts`) with a fixed **Chinese** Markdown section layout; success → `{ ok: true, summary, source: 'gemini' }`.  
  2. If Gemini is off or throws: **fallback** `buildLocalSummary` → `{ ok: true, summary, source: 'local' }`.  
- Gemini env: `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`; optional `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`.

### 3.4 Other AI and storage

- `gemini-summarize.ts` backs memory summaries and **freeform** generation.  
- `local-llm-summarize`, `supabase`, etc. tie into memory list/summary; `/api/v1/health` is a quick config probe.

---

## 4. Data flow (Meet the Future)

```
[MeetFuturePanel / Detail]
       │ read/write
       ▼
AsyncStorage (voxora_meet_future_plans_v1)
       │ on summarize
       ▼
POST /api/v1/future-plans/summarize
       │ Gemini or local template
       ▼
Write FuturePlan.summary (+ summaryUpdatedAt)
```

---

## 5. Build, release, and ops

- **Expo / EAS**: `version` and EAS `projectId` in `client/app.config.ts`; device builds use `scripts/eas-build-ios.sh`.  
- **iOS distribution (recommended)**: `client/eas.json` **`production`** sets **`ios.distribution` to `store`**. `./scripts/eas-build-ios.sh` (defaults to `production`) runs **`eas submit --platform ios --latest`** automatically after a successful **cloud** build; use **`--no-submit`** or **`EAS_IOS_NO_SUBMIT=1`** to build only. Testers install via **TestFlight** (no per-device UDID). **`preview`** (`distribution: internal`) is optional; see `docs/ios-eas-joint-testing.md`.  
- **Deploy**: `scripts/voxora-deploy.sh` (and similar) for public IP / backend URL export — follow script comments.  
- **Logs**: `logs/server.log` when your launcher redirects stdout there.

---

## 6. Security and compliance

- **Never commit `.env` or API keys**; use secret managers or injection in production.  
- **Meet the Future** is **device-local** today; multi-device sync and ACLs need a separate design if you productize.  
- `upload` + `usesCleartextTraffic` are common for LAN dev; tighten **HTTPS** and **network security** before store submission.

---

## 7. Versioning and doc maintenance

- Keep this file aligned with **release tags** (e.g. `语音识别真机ok` / `v1.3.0`) and **`version` in `package.json` / `client/app.config.ts`**.  
- When behavior changes, update this spec, `USER_MANUAL_v1.2.1_EN.md` / `USER_MANUAL_v1.2.1.md` (or the next versioned filenames), and `CHANGELOG` if your team uses one.

---

## 8. Path index

| Topic | Path |
|--------|------|
| Meet the Future list / cards | `client/components/MeetFuturePanel.tsx` |
| Meet the Future detail | `client/screens/meet-future-detail/index.tsx` |
| Local persistence | `client/utils/meetFutureStorage.ts` |
| Summarize API | `server/src/routes/future-plans.ts` |
| Gemini helper | `server/src/lib/gemini-summarize.ts` |
| Root navigator | `client/app/_layout.tsx` |
| Tabs + voice add | `client/app/(tabs)/_layout.tsx` |
| Env loading | `server/src/load-env.ts` |
