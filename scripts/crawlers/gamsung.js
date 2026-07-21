// 감성커피 이벤트 크롤러. 도메인이 한글(퓨니코드): www.xn--439as41bv4jv9f.com
// 구조: <li class="on"><a href="/board/index.php?board=event_01&type=view&...idx=107">
//         <p class="list_title ellipsis">제목</p> ... <p class="d_day">상시</p>
// 목록에 시작/종료일이 없고 'D-n' 또는 '상시'만 있어 기간은 비워 둔다.
const { request, decodeHtml } = require('./_http');

const BASE = 'https://www.xn--439as41bv4jv9f.com';
const BRAND = '감성커피';

async function crawlGamsung() {
  const deals = [];
  const seen = new Set();

  const r = await request(`${BASE}/board/index.php?board=event_01`);
  if (r.status !== 200 || !r.body) return deals;

  const items = [...r.body.matchAll(/<li class="on">([\s\S]*?)<\/li>/g)];
  for (const [, it] of items) {
    const linkM = it.match(/href="([^"]*idx=(\d+)[^"]*)"/);
    const titleM = it.match(/<p class="list_title[^"]*">([\s\S]*?)<\/p>/);
    if (!linkM || !titleM) continue;
    const [, href, idx] = linkM;
    const title = decodeHtml(titleM[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(idx)) continue;
    seen.add(idx);

    deals.push({
      brand: BRAND,
      id: idx,
      title,
      link: `${BASE}${decodeHtml(href)}`,
      startDate: '',
      endDate: '',
    });
  }
  return deals;
}

module.exports = { crawlGamsung };

if (require.main === module) {
  crawlGamsung().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
