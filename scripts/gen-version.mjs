// Genera public/version.json desde package.json en cada build (hook prebuild).
// La APK consulta este archivo en el sitio de Netlify para detectar
// actualizaciones y ofrecerlas dentro de la app.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const info = {
  version: pkg.version,
  apk: 'https://mimangadinamita.netlify.app/download/mangarg.apk',
};

writeFileSync(join(root, 'public', 'version.json'), JSON.stringify(info, null, 2) + '\n');
console.log(`version.json -> ${info.version}`);
