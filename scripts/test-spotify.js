const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

async function testSpotify() {
  console.log('Using Client ID:', clientId);
  console.log('Using Client Secret:', clientSecret ? '***' : 'undefined');

  if (!clientId || !clientSecret) {
    console.error('Spotify credentials missing from .env.local');
    return;
  }

  // 1. Get Access Token
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  console.log('Token Response Status:', tokenRes.status);
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Failed to get token:', tokenData);
    return;
  }

  const token = tokenData.access_token;
  console.log('Token acquired successfully! (truncated):', token.slice(0, 15) + '...');

  // 2. Test Search API
  const searchRes = await fetch('https://api.spotify.com/v1/search?q=badsha&type=track&limit=1', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('Search API Status:', searchRes.status);
  const text = await searchRes.text();
  console.log('Raw search response:', text);
}

testSpotify().catch(console.error);
