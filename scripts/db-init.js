const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

// Simple .env.local file parser
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
        // Remove quotes if present
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
  console.error('Error: DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const sql = postgres(dbUrl, {
  ssl: 'require',
});

async function main() {
  console.log('Reading migration file: supabase/setup.sql...');
  const sqlPath = path.join(__dirname, '..', 'supabase', 'setup.sql');
  const migrationSql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing database migration...');
  // Execute multi-statement SQL safely
  await sql.unsafe(migrationSql);
  console.log('Migration completed successfully!');
  await sql.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
