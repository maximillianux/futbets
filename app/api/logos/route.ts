import { NextResponse } from 'next/server';
import { fetchTeamLogos } from '@/lib/espn';
import { getCachedLogos, setCachedLogos } from '@/lib/db';

export async function GET() {
  const cached = await getCachedLogos();
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' },
    });
  }

  const logoMap = await fetchTeamLogos();
  await setCachedLogos(logoMap);
  return NextResponse.json(logoMap, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' },
  });
}
