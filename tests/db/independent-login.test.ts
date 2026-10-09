import { expect, test } from 'vitest';
import { adminClient, anonClient, SEED } from './localSupabase';
import { studentAuthEmail } from '../../supabase/functions/teacher-students/handler';

test('login works without any membership and usernames are globally unique', async () => {
  const admin = adminClient();
  const teacher = await admin.from('profiles').select('id').eq('role', 'teacher').limit(1).single();
  if (teacher.error) throw teacher.error;
  const username = `independent-${Date.now()}`;
  const password = 'independent-dev-pass';
  const created = await admin.auth.admin.createUser({ email: studentAuthEmail(teacher.data.id, username), password, email_confirm: true,
    app_metadata: { role: 'student', username, display_name: 'Independent', created_by: teacher.data.id } });
  if (created.error) throw created.error;
  const client = anonClient();
  try {
    const lookup = await client.rpc('student_login_address', { p_username: ` ${username.toUpperCase()} ` });
    expect(lookup.error).toBeNull();
    expect((await client.auth.signInWithPassword({ email: lookup.data!, password })).error).toBeNull();
    expect((await client.rpc('claim_account_session')).data).toBe(true);
    expect((await client.from('class_members').select('*')).data).toEqual([]);
    expect((await client.rpc('student_login_address', { p_username: 'does-not-exist' })).data).toContain('@students.invalid');
    const old = await client.rpc('student_login_email', { p_join_code: SEED.joinCode, p_username: 'ania' });
    expect(old.error).toBeNull();
    expect(old.data).toContain('ania.');
    // A direct insert with an existing global username is rejected even for another owner.
    const existing = await admin.from('profiles').select('username').eq('role', 'student').neq('id', created.data.user.id).limit(1).single();
    if (existing.error) throw existing.error;
    const duplicate = await admin.from('profiles').insert({ id: '00000000-0000-4000-8000-000000000001', role: 'student', display_name: 'Duplicate', username: existing.data.username!, created_by: teacher.data.id });
    expect(duplicate.error).not.toBeNull();
  } finally { await client.auth.signOut(); await admin.auth.admin.deleteUser(created.data.user.id); }
});
