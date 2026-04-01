import fs from 'fs';
import path from 'path';

import {
  DASHBOARD_PROVIDER,
  HERMES_MAIN_WORKSPACE,
  HERMES_WORKSPACES_DIR,
  OPENCLAW_DIR,
} from '@/lib/providers/provider-config';

export interface WorkspaceInfo {
  id: string;
  name: string;
  emoji: string;
  path: string;
  agentName?: string;
}

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function parseIdentity(workspacePath: string): { name?: string; emoji?: string } {
  const identityPath = path.join(workspacePath, 'IDENTITY.md');
  if (!exists(identityPath)) return {};

  try {
    const content = fs.readFileSync(identityPath, 'utf-8');
    const nameMatch = content.match(/(?:\*\*Name:\*\*|- \*\*Name:\*\*)\s*(.+)/);
    const emojiMatch = content.match(/(?:\*\*Emoji:\*\*|- \*\*Emoji:\*\*)\s*(.+)/);
    return {
      name: nameMatch?.[1]?.trim(),
      emoji: emojiMatch?.[1]?.trim().split(' ')[0],
    };
  } catch {
    return {};
  }
}

export function getWorkspaceMap(): Record<string, string> {
  const map: Record<string, string> = {
    'mission-control': process.cwd(),
  };

  if (DASHBOARD_PROVIDER === 'openclaw') {
    const main = path.join(OPENCLAW_DIR, 'workspace');
    if (exists(main)) map.workspace = main;
    try {
      for (const entry of fs.readdirSync(OPENCLAW_DIR, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.startsWith('workspace-')) {
          map[entry.name] = path.join(OPENCLAW_DIR, entry.name);
        }
      }
    } catch {
      // ignore
    }
    return map;
  }

  if (exists(HERMES_MAIN_WORKSPACE)) {
    map.main = HERMES_MAIN_WORKSPACE;
    map.workspace = HERMES_MAIN_WORKSPACE;
  }

  try {
    if (exists(HERMES_WORKSPACES_DIR)) {
      for (const entry of fs.readdirSync(HERMES_WORKSPACES_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        map[entry.name] = path.join(HERMES_WORKSPACES_DIR, entry.name);
      }
    }
  } catch {
    // ignore
  }

  return map;
}

export function resolveWorkspacePath(workspaceId: string): string | null {
  const map = getWorkspaceMap();
  return map[workspaceId] || null;
}

export function listWorkspaceInfos(): WorkspaceInfo[] {
  const map = getWorkspaceMap();
  const infos = Object.entries(map)
    .filter(([, workspacePath]) => exists(workspacePath))
    .map(([id, workspacePath]) => {
      const identity = parseIdentity(workspacePath);
      const isMain = id === 'workspace' || id === 'main';
      const displayId = id === 'workspace' ? 'main' : id;
      const workspaceName =
        id === 'mission-control'
          ? 'Mission Control'
          : isMain
            ? 'Main Workspace'
            : displayId.charAt(0).toUpperCase() + displayId.slice(1);
      return {
        id,
        name: workspaceName,
        emoji: identity.emoji || (id === 'mission-control' ? '🖥️' : isMain ? '🤖' : '🧠'),
        path: workspacePath,
        agentName: identity.name || (isMain ? 'Hermes' : undefined),
      };
    });

  infos.sort((a, b) => {
    if (a.id === 'workspace' || a.id === 'main') return -1;
    if (b.id === 'workspace' || b.id === 'main') return 1;
    if (a.id === 'mission-control') return 1;
    if (b.id === 'mission-control') return -1;
    return a.name.localeCompare(b.name);
  });

  return infos;
}

export function resolveSafePath(basePath: string, requestedPath: string): string | null {
  const fullPath = path.resolve(basePath, requestedPath);
  return fullPath.startsWith(basePath) ? fullPath : null;
}
