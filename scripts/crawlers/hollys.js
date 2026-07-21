// 할리스 이벤트 크롤러. /news/event/list.do 목록을 파싱한다.
// 목록 마크업이 불규칙해 onDetail(idx)·제목·날짜를 각각 뽑아 순서로 맞춘다.
const { request, parseDate, decodeHtml } = require('./_http');

const BASE = 'https://www.hollys.co.kr';
const BRAND = '할리스';

async function crawlHollys() {
  const deals = [];
  const r = await request(`${BASE}/news/event/list.do`);
  if (r.status !== 200 || !r.body) return deals;
  const body = r.body;

  const idxMatches = [...body.matchAll(/onDetail\((\d+)\)/g)];
  const titleMatches = [...body.matchAll(/<span[^>]*><span class="sort">[^<]+<\/span>([^<]+)<\/span>/g)];
  const dateMatches = [...body.matchAll(/<dd class="event_date"><span>[^<]+<\/span>([^<]+)<\/dd>/g)];

  const seen = new Set();
  for (const [, idx] of idxMatches) {
    if (seen.has(idx)) continue;
    const pos = seen.size; // 중복 제거 후 순번 = 제목/날짜 배열 인덱스
    seen.add(idx);

    const title = decodeHtml(titleMatches[pos]?.[1] || '').trim();
    if (!title) continue;

    const dateStr = (dateMatches[pos]?.[1] || '').trim();
    const [s, e] = dateStr.split('~').map(x => parseDate(x.trim()));

    deals.push({
      brand: BRAND,
      id: idx,
      title,
      link: `${BASE}/news/event/view.do?idx=${idx}`,
      startDate: s || '',
      endDate: e || '',
    });
  }
  return deals;
}

module.exports = { crawlHollys };

if (require.main === module) {
  crawlHollys().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
