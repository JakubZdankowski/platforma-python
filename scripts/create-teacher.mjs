// Creates a teacher account. Public sign-up is disabled, so this (or the
// seed for local development) is how teachers get accounts.
//
//   $env:SUPABASE_URL = "https://<project>.supabase.co"
//   $env:SUPABASE_SECRET_KEY = "<secret / service_role key>"   # never commit, never put in VITE_*
//   pnpm teacher:create teacher@school.example "Pani Anna"
//
// Prints a generated password once. The teacher signs in at /login.
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const [email, displayName] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!email || !displayName) {
  console.error('Usage: pnpm teacher:create <email> "<display name>"');
  process.exit(1);
}
if (!url || !secretKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY first (see README).');
  process.exit(1);
}

const password = randomBytes(12).toString('base64url');
const supabase = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: 'teacher', display_name: displayName.trim() },
});

if (error) {
  console.error(`Could not create the teacher: ${error.message}`);
  process.exit(1);
}
console.log(`Teacher created: ${data.user.email}`);
console.log(`Password (shown once): ${password}`);
