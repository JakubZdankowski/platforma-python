import blueLogo from '../assets/sky-blue-login-logo.png';
import { ButtonLink } from '../app/ui/Button';
import { pl } from '../i18n/pl';
import '../app/landing.css';

export function LoginChoicePage() {
  return <main className="login-choice-page">
    <section className="login-choice-card" aria-labelledby="login-choice-title">
      <div className="login-choice-logo"><img src={blueLogo} width="1020" height="740" alt="Sky Blue" /></div>
      <h1 id="login-choice-title">{pl.appName}</h1>
      <nav className="login-choice-actions" aria-label="Wybierz sposób logowania">
        <ButtonLink variant="primary" to="/join">Jestem uczniem</ButtonLink>
        <ButtonLink variant="secondary" to="/login">Jestem nauczycielem</ButtonLink>
      </nav>
    </section>
  </main>;
}
