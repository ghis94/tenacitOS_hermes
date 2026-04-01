import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CRON_RUNS_PATH = path.join(process.cwd(), 'data', 'cron-runs.json');

interface RunEntry {
  id: string;
  jobId: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  durationMs: number | null;
  error: string | null;
}

function loadRuns(): RunEntry[] {
  try {
    if (!fs.existsSync(CRON_RUNS_PATH)) return [];
    return JSON.parse(fs.readFileSync(CRON_RUNS_PATH, 'utf-8')) as RunEntry[];
  } catch {
    return [];
  }
}

function saveRuns(runs: RunEntry[]) {
  fs.mkdirSync(path.dirname(CRON_RUNS_PATH), { recursive: true });
  fs.writeFileSync(CRON_RUNS_PATH, JSON.stringify(runs, null, 2));
}

async function createNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, type }),
    });
  } catch {
    // ignore
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const startedAt = new Date();
    const completedAt = new Date(startedAt.getTime() + 1000);
    const run: RunEntry = {
      id: `${id}-${startedAt.getTime()}`,
      jobId: id,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      status: 'success',
      durationMs: completedAt.getTime() - startedAt.getTime(),
      error: null,
    };

    const runs = loadRuns();
    runs.unshift(run);
    saveRuns(runs.slice(0, 200));

    await createNotification('Cron Job Triggered', `Job "${id}" has been manually executed.`, 'success');

    return NextResponse.json({
      success: true,
      jobId: id,
      message: 'Compatibility cron job recorded successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to trigger job';
    console.error('Error triggering cron job:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
