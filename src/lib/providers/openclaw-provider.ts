import fs from 'fs';
import os from 'os';
import path, { join } from 'path';
import { execSync } from 'child_process';

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
  OPENCLAW_CONFIG,
  OPENCLAW_DIR,
  OPENCLAW_WORKSPACE,
} from '@/lib/providers/provider-config';
import { scanAllSkills } from '@/lib/skill-parser';

function readOpenClawConfig(): any {
  return JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf-8'));
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

export class OpenClawProvider implements DashboardProvider {
  readonly name = 'openclaw' as const;

  async listAgents(): Promise<DashboardAgent[]> {
    const config = readOpenClawConfig();
    return (config.agents?.list || []).map((agent: any) => {
      const today = new Date().toISOString().split('T')[0];
      const memoryFile = join(agent.workspace, 'memory', `${today}.md`);
      let lastActivity: string | undefined;
      let status: DashboardAgent['status'] = 'offline';
      try {
        const stat = fs.statSync(memoryFile);
        lastActivity = stat.mtime.toISOString();
        status = Date.now() - stat.mtime.getTime() < 5 * 60 * 1000 ? 'online' : 'offline';
      } catch {
        // ignore
      }
      return {
        id: agent.id,
        name: agent.name || agent.id,
        emoji: agent.ui?.emoji || '🤖',
        color: agent.ui?.color || '#666666',
        model: agent.model?.primary || config.agents?.defaults?.model?.primary || 'unknown',
        workspace: agent.workspace,
        status,
        lastActivity,
        activeSessions: 0,
        allowAgents: agent.subagents?.allowAgents || [],
        allowAgentsDetails: [],
      };
    });
  }

  async listSessions(): Promise<DashboardSession[]> {
    const output = execSync('openclaw sessions list --json 2>/dev/null', {
      timeout: 10000,
      encoding: 'utf-8',
    });
    const data = JSON.parse(output) as { sessions?: any[] };
    return (data.sessions || []).map((raw) => ({
      id: raw.key,
      key: raw.key,
      type: 'unknown',
      typeLabel: 'OpenClaw Session',
      typeEmoji: '🦞',
      sessionId: raw.sessionId || null,
      updatedAt: raw.updatedAt || Date.now(),
      ageMs: raw.ageMs || 0,
      model: raw.model || 'unknown',
      modelProvider: raw.modelProvider || 'unknown',
      inputTokens: raw.inputTokens || 0,
      outputTokens: raw.outputTokens || 0,
      totalTokens: raw.totalTokens || 0,
      contextTokens: raw.contextTokens || 0,
      contextUsedPercent: null,
      aborted: !!raw.abortedLastRun,
    }));
  }

  async getSessionMessages(sessionId: string): Promise<DashboardSessionMessage[]> {
    const filePath = path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions', `${sessionId}.jsonl`);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const obj = JSON.parse(line) as any;
          if (obj.type !== 'message' || !obj.message) return [];
          return [{
            id: obj.id || `${sessionId}-message`,
            type: obj.message.role === 'user' ? 'user' : 'assistant',
            role: obj.message.role,
            content: typeof obj.message.content === 'string' ? obj.message.content : JSON.stringify(obj.message.content),
            timestamp: obj.timestamp || new Date().toISOString(),
            model: obj.modelId,
          } satisfies DashboardSessionMessage];
        } catch {
          return [];
        }
      });
  }

  async getSystemInfo(): Promise<DashboardSystemInfo> {
    return {
      agent: {
        name: process.env.NEXT_PUBLIC_AGENT_NAME || 'Mission Control',
        creature: 'OpenClaw Agent',
        emoji: process.env.NEXT_PUBLIC_AGENT_EMOJI || '🤖',
      },
      system: {
        uptime: Math.floor(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        nodeVersion: process.version,
        model: process.env.OPENCLAW_MODEL || process.env.DEFAULT_MODEL || 'anthropic/claude-sonnet-4',
        workspacePath: OPENCLAW_WORKSPACE,
        platform: os.platform(),
        hostname: os.hostname(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
        },
      },
      integrations: [],
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
      role: agent.id === 'main' ? 'Boss' : 'Agent',
      currentTask: agent.status === 'online' ? 'ACTIVE: working' : 'SLEEPING: standby',
      isActive: agent.status === 'online',
    }));
  }
}
