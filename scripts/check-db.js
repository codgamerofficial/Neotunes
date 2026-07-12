const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require' });

async function check() {
  try {
    const users = await sql`SELECT id, email, created_at FROM auth.users`;
    console.log('Auth users:', users);

    const profiles = await sql`SELECT id, display_name FROM public.profiles`;
    console.log('Profiles:', profiles);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await sql.end();
  }
}

check();
