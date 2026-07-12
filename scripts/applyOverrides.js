// data/service-overrides.json의 큐레이션 값을 매장 파일(카페 행사/stores/*.json)에 병합하고 스키마를 통일한다.
// (대형약국 앱의 오버라이드 레이어 패턴 이식) 소상공인 API는 편의정보를 안 주므로, 사람이 확인한 값을
// 이 파일로 채운다. API를 다시 부르지 않고 로컬 파일만 갱신하므로 큐레이션만 바꿨을 때 빠르게 반영된다.
//
// 편의정보는 3-state로 관리한다: true=있음(가능) / false=없음(불가) / null=정보 없음(미확인).
// fetchStores.js가 이 함수를 재사용하므로 module.exports로도 노출한다.
//
// 사용법: node scripts/applyOverrides.js
const fs = require('fs');
const path = require('path');

const STORES_DIR = path.join(__dirname, '..', '카페 행사', 'stores');
const OVERRIDES_FILE = path.join(__dirname, '..', 'data', 'service-overrides.json');

const SERVICE_KEYS = ['parking', 'wifi', 'outlet', 'driveThrough', 'terrace', 'pet'];
// 구 스키마(hasParking 등) → 신 스키마(services.parking) 매핑. 이관 후 구 필드는 제거.
const LEGACY_MAP = { parking: 'hasParking', wifi: 'hasWifi', outlet: 'hasOutlet', driveThrough: 'hasDriveThru', terrace: 'hasTerrace', pet: 'hasPetAllowed' };

function normalizeStore(store) {
  const src = (store.services && typeof store.services === 'object') ? store.services : {};
  const services = {};
  for (const k of SERVICE_KEYS) {
    if (k in src) services[k] = src[k] === true ? true : src[k] === false ? false : null;
    else services[k] = store[LEGACY_MAP[k]] === true ? true : null; // 구 false/미상은 '정보 없음'(null)
  }
  store.services = services;
  Object.values(LEGACY_MAP).forEach(k => delete store[k]);
  if (!store.petPolicyType) store.petPolicyType = '정보 없음';
  return store;
}

function applyOverrideToStore(store, ov) {
  if (!ov) return false;
  if (ov.services) for (const k of SERVICE_KEYS) if (k in ov.services) store.services[k] = ov.services[k];
  if (ov.petPolicyType) store.petPolicyType = ov.petPolicyType;
  if (typeof ov.openingHours === 'string') store.openingHours = ov.openingHours;
  if (typeof ov.phone === 'string' && ov.phone) store.phone = ov.phone;
  return true;
}

// 매장 배열에 스키마 통일 + 오버라이드 병합. fetchStores.js에서 재사용.
function normalizeAndApply(stores, overrides) {
  let curated = 0;
  for (const store of stores) {
    normalizeStore(store);
    if (applyOverrideToStore(store, overrides[store.id])) curated++;
  }
  return curated;
}

function loadOverrides() {
  return fs.existsSync(OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8')) : {};
}

function run() {
  const overrides = loadOverrides();
  const index = JSON.parse(fs.readFileSync(path.join(STORES_DIR, 'index.json'), 'utf-8'));
  let total = 0, totalCurated = 0;
  for (const { file } of index) {
    const fp = path.join(STORES_DIR, file);
    const stores = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const curated = normalizeAndApply(stores, overrides);
    fs.writeFileSync(fp, JSON.stringify(stores), 'utf-8');
    console.error(`${file}: ${stores.length}건 스키마 통일 (큐레이션 ${curated}건)`);
    total += stores.length;
    totalCurated += curated;
  }
  console.error(`\n총 ${total}곳 스키마 통일, 이 중 ${totalCurated}곳에 큐레이션 값 반영.`);
}

module.exports = { SERVICE_KEYS, normalizeAndApply, loadOverrides };

if (require.main === module) run();
