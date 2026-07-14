// 로컬 개발용 정적 파일 서버 (샘플 데이터 fetch 테스트용). 외부 의존성 없음.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 4599;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json; charset=utf-8', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.join(ROOT, filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`dev server: http://localhost:${PORT}/`));
