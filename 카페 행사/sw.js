// 배포할 때마다 올린다. activate가 이 이름과 다른 캐시만 지우므로,
// 안 올리면 앱 코드(index.html/ads.js) 업데이트가 기존 사용자에게 영영 가지 않는다.
const CACHE = 'cafe-v2';

// build-toss.js가 1_1.html을 index.html로 복사한다. 예전에는 여기가 './1_1.html'이라
// 배포본에 없는 파일을 요구했고, cross-origin CDN까지 섞여 있어 addAll이 통째로 거부됐다.
// 그 결과 install이 실패해 서비스워커가 한 번도 설치된 적이 없었다(알림 기능까지 같이 죽어 있었다).
// 외부 CDN은 여기 넣지 않는다 — 런타임 fetch 핸들러가 알아서 캐싱한다.
const PRECACHE = [
  './',
  './index.html',
  './ads.js',
];

self.addEventListener('install', e => {
  // addAll은 하나만 실패해도 전체를 거부한다. 파일명이 또 어긋나도 서비스워커가
  // 통째로 죽지 않도록 개별 요청으로 넣고 실패는 무시한다.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── 알림 스케줄 관리 ────────────────────────────────────────────────
// 앱에서 SCHEDULE_NOTIFICATIONS 메시지로 스케줄 목록을 전달받아
// 해당 요일·시각에 로컬 푸시 알림을 발송한다 (백엔드 불필요).
let notifSchedules = [];
let notifTimerId = null;

self.addEventListener('message', e => {
  if (e.data?.type !== 'SCHEDULE_NOTIFICATIONS') return;
  notifSchedules = e.data.schedules || [];
  rescheduleNotifTimer();
});

function msUntilDayHour(dow, hour, minute, from) {
  const d = new Date(from);
  d.setHours(hour, minute, 0, 0);
  let diff = (dow - from.getDay() + 7) % 7;
  if (diff === 0 && d <= from) diff = 7;
  d.setDate(d.getDate() + diff);
  return d - from;
}

function rescheduleNotifTimer() {
  if (notifTimerId) { clearTimeout(notifTimerId); notifTimerId = null; }
  if (notifSchedules.length === 0) return;
  const now = new Date();
  let nearest = Infinity;
  notifSchedules.forEach(s => {
    const ms = msUntilDayHour(s.dayOfWeek, s.hour, s.minute, now);
    if (ms < nearest) nearest = ms;
  });
  const delay = Math.min(nearest, 24 * 60 * 60 * 1000);
  notifTimerId = setTimeout(fireScheduledNotifs, delay);
}

function fireScheduledNotifs() {
  const now = new Date();
  notifSchedules.forEach(s => {
    // 5분 이내 타이밍이면 발송
    if (msUntilDayHour(s.dayOfWeek, s.hour, s.minute, now) < 5 * 60 * 1000) {
      self.registration.showNotification(s.title, {
        body: s.body,
        icon: './icon-192.png',
        badge: './icon-32.png',
        tag: s.type,
      });
    }
  });
  rescheduleNotifTimer();
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 매일 갱신되는 데이터는 네트워크 우선 → 실패 시 캐시 폴백.
  // brands.json도 여기 포함한다. 캐시 우선으로 두면 브랜드를 추가해도 반영되지 않는다.
  if (url.pathname.includes('deals.json') || url.pathname.includes('brands.json') || url.pathname.includes('/stores/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 나머지는 캐시 우선 → 없으면 네트워크
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
