import postgres from 'postgres';

const globalForDb = global as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    max: 10, // Max connection pool size
    idle_timeout: 20, // Close idle connections after 20s
    connect_timeout: 10, // Fail fast if database is unreachable
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}

export async function ensureDbUser(user: any) {
  if (!user || !user.id) return;

  const email = user.email || '';
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || '';

  try {
    // 1. Insert into auth.users in Neon
    await sql`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (${user.id}, ${email}, ${JSON.stringify(user.user_metadata || {})})
      ON CONFLICT (id) DO NOTHING
    `;

    // 2. Insert into public.profiles in Neon
    await sql`
      INSERT INTO public.profiles (id, display_name, avatar_url)
      VALUES (${user.id}, ${fullName}, ${avatarUrl})
      ON CONFLICT (id) DO NOTHING
    `;

    // 3. Insert into public.user_preferences in Neon
    await sql`
      INSERT INTO public.user_preferences (user_id)
      VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;
  } catch (err) {
    console.error('Failed to sync/ensure user in Neon DB:', err);
  }
}
