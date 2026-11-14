// Gera uma distribuição estática mínima para prévia no Cloudflare Pages.
// Não copia códigos do Worker, testes, documentos internos ou arquivos do GitHub.
import { mkdir, cp, copyFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist-preview');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const files = ['index.html','styles.css','app.js','config.js','expressinho.js','expressinho.css','product-details.js','product-details.css'];
for (const file of files) await copyFile(join(root, file), join(dist, file));
await cp(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
await cp(join(root, 'importador'), join(dist, 'importador'), {
  recursive: true,
  filter: src => !src.endsWith('README.md')
});
await writeFile(join(dist, '_headers'), [
  '/importador/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
  '  Cache-Control: no-cache',
  '',
  '/config.js',
  '  Cache-Control: no-cache',
  '',
  '/*',
  '  X-Content-Type-Options: nosniff',
  ''
].join('\n'));
console.log('Pronto: dist-preview, com vitrine existente e PWA importador.');
