// 브랜드 공식 이벤트 페이지를 크롤링해 deals.json을 실데이터로 교체한다.
// 지원 브랜드: 스타벅스(JSON API)·이디야(HTML)·컴포즈(HTML)·할리스(HTML)·빽다방(HTML)·커피빈(HTML)
//
// 사용법: node scripts/crawlEvents.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DEALS_FILE = path.join(__dirname, '..', '카페 행사', 'deals.json');

// ── HTTP 헬퍼 ─────────────────────────────────────────────────────────────
function request(url, opts = {}, redirectCount = 0) {
  return new Promise(resolve => {
    if (redirectCount > 5) return resolve({ status: 'loop', body: '' });
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        ...opts.headers,
      },
      rejectUnauthorized: false,
      timeout: 15000,
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return request(loc, opts, redirectCount + 1).then(resolve);
      }
      const ch = []; res.on('data', c => ch.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(ch).toString('utf-8') }));
    }).on('error', e => resolve({ status: 'error', body: '', msg: e.message }))
      .on('timeout', function () { this.destroy(); resolve({ status: 'timeout', body: '' }); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 공통 유틸 ──────────────────────────────────────────────────────────────
function decodeHtml(str) {
  return (str || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// 날짜 문자열 → YYYY-MM-DD
function parseDate(str) {
  if (!str) return '';
  // YYYY-MM-DD or YYYY.MM.DD
  const m1 = str.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  // 2026년 01월 02일
  const m2 = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  return '';
}

function daysLeft(endDateStr) {
  if (!endDateStr) return 999;
  const end = new Date(endDateStr);
  const now = new Date();
  return Math.ceil((end - now) / 86400000);
}

// 이벤트 제목에서 타입 추론
function guessType(title) {
  if (!title) return '이벤트';
  const t = title.toLowerCase();
  if (t.includes('쿠폰') || t.includes('할인')) return '할인';
  if (t.includes('신메뉴') || t.includes('출시') || t.includes('new')) return '신메뉴';
  if (t.includes('시즌') || t.includes('season')) return '시즌';
  if (t.includes('사이즈업') || t.includes('size up')) return '사이즈업';
  return '이벤트';
}

// 공통 deal 객체 생성
function makeDeal(brand, id, title0, startDate, endDate, imageUrl, officialUrl, extra = {}) {
  const title = decodeHtml(title0);
  const type = extra.type || guessType(title);
  return {
    id: `${brand}_real_${id}`,
    name: decodeHtml(title),
    category: type,
    price: 0,
    saving: 0,
    discountPrice: 0,
    discountRate: 0,
    eventTitle: title,
    conditionText: extra.conditionText || '',
    officialUrl,
    isCoupon: type === '할인',
    isNewMenu: type === '신메뉴',
    isSeasonMenu: type === '시즌',
    events: {
      [brand]: {
        type,
        isNew: type === '신메뉴',
        daysLeft: daysLeft(endDate),
        image: imageUrl || '',
        startDate: startDate || '',
        endDate: endDate || '',
      },
    },
  };
}

// ── 브랜드별 크롤러 ─────────────────────────────────────────────────────────

// 1. 스타벅스 — JSON API (pageIndex 파라미터, GET)
async function crawlStarbucks() {
  const deals = [];
  const BASE = 'https://www.starbucks.co.kr';
  const IMG_BASE = 'https://image.istarbucks.co.kr/upload/news';
  const MAX_PAGES = 5; // 최근 50건 (페이지당 10건)
  for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex++) {
    const r = await request(`${BASE}/whats_new/newsListAjax.do?cateType=&pageIndex=${pageIndex}&recordCountPerPage=10`);
    if (r.status !== 200) break;
    let data;
    try { data = JSON.parse(r.body); } catch (e) { break; }
    const list = data.list || [];
    if (!list.length) break;
    for (const item of list) {
      const title = item.title || '';
      if (!title) continue;
      const imgNm = item.img_nm || '';
      const imageUrl = imgNm ? `${IMG_BASE}/${imgNm}` : '';
      const startDate = parseDate(item.start_dt || item.news_dt || item.reg_dt);
      const endDate = parseDate(item.end_dt || '');
      const link = `${BASE}/whats_new/newsView.do?seq=${item.seq}`;
      deals.push(makeDeal('스타벅스', item.seq, title, startDate, endDate, imageUrl, link));
    }
    if (list.length < 10) break;
    await sleep(200);
  }
  return deals;
}

// 2. 이디야커피 — HTML board_e
async function crawlEdiya() {
  const deals = [];
  const BASE = 'https://www.ediya.com';
  let pg = 1;
  while (pg <= 5) {
    const url = `${BASE}/contents/event.html?tb_name=event&page=${pg}`;
    const r = await request(url);
    if (r.status !== 200 || !r.body) break;
    // <ul class="board_e"> 이후 <li> 항목들
    const ulIdx = r.body.indexOf('class="board_e"');
    if (ulIdx < 0) break;
    const ulEnd = r.body.indexOf('</ul>', ulIdx);
    const ulHtml = r.body.slice(ulIdx, ulEnd > 0 ? ulEnd : ulIdx + 20000);
    const liMatches = [...ulHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)];
    if (!liMatches.length) break;
    let added = 0;
    for (const m of liMatches) {
      const li = m[1];
      // 이미지
      const imgM = li.match(/src="([^"]*bbs_event[^"]*)"/);
      const imgSrc = imgM ? (imgM[1].startsWith('http') ? imgM[1] : `${BASE}/contents/${imgM[1].replace(/^\.\.\//, '')}`) : '';
      // 제목
      const titleM = li.match(/<dt[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
      const title = titleM ? titleM[1].trim() : '';
      // 링크
      const linkM = li.match(/href="([^"]*tb_name=event[^"]*)"/);
      const href = linkM ? `${BASE}/contents/${linkM[1].replace(/^\/contents\//, '')}` : `${BASE}/contents/event.html`;
      const idxM = li.match(/idx=(\d+)/);
      const idx = idxM ? idxM[1] : `${pg}_${added}`;
      // 날짜 (기간 : 2026년 01월 02일 ~ 2026년 12월 31일)
      const dateM = li.match(/기간\s*:\s*([^<~]+)~\s*([^<]+)/);
      const startDate = dateM ? parseDate(dateM[1].trim()) : '';
      const endDate = dateM ? parseDate(dateM[2].trim()) : '';
      if (title) {
        deals.push(makeDeal('이디야커피', idx, title, startDate, endDate, imgSrc, href));
        added++;
      }
    }
    if (added === 0) break;
    pg++;
    await sleep(300);
  }
  return deals;
}

// 3. 컴포즈커피 — doc_link 앵커 기반 추출
async function crawlCompose() {
  const deals = [];
  const BASE = 'https://composecoffee.com';
  let pg = 1;
  while (pg <= 5) {
    const r = await request(`${BASE}/event?page=${pg}`);
    if (r.status !== 200 || !r.body) break;
    // <a class="doc_link" href="https://composecoffee.com/event/NNN"> 패턴
    const docLinks = [...r.body.matchAll(/<a[^>]+href="(https?:\/\/composecoffee\.com\/event\/(\d+))"[^>]*class="doc_link"[^>]*>([\s\S]{0,600}?)<\/a>/g)];
    if (!docLinks.length) break;
    let added = 0;
    for (const m of docLinks) {
      const href = m[1], eventId = m[2], inner = m[3];
      const imgM = inner.match(/src="([^"]+)"/);
      const imgSrc = imgM ? (imgM[1].startsWith('http') ? imgM[1] : `${BASE}${imgM[1]}`) : '';
      const titleM = inner.match(/class="doc_title">([^<]+)<\/div>/);
      const title = titleM ? titleM[1].trim() : '';
      const dateM = inner.match(/class="regdate">([^<]+)<\/span>/);
      const startDate = parseDate(dateM ? dateM[1].trim() : '');
      if (title) {
        deals.push(makeDeal('컴포즈커피', eventId, title, startDate, '', imgSrc, href));
        added++;
      }
    }
    if (added === 0) break;
    pg++;
    await sleep(300);
  }
  return deals;
}

// 4. 할리스 — HTML event_listBox
async function crawlHollys() {
  const deals = [];
  const BASE = 'https://www.hollys.co.kr';
  const r = await request(`${BASE}/news/event/list.do`);
  if (r.status !== 200) return deals;
  const boxes = [...r.body.matchAll(/class="event_listBox">([\s\S]*?)<\/div>\s*(?:<div class="event_listBox">|<div class="paging">)/g)];
  // 위 패턴이 안 잡히면 더 단순한 방법으로
  const simpleBoxes = [...r.body.matchAll(/onclick="javascript:onDetail\((\d+)\)[^"]*"[^>]*>\s*(?:<img[^>]*src="([^"]+)")?[\s\S]*?<dt[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<dd class="event_date">[^2]*([^<~]+~[^<]+)</g)];

  if (simpleBoxes.length === 0) {
    // 대안: idx와 제목을 분리 추출
    const idxMatches = [...r.body.matchAll(/onDetail\((\d+)\)/g)];
    const imgMatches = [...r.body.matchAll(/src="(\/\/admin\.hollys\.co\.kr\/[^"]+)"/g)];
    const titleMatches = [...r.body.matchAll(/<span[^>]*><span class="sort">[^<]+<\/span>([^<]+)<\/span>/g)];
    const dateMatches = [...r.body.matchAll(/<dd class="event_date"><span>[^<]+<\/span>([^<]+)<\/dd>/g)];
    const seen = new Set();
    for (let i = 0; i < idxMatches.length; i++) {
      const idx = idxMatches[i][1];
      if (seen.has(idx)) continue;
      seen.add(idx);
      const title = titleMatches[Math.floor(seen.size - 1)]?.[1]?.trim() || '';
      if (!title) continue;
      const imgSrc = imgMatches[Math.floor(seen.size - 1)]?.[1]?.replace('//', 'https://') || '';
      const dateStr = dateMatches[Math.floor(seen.size - 1)]?.[1]?.trim() || '';
      const dateParts = dateStr.split('~').map(s => parseDate(s.trim()));
      deals.push(makeDeal('할리스', idx, title, dateParts[0] || '', dateParts[1] || '', imgSrc,
        `${BASE}/news/event/view.do?idx=${idx}`));
    }
    return deals;
  }

  for (const m of simpleBoxes) {
    const [, idx, imgSrc, title, dateStr] = m;
    const dateParts = (dateStr || '').split('~').map(s => parseDate(s.trim()));
    const img = imgSrc ? imgSrc.replace('//', 'https://') : '';
    deals.push(makeDeal('할리스', idx, title.trim(), dateParts[0] || '', dateParts[1] || '', img,
      `${BASE}/news/event/view.do?idx=${idx}`));
  }
  return deals;
}

// 5. 빽다방 — HTML (WordPress 구조)
async function crawlPaikdabang() {
  const deals = [];
  const BASE = 'https://www.paikdabang.com';
  const r = await request(`${BASE}/notice/event`);
  if (r.status !== 200) return deals;
  // WordPress article/post 패턴
  const articles = [...r.body.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)];
  for (const m of articles) {
    const a = m[1];
    const titleM = a.match(/<h\d[^>]*><a[^>]+>([^<]+)<\/a><\/h\d>/);
    const linkM = a.match(/href="(https?:\/\/www\.paikdabang\.com\/[^"]+)"/);
    const imgM = a.match(/src="([^"]+(?:\.jpg|\.png|\.webp|\.gif)[^"]*)"/i);
    const dateM = a.match(/<time[^>]*datetime="([^"]+)"/);
    const title = titleM?.[1]?.trim() || '';
    if (!title) continue;
    const href = linkM?.[1] || BASE;
    const imgSrc = imgM?.[1] || '';
    const startDate = parseDate(dateM?.[1] || '');
    const idM = href.match(/\/(\d+)\/?$/);
    const id = idM?.[1] || title.slice(0, 10);
    deals.push(makeDeal('빽다방', id, title, startDate, '', imgSrc, href));
  }
  return deals;
}

// 6. 커피빈 — HTML promotion_list
async function crawlCoffeeBean() {
  const deals = [];
  const BASE = 'https://www.coffeebeankorea.com';
  // category=1: Promotion, category=2: Promotion Drinks
  for (const cat of [1, 2]) {
    const r = await request(`${BASE}/promotion/list.asp?category=${cat}`);
    if (r.status !== 200) continue;
    const listIdx = r.body.indexOf('promotion_list');
    if (listIdx < 0) continue;
    const listHtml = r.body.slice(listIdx, listIdx + 5000);
    if (listHtml.includes('등록된') && listHtml.includes('없습니다')) continue;
    const items = [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      .filter(m => m[1].includes('href'));
    for (const m of items) {
      const li = m[1];
      const linkM = li.match(/href="([^"]*promotion[^"]*)"/);
      if (!linkM) continue;
      const href = linkM[1].startsWith('http') ? linkM[1] : `${BASE}${linkM[1]}`;
      const titleM = li.match(/<(?:h\d|strong|p)[^>]*>([^<]{5,})<\/(?:h\d|strong|p)>/);
      const title = titleM?.[1]?.trim() || '';
      if (!title || title.includes('PROMOTION')) continue;
      const imgM = li.match(/src="([^"]+(?:\.jpg|\.png|\.gif)[^"]*)"/i);
      const imgSrc = imgM?.[1] ? (imgM[1].startsWith('http') ? imgM[1] : `${BASE}${imgM[1]}`) : '';
      const idM = href.match(/idx=(\d+)|\/(\d+)$/);
      const id = idM?.[1] || idM?.[2] || title.slice(0, 8);
      deals.push(makeDeal('커피빈', `${cat}_${id}`, title, '', '', imgSrc, href));
    }
    await sleep(300);
  }
  return deals;
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function run() {
  const crawlers = [
    { brand: '스타벅스',   fn: crawlStarbucks },
    { brand: '이디야커피', fn: crawlEdiya },
    { brand: '컴포즈커피', fn: crawlCompose },
    { brand: '할리스',     fn: crawlHollys },
    { brand: '빽다방',     fn: crawlPaikdabang },
    { brand: '커피빈',     fn: crawlCoffeeBean },
  ];

  const allDeals = [];
  for (const { brand, fn } of crawlers) {
    process.stdout.write(`  [${brand}] 수집 중...`);
    try {
      const deals = await fn();
      allDeals.push(...deals);
      console.log(` ${deals.length}건`);
    } catch (e) {
      console.log(` 에러: ${e.message}`);
    }
    await sleep(400);
  }

  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(DEALS_FILE, 'utf-8')); } catch (e) {}

  // 안전장치 1: 모든 크롤러가 0건이면(전체 사이트 다운/네트워크 장애) 덮어쓰지 않는다.
  // 무인 일일 작업이 기존 데이터를 통째로 날리는 최악의 경우를 막는다.
  if (allDeals.length === 0) {
    console.error('\n[중단] 크롤 결과가 0건입니다. 기존 deals.json을 유지하고 종료합니다.');
    process.exit(1);
  }

  // 안전장치 2: 이번 실행에서 실제로 데이터를 받아온 브랜드만 교체한다.
  // 크롤러가 0건을 반환한 브랜드(사이트 개편 등으로 파싱 실패)는 기존 데이터를 유지해서,
  // 특정 브랜드 크롤러 하나가 깨져도 그 브랜드가 앱에서 사라지지 않게 한다.
  const brandsWithFreshData = new Set(allDeals.map(d => Object.keys(d.events || {})[0]));
  const kept = existing.filter(d => {
    const brand = Object.keys(d.events || {})[0];
    return !brandsWithFreshData.has(brand);
  });

  const final = [...allDeals, ...kept];
  fs.writeFileSync(DEALS_FILE, JSON.stringify(final, null, 2), 'utf-8');

  const staleCrawled = crawlers.map(c => c.brand).filter(b => !brandsWithFreshData.has(b));
  console.log(`\n신규 수집 브랜드 ${brandsWithFreshData.size}개: ${allDeals.length}건`);
  if (staleCrawled.length) console.log(`크롤 실패로 기존 데이터 유지: ${staleCrawled.join(', ')}`);
  console.log(`기존 유지(미크롤링+실패): ${kept.length}건`);
  console.log(`deals.json 총 ${final.length}건 저장 완료.`);

  // 브랜드별 집계
  const byBrand = {};
  for (const d of final) {
    const b = Object.keys(d.events || {})[0] || '?';
    byBrand[b] = (byBrand[b] || 0) + 1;
  }
  console.log('\n=== 브랜드별 행사 수 ===');
  Object.entries(byBrand).sort((a, b) => b[1] - a[1]).forEach(([b, n]) => console.log(`  ${b.padEnd(12)} ${n}건`));
}

run();
