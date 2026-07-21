// 브랜드 크롤러 공용 HTTP 헬퍼. 리다이렉트/타임아웃/인코딩을 한 곳에서 처리한다.
const https = require('https');
const http = require('http');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * GET 요청. 실패해도 예외를 던지지 않고 {status, body}를 돌려준다.
 * 크롤러 하나가 죽어도 전체 수집이 멈추지 않게 하기 위함.
 */
function request(url, opts = {}, redirectCount = 0) {
  return new Promise(resolve => {
    if (redirectCount > 5) return resolve({ status: 'loop', body: '' });
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        ...opts.headers,
      },
      rejectUnauthorized: false,
      timeout: opts.timeout || 15000,
    }, res => {
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
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', e => resolve({ status: 'error', body: '', msg: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', body: '' }); });
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function decodeHtml(str) {
  return (str || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
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

module.exports = { request, sleep, decodeHtml, parseDate, parsePeriodFromText, UA };
