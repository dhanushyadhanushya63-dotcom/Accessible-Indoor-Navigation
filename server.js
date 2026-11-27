const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const reqUrl = req.url.split('?')[0];
  let relativePath = reqUrl === '/' ? 'index.html' : reqUrl.replace(/^\//, '');
  let filePath = path.join(__dirname, relativePath);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h3>404 Not Found</h3><p>File <code>${reqUrl}</code> was not found.</p><p><a href="/index.html">Go to Home</a></p>`);
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('\n======================================================');
  console.log(`  Accessible Indoor Navigation is running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('======================================================');
  console.log('  Press Ctrl + C in this terminal to stop the server.\n');
});
