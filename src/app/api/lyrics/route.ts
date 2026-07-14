import { NextResponse } from 'next/server';

interface LyricLine {
  time: number; // in seconds
  text: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');
  const durationMs = parseInt(searchParams.get('durationMs') || '0', 10);

  if (!title || !artist) {
    return NextResponse.json({ error: 'Missing title or artist.' }, { status: 400 });
  }

  try {
    // 1. Try to fetch from LRCLIB using exact match
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    let response = await fetch(url, { 
      headers: { 'User-Agent': 'NeoTunes/1.0.0 (saswa@example.com)' },
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    let data: any = null;
    if (response.ok) {
      data = await response.json();
    } else {
      // 2. Try search fallback if exact match fails
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(artist + ' ' + title)}`;
      const searchResponse = await fetch(searchUrl, { 
        headers: { 'User-Agent': 'NeoTunes/1.0.0 (saswa@example.com)' },
        next: { revalidate: 86400 }
      });
      if (searchResponse.ok) {
        const results = await searchResponse.json();
        if (results && results.length > 0) {
          // Find the best match
          data = results[0];
        }
      }
    }

    if (!data) {
      return NextResponse.json({ lyrics: null });
    }

    let parsedLyrics: LyricLine[] = [];

    // Parse synced lyrics if available
    if (data.syncedLyrics) {
      const lines = data.syncedLyrics.split('\n');
      lines.forEach((line: string) => {
        const match = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\](.*)$/);
        if (match) {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          
          // Extract decimal part cleanly
          const msStr = match[3] || '0';
          const ms = parseFloat(`0.${msStr}`);
          const text = match[4] ? match[4].trim() : '';
          
          const time = min * 60 + sec + ms;
          
          // Exclude blank timing lines
          if (text) {
            parsedLyrics.push({ time, text });
          }
        }
      });
    } else if (data.plainLyrics) {
      // Fallback: space out plain lyrics evenly over duration
      const lines = data.plainLyrics.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const totalDurationSec = durationMs > 0 ? durationMs / 1000 : 180;
      const step = lines.length > 0 ? totalDurationSec / lines.length : 5;
      
      lines.forEach((line: string, index: number) => {
        parsedLyrics.push({
          time: Math.floor(index * step * 10) / 10,
          text: line,
        });
      });
    }

    // Sort lyrics by time
    parsedLyrics.sort((a, b) => a.time - b.time);

    // If instrumental
    if (parsedLyrics.length === 0) {
      if (data.instrumental) {
        parsedLyrics = [{ time: 0, text: '🎵 [Instrumental] 🎵' }];
      } else {
        return NextResponse.json({ lyrics: null });
      }
    }

    return NextResponse.json({ lyrics: parsedLyrics });
  } catch (error: any) {
    console.error('Error fetching lyrics from LRCLIB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
