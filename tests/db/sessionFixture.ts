import { adminClient } from './localSupabase';

export async function sessionFixture() {
  const admin = adminClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const password = `session-test-${suffix}`;
  const teacherEmail = `session-${suffix}@example.test`;
  const teacher = await admin.auth.admin.createUser({ email: teacherEmail, password, email_confirm: true,
    app_metadata: { role: 'teacher', display_name: 'Nauczyciel sesji' } });
  if (teacher.error) throw teacher.error;
  const teacherId = teacher.data.user.id;
  let studentId: string | undefined;
  const cleanup = async () => {
    const students = await admin.from('profiles').select('id').eq('created_by', teacherId);
    for (const student of students.data ?? []) await admin.auth.admin.deleteUser(student.id);
    await admin.auth.admin.deleteUser(teacherId);
  };
  try {
    const username = `sesja-${suffix}`;
    const studentEmail = `${username}.${teacherId.replaceAll('-', '')}@students.invalid`;
    const student = await admin.auth.admin.createUser({ email: studentEmail, password, email_confirm: true,
      app_metadata: { role: 'student', username, display_name: 'Uczeń sesji', created_by: teacherId } });
    if (student.error) throw student.error;
    studentId = student.data.user.id;
    const classroom = await admin.from('classes').insert({ name: 'Test sesji', teacher_id: teacherId,
      join_code: `S${Math.random().toString(36).slice(2, 10).toUpperCase()}` }).select('id, join_code').single();
    if (classroom.error) throw classroom.error;
    const member = await admin.from('class_members').insert({ class_id: classroom.data.id, student_id: studentId });
    if (member.error) throw member.error;
    const lesson = await admin.from('lessons').insert({ teacher_id: teacherId, slug: 'session-test', title: 'Lekcja sesji' }).select('id').single();
    if (lesson.error) throw lesson.error;
    const exercise = await admin.from('exercises').insert({ lesson_id: lesson.data.id, slug: 'session-test', title: 'Kod sesji', position: 1,
      instructions_markdown: 'Test sesji', starter_code: 'print("start")', runtime_type: 'python-console' }).select('id').single();
    if (exercise.error) throw exercise.error;
    const assignment = await admin.from('assignments').insert({ class_id: classroom.data.id, lesson_id: lesson.data.id });
    if (assignment.error) throw assignment.error;
    return { admin, password, teacherEmail, teacherId, studentEmail, studentId, username, classId: classroom.data.id,
      joinCode: classroom.data.join_code, exerciseId: exercise.data.id, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
