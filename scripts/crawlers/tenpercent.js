// 텐퍼센트커피 이벤트 크롤러. 그누보드 게시판(bo_table=event2).
// 구조: <td class="td_subject"><div class="bo_tit"><a href="...wr_id=46">제목</a></div></td>
//       <td class="td_datetime">2026-07-21</td>
const { request, decodeHtml, parseDate, parsePeriodFromText } = require('./_http');

const BASE = 'https://tenpercentcoffee.com';
const BRAND = '텐퍼센트커피';

async function crawlTenPercent() {
  const deals = [];
  const seen = new Set();

  const r = await request(`${BASE}/bbs/board.php?bo_table=event2`);
  if (r.status !== 200 || !r.body) return deals;

  const rows = [...r.body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  for (const [, row] of rows) {
    const m = row.match(/<div class="bo_tit">\s*<a[^>]+href="([^"]*wr_id=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!m) continue;
    const [, href, wrId, rawTitle] = m;
    // 제목 안에 <img class="title_icon"> 등이 섞여 들어오므로 태그를 걷어낸다
    const title = decodeHtml(rawTitle.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(wrId)) continue;
    seen.add(wrId);

    const dateM = row.match(/<td class="td_datetime">\s*([\d-]+)\s*<\/td>/);
    const period = parsePeriodFromText(title);

    deals.push({
      brand: BRAND,
      id: wrId,
      title,
      link: decodeHtml(href),
      startDate: period.startDate || parseDate(dateM ? dateM[1] : ''),
      endDate: period.endDate || '',
    });
  }
  return deals;
}

module.exports = { crawlTenPercent };

if (require.main === module) {
  crawlTenPercent().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
