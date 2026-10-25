import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../app/ui/Button';

export function StudentPasswordButton({ studentId, displayName }: { studentId: string; displayName: string }) {
  const { client } = useAuth();
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function reset() {
    if (busy || !window.confirm(`Wygenerować nowe hasło dla ${displayName}? Poprzednie hasło przestanie działać, a uczeń zostanie wylogowany.`)) return;
    setBusy(true); setPassword(null); setError('');
    try {
      const result = await client.functions.invoke<{ password?: string }>('teacher-students', {
        body: { action: 'reset-password', studentId },
      });
      if (result.error || !result.data?.password) throw new Error('Password reset failed');
      setPassword(result.data.password);
    } catch {
      setError('Nie udało się zmienić hasła. Spróbuj ponownie.');
    } finally { setBusy(false); }
  }

  return <div className="student-password-action">
    <Button variant="secondary" size="compact" disabled={busy} aria-label={`Zresetuj hasło: ${displayName}`} onClick={() => void reset()}>{busy ? 'Zmienianie…' : 'Zresetuj hasło'}</Button>
    {password && <div className="credential-notice" role="status"><strong>Nowe hasło dla {displayName}: <span data-testid="issued-student-password">{password}</span></strong><p>Widoczne tylko teraz. Przekaż je uczniowi przed ukryciem.</p><Button variant="quiet" size="compact" onClick={() => setPassword(null)}>Ukryj hasło</Button></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
