import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get('trackId');
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');
  const rawQuery = searchParams.get('q');

  if (!trackId && !rawQuery && (!title || !artist)) {
    return NextResponse.json({ error: 'Missing resolve parameters.' }, { status: 400 });
  }

  // Generate cache key
  const cacheKey = trackId 
    ? `yt_resolve:${trackId}` 
    : `yt_resolve:${encodeURIComponent(title || '')}:${encodeURIComponent(artist || '')}`;

  try {
    const cachedVideoId = await redis.get<string>(cacheKey);
    if (cachedVideoId) {
      return NextResponse.json({ videoId: cachedVideoId, cached: true });
    }
  } catch (err) {
    console.warn('Redis read error for YouTube resolver:', err);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY is not configured.' }, { status: 500 });
  }

  const searchQuery = rawQuery || `${title} ${artist} audio`;
  
  // Try searching in Category 10 (Music) first for official/clean audio
  const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}&maxResults=1&videoCategoryId=10`;

  try {
    let response = await fetch(ytUrl);
    let data = await response.json();
    let videoId = data.items?.[0]?.id?.videoId;

    // Fallback if no music category match or API category fails
    if (!videoId) {
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}&maxResults=1`;
      response = await fetch(fallbackUrl);
      data = await response.json();
      videoId = data.items?.[0]?.id?.videoId;
    }

    if (!videoId) {
      return NextResponse.json({ error: 'No video found on YouTube.' }, { status: 404 });
    }

    // Cache the resolved ID
    try {
      await redis.set(cacheKey, videoId);
    } catch (err) {
      console.warn('Redis write error for YouTube resolver:', err);
    }

    return NextResponse.json({ videoId, cached: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
