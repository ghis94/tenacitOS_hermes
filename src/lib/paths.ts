import path from 'path';

import {
  DASHBOARD_PROVIDER,
  HERMES_MAIN_WORKSPACE,
  HERMES_ROOT_DIR,
  HERMES_SKILLS_DIR,
  OPENCLAW_DIR,
  OPENCLAW_MEDIA,
  OPENCLAW_WORKSPACE,
} from '@/lib/providers/provider-config';

const ACTIVE_ROOT_DIR = DASHBOARD_PROVIDER === 'openclaw' ? OPENCLAW_DIR : HERMES_ROOT_DIR;
const ACTIVE_WORKSPACE = DASHBOARD_PROVIDER === 'openclaw' ? OPENCLAW_WORKSPACE : HERMES_MAIN_WORKSPACE;

export const WORKSPACE_ROOT = ACTIVE_ROOT_DIR;
export const WORKSPACE_PATH = ACTIVE_WORKSPACE;
export const WORKSPACE_IDENTITY = path.join(ACTIVE_WORKSPACE, 'IDENTITY.md');
export const WORKSPACE_TOOLS = path.join(ACTIVE_WORKSPACE, 'TOOLS.md');
export const WORKSPACE_MEMORY = path.join(ACTIVE_WORKSPACE, 'memory');

// Backward-compatible exports for legacy routes/components.
export { OPENCLAW_DIR, OPENCLAW_WORKSPACE, OPENCLAW_MEDIA };

export const SYSTEM_SKILLS_PATH =
  DASHBOARD_PROVIDER === 'openclaw'
    ? '/usr/lib/node_modules/openclaw/skills'
    : HERMES_SKILLS_DIR;
export const WORKSPACE_SKILLS_PATH = path.join(ACTIVE_WORKSPACE, 'skills');

export const ALLOWED_MEDIA_PREFIXES = DASHBOARD_PROVIDER === 'openclaw'
  ? [path.join(OPENCLAW_WORKSPACE, '/'), path.join(OPENCLAW_MEDIA, '/')]
  : [path.join(ACTIVE_WORKSPACE, '/'), path.join(HERMES_ROOT_DIR, '/')];
