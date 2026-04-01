import { NextResponse } from 'next/server';

import { getProvider } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await getProvider().listAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error reading agents:', error);
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}
