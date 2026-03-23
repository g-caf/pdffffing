#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 7654;
const DIST_DIR = path.join(__dirname, 'dist');

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

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (pathname === '/serve' && query.file) {
    const filePath = decodeURIComponent(query.file);

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
