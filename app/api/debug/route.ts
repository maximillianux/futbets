import { NextResponse } from 'next/server';

export async function GET() {
  const slug = 'eng.1'; // Premier League as test case

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${day}`;

  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dateStr}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dateStr}&calendartype=whitelist`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/schedule?dates=${dateStr}`,
  ];

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        return {
          url,
          status: res.status,
          topLevelKeys: Object.keys(data),
          eventCount: (data.events ?? []).length,
          firstEvent: data.events?.[0]
            ? { id: data.events[0].id, date: data.events[0].date, name: data.events[0].name }
            : null,
        };
      } catch (e) {
        return { url, error: String(e) };
      }
    })
  );

  return NextResponse.json({ dateStr, results });
}
