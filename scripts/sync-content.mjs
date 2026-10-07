import { createClient } from '@supabase/supabase-js';
import { readCourse } from './content-parser.mjs';

const [directory] = process.argv.slice(2);
const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, SUPABASE_TEACHER_ID: teacherId } = process.env;
if (!directory || !url || !secret || !teacherId) {
  console.error('Usage: pnpm content:sync <dir>; set SUPABASE_URL, SUPABASE_SECRET_KEY and SUPABASE_TEACHER_ID.');
  process.exit(1);
}
try {
  // Validate every file before writing anything. Never log content or credentials.
  const lessons = await readCourse(directory);
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const owner = await client.from('profiles').select('role').eq('id', teacherId).single();
  if (owner.error || owner.data.role !== 'teacher') throw new Error('SUPABASE_TEACHER_ID must identify a teacher');
  for (const { exercises, ...lesson } of lessons) {
    const saved = await client.from('lessons').upsert({ ...lesson, teacher_id: teacherId }, { onConflict: 'teacher_id,slug' }).select('id').single();
    if (saved.error) throw saved.error;
    const result = await client.from('exercises').upsert(exercises.map((exercise) => ({ ...exercise, lesson_id: saved.data.id })), { onConflict: 'lesson_id,slug' });
    if (result.error) throw result.error;
    console.log(`Synced ${lesson.slug}: ${exercises.length} exercises`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Content sync failed');
  process.exit(1);
}
