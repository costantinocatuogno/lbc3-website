// Einfacher lokaler Webserver für die Vorschau: node scripts/serve.mjs  →  http://localhost:8888
// (Formulare, Login und Functions laufen nur auf Netlify bzw. mit "netlify dev".)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = Number(process.env.PORT || 8888);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.yml': 'text/yaml', '.pdf': 'application/pdf'
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    path = normalize(path).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, path);
    const s = await stat(file).catch(() => null);
    if (s && s.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file).catch(() => null);
    if (!body) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(await readFile(join(DIST, '404.html')).catch(() => 'Nicht gefunden'));
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(500); res.end(String(err));
  }
}).listen(PORT, () => console.log(`Vorschau: http://localhost:${PORT}`));
