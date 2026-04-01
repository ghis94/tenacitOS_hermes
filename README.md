# tenacitOS Hermes

Dashboard temps réel et mission control pour Hermes et ses sous-agents.

Ce fork dérive de tenacitOS mais il est désormais orienté Hermes, pas OpenClaw.
Il fournit une UI Next.js pour visualiser :
- agents et sous-agents
- sessions
- activité live
- mémoire et fichiers de workspace
- logs de services
- santé du runtime
- vue “office”

Le projet supporte trois modes Hermes :
- demo : démarre immédiatement avec des fixtures locales
- filesystem : lit agents, sessions et workspaces depuis des volumes montés
- api : lit les données depuis une API Hermes distante

--------------------------------------------------

## Fonctionnalités actuelles

- Dashboard agents Hermes
- Vue sessions/messages
- Ingestion d’activités Hermes via API
- Stream SSE des activités
- File browser / memory browser
- Recherche globale / mémoire
- Vue logs de services configurables
- Health checks Hermes / LocalAI
- Dockerfile + docker-compose
- Auth simple par mot de passe

--------------------------------------------------

## Architecture

Le projet utilise une couche provider :
- `openclaw` pour compat historique
- `hermes` pour le fork actuel

En pratique, ce fork doit être lancé avec :
- `DASHBOARD_PROVIDER=hermes`

Le provider Hermes supporte :
- `HERMES_MODE=demo`
- `HERMES_MODE=filesystem`
- `HERMES_MODE=api`

--------------------------------------------------

## Démarrage rapide

### Option 1 — Docker recommandé

```bash
cp .env.example .env
docker compose up --build
```

Puis ouvre :
- http://localhost:3000

Login :
- utilise la valeur de `ADMIN_PASSWORD` dans `.env`

### Option 2 — Local

```bash
npm install
cp .env.example .env.local
npm run build
node .next/standalone/server.js
```

Ou en dev :

```bash
npm run dev
```

--------------------------------------------------

## Variables d’environnement importantes

### Générales

```env
ADMIN_PASSWORD=change-this-password
AUTH_SECRET=generate-a-long-random-secret-here
DASHBOARD_PORT=3000
DASHBOARD_PROVIDER=hermes
DEFAULT_MODEL=gpt-5.4
```

### Mode Hermes

```env
HERMES_MODE=demo
HERMES_INGEST_TOKEN=change-me
HERMES_SERVICES=mission-control:systemd:Mission Control,hermes-runtime:systemd:Hermes Runtime
```

### Mode filesystem

```env
HERMES_ROOT_DIR=/hermes
HERMES_WORKSPACES_DIR=/hermes/workspaces
HERMES_MAIN_WORKSPACE=/hermes/workspaces/main
HERMES_SESSIONS_DIR=/hermes/sessions
HERMES_SKILLS_DIR=/hermes/skills
HERMES_LOGS_DIR=/hermes/logs
HERMES_AGENT_REGISTRY_PATH=/hermes/agents.json
HERMES_HOST_DIR=./data/hermes-demo
```

### Mode API

```env
HERMES_API_BASE_URL=http://host.docker.internal:8787
HERMES_API_TOKEN=
```

### LocalAI / backend LLM

```env
LOCALAI_BASE_URL=http://192.168.1.196:8081
```

--------------------------------------------------

## Modes de fonctionnement

### 1. Demo

Le plus simple pour tester l’UI.

```env
DASHBOARD_PROVIDER=hermes
HERMES_MODE=demo
```

Le projet lit alors les fixtures dans :
- `data/hermes-demo/agents.json`
- `data/hermes-demo/sessions.json`
- `data/hermes-demo/system.json`
- `data/hermes-demo/session-messages/*`

### 2. Filesystem

Le dashboard lit directement un répertoire monté dans le conteneur, typiquement `/hermes`.

Structure recommandée :

```text
/hermes/
├── agents.json                  # optionnel
├── workspaces/
│   ├── main/
│   │   ├── MEMORY.md
│   │   ├── IDENTITY.md
│   │   └── memory/
│   ├── research/
│   └── builder/
├── sessions/
│   ├── abc.json
│   ├── def.json
│   └── abc.jsonl               # optionnel pour messages
├── skills/
└── logs/
```

Si `agents.json` est absent, le provider essaie d’inférer les agents depuis `workspaces/`.

### 3. API

Le dashboard appelle une API Hermes distante.

Endpoints attendus :
- `GET /agents`
- `GET /sessions`
- `GET /sessions/:id`
- `GET /system`

Le token Bearer est optionnel via `HERMES_API_TOKEN`.

--------------------------------------------------

## Ingestion d’activités live

Le runtime Hermes peut pousser des événements vers :

- `POST /api/activities`

Authentification requise :
- header `x-hermes-ingest-token: <token>`
ou
- `Authorization: Bearer <token>`

Exemple :

```bash
curl -X POST http://localhost:3000/api/activities \
  -H 'Content-Type: application/json' \
  -H 'x-hermes-ingest-token: change-me' \
  -d '{
    "type":"agent_action",
    "description":"Research finished repo audit",
    "status":"success",
    "agent":"research",
    "duration_ms":1820,
    "tokens_used":420,
    "metadata":{"task":"repo-audit"}
  }'
```

Le dashboard d’activité et le stream SSE refléteront ensuite ces événements.

--------------------------------------------------

## Docker

Le repo contient :
- `Dockerfile`
- `docker-compose.yml`

Le compose :
- build l’app Next.js
- expose le port 3000
- monte `./data`
- monte `HERMES_HOST_DIR` sur `/hermes`
- supporte `host.docker.internal` pour joindre une API Hermes locale

Lancement :

```bash
cp .env.example .env
docker compose up --build
```

--------------------------------------------------

## Vérifications rapides

### Health

```bash
curl http://localhost:3000/api/health
```

### Agents

```bash
curl http://localhost:3000/api/agents
```

### Sessions

```bash
curl http://localhost:3000/api/sessions
```

### Workspaces

```bash
curl http://localhost:3000/api/files/workspaces
```

--------------------------------------------------

## Développement

```bash
npm install
npm run dev
```

Build production :

```bash
npm run build
```

Lancement standalone recommandé après build :

```bash
node .next/standalone/server.js
```

--------------------------------------------------

## Branches / PR

Branche de travail actuelle :
- `feat/hermes-provider`

Créer une PR :
- https://github.com/ghis94/tenacitOS_hermes/pull/new/feat/hermes-provider

--------------------------------------------------

## Limites actuelles

Le fork est déjà largement adapté à Hermes, mais il reste encore possible d’améliorer :
- certaines pages secondaires encore héritées de la version d’origine
- affinage du modèle de données sessions/messages
- meilleur mapping des outils et sous-agents
- support plus riche du cron Hermes
- polish UI / QA navigateur complète

--------------------------------------------------

## Crédits

Base initiale dérivée de tenacitOS.
Adaptation en cours pour un usage Hermes-centric.
