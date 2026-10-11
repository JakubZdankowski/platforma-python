// Bootstrap the first admin with the server-side secret key.
process.argv[4] = 'admin';
await import('./create-teacher.mjs');
