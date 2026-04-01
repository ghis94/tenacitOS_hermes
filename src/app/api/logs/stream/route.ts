import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

interface ServiceDef {
  name: string;
  backend: 'pm2' | 'systemd' | 'docker';
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
        backend: (backend as ServiceDef['backend']) || 'systemd',
        label: label || name,
      };
    });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service') || 'mission-control';
  const backend = (searchParams.get('backend') || 'systemd') as ServiceDef['backend'];

  const allowed = loadServices().find((entry) => entry.name === service && entry.backend === backend);
  if (!allowed) {
    return new Response('Service not allowed', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line: data, ts: new Date().toISOString() })}\n\n`));
        } catch {
          // ignore
        }
      };

      send(`[stream] Connected to ${service} (${backend})`);

      let cmd: string[];
      if (backend === 'pm2') {
        cmd = ['pm2', 'logs', service, '--lines', '50', '--nocolor'];
      } else if (backend === 'docker') {
        cmd = ['docker', 'logs', '-f', '--tail', '50', service];
      } else {
        cmd = ['journalctl', '-u', service, '-n', '50', '--no-pager', '-f'];
      }

      const proc = spawn(cmd[0], cmd.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });

      proc.stdout.on('data', (data: Buffer) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          send(line);
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          send(line);
        }
      });

      proc.on('error', (err) => {
        send(`[error] ${err.message}`);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });

      proc.on('close', () => {
        send('[stream] Process ended');
        try {
          controller.close();
        } catch {
          // ignore
        }
      });

      request.signal?.addEventListener('abort', () => {
        proc.kill();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
