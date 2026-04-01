     1|# TenacitOS — Mission Control
     2|
     3|A real-time dashboard and control center for [OpenClaw](https://openclaw.ai) AI agent instances. Built with Next.js, React 19, and Tailwind CSS v4.
     4|
     5|> **TenacitOS** lives inside your OpenClaw workspace and reads its configuration, agents, sessions, memory, and logs directly from the host. No extra database or backend required — OpenClaw is the backend.
     6|
     7|---
     8|
     9|## Features
    10|
    11|- **📊 System Monitor** — Real-time VPS metrics (CPU, RAM, Disk, Network) + PM2/Docker status
    12|- **🤖 Agent Dashboard** — All agents, their sessions, token usage, model, and activity status
    13|- **💰 Cost Tracking** — Real cost analytics from OpenClaw sessions (SQLite)
    14|- **⏰ Cron Manager** — Visual cron manager with weekly timeline, run history, and manual triggers
    15|- **📋 Activity Feed** — Real-time log of agent actions with heatmap and charts
    16|- **🧠 Memory Browser** — Explore, search, and edit agent memory files
    17|- **📁 File Browser** — Navigate workspace files with preview and in-browser editing
    18|- **🔎 Global Search** — Full-text search across memory and workspace files
    19|- **🔔 Notifications** — Real-time notification center with unread badge
    20|- **🏢 Office 3D** — Interactive 3D office with one desk per agent (React Three Fiber)
    21|- **📺 Terminal** — Read-only terminal for safe status commands
    22|- **🔐 Auth** — Password-protected with rate limiting and secure cookie
    23|
    24|---
    25|
    26|## Screenshots
    27|
    28|**Dashboard** — activity overview, agent status, and weather widget
    29|
    30|![Dashboard](./docs/screenshots/dashboard.jpg)
    31|
    32|**Session History** — all OpenClaw sessions with token usage and context tracking
    33|
    34|![Sessions](./docs/screenshots/sessions.jpg)
    35|
    36|**Costs & Analytics** — daily cost trends and breakdown per agent
    37|
    38|![Costs](./docs/screenshots/costs.jpg)
    39|
    40|**System Monitor** — real-time CPU, RAM, Disk, and Network metrics
    41|
    42|![System Monitor](./docs/screenshots/system.jpg)
    43|
    44|**Office 3D** — interactive 3D office with one voxel avatar per agent (React Three Fiber)
    45|
    46|![Office 3D](./docs/screenshots/office3d.jpg)
    47|
    48|---
    49|
    50|## Requirements
    51|
    52|- **Node.js** 18+ (tested with v22)
    53|- **[OpenClaw](https://openclaw.ai)** installed and running on the same host
    54|- **PM2** or **systemd** (recommended for production)
    55|- **Caddy** or another reverse proxy (for HTTPS in production)
    56|
    57|---
    58|
    59|## How it works
    60|
    61|TenacitOS reads directly from your OpenClaw installation:
    62|
    63|```
    64|/root/.openclaw/              ← OPENCLAW_DIR (configurable)
    65|├── openclaw.json             ← agents list, channels, models config
    66|├── workspace/                ← main agent workspace (MEMORY.md, SOUL.md, etc.)
    67|├── workspace-studio/         ← sub-agent workspaces
    68|├── workspace-infra/
    69|├── ...
    70|└── workspace/mission-control/ ← TenacitOS lives here
    71|```
    72|
    73|The app uses `OPENCLAW_DIR` to locate `openclaw.json` and all workspaces. **No manual agent configuration needed** — agents are auto-discovered from `openclaw.json`.
    74|
    75|---
    76|
    77|## Installation
    78|
    79|### 1. Clone into your OpenClaw workspace
    80|
    81|```bash
    82|cd /root/.openclaw/workspace   # or your OPENCLAW_DIR/workspace
    83|git clone https://github.com/carlosazaustre/tenacitOS.git mission-control
    84|cd mission-control
    85|npm install
    86|```
    87|
    88|### 2. Configure environment
    89|
    90|```bash
    91|cp .env.example .env.local
    92|```
    93|
    94|Edit `.env.local`:
    95|
    96|```env
    97|# --- Auth (required) ---
    98|# Strong password to log in to the dashboard
    99|ADMIN_PASSWORD=your-s...here
   100|
   101|# Random secret used to sign the auth cookie
   102|# Generate with: openssl rand -base64 32
   103|AUTH_SECRET=your-r...here
   104|
   105|# --- OpenClaw paths (optional — defaults work for standard installs) ---
   106|# OPENCLAW_DIR=/root/.openclaw
   107|
   108|# --- Branding (customize for your instance) ---
   109|NEXT_PUBLIC_AGENT_NAME=Mission Control
   110|NEXT_PUBLIC_AGENT_EMOJI=🤖
   111|NEXT_PUBLIC_AGENT_DESCRIPTION=Your AI co-pilot, powered by OpenClaw
   112|NEXT_PUBLIC_AGENT_LOCATION=             # e.g. "Madrid, Spain"
   113|NEXT_PUBLIC_BIRTH_DATE=                 # ISO date, e.g. "2026-01-01"
   114|NEXT_PUBLIC_AGENT_AVATAR=               # path to image in /public, e.g. "/avatar.jpg"
   115|
   116|NEXT_PUBLIC_OWNER_USERNAME=your-username
   117|NEXT_PUBLIC_OWNER_EMAIL=your-email@example.com
   118|NEXT_PUBLIC_TWITTER_HANDLE=@username
   119|NEXT_PUBLIC_COMPANY_NAME=MISSION CONTROL, INC.
   120|NEXT_PUBLIC_APP_TITLE=Mission Control
   121|```
   122|
   123|> **Tip:** `OPENCLAW_DIR` defaults to `/root/.openclaw`. If your OpenClaw is installed elsewhere, set this variable.
   124|
   125|### 3. Initialize data files
   126|
   127|```bash
   128|cp data/cron-jobs.example.json data/cron-jobs.json
   129|cp data/activities.example.json data/activities.json
   130|cp data/notifications.example.json data/notifications.json
   131|cp data/configured-skills.example.json data/configured-skills.json
   132|cp data/tasks.example.json data/tasks.json
   133|```
   134|
   135|### 4. Generate secrets
   136|
   137|```bash
   138|# Auth secret
   139|openssl rand -base64 32
   140|
   141|# Password (or use a password manager)
   142|openssl rand -base64 18
   143|```
   144|
   145|### 5. Run
   146|
   147|```bash
   148|# Development
   149|npm run dev
   150|# → http://localhost:3000
   151|
   152|# Production build
   153|npm run build
   154|npm start
   155|```
   156|
   157|Login at `http://localhost:3000` with the `ADMIN_PASSWORD` you set.
   158|
   159|---
   160|
   161|## Production Deployment
   162|
   163|### PM2 (recommended)
   164|
   165|```bash
   166|npm run build
   167|
   168|pm2 start npm --name "mission-control" -- start
   169|pm2 save
   170|pm2 startup   # enable auto-restart on reboot
   171|```
   172|
   173|### systemd
   174|
   175|Create `/etc/systemd/system/mission-control.service`:
   176|
   177|```ini
   178|[Unit]
   179|Description=TenacitOS — OpenClaw Mission Control
   180|After=network.target
   181|
   182|[Service]
   183|Type=simple
   184|User=root
   185|WorkingDirectory=/root/.openclaw/workspace/mission-control
   186|ExecStart=/usr/bin/npm start
   187|Restart=always
   188|RestartSec=10
   189|Environment=NODE_ENV=production
   190|
   191|[Install]
   192|WantedBy=multi-user.target
   193|```
   194|
   195|```bash
   196|sudo systemctl daemon-reload
   197|sudo systemctl enable mission-control
   198|sudo systemctl start mission-control
   199|```
   200|
   201|### Reverse proxy — Caddy (HTTPS)
   202|
   203|```caddy
   204|mission-control.yourdomain.com {
   205|    reverse_proxy localhost:3000
   206|}
   207|```
   208|
   209|> When behind HTTPS, `secure: true` is set automatically on the auth cookie.
   210|
   211|---
   212|
   213|## Configuration
   214|
   215|### Agent branding
   216|
   217|All personal data stays in `.env.local` (gitignored). The `src/config/branding.ts` file reads from env vars — **never edit it directly** with your personal data.
   218|
   219|### Agent discovery
   220|
   221|Agents are auto-discovered from `openclaw.json` at startup. The `/api/agents` endpoint reads:
   222|
   223|```json
   224|{
   225|  "agents": {
   226|    "list": [
   227|      { "id": "main", "name": "...", "workspace": "...", "model": {...} },
   228|      { "id": "studio", "name": "...", "workspace": "..." }
   229|    ]
   230|  }
   231|}
   232|```
   233|
   234|Each agent can define its own visual appearance in `openclaw.json`:
   235|
   236|```json
   237|{
   238|  "id": "studio",
   239|  "name": "My Studio Agent",
   240|  "ui": {
   241|    "emoji": "🎬",
   242|    "color": "#E91E63"
   243|  }
   244|}
   245|```
   246|
   247|### Office 3D — agent positions
   248|
   249|The 3D office has default positions for up to 6 agents. To customize positions, names, and colors for your own agents, edit `src/components/Office3D/agentsConfig.ts`:
   250|
   251|```ts
   252|export const AGENTS: AgentConfig[] = [
   253|  {
   254|    id: "main",       // must match workspace ID
   255|    name: "...",      // display name (can also come from API)
   256|    emoji: "🤖",
   257|    position: [0, 0, 0],
   258|    color: "#FFCC00",
   259|    role: "Main Agent",
   260|  },
   261|  // add your sub-agents here
   262|];
   263|```
   264|
   265|### 3D Avatar models
   266|
   267|To add custom 3D avatars (Ready Player Me GLB format), place them in `public/models/`:
   268|
   269|```
   270|public/models/
   271|├── main.glb        ← main agent avatar
   272|├── studio.glb      ← workspace-studio agent
   273|└── infra.glb       ← workspace-infra agent
   274|```
   275|
   276|Filename must match the agent `id`. If no file is found, a colored sphere is shown as fallback.  
   277|See `public/models/README.md` for full instructions.
   278|
   279|### Cost tracking
   280|
   281|Usage is collected from OpenClaw's SQLite databases via a script:
   282|
   283|```bash
   284|# Collect once
   285|npx tsx scripts/collect-usage.ts
   286|
   287|# Auto-collect every hour (adds a cron job)
   288|./scripts/setup-cron.sh
   289|```
   290|
   291|See [docs/COST-TRACKING.md](./docs/COST-TRACKING.md) for details.
   292|
   293|---
   294|
   295|## Project Structure
   296|
   297|```
   298|mission-control/
   299|├── src/
   300|│   ├── app/
   301|│   │   ├── (dashboard)/      # Dashboard pages (protected)
   302|│   │   ├── api/              # API routes
   303|│   │   ├── login/            # Login page
   304|│   │   └── office/           # 3D office (unprotected route)
   305|│   ├── components/
   306|│   │   ├── TenacitOS/        # OS-style UI shell (topbar, dock, status bar)
   307|│   │   └── Office3D/         # React Three Fiber 3D office
   308|│   ├── config/
   309|│   │   └── branding.ts       # Branding constants (reads from env vars)
   310|│   └── lib/                  # Utilities (pricing, queries, activity logger...)
   311|├── data/                     # JSON data files (gitignored — use .example versions)
   312|├── docs/                     # Extended documentation
   313|├── public/
   314|│   └── models/               # GLB avatar models (add your own)
   315|├── scripts/                  # Setup and data collection scripts
   316|├── .env.example              # Environment variable template
   317|└── middleware.ts             # Auth guard for all routes
   318|```
   319|
   320|---
   321|
   322|## Security
   323|
   324|- All routes (including all `/api/*`) require authentication — handled by `src/middleware.ts`
   325|- `/api/auth/login` and `/api/health` are the only public endpoints
   326|- Login is rate-limited: **5 failed attempts → 15-minute lockout** per IP
   327|- Auth cookie is `httpOnly`, `sameSite: lax`, and `secure` in production
   328|- Terminal API uses a strict command allowlist — `env`, `curl`, `wget`, `node`, `python` are blocked
   329|- **Never commit `.env.local`** — it contains your credentials
   330|
   331|Generate fresh secrets:
   332|
   333|```bash
   334|openssl rand -base64 32   # AUTH_SECRET
   335|openssl rand -base64 18   # ADMIN_PASSWORD
   336|```
   337|
   338|---
   339|
   340|## Troubleshooting
   341|
   342|**"Gateway not reachable" / agent data missing**
   343|
   344|```bash
   345|openclaw status
   346|openclaw gateway start   # if not running
   347|```
   348|
   349|**"Database not found" (cost tracking)**
   350|
   351|```bash
   352|npx tsx scripts/collect-usage.ts
   353|```
   354|
   355|**Build errors after pulling updates**
   356|
   357|```bash
   358|rm -rf .next node_modules
   359|npm install
   360|npm run build
   361|```
   362|
   363|**Scripts not executable**
   364|
   365|```bash
   366|chmod +x scripts/*.sh
   367|```
   368|
   369|---
   370|
   371|## Tech Stack
   372|
   373|| Layer | Tech |
   374||---|---|
   375|| Framework | Next.js 15 (App Router) |
   376|| UI | React 19 + Tailwind CSS v4 |
   377|| 3D | React Three Fiber + Drei |
   378|| Charts | Recharts |
   379|| Icons | Lucide React |
   380|| Database | SQLite (better-sqlite3) |
   381|| Runtime | Node.js 22 |
   382|
   383|---
   384|
   385|## Contributing
   386|
   387|1. Fork the repo
   388|2. Create a feature branch (`git checkout -b feat/my-feature`)
   389|3. **Keep personal data out of commits** — use `.env.local` and `data/` (both gitignored)
   390|4. Write clear commit messages
   391|5. Open a PR
   392|
   393|See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.
   394|
   395|---
   396|
   397|## License
   398|
   399|MIT — see [LICENSE](./LICENSE)
   400|
   401|---
   402|
   403|## Links
   404|
   405|- [OpenClaw](https://openclaw.ai) — the AI agent runtime this dashboard is built for
   406|- [OpenClaw Docs](https://docs.openclaw.ai)
   407|- [Discord Community](https://discord.com/invite/clawd)
   408|- [GitHub Issues](../../issues) — bug reports and feature requests
   409|
## Hermes mode (Phase 1)

This fork adds an initial Hermes-compatible provider layer.

Current status:
- `DASHBOARD_PROVIDER=hermes` supported
- `HERMES_MODE=demo` supported out of the box
- Docker deployment included
- Agents, sessions, system info, skills, and office view now resolve via a pluggable provider

Quick start:

```bash
cp .env.example .env
docker compose up --build
```

Then open: `http://localhost:3000`

Notes:
- Default mode is `hermes` + `demo` so the UI boots without a real Hermes backend.
- Filesystem/API-backed Hermes providers will be extended in later phases.
