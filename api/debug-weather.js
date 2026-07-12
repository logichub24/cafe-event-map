// 기상청 API 응답 원시 데이터 확인용 (배포 후 삭제)
const https = require('https');
const KMA_KEY = process.env.KMA_API_KEY;

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
  const now = new Date(Date.now() + 9*3600*1000);
  const p = n => String(n).padStart(2,'0');
  const date = `${now.getUTCFullYear()}${p(now.getUTCMonth()+1)}${p(now.getUTCDate())}`;

  const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=20&dataType=JSON&base_date=${date}&base_time=2000&nx=60&ny=127&authKey=${KMA_KEY}`;
  try {
    const body = await fetchUrl(url);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(body);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
