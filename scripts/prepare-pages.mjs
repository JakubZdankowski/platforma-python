import { copyFile, writeFile } from 'node:fs/promises';

// GitHub Pages returns this document for deep links. BrowserRouter retains
// the requested URL; assets use Vite's absolute base path.
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url));
await writeFile(new URL('../dist/.nojekyll', import.meta.url), '');
console.log('GitHub Pages: 404.html and .nojekyll prepared');
