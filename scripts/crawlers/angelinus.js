// 엔제리너스 이벤트 크롤러.
// angelinus.com은 403이지만, 롯데GRS 통합몰 lotteeatz.com/event/main 에
// 롯데리아·크리스피크림·엔제리너스 이벤트가 SSR로 함께 실려 있다.
// grid-item의 브랜드 뱃지 텍스트가 '엔제리너스'인 항목만 골라낸다.
const { request, decodeHtml, parseDate } = require('./_http');

const BASE = 'https://www.lotteeatz.com';
const BRAND = '엔제리너스';

async function crawlAngelinus() {
  const deals = [];
  const r = await request(`${BASE}/event/main`);
  if (r.status !== 200 || !r.body) return deals;

  const items = [...r.body.matchAll(/<li class="grid-item">([\s\S]*?)<\/li>/g)];
  const seen = new Set();
  for (const [, it] of items) {
    const badge = (it.match(/badge-\w+">\s*<span class="text">([^<]+)<\/span>/) || [])[1]?.trim();
    if (badge !== BRAND) continue; // 롯데리아·크리스피크림 등 다른 브랜드 제외

    const title = decodeHtml((it.match(/grid-title">\s*([^<]+?)\s*<\/div>/) || [])[1] || '').trim();
    const linkM = it.match(/href="(\/event\/main\/selectEvent\/(\d+))"/);
    if (!title || !linkM) continue;
    const [, path, id] = linkM;
    if (seen.has(id)) continue;
    seen.add(id);

    // 기간: "2026.07.16 ~ 2026.09.30"
    const periodM = (it.match(/grid-period">\s*([^<]+?)\s*<\/div>/) || [])[1] || '';
    const [s, e] = periodM.split('~').map(x => parseDate((x || '').trim()));

    deals.push({
      brand: BRAND,
      id,
      title,
      link: `${BASE}${path}`,
      startDate: s || '',
      endDate: e || '',
    });
  }
  return deals;
}

module.exports = { crawlAngelinus };

if (require.main === module) {
  crawlAngelinus().then(i => { console.log(JSON.stringify(i, null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
