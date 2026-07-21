// 브랜드별 크롤러를 모두 실행해 deals.json을 만든다. (crawlEvents.js 대체)
//
// 출력 스키마 — 브랜드가 실제로 공개하는 정보만 담는다:
//   { brand, id, title, link, startDate, endDate, category, daysLeft, isNew, ongoing }
// 메뉴별 가격·할인율은 브랜드가 공개하지 않으므로 필드 자체를 두지 않는다.
// (예전 모델에는 price/discountRate가 있었고, 그 빈칸을 채우려고 가짜 데이터가 만들어졌다.)
const fs = require('fs');
const path = require('path');

const { crawlStarbucks } = require('./crawlers/starbucks');
const { crawlEdiya } = require('./crawlers/ediya');
const { crawlCompose } = require('./crawlers/compose');
const { crawlHollys } = require('./crawlers/hollys');
const { crawlCoffeeBean } = require('./crawlers/coffeebean');
const { crawlMega } = require('./crawlers/mega');

const DEALS_FILE = path.join(__dirname, '..', '카페 행사', 'deals.json');

const CRAWLERS = [
  { brand: '스타벅스', fn: crawlStarbucks },
  { brand: '메가MGC커피', fn: crawlMega },
  { brand: '이디야커피', fn: crawlEdiya },
  { brand: '컴포즈커피', fn: crawlCompose },
  { brand: '할리스', fn: crawlHollys },
  { brand: '커피빈', fn: crawlCoffeeBean },
];

// 제목 키워드로 카테고리 추정. 위에서부터 먼저 매칭되는 것으로 분류한다.
const CATEGORY_RULES = [
  ['신메뉴', /신메뉴|신제품|출시|런칭|NEW\b/i],
  ['시즌', /시즌|여름|겨울|봄\b|가을|크리스마스|연말|신년/],
  ['쿠폰·할인', /쿠폰|할인|무료|세일|증정|사이즈업|\d+\s*%|1\+1/],
  ['콜라보·굿즈', /콜라보|굿즈|MD\b|기획전|에디션/i],
  ['멤버십·앱', /멤버십|회원|스탬프|적립|앱\b|APP/i],
];

function guessCategory(title) {
  for (const [category, re] of CATEGORY_RULES) if (re.test(title)) return category;
  return '이벤트';
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 종료일까지 남은 일수. 종료일이 없으면 null(상시 진행). */
function daysUntil(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate + 'T23:59:59+09:00');
  if (isNaN(end)) return null;
  return Math.ceil((end - new Date()) / 86400000);
}

/** 시작일이 최근 7일 이내면 신규로 본다. */
function isRecent(startDate) {
  if (!startDate) return false;
  const s = new Date(startDate + 'T00:00:00+09:00');
  if (isNaN(s)) return false;
  return (new Date() - s) / 86400000 <= 7;
}

function enrich(d) {
  const daysLeft = daysUntil(d.endDate);
  return {
    brand: d.brand,
    id: `${d.brand}_${d.id}`,
    title: d.title,
    link: d.link,
    startDate: d.startDate || '',
    endDate: d.endDate || '',
    category: guessCategory(d.title),
    daysLeft,                                  // null = 종료일 미표기
    isNew: isRecent(d.startDate),
    ongoing: daysLeft === null || daysLeft >= 0, // 종료일이 지났으면 false
  };
}

async function run() {
  const collected = [];
  const failed = [];

  for (const { brand, fn } of CRAWLERS) {
    process.stdout.write(`  [${brand}] 수집 중...`);
    try {
      const items = await fn();
      const valid = (items || []).filter(x => x && x.title && x.link); // 출처 없는 항목은 버린다
      if (valid.length === 0) { failed.push(brand); console.log(' 0건'); }
      else { collected.push(...valid.map(enrich)); console.log(` ${valid.length}건`); }
    } catch (e) {
      failed.push(brand);
      console.log(` 실패: ${e.message}`);
    }
  }

  // 안전장치 1: 전부 실패면 기존 파일을 건드리지 않는다.
  if (collected.length === 0) {
    console.error('\n[중단] 수집 결과가 0건입니다. 기존 deals.json을 유지합니다.');
    process.exit(1);
  }

  // 안전장치 2: 이번에 데이터를 받은 브랜드만 교체하고,
  // 0건인 브랜드는 기존 데이터를 남긴다(크롤러 하나가 깨져도 브랜드가 사라지지 않게).
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf-8')); } catch (e) {}
  const freshBrands = new Set(collected.map(d => d.brand));
  const kept = existing.filter(d => d.brand && !freshBrands.has(d.brand));

  const final = [...collected, ...kept];
  fs.writeFileSync(DEALS_FILE, JSON.stringify(final, null, 2), 'utf-8');

  console.log(`\n수집 ${freshBrands.size}개 브랜드: ${collected.length}건`);
  if (failed.length) console.log(`0건(기존 유지): ${failed.join(', ')}`);
  console.log(`deals.json 총 ${final.length}건 (${todayStr()})`);

  const byBrand = {};
  const byCat = {};
  for (const d of final) {
    byBrand[d.brand] = (byBrand[d.brand] || 0) + 1;
    byCat[d.category] = (byCat[d.category] || 0) + 1;
  }
  console.log('\n=== 브랜드별 ===');
  Object.entries(byBrand).sort((a, b) => b[1] - a[1]).forEach(([b, n]) => console.log(`  ${b.padEnd(12)} ${n}건`));
  console.log('=== 카테고리별 ===');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c.padEnd(12)} ${n}건`));
}

run();
