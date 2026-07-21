// 탐앤탐스 이벤트 크롤러.
// 사이트는 SPA라 HTML 크롤이 안 되지만, 앱 번들이 쓰는 JSON API가 열려 있다.
//   GET /api/v1/post/event?page=N → {data:{elements:[{id,isActive,title,startDate,endDate}]}, meta:{hasNextPage}}
// isActive=true인 진행 중 이벤트만 담는다(종료분은 227건이나 있어 노이즈).
const { request, sleep } = require('./_http');

const BASE = 'https://www.tomntoms.com';
const BRAND = '탐앤탐스';

async function crawlTomntoms({ maxPages = 3 } = {}) {
  const deals = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const r = await request(`${BASE}/api/v1/post/event?page=${page}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (r.status !== 200) break;
    let data;
    try { data = JSON.parse(r.body); } catch (e) { break; }
    const elements = data?.data?.elements || [];
    if (!elements.length) break;

    for (const el of elements) {
      if (!el.isActive || !el.title || seen.has(el.id)) continue;
      seen.add(el.id);
      deals.push({
        brand: BRAND,
        id: String(el.id),
        title: String(el.title).trim(),
        link: `${BASE}/event/${el.id}`,
        startDate: el.startDate || '',
        endDate: el.endDate || '',
      });
    }
    if (!data?.meta?.hasNextPage) break;
    await sleep(300);
  }
  return deals;
}

module.exports = { crawlTomntoms };

if (require.main === module) {
  crawlTomntoms().then(i => { console.log(JSON.stringify(i, null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
