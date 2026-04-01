import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type ServiceBackend = 'pm2' | 'systemd' | 'docker';

interface ServiceDef {
  name: string;
  backend: ServiceBackend;
  label: string;
}

function loadServices(): ServiceDef[] {
  const raw = process.env.HERMES_SERVICES || 'mission-control:systemd:Mission Control,hermes-runtime:systemd:Hermes Runtime';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, backend, label] = entry.split(':');
      return {
        name,
        backend: (backend as ServiceBackend) || 'systemd',
        label: label || name,
      };
    });
}

const ALLOWED_DOCKER_IDS_PATTERN = /^[a-f0-9]{6,64}$|^[a-zA-Z0-9_-]+$/;

async function pm2Action(name: string, action: string): Promise<string> {
  if (action === 'logs') {
    try {
      const logFile = `/root/.pm2/logs/${name}-out.log`;
      const { stdout } = await execAsync(`tail -100 "${logFile}" 2>/dev/null || echo "No logs available"`);
      const errFile = `/root/.pm2/logs/${name}-error.log`;
      const { stdout: errOut } = await execAsync(`tail -50 "${errFile}" 2>/dev/null || echo ""`).catch(() => ({ stdout: '' }));
      return `=== STDOUT (last 100 lines) ===\n${stdout}\n${errOut ? `\n=== STDERR (last 50 lines) ===\n${errOut}` : ''}`;
    } catch {
      return 'Could not retrieve logs';
    }
  }

  const { stdout, stderr } = await execAsync(`pm2 ${action} "${name}" 2>&1`);
  return stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
}

async function systemdAction(name: string, action: string): Promise<string> {
  if (action === 'logs') {
    const { stdout } = await execAsync(`journalctl -u "${name}" -n 100 --no-pager 2>&1`);
    return stdout;
  }

  const { stdout } = await execAsync(`systemctl ${action} "${name}" 2>&1`);
  return stdout || `${action} executed successfully`;
}

async function dockerAction(id: string, action: string): Promise<string> {
  if (!ALLOWED_DOCKER_IDS_PATTERN.test(id)) {
    throw new Error(`Invalid container ID "${id}"`);
  }
  if (action === 'logs') {
    const { stdout } = await execAsync(`docker logs --tail 100 "${id}" 2>&1`);
    return stdout;
  }

  const { stdout } = await execAsync(`docker ${action} "${id}" 2>&1`);
  return stdout || `${action} executed successfully`;
}

export async function GET() {
  return NextResponse.json({ services: loadServices() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, backend, action } = body;

    if (!name || !backend || !action) {
      return NextResponse.json({ error: 'Missing name, backend or action' }, { status: 400 });
    }

    const allowed = loadServices().find((service) => service.name === name && service.backend === backend);
    if (!allowed) {
      return NextResponse.json({ error: `Service "${name}" is not allowed` }, { status: 403 });
    }

    let output = '';
    switch (backend) {
      case 'pm2':
        output = await pm2Action(name, action);
        break;
      case 'systemd':
        output = await systemdAction(name, action);
        break;
      case 'docker':
        output = await dockerAction(name, action);
        break;
      default:
        return NextResponse.json({ error: `Unknown backend "${backend}"` }, { status: 400 });
    }

    return NextResponse.json({ success: true, output, action, name, backend });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[services API] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
