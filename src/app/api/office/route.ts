import { NextResponse } from 'next/server';

import { getProvider } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await getProvider().listOfficeAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Failed to build office view:', error);
    return NextResponse.json({ error: 'Failed to load office agents', agents: [] }, { status: 500 });
  }
}
