import { NextResponse } from 'next/server';

import { listWorkspaceInfos } from '@/lib/workspace-utils';

export async function GET() {
  try {
    const workspaces = listWorkspaceInfos();
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    return NextResponse.json({ workspaces: [] }, { status: 500 });
  }
}
