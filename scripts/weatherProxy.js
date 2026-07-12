// 기상청 API CORS 우회 로컬 프록시 서버 (개발용, port 4602)
const http = require('http');
const https = require('https');

const KMA_KEY = process.env.KMA_API_KEY;

// 위경도 → 기상청 격자(nx, ny) 변환
function latLngToGrid(lat, lng) {
  const D = Math.PI / 180, re = 6371.00877 / 5.0;
  const s1 = 30*D, s2 = 60*D, ol = 126*D, oa = 38*D;
  const XO = 43, YO = 136;
  const sn = Math.log(Math.cos(s1)/Math.cos(s2)) / Math.log(Math.tan(Math.PI*.25+s2*.5)/Math.tan(Math.PI*.25+s1*.5));
  const sf = Math.pow(Math.tan(Math.PI*.25+s1*.5), sn) * Math.cos(s1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI*.25+oa*.5), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI*.25+lat*D*.5), sn);
  let theta = lng*D - ol;
  if (theta > Math.PI) theta -= 2*Math.PI;
  if (theta < -Math.PI) theta += 2*Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra*Math.sin(theta)+XO+.5), ny: Math.floor(ro-ra*Math.cos(theta)+YO+.5) };
}

// 기상청 base_date / base_time
function baseDateTime() {
  const now = new Date(Date.now() - 10*60*1000); // 10분 전
  const p = n => String(n).padStart(2,'0');
  return {
    date: `${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}`,
    time: `${p(now.getHours())}00`
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:4602`);

  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (url.pathname !== '/weather') { res.writeHead(404); res.end('{}'); return; }

  const lat = parseFloat(url.searchParams.get('lat') || '37.5665');
  const lng = parseFloat(url.searchParams.get('lng') || '126.978');
  const { nx, ny } = latLngToGrid(lat, lng);
  const { date, time } = baseDateTime();

  const kmaUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtNcst?pageNo=1&numOfRows=10&dataType=JSON&base_date=${date}&base_time=${time}&nx=${nx}&ny=${ny}&authKey=${KMA_KEY}`;

  https.get(kmaUrl, kmaRes => {
    const chunks = [];
    kmaRes.on('data', c => chunks.push(c));
    kmaRes.on('end', () => {
      res.writeHead(200);
      res.end(Buffer.concat(chunks).toString('utf-8'));
    });
  }).on('error', e => {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });
});

server.listen(4602, () => console.log('날씨 프록시 실행 중: http://localhost:4602/weather?lat=37.5665&lng=126.978'));
