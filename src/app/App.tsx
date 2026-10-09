import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router';
import { pl } from '../i18n/pl';
import blueLogo from '../assets/blue-logo.png';

const AccountApp = lazy(() => import('./AccountApp'));

export function App() {
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const messages = pl;
  useEffect(() => { document.documentElement.lang = 'pl'; document.title = messages.appName; }, [messages.appName]);

  return <BrowserRouter basename={import.meta.env.BASE_URL}>
    <SiteHeader setHeaderTarget={setHeaderTarget} />
    <Suspense fallback={<main className="account-page" role="status">{messages.loadingData}</main>}><AccountApp messages={messages} locale="pl" headerTarget={headerTarget} /></Suspense>
  </BrowserRouter>;
}

function SiteHeader({ setHeaderTarget }: { setHeaderTarget: (element: HTMLDivElement | null) => void }) {
  const { pathname } = useLocation();
  if ((pathname.startsWith('/teacher') && !pathname.endsWith('/live')) || ['/student', '/student/materials', '/student/help'].includes(pathname.replace(/\/$/, ''))) return null;
  return <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          <img className="brand-logo" src={blueLogo} width="1020" height="740" alt="Sky Blue" />
          <span className="brand-name">{pl.appName}</span>
        </Link>
        <div className="header-actions">
          <div className="account-header-controls" ref={setHeaderTarget} />
        </div>
      </div>
    </header>;
}
