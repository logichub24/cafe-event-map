// 빽다방 /news/ 페이지 구조 + 투썸 전체 링크 목록
const https = require('https');
const http = require('http');

function fetch(url, opts = {}, redirectCount = 0) {
  return new Promise(resolve => {
    if (redirectCount > 5) return resolve({ status: 'loop', body: '' });
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        ...opts.headers,
      },
      rejectUnauthorized: false,
      timeout: 12000,
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
        res.resume();
        return fetch(loc, opts, redirectCount + 1).then(resolve);
      }
      const ch = []; res.on('data', c => ch.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(ch).toString('utf-8'), ct: res.headers['content-type'] || '' }));
    });
    req.on('error', e => resolve({ status: 'error', body: '', msg: e.message }));
    req.on('timeout', function () { this.destroy(); resolve({ status: 'timeout', body: '' }); });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // 빽다방 /news/
  console.log('=== 빽다방 /news/ ===');
  const news = await fetch('https://paikdabang.com/news/');
  console.log(`[${news.status}] len=${news.body.length}`);
  // article/list 패턴
  const arts = [...news.body.matchAll(/<(?:article|li)[^>]*class="[^"]*(?:post|item|news)[^"]*"[^>]*>([\s\S]{0,600}?)<\/(?:article|li)>/g)].slice(0, 3);
  arts.forEach((m, i) => console.log(`item[${i}]: ${m[0].slice(0, 400).replace(/\s+/g, ' ')}`));
  if (!arts.length) {
    // 이벤트 제목 패턴 찾기
    const h = [...news.body.matchAll(/<h\d[^>]*>([\s\S]{0,150}?)<\/h\d>/g)].slice(0, 10);
    h.forEach((m, i) => console.log(`h[${i}]: ${m[0].replace(/\s+/g, ' ')}`));
    // 어떤 링크가 있는지
    const links = [...new Set([...news.body.matchAll(/href="(https?:\/\/paikdabang\.com\/[^"]*)"/g)].map(m => m[1]))].filter(u => !u.includes('wp-content') && !u.includes('wp-includes') && !u.includes('wp-json'));
    console.log('내부 링크:', links.slice(0, 25));
  }

  // 빽다방 oembed에서 발견한 post_topbanner 타입 목록 시도
  console.log('\n=== 빽다방 post_topbanner ===');
  const tb = await fetch('https://www.paikdabang.com/wp-json/wp/v2/post_topbanner?per_page=5');
  console.log(`[${tb.status}] ${tb.ct}`);
  if (tb.ct.includes('json')) console.log(tb.body.slice(0, 300));

  // 투썸 — 전체 .do 링크
  console.log('\n=== 투썸 전체 .do 링크 ===');
  const two = await fetch('https://www.twosome.co.kr/main.do');
  const allDo = [...new Set([...two.body.matchAll(/["'((?:href=")]([\/a-zA-Z0-9_]+\.do)/g)].map(m => m[1]))];
  console.log(allDo);
}
main();
