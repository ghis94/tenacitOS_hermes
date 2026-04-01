import fs from 'fs';
import os from 'os';
import path from 'path';

import type {
  DashboardAgent,
  DashboardProvider,
  DashboardSession,
  DashboardSessionMessage,
  DashboardSkill,
  DashboardSystemInfo,
  OfficeAgent,
} from '@/lib/providers/types';
import {
  HERMES_AGENT_REGISTRY_PATH,
  HERMES_DEMO_AGENTS_PATH,
  HERMES_DEMO_MESSAGES_DIR,
  HERMES_DEMO_SESSIONS_PATH,
  HERMES_DEMO_SYSTEM_PATH,
  HERMES_MAIN_WORKSPACE,
  HERMES_MODE,
  HERMES_SESSIONS_DIR,
  HERMES_WORKSPACES_DIR,
} from '@/lib/providers/provider-config';
import { scanAllSkills } from '@/lib/skill-parser';

interface HermesRegistryAgent {
  id: string;
  name?: string;
  emoji?: string;
  color?: string;
  model?: string;
  workspace?: string;
  status?: DashboardAgent['status'];
  lastActivity?: string;
  subagents?: string[];
  role?: string;
  currentTask?: string;
}

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!exists(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function inferAgentsFromFilesystem(): HermesRegistryAgent[] {
  const agents: HermesRegistryAgent[] = [];

  if (exists(HERMES_MAIN_WORKSPACE)) {
    agents.push({
      id: 'main',
      name: process.env.NEXT_PUBLIC_AGENT_NAME || 'Hermes',
      emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || '🤖',
      color: '#7c3aed',
      model: process.env.DEFAULT_MODEL || 'gpt-5.4',
      workspace: HERMES_MAIN_WORKSPACE,
      status: 'unknown',
    });
  }

  try {
    if (!exists(HERMES_WORKSPACES_DIR)) return agents;
    for (const entry of fs.readdirSync(HERMES_WORKSPACES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'main') continue;
      agents.push({
        id: entry.name,
        name: entry.name,
        emoji: '🧠',
        color: '#2563eb',
        model: process.env.DEFAULT_MODEL || 'gpt-5.4',
        workspace: path.join(HERMES_WORKSPACES_DIR, entry.name),
        status: 'unknown',
      });
    }
  } catch {
    // ignore
  }

  return agents;
}

function normalizeAgents(rawAgents: HermesRegistryAgent[]): DashboardAgent[] {
  const byId = new Map(rawAgents.map((agent) => [agent.id, agent]));

  return rawAgents.map((agent) => ({
    id: agent.id,
    name: agent.name || agent.id,
    emoji: agent.emoji || '🤖',
    color: agent.color || '#666666',
    model: agent.model || process.env.DEFAULT_MODEL || 'gpt-5.4',
    workspace:
      agent.workspace ||
      (agent.id === 'main'
        ? HERMES_MAIN_WORKSPACE
        : path.join(HERMES_WORKSPACES_DIR, agent.id)),
    status: agent.status || 'unknown',
    lastActivity: agent.lastActivity,
    activeSessions: 0,
    allowAgents: agent.subagents || [],
    allowAgentsDetails: (agent.subagents || []).map((id) => {
      const sub = byId.get(id);
      return {
        id,
        name: sub?.name || id,
        emoji: sub?.emoji || '🤖',
        color: sub?.color || '#666666',
      };
    }),
  }));
}

function getDemoAgents(): DashboardAgent[] {
  const rawAgents = readJsonFile<HermesRegistryAgent[]>(HERMES_DEMO_AGENTS_PATH, []);
  return normalizeAgents(rawAgents);
}

function getFilesystemAgents(): DashboardAgent[] {
  const fromRegistry = readJsonFile<HermesRegistryAgent[]>(HERMES_AGENT_REGISTRY_PATH, []);
  const raw = fromRegistry.length > 0 ? fromRegistry : inferAgentsFromFilesystem();
  return normalizeAgents(raw);
}

function parseJsonlMessages(raw: string): DashboardSessionMessage[] {
  const messages: DashboardSessionMessage[] = [];
  let currentModel = '';

  for (const line of raw.split('\n').filter(Boolean)) {
    try {
      const obj = JSON.parse(line) as {
        type?: string;
        id?: string;
        timestamp?: string;
        modelId?: string;
        message?: {
          role?: string;
          content?: string | Array<{ type?: string; text?: string; name?: string; input?: unknown; id?: string }>;
        };
      };

      if (obj.type === 'model_change' && obj.modelId) currentModel = obj.modelId;
      if (obj.type !== 'message' || !obj.message) continue;

      const role = obj.message.role;
      const timestamp = obj.timestamp || new Date().toISOString();
      const content = obj.message.content;

      if (typeof content === 'string') {
        messages.push({
          id: obj.id || `${timestamp}-message`,
          type: role === 'user' ? 'user' : 'assistant',
          role,
          content,
          timestamp,
          model: currentModel || undefined,
        });
        continue;
      }

      for (const block of content || []) {
        if (block.type === 'text' && block.text) {
          messages.push({
            id: block.id || `${timestamp}-text`,
            type: role === 'user' ? 'user' : 'assistant',
            role,
            content: block.text,
            timestamp,
            model: currentModel || undefined,
          });
        } else if (block.type === 'tool_use' && block.name) {
          messages.push({
            id: block.id || `${timestamp}-tool-use`,
            type: 'tool_use',
            role,
            content: `${block.name}(${block.input ? JSON.stringify(block.input).slice(0, 200) : ''})`,
            timestamp,
            model: currentModel || undefined,
            toolName: block.name,
          });
        }
      }
    } catch {
      // ignore malformed line
    }
  }

  return messages;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.floor(seconds)}s`);
  return parts.join(' ');
}

export class HermesProvider implements DashboardProvider {
  readonly name = 'hermes' as const;

  async listAgents(): Promise<DashboardAgent[]> {
    return HERMES_MODE === 'demo' ? getDemoAgents() : getFilesystemAgents();
  }

  async listSessions(): Promise<DashboardSession[]> {
    if (HERMES_MODE === 'demo') {
      return readJsonFile<DashboardSession[]>(HERMES_DEMO_SESSIONS_PATH, []);
    }

    try {
      if (!exists(HERMES_SESSIONS_DIR)) return [];
      const sessions: DashboardSession[] = [];
      for (const entry of fs.readdirSync(HERMES_SESSIONS_DIR, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
        const data = readJsonFile<DashboardSession | null>(path.join(HERMES_SESSIONS_DIR, entry.name), null);
        if (data) sessions.push(data);
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  async getSessionMessages(sessionId: string): Promise<DashboardSessionMessage[]> {
    if (HERMES_MODE === 'demo') {
      return readJsonFile<DashboardSessionMessage[]>(
        path.join(HERMES_DEMO_MESSAGES_DIR, `${sessionId}.json`),
        [],
      );
    }

    const jsonPath = path.join(HERMES_SESSIONS_DIR, `${sessionId}.json`);
    const jsonlPath = path.join(HERMES_SESSIONS_DIR, `${sessionId}.jsonl`);

    if (exists(jsonPath)) {
      const data = readJsonFile<DashboardSessionMessage[] | { messages?: DashboardSessionMessage[] }>(jsonPath, []);
      return Array.isArray(data) ? data : data.messages || [];
    }

    if (exists(jsonlPath)) {
      return parseJsonlMessages(fs.readFileSync(jsonlPath, 'utf-8'));
    }

    return [];
  }

  async getSystemInfo(): Promise<DashboardSystemInfo> {
    if (HERMES_MODE === 'demo') {
      return readJsonFile<DashboardSystemInfo>(HERMES_DEMO_SYSTEM_PATH, {
        agent: {
          name: process.env.NEXT_PUBLIC_AGENT_NAME || 'Hermes',
          creature: 'Autonomous CLI Agent',
          emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || '🤖',
        },
        system: {
          uptime: 0,
          uptimeFormatted: '0s',
          nodeVersion: process.version,
          model: process.env.DEFAULT_MODEL || 'gpt-5.4',
          workspacePath: HERMES_MAIN_WORKSPACE,
          platform: os.platform(),
          hostname: os.hostname(),
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem(),
          },
        },
        integrations: [
          {
            id: 'localai',
            name: 'LocalAI',
            status: 'configured',
            icon: 'Server',
            lastActivity: new Date().toISOString(),
            detail: process.env.LOCALAI_BASE_URL || 'OpenAI-compatible endpoint',
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return {
      agent: {
        name: process.env.NEXT_PUBLIC_AGENT_NAME || 'Hermes',
        creature: 'Autonomous CLI Agent',
        emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || '🤖',
      },
      system: {
        uptime: Math.floor(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        nodeVersion: process.version,
        model: process.env.DEFAULT_MODEL || 'gpt-5.4',
        workspacePath: HERMES_MAIN_WORKSPACE,
        platform: os.platform(),
        hostname: os.hostname(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
        },
      },
      integrations: [
        {
          id: 'hermes',
          name: 'Hermes Runtime',
          status: 'configured',
          icon: 'Bot',
          lastActivity: null,
          detail: HERMES_MODE,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  async listSkills(): Promise<DashboardSkill[]> {
    return scanAllSkills();
  }

  async listOfficeAgents(): Promise<OfficeAgent[]> {
    const agents = await this.listAgents();
    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji,
      color: agent.color,
      role: agent.id === 'main' ? 'Lead Agent' : 'Sub-agent',
      currentTask:
        agent.status === 'online'
          ? 'ACTIVE: working'
          : agent.status === 'idle'
            ? 'IDLE: waiting'
            : 'SLEEPING: standby',
      isActive: agent.status === 'online',
    }));
  }
}
