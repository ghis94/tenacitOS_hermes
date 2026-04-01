import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CRON_JOBS_PATH = path.join(process.cwd(), 'data', 'cron-jobs.json');
const CRON_JOBS_EXAMPLE_PATH = path.join(process.cwd(), 'data', 'cron-jobs.example.json');

interface CronJobRecord {
  id: string;
  name: string;
  description?: string;
  schedule?: string;
  timezone?: string;
  enabled?: boolean;
  lastStatus?: string | null;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastDurationMs?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

function loadJobs(): CronJobRecord[] {
  const target = fs.existsSync(CRON_JOBS_PATH) ? CRON_JOBS_PATH : CRON_JOBS_EXAMPLE_PATH;
  try {
    return JSON.parse(fs.readFileSync(target, 'utf-8')) as CronJobRecord[];
  } catch {
    return [];
  }
}

function saveJobs(jobs: CronJobRecord[]) {
  fs.mkdirSync(path.dirname(CRON_JOBS_PATH), { recursive: true });
  fs.writeFileSync(CRON_JOBS_PATH, JSON.stringify(jobs, null, 2));
}

function toUiJob(job: CronJobRecord) {
  return {
    id: job.id,
    agentId: 'main',
    name: job.name || 'Unnamed',
    enabled: job.enabled ?? true,
    createdAtMs: job.createdAt ? new Date(job.createdAt).getTime() : Date.now(),
    updatedAtMs: job.updatedAt ? new Date(job.updatedAt).getTime() : Date.now(),
    schedule: { kind: 'cron', expr: job.schedule || '* * * * *', tz: job.timezone || 'UTC' },
    sessionTarget: null,
    payload: { kind: 'agentTurn', message: job.description || '' },
    delivery: null,
    state: {
      lastRunAtMs: job.lastRunAt ? new Date(job.lastRunAt).getTime() : null,
      nextRunAtMs: job.nextRunAt ? new Date(job.nextRunAt).getTime() : null,
      lastStatus: job.lastStatus || null,
    },
    description: job.description || '',
    scheduleDisplay: `${job.schedule || '* * * * *'}${job.timezone ? ` (${job.timezone})` : ''}`,
    timezone: job.timezone || 'UTC',
    nextRun: job.nextRunAt || null,
    lastRun: job.lastRunAt || null,
  };
}

export async function GET() {
  try {
    const jobs = loadJobs().map(toUiJob);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch cron jobs' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled } = body;
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const jobs = loadJobs();
    const idx = jobs.findIndex((job) => job.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    jobs[idx].enabled = Boolean(enabled);
    jobs[idx].updatedAt = new Date().toISOString();
    saveJobs(jobs);

    return NextResponse.json({ success: true, id, enabled: jobs[idx].enabled });
  } catch (error) {
    console.error('Error updating cron job:', error);
    return NextResponse.json({ error: 'Failed to update cron job' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const jobs = loadJobs().filter((job) => job.id !== id);
    saveJobs(jobs);

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('Error deleting cron job:', error);
    return NextResponse.json({ error: 'Failed to delete cron job' }, { status: 500 });
  }
}
