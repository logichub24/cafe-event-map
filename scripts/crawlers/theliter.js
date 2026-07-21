// 더리터 이벤트 크롤러. imweb 게시판 위젯(SSR).
// 구조: <a class="post_link_wrap ..." href="/theliter-event/?...&idx=172135323&t=board">
//         <div class="title title-block"> <em class="notice-block">공지</em><span>..</span> 제목 </div>
// 등록일은 좋아요 버튼 id에 박혀 있다: id="like_btn_p20260701607af..." → 20260701
const { request, decodeHtml } = require('./_http');

const BASE = 'https://the-liter.com';
const BRAND = '더리터';

async function crawlTheLiter() {
  const deals = [];
  const seen = new Set();

  const r = await request(`${BASE}/theliter-event`);
  if (r.status !== 200 || !r.body) return deals;

  // 카드 하나가 시작되는 앵커부터 다음 앵커 직전까지를 항목으로 본다
  const chunks = r.body.split('post_link_wrap').slice(1);
  for (const chunk of chunks) {
    const hrefM = chunk.match(/href="([^"]*idx=(\d+)[^"]*)"/);
    if (!hrefM) continue;
    const [, href, idx] = hrefM;
    if (seen.has(idx)) continue;

    const titleM = chunk.match(/<div class="title title-block">([\s\S]*?)<\/div>/);
    if (!titleM) continue;
    const title = decodeHtml(
      titleM[1]
        // display:none 으로 숨겨둔 '공지' 배지가 텍스트로 섞여 들어오므로 요소째 제거
        .replace(/<em[^>]*display:\s*none[^>]*>[\s\S]*?<\/em>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
    ).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    seen.add(idx);

    // like_btn_p20260701... 에서 등록일 추출
    const dateM = chunk.match(/like_btn_p(\d{8})/);
    const startDate = dateM ? `${dateM[1].slice(0, 4)}-${dateM[1].slice(4, 6)}-${dateM[1].slice(6, 8)}` : '';

    deals.push({
      brand: BRAND,
      id: idx,
      title,
      link: `${BASE}${decodeHtml(href)}`,
      startDate,
      endDate: '',
    });
  }
  return deals;
}

module.exports = { crawlTheLiter };

if (require.main === module) {
  crawlTheLiter().then(i => { console.log(JSON.stringify(i.slice(0, 5), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
