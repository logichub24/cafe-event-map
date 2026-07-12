// 카카오 로컬 키워드 검색 API로 전국 카페 브랜드 매장을 보완 수집한다.
// 전략: 브랜드명 × 시/구 단위 분할 검색 → 좌표 50m 중복 제거 → stores/*.json 추가
// 서울 25구·경기 31시/군·광역시 구 단위로 쿼리 분할해 API 675건 한계 극복.
//
// 사용법: node scripts/fetchKakaoStores.js [브랜드명]
//   예) node scripts/fetchKakaoStores.js 스타벅스
//       node scripts/fetchKakaoStores.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const { normalizeAndApply, loadOverrides } = require('./applyOverrides');

// .env 로드
try {
  fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)/); if (m) process.env[m[1].trim()] = m[2].trim();
  });
} catch (e) {}

const STORES_DIR = path.join(__dirname, '..', '카페 행사', 'stores');
const BRANDS_FILE = path.join(__dirname, '..', '카페 행사', 'brands.json');

const BRANDS = [
  { name:'스타벅스',     short:'벅스',    color:'#00704A', dark:false, query:'스타벅스', site:'https://www.starbucks.co.kr', event:'https://www.starbucks.co.kr/whats_new/newList.do' },
  { name:'투썸플레이스', short:'투썸',    color:'#C8102E', dark:false, query:'투썸플레이스', site:'https://www.twosome.co.kr', event:'https://www.twosome.co.kr/promotion/eventList.do' },
  { name:'이디야커피',   short:'이디야',  color:'#1B3A8B', dark:false, query:'이디야커피', site:'https://www.ediya.com', event:'https://www.ediya.com/contents/event.html' },
  { name:'메가MGC커피',  short:'메가',    color:'#F5B700', dark:true,  query:'메가MGC커피', site:'https://www.mega-mgccoffee.com', event:'https://www.mega-mgccoffee.com/event/' },
  { name:'컴포즈커피',   short:'컴포즈',  color:'#FFCB05', dark:true,  query:'컴포즈커피', site:'https://composecoffee.com', event:'https://composecoffee.com/menu/event' },
  { name:'빽다방',       short:'빽',      color:'#F7D417', dark:true,  query:'빽다방', site:'https://www.paikdabang.com', event:'https://www.paikdabang.com/notice/' },
  { name:'할리스',       short:'할리스',  color:'#B01E28', dark:false, query:'할리스커피', site:'https://www.hollys.co.kr', event:'https://www.hollys.co.kr/event/eventList.do' },
  { name:'커피빈',       short:'빈',      color:'#5A2D28', dark:false, query:'커피빈', site:'https://www.coffeebeankorea.com', event:'https://www.coffeebeankorea.com/event/list.asp' },
  { name:'더벤티',       short:'벤티',    color:'#0033A0', dark:false, query:'더벤티', site:'https://www.theventi.co.kr', event:'https://www.theventi.co.kr' },
  { name:'매머드커피',   short:'매머드',  color:'#6E4A2E', dark:false, query:'매머드커피', site:'https://mammoth-coffee.com', event:'https://mammoth-coffee.com' },
  { name:'엔제리너스',   short:'엔제리',  color:'#D71920', dark:false, query:'엔제리너스', site:'https://www.angelinus.com', event:'https://www.angelinus.com/event/' },
  { name:'폴 바셋',      short:'폴바셋',  color:'#1A1A1A', dark:false, query:'폴바셋', site:'https://www.paulbassett.co.kr', event:'https://www.paulbassett.co.kr' },
  { name:'탐앤탐스',     short:'탐탐',    color:'#7B1E2B', dark:false, query:'탐앤탐스', site:'https://www.tomntoms.com', event:'https://www.tomntoms.com/event/' },
  { name:'감성커피',     short:'감성',    color:'#E7A100', dark:true,  query:'감성커피', site:'', event:'' },
  { name:'더리터',       short:'리터',    color:'#2AA84A', dark:false, query:'더리터', site:'', event:'' },
  { name:'하삼동커피',   short:'하삼동',  color:'#1E7A3D', dark:false, query:'하삼동커피', site:'', event:'' },
  { name:'봄봄',         short:'봄봄',    color:'#EC6F9C', dark:false, query:'봄봄커피', site:'', event:'' },
  { name:'텐퍼센트커피', short:'10%',     color:'#111827', dark:false, query:'텐퍼센트커피', site:'', event:'' },
  { name:'커피에반하다', short:'반하다',  color:'#7C3AED', dark:false, query:'커피에반하다', site:'', event:'' },
  { name:'카페베네',     short:'베네',    color:'#2B6CB0', dark:false, query:'카페베네', site:'https://www.caffebene.co.kr', event:'' },
  { name:'달콤커피',     short:'달콤',    color:'#F97316', dark:false, query:'달콤커피', site:'https://dalkomm.com', event:'' },
  { name:'드롭탑',       short:'드롭탑',  color:'#0EA5E9', dark:false, query:'드롭탑', site:'https://www.droptop.co.kr', event:'' },
  { name:'커피나무',     short:'커피나무',color:'#65A30D', dark:false, query:'커피나무', site:'', event:'' },
  { name:'토프레소',     short:'토프레소',color:'#DC2626', dark:false, query:'토프레소', site:'', event:'' },
  { name:'공차',         short:'공차',    color:'#92400E', dark:false, query:'공차', site:'https://www.gong-cha-kr.com', event:'' },
  { name:'빈스앤베리즈', short:'빈스',    color:'#7E22CE', dark:false, query:'빈스앤베리즈', site:'', event:'' },
  { name:'커피스미스',   short:'스미스',  color:'#374151', dark:false, query:'커피스미스', site:'', event:'' },
];

// 시/도 → 세부 지역(구/시/군) 매핑. 쿼리 단위를 잘게 쪼개 675건 한계 극복.
const PROVINCES = [
  {
    name: '서울특별시', file: '서울특별시.json',
    subregions: [
      '서울 종로구','서울 중구','서울 용산구','서울 성동구','서울 광진구',
      '서울 동대문구','서울 중랑구','서울 성북구','서울 강북구','서울 도봉구',
      '서울 노원구','서울 은평구','서울 서대문구','서울 마포구','서울 양천구',
      '서울 강서구','서울 구로구','서울 금천구','서울 영등포구','서울 동작구',
      '서울 관악구','서울 서초구','서울 강남구','서울 송파구','서울 강동구',
    ],
  },
  {
    name: '경기도', file: '경기도.json',
    subregions: [
      '경기 수원시','경기 성남시','경기 의정부시','경기 안양시','경기 부천시',
      '경기 광명시','경기 평택시','경기 동두천시','경기 안산시','경기 고양시',
      '경기 과천시','경기 구리시','경기 남양주시','경기 오산시','경기 시흥시',
      '경기 군포시','경기 의왕시','경기 하남시','경기 용인시','경기 파주시',
      '경기 이천시','경기 안성시','경기 김포시','경기 화성시','경기 광주시',
      '경기 양주시','경기 포천시','경기 여주시','경기 연천군','경기 가평군',
      '경기 양평군',
    ],
  },
  {
    name: '인천광역시', file: '인천광역시.json',
    subregions: [
      '인천 중구','인천 동구','인천 미추홀구','인천 연수구','인천 남동구',
      '인천 부평구','인천 계양구','인천 서구','인천 강화군','인천 옹진군',
    ],
  },
  {
    name: '부산광역시', file: '부산광역시.json',
    subregions: [
      '부산 중구','부산 서구','부산 동구','부산 영도구','부산 부산진구',
      '부산 동래구','부산 남구','부산 북구','부산 해운대구','부산 사하구',
      '부산 금정구','부산 강서구','부산 연제구','부산 수영구','부산 사상구',
      '부산 기장군',
    ],
  },
  {
    name: '경상남도', file: '경상남도.json',
    subregions: [
      '경남 창원시','경남 진주시','경남 통영시','경남 사천시','경남 김해시',
      '경남 밀양시','경남 거제시','경남 양산시','경남 의령군','경남 함안군',
      '경남 창녕군','경남 고성군','경남 남해군','경남 하동군','경남 산청군',
      '경남 함양군','경남 거창군','경남 합천군',
    ],
  },
  {
    name: '대구광역시', file: '대구광역시.json',
    subregions: [
      '대구 중구','대구 동구','대구 서구','대구 남구','대구 북구',
      '대구 수성구','대구 달서구','대구 달성군','대구 군위군',
    ],
  },
  {
    name: '경상북도', file: '경상북도.json',
    subregions: [
      '경북 포항시','경북 경주시','경북 김천시','경북 안동시','경북 구미시',
      '경북 영주시','경북 영천시','경북 상주시','경북 문경시','경북 경산시',
      '경북 의성군','경북 청송군','경북 영양군','경북 영덕군','경북 청도군',
      '경북 고령군','경북 성주군','경북 칠곡군','경북 예천군','경북 봉화군',
      '경북 울진군','경북 울릉군',
    ],
  },
  {
    name: '광주광역시', file: '광주광역시.json',
    subregions: [
      '광주 동구','광주 서구','광주 남구','광주 북구','광주 광산구',
    ],
  },
  {
    name: '전북특별자치도', file: '전북특별자치도.json',
    subregions: [
      '전북 전주시','전북 군산시','전북 익산시','전북 정읍시','전북 남원시',
      '전북 김제시','전북 완주군','전북 진안군','전북 무주군','전북 장수군',
      '전북 임실군','전북 순창군','전북 고창군','전북 부안군',
    ],
  },
  {
    name: '충청남도', file: '충청남도.json',
    subregions: [
      '충남 천안시','충남 공주시','충남 보령시','충남 아산시','충남 서산시',
      '충남 논산시','충남 계룡시','충남 당진시','충남 금산군','충남 부여군',
      '충남 서천군','충남 청양군','충남 홍성군','충남 예산군','충남 태안군',
    ],
  },
  {
    name: '전라남도', file: '전라남도.json',
    subregions: [
      '전남 목포시','전남 여수시','전남 순천시','전남 나주시','전남 광양시',
      '전남 담양군','전남 곡성군','전남 구례군','전남 고흥군','전남 보성군',
      '전남 화순군','전남 장흥군','전남 강진군','전남 해남군','전남 영암군',
      '전남 무안군','전남 함평군','전남 영광군','전남 장성군','전남 완도군',
      '전남 진도군','전남 신안군',
    ],
  },
  {
    name: '강원특별자치도', file: '강원특별자치도.json',
    subregions: [
      '강원 춘천시','강원 원주시','강원 강릉시','강원 동해시','강원 태백시',
      '강원 속초시','강원 삼척시','강원 홍천군','강원 횡성군','강원 영월군',
      '강원 평창군','강원 정선군','강원 철원군','강원 화천군','강원 양구군',
      '강원 인제군','강원 고성군','강원 양양군',
    ],
  },
  {
    name: '대전광역시', file: '대전광역시.json',
    subregions: [
      '대전 동구','대전 중구','대전 서구','대전 유성구','대전 대덕구',
    ],
  },
  {
    name: '충청북도', file: '충청북도.json',
    subregions: [
      '충북 청주시','충북 충주시','충북 제천시','충북 보은군','충북 옥천군',
      '충북 영동군','충북 증평군','충북 진천군','충북 괴산군','충북 음성군',
      '충북 단양군',
    ],
  },
  {
    name: '울산광역시', file: '울산광역시.json',
    subregions: [
      '울산 중구','울산 남구','울산 동구','울산 북구','울산 울주군',
    ],
  },
  {
    name: '제주특별자치도', file: '제주특별자치도.json',
    subregions: [
      '제주 제주시','제주 서귀포시',
    ],
  },
  {
    name: '세종특별자치시', file: '세종특별자치시.json',
    subregions: ['세종'],
  },
];

// 카카오 키워드 검색 — 한 페이지
function kakaoPage(key, query, page) {
  const q = `query=${encodeURIComponent(query)}&size=15&page=${page}`;
  const opts = { hostname:'dapi.kakao.com', path:`/v2/local/search/keyword.json?${q}`, headers:{Authorization:`KakaoAK ${key}`} };
  return new Promise(resolve => {
    https.get(opts, r => {
      const ch = []; r.on('data', c => ch.push(c));
      r.on('end', () => { try { resolve(JSON.parse(Buffer.concat(ch).toString('utf8'))); } catch(e) { resolve({}); } });
    }).on('error', () => resolve({}));
  });
}

// 브랜드+지역 조합 전체 페이지 수집
async function collectBrandSubregion(key, brandQuery, subregion) {
  const query = `${brandQuery} ${subregion}`;
  const results = [];
  for (let page = 1; page <= 45; page++) {
    const res = await kakaoPage(key, query, page);
    const docs = res.documents || [];
    results.push(...docs);
    if (res.meta?.is_end) break;
    await new Promise(r => setTimeout(r, 80));
  }
  return results;
}

// 두 좌표 간 거리(m) — Haversine
function dist(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 기존 매장과 50m 이내면 중복
function isDuplicate(lat, lng, existingSet) {
  for (const e of existingSet) {
    if (dist(lat, lng, e.lat, e.lng) < 50) return true;
  }
  return false;
}

// 주소가 이 시/도에 속하는지 확인 (2글자 접두어 매칭)
function belongsToProvince(addr, provinceName) {
  if (!addr) return false;
  const prefix2 = provinceName.slice(0, 2);
  return addr.startsWith(prefix2) || addr.startsWith(provinceName);
}

async function run() {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) { console.error('KAKAO_REST_KEY 없음. .env에 추가하세요.'); process.exit(1); }

  const targetBrandArg = process.argv[2];
  const targetBrands = targetBrandArg
    ? BRANDS.filter(b => b.name.includes(targetBrandArg) || b.query.includes(targetBrandArg))
    : BRANDS;

  if (targetBrands.length === 0) { console.error('일치하는 브랜드 없음:', targetBrandArg); process.exit(1); }
  console.error(`대상 브랜드: ${targetBrands.map(b=>b.name).join(', ')}`);
  console.error(`총 쿼리 수: ${targetBrands.length}개 브랜드 × ${PROVINCES.reduce((s,p)=>s+p.subregions.length,0)}개 세부지역`);

  const overrides = loadOverrides();

  // 시/도별 기존 매장 로드
  const provinceStores = {};
  for (const prov of PROVINCES) {
    const file = path.join(STORES_DIR, prov.file);
    provinceStores[prov.name] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : [];
  }

  const addedByBrand = {};
  let totalAdded = 0;

  for (const brand of targetBrands) {
    let brandAdded = 0;
    process.stderr.write(`  [${brand.name}] `);

    for (const prov of PROVINCES) {
      const existing = provinceStores[prov.name];
      // existingSet을 Set으로 관리해 중복 검사 속도 개선
      const existingSet = existing.map(s => ({ lat: s.lat, lng: s.lng }));

      for (const subregion of prov.subregions) {
        const docs = await collectBrandSubregion(key, brand.query, subregion);

        for (const doc of docs) {
          const lat = parseFloat(doc.y), lng = parseFloat(doc.x);
          if (!isFinite(lat) || !isFinite(lng)) continue;

          const addr = doc.road_address_name || doc.address_name || '';
          if (!belongsToProvince(addr, prov.name)) continue;
          if (isDuplicate(lat, lng, existingSet)) continue;

          const id = `${brand.name}_kakao_${doc.id}`;
          const store = {
            id,
            brand: brand.name,
            name: doc.place_name,
            lat, lng,
            address: addr,
            phone: doc.phone || '',
            openingHours: '',
            services: { parking:null, wifi:null, outlet:null, driveThrough:null, terrace:null, pet:null },
            petPolicyType: '정보 없음',
            lastCheckedAt: new Date().toISOString().slice(0,10),
            _source: 'kakao-local',
          };
          existing.push(store);
          existingSet.push({ lat, lng });
          brandAdded++;
          totalAdded++;
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    addedByBrand[brand.name] = brandAdded;
    console.error(`+${brandAdded}개`);
  }

  // 변경된 시/도 파일 저장 + index 갱신
  const index = [];
  for (const prov of PROVINCES) {
    const stores = provinceStores[prov.name];
    normalizeAndApply(stores, overrides);
    fs.writeFileSync(path.join(STORES_DIR, prov.file), JSON.stringify(stores, null, 2), 'utf-8');
    if (stores.length > 0) {
      const lats = stores.map(s=>s.lat), lngs = stores.map(s=>s.lng);
      index.push({
        province: prov.name, file: prov.file, count: stores.length,
        centerLat: lats.reduce((a,b)=>a+b,0)/lats.length,
        centerLng: lngs.reduce((a,b)=>a+b,0)/lngs.length,
      });
    }
  }
  fs.writeFileSync(path.join(STORES_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  // brands.json 갱신
  const existingBrands = fs.existsSync(BRANDS_FILE) ? JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf-8')) : [];
  const existingNames = new Set(existingBrands.map(b=>b.name));
  for (const b of BRANDS) {
    if (!existingNames.has(b.name) && (addedByBrand[b.name] || 0) > 0) {
      const { query, ...rest } = b;
      existingBrands.push(rest);
    }
  }
  fs.writeFileSync(BRANDS_FILE, JSON.stringify(existingBrands, null, 2), 'utf-8');

  console.error(`\n=== 브랜드별 추가 매장 수 ===`);
  Object.entries(addedByBrand).sort((a,b)=>b[1]-a[1]).forEach(([b,n])=>console.error(`  ${b.padEnd(14)} +${n}`));
  console.error(`\n총 ${totalAdded}개 매장 추가 완료.`);

  // 현재 시/도별 총계 출력
  console.error(`\n=== 시/도별 최종 매장 수 ===`);
  let grandTotal = 0;
  for (const e of index) {
    console.error(`  ${e.province.padEnd(12)} ${e.count}개`);
    grandTotal += e.count;
  }
  console.error(`  ${'합계'.padEnd(12)} ${grandTotal}개`);
}

run();
