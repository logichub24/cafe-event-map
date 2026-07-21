// 메가MGC커피 이벤트 크롤러.
// 게시판 구조: /bbs/?bbs_category=3 (3=이벤트, 1=공지사항, 4=FAQ, 7=창업뉴스)
// 목록에 날짜가 없어 기간은 제목에 적힌 경우만 추출한다.
const { request, sleep, decodeHtml, parsePeriodFromText } = require('./_http');

const BASE = 'https://www.mega-mgccoffee.com';
const BRAND = '메가MGC커피';

async function crawlMega({ maxPages = 3 } = {}) {
  const deals = [];
  const seen = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const r = await request(`${BASE}/bbs/?bbs_category=3&bbs_page=${page}`);
    if (r.status !== 200 || !r.body) break;

    // 항목 단위: <a href="detail/?BASE64"> ... </a>
    const items = [...r.body.matchAll(/<a\s+href="detail\/\?([^"]+)"\s*>([\s\S]*?)<\/a>/g)];
    if (!items.length) break;

    let added = 0;
    for (const [, token, inner] of items) {
      // 제목은 cont_text_title 블록 안의 가장 안쪽 텍스트에 있다.
      // (cont_text_info 안에도 같은 class가 있어 작성자명이 섞이므로 반드시 title 블록으로 좁힌다)
      const titleBlock = inner.match(/cont_text_title([\s\S]*?)cont_text_info/);
      const scope = titleBlock ? titleBlock[1] : inner;
      const texts = [...scope.matchAll(/<div class="text text1">\s*([^<]{4,200}?)\s*<\/div>/g)]
        .map(m => decodeHtml(m[1]).trim())
        .filter(Boolean);
      const title = texts[texts.length - 1] || '';
      if (!title || title === BRAND) continue;

      // 링크 토큰(base64)에서 게시글 번호 추출 → 안정적인 id
      let id = token;
      try {
        const decoded = Buffer.from(decodeURIComponent(token), 'base64').toString('utf-8');
        const m = decoded.match(/bbs_idx=(\d+)/);
        if (m) id = m[1];
      } catch (e) { /* 토큰 그대로 사용 */ }

      if (seen.has(id)) continue;
      seen.add(id);

      const { startDate, endDate } = parsePeriodFromText(title);
      deals.push({
        brand: BRAND,
        id: String(id),
        title,
        link: `${BASE}/bbs/detail/?${token}`,
        startDate,
        endDate,
      });
      added++;
    }
    if (added === 0) break;
    await sleep(350);
  }
  return deals;
}

module.exports = { crawlMega };

if (require.main === module) {
  crawlMega().then(items => {
    console.log(JSON.stringify(items.slice(0, 5), null, 2));
    console.error(`메가MGC커피: ${items.length}건 수집`);
  });
}
