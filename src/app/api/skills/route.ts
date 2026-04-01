import { NextResponse } from 'next/server';

import { getProvider } from '@/lib/providers';

export async function GET() {
  try {
    const skills = await getProvider().listSkills();
    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Failed to scan skills:', error);
    return NextResponse.json({ skills: [] }, { status: 500 });
  }
}
