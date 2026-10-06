import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Messages } from '../i18n/en';
import { AddExistingStudentForm } from './AddExistingStudentForm';
import { ClassStudents } from './ClassStudents';
import { CredentialNotice, type IssuedCredentials } from './CredentialNotice';
import { NewStudentForm } from './NewStudentForm';
import { RenameClassForm } from './RenameClassForm';
import { useClassData } from './useClassData';

export function ClassPage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const { classId = '' } = useParams();
  const { data, reload } = useClassData(client, profile.id, classId);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null);

  const back = <p><Link to="/teacher">← {t.allClasses}</Link></p>;
  if (data.status === 'loading') return <main className="account-page">{back}<p className="account-muted" role="status">{t.loadingData}</p></main>;
  if (data.status === 'not-found') return <main className="account-page">{back}<p className="form-error" role="alert">{t.classNotFound}</p></main>;
  if (data.status === 'error') {
    return <main className="account-page">{back}<div className="form-error" role="alert">
      <p>{t.dataUnavailable}</p>
      <button type="button" className="button button-secondary button-small" onClick={reload}>{t.retry}</button>
    </div></main>;
  }

  const { details, members, allStudents } = data;
  const memberIds = new Set(members.map((student) => student.id));
  const candidates = allStudents.filter((student) => !memberIds.has(student.id));

  return <main className="account-page">
    {back}
    <RenameClassForm key={details.name} client={client} classId={details.id} name={details.name} messages={t} onRenamed={reload} />
    <p className="join-code-line">
      <span>{t.joinCode}: </span><code className="join-code" data-testid="join-code">{details.joinCode}</code>
    </p>
    <p className="account-muted">{t.joinCodeHint}</p>

    <section className="account-section" aria-labelledby="class-students-heading">
      <h2 id="class-students-heading">{t.studentsTitle(members.length)}</h2>
      {credentials && <CredentialNotice credentials={credentials} messages={t} onDismiss={() => setCredentials(null)} />}
      <ClassStudents
        client={client}
        classId={details.id}
        students={members}
        messages={t}
        onPasswordReset={(student, password) => setCredentials({ displayName: student.displayName, username: student.username, password, joinCode: details.joinCode })}
        onChanged={reload}
      />
    </section>

    <section className="account-section" aria-labelledby="new-student-heading">
      <h2 id="new-student-heading">{t.newStudent}</h2>
      <NewStudentForm
        client={client}
        classId={details.id}
        messages={t}
        onCreated={(created, displayName) => {
          setCredentials({ displayName, username: created.username, password: created.password, joinCode: details.joinCode });
          reload();
        }}
      />
    </section>

    {candidates.length > 0 && <section className="account-section" aria-labelledby="existing-student-heading">
      <h2 id="existing-student-heading">{t.addExistingStudent}</h2>
      <AddExistingStudentForm client={client} classId={details.id} candidates={candidates} messages={t} onAdded={reload} />
    </section>}
  </main>;
}
