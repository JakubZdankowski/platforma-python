import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signInStudent, signInTeacher } from '../../src/auth/authService';
import { createStudent, resetStudentPassword } from '../../src/classes/classService';
import type { AppSupabaseClient } from '../../src/database/supabase';
import { SEED, adminClient, anonClient } from './localSupabase';

// Milestone 3 acceptance: three students sign in separately and cannot see
// each other's data. Plus spec §31 permission checks for this milestone's tables.

const run = Date.now().toString(36);
const admin = adminClient();
const createdUserIds: string[] = [];

async function studentClient(username: string, password = SEED.password(username), joinCode = SEED.joinCode) {
  const client = anonClient();
  const error = await signInStudent(client, joinCode, username, password);
  return { client, error };
}

async function signedInStudent(username: string): Promise<{ client: AppSupabaseClient; id: string }> {
  const { client, error } = await studentClient(username);
  expect(error).toBeNull();
  const { data } = await client.auth.getUser();
  return { client, id: data.user!.id };
}

async function teacherClient(email: string, password: string): Promise<AppSupabaseClient> {
  const client = anonClient();
  expect(await signInTeacher(client, email, password)).toBeNull();
  return client;
}

async function createTeacher(name: string) {
  const email = `${name}-${run}@example.test`;
  const password = `${name}-${run}-password`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'teacher', display_name: name },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  return { id: data.user.id, client: await teacherClient(email, password) };
}

let seedTeacher: AppSupabaseClient;
let seedClassId: string;
let other: { id: string; client: AppSupabaseClient };
let otherClassId: string;

beforeAll(async () => {
  seedTeacher = await teacherClient(SEED.teacher.email, SEED.teacher.password);
  const { data } = await seedTeacher.from('classes').select('id').eq('join_code', SEED.joinCode).single();
  seedClassId = data!.id;
  other = await createTeacher('other-teacher');
  const created = await other.client.from('classes').insert({ name: 'Inna klasa' }).select('id, join_code').single();
  expect(created.error).toBeNull();
  otherClassId = created.data!.id;
});

afterAll(async () => {
  // Students reference their teacher, so remove them first.
  const { data: students } = await admin.from('profiles').select('id').in('created_by', createdUserIds);
  for (const student of students ?? []) await admin.auth.admin.deleteUser(student.id);
  for (const id of createdUserIds.reverse()) await admin.auth.admin.deleteUser(id);
});

describe('signed-out visitors', () => {
  it('cannot read any classroom data', async () => {
    const client = anonClient();
    for (const table of ['profiles', 'classes', 'class_members'] as const) {
      const { data } = await client.from(table).select('*');
      expect(data ?? []).toEqual([]);
    }
  });

  it('cannot create classes', async () => {
    const { error } = await anonClient().from('classes').insert({ name: 'Hack' });
    expect(error).not.toBeNull();
  });

  it('cannot sign up on their own', async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: `self-signup-${run}@example.test`,
      password: `self-signup-${run}`,
      options: { data: { role: 'teacher' } },
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});

describe('student sign-in', () => {
  it('signs in three students separately, each seeing only their own data', async () => {
    const sessions = await Promise.all(SEED.students.map((username) => signedInStudent(username)));
    expect(new Set(sessions.map((session) => session.id)).size).toBe(3);

    for (const [index, session] of sessions.entries()) {
      const profiles = await session.client.from('profiles').select('id, username, role');
      expect(profiles.data).toEqual([{ id: session.id, username: SEED.students[index], role: 'student' }]);

      const classes = await session.client.from('classes').select('name');
      expect(classes.data).toEqual([{ name: SEED.className }]);

      const members = await session.client.from('class_members').select('student_id');
      expect(members.data).toEqual([{ student_id: session.id }]);

      // Even when asking for a classmate directly.
      const classmate = sessions[(index + 1) % sessions.length]!;
      const peek = await session.client.from('profiles').select('id').eq('id', classmate.id);
      expect(peek.data).toEqual([]);
    }
  });

  it('accepts lowercase codes and uppercase usernames', async () => {
    const { error } = await studentClient('KUBA', SEED.password('kuba'), ' python25 ');
    expect(error).toBeNull();
  });

  it('rejects a wrong password, class code or username with the same error', async () => {
    expect((await studentClient('kuba', 'wrong-password')).error).toBe('invalid-credentials');
    expect((await studentClient('kuba', SEED.password('kuba'), 'WRONG123')).error).toBe('invalid-credentials');
    expect((await studentClient('nobody', SEED.password('kuba'))).error).toBe('invalid-credentials');
  });

  it('does not reveal whether a class code or username exists', async () => {
    const client = anonClient();
    const lookup = async (code: string, username: string) => (await client.rpc('student_login_email', { p_join_code: code, p_username: username })).data;
    const unknownClass = await lookup('NOPE2345', 'kuba');
    const unknownUser = await lookup(SEED.joinCode, 'nobody');
    expect(unknownClass).toMatch(/@students\.invalid$/);
    expect(unknownUser).toMatch(/@students\.invalid$/);
    expect(await lookup(SEED.joinCode, 'kuba')).not.toBe(unknownClass);
  });
});

describe('students cannot', () => {
  it('create or rename classes, change memberships or edit profiles', async () => {
    const { client, id } = await signedInStudent('ania');
    expect((await client.from('classes').insert({ name: 'Moja klasa' })).error).not.toBeNull();

    const rename = await client.from('classes').update({ name: 'Zmieniona' }).eq('id', seedClassId).select('id');
    expect(rename.data ?? []).toEqual([]);

    const join = await client.from('class_members').insert({ class_id: otherClassId, student_id: id });
    expect(join.error).not.toBeNull();

    const leave = await client.from('class_members').delete().eq('student_id', id).select('id');
    expect(leave.data ?? []).toEqual([]);

    const promote = await client.from('profiles').update({ role: 'teacher' }).eq('id', id).select('id');
    expect(promote.data ?? []).toEqual([]);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', id).single();
    expect(profile?.role).toBe('student');
  });

  it('manage student accounts through the teacher function', async () => {
    const { client } = await signedInStudent('ola');
    const kuba = (await admin.from('profiles').select('id').eq('username', 'kuba').single()).data!;
    expect(await resetStudentPassword(client, kuba.id)).toEqual({ ok: false, error: 'forbidden' });
    expect(await createStudent(client, seedClassId, `intruder-${run}`, 'Intruz')).toEqual({ ok: false, error: 'forbidden' });
  });
});

describe('teachers', () => {
  it('see their own class and its students', async () => {
    const classes = await seedTeacher.from('classes').select('name, join_code');
    expect(classes.data).toContainEqual({ name: SEED.className, join_code: SEED.joinCode });
    const members = await seedTeacher.from('class_members').select('profiles(username)').eq('class_id', seedClassId);
    expect(members.data?.map((row) => row.profiles?.username).sort()).toEqual([...SEED.students]);
  });

  it('see nothing of another teacher’s classes and students', async () => {
    expect((await other.client.from('classes').select('id').eq('id', seedClassId)).data).toEqual([]);
    expect((await other.client.from('class_members').select('id').eq('class_id', seedClassId)).data).toEqual([]);
    const profiles = await other.client.from('profiles').select('id');
    expect(profiles.data).toEqual([{ id: other.id }]);
    const rename = await other.client.from('classes').update({ name: 'Przejęta' }).eq('id', seedClassId).select('id');
    expect(rename.data ?? []).toEqual([]);
  });

  it('cannot add another teacher’s student to their class', async () => {
    const kuba = (await admin.from('profiles').select('id').eq('username', 'kuba').single()).data!;
    const { error } = await other.client.from('class_members').insert({ class_id: otherClassId, student_id: kuba.id });
    expect(error).not.toBeNull();
    expect(await resetStudentPassword(other.client, kuba.id)).toEqual({ ok: false, error: 'not-found' });
    expect(await createStudent(other.client, seedClassId, `x-${run}`, 'X')).toEqual({ ok: false, error: 'not-found' });
  });

  it('cannot choose the class owner or join code', async () => {
    const forged = await other.client.from('classes').insert({ name: 'Podrobiona', join_code: 'FORGED99' });
    expect(forged.error).not.toBeNull();
    const stolen = await other.client.from('classes').update({ teacher_id: other.id }).eq('id', seedClassId);
    expect(stolen.error).not.toBeNull();
  });

  it('create a student who can sign in, and reset the password', async () => {
    const { data: classRow } = await other.client.from('classes').select('join_code').eq('id', otherClassId).single();
    const username = `zosia-${run}`;
    const created = await createStudent(other.client, otherClassId, username, 'Zosia');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.password).toMatch(/^[a-hjkmnp-z2-9]{8}$/);

    const first = anonClient();
    expect(await signInStudent(first, classRow!.join_code, username, created.value.password)).toBeNull();
    expect((await first.from('classes').select('id')).data).toEqual([{ id: otherClassId }]);

    expect(await createStudent(other.client, otherClassId, username, 'Zosia 2')).toEqual({ ok: false, error: 'username-taken' });

    const reset = await resetStudentPassword(other.client, created.value.studentId);
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(await signInStudent(anonClient(), classRow!.join_code, username, created.value.password)).toBe('invalid-credentials');
    expect(await signInStudent(anonClient(), classRow!.join_code, username, reset.value.password)).toBeNull();
    // The session opened with the old password cannot be refreshed any more.
    expect((await first.auth.refreshSession()).error).not.toBeNull();
  });

  it('cannot end other users’ sessions', async () => {
    const kuba = (await admin.from('profiles').select('id').eq('username', 'kuba').single()).data!;
    expect((await other.client.rpc('revoke_user_sessions', { p_user_id: kuba.id })).error).not.toBeNull();
    expect((await anonClient().rpc('revoke_user_sessions', { p_user_id: kuba.id })).error).not.toBeNull();
  });

  it('allow the same username for students of different teachers', async () => {
    const created = await createStudent(other.client, otherClassId, 'kuba', 'Kuba z innej klasy');
    expect(created.ok).toBe(true);
    // The seed teacher's kuba still signs in with the seed password.
    expect((await studentClient('kuba')).error).toBeNull();
  });
});

describe('accounts without a classroom role', () => {
  it('get no profile and no data, even with a role in user metadata', async () => {
    const email = `no-role-${run}@example.test`;
    const password = `no-role-${run}-password`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'teacher' },
    });
    if (error) throw error;
    createdUserIds.push(data.user.id);
    const client = await teacherClient(email, password);
    expect((await client.from('profiles').select('id')).data).toEqual([]);
    expect((await client.from('classes').insert({ name: 'Nie' })).error).not.toBeNull();
  });
});
