// 브랜드 크롤러 공용 HTTP 헬퍼. 리다이렉트/타임아웃/인코딩을 한 곳에서 처리한다.
const https = require('https');
const http = require('http');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// 차단이 감지된 URL을 쌓아둔다. runAll이 브랜드별로 앞뒤를 비교해
// "차단당해서 0건"과 "정상 응답인데 진행 중 행사가 없어서 0건"을 구분한다.
// 후자는 커피빈처럼 정상 상태라 매번 경고하면 경고가 무뎌진다.
const blockedUrls = [];

/**
 * 상태코드는 200인데 본문이 차단/에러 페이지인 경우를 잡는다.
 * 텐퍼센트는 사이트 전체가 이 형태다(HTTP 200 + 본문 "403 Forbidden", 215바이트).
 * 정상 페이지가 실수로 걸리지 않도록 "아주 짧으면서" 차단 문구가 있는 경우만 본다.
 */
function looksBlocked(body) {
  if (!body || body.length > 1500) return false;
  return /403 Forbidden|Access Denied|You don't have permission|Attention Required|cf-error/i.test(body);
}

/**
 * GET 요청. 실패해도 예외를 던지지 않고 {status, body, blocked}를 돌려준다.
 * 크롤러 하나가 죽어도 전체 수집이 멈추지 않게 하기 위함.
 */
function request(url, opts = {}, redirectCount = 0) {
  return new Promise(resolve => {
    if (redirectCount > 5) return resolve({ status: 'loop', body: '' });
    const mod = url.startsWith('https') ? https : http;
    const reqOpts = {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        ...opts.headers,
      },
      rejectUnauthorized: false,
      timeout: opts.timeout || 15000,
    };
    // 일부 서버(하삼동 등)는 구식 DH 키를 써서 기본 보안 수준으로는 핸드셰이크가 실패한다.
    if (opts.legacy) reqOpts.ciphers = 'DEFAULT:@SECLEVEL=0';
    const req = mod.get(url, reqOpts, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return request(loc, opts, redirectCount + 1).then(resolve);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      // 청크 경계에서 한글이 깨지지 않도록 Buffer로 모은 뒤 한 번에 디코딩
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        // 일부 서버는 차단해놓고 상태코드를 200으로 준다(텐퍼센트: 본문만 403 Forbidden).
        // 크롤러가 status만 보면 통과시켜 "0건"으로 조용히 넘어가므로 여기서 잡아 알린다.
        const blocked = looksBlocked(body);
        if (blocked) {
          blockedUrls.push(url);
          console.warn(`\n    [차단 감지] ${url}\n      HTTP ${res.statusCode}이지만 본문이 차단 페이지입니다(${body.length}바이트).`);
        }
        resolve({ status: res.statusCode, body, blocked });
      });
    });
    req.on('error', e => resolve({ status: 'error', body: '', msg: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', body: '' }); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function decodeHtml(str) {
  return (str || '')
    // 숫자 엔티티(&#038; &#8216; 등)를 먼저 문자로 되돌린다.
    // 워드프레스 기반 사이트(빽다방 등)가 따옴표·앰퍼샌드를 이 형태로 내보낸다.
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&hellip;/g, '…').replace(/&middot;/g, '·');
}

/** 다양한 한국어 날짜 표기를 YYYY-MM-DD로 정규화. 못 읽으면 '' */
function parseDate(str) {
  if (!str) return '';
  const m1 = String(str).match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  const m2 = String(str).match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  return '';
}

/** 제목에 흔히 박히는 기간 표기에서 시작~종료일을 추출 (예: "7/1~7/31", "2026.07.01~07.31") */
function parsePeriodFromText(text) {
  if (!text) return { startDate: '', endDate: '' };
  const full = String(text).match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})\s*[~\-–]\s*(?:(\d{4})[-./])?(\d{1,2})[-./](\d{1,2})/);
  if (full) {
    const y1 = full[1];
    const y2 = full[4] || y1;
    return {
      startDate: `${y1}-${full[2].padStart(2, '0')}-${full[3].padStart(2, '0')}`,
      endDate: `${y2}-${full[5].padStart(2, '0')}-${full[6].padStart(2, '0')}`,
    };
  }
  return { startDate: '', endDate: '' };
}

module.exports = { request, sleep, decodeHtml, parseDate, parsePeriodFromText, looksBlocked, blockedUrls, UA };
