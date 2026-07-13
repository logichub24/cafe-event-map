// 카카오 로컬 API로 전국 카페 브랜드 매장 좌표 수집 → stores/전국.json 저장
const https = require('https');
const fs = require('fs');
const path = require('path');

const KAKAO_KEY = '9a1ce67fe335c12624936af6615f2a79';
const OUT_FILE = path.join(__dirname, '..', '카페 행사', 'stores', '전국.json');

// 전국 주요 도시 중심 좌표 (격자 커버리지)
const CENTERS = [
  [37.5665,126.9780],[37.4979,127.0276],[37.6396,127.0255],[37.5638,126.9084],[37.5264,126.8962],
  [37.6584,126.8320],[37.7381,127.0338],[37.4201,127.1260],[37.2636,127.0286],[37.2411,127.1776],
  [37.1994,126.8317],[37.3219,126.8309],[37.3943,126.9568],[37.7600,126.7799],[37.4784,126.8647],
  [37.3797,126.8032],[37.6360,127.2165],[37.8813,127.7300],[37.7519,128.8761],[37.3422,127.9202],
  [36.3504,127.3845],[36.8151,127.1139],[36.6424,127.4890],[36.4801,127.2890],[36.1198,128.3445],
  [35.8714,128.6014],[36.0190,129.3435],[35.5384,129.3114],[35.2285,128.6811],[35.2342,128.8890],
  [35.1796,129.0756],[35.1631,129.1639],[35.8562,129.2247],[35.8242,127.1480],[35.9676,126.7369],
  [35.4563,126.7052],[34.9506,127.4873],[34.8118,126.3922],[34.7604,127.6622],[35.1595,126.8526],
  [33.4996,126.5312],[33.3617,126.5292],[33.2530,126.4104],
];

const BRAND_KEYWORDS = [
  ['스타벅스','스타벅스'],['투썸플레이스','투썸플레이스'],['이디야커피','이디야커피'],
  ['메가MGC커피','메가MGC커피'],['컴포즈커피','컴포즈커피'],['빽다방','빽다방'],
  ['할리스','할리스커피'],['커피빈','커피빈'],['더벤티','더벤티'],['매머드커피','매머드커피'],
  ['엔제리너스','엔제리너스'],['폴 바셋','폴바셋'],['탐앤탐스','탐앤탐스'],
  ['감성커피','감성커피'],['더리터','더리터'],['하삼동커피','하삼동커피'],
  ['봄봄','봄봄커피'],['텐퍼센트커피','텐퍼센트커피'],['커피에반하다','커피에반하다'],
  ['카페베네','카페베네'],['달콤커피','달콤커피'],['드롭탑','드롭탑'],
  ['커피나무','커피나무'],['토프레소','토프레소'],['공차','공차'],
  ['빈스앤베리즈','빈스앤베리즈'],['커피스미스','커피스미스'],
];

function kakaoGet(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } };
    https.get(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchBrand(brandName, keyword, lat, lng) {
  const results = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=15000&size=15&page=${page}`;
      const j = await kakaoGet(url);
      if (!j.documents) break;
      j.documents.forEach(d => {
        results.push({ id: d.id, brand: brandName, name: d.place_name, lat: parseFloat(d.y), lng: parseFloat(d.x), address: d.road_address_name || d.address_name, phone: d.phone || '' });
      });
      if (j.meta.is_end) break;
      await sleep(80);
    } catch(e) { break; }
  }
  return results;
}

async function main() {
  const seen = new Set();
  const allStores = [];

  for (const [brandName, keyword] of BRAND_KEYWORDS) {
    process.stdout.write(`[${brandName}] 수집 중...`);
    let count = 0;
    for (const [lat, lng] of CENTERS) {
      const stores = await searchBrand(brandName, keyword, lat, lng);
      for (const s of stores) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          allStores.push(s);
          count++;
        }
      }
      await sleep(50);
    }
    console.log(` ${count}개`);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(allStores, null, 0), 'utf8');
  console.log(`\n완료: 총 ${allStores.length}개 → ${OUT_FILE}`);
}

main().catch(console.error);
