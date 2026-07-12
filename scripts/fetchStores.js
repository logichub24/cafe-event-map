// 소상공인시장진흥공단 상가(상권)정보 API storeListInUpjong(업종 전국 조회)로
// 전국 카페(업종소분류코드 I21201)를 받아, 이름 패턴으로 주요 브랜드만 분류해 시/도 파일로 저장한다.
//
// 이 API가 제공하는 필드: 상호·지점·좌표·주소·시도. (주차/와이파이/콘센트/반려동물/영업시간/전화는 없음 → 정보 없음 처리)
//
// 출력:
//   카페 행사/stores/index.json    - 시/도 목록 + 중심좌표 + 매장수
//   카페 행사/stores/<시도명>.json  - 해당 시/도의 브랜드 카페 목록
//   카페 행사/brands.json           - 데이터에 실제로 잡힌 브랜드 + 색상/링크
//
// 사용법: node scripts/fetchStores.js   (.env의 SBIZ_API_KEY 사용)
const fs = require('fs');
const path = require('path');
const https = require('https');
const { normalizeAndApply, loadOverrides } = require('./applyOverrides');

// .env 로드(의존성 없이 간단 파싱)
try {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
  env.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
} catch (e) {}

const SERVICE_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInUpjong';
const OUT_DIR = path.join(__dirname, '..', '카페 행사', 'stores');
const CAFE_CODE = 'I21201'; // 상권업종소분류: 카페
const PAGE_SIZE = 1000;

// 브랜드 정의(색상=지도 마커, dark=밝은 배경이라 글자 어둡게, pattern=상호 매칭)
// 순서 = 우선순위(먼저 매칭되는 브랜드 채택). 더 구체적인 패턴을 위로.
const BRANDS = [
  { name:'스타벅스',     short:'벅스',   color:'#00704A', dark:false, pattern:/스타벅스|starbucks/i,                 site:'https://www.starbucks.co.kr', event:'https://www.starbucks.co.kr/whats_new/newList.do' },
  { name:'투썸플레이스', short:'투썸',   color:'#C8102E', dark:false, pattern:/투썸|twosome/i,                        site:'https://www.twosome.co.kr', event:'https://www.twosome.co.kr/promotion/eventList.do' },
  { name:'이디야커피',   short:'이디야', color:'#1B3A8B', dark:false, pattern:/이디야|ediya/i,                        site:'https://www.ediya.com', event:'https://www.ediya.com/contents/event.html' },
  { name:'메가MGC커피',  short:'메가',   color:'#F5B700', dark:true,  pattern:/메가\s?(엠지씨|mgc)|megamgc|메가커피|메가엠지씨/i, site:'https://www.mega-mgccoffee.com', event:'https://www.mega-mgccoffee.com/event/' },
  { name:'컴포즈커피',   short:'컴포즈', color:'#FFCB05', dark:true,  pattern:/컴포즈|compose/i,                       site:'https://composecoffee.com', event:'https://composecoffee.com/menu/event' },
  { name:'빽다방',       short:'빽',     color:'#F7D417', dark:true,  pattern:/빽다방|paik/i,                          site:'https://www.paikdabang.com', event:'https://www.paikdabang.com/notice/' },
  { name:'할리스',       short:'할리스', color:'#B01E28', dark:false, pattern:/할리스|hollys/i,                        site:'https://www.hollys.co.kr', event:'https://www.hollys.co.kr/event/eventList.do' },
  { name:'커피빈',       short:'빈',     color:'#5A2D28', dark:false, pattern:/커피빈|coffee\s?bean/i,                 site:'https://www.coffeebeankorea.com', event:'https://www.coffeebeankorea.com/event/list.asp' },
  { name:'더벤티',       short:'벤티',   color:'#0033A0', dark:false, pattern:/더벤티|the\s?venti|디벤티/i,            site:'https://www.theventi.co.kr', event:'https://www.theventi.co.kr' },
  { name:'매머드커피',   short:'매머드', color:'#6E4A2E', dark:false, pattern:/매머드|mammoth/i,                       site:'https://mammoth-coffee.com', event:'https://mammoth-coffee.com' },
  { name:'엔제리너스',   short:'엔제리', color:'#D71920', dark:false, pattern:/엔제리너스|angel[- ]?in[- ]?us|angelinus/i, site:'https://www.angelinus.com', event:'https://www.angelinus.com/event/' },
  { name:'폴 바셋',      short:'폴바셋', color:'#1A1A1A', dark:false, pattern:/폴\s?바셋|paul\s?bassett/i,             site:'https://www.paulbassett.co.kr', event:'https://www.paulbassett.co.kr' },
  { name:'탐앤탐스',     short:'탐탐',   color:'#7B1E2B', dark:false, pattern:/탐앤탐스|탐앤|tom\s?n\s?toms|tomntoms/i, site:'https://www.tomntoms.com', event:'https://www.tomntoms.com/event/' },
  { name:'감성커피',     short:'감성',   color:'#E7A100', dark:true,  pattern:/감성커피/i,                             site:'', event:'' },
  { name:'더리터',       short:'리터',   color:'#2AA84A', dark:false, pattern:/더리터|the\s?liter/i,                  site:'', event:'' },
  { name:'하삼동커피',   short:'하삼동', color:'#1E7A3D', dark:false, pattern:/하삼동/i,                               site:'', event:'' },
  { name:'봄봄',         short:'봄봄',   color:'#EC6F9C', dark:false, pattern:/봄봄커피|봄봄/i,                        site:'', event:'' },
  { name:'텐퍼센트커피', short:'10%',    color:'#111827', dark:false, pattern:/텐퍼센트|10\s?%|ten\s?percent/i,        site:'', event:'' },
  { name:'커피에반하다', short:'반하다', color:'#7C3AED', dark:false, pattern:/커피에\s?반하다/i,                      site:'', event:'' },
  { name:'카페베네',    short:'베네',   color:'#2B6CB0', dark:false, pattern:/카페베네|caffe\s?bene/i,                  site:'https://www.caffebene.co.kr', event:'https://www.caffebene.co.kr' },
  { name:'달콤커피',    short:'달콤',   color:'#F97316', dark:false, pattern:/달콤커피|달콤\s?coffee|dalkomm/i,         site:'https://dalkomm.com', event:'https://dalkomm.com' },
  { name:'드롭탑',      short:'드롭탑', color:'#0EA5E9', dark:false, pattern:/드롭탑|droptop/i,                         site:'https://www.droptop.co.kr', event:'https://www.droptop.co.kr' },
  { name:'커피나무',    short:'커피나무', color:'#65A30D', dark:false, pattern:/커피나무/i,                             site:'', event:'' },
  { name:'토프레소',    short:'토프레소', color:'#DC2626', dark:false, pattern:/토프레소|twoprezzo/i,                   site:'', event:'' },
  { name:'공차',        short:'공차',   color:'#92400E', dark:false, pattern:/공차|gongcha/i,                           site:'https://www.gong-cha-kr.com', event:'https://www.gong-cha-kr.com' },
  { name:'빈스앤베리즈',short:'빈스',   color:'#7E22CE', dark:false, pattern:/빈스앤베리즈|빈스&베리즈|beans\s?berries/i, site:'', event:'' },
  { name:'커피스미스',  short:'스미스', color:'#374151', dark:false, pattern:/커피스미스|coffee\s?smith/i,              site:'', event:'' },
];

function classify(name) {
  for (const b of BRANDS) if (b.pattern.test(name)) return b.name;
  return null;
}

function get(url) {
  // 청크를 Buffer로 모아 한 번에 UTF-8 디코딩(문자열 누적 시 멀티바이트 한글이 청크 경계에서 깨짐)
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', reject);
  });
}

async function fetchAll(key) {
  const stores = [];
  let pageNo = 1, totalCount = Infinity;
  while ((pageNo - 1) * PAGE_SIZE < totalCount) {
    const url = `${SERVICE_URL}?serviceKey=${encodeURIComponent(key)}&type=json&divId=indsSclsCd&key=${CAFE_CODE}&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`;
    let j;
    try { const { body } = await get(url); j = JSON.parse(body); }
    catch (e) { console.error(`page ${pageNo} 파싱 실패, 재시도`); await new Promise(r => setTimeout(r, 500)); continue; }
    const body = j.body || {};
    const items = body.items || [];
    totalCount = body.totalCount || items.length;
    items.forEach(it => {
      const brand = classify((it.bizesNm || '') + (it.brchNm || ''));
      if (!brand) return; // 독립 카페 제외(브랜드 행사 모델과 무관)
      const lat = parseFloat(it.lat), lng = parseFloat(it.lon);
      if (!isFinite(lat) || !isFinite(lng)) return;
      stores.push({
        id: `${brand}_${it.bizesId}`, brand,
        name: it.bizesNm + (it.brchNm ? ' ' + it.brchNm : ''),
        lat, lng,
        address: it.rdnmAdr || it.lnoAdr || '',
        province: it.ctprvnNm || '기타',
        // 편의정보는 이 API에 없음 → 3-state에서 null(정보 없음)로 시작. data/service-overrides.json으로 채움
        phone: '', openingHours: '',
        services: { parking: null, wifi: null, outlet: null, driveThrough: null, terrace: null, pet: null },
        petPolicyType: '정보 없음', lastCheckedAt: '',
      });
    });
    if (pageNo % 10 === 0 || (pageNo - 1) * PAGE_SIZE >= totalCount)
      console.error(`page ${pageNo} 처리 (누적 브랜드 매장 ${stores.length} / 전체 카페 ${totalCount})`);
    pageNo++;
    await new Promise(r => setTimeout(r, 120));
  }
  return stores;
}

const avg = a => a.reduce((x, y) => x + y, 0) / a.length;

async function run() {
  const key = process.env.SBIZ_API_KEY;
  if (!key) { console.error('SBIZ_API_KEY 필요(.env)'); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const all = await fetchAll(key);

  // 시/도 그룹핑
  const byProv = new Map();
  all.forEach(s => { if (!byProv.has(s.province)) byProv.set(s.province, []); byProv.get(s.province).push(s); });

  // 큐레이션 편의정보(data/service-overrides.json)를 병합 + 스키마 통일
  const overrides = loadOverrides();
  let curatedTotal = 0;

  const index = [];
  for (const [prov, list] of byProv.entries()) {
    const file = `${prov}.json`;
    const cleaned = list.map(({ province, ...rest }) => rest);
    curatedTotal += normalizeAndApply(cleaned, overrides);
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(cleaned), 'utf-8');
    index.push({ province: prov, file, count: cleaned.length, centerLat: avg(cleaned.map(s => s.lat)), centerLng: avg(cleaned.map(s => s.lng)) });
  }
  console.error(`편의정보 큐레이션 ${curatedTotal}곳 병합(data/service-overrides.json)`);
  index.sort((a, b) => b.count - a.count);
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  // 실제 잡힌 브랜드만 brands.json으로(색상/링크). 마커/라벨용
  const seen = new Set(all.map(s => s.brand));
  const brandsOut = BRANDS.filter(b => seen.has(b.name)).map(({ pattern, ...rest }) => rest);
  fs.writeFileSync(path.join(__dirname, '..', '카페 행사', 'brands.json'), JSON.stringify(brandsOut, null, 2), 'utf-8');

  const byBrand = all.reduce((a, s) => { a[s.brand] = (a[s.brand] || 0) + 1; return a; }, {});
  console.error('\n=== 브랜드별 매장 수 ===');
  Object.entries(byBrand).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.error(k.padEnd(14, ' '), v));
  console.error(`\n전국 브랜드 카페 ${all.length}건 → 시/도 ${index.length}개 파일 저장 (${OUT_DIR})`);
}

run();
