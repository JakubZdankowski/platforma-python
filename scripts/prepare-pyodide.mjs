import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packagePath = require.resolve('pyodide/package.json');
const { version } = JSON.parse(await readFile(packagePath, 'utf8'));
const destination = new URL('../public/pyodide/', import.meta.url);
await mkdir(destination, { recursive: true });

// Copy the matching loader, interpreter and standard library from the lockfile version.
for (const name of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  await copyFile(join(dirname(packagePath), name), new URL(name, destination));
}
await writeFile(new URL('version.json', destination), JSON.stringify({ version }));
console.log(`Pyodide ${version} prepared in public/pyodide/`);
