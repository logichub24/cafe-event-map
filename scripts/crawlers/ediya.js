// 이디야커피 이벤트 크롤러. /contents/event.html 의 board_e 목록을 파싱한다.
const { request, sleep, parseDate, decodeHtml } = require('./_http');

const BASE = 'https://www.ediya.com';
const BRAND = '이디야커피';

async function crawlEdiya({ maxPages = 5 } = {}) {
  const deals = [];
  for (let pg = 1; pg <= maxPages; pg++) {
    const r = await request(`${BASE}/contents/event.html?tb_name=event&page=${pg}`);
    if (r.status !== 200 || !r.body) break;

    const ulIdx = r.body.indexOf('class="board_e"');
    if (ulIdx < 0) break;
    const ulEnd = r.body.indexOf('</ul>', ulIdx);
    const ulHtml = r.body.slice(ulIdx, ulEnd > 0 ? ulEnd : ulIdx + 20000);

    const lis = [...ulHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)];
    if (!lis.length) break;

    let added = 0;
    for (const [, li] of lis) {
      const titleM = li.match(/<dt[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
      const title = titleM ? decodeHtml(titleM[1]).trim() : '';
      if (!title) continue;

      const linkM = li.match(/href="([^"]*tb_name=event[^"]*)"/);
      const link = linkM ? `${BASE}/contents/${linkM[1].replace(/^\/contents\//, '')}` : `${BASE}/contents/event.html`;
      const idxM = li.match(/idx=(\d+)/);
      // 기간 표기: "기간 : 2026년 01월 02일 ~ 2026년 12월 31일"
      const dateM = li.match(/기간\s*:\s*([^<~]+)~\s*([^<]+)/);

      deals.push({
        brand: BRAND,
        id: idxM ? idxM[1] : `${pg}_${added}`,
        title,
        link,
        startDate: dateM ? parseDate(dateM[1].trim()) : '',
        endDate: dateM ? parseDate(dateM[2].trim()) : '',
      });
      added++;
    }
    if (added === 0) break;
    await sleep(300);
  }
  return deals;
}

module.exports = { crawlEdiya };

if (require.main === module) {
  crawlEdiya().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
