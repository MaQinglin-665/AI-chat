import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.DOCS_TEST_PORT || 5500);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const safePath = (requestPath) => {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const resolved = path.resolve(rootDir, `.${path.sep}${normalized}`);
  if (!resolved.startsWith(rootDir)) {
    return null;
  }
  return resolved;
};

const send404 = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const target = safePath(pathname);

  if (!target) {
    send404(res);
    return;
  }

  let filePath = target;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send404(res);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  // Keep output minimal to avoid CI noise while still signaling startup.
  console.log(`[docs-static-server] listening on http://127.0.0.1:${port}`);
});

