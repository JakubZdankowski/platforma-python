import { ButtonLink } from './ui/Button';
import type { Profile } from '../auth/authService';
import { homePath } from '../auth/RequireRole';
import { PlatformCarousel } from './PlatformCarousel';
import './landing.css';

export function HomePage({ profile }: { profile?: Profile }) {
  return <main className="home-page">
    {profile ? <section className="home-card" aria-labelledby="continue-title">
      <span className="home-role">{profile.role === 'student' ? 'STREFA UCZNIA' : profile.role === 'admin' ? 'STREFA ADMINISTRATORA' : 'STREFA NAUCZYCIELA'}</span>
      <h2 id="continue-title">Cześć, {profile.displayName}!</h2>
      <p>{profile.role === 'student' ? 'Wróć do swoich materiałów i kontynuuj naukę Pythona.' : 'Wróć do swoich klas, lekcji i pracy uczniów.'}</p>
      <ButtonLink variant="primary" to={homePath(profile.role)}>{profile.role === 'student' ? 'Przejdź do pulpitu' : profile.role === 'admin' ? 'Przejdź do panelu administratora' : 'Przejdź do panelu nauczyciela'}</ButtonLink>
    </section> : <PlatformCarousel />}
  </main>;
}
