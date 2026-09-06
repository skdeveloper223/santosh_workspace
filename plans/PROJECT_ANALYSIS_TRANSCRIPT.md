# UHF RFID Reader Application — Full Project Analysis Transcript

**Date of analysis:** 2026-09-06
**Scope:** Read-only analysis of all four sub-projects under `uhf_rfid_reader_application_old/`. No source files were modified.
**Root path:** `/Users/santosh/Documents/Santosh/santosh_workspace/uhf_rfid_reader_application_old/`

**Update log:**
- 2026-09-06 (initial) — Sections 0–6: read-only analysis of the four existing sub-projects.
- 2026-09-06 (update) — Section 7 added: new **planned feature roadmap** (RBAC, org hierarchy, vehicle governance, unknown-entity detection workflow, camera/UHF capture pipeline) requested for the **next build**, targeting both a **web app** and a **Flutter mobile app**. This is forward-looking product requirement capture, not analysis of existing code — kept clearly separate from Sections 0–6.

---

## 0. Executive Summary

This workspace contains **four separate, loosely-related sub-projects** that together represent the evolution of a single product: an enterprise **UHF RFID access-control and asset/vehicle-tracking system** (product name appears to be **"AIRIS"**, built by a company referred to as **Aether**). They share a common SQL Server schema (`AIRIS_JAFAR` / `AIRIS` / `COSEC`) and a common domain model (Employees, Vehicles, Assets, Readers, Gates, Tags), but are **not currently wired together as one running system** — each was clearly built at a different time, by a different iteration of the team/tooling, and several contain unfinished, simulated, or dead code.

| # | Sub-project | Role | Stack | Maturity |
|---|---|---|---|---|
| 1 | `UHF Python` | Real-time ingestion engine — TCP listener for physical RFID readers, tag resolution, gate-relay triggering, Socket.IO event bus, historical ANPR (plate recognition) companion | Python 3.12, gevent, python-socketio, pyodbc (SQL Server), Redis | Most functionally complete backend; has real hardware protocol handling, but has bugs, duplicated legacy code, and lost ANPR source |
| 2 | `UHFReaderFlow` | Web dashboard + ingestion gateway, Replit-scaffolded | Node.js/TypeScript, Express, React 18 + Vite, Wouter, TanStack Query, shadcn/ui | Functionally rich UI, but backend is largely **simulated** (fake data generator, stubbed gate/ID-card actions) and uses flat-file JSON storage, not a real DB |
| 3 | `rfid-dashboard` | Operator-facing live dashboard + vehicle gate/CCTV terminal (pure frontend client) | React 19 + Vite, socket.io-client, hls.js | Live path is functional and connects to a real Socket.IO gateway; ~20% of the codebase is a dead, unstyled "V2" rewrite attempt |
| 4 | `uhf-reader-dashboard` | Simple admin CRUD console for master data (readers/gates/vehicles/tag binding) | Python Flask, pyodbc (SQL Server), vanilla JS/HTML | Smallest, oldest-looking, prototype-grade; no auth, no `.env`, hardcoded credentials |

**Overall picture:** The parent folder name (`..._old`) and the fragmentation across four independent stacks strongly suggest this is a **legacy/exploratory collection of prior attempts** at building the same product — likely superseded by (or a starting reference point for) a newer unified build. `UHF Python` is the most "real" backend (actual TCP hardware protocol, real gate relay HTTP calls, real DB writes). `rfid-dashboard`'s live pages appear to be the frontend actually paired with it (matching Socket.IO event names like `tag_event`, `bind_tag`, `request_tag_history`, and gate CGI relay calls). `UHFReaderFlow` and `uhf-reader-dashboard` look like separate, disconnected/earlier prototypes that were never fully integrated with the real hardware layer.

**Cross-cutting concerns found in nearly every sub-project:**
- Hardcoded credentials committed to source (DB passwords, RTSP camera passwords) in 3 of 4 sub-projects.
- No authentication/authorization anywhere in the entire system.
- Significant dead/duplicate code (legacy procedural Python file duplicating the OOP one; a whole unused "V2" React UI cluster; unused ORM/auth dependencies).
- Documentation drift — several markdown docs describe an earlier or different version of the code than what's actually present.
- No automated tests anywhere across all four sub-projects.

---

## 1. `UHF Python` — Real-Time Ingestion Engine

**Path:** `UHF Python/`

### Purpose
Backend real-time engine for the AIRIS access-control/asset-tracking product. Listens for raw TCP packets from physical UHF RFID readers, resolves scanned EPC tags against SQL Server (Employee / Vehicle / Asset), pushes live events to clients over Socket.IO, and auto-triggers gate/boom-barrier relays for authorized vehicles. Also historically included an ANPR (Automatic Number Plate Recognition) camera subsystem.

### Tech Stack
- Python 3.12, **gevent** (monkey-patched cooperative concurrency — not asyncio/threading)
- `python-socketio` (async_mode="gevent") over `gevent.pywsgi.WSGIServer` + `WebSocketHandler`
- `pyodbc` → Microsoft SQL Server (ODBC Driver 18/17/13 auto-detected)
- `redis` + `cachetools.TTLCache` (2-tier L1/L2 cache)
- No web framework for the main app (raw WSGI + Socket.IO); `requests` is imported but never used — HTTP calls to gate controllers go through `subprocess` + `curl` instead.

### Entry Points
- **`UHFServices.py`** (1337 lines) — current, canonical, class-based implementation (confirmed authoritative by `db_manage.md` line-number references). Runs Socket.IO/HTTP on port **9002** and a raw TCP listener on port **9000**.
- **`UHFMaster.py`** (1275 lines) — older procedural/global-function version of the *same* logic (~95% duplicate of `UHFServices.py`). Appears to be dead/legacy code that should be removed or clearly deprecated.
- **`server.py`** (5 lines) — not a server; a broken one-off test script (`s.connect(('172.40.4.26'), 4660)` passes two args instead of a tuple → `TypeError` if run).

### Architecture
- **ConfigService** — loads Locations/Readers/Gates from SQL Server into in-memory maps, refreshed every 5 min or on-demand (`reload_configuration` event / `GET|POST /api/reload`); mirrored into Redis.
- **ConnectionService** — tracks live sockets per (location, reader); supports inbound (readers dial in) and optional outbound (server dials readers, gated by `CONNECT_TO_READERS`, default off).
- **DatabaseService** — hand-rolled `pyodbc` connection pool (size 8) via `gevent.queue.Queue`.
- **CacheService** — 2-tier cache (TTLCache 300s → Redis) for tag lookups and DB-write de-duplication (`epc:reader` key, 300s TTL).
- **GateService** — checks `VehicleManagementMst.IsGateAccess`; if authorized, calls gate relay controller HTTP CGI endpoints (`activateauxrelay`/`deactivateauxrelay`) via `curl` subprocess, 3s hold.
- **TagService** — core EPC resolver: multi-join SQL across `UHFData`, `AstDeviceDetails`, `AstAllocationdet`, `EmployeeMst`, `VehicleManagementMst`, plus cross-DB photo lookups (`AIRIS.dbo.EmployeePhotoDet`, `COSEC.dbo.Mx_UserPhoto`); also `search_targets` (fuzzy LIKE search) and `bind_tag`/`bind_tag_force`.
- **HistoryService** — async queue writer to `UHFHistory` + capped (500) Redis sorted set per EPC.
- **PacketProcessingService** — parses raw TCP protocol: frame starts `0xBB`, bytes 4–8 = little-endian reader ID, byte 8 = EPC length, then EPC hex bytes. Valid EPCs upserted into `UHFData`, resolved, broadcast as `tag_event`.
- **Socket.IO events:** `connect`/`disconnect`, `request_tag_details`, `reload_configuration`, `search_targets`, `bind_tag`, `bind_tag_force`, `request_tag_history`.

### ANPR Subsystem — Important Gap
The `ANPR/` folder in the current working tree is **effectively empty** (only a stray `.pyc`). Full source (`utils.py`, `detector.py`, `ANPRCamera.py`, `app.py`, `app1.py`/`app2.py`, YOLOv8 weight files) only exists in git history at commit `6da5a5d`, on a branch **not reachable from the currently checked-out `dev_santu` branch**. Historically: YOLOv8 (plate detection) + EasyOCR/PaddleOCR (text extraction) reading an RTSP camera stream, writing to an `OCRDetections` table in the same DB, with a small Flask dashboard. It was never cross-referenced with the RFID detection tables — joined only by sharing a database/site.

### Data / Storage
- MS SQL Server DB `AIRIS_JAFAR` (12 tables per `db_manage.md`: locations, readers, gates, employees, vehicles, assets, live detections `UHFData`, audit trail `UHFHistory`) + cross-DB joins to `AIRIS.dbo.EmployeePhotoDet` and `COSEC.dbo.Mx_UserPhoto` (a Matrix/COSEC access-control system).
- Redis for config cache, tag-detail cache, write-dedup markers, per-EPC history.
- No local image storage — photos served from `myapp.airis.co.in` URLs.
- `db_manage.md` is a detailed, well-written schema/architecture doc with a Mermaid data-flow diagram — a good reference document.

### External Integrations
SQL Server (cross-DB), Redis, gate relay HTTP CGI controllers (via `curl`), Socket.IO (CORS wide open `*`), raw TCP (port 9000) for reader hardware, remote image CDN. Historically: RTSP camera + YOLOv8/EasyOCR/PaddleOCR.

### Environment Variables
`DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `CONNECT_TO_READERS`. Also referenced with code defaults (not in `.env`): `READER_PORT`, `TCP_HOST`, `TCP_PORT`, `SIO_HOST`, `SIO_PORT`, `CACHE_TTL`, `DB_WRITE_TTL`, `HISTORY_REDIS_TTL`.

### Key Issues Found
- **Hardcoded credentials**: `.env` has plaintext DB/Redis passwords, *and* both `UHFMaster.py`/`UHFServices.py` hardcode the same values again as source-level fallback defaults — meaning secrets are committed to git regardless of `.env` gitignore status.
- **Real latent bug** in `UHFMaster.py`: `socket` module never imported, but `reader_outbound_worker()` calls `socket.socket(...)` → `NameError` if `CONNECT_TO_READERS=True` (currently `False`, so dormant). `UHFServices.py` fixes this correctly.
- **`server.py` is broken** (`socket.connect()` called with two args instead of a tuple).
- **Dead code**: `requests` imported but unused; `GATE_AUTH_HEADER` defined but never actually passed into the curl command (malformed `--header "Authorization;"` — any auth token config is silently ignored).
- **Duplicate implementation risk**: `UHFMaster.py` vs `UHFServices.py` — keeping both risks divergence.
- **README.md** is unedited GitLab boilerplate.
- Git history is fragmented across many parallel branches (`main`, `mac`, `windows`, `dev_feel`, `dev_grok`, `dev_santu`) — direct cause of the lost ANPR source.
- No automated tests.
- Every tag scan unconditionally spawns a gate-access-check greenlet, even for non-vehicle tags (minor inefficiency, not a bug).

### File Tree (excl. venv/__pycache__/.git)
```
UHF Python/
├── .env
├── .gitignore
├── ANPR/                 (effectively empty; source recoverable via `git show 6da5a5d:ANPR/<file>`)
├── README.md             (unedited template)
├── UHFMaster.py           (legacy procedural implementation, 1275 lines)
├── UHFServices.py         (current OOP implementation, 1337 lines — canonical)
├── db_manage.md           (schema/architecture doc, 249 lines)
├── logs/                  (present, empty)
├── requirements.txt
└── server.py              (broken test script, 5 lines)
```

---

## 2. `UHFReaderFlow` — Web Dashboard + Ingestion Gateway (Replit-scaffolded)

**Path:** `UHFReaderFlow/`

### Purpose
A full-stack Node.js/TypeScript app combining a TCP hardware-ingestion gateway with a React admin dashboard. Per its own `DEPLOYMENT_GUIDE.md`, it's meant to be one of several services in a 4-port architecture (this app on 4000/9000, a separate Socket.IO gateway on 9002, a separate FastAPI "enterprise core" on 8000) — the other two services are **not present** in this sub-project, confirming this is one piece of a larger, only-partially-implemented system design.

### Tech Stack
- Node.js (ESM), TypeScript 5.6, `tsx` (dev), `esbuild` (prod bundle → `dist/index.cjs`)
- Server: Express 4.21, raw `net` (TCP), `ws` (WebSocket)
- Client: React 18.3 + Vite 5, **Wouter** (routing, not react-router), TanStack Query v5, shadcn/ui ("new-york"), Tailwind 3.4, Recharts, react-hook-form + zod
- Replit scaffolding still present (`.replit`, Replit Vite plugins, `.local/state/replit/agent/*`)
- `drizzle-orm`/`drizzle-zod`/`drizzle-kit`/`pg`/`connect-pg-simple`/`passport`/`passport-local`/`express-session`/`memorystore` are all **installed but entirely unused** — the app actually runs on flat-file JSON storage (`server/storage.ts`), confirmed by `replit.md` itself.

### Architecture / Data Flow
`server/index.ts` wires: Express (JSON body parsing + `/api/*` request logger) → WebSocket server at `/ws` (same HTTP server) → independent raw TCP server on port 9000 → REST routes → Vite dev-middleware or static prod serving.

**Hardware → server** (`server/tcp_listener.ts`): reader dials in on port 9000; `parseUHFFrame()` scans for `0xBB` header, reads EPC-length byte at offset+8, extracts EPC hex, reads RSSI byte after. In-memory `dedupCache` suppresses repeats within 5s. Resolves reader by matching `socket.remoteAddress` against `readers.json` — **falls back to the first reader in the list if no IP match** (data-integrity gap). Resolves employee by `tagId === epc`. Writes detection + log, broadcasts `tag_detected` over WebSocket. Parser only handles one frame per buffer read and resets the buffer afterward — fragile for multi-frame chunks.

**Server → browser**: simple pub/sub `RealtimeServer` (`server/websocket.ts`); client hook `use-websocket.ts` auto-reconnects (3s) and invalidates TanStack Query caches on `tag_detected`/`gate_event` (cache-invalidation-driven "real-time", not direct push); several dashboard queries also poll every 3s as a fallback.

**Built-in simulation loop**: `routes.ts` runs a `setInterval` every 4000ms that fabricates random tag-detection events from active employees + online readers and broadcasts them — **runs unconditionally in all environments**, not gated by an env flag. This is very likely why `data/detections.json` (10,812 records) and `data/logs.json` (10,843 records) have grown so large from local testing.

### Data Model (`shared/schema.ts` — pure Zod, no Drizzle tables defined)
Employee, Reader, Gate, Tag, TagDetection, SystemLog, TagWriteRequest (input-only), DashboardStats — each maps to a `data/*.json` flat file. `drizzle.config.ts` targets Postgres but the schema file has zero Drizzle table defs, so `npm run db:push` would do nothing — leftover Replit scaffolding never wired up.

### API Routes (selected, full list in sub-report)
Dashboard stats; Employees CRUD; Readers CRUD + `/metrics` (simulated via `Math.random()`); Gates CRUD + `/:id/open` (updates JSON + broadcasts WS event — **does not actually call the gate relay HTTP CGI endpoint** documented in `DEPLOYMENT_GUIDE.md`) + `/:id/emergency`; Tags CRUD; Tag-detections list/recent; Logs list/recent; `/api/rfid/connect|disconnect` (simulated); `/api/rfid/write-tag` (simulated, fabricates random tag+detection); `/api/id-cards/generate` (stub — sleeps 800ms, returns a count, **produces no actual PDF**). No auth/session middleware wired into any route despite passport/session dependencies being installed.

### Client App
`App.tsx` — Wouter router, 8 routes (`/`, `/tag-detection`, `/readers`, `/employees`, `/id-cards`, `/tag-writing`, `/device-monitor`, `/logs`) + catch-all. `QueryClientProvider` (staleTime: Infinity, no refetch-on-focus — updates rely on explicit invalidation) → `ThemeProvider` → `TooltipProvider`. 30+ shadcn/ui primitives vendored under `components/ui/`. Pages include a 3s-polling dashboard, a 4-step tag-writing wizard (Connect→Select→Write→Confirm), device monitor, logs viewer.

### Existing Documentation
- `replit.md` — architecture/feature overview, **stale** relative to code (omits Gates, `/api/rfid/*`, `/api/id-cards/*` routes added later).
- `DEPLOYMENT_GUIDE.md` — documents the intended 4-service architecture and real hardware wiring (readers dial out to port 9000; gate relays driven by CGI `device.cgi/command?action=activateauxrelay`) — **the app itself never calls these CGI URLs**, a documented-but-unimplemented gap. Gives 3 deployment options (raw, PM2, systemd).
- `design_guidelines.md` — detailed Material-Design-influenced UI spec (fonts, spacing, per-page layout, accessibility, animations) — actually reflected in the real page code.
- `attached_assets/` (filenames only, not extracted): `UHF_Project_Workflow.pdf`, `UHFTagSocket.pdf` (likely the real TCP frame spec), `UHFTagWrite.pdf`, `IntegratedReader.zip`, `TagRegisterReader.zip`, `DoorStatus.pdf`, `IDCardMasterAPIDoc.pdf`, `DataReplicationforidcard.pdf` — these suggest the *real* protocols are documented but only superficially/partially implemented in code (much of `routes.ts` is `setTimeout`-simulated).

### Environment Variables
`.env`: `PORT`, `TCP_PORT`, `SOCKET_PORT`, `NODE_ENV`. `.env.development`/`.env.production`: `PORT`. Code also references `DATABASE_URL` (unused, would only matter for `db:push`) and `REPL_ID` (Replit plugin gating).

### Key Issues Found
- Dead ORM/auth dependency stack (drizzle, pg, passport, express-session, memorystore) — no auth on any route.
- Unbounded JSON growth (10k+ records in detections/logs) — every write reads+rewrites the *entire* file, no rotation/cap, no atomic write (crash-mid-write risk).
- Always-on fake-data simulation loop pollutes real data in every environment.
- Reader-IP-fallback bug silently misattributes unrecognized readers' detections to `readers[0]`.
- Gate relay and ID-card generation are both stubs, not wired to real hardware/output despite being documented as real integrations.
- **Port inconsistency**: `server/index.ts` defaults to 4000; `.replit`/`ecosystem.config.cjs` use 5000; `DEPLOYMENT_GUIDE.md` says 4000 — these disagree. `ecosystem.config.cjs` also has a typo: `NODE_ENV: "developement"`.
- No pagination on any list endpoint despite 10k+ row datasets.
- `replit.md` stale vs. actual routes.

### File Tree (abbreviated — full tree in sub-agent report)
```
UHFReaderFlow/
├── .env / .env.development / .env.production
├── .replit, .vscode/settings.json
├── DEPLOYMENT_GUIDE.md, design_guidelines.md, replit.md
├── components.json, drizzle.config.ts, ecosystem.config.cjs
├── package.json, tailwind.config.ts, tsconfig.json, vite.config.ts
├── attached_assets/    (8 hardware/protocol docs)
├── data/               (employees, readers, gates, tags, detections[10.8k], logs[10.8k])
├── script/build.ts
├── shared/schema.ts
├── server/ (index.ts, routes.ts, storage.ts, tcp_listener.ts, websocket.ts, vite.ts, static.ts)
└── client/src/ (App.tsx, main.tsx, components/, hooks/, lib/, pages/)
```

---

## 3. `rfid-dashboard` — Operator Live Dashboard & Vehicle Gate Terminal

**Path:** `rfid-dashboard/`

### Purpose
A **pure frontend client** (no backend of its own) — the security-gate operator terminal: real-time RFID tag board (vehicles/assets/staff/contractors/unassigned), tag-binding UI, vehicle-gate terminal with CCTV/HLS camera feeds and boom-barrier control. Talks to two external services via `.env`:
- Socket.IO **RFID gateway** (`VITE_SOCKET_URL`) — event names (`tag_event`, `bind_tag`, `search_targets`, `request_tag_history`) **match `UHF Python`'s Socket.IO surface exactly**, strongly suggesting this is the real paired frontend for the `UHF Python` backend engine (§1).
- **Camera/CGI server** (`VITE_CAM_SERVER`) — camera list/HLS streaming + gate relay CGI calls.

### Tech Stack
- React 19.2.4, **Vite 6.0.7 is the active build tool** (CRA fully retired at the tooling level, though its file artifacts remain as dead weight).
- `react-router-dom` is a dependency but **unused** — page switching is local `useState` in `App.jsx`, not routing.
- No state-management library — local hooks only.
- Two conflicting style systems: hand-written CSS (used by the *live* pages) vs. Tailwind utility classes (used by a *dead*, unwired page cluster) — **Tailwind is not installed/configured at all**, so that dead code would render unstyled if ever mounted.
- `socket.io-client` (two independent singleton sockets: RFID + camera), `hls.js` as an npm dep but the actually-used hook loads `hls.js` from a **CDN** instead (npm dep unused).

### Architecture — Live Path
`Dashboard.jsx` (default page) subscribes to the RFID socket's `tag_event`, classifies each tag (`utils/helpers.js: classifyTag`) into vehicle/asset/aetherian(employee)/unassigned, keeps state keyed by EPC, auto-purges idle tags after 60s (`AUTO_REMOVE_MS`), renders filterable columns with per-tag actions (Bind, History, Hide, Remove, "Manage vehicle"). Selecting a vehicle switches (via local state, no router) to `VehicleManagement.jsx` — a full-screen gate terminal with live HLS camera grid (`IPCameraFeed`), driver/owner info, visitor sidebar, and "Grant Access" → `callGateAPI('open', ...)` (direct CGI relay call to the gate hardware) with a 3s auto-close timer.

### Dead Code — "V2" Cluster (~20% of `src/`)
`pages/DashboardPage.jsx`, `pages/VehicleTerminalPage.jsx`, `hooks/useTagFeed.js`, `components/layout/Header.jsx`, `components/rfid/TagFeed.jsx`, `components/rfid/TagDetailModal.jsx`, `components/camera/CameraGrid.jsx`, `components/gate/GateControlPanel.jsx` — a self-contained alternate implementation, never imported anywhere, built with Tailwind (which isn't configured), and listening for a different/incompatible socket event name (`rfid_tag_detected` vs. the live `tag_event`). Also duplicates `classifyTag()` logic with subtle differences from the live version — a maintenance hazard.

### Existing Documentation
- `README.md` — 100% stock CRA boilerplate, not project-specific.
- `RUN_GUIDE.md` — genuinely useful, accurate, Vite-based setup/troubleshooting guide with example `.env` values.
- `PROJECT_REVIEW.md` — an audit of an **earlier snapshot** of this codebase (references files like `App.js` 1,303-line monolith, `santu.js` 2,684-line scratch file, `react-scripts`) — **none of these exist anymore**; the code has since been refactored into the current structure and migrated to Vite. Its flagged concerns (hardcoded RTSP creds, dead files, monolith architecture, socket lifecycle) are informative even though stale — notably, hardcoded RTSP credentials are **still present today** in the current code.

### Environment Variables
`.env`: `VITE_SOCKET_URL`, `VITE_CAM_SERVER`, `REACT_APP_SOCKET_URL`, `REACT_APP_CAM_SERVER` (legacy-compat aliases; `vite.config.js` explicitly whitelists both prefixes).

### Key Issues Found
- **Hardcoded RTSP camera credentials and internal IPs in client-side source** (`src/config/api.js` `CAM_PRESETS`) — shipped in the browser bundle, trivially recoverable via devtools, exposing camera admin passwords and internal network topology.
- **Confirmed bug**: `GATE_API` is commented out (not exported) in `config/api.js`, yet `services/gateApi.js` imports and calls `fetch(GATE_API, ...)` — resolves to `fetch(undefined, ...)`. The documented backend gate-control fallback path is silently broken (masked in practice by the direct CGI relay call that fires first/independently).
- CRA leftovers coexist with Vite files (`public/index.html` vs root `index.html`, `src/index.js` vs `src/main.jsx`) — dead but harmless.
- `.gitignore` still ignores `/build` (CRA) not `/dist` (Vite's actual output) — build output would not be gitignored as intended.
- Socket singletons (`services/socket.js`) never call `.disconnect()` — potential duplicate-listener risk under React 19 StrictMode/hot-reload.
- Default fallback IPs in code differ from example IPs in `RUN_GUIDE.md`.
- Heavy use of inline `style={{...}}` objects in several components, inconsistent with the CSS-class approach used elsewhere.

### File Tree (abbreviated)
```
rfid-dashboard/
├── .env, .gitignore, README.md, PROJECT_REVIEW.md, RUN_GUIDE.md
├── index.html (Vite entry — active), vite.config.js
├── public/ (CRA leftovers, unused under Vite)
└── src/
    ├── App.jsx (active), main.jsx (active), index.js (dead), App.css
    ├── config/api.js  (env config + hardcoded RTSP creds)
    ├── services/ (socket.js, gateApi.js [GATE_API bug])
    ├── hooks/ (useTagFeed.js [dead], useHlsLib.js [active])
    ├── utils/helpers.js
    ├── pages/ (Dashboard.jsx*, VehicleManagement.jsx*, DashboardPage.jsx†, VehicleTerminalPage.jsx†)
    └── components/ (rfid/, modals/, camera/, gate/, vehicle/, layout/)
      (* = live, † = dead/unwired)
```

---

## 4. `uhf-reader-dashboard` — Master-Data Admin Console

**Path:** `uhf-reader-dashboard/`

### Purpose
A standalone Flask REST API + single-file HTML/JS admin console for managing master/reference data — sites, readers, gates, vehicles, and tag-to-entity bindings. **Not** a real-time tag-processing engine. Its `db_manage.md` is a verbatim copy of `UHF Python`'s schema documentation (still references `UHFServices.py` file paths), confirming it was built against the **same SQL Server schema** as the real-time engine, as a lightweight companion CRUD tool — not a rewrite of it.

Given it has no `.git`, no `.env`, no build tooling, and restrictive file permissions (`drwx------`, unlike its three sibling projects which are all world-readable `755`), this looks like the **earliest/simplest prototype** in the collection — plausibly the origin of the "old" in the parent folder's name.

### Tech Stack
Flask 3.0.3, `flask-cors`, `pyodbc` (SQL Server, ODBC driver auto-detect). Frontend: single static `index.html` (46KB, vanilla JS, `fetch()`-based, no framework/build step, no WebSocket).

### Architecture
`app.py` (872 lines): `CORS(app)` wide open; `get_connection()` opens a fresh `pyodbc` connection per request (`autocommit=True`, no pooling). Routes:
- Locations: `GET` only (writes deliberately removed, per in-code comment)
- Readers / Gates / Vehicles: full CRUD + soft-delete (`IsActive` flag) + `/restore` endpoints
- Employees / Assets: `GET` only
- Tag search (`/api/search_target`), tag binding (`/api/bind_tag`, `/api/bind_tag_force` with HTTP 409 conflict + force-override flow), tag history (`/api/tag-history`)
- `/api/system-info` — returns a **hardcoded** `"default_user": "Santosh Koli"` for audit-trail defaulting

Frontend is a tabbed single-page app (Vehicles/Employees/Assets/Tag Binding/Tag History/Locations/Readers/Gates) with a configurable `apiBase` input, debounced autocomplete for tag-binding target search, and a conflict→force-bind UX. All SQL queries use parameterized `?` placeholders — no obvious SQL-injection surface.

### Data / Storage
Same MS SQL Server schema as `UHF Python`, but only touches master/reference tables (`OrgLocationMst`, `UHFReaderMaster`, `UHFGateMaster`, `VehicleManagementMst`, `EmployeeMst`, asset lookup tables, `UHFHistory`) — does **not** touch the live-detection table `UHFData` or the external photo tables.

### Environment Variables
`DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — read via `os.getenv` with **hardcoded fallback defaults in source**, and since **no `.env` file exists** in this sub-project, those hardcoded fallbacks are what actually get used at runtime.

### Key Issues Found
- **Hardcoded DB credentials in source**, with no `.env`/secrets management at all in this sub-project — the most exposed of the four.
- **`debug=True`** in `app.run()` — enables Werkzeug's interactive debugger, a real remote-code-execution risk if ever exposed beyond localhost.
- **No authentication anywhere**, combined with wide-open CORS and debug mode — unsafe for anything beyond a local/trusted network.
- Single-user assumption hardcoded (`"Santosh Koli"`) — no real user/session/audit concept.
- No connection pooling (acceptable for a low-traffic admin tool).
- No tests, no logging configuration (an unused `logging` import).

### File Tree
```
uhf-reader-dashboard/           (drwx------, restricted permissions)
├── app.py            (872 lines, Flask REST API)
├── db_manage.md       (copied from UHF Python)
├── index.html         (1430 lines, vanilla JS admin UI)
├── requirements.txt
└── venv/
```

---

## 5. Cross-Project Synthesis

### How the pieces likely relate
```
                    ┌─────────────────────────┐
  Physical UHF      │      UHF Python          │   Socket.IO :9002
  RFID Readers ───► │  (UHFServices.py)         │◄────────────────────┐
  (TCP :9000)       │  TagService/GateService/   │                     │
                    │  HistoryService, SQL Server │                     │
                    └─────────────┬────────────┘                     │
                                  │ writes                            │
                                  ▼                                   │
                     MS SQL Server "AIRIS_JAFAR"           ┌──────────┴──────────┐
                     (+ AIRIS, COSEC cross-DB)              │   rfid-dashboard     │
                                  ▲                          │  (React operator UI, │
                                  │ reads/writes              │  matching event names)│
                     ┌────────────┴───────────┐             └─────────────────────┘
                     │  uhf-reader-dashboard    │
                     │  (Flask admin CRUD tool) │
                     └─────────────────────────┘

  UHFReaderFlow (Node/TS) — separate, self-contained sandbox with its OWN
  TCP:9000 listener + JSON flat-file storage + simulated data — not
  observed to share the SQL Server DB or Socket.IO surface with the others.
```

- **`UHF Python` ↔ `rfid-dashboard`**: Strong evidence of a real pairing — identical Socket.IO event vocabulary (`tag_event`, `bind_tag`, `bind_tag_force`, `search_targets`, `request_tag_history`) and identical gate-relay CGI call pattern (`device.cgi/command?action=activateauxrelay`).
- **`uhf-reader-dashboard` ↔ `UHF Python`**: Shares the same SQL Server schema/tables for master data (readers, gates, vehicles) — a companion admin tool, not integrated in real time (no sockets).
- **`UHFReaderFlow`**: Architecturally isolated — its own TCP listener, its own (JSON file, not SQL Server) storage, its own simulated Socket.IO-less WebSocket layer. No evidence found that it talks to the same database or event bus as the other three. Reads as a separate prototype/experiment (Replit-scaffolded), possibly an attempted rewrite that diverged.

### System-wide risks worth flagging to the user
1. **Hardcoded secrets in source across 3 of 4 sub-projects** (`UHF Python`, `uhf-reader-dashboard`, and RTSP credentials in `rfid-dashboard`) — should be rotated and moved to proper secrets management before any of this is deployed or made internet-facing.
2. **No authentication/authorization anywhere in the entire system** — every REST endpoint and Socket.IO event is open to anyone who can reach the network.
3. **Lost ANPR source** — only recoverable from a git commit not on the active branch; worth deciding whether to resurrect it or start fresh if plate-recognition is still wanted.
4. **`UHFReaderFlow`'s simulated/stubbed backend** (fake data generator, unwired gate relay, no-op ID-card PDF generation) means it is not currently a drop-in replacement/integration for the real hardware layer — it would need real wiring to `UHF Python`'s TCP/Socket.IO surface (or its own real hardware protocol implementation) before being production-usable.
5. **Duplicate/dead code** in two of the four projects (`UHFMaster.py` vs `UHFServices.py`; `rfid-dashboard`'s unwired "V2" Tailwind cluster) — candidates for deletion to reduce confusion for future maintainers.
6. **No tests anywhere** — any refactor or consolidation effort will need manual verification.

---

## 6. Suggested Next Steps (for discussion — no action taken)

These are observations only; nothing has been implemented, per the read-only scope of this analysis:
- Decide which sub-project(s) are the **intended forward path** vs. archival/reference-only, and consider renaming/relocating accordingly given the `_old` suffix on the parent folder.
- If `UHF Python` + `rfid-dashboard` is the real pairing, that combination looks closest to production-usable (pending the security fixes above).
- Decide whether ANPR is still in scope; if so, recover it from `git show 6da5a5d:ANPR/<file>` in the `UHF Python` repo before that history becomes harder to find (e.g., if branches are ever pruned).
- Consolidate credentials into environment-based secrets management (`.env` + a secrets manager / vault) across all four sub-projects, and rotate every credential that was ever committed in plaintext.
- Remove dead code (`UHFMaster.py`, the `rfid-dashboard` "V2" cluster, unused npm/pip dependencies) once the forward path is confirmed, to reduce maintenance surface.

---

## 7. Planned Feature Roadmap — Web App + Flutter App (New Requirements, added 2026-09-06)

> **Note:** Unlike Sections 1–6 (which document the *existing* four old sub-projects as found on disk), this section captures **new requirements the user wants built next**, applying to **both the web application and a Flutter mobile application** sharing the same backend, data model, and RBAC rules. Nothing in this section exists in code yet — it is a specification to build toward, written up from the user's notes and organized for clarity. Ambiguous points are flagged as open questions in §7.7 rather than silently assumed.

### 7.1 Platforms in Scope
- **Web application** (operator/admin-facing, likely building on the `rfid-dashboard` + `UHF Python` pairing identified in §5).
- **Flutter mobile application** (same backend and permission model; scope of which roles use it is an open question — see §7.7).

### 7.2 Roles & Access Control (RBAC)

**Default seed roles:**
1. `master_admin` — full system access
2. `admin`
3. `hr`
4. `supervisor`
5. `guard`
6. `employee`

**Permission model requirements:**
- `master_admin` has **full CRUD control** (create / read / edit / delete) over every module in the system — the only role with unrestricted access by default.
- `master_admin` is the one who **creates user accounts** and **assigns each user a role**.
- `master_admin` defines **granular, per-role (and per-user) permissions** — a permission-matrix / ACL admin screen where read/edit/delete access can be turned on or off per module, not just fixed baked-in role behavior. This implies permissions should be **data-driven** (stored and editable), not hardcoded per role in application logic.
- `master_admin` additionally has dedicated control over **vehicle-specific** permissions (see §7.4) — who else can update a vehicle's access/authorization settings.

### 7.3 Organizational & Asset Hierarchy

```
Company
├── Sites
│   ├── SecurityCheckPoint → Accessories, Employees
│   ├── Gate                → Vehicles
│   │                          (each Gate has multiple Cameras
│   │                           and multiple UHF/RFID Readers attached)
│   └── WareHouse           → Materials
└── Users
     └── Accessories (including Vehicles: 4-Wheeler / 2-Wheeler)
```

**Clarifications:**
- A single **Site** contains **both Gates and WareHouses** (plus SecurityCheckPoints) as sibling child entities — they are not mutually exclusive structures.
- Each **Gate** can have **multiple cameras** and **multiple UHF/RFID readers** attached to it (e.g., to cover multiple lanes or entry/exit directions at the same gate).
- **Users** (at the Company level, separate from the Site/asset hierarchy) can be linked to personal accessories — including vehicles, categorized as either 4-wheeler or 2-wheeler.

### 7.4 Vehicle Governance Rules

- Vehicles are **created/registered at the Company level** (not per-site) — a single vehicle record is shared/visible across the whole company, not duplicated per site.
- **Authorization is a separate concern from creation/ownership**: a vehicle must be **explicitly authorized per Site and per Gate** before it's allowed access there. Owning/registering a vehicle does not automatically grant it access everywhere.
- `master_admin` controls:
  - Which roles/users are permitted to update a vehicle's access/control settings.
  - **Site-level authorization** for a vehicle (which sites it may enter).
  - **Gate-level authorization** for a vehicle (which specific gates within an authorized site it may pass through).
  - `master_admin` can perform these updates directly, or delegate the ability to other roles.
- **Vehicle add/delete is a controlled, audited operation** — every vehicle record must retain full detail (owner/driver, vehicle type, plate number, authorized sites, authorized gates, created-by, created-at, last-updated-by/at) so that the system always has complete accountability for who created or removed a vehicle and when.

### 7.5 Unknown-Entity Detection & Notification Workflow

Applies uniformly to: **unknown Employees, unknown Accessories, unknown Materials** (detected via UHF/RFID) and **unknown Vehicles** (detected via camera/ANPR).

**Flow:**
1. A tag (UHF/RFID) or a vehicle plate (camera/ANPR) is scanned/detected at a Gate, SecurityCheckPoint, or WareHouse.
2. The system looks up the scanned identifier against known master records.
3. If it is **unknown / unregistered**:
   a. A **placeholder ("dummy") record** is inserted into the database immediately, so the detection event itself is never lost even before it's identified.
   b. A **real-time notification is sent to the Guard** on duty at that location.
4. The Guard opens the notification, which presents a **data-entry form** — used to identify/register the unknown entity (e.g., link it to an employee, vehicle, or material master record, or capture new details for it).
5. The Guard fills in and submits the form → the dummy record is completed/updated and **saved to the database** as a confirmed record.

This is the same pattern for all four entity types (employee, accessory, material, vehicle) — only the specific form fields captured at step 4 would differ by entity type.

### 7.6 Hardware Detection Pipeline

- **UHF/RFID readers** (at Gates and SecurityCheckPoints): read tags for
  - **Materials** (at WareHouses)
  - **Employees / Accessories** (at SecurityCheckPoints and Gates)
  — this reuses the existing UHF tag-read pipeline documented in `UHF Python` (§1: `PacketProcessingService`, `TagService`).
- **Cameras (ANPR) at Gates**:
  - Recognize the **vehicle number plate** and classify **vehicle type** (e.g., 2-wheeler / 4-wheeler / other) for every vehicle passing the gate.
  - For **every detected vehicle** (known or unknown), in addition to the plate-read event itself, the system must **capture a still image every 30 seconds** during the detection window and **store it in the database**, tagged with:
    - Timestamp of capture
    - Camera ID (a Gate can have multiple cameras, so the specific camera must be identified)
    - The associated vehicle/detection event
  - This periodic 30-second snapshot capture is **in addition to, not a replacement for**, the one-time plate-recognition event per vehicle passage — it serves as a continuous surveillance/audit trail.

---

*This transcript was generated by parallel read-only analysis of each sub-project's full source tree, configuration, sample data, and existing documentation (Sections 0–6). Section 7 was added afterward to capture new, forward-looking feature requirements for the next build, provided directly by the user. No source files outside of this transcript were created or modified during this analysis.*
