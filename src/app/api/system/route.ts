import fs from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

import { getProvider } from '@/lib/providers';

const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

export async function GET() {
  try {
    const systemInfo = await getProvider().getSystemInfo();
    return NextResponse.json(systemInfo);
  } catch (error) {
    console.error('Failed to get system info:', error);
    return NextResponse.json({ error: 'Failed to get system info' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    if (action === 'change_password') {
      const { currentPassword, newPassword } = data as {
        currentPassword: string;
        newPassword: string;
      };

      let envContent = '';
      try {
        envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
      } catch {
        return NextResponse.json({ error: 'Could not read configuration' }, { status: 500 });
      }

      const currentMatch = envContent.match(/^ADMIN_PASSWORD=(.*)$/m);
      const storedPassword = currentMatch?.[1]?.trim();
      if (!storedPassword || storedPassword !== currentPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }

      const updatedEnv = currentMatch
        ? envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${newPassword}`)
        : `${envContent.trimEnd()}\nADMIN_PASSWORD=${newPassword}\n`;

      fs.writeFileSync(ENV_LOCAL_PATH, updatedEnv);
      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    if (action === 'clear_activity_log') {
      const activitiesPath = path.join(process.cwd(), 'data', 'activities.json');
      fs.writeFileSync(activitiesPath, '[]');
      return NextResponse.json({ success: true, message: 'Activity log cleared' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
