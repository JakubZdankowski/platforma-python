// Teacher-only management of student accounts. Runtime-independent: the
// Deno entry point (index.ts) supplies the Supabase-backed dependencies,
// unit tests supply fakes.

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DISPLAY_NAME_MAX = 60;

// No easily confused characters (i, l, o, 0, 1).
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const PASSWORD_LENGTH = 8;

export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid-input'
  | 'username-taken'
  | 'not-found'
  | 'server-error';

export type StudentAction =
  | { action: 'create'; classId?: string; username: string; displayName: string }
  | { action: 'reset-password'; studentId: string };

export interface StudentAdmin {
  /** Returns the caller's id when the access token belongs to a teacher. */
  teacherIdFromToken(accessToken: string): Promise<string | null>;
  ownsClass(teacherId: string, classId: string): Promise<boolean>;
  usernameTaken(teacherId: string, username: string): Promise<boolean>;
  /** Creates the auth user; the database trigger creates the profile. */
  createStudentUser(input: {
    email: string;
    password: string;
    username: string;
    displayName: string;
    teacherId: string;
  }): Promise<string>;
  addClassMember(classId: string, studentId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  isOwnStudent(teacherId: string, studentId: string): Promise<boolean>;
  setPassword(studentId: string, password: string): Promise<void>;
  /** Signs the student out everywhere, so the old password's sessions end. */
  revokeSessions(studentId: string): Promise<void>;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Must match private.student_auth_email() in the database migration. */
export function studentAuthEmail(teacherId: string, username: string): string {
  return `${username}.${teacherId.replaceAll('-', '')}@students.invalid`;
}

export function generatePassword(randomBytes: (length: number) => Uint8Array = defaultRandomBytes): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  let password = '';
  while (password.length < PASSWORD_LENGTH) {
    for (const byte of randomBytes(PASSWORD_LENGTH * 2)) {
      if (byte < limit && password.length < PASSWORD_LENGTH) {
        password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      }
    }
  }
  return password;
}

function defaultRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function parseAction(body: unknown): StudentAction | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = body as Record<string, unknown>;
  if (value.action === 'create') {
    const { classId, username, displayName } = value;
    if (classId !== undefined && (typeof classId !== 'string' || !UUID_PATTERN.test(classId))) return null;
    if (typeof username !== 'string' || typeof displayName !== 'string') return null;
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedName = displayName.trim().replace(/\s+/g, ' ');
    if (!USERNAME_PATTERN.test(normalizedUsername)) return null;
    if (normalizedName.length < 1 || normalizedName.length > DISPLAY_NAME_MAX) return null;
    return { action: 'create', classId, username: normalizedUsername, displayName: normalizedName };
  }
  if (value.action === 'reset-password') {
    const { studentId } = value;
    if (typeof studentId !== 'string' || !UUID_PATTERN.test(studentId)) return null;
    return { action: 'reset-password', studentId };
  }
  return null;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, error: ErrorCode): Response {
  return json(status, { error });
}

export async function handleRequest(
  request: Request,
  admin: StudentAdmin,
  makePassword: () => string = generatePassword,
): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return fail(405, 'invalid-input');

  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return fail(401, 'unauthorized');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'invalid-input');
  }

  try {
    const teacherId = await admin.teacherIdFromToken(token);
    if (!teacherId) return fail(403, 'forbidden');

    const action = parseAction(body);
    if (!action) return fail(400, 'invalid-input');

    if (action.action === 'create') {
      if (action.classId && !(await admin.ownsClass(teacherId, action.classId))) return fail(404, 'not-found');
      if (await admin.usernameTaken(teacherId, action.username)) return fail(409, 'username-taken');
      const password = makePassword();
      const studentId = await admin.createStudentUser({
        email: studentAuthEmail(teacherId, action.username),
        password,
        username: action.username,
        displayName: action.displayName,
        teacherId,
      });
      try {
        if (action.classId) await admin.addClassMember(action.classId, studentId);
      } catch (error) {
        await admin.deleteUser(studentId);
        throw error;
      }
      return json(200, { studentId, username: action.username, password });
    }

    if (!(await admin.isOwnStudent(teacherId, action.studentId))) return fail(404, 'not-found');
    const password = makePassword();
    await admin.setPassword(action.studentId, password);
    await admin.revokeSessions(action.studentId);
    return json(200, { studentId: action.studentId, password });
  } catch (error) {
    // Details stay in the function log; the browser gets a generic code.
    // Never log the request body: it may contain names, and responses contain passwords.
    console.error('teacher-students failed', error instanceof Error ? error.message : 'unknown error');
    return fail(500, 'server-error');
  }
}
