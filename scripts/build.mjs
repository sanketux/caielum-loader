import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const file of ['index.html', 'orb.js', 'orb.css', 'tokens.css']) {
  copyFileSync(file, `dist/${file}`);
}
console.log('Built the standalone loader preview in dist/.');
