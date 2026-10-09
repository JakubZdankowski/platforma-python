import { Link } from 'react-router';
import type { Profile } from '../auth/authService';
import { homePath } from '../auth/RequireRole';

export function HomePage({ profile }: { profile?: Profile }) {
  return <main className="home-page">
    <section className="home-intro" aria-labelledby="home-title">
      <p className="eyebrow">SKY BLUE · NAUKA PROGRAMOWANIA</p>
      <h1 id="home-title">Twój pierwszy krok w Pythonie</h1>
      <p>Pisz kod, uruchamiaj go i odkrywaj, co potrafisz stworzyć. Lekcje, zadania i rysowanie z żółwiem — w jednym miejscu.</p>
    </section>
    {profile ? <section className="home-card" aria-labelledby="continue-title">
      <span className="home-role">{profile.role === 'student' ? 'STREFA UCZNIA' : 'STREFA NAUCZYCIELA'}</span>
      <h2 id="continue-title">Cześć, {profile.displayName}!</h2>
      <p>{profile.role === 'student' ? 'Wróć do swoich klas i kontynuuj naukę Pythona.' : 'Wróć do swoich klas, lekcji i pracy uczniów.'}</p>
      <Link className="button button-primary" to={homePath(profile.role)}>{profile.role === 'student' ? 'Przejdź do moich klas →' : 'Przejdź do panelu nauczyciela →'}</Link>
    </section> : <><div className="home-entries">
      <section className="home-card" aria-labelledby="student-entry">
        <span className="home-role" aria-hidden="true">01 / UCZEŃ</span>
        <h2 id="student-entry">Jestem uczniem</h2>
        <p>Otwórz lekcje od nauczyciela i kontynuuj swoje zadania. Twój kod zapisuje się automatycznie.</p>
        <Link className="button button-primary" to="/join">Zaloguj się jako uczeń →</Link>
        <small>Przygotuj kod klasy, nazwę użytkownika i hasło od nauczyciela.</small>
      </section>
      <section className="home-card" aria-labelledby="teacher-entry">
        <span className="home-role" aria-hidden="true">02 / NAUCZYCIEL</span>
        <h2 id="teacher-entry">Jestem nauczycielem</h2>
        <p>Zarządzaj klasami, udostępniaj lekcje i obserwuj pracę uczniów podczas zajęć.</p>
        <Link className="button button-secondary" to="/login">Zaloguj się jako nauczyciel →</Link>
        <small>Zaloguj się adresem e-mail i hasłem do swojego konta.</small>
      </section>
    </div>
    <p className="home-note">Dostęp do lekcji i ćwiczeń wymaga zalogowania. Konto ucznia tworzy nauczyciel.</p>
    </>}
  </main>;
}
