import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('./', import.meta.url));
const output = path.join(root, 'dist');
const publicFiles = [
  'index.html', 'about.html', 'team.html', 'projects.html', 'contact.html',
  'terms.html', 'privacy.html', 'project-1.html', 'project-2.html', 'project-3.html',
  'styles.css', 'app.js', 'content.js', 'board.html', 'board.css', 'board.js'
];
await mkdir(output, { recursive: true });
// Fail closed if unexpected files are present; never publish server code or secrets.
for (const entry of await readdir(output)) {
  if (!publicFiles.includes(entry)) throw new Error('Unexpected file in dist; inspect build output before publishing.');
}
await Promise.all(publicFiles.map(file => copyFile(path.join(root, file), path.join(output, file))));
console.log(`Built ${publicFiles.length} public files. Server code and environment files are excluded.`);
