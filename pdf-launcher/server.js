#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 7654;
const DIST_DIR = path.join(__dirname, 'dist');
const REGISTRY_FILE = path.join(os.tmpdir(), 'pdf-launcher-requests.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

function serveFile(filePath, res) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendNotFound(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error reading file');
    });
  });
}

function readRegistry() {
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function isRegisteredRequest(token, filePath) {
  if (!token) return false;

  const registry = readRegistry();
  const entry = registry[token];
  if (!entry || !entry.filePath || !entry.expiresAt) return false;
  if (Date.now() > entry.expiresAt) return false;

  return path.resolve(entry.filePath) === path.resolve(filePath);
}

function isPdfFile(filePath) {
  if (path.extname(filePath).toLowerCase() !== '.pdf') return false;

  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    return header.toString('ascii') === '%PDF';
  } finally {
    fs.closeSync(fd);
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://127.0.0.1');
  const pathname = parsedUrl.pathname;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (pathname === '/serve' && parsedUrl.searchParams.has('file')) {
    const filePath = parsedUrl.searchParams.get('file');
    const token = parsedUrl.searchParams.get('token');

    if (!isRegisteredRequest(token, filePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Access denied');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }

      if (!stats.isFile()) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
      }

      try {
        if (!isPdfFile(filePath)) {
          res.writeHead(415, { 'Content-Type': 'text/plain' });
          res.end('Only PDF files can be served');
          return;
        }
      } catch {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Could not validate file');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache'
      });

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', () => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error reading file');
      });
    });
    return;
  }

  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('App assets missing. Reinstall the launcher.');
    return;
  }

  if (pathname === '/' || pathname === '') {
    return serveFile(path.join(DIST_DIR, 'index.html'), res);
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const assetPath = path.join(DIST_DIR, safePath);
  if (assetPath.startsWith(DIST_DIR)) {
    return serveFile(assetPath, res);
  }

  return sendNotFound(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PDF Launcher server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Server shutting down');
  server.close();
});
