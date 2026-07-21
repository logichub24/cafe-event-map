// 커피빈 프로모션 크롤러. category=1(프로모션), 2(프로모션 드링크).
// 진행 중 프로모션이 없으면 "등록된 [PROMOTION]이 없습니다"가 뜨며 0건이 정상이다.
const { request, sleep, decodeHtml } = require('./_http');

const BASE = 'https://www.coffeebeankorea.com';
const BRAND = '커피빈';

async function crawlCoffeeBean() {
  const deals = [];
  for (const cat of [1, 2]) {
    const r = await request(`${BASE}/promotion/list.asp?category=${cat}`);
    if (r.status !== 200 || !r.body) continue;

    const listIdx = r.body.indexOf('promotion_list');
    if (listIdx < 0) continue;
    const listHtml = r.body.slice(listIdx, listIdx + 5000);
    // 진행 중 프로모션 없음 → 정상적인 0건
    if (listHtml.includes('등록된') && listHtml.includes('없습니다')) continue;

    const items = [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].filter(m => m[1].includes('href'));
    for (const [, li] of items) {
      const linkM = li.match(/href="([^"]*promotion[^"]*)"/);
      if (!linkM) continue;
      const titleM = li.match(/<(?:h\d|strong|p)[^>]*>([^<]{5,})<\/(?:h\d|strong|p)>/);
      const title = titleM ? decodeHtml(titleM[1]).trim() : '';
      if (!title || title.includes('PROMOTION')) continue;

      const href = linkM[1].startsWith('http') ? linkM[1] : `${BASE}${linkM[1]}`;
      const idM = href.match(/idx=(\d+)|\/(\d+)$/);
      deals.push({
        brand: BRAND,
        id: `${cat}_${idM?.[1] || idM?.[2] || title.slice(0, 8)}`,
        title,
        link: href,
        startDate: '',
        endDate: '',
      });
    }
    await sleep(300);
  }
  return deals;
}

module.exports = { crawlCoffeeBean };

if (require.main === module) {
  crawlCoffeeBean().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
