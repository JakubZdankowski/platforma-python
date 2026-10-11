import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { handleAccountRequest, type AccountAdmin } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
function check<T>(r: { data: T; error: { message: string } | null }): T { if (r.error) throw new Error(r.error.message); return r.data; }
const admin: AccountAdmin = {
  async adminIdFromToken(token) {
    const user = await db.auth.getUser(token);
    if (user.error || !user.data.user) return null;
    const caller = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const session = await caller.rpc('is_current_session');
    if (session.error || session.data !== true) return null;
    const p = check(await db.from('profiles').select('role').eq('id', user.data.user.id).maybeSingle());
    return p?.role === 'admin' ? user.data.user.id : null;
  },
  async account(id) {
    const p = check(await db.from('profiles').select('role,created_by').eq('id', id).maybeSingle());
    return p ? { role: p.role, createdBy: p.created_by } : null;
  },
  async create({ email, password, metadata }) {
    const r = check(await db.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: metadata }));
    if (!r.user) throw new Error('User missing');
    return r.user.id;
  },
  async edit(id, role, displayName, login) {
    // Students authenticate via the profiles -> auth.users lookup; their internal
    // email never needs to change when the visible username changes.
    if (role === 'teacher') check(await db.auth.admin.updateUserById(id, { email: login, email_confirm: true }));
    check(await db.from('profiles').update({ display_name: displayName, ...(role === 'student' ? { username: login } : {}) }).eq('id', id));
  },
  async delete(id, adminId) {
    check(await db.rpc('prepare_account_deletion', { p_user_id: id, p_admin_id: adminId }));
    check(await db.auth.admin.deleteUser(id));
  },
  async resetPassword(id, password) {
    check(await db.auth.admin.updateUserById(id, { password }));
    check(await db.rpc('revoke_user_sessions', { p_user_id: id }));
  },
};
Deno.serve((request) => handleAccountRequest(request, admin));
