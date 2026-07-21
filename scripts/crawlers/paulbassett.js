// 폴 바셋 이벤트 크롤러.
// paulbassett.co.kr(DNS 실패)이 아니라 baristapaulbassett.co.kr 이 실서비스 도메인.
// /whatsNews/event/List.pb?type=1(새소식) / type=2(매장 이벤트)를 파싱한다.
// 기간은 주석 처리돼 있지만 소스에 남아 있다: <!-- <span class="date">26.07.16 ~ 26.07.23</span> -->
const { request, sleep, decodeHtml } = require('./_http');

const BASE = 'https://www.baristapaulbassett.co.kr';
const BRAND = '폴 바셋';

// "26.07.16" (YY.MM.DD) → "2026-07-16"
function parseShortDate(str) {
  const m = (str || '').match(/(\d{2})\.(\d{1,2})\.(\d{1,2})/);
  if (!m) return '';
  return `20${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

async function crawlPaulBassett() {
  const deals = [];
  const seen = new Set();

  for (const type of [1, 2]) {
    const r = await request(`${BASE}/whatsNews/event/List.pb?type=${type}`);
    if (r.status !== 200 || !r.body) continue;

    const items = [...r.body.matchAll(/<li><a href="\/whatsNews\/event\/View\.pb\?eventSeq=(\d+)">([\s\S]*?)<\/a><\/li>/g)];
    for (const [, seq, inner] of items) {
      if (seen.has(seq)) continue;
      const title = decodeHtml((inner.match(/<strong>([^<]+)<\/strong>/) || [])[1] || '').trim();
      if (!title) continue;
      seen.add(seq);

      // 주석 안의 날짜: <!-- <span class="date">26.07.16 ~ 26.07.23</span> -->
      const dateM = inner.match(/class="date">([^<]+)<\/span>/);
      const [s, e] = (dateM ? dateM[1] : '').split('~').map(x => parseShortDate(x));

      deals.push({
        brand: BRAND,
        id: seq,
        title,
        link: `${BASE}/whatsNews/event/View.pb?eventSeq=${seq}`,
        startDate: s || '',
        endDate: e || '',
      });
    }
    await sleep(300);
  }
  return deals;
}

module.exports = { crawlPaulBassett };

if (require.main === module) {
  crawlPaulBassett().then(i => { console.log(JSON.stringify(i.slice(0, 4), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
