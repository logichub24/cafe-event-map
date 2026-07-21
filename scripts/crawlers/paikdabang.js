// 빽다방 이벤트 크롤러.
// 소식 게시판 테이블 구조: /news/?cate=event
//   <tr><td class="num">27</td><td class="subject">이벤트</td>
//       <td class="tit"><a href="...post_news/...">제목</a></td><td class="date">2026-06-11</td>...
// 이 사이트는 빈 응답(0B)을 간헐적으로 주기 때문에 재시도가 필요하다.
const { request, sleep, decodeHtml, parseDate, parsePeriodFromText } = require('./_http');

const BASE = 'https://www.paikdabang.com';
const BRAND = '빽다방';

async function fetchWithRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await request(url);
    if (r.status === 200 && r.body && r.body.length > 5000) return r;
    await sleep(1500);
  }
  return { status: 'empty', body: '' };
}

async function crawlPaikdabang() {
  const deals = [];
  const seen = new Set();

  // 이벤트 탭만 수집(소식/공지 제외)
  const r = await fetchWithRetry(`${BASE}/news/?cate=event`);
  if (!r.body) return deals;

  const rows = [...r.body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  for (const [, row] of rows) {
    const linkM = row.match(/<td class="tit">\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkM) continue;
    const link = linkM[1];
    const title = decodeHtml(linkM[2]).replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const dateM = row.match(/<td class="date">\s*([^<]+)\s*<\/td>/);
    const numM = row.match(/<td class="num">\s*(\d+)\s*<\/td>/);

    // 글 주소 슬러그가 길고 인코딩돼 있어 번호를 id로 쓴다
    const id = numM ? numM[1] : title.slice(0, 12);
    if (seen.has(id)) continue;
    seen.add(id);

    // 제목에 기간이 적힌 경우가 많다: "…안내(6.12~6.21)"
    const period = parsePeriodFromText(title);
    deals.push({
      brand: BRAND,
      id: String(id),
      title,
      link,
      startDate: period.startDate || parseDate(dateM ? dateM[1].trim() : ''),
      endDate: period.endDate || '',
    });
  }
  return deals;
}

module.exports = { crawlPaikdabang };

if (require.main === module) {
  crawlPaikdabang().then(i => { console.log(JSON.stringify(i.slice(0, 4), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
