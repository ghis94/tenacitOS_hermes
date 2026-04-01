import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServiceCheck {
  name: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  latency?: number;
  details?: string;
  url?: string;
}

function parseServiceDefs() {
  const raw = process.env.HERMES_SERVICES || 'mission-control:systemd:Mission Control,hermes-runtime:systemd:Hermes Runtime';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, backend, label] = entry.split(':');
      return { name, backend: backend || 'systemd', label: label || name };
    });
}

async function checkUrl(url: string, timeoutMs = 5000): Promise<{ status: 'up' | 'down'; latency: number; httpCode?: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { status: res.ok || res.status < 500 ? 'up' : 'down', latency, httpCode: res.status };
  } catch {
    return { status: 'down', latency: Date.now() - start };
  }
}

async function checkSystemdService(name: string): Promise<ServiceCheck> {
  try {
    const { stdout } = await execAsync(`systemctl is-active ${name} 2>/dev/null`);
    const active = stdout.trim() === 'active';
    return { name, status: active ? 'up' : 'down', details: stdout.trim() };
  } catch {
    return { name, status: 'down', details: 'service not found' };
  }
}

async function checkPm2Service(name: string): Promise<ServiceCheck> {
  try {
    const { stdout } = await execAsync('pm2 jlist 2>/dev/null');
    const list = JSON.parse(stdout) as Array<{ name: string; pm2_env?: { status?: string; restart_time?: number } }>;
    const proc = list.find((entry) => entry.name === name);
    if (!proc) return { name, status: 'unknown', details: 'not found in pm2' };
    const status = proc.pm2_env?.status === 'online' ? 'up' : 'down';
    return { name, status, details: `${proc.pm2_env?.status} · restarts: ${proc.pm2_env?.restart_time}` };
  } catch {
    return { name, status: 'unknown', details: 'pm2 not available' };
  }
}

async function checkDockerService(name: string): Promise<ServiceCheck> {
  try {
    const { stdout } = await execAsync(`docker inspect -f '{{.State.Running}}' ${name} 2>/dev/null`);
    return { name, status: stdout.trim() === 'true' ? 'up' : 'down', details: stdout.trim() };
  } catch {
    return { name, status: 'unknown', details: 'docker not available or container missing' };
  }
}

export async function GET() {
  const checks: ServiceCheck[] = [];

  const serviceChecks = await Promise.all(
    parseServiceDefs().map(async (service) => {
      if (service.backend === 'pm2') {
        const result = await checkPm2Service(service.name);
        return { ...result, name: service.label };
      }
      if (service.backend === 'docker') {
        const result = await checkDockerService(service.name);
        return { ...result, name: service.label };
      }
      const result = await checkSystemdService(service.name);
      return { ...result, name: service.label };
    }),
  );
  checks.push(...serviceChecks);

  const urlTargets = [
    {
      name: 'LocalAI',
      url: process.env.LOCALAI_BASE_URL || 'http://192.168.1.196:8081',
      timeout: 3000,
      accept401: false,
    },
  ];

  if (process.env.HERMES_API_BASE_URL && process.env.HERMES_MODE === 'api') {
    urlTargets.push({
      name: 'Hermes API',
      url: process.env.HERMES_API_BASE_URL,
      timeout: 3000,
      accept401: true,
    });
  }

  const urlChecks = await Promise.all(urlTargets.map((entry) => checkUrl(entry.url, entry.timeout)));
  urlTargets.forEach((target, index) => {
    const result = urlChecks[index];
    const reachable = result.status === 'up' || (target.accept401 && result.httpCode === 401);
    checks.push({
      name: target.name,
      status: reachable ? 'up' : result.status,
      latency: result.latency,
      url: target.url,
      details: reachable ? 'reachable' : 'unreachable',
    });
  });

  const downCount = checks.filter((entry) => entry.status === 'down').length;
  const overallStatus = downCount === 0 ? 'healthy' : downCount < Math.max(1, checks.length / 2) ? 'degraded' : 'critical';

  return NextResponse.json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
