import { useEffect, useState } from 'react';

export type EditorLease = 'checking' | 'owned' | 'occupied' | 'unsupported';

/** Auth is shared between tabs. An origin-wide lock permits one student editor
 * without treating a second tab as a new password login or clearing both tabs. */
export function useEditorLease(studentId: string | null): EditorLease {
  const [lease, setLease] = useState<{ studentId: string; status: EditorLease } | null>(null);
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    let pending = false;
    let release: (() => void) | undefined;
    const report = (status: EditorLease) => { if (active) setLease({ studentId, status }); };
    if (!navigator.locks) { report('unsupported'); return; }
    report('checking');
    const acquire = () => {
      if (!active || pending) return;
      pending = true;
      void navigator.locks.request(`python-classroom-editor:${studentId}`, { mode: 'exclusive', ifAvailable: true }, async lock => {
        if (!active) return;
        if (!lock) { report('occupied'); return; }
        report('owned');
        await new Promise<void>(resolve => { release = resolve; });
      }).catch(() => report('unsupported')).finally(() => { pending = false; });
    };
    acquire();
    const timer = window.setInterval(acquire, 1000);
    return () => { active = false; clearInterval(timer); release?.(); };
  }, [studentId]);
  return studentId && lease?.studentId === studentId ? lease.status : 'checking';
}
