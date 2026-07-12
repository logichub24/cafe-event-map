// 기상청 단기예보 API CORS 프록시 (Vercel 서버리스 함수)
const https = require('https');

const KMA_KEY = process.env.KMA_API_KEY;

function latLngToGrid(lat, lng) {
  const D = Math.PI / 180, re = 6371.00877 / 5.0;
  const s1 = 30*D, s2 = 60*D, ol = 126*D, oa = 38*D, XO = 43, YO = 136;
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

// 단기예보 발표 시각 (02,05,08,11,14,17,20,23시 발표, 약 10분 후 데이터 생성)
function getFcstBaseTime() {
  const now = new Date(Date.now() + 9*3600*1000); // KST
  const h = now.getUTCHours();
  const baseHours = [2,5,8,11,14,17,20,23];
  // 현재 시각 기준 가장 최근 발표 시각 선택
  let base = 23;
  for (const bh of baseHours) {
    if (h >= bh) base = bh;
  }
  const p = n => String(n).padStart(2,'0');
  const d = now.getUTCFullYear() + p(now.getUTCMonth()+1) + p(now.getUTCDate());
  return { date: d, time: `${p(base)}00` };
}

// PTY(강수형태) + SKY(하늘상태) → WMO-like code
function toWeatherCode(pty, sky) {
  if (pty === 1 || pty === 4) return 61; // 비/소나기
  if (pty === 2) return 67;              // 비+눈
  if (pty === 3) return 71;              // 눈
  if (sky === 1) return 0;              // 맑음
  if (sky === 3) return 2;              // 구름조금
  return 3;                             // 흐림
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const r = https.get(url, resp => {
      const chunks = [];
      resp.on('data', c => chunks.push(c));
      resp.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    r.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const lat = parseFloat(req.query.lat || '37.5665');
  const lng = parseFloat(req.query.lng || '126.978');
  const { nx, ny } = latLngToGrid(lat, lng);
  const { date, time } = getFcstBaseTime();

  // 단기예보 (getVilageFcst) — 가장 가까운 예보 시각의 TMP, PTY, SKY 조회
  const kmaUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=60&dataType=JSON&base_date=${date}&base_time=${time}&nx=${nx}&ny=${ny}&authKey=${KMA_KEY}`;

  try {
    const body = await fetchUrl(kmaUrl);
    const data = JSON.parse(body);
    const items = data?.response?.body?.items?.item || [];

    if (items.length === 0) {
      return res.status(502).json({ error: 'no items', raw: data?.response?.header });
    }

    // 가장 가까운 예보 시각 첫 번째 항목 기준으로 값 취합
    const fcstTimes = [...new Set(items.map(i => i.fcstTime))].sort();
    const targetTime = fcstTimes[0];
    const get = cat => {
      const it = items.find(i => i.category === cat && i.fcstTime === targetTime);
      return it ? parseFloat(it.fcstValue) : null;
    };

    const temp = get('TMP');
    const pty  = get('PTY') ?? 0;
    const sky  = get('SKY') ?? 1;

    if (temp === null) {
      return res.status(502).json({ error: 'TMP not found', items: items.slice(0,5) });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ temp: Math.round(temp), rain: pty > 0, code: toWeatherCode(pty, sky), nx, ny, source: 'kma' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
