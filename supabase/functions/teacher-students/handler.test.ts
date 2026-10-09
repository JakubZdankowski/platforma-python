import { describe, expect, it, vi } from 'vitest';
import {
  PASSWORD_LENGTH,
  generatePassword,
  handleRequest,
  parseAction,
  studentAuthEmail,
  type StudentAdmin,
} from './handler';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const OTHER_TEACHER = '22222222-2222-4222-8222-222222222222';
const CLASS = '33333333-3333-4333-8333-333333333333';
const STUDENT = '44444444-4444-4444-8444-444444444444';

function fakeAdmin(overrides: Partial<StudentAdmin> = {}): StudentAdmin {
  return {
    teacherIdFromToken: vi.fn(async (token: string) => (token === 'teacher-token' ? TEACHER : token === 'other-teacher' ? OTHER_TEACHER : null)),
    ownsClass: vi.fn(async (teacherId: string, classId: string) => teacherId === TEACHER && classId === CLASS),
    usernameTaken: vi.fn(async (_teacherId: string, username: string) => username === 'kuba'),
    createStudentUser: vi.fn(async () => STUDENT),
    addClassMember: vi.fn(async () => undefined),
    deleteUser: vi.fn(async () => undefined),
    isOwnStudent: vi.fn(async (teacherId: string, studentId: string) => teacherId === TEACHER && studentId === STUDENT),
    setPassword: vi.fn(async () => undefined),
    revokeSessions: vi.fn(async () => undefined),
    ...overrides,
  };
}

function post(body: unknown, token: string | null = 'teacher-token'): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request('http://localhost/teacher-students', { method: 'POST', headers, body: JSON.stringify(body) });
}

const create = { action: 'create', classId: CLASS, username: 'Ania ', displayName: '  Ania   Nowak ' };

describe('teacher-students handler', () => {
  it('creates an independent account without a class', async () => {
    const admin = fakeAdmin();
    const response = await handleRequest(post({ action: 'create', username: 'independent', displayName: 'Independent' }), admin);
    expect(response.status).toBe(200);
    expect(admin.ownsClass).not.toHaveBeenCalled();
    expect(admin.addClassMember).not.toHaveBeenCalled();
    expect(admin.createStudentUser).toHaveBeenCalled();
  });
  it('answers CORS preflight', async () => {
    const response = await handleRequest(new Request('http://localhost', { method: 'OPTIONS' }), fakeAdmin());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
  });

  it('rejects requests without a token or from non-teachers', async () => {
    const admin = fakeAdmin();
    expect((await handleRequest(post(create, null), admin)).status).toBe(401);
    expect((await handleRequest(post(create, 'student-token'), admin)).status).toBe(403);
    expect(admin.createStudentUser).not.toHaveBeenCalled();
  });

  it('creates a student with a normalized username and returns the generated password once', async () => {
    const admin = fakeAdmin();
    const response = await handleRequest(post(create), admin, () => 'abcd2345');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ studentId: STUDENT, username: 'ania', password: 'abcd2345' });
    expect(admin.createStudentUser).toHaveBeenCalledWith({
      email: studentAuthEmail(TEACHER, 'ania'),
      password: 'abcd2345',
      username: 'ania',
      displayName: 'Ania Nowak',
      teacherId: TEACHER,
    });
    expect(admin.addClassMember).toHaveBeenCalledWith(CLASS, STUDENT);
  });

  it('does not create students in another teacher’s class', async () => {
    const admin = fakeAdmin();
    const response = await handleRequest(post(create, 'other-teacher'), admin);
    expect(response.status).toBe(404);
    expect(admin.createStudentUser).not.toHaveBeenCalled();
  });

  it('reports a taken username', async () => {
    const response = await handleRequest(post({ ...create, username: 'kuba' }), fakeAdmin());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'username-taken' });
  });

  it('removes the new account when adding it to the class fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const admin = fakeAdmin({ addClassMember: vi.fn(async () => { throw new Error('insert failed'); }) });
    const response = await handleRequest(post(create), admin);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'server-error' });
    expect(admin.deleteUser).toHaveBeenCalledWith(STUDENT);
    error.mockRestore();
  });

  it('resets the password only for the teacher’s own students', async () => {
    const admin = fakeAdmin();
    const ok = await handleRequest(post({ action: 'reset-password', studentId: STUDENT }), admin, () => 'new23456');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ studentId: STUDENT, password: 'new23456' });
    expect(admin.setPassword).toHaveBeenCalledWith(STUDENT, 'new23456');
    expect(admin.revokeSessions).toHaveBeenCalledWith(STUDENT);

    const denied = await handleRequest(post({ action: 'reset-password', studentId: STUDENT }, 'other-teacher'), admin);
    expect(denied.status).toBe(404);
    expect(admin.setPassword).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid bodies', async () => {
    const admin = fakeAdmin();
    const bad = new Request('http://localhost', { method: 'POST', headers: { Authorization: 'Bearer teacher-token' }, body: 'not json' });
    expect((await handleRequest(bad, admin)).status).toBe(400);
    expect((await handleRequest(post({ action: 'delete-everything' }), admin)).status).toBe(400);
  });
});

describe('parseAction', () => {
  it.each([
    ['too short', 'ab'],
    ['Polish letters', 'łukasz'],
    ['spaces inside', 'ania nowak'],
    ['trailing dash', 'ania-'],
    ['too long', 'a'.repeat(31)],
  ])('rejects a username with %s', (_label, username) => {
    expect(parseAction({ ...create, username })).toBeNull();
  });

  it('accepts digits, dashes and underscores inside usernames', () => {
    expect(parseAction({ ...create, username: 'kuba_7-b' })).toMatchObject({ username: 'kuba_7-b' });
  });

  it('rejects empty or too long display names and malformed ids', () => {
    expect(parseAction({ ...create, displayName: '   ' })).toBeNull();
    expect(parseAction({ ...create, displayName: 'x'.repeat(61) })).toBeNull();
    expect(parseAction({ ...create, classId: 'not-a-uuid' })).toBeNull();
    expect(parseAction({ action: 'reset-password', studentId: '1' })).toBeNull();
  });
});

describe('generatePassword', () => {
  it('uses only unambiguous lowercase letters and digits', () => {
    for (let i = 0; i < 200; i += 1) {
      const password = generatePassword();
      expect(password).toHaveLength(PASSWORD_LENGTH);
      expect(password).toMatch(/^[a-hjkmnp-z2-9]+$/);
    }
  });

  it('skips bytes that would bias the distribution', () => {
    // 248 and above are rejected for a 31-character alphabet.
    const bytes = [255, 250, 248, 0, 1, 2, 3, 4, 5, 6, 7, 30, 31];
    const password = generatePassword((length) => Uint8Array.from({ length }, (_, i) => bytes[i] ?? 0));
    expect(password).toBe('abcdefgh');
  });
});

describe('studentAuthEmail', () => {
  it('matches the database format', () => {
    expect(studentAuthEmail(TEACHER, 'ola')).toBe('ola.11111111111141118111111111111111@students.invalid');
  });
});
