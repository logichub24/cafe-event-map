// 매머드커피 크롤러.
// 이벤트 전용 페이지(/sub/event/list.html)는 목록이 비어 있어 공지 게시판을 쓴다.
// 행 구조: <tr class='notice'><td><span>NOTICE</span></td>
//          <td><a href='javascript:goView(121);'>제목</a></td><td>2026-07-09</td><td>33</td></tr>
const { request, decodeHtml, parseDate, parsePeriodFromText } = require('./_http');

const BASE = 'https://mmthcoffee.com';
const BRAND = '매머드커피';

async function crawlMammoth() {
  const deals = [];
  const seen = new Set();

  const r = await request(`${BASE}/sub/notice/list.html`);
  if (r.status !== 200 || !r.body) return deals;

  const rows = [...r.body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  for (const [, row] of rows) {
    // 상세 이동이 javascript:goView(N) 형태 → view.html?noticeSeq=N 으로 변환
    const m = row.match(/<a[^>]+href='javascript:goView\((\d+)\);'>([\s\S]*?)<\/a>/);
    if (!m) continue;
    const [, seq, rawTitle] = m;
    const title = decodeHtml(rawTitle).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(seq)) continue;
    seen.add(seq);

    // 제목 다음 <td>가 등록일
    const dateM = row.match(/<\/a>\s*<\/td>\s*<td>\s*([\d.\-]+)\s*<\/td>/);
    const period = parsePeriodFromText(title);

    deals.push({
      brand: BRAND,
      id: seq,
      title,
      link: `${BASE}/sub/notice/view.html?noticeSeq=${seq}`,
      startDate: period.startDate || parseDate(dateM ? dateM[1] : ''),
      endDate: period.endDate || '',
    });
  }
  return deals;
}

module.exports = { crawlMammoth };

if (require.main === module) {
  crawlMammoth().then(i => { console.log(JSON.stringify(i.slice(0, 4), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
