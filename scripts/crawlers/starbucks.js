// 스타벅스 이벤트 크롤러. 공식 What's New JSON API를 사용한다.
const { request, sleep, parseDate } = require('./_http');

const BASE = 'https://www.starbucks.co.kr';
const BRAND = '스타벅스';

async function crawlStarbucks({ maxPages = 5 } = {}) {
  const deals = [];
  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
    const r = await request(`${BASE}/whats_new/newsListAjax.do?cateType=&pageIndex=${pageIndex}&recordCountPerPage=10`);
    if (r.status !== 200) break;
    let data;
    try { data = JSON.parse(r.body); } catch (e) { break; }
    const list = data.list || [];
    if (!list.length) break;
    for (const item of list) {
      const title = (item.title || '').trim();
      if (!title) continue;
      deals.push({
        brand: BRAND,
        id: String(item.seq),
        title,
        link: `${BASE}/whats_new/newsView.do?seq=${item.seq}`,
        startDate: parseDate(item.start_dt || item.news_dt || item.reg_dt),
        endDate: parseDate(item.end_dt || ''),
      });
    }
    if (list.length < 10) break;
    await sleep(200);
  }
  return deals;
}

module.exports = { crawlStarbucks };

if (require.main === module) {
  crawlStarbucks().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
