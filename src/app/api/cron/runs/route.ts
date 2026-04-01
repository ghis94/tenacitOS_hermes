import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface RunEntry {
  id: string;
  jobId: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  durationMs: number | null;
  error: string | null;
}

const CRON_RUNS_PATH = path.join(process.cwd(), 'data', 'cron-runs.json');

function loadRuns(): RunEntry[] {
  try {
    if (!fs.existsSync(CRON_RUNS_PATH)) return [];
    return JSON.parse(fs.readFileSync(CRON_RUNS_PATH, 'utf-8')) as RunEntry[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const runs = loadRuns().filter((run) => run.jobId === id);
    return NextResponse.json({ runs, total: runs.length });
  } catch (error) {
    console.error('Error fetching run history:', error);
    return NextResponse.json({ error: 'Failed to fetch run history' }, { status: 500 });
  }
}
