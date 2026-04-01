import { NextRequest, NextResponse } from 'next/server';

import { getProvider } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');
  const provider = getProvider();

  try {
    if (sessionId) {
      const messages = await provider.getSessionMessages(sessionId);
      if (messages.length === 0) {
        return NextResponse.json({ error: 'Session not found', messages: [] }, { status: 404 });
      }
      return NextResponse.json({ sessionId, messages, total: messages.length });
    }

    const sessions = await provider.listSessions();
    return NextResponse.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error('[sessions] Error:', error);
    return NextResponse.json({ error: 'Failed to load sessions', sessions: [] }, { status: 500 });
  }
}
