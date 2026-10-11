import { corsHeaders, generatePassword, studentAuthEmail, USERNAME_PATTERN } from '../teacher-students/handler.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AccountAction =
  | { action: 'create'; role: 'teacher' | 'student'; displayName: string; login: string }
  | { action: 'edit'; userId: string; displayName: string; login: string }
  | { action: 'delete' | 'reset-password'; userId: string };

export function parseAccountAction(body: unknown): AccountAction | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.action === 'delete' || b.action === 'reset-password') {
    return typeof b.userId === 'string' && uuid.test(b.userId) ? { action: b.action, userId: b.userId } : null;
  }
  if (b.action !== 'create' && b.action !== 'edit') return null;
  if (typeof b.displayName !== 'string' || typeof b.login !== 'string') return null;
  const displayName = b.displayName.trim().replace(/\s+/g, ' '), login = b.login.trim().toLowerCase();
  if (!displayName || displayName.length > 60 || !login || login.length > 254) return null;
  if (b.action === 'edit') return typeof b.userId === 'string' && uuid.test(b.userId) ? { action: 'edit', userId: b.userId, displayName, login } : null;
  if (b.role !== 'teacher' && b.role !== 'student') return null;
  if (b.role === 'student' ? !USERNAME_PATTERN.test(login) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) return null;
  return { action: 'create', role: b.role, displayName, login };
}
export interface AccountAdmin {
  adminIdFromToken(token: string): Promise<string | null>;
  account(id: string): Promise<{ role: string; createdBy: string | null } | null>;
  create(input: { email: string; password: string; metadata: Record<string, string> }): Promise<string>;
  edit(id: string, role: string, displayName: string, login: string): Promise<void>;
  delete(id: string, adminId: string): Promise<void>;
  resetPassword(id: string, password: string): Promise<void>;
}
export async function handleAccountRequest(request: Request, admin: AccountAdmin): Promise<Response> {
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return reply(405, { error: 'invalid-input' });
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: 'unauthorized' });
  try {
    const adminId = await admin.adminIdFromToken(token);
    if (!adminId) return reply(403, { error: 'forbidden' });
    let body: unknown;
    try { body = await request.json(); } catch { return reply(400, { error: 'invalid-input' }); }
    const action = parseAccountAction(body);
    if (!action) return reply(400, { error: 'invalid-input' });
    if (action.action === 'create') {
      const password = generatePassword();
      const metadata: Record<string, string> = { role: action.role, display_name: action.displayName };
      if (action.role === 'student') { metadata.username = action.login; metadata.created_by = adminId; }
      const userId = await admin.create({ email: action.role === 'student' ? studentAuthEmail(adminId, action.login) : action.login, password, metadata });
      return reply(200, { userId, password });
    }
    const account = await admin.account(action.userId);
    if (!account || !['student', 'teacher'].includes(account.role)) return reply(404, { error: 'not-found' });
    if (action.action === 'delete') await admin.delete(action.userId, adminId);
    else if (action.action === 'edit') {
      if (account.role === 'student' ? !USERNAME_PATTERN.test(action.login) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(action.login)) return reply(400, { error: 'invalid-input' });
      await admin.edit(action.userId, account.role, action.displayName, action.login);
    } else {
      const password = generatePassword();
      await admin.resetPassword(action.userId, password);
      return reply(200, { password });
    }
    return reply(200, { ok: true });
  } catch (error) {
    console.error('admin-accounts failed', error instanceof Error ? error.message : 'unknown');
    return reply(500, { error: 'server-error' });
  }
}
