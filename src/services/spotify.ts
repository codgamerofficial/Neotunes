import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export function validateSpotifyCredentials(clientId: string | undefined, clientSecret: string | undefined): boolean {
  if (!clientId || !clientSecret) return false;
  const id = clientId.trim();
  const secret = clientSecret.trim();
  if (id === '' || secret === '') return false;
  if (id.startsWith('your_') || secret.startsWith('your_')) return false;
  if (id.length < 10 || secret.length < 10) return false;
  return true;
}

export async function getSpotifyAccessToken(): Promise<string> {
  const cacheKey = 'spotify_access_token';
  
  try {
    const cachedToken = await redis.get<string>(cacheKey);
    if (cachedToken) {
      return cachedToken;
    }
  } catch (err) {
    console.warn('Redis read error for Spotify token:', err);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!validateSpotifyCredentials(clientId, clientSecret)) {
    throw new Error('Spotify credentials are not configured or invalid in environment variables.');
  }

  let response: Response | null = null;
  let attempt = 0;
  const maxAttempts = 3;
  let backoffDelay = 1000;

  while (attempt < maxAttempts) {
    try {
      response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
        cache: 'no-store',
      });

      if (response.ok) {
        break;
      }
      
      const errText = await response.clone().text();
      console.warn(`Spotify token attempt ${attempt + 1} returned status ${response.status}: ${errText}`);
    } catch (err: any) {
      console.warn(`Spotify token attempt ${attempt + 1} threw error: ${err.message}`);
    }

    attempt++;
    if (attempt < maxAttempts) {
      console.log(`Retrying Spotify token fetch in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      backoffDelay *= 2;
    }
  }

  if (!response || !response.ok) {
    const errText = response ? await response.text() : 'Connection timeout or network failure';
    const status = response ? response.status : 500;
    throw new Error(`Failed to fetch Spotify token: ${status} - ${errText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresIn = data.expires_in || 3600;

  try {
    // Cache token in Redis, expiring 5 minutes before Spotify's actual expiration
    await redis.set(cacheKey, token, { ex: expiresIn - 300 });
  } catch (err) {
    console.warn('Redis write error for Spotify token:', err);
  }

  return token;
}
