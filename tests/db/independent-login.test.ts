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
    // Bypass the Edge Function pre-check: the database itself rejects a
    // duplicate name belonging to another teacher.
    const owner = await admin.auth.admin.createUser({ email: `${username}@example.test`, password, email_confirm: true, app_metadata: { role: 'teacher', display_name: 'Other owner' } });
    if (owner.error) throw owner.error;
    let duplicateId: string | undefined;
    try {
      const duplicate = await admin.auth.admin.createUser({ email: studentAuthEmail(owner.data.user.id, username), password, email_confirm: true,
        app_metadata: { role: 'student', username, display_name: 'Duplicate', created_by: owner.data.user.id } });
      duplicateId = duplicate.data.user?.id;
      expect(duplicate.error).not.toBeNull();
    } finally {
      if (duplicateId) await admin.auth.admin.deleteUser(duplicateId);
      await admin.auth.admin.deleteUser(owner.data.user.id);
    }
  } finally { await client.auth.signOut(); await admin.auth.admin.deleteUser(created.data.user.id); }
});
