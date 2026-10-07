import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router';
import { pl } from '../i18n/pl';
import { PlaygroundPage } from '../student/PlaygroundPage';
import blueLogo from '../assets/blue-logo.png';

const AccountApp = lazy(() => import('./AccountApp'));

export function App() {
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const messages = pl;
  useEffect(() => { document.documentElement.lang = 'pl'; document.title = messages.appName; }, [messages.appName]);

  return <BrowserRouter>
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          <img className="brand-logo" src={blueLogo} width="1020" height="740" alt="Sky Blue" />
          <span className="brand-name">{messages.appName}</span>
        </Link>
        <div className="header-actions">
          <SignInLink label={messages.signIn} />
          <div className="account-header-controls" ref={setHeaderTarget} />
        </div>
      </div>
    </header>
    <Routes>
      <Route index element={<PlaygroundPage messages={messages} locale="pl" />} />
      <Route path="*" element={<Suspense fallback={<main className="account-page" />}><AccountApp messages={messages} locale="pl" headerTarget={headerTarget} /></Suspense>} />
    </Routes>
  </BrowserRouter>;
}

/** Only on the public playground; the account area has its own sign-in/sign-out controls. */
function SignInLink({ label }: { label: string }) {
  const { pathname } = useLocation();
  return pathname === '/' ? <Link to="/join" className="header-link">{label}</Link> : null;
}
