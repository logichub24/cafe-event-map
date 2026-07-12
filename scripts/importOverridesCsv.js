// 편의정보 CSV를 data/service-overrides.json에 대량 병합한다(키 불필요, 지금 실행 가능).
// 공개 API가 주지 않는 주차/와이파이/콘센트/드라이브스루/테라스/반려동물을 사람이 CSV로 채워 넣는 용도.
//
// CSV 열(헤더 필수, 순서 무관):
//   id            - 매장 id(알면 가장 정확). 없으면 brand+name으로 매칭.
//   brand, name   - id 대신 매칭용(brand 안에서 name 부분일치).
//   parking, wifi, outlet, driveThrough, terrace, pet  - true/false (빈칸=건드리지 않음)
//   petPolicyType - 가능/불가/테라스만 가능/이동가방 필요/소형견만 가능
//   openingHours, phone - API에 없는 값 보강(선택)
//   _source       - 근거 메모(선택)
//
// 사용법: node scripts/importOverridesCsv.js <csv경로> [--apply]
//   --apply 를 주면 병합 후 applyOverrides까지 자동 실행.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STORES_DIR = path.join(__dirname, '..', '카페 행사', 'stores');
const OVERRIDES_FILE = path.join(__dirname, '..', 'data', 'service-overrides.json');
const BOOL_KEYS = ['parking', 'wifi', 'outlet', 'driveThrough', 'terrace', 'pet'];

// 아주 작은 CSV 파서(따옴표·콤마 처리). 반환: 객체 배열.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  text = text.replace(/^﻿/, ''); // BOM 제거
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const header = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(v => v.trim() !== '')).map(r => {
    const o = {};
    header.forEach((h, i) => o[h] = (r[i] || '').trim());
    return o;
  });
}

const norm = s => (s || '').replace(/\s+/g, '').toLowerCase();

// stores/*.json 전체를 읽어 id 인덱스 + (브랜드→매장) 인덱스 구성
function buildStoreIndex() {
  const index = JSON.parse(fs.readFileSync(path.join(STORES_DIR, 'index.json'), 'utf-8'));
  const byId = new Map();
  const byBrand = new Map();
  for (const { file } of index) {
    const stores = JSON.parse(fs.readFileSync(path.join(STORES_DIR, file), 'utf-8'));
    for (const s of stores) {
      byId.set(s.id, s);
      if (!byBrand.has(s.brand)) byBrand.set(s.brand, []);
      byBrand.get(s.brand).push(s);
    }
  }
  return { byId, byBrand };
}

function resolveId(row, idx) {
  if (row.id && idx.byId.has(row.id)) return row.id;
  if (row.brand && row.name) {
    const list = idx.byBrand.get(row.brand) || [];
    const q = norm(row.name);
    const hit = list.find(s => norm(s.name).includes(q) || q.includes(norm(s.name)));
    if (hit) return hit.id;
  }
  return null;
}

function parseBool(v) {
  const t = (v || '').trim().toLowerCase();
  if (t === 'true' || t === '1' || t === 'y' || t === 'o') return true;
  if (t === 'false' || t === '0' || t === 'n' || t === 'x') return false;
  return undefined; // 빈칸 → 건드리지 않음
}

function run() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error('사용법: node scripts/importOverridesCsv.js <csv경로> [--apply]'); process.exit(1); }
  const doApply = process.argv.includes('--apply');

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf-8'));
  const idx = buildStoreIndex();
  const overrides = fs.existsSync(OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8')) : {};

  let merged = 0, unmatched = 0;
  for (const row of rows) {
    const id = resolveId(row, idx);
    if (!id) { unmatched++; console.error(`매칭 실패: ${row.id || (row.brand + ' ' + row.name)}`); continue; }
    const ov = overrides[id] || {};
    ov.services = ov.services || {};
    for (const k of BOOL_KEYS) { const b = parseBool(row[k]); if (b !== undefined) ov.services[k] = b; }
    if (Object.keys(ov.services).length === 0) delete ov.services;
    if (row.petPolicyType) ov.petPolicyType = row.petPolicyType;
    if (row.openingHours) ov.openingHours = row.openingHours;
    if (row.phone) ov.phone = row.phone;
    if (row._source) ov._source = row._source;
    overrides[id] = ov;
    merged++;
  }

  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
  console.error(`\n${merged}건 병합, ${unmatched}건 매칭 실패 → ${path.relative(process.cwd(), OVERRIDES_FILE)}`);

  if (doApply) {
    console.error('applyOverrides 실행...');
    execFileSync(process.execPath, [path.join(__dirname, 'applyOverrides.js')], { stdio: 'inherit' });
  } else {
    console.error('로컬 매장 파일에 반영하려면: node scripts/applyOverrides.js');
  }
}

run();
