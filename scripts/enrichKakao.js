// 카카오 로컬 API(키워드 검색)로 매장의 전화번호·도로명주소·좌표를 보강해 data/service-overrides.json에 넣는다.
// ⚠️ 카카오 공식 API는 주차/와이파이/반려동물 같은 편의정보를 제공하지 않는다(전화·주소·좌표·카테고리만).
//    편의정보는 importOverridesCsv.js로 사람이 큐레이션한다.
//
// 필요: 카카오 REST API 키. https://developers.kakao.com 에서 앱 생성 후 REST 키 발급 →
//       .env에 KAKAO_REST_KEY=발급키  추가.
//
// 사용법: node scripts/enrichKakao.js [시도파일명 | --limit N]
//   예) node scripts/enrichKakao.js 서울특별시.json
//       node scripts/enrichKakao.js --limit 300
const fs = require('fs');
const path = require('path');
const https = require('https');

const STORES_DIR = path.join(__dirname, '..', '카페 행사', 'stores');
const OVERRIDES_FILE = path.join(__dirname, '..', 'data', 'service-overrides.json');

// .env 로드
try {
  fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim();
  });
} catch (e) {}

const norm = s => (s || '').replace(/\s+/g, '').toLowerCase();

// 카카오 키워드 검색(중심좌표 우선). Promise<documents[]>
function kakaoSearch(key, query, lng, lat) {
  const q = `query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=1000&size=5&sort=distance`;
  const opts = { hostname: 'dapi.kakao.com', path: `/v2/local/search/keyword.json?${q}`, headers: { Authorization: `KakaoAK ${key}` } };
  return new Promise((resolve) => {
    https.get(opts, r => {
      const ch = []; r.on('data', c => ch.push(c));
      r.on('end', () => { try { resolve(JSON.parse(Buffer.concat(ch).toString('utf8')).documents || []); } catch (e) { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

// 순수 로직(테스트 가능): 매장과 카카오 결과 중 가장 잘 맞는 문서 선택
function pickMatch(store, docs) {
  if (!docs || docs.length === 0) return null;
  const sn = norm(store.name);
  // 1) 상호 부분일치 우선
  const byName = docs.find(d => { const dn = norm(d.place_name); return dn.includes(sn) || sn.includes(dn); });
  if (byName) return byName;
  // 2) 없으면 거리순(이미 sort=distance) 첫 결과 중 카테고리가 카페/커피인 것
  return docs.find(d => /카페|커피/.test(d.category_name || '')) || null;
}

// 순수 로직(테스트 가능): 문서에서 오버라이드에 넣을 값 추출
function buildOverride(store, doc) {
  const ov = {};
  if (doc.phone) ov.phone = doc.phone;
  // 매장 주소가 비어 있고 도로명주소가 있으면 보강(좌표는 이미 실데이터라 덮지 않음)
  if (!store.address && doc.road_address_name) ov.address = doc.road_address_name;
  if (Object.keys(ov).length) ov._source = 'kakao-local';
  return Object.keys(ov).length ? ov : null;
}

async function run() {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) {
    console.error('KAKAO_REST_KEY가 없습니다. https://developers.kakao.com 에서 REST 키를 발급받아 .env에 추가하세요.');
    console.error('  .env 예: KAKAO_REST_KEY=abcd1234...');
    process.exit(1);
  }
  const arg = process.argv[2];
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

  const index = JSON.parse(fs.readFileSync(path.join(STORES_DIR, 'index.json'), 'utf-8'));
  const files = arg && arg !== '--limit' ? [arg] : index.map(i => i.file);
  const overrides = fs.existsSync(OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8')) : {};

  let done = 0, filled = 0;
  for (const file of files) {
    const stores = JSON.parse(fs.readFileSync(path.join(STORES_DIR, file), 'utf-8'));
    for (const store of stores) {
      if (done >= limit) break;
      if (store.phone || (overrides[store.id] && overrides[store.id].phone)) continue; // 이미 있으면 스킵
      const docs = await kakaoSearch(key, store.name, store.lng, store.lat);
      const doc = pickMatch(store, docs);
      done++;
      if (doc) {
        const ov = buildOverride(store, doc);
        if (ov) { overrides[store.id] = Object.assign(overrides[store.id] || {}, ov); filled++; }
      }
      if (done % 50 === 0) { console.error(`진행 ${done}건 (보강 ${filled})`); fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2)); }
      await new Promise(r => setTimeout(r, 80)); // 초당 제한 배려
    }
    if (done >= limit) break;
  }
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
  console.error(`\n완료: ${done}건 조회, ${filled}건 전화/주소 보강 → ${path.relative(process.cwd(), OVERRIDES_FILE)}`);
  console.error('로컬 반영: node scripts/applyOverrides.js');
}

module.exports = { pickMatch, buildOverride };

if (require.main === module) run();
