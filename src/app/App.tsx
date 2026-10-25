import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { pl } from '../i18n/pl';
import blueLogo from '../assets/blue-logo.png';
import { LoginChoicePage } from '../auth/LoginChoicePage';

const UiLab = lazy(() => import('./UiLab'));
const AccountApp = lazy(() => import('./AccountApp'));

export function App() {
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const messages = pl;
  useEffect(() => { document.documentElement.lang = 'pl'; document.title = messages.appName; }, [messages.appName]);

  return <BrowserRouter basename={import.meta.env.BASE_URL}>
    <SiteHeader setHeaderTarget={setHeaderTarget} />
    <Suspense fallback={<main className="account-page" role="status">{messages.loadingData}</main>}><Routes><Route index element={<LoginChoicePage />} /><Route path="/ui" element={<UiLab />} /><Route path="/sign-in" element={<Navigate to="/" replace />} /><Route path="*" element={<AccountApp messages={messages} locale="pl" headerTarget={headerTarget} />} /></Routes></Suspense>
  </BrowserRouter>;
}

export function SiteHeader({ setHeaderTarget }: { setHeaderTarget: (element: HTMLDivElement | null) => void }) {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/$/, '') || '/';
  if (['/', '/ui', '/sign-in'].includes(path)) return null;
  const home = path === '/join' ? '/' : /^\/student(?:\/|$)/.test(path) ? '/student' : /^\/admin(?:\/|$)/.test(path) ? '/admin' : '/teacher';
  return <header className="site-header">
      <div className="site-header-inner">
        <Link to={home} className="brand">
          <img className="brand-logo" src={blueLogo} width="1020" height="740" alt="Sky Blue" />
          <span className="brand-name">{pl.appName}</span>
        </Link>
        <div className="header-actions">
          <div className="account-header-controls" ref={setHeaderTarget} />
        </div>
      </div>
    </header>;
}
