// 더벤티 이벤트 크롤러.
// 구조: <li class="item"><a href="/new2022/news/event.html?bmain=view&uid=292&mode=">
//         <div class="img_box">...<span class="end">마감</span></div>
//         <div class="txt_box"><p class="tit">제목</p>
//           <p class="date"><span>이벤트기간 : </span>2026-07-20 ~ 2026-07-31</p>
// 마감 배지가 붙은 항목도 종료일이 있으므로 그대로 담고 daysLeft 계산에 맡긴다.
const { request, decodeHtml, parseDate } = require('./_http');

const BASE = 'https://www.theventi.co.kr';
const BRAND = '더벤티';

async function crawlTheVenti() {
  const deals = [];
  const seen = new Set();

  const r = await request(`${BASE}/new2022/news/event.html`);
  if (r.status !== 200 || !r.body) return deals;

  const items = [...r.body.matchAll(/<li class="item">([\s\S]*?)<\/li>/g)];
  for (const [, it] of items) {
    const linkM = it.match(/href="([^"]*bmain=view&(?:amp;)?uid=(\d+)[^"]*)"/);
    const titleM = it.match(/<p class="tit">([\s\S]*?)<\/p>/);
    if (!linkM || !titleM) continue;
    const [, href, uid] = linkM;
    const title = decodeHtml(titleM[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(uid)) continue;
    seen.add(uid);

    // "이벤트기간 : 2026-07-20 ~ 2026-07-31"
    const dateM = it.match(/<p class="date">([\s\S]*?)<\/p>/);
    const dateTxt = dateM ? dateM[1].replace(/<[^>]+>/g, ' ') : '';
    const [s, e] = dateTxt.split('~').map(x => parseDate(x));

    deals.push({
      brand: BRAND,
      id: uid,
      title,
      link: `${BASE}${decodeHtml(href)}`,
      startDate: s || '',
      endDate: e || '',
    });
  }
  return deals;
}

module.exports = { crawlTheVenti };

if (require.main === module) {
  crawlTheVenti().then(i => { console.log(JSON.stringify(i.slice(0, 3), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
