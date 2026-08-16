// 브랜드별 크롤러를 모두 실행해 deals.json을 만든다. (crawlEvents.js 대체)
//
// 출력 스키마 — 브랜드가 실제로 공개하는 정보만 담는다:
//   { brand, id, title, link, startDate, endDate, category, daysLeft, isNew, ongoing }
// 메뉴별 가격·할인율은 브랜드가 공개하지 않으므로 필드 자체를 두지 않는다.
// (예전 모델에는 price/discountRate가 있었고, 그 빈칸을 채우려고 가짜 데이터가 만들어졌다.)
const fs = require('fs');
const path = require('path');

// 차단 감지 목록. 브랜드별로 앞뒤를 비교해 "차단 0건"과 "행사가 없어서 0건"을 구분한다.
const { blockedUrls } = require('./crawlers/_http');

const { crawlStarbucks } = require('./crawlers/starbucks');
const { crawlEdiya } = require('./crawlers/ediya');
const { crawlCompose } = require('./crawlers/compose');
const { crawlHollys } = require('./crawlers/hollys');
const { crawlCoffeeBean } = require('./crawlers/coffeebean');
const { crawlMega } = require('./crawlers/mega');
const { crawlPaikdabang } = require('./crawlers/paikdabang');
const { crawlMammoth } = require('./crawlers/mammoth');
const { crawlAngelinus } = require('./crawlers/angelinus');
const { crawlPaulBassett } = require('./crawlers/paulbassett');
const { crawlTomntoms } = require('./crawlers/tomntoms');
const { crawlTenPercent } = require('./crawlers/tenpercent');
const { crawlTheVenti } = require('./crawlers/theventi');
const { crawlGamsung } = require('./crawlers/gamsung');
const { crawlGongcha } = require('./crawlers/gongcha');
const { crawlTheLiter } = require('./crawlers/theliter');
const { crawlHasamdong } = require('./crawlers/hasamdong');

const DEALS_FILE = path.join(__dirname, '..', '카페 행사', 'deals.json');

// 브랜드별 마지막 수집 성공일. 안전장치(0건이면 기존 유지)가 실패를 조용히 삼키기 때문에
// 이 파일이 없으면 크롤러가 언제부터 깨졌는지 알 수가 없다.
// 실제로 더벤티가 열흘 넘게 옛 데이터를 실어 나르는데도 아무도 몰랐다.
const STATUS_FILE = path.join(__dirname, '..', '카페 행사', 'crawl-status.json');

// 이 일수를 넘겨 0건이면 크롤러가 깨진 것으로 보고 경고한다.
// 브랜드가 새 행사를 안 올려서 0건인 경우와 구분하려고 넉넉히 잡았다.
const STALE_DAYS = 14;

const CRAWLERS = [
  { brand: '스타벅스', fn: crawlStarbucks },
  { brand: '메가MGC커피', fn: crawlMega },
  { brand: '이디야커피', fn: crawlEdiya },
  { brand: '컴포즈커피', fn: crawlCompose },
  { brand: '빽다방', fn: crawlPaikdabang },
  { brand: '할리스', fn: crawlHollys },
  { brand: '매머드커피', fn: crawlMammoth },
  { brand: '엔제리너스', fn: crawlAngelinus },
  { brand: '폴 바셋', fn: crawlPaulBassett },
  { brand: '탐앤탐스', fn: crawlTomntoms },
  { brand: '더벤티', fn: crawlTheVenti },
  { brand: '공차', fn: crawlGongcha },
  { brand: '텐퍼센트커피', fn: crawlTenPercent },
  { brand: '더리터', fn: crawlTheLiter },
  { brand: '하삼동커피', fn: crawlHasamdong },
  { brand: '감성커피', fn: crawlGamsung },
  { brand: '커피빈', fn: crawlCoffeeBean },
];

// 일부 브랜드는 이벤트 전용 게시판이 없어 공지 게시판에서 가져온다.
// 행사와 무관한 공지(약관·개인정보·가격 인상 등)는 이벤트 앱에 노이즈라 제외한다.
const NON_EVENT_RE = /약관|개인정보|처리방침|가격\s*인상|서비스\s*(종료|중단)|점검\s*안내|휴무|채용|공고|저작권|사칭|주의\s*안내/;

// 더리터·텐퍼센트는 종료된 행사를 게시판에서 내리지 않고 제목에 표시만 한다.
// (더리터 '<종료> ...' 접두, 텐퍼센트 '... (※이벤트 종료)' 접미)
// endDate가 없어 daysLeft로는 걸러지지 않아 2024년 행사까지 '상시 진행'으로 노출됐다.
// '판매 종료 예정 안내', '기존 앱 종료 안내'처럼 진행 중인 공지는 걸리지 않도록 표기 형태만 좁게 잡는다.
const ENDED_TITLE_RE = /^\s*<\s*종료\s*>|\(※[^)]*종료\s*\)/;

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

// KST 기준 오늘. 로컬 시각을 쓰면 CI(UTC)에서 하루 전 날짜가 나온다.
// 크론이 04시 KST = 전날 19시 UTC에 돌기 때문에 crawl-status.json의
// lastSuccess가 매번 하루씩 밀려 기록되고, 경과일 계산도 그만큼 부풀려졌다.
function todayStr() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

/** KST 달력 날짜 번호. 시간 차가 아니라 날짜 차로 세기 위한 값. */
const kstDay = ms => Math.floor((ms + 9 * 3600000) / 86400000);

/** 종료일까지 남은 일수(KST 달력 날짜 기준). 종료일이 없으면 null(상시 진행). */
// 예전에는 Math.ceil로 시간 차를 올림했는데, 끝난 지 24시간이 안 된 행사가 -0이 됐다.
// -0 === 0 이라 소비 측에서 "종료"가 아니라 "오늘 마감"으로 읽혔다.
function daysUntil(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate + 'T00:00:00+09:00');
  if (isNaN(end)) return null;
  return kstDay(end.getTime()) - kstDay(Date.now());
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
  const blocked = new Set(); // 차단 응답을 받은 브랜드

  for (const { brand, fn } of CRAWLERS) {
    process.stdout.write(`  [${brand}] 수집 중...`);
    const blockedBefore = blockedUrls.length;
    try {
      const items = await fn();
      if (blockedUrls.length > blockedBefore) blocked.add(brand);
      const valid = (items || [])
        .filter(x => x && x.title && x.link)      // 출처 없는 항목은 버린다
        .filter(x => !NON_EVENT_RE.test(x.title))  // 행사와 무관한 공지 제외
        .filter(x => !ENDED_TITLE_RE.test(x.title)); // 제목에 종료라고 적힌 행사 제외
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

  // 브랜드별 마지막 성공일을 갱신하고, 오래 0건인 브랜드를 드러낸다.
  let status = {};
  try { status = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')); } catch (e) {}
  const today = todayStr();
  for (const b of freshBrands) status[b] = { lastSuccess: today, lastCount: collected.filter(d => d.brand === b).length };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');

  console.log(`\n수집 ${freshBrands.size}개 브랜드: ${collected.length}건`);
  if (failed.length) {
    console.log(`0건(기존 유지): ${failed.join(', ')}`);
    // 차단당한 브랜드는 즉시 알린다. 응답 자체가 안 오므로 며칠을 기다릴 이유가 없다.
    const blockedFailed = failed.filter(b => blocked.has(b));
    if (blockedFailed.length) {
      console.log(`\n[차단] ${blockedFailed.join(', ')} — 사이트가 접근을 막고 있습니다.`);
      console.log('        크롤러를 고쳐도 해결되지 않습니다. 옛 데이터가 계속 배포됩니다.');
    }
    // 나머지는 오래 0건일 때만 경고한다. 커피빈처럼 진행 중 행사가 없어 0건인 경우가 정상이라
    // 매번 알리면 경고가 무뎌진다.
    const stale = [];
    for (const b of failed) {
      if (blocked.has(b)) continue;
      const last = status[b] && status[b].lastSuccess;
      if (!last) continue; // 기록이 쌓이기 전에는 판단하지 않는다
      const days = kstDay(Date.now()) - kstDay(new Date(last + 'T00:00:00+09:00').getTime());
      if (days >= STALE_DAYS) stale.push(`${b}(${days}일째)`);
    }
    if (stale.length) {
      console.log(`\n[경고] ${STALE_DAYS}일 넘게 0건인 브랜드: ${stale.join(', ')}`);
      console.log('        크롤러가 깨졌을 가능성이 높습니다. 옛 데이터가 계속 배포되는 중입니다.');
    }
  }
  console.log(`deals.json 총 ${final.length}건 (${today})`);

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
