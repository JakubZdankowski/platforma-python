// Deno entry point for the teacher-students Edge Function.
// The service role key is only available here, never in the browser.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { handleRequest, type StudentAdmin } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing Supabase function environment');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const admin: StudentAdmin = {
  async teacherIdFromToken(accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return null;
    const caller = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const current = await caller.rpc('is_current_session');
    if (current.error || current.data !== true) return null;
    const profile = check(
      await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle(),
    );
    return profile?.role === 'teacher' ? data.user.id : null;
  },

  async ownsClass(teacherId, classId) {
    const row = check(
      await supabase.from('classes').select('id').eq('id', classId).eq('teacher_id', teacherId).maybeSingle(),
    );
    return row !== null;
  },

  async usernameTaken(_teacherId, username) {
    const row = check(
      await supabase.from('profiles').select('id').eq('role', 'student').eq('username', username).maybeSingle(),
    );
    return row !== null;
  },

  async createStudentUser({ email, password, username, displayName, teacherId }) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'student', username, display_name: displayName, created_by: teacherId },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'createUser returned no user');
    return data.user.id;
  },

  async addClassMember(classId, studentId) {
    check(await supabase.from('class_members').insert({ class_id: classId, student_id: studentId }));
  },

  async deleteUser(userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) console.error('teacher-students cleanup failed', error.message);
  },

  async isOwnStudent(teacherId, studentId) {
    const row = check(
      await supabase
        .from('profiles')
        .select('id')
        .eq('id', studentId)
        .eq('role', 'student')
        .eq('created_by', teacherId)
        .maybeSingle(),
    );
    return row !== null;
  },

  async setPassword(studentId, password) {
    const { error } = await supabase.auth.admin.updateUserById(studentId, { password });
    if (error) throw new Error(error.message);
  },

  async revokeSessions(studentId) {
    check(await supabase.rpc('revoke_user_sessions', { p_user_id: studentId }));
  },
};

Deno.serve((request) => handleRequest(request, admin));
