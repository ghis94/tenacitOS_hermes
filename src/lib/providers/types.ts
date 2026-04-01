export type AgentStatus = "online" | "offline" | "idle" | "unknown";

export interface DashboardAgent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  workspace: string;
  status: AgentStatus;
  lastActivity?: string;
  activeSessions: number;
  dmPolicy?: string;
  allowAgents?: string[];
  allowAgentsDetails?: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
  }>;
  botToken?: string;
}

export interface DashboardSession {
  id: string;
  key: string;
  type: 'main' | 'cron' | 'subagent' | 'direct' | 'unknown';
  typeLabel: string;
  typeEmoji: string;
  sessionId: string | null;
  cronJobId?: string;
  subagentId?: string;
  updatedAt: number;
  ageMs: number;
  model: string;
  modelProvider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextTokens: number;
  contextUsedPercent: number | null;
  aborted: boolean;
  agentId?: string;
}

export interface DashboardSessionMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'model_change' | 'system';
  role?: string;
  content: string;
  timestamp: string;
  model?: string;
  toolName?: string;
}

export interface DashboardSkill {
  id: string;
  name: string;
  description: string;
  location: string;
  source: 'workspace' | 'system';
  homepage?: string;
  emoji?: string;
  fileCount: number;
  fullContent: string;
  files: string[];
  agents: string[];
}

export interface DashboardSystemInfo {
  agent: {
    name: string;
    creature: string;
    emoji: string;
  };
  system: {
    uptime: number;
    uptimeFormatted: string;
    nodeVersion: string;
    model: string;
    workspacePath: string;
    platform: string;
    hostname: string;
    memory: {
      total: number;
      free: number;
      used: number;
    };
  };
  integrations: Array<{
    id: string;
    name: string;
    status: string;
    icon: string;
    lastActivity: string | null;
    detail: string | null;
  }>;
  timestamp: string;
}

export interface OfficeAgent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  currentTask: string;
  isActive: boolean;
}

export interface DashboardProvider {
  readonly name: 'openclaw' | 'hermes';
  listAgents(): Promise<DashboardAgent[]>;
  listSessions(): Promise<DashboardSession[]>;
  getSessionMessages(sessionId: string): Promise<DashboardSessionMessage[]>;
  getSystemInfo(): Promise<DashboardSystemInfo>;
  listSkills(): Promise<DashboardSkill[]>;
  listOfficeAgents(): Promise<OfficeAgent[]>;
}
