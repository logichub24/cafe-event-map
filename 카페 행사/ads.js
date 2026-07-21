// 토스인앱(Apps in Toss) 광고 SDK 연동.
// 일반 브라우저(GitHub Pages 등)에서는 isSupported()가 false라 전부 조용히 no-op되고,
// 토스 앱 WebView 안에서 열렸을 때만 실제 광고가 붙는다.
import { TossAds, loadFullScreenAd, showFullScreenAd, share, getCurrentLocation, Accuracy } from '@apps-in-toss/web-bridge';

const AD_CONFIG = {
  banner:       'ait.v2.live.6ee2e927b62c4a18',
  interstitial: 'ait.v2.live.de853f34f3674829',
  rewarded:     'ait.v2.live.a1d0d9ff00454a96',
};

// ── 전면광고 전략 ───────────────────────────────────────────────────
// 1. 길찾기 실행 전  → 100% (빈도 제한 예외)
// 2. 브랜드 변경 시  → 25%
// 3. 매장 클릭 4회 / 지도 브랜드 필터 3회마다 → 100% (1_1.html에서 호출)
//
// 위 트리거가 겹치면 매장 몇 개 보는 사이에 광고가 연달아 떠서 이탈로 이어진다.
// 그래서 실제 노출은 아래 두 조건을 모두 만족할 때만 한다.
//   - 세션(앱 실행)당 최대 AD_SESSION_LIMIT회
//   - 직전 노출이 닫힌 뒤 AD_MIN_INTERVAL_MS 이상 경과
// 길찾기는 사용자가 앱을 떠나는 시점이라 예외로 항상 노출하지만,
// 노출되면 카운트/타이머는 똑같이 갱신해서 뒤따르는 다른 트리거를 눌러준다.
const AD_SESSION_LIMIT = 3;
const AD_MIN_INTERVAL_MS = 30 * 1000;

let adShownCount = 0;
let lastAdAt = 0;

let interstitialReady = false;
let rewardAdReady = false;
// 전면·리워드 광고가 동시에 요청되면 native 쪽 이벤트가 꼬여 dismissed가 유실된다.
// 유실되면 onAfter가 영영 안 불려서 광고만 닫히고 화면이 멈춘 것처럼 보인다.
let adShowing = false;

const AD_BRAND_PROBABILITY = 0.25;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadInterstitial() {
  if (!loadFullScreenAd.isSupported || !loadFullScreenAd.isSupported()) return;
  loadFullScreenAd({
    options: { adGroupId: AD_CONFIG.interstitial },
    onEvent: (event) => { if (event.type === 'loaded') interstitialReady = true; },
    onError: () => { interstitialReady = false; },
  });
}

function loadRewardAd() {
  if (!loadFullScreenAd.isSupported || !loadFullScreenAd.isSupported()) return;
  loadFullScreenAd({
    options: { adGroupId: AD_CONFIG.rewarded },
    onEvent: (event) => {
      if (event.type === 'loaded') {
        rewardAdReady = true;
        document.getElementById('rewardAdBtn')?.classList.remove('hidden');
        document.getElementById('wishUnlockAdBtn')?.classList.remove('hidden');
      }
    },
    onError: () => { rewardAdReady = false; },
  });
}

// 전면·리워드 광고 공통 표시기.
// onDone은 어떤 경로로 끝나든 반드시 정확히 한 번만 호출된다. 이게 깨지면 화면이 멈춘다.
// - dismissed/failedToShow: 정상 종료
// - onError/예외: 즉시 종료
// - 광고가 뜨지 않음: 4초 후 종료
// - 광고는 떴는데 dismissed가 유실됨: WebView가 다시 보이면 닫힌 것으로 간주
function runFullScreenAd({ adGroupId, onEvent, onDone }) {
  if (adShowing) { onDone(); return false; }
  adShowing = true;

  let settled = false;
  let appeared = false;
  let unsubscribe = null;
  let appearTimer = null;

  const onVisible = () => {
    if (appeared && document.visibilityState === 'visible') settle();
  };

  function settle() {
    if (settled) return;
    settled = true;
    adShowing = false;
    clearTimeout(appearTimer);
    document.removeEventListener('visibilitychange', onVisible);
    try { if (unsubscribe) unsubscribe(); } catch (e) { /* noop */ }
    onDone();
  }

  document.addEventListener('visibilitychange', onVisible);
  appearTimer = setTimeout(() => { if (!appeared) settle(); }, 4000);

  try {
    unsubscribe = showFullScreenAd({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === 'show' || event.type === 'impression') appeared = true;
        if (onEvent) onEvent(event);
        if (event.type === 'dismissed' || event.type === 'failedToShow') settle();
      },
      onError: () => settle(),
    });
  } catch (e) {
    settle();
  }
  return true;
}

// 세션 상한과 최소 간격을 모두 통과해야 노출한다.
function canShowInterstitial() {
  if (adShownCount >= AD_SESSION_LIMIT) return false;
  if (Date.now() - lastAdAt < AD_MIN_INTERVAL_MS) return false;
  return true;
}

// options.force = true면 빈도 제한을 건너뛴다(길찾기 전용).
// 광고를 띄우지 않기로 했더라도 onAfter는 반드시 실행한다 — 안 그러면 화면이 멈춘다.
function showInterstitial(onAfter, options) {
  const force = !!(options && options.force);
  if (!interstitialReady || (!force && !canShowInterstitial())) {
    if (onAfter) onAfter();
    return;
  }
  // 실제로 화면에 뜬 광고만 카운트한다(로드 실패·타임아웃은 제외).
  let shown = false;
  runFullScreenAd({
    adGroupId: AD_CONFIG.interstitial,
    onEvent: (event) => {
      if (event.type === 'show' || event.type === 'impression') shown = true;
    },
    onDone: () => {
      if (shown) { adShownCount++; lastAdAt = Date.now(); }
      interstitialReady = false;
      loadInterstitial();
      if (onAfter) onAfter();
    },
  });
}

// 리워드 광고 공통.
// onGranted는 어떤 경로로 끝나든 정확히 한 번 호출된다. 반환값은 광고를 띄웠는지 여부.
//
// 예전에는 userEarnedReward 이벤트가 왔을 때만 보상을 줬는데, 그 이벤트가 오지 않으면
// (SDK 미발행, dismissed 유실, 표시 실패 등) 사용자는 광고만 보고 아무것도 못 얻었다.
// 실제로 "5km를 눌러도 광고만 나오고 반경이 안 바뀌는" 문제가 이 때문이었다.
// 보상이라고 해야 검색 반경·찜 한도 해제라 엄격히 막을 이유가 없고,
// 광고 노출은 이미 발생했으므로 흐름이 끝나면 지급한다.
function requestRewardAd(onGranted) {
  let granted = false;
  const grant = () => { if (granted) return; granted = true; onGranted(); };

  // 광고가 준비되지 않았으면(웹 미리보기 등) 기다리게 하지 않고 바로 지급
  if (!rewardAdReady) { grant(); return false; }

  let shown = false;
  runFullScreenAd({
    adGroupId: AD_CONFIG.rewarded,
    onEvent: (event) => {
      if (event.type === 'show' || event.type === 'impression') shown = true;
      if (event.type === 'userEarnedReward') grant();
    },
    onDone: () => {
      // 리워드는 사용자가 자청한 광고라 세션 상한에는 넣지 않는다.
      // 다만 리워드 직후 전면광고가 바로 뜨면 최악이라 최소 간격은 공유한다.
      if (shown) lastAdAt = Date.now();
      rewardAdReady = false;
      loadRewardAd();
      grant(); // 보상 이벤트가 없었더라도 여기서 반드시 지급된다
    },
  });
  return true;
}

// 인라인 스크립트(매장 클릭 4회, 지도 브랜드 필터 3회)에서 호출할 수 있게 전역 노출
window.showInterstitial = showInterstitial;

// ── 전면광고 트리거 1: 길찾기 ──────────────────────────────────────
// 앱을 떠나는 시점이라 광고 가치가 가장 높아 빈도 제한 예외로 둔다.
window.onNavigateToMap = function onNavigateToMap(url) {
  showInterstitial(() => { location.href = url; }, { force: true });
};

// ── 전면광고 트리거 2: 브랜드 변경 ────────────────────────────────
window.onBrandChanged = function onBrandChanged() {
  if (Math.random() >= AD_BRAND_PROBABILITY) return;
  showInterstitial(null);
};


// ── 리워드 2: 찜 목록 무제한 (오늘 하루) ──────────────────────────
window.watchRewardAdForWish = function watchRewardAdForWish() {
  requestRewardAd(() => {
    localStorage.setItem('cvs_wishUnlocked', todayStr());
    window.closeWishLimitModal?.();
    // 대기 중이던 찜 아이템 처리
    if (window._pendingLikeId) {
      const id = window._pendingLikeId;
      window._pendingLikeId = null;
      window.toggleLike?.(id);
    }
    window.showToast?.('오늘 하루 찜 목록을 무제한으로 사용할 수 있어요 💝');
  });
};

// ── 리워드 3: 5km 반경 검색 ───────────────────────────────────────
window.watchRewardAdForRadius = function watchRewardAdForRadius() {
  requestRewardAd(() => {
    window.setRadius?.(5000);
    window.showToast?.('반경 5km 검색이 열렸습니다 🗺️');
  });
};

// ── 토스 SDK 유틸 ─────────────────────────────────────────────────
window.tossShare = function tossShare(message) {
  return share({ message });
};

window.tossGetCurrentLocation = function tossGetCurrentLocation() {
  return getCurrentLocation({ accuracy: Accuracy.Balanced });
};

function init() {
  if (!TossAds.initialize.isSupported || !TossAds.initialize.isSupported()) return;
  document.body.classList.add('in-toss-app');
  TossAds.initialize({
    callbacks: {
      onInitialized: () => {
        const slot = document.getElementById('adBannerSlot');
        if (slot) TossAds.attachBanner(AD_CONFIG.banner, slot);
        loadInterstitial();
        loadRewardAd();
      },
    },
  });
}

document.addEventListener('DOMContentLoaded', init);
