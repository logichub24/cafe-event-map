// 컴포즈커피 이벤트 크롤러. /event 목록의 doc_link 앵커를 파싱한다.
// 주의: 이 사이트는 GitHub Actions 등 데이터센터 IP에서 0건을 반환한다(국내 IP에서는 정상).
const { request, sleep, parseDate, decodeHtml } = require('./_http');

const BASE = 'https://composecoffee.com';
const BRAND = '컴포즈커피';

async function crawlCompose({ maxPages = 5 } = {}) {
  const deals = [];
  for (let pg = 1; pg <= maxPages; pg++) {
    const r = await request(`${BASE}/event?page=${pg}`);
    if (r.status !== 200 || !r.body) break;

    const links = [...r.body.matchAll(
      /<a[^>]+href="(https?:\/\/composecoffee\.com\/event\/(\d+))"[^>]*class="doc_link"[^>]*>([\s\S]{0,600}?)<\/a>/g
    )];
    if (!links.length) break;

    let added = 0;
    for (const [, href, eventId, inner] of links) {
      const titleM = inner.match(/class="doc_title">([^<]+)<\/div>/);
      const title = titleM ? decodeHtml(titleM[1]).trim() : '';
      if (!title) continue;
      const dateM = inner.match(/class="regdate">([^<]+)<\/span>/);
      deals.push({
        brand: BRAND,
        id: eventId,
        title,
        link: href,
        startDate: dateM ? parseDate(dateM[1].trim()) : '',
        endDate: '',
      });
      added++;
    }
    if (added === 0) break;
    await sleep(300);
  }
  return deals;
}

module.exports = { crawlCompose };

if (require.main === module) {
  crawlCompose().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
