// 하삼동커피 크롤러.
// notice.php는 껍데기만 주고 목록은 BullListBtnAjax가 notice_list_ajax.php로 불러온다.
// 구조: <a href="#" class="tit btnView" seq="4150"> 제목</a> ... <td>2026.06.25</td>
// 상세도 JS(notice_view.php + seq)라 개별 링크가 없어 목록 페이지를 출처로 쓴다.
// 이 서버는 구식 DH 키를 써서 기본 TLS 설정으로는 핸드셰이크가 실패한다 → legacy 옵션 필요.
const { request, decodeHtml, parseDate } = require('./_http');

const BASE = 'https://www.hasamdongcoffee.com';
const LIST_URL = `${BASE}/notice.php`;
const BRAND = '하삼동커피';

async function crawlHasamdong() {
  const deals = [];
  const seen = new Set();

  const r = await request(`${BASE}/notice_list_ajax.php?page=1&sc_bdmstr_seq=1`, {
    legacy: true,
    headers: { 'Referer': LIST_URL, 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (r.status !== 200 || !r.body) return deals;

  const rows = [...r.body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  for (const [, row] of rows) {
    const m = row.match(/<a[^>]+class="tit btnView"[^>]*seq="(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!m) continue;
    const [, seq, rawTitle] = m;
    const title = decodeHtml(rawTitle.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(seq)) continue;
    seen.add(seq);

    // 제목 셀 다음의 날짜 셀: <td>2026.06.25</td>
    const dateM = row.match(/<td>\s*(\d{4}\.\d{2}\.\d{2})\s*<\/td>/);

    deals.push({
      brand: BRAND,
      id: seq,
      title,
      link: LIST_URL,
      startDate: parseDate(dateM ? dateM[1] : ''),
      endDate: '',
    });
  }
  return deals;
}

module.exports = { crawlHasamdong };

if (require.main === module) {
  crawlHasamdong().then(i => { console.log(JSON.stringify(i.slice(0, 4), null, 2)); console.error(`${BRAND}: ${i.length}건`); });
}
