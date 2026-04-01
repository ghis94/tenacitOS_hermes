import path from 'path';

export type DashboardProviderName = 'openclaw' | 'hermes';
export type HermesMode = 'demo' | 'filesystem' | 'api';

export const DASHBOARD_PROVIDER =
  (process.env.DASHBOARD_PROVIDER as DashboardProviderName | undefined) || 'hermes';

export const HERMES_MODE =
  (process.env.HERMES_MODE as HermesMode | undefined) || 'demo';

export const OPENCLAW_DIR = process.env.OPENCLAW_DIR || '/root/.openclaw';
export const OPENCLAW_WORKSPACE =
  process.env.OPENCLAW_WORKSPACE || path.join(OPENCLAW_DIR, 'workspace');
export const OPENCLAW_CONFIG = path.join(OPENCLAW_DIR, 'openclaw.json');
export const OPENCLAW_MEDIA = path.join(OPENCLAW_DIR, 'media');

export const HERMES_ROOT_DIR = process.env.HERMES_ROOT_DIR || '/hermes';
export const HERMES_WORKSPACES_DIR =
  process.env.HERMES_WORKSPACES_DIR || path.join(HERMES_ROOT_DIR, 'workspaces');
export const HERMES_MAIN_WORKSPACE =
  process.env.HERMES_MAIN_WORKSPACE || path.join(HERMES_WORKSPACES_DIR, 'main');
export const HERMES_SESSIONS_DIR =
  process.env.HERMES_SESSIONS_DIR || path.join(HERMES_ROOT_DIR, 'sessions');
export const HERMES_SKILLS_DIR =
  process.env.HERMES_SKILLS_DIR || path.join(HERMES_ROOT_DIR, 'skills');
export const HERMES_LOGS_DIR =
  process.env.HERMES_LOGS_DIR || path.join(HERMES_ROOT_DIR, 'logs');
export const HERMES_AGENT_REGISTRY_PATH =
  process.env.HERMES_AGENT_REGISTRY_PATH || path.join(HERMES_ROOT_DIR, 'agents.json');

export const HERMES_DEMO_DIR =
  process.env.HERMES_DEMO_DIR || path.join(process.cwd(), 'data', 'hermes-demo');
export const HERMES_DEMO_AGENTS_PATH = path.join(HERMES_DEMO_DIR, 'agents.json');
export const HERMES_DEMO_SESSIONS_PATH = path.join(HERMES_DEMO_DIR, 'sessions.json');
export const HERMES_DEMO_SYSTEM_PATH = path.join(HERMES_DEMO_DIR, 'system.json');
export const HERMES_DEMO_MESSAGES_DIR = path.join(HERMES_DEMO_DIR, 'session-messages');
export const HERMES_INGEST_TOKEN = process.env.HERMES_INGEST_TOKEN || '';
export const HERMES_API_BASE_URL =
  process.env.HERMES_API_BASE_URL || 'http://host.docker.internal:8787';
export const HERMES_API_TOKEN = process.env.HERMES_API_TOKEN || '';
