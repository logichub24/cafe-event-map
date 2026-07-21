// 공차 이벤트 크롤러.
// 구조: <div class="event-text">...<p class="t1">제목</p><p class="t2">2026.07.13(월) ~ 2026.07.17(금)</p>
// 상세 링크가 javascript:void(0)라 개별 URL이 없다 → 공식 이벤트 목록 페이지를 출처로 쓴다.
// 종료 항목에는 <span class="finish">종료</span>가 붙는다.
const { request, decodeHtml, parseDate } = require('./_http');

const BASE = 'https://www.gong-cha.co.kr';
const LIST_URL = `${BASE}/brand/content/eventlist?scroll=y`;
const BRAND = '공차';

async function crawlGongcha() {
  const deals = [];
  const seen = new Set();

  const r = await request(LIST_URL);
  if (r.status !== 200 || !r.body) return deals;

  // 목록 항목 단위로 자른다(<li> 안에 event-text 블록이 들어 있음)
  const items = [...r.body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
  for (const [, it] of items) {
    const titleM = it.match(/<p class="t1">\s*([\s\S]*?)\s*<\/p>/);
    if (!titleM) continue;
    const title = decodeHtml(titleM[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);

    // "2026.07.13(월) ~ 2026.07.17(금)"
    const periodM = it.match(/<p class="t2">\s*([\s\S]*?)\s*<\/p>/);
    const [s, e] = (periodM ? periodM[1] : '').split('~').map(x => parseDate(x));

    deals.push({
      brand: BRAND,
      // 개별 URL이 없어 제목 기반 안정 id를 만든다
      id: Buffer.from(title).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16),
      title,
      link: LIST_URL,
      startDate: s || '',
      endDate: e || '',
    });
  }
  return deals;
}

module.exports = { crawlGongcha };

if (require.main === module) {
  crawlGongcha().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
