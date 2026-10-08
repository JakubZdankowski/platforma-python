// Isolated runtime test harness. Not an entry point in the production build.
import { createRoot } from 'react-dom/client';
import { PlaygroundPage } from '../../src/student/PlaygroundPage';
import { pl } from '../../src/i18n/pl';
import '../../src/app/styles.css';

createRoot(document.getElementById('root')!).render(<>
  <header className="site-header"><div className="site-header-inner">Test edytora Python</div></header>
  <PlaygroundPage messages={pl} locale="pl" />
</>);
