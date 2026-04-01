import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

import { getProvider } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const provider = getProvider();
    const agents = await provider.listAgents();
    const agent = agents.find((entry) => entry.id === id);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const memoryPath = join(agent.workspace, 'memory');
    let recentFiles: Array<{ date: string; size: number; modified: string }> = [];

    try {
      const files = readdirSync(memoryPath).filter((entry) => entry.match(/^\d{4}-\d{2}-\d{2}\.md$/));
      recentFiles = files
        .map((file) => {
          const stat = statSync(join(memoryPath, file));
          return {
            date: file.replace('.md', ''),
            size: stat.size,
            modified: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);
    } catch {
      // ignore missing memory directory
    }

    const sessions = (await provider.listSessions()).filter(
      (session) => session.agentId === id || session.subagentId === id,
    );

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        workspace: agent.workspace,
        dmPolicy: agent.dmPolicy,
        allowAgents: agent.allowAgents || [],
        telegramConfigured: !!agent.botToken,
        status: agent.status,
        lastActivity: agent.lastActivity,
      },
      memory: {
        recentFiles,
      },
      sessions,
    });
  } catch (error) {
    console.error('Error getting agent status:', error);
    return NextResponse.json({ error: 'Failed to get agent status' }, { status: 500 });
  }
}
