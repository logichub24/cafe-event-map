// 브랜드 정책 기본값으로 25,516개 매장 편의정보(wifi/outlet/pet/driveThrough) 일괄 적용
const fs = require('fs');
const path = require('path');

// 브랜드별 기본 편의정보 정책 (null = 정보 없음, 매장명으로 추정 불가)
// 이미 true/false로 설정된 값은 덮어쓰지 않음 (null인 경우만 채움)
const BRAND_POLICY = {
  '스타벅스':    { wifi: true,  outlet: true,  pet: false, terrace: null },
  '이디야':      { wifi: true,  outlet: true,  pet: false, terrace: null },
  '컴포즈커피':  { wifi: true,  outlet: true,  pet: false, terrace: null },
  '메가커피':    { wifi: true,  outlet: true,  pet: false, terrace: null },
  '빽다방':      { wifi: true,  outlet: true,  pet: false, terrace: null },
  '투썸플레이스':{ wifi: true,  outlet: true,  pet: false, terrace: null },
  '할리스':      { wifi: true,  outlet: true,  pet: false, terrace: null },
  '커피빈':      { wifi: true,  outlet: true,  pet: false, terrace: null },
  '탐앤탐스':    { wifi: true,  outlet: true,  pet: null,  terrace: null },
  '엔젤리너스':  { wifi: true,  outlet: true,  pet: false, terrace: null },
  '폴바셋':      { wifi: true,  outlet: true,  pet: false, terrace: null },
  '파스쿠찌':    { wifi: true,  outlet: true,  pet: false, terrace: null },
  '카페베네':    { wifi: true,  outlet: true,  pet: false, terrace: null },
  '달콤커피':    { wifi: true,  outlet: null,  pet: false, terrace: null },
  '드롭탑':      { wifi: true,  outlet: null,  pet: false, terrace: null },
  '커피나무':    { wifi: true,  outlet: null,  pet: false, terrace: null },
  '토프레소':    { wifi: true,  outlet: null,  pet: false, terrace: null },
  '공차':        { wifi: false, outlet: false, pet: null, terrace: null },
  '빈스앤베리즈':{ wifi: true,  outlet: true,  pet: false, terrace: null },
  '커피스미스':  { wifi: true,  outlet: true,  pet: false, terrace: null },
};

// 매장명에 DT/드라이브스루 포함 시 driveThrough=true
function inferDriveThrough(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('dt점') || n.includes('드라이브스루') || n.includes('drive') || / dt$/i.test(name)) return true;
  return null;
}

const STORES_DIR = path.join(__dirname, '..', '카페 행사', 'stores');
const indexPath = path.join(STORES_DIR, 'index.json');

function enrichStore(store) {
  const policy = BRAND_POLICY[store.brand];
  if (!policy) return store;

  const svc = store.services || {};

  // null인 필드만 채움 (이미 true/false인 값 보존)
  const fill = key => svc[key] === null || svc[key] === undefined ? policy[key] ?? null : svc[key];

  const dt = svc.driveThrough === null || svc.driveThrough === undefined
    ? (inferDriveThrough(store.name) ?? null)
    : svc.driveThrough;

  store.services = {
    parking:     svc.parking     ?? null,
    wifi:        fill('wifi'),
    outlet:      fill('outlet'),
    driveThrough: dt,
    terrace:     fill('terrace'),
    pet:         fill('pet'),
  };
  return store;
}

async function main() {
  const idx = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const provinces = Object.values(idx);

  let totalStores = 0;
  let enrichedWifi = 0;
  let enrichedOutlet = 0;
  let enrichedPet = 0;
  let enrichedDt = 0;

  for (const p of provinces) {
    const filePath = path.join(STORES_DIR, p.file);
    const stores = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const enriched = stores.map(s => {
      const before = { ...s.services };
      enrichStore(s);
      const after = s.services;
      if (before.wifi === null && after.wifi !== null) enrichedWifi++;
      if (before.outlet === null && after.outlet !== null) enrichedOutlet++;
      if (before.pet === null && after.pet !== null) enrichedPet++;
      if (before.driveThrough === null && after.driveThrough !== null) enrichedDt++;
      return s;
    });

    totalStores += enriched.length;
    fs.writeFileSync(filePath, JSON.stringify(enriched), 'utf-8');
    process.stdout.write(`\r[${p.province}] ${enriched.length}개 처리 완료`);
  }

  console.log(`\n\n완료: 총 ${totalStores.toLocaleString()}개 매장`);
  console.log(`  wifi 채움:        ${enrichedWifi.toLocaleString()}개`);
  console.log(`  outlet 채움:      ${enrichedOutlet.toLocaleString()}개`);
  console.log(`  pet 채움:         ${enrichedPet.toLocaleString()}개`);
  console.log(`  driveThrough 채움: ${enrichedDt.toLocaleString()}개`);
}

main().catch(console.error);
