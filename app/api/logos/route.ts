import { NextResponse } from 'next/server';
import { fetchTeamLogos } from '@/lib/espn';

export async function GET() {
  const logoMap = await fetchTeamLogos();
  return NextResponse.json(logoMap, {
    headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' },
  });
}
