import { useEffect, useState } from 'react';
import { en, type Locale } from '../i18n/en';
import { pl } from '../i18n/pl';
import { ExercisePage } from '../student/ExercisePage';
import blueLogo from '../assets/blue-logo.png';

export function App() {
  const [locale, setLocale] = useState<Locale>('pl');
  const messages = locale === 'pl' ? pl : en;
  useEffect(() => { document.documentElement.lang = locale; document.title = messages.appName; }, [locale, messages.appName]);

  return <>
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand">
          <img className="brand-logo" src={blueLogo} width="1020" height="740" alt="Sky Blue" />
          <span className="brand-name">{messages.appName}</span>
        </div>
        <label className="language-control"><span className="sr-only">{messages.language}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'pl')}>
            <option value="pl">Polski</option><option value="en">English</option>
          </select>
        </label>
      </div>
    </header>
    <ExercisePage messages={messages} locale={locale} />
  </>;
}
