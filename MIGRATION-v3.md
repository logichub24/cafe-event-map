# 앱인토스 SDK 2.x → 3.x 전환 (마감 2026-09-14)

브랜치: `migrate/ait-sdk-v3` (기준 7dbb827). QR 테스트 통과 전 main 머지 금지.
3.x 번들 출시 후에는 2.x로 롤백 불가.

## 1. 현황 (전환 전)
- 설치: `@apps-in-toss/*` 전부 **2.10.5**
- npm 최신: web-framework **3.0.5** (beta 3.1.0-beta.1)
  web-bridge 2.10.10 / web-analytics 2.10.9 에서 정지 → 3.x로 통합됨
- 설정: `granite.config.ts` (appName, brand{displayName,primaryColor,icon}, web.commands, permissions, outdir)
- scripts: dev=devserver.js, build:toss=build-toss.js
- **esbuild 0.25.5는 web-framework@2.10.5 전이 의존** (직접 의존 없음)
  build-toss.js가 `node_modules/.bin/esbuild`를 직접 호출 → 3.x에서 깨질 위험

## 외부 도메인
### CORS 대상 (fetch)
| 도메인 | 용도 |
|---|---|
| logichub24.github.io | deals/stores/brands 데이터 |
| apis.data.go.kr | 기상청 초단기실황 |
| api.open-meteo.com | 날씨 fallback |
| dapi.kakao.com | 카카오 로컬 검색 (Authorization 헤더) |

### CORS 비대상
| 도메인 | 이유 |
|---|---|
| api.vworld.kr | JSONP(`vworldJsonp`) + 타일 이미지 |
| map.kakao.com | 외부 링크 이동 |
| cdn.tailwindcss.com / cdnjs.cloudflare.com / unpkg.com | script·link 태그 |
| a.basemaps.cartocdn.com | 지도 타일 이미지 |

## 2. 자동 마이그레이션 결과
`npm i -D @apps-in-toss/web-framework@3` → **1593개 패키지 제거**, 20개 추가.
남은 것은 `web-framework 3.0.5` + `cli 3.0.5` 둘뿐. (web-bridge·web-analytics·plugins·types 전부 사라짐)

`npx ait migrate v3` 결과
- `granite.config.ts` → `apps-in-toss.config.ts`
- `brand`: displayName·icon 제거, **primaryColor만 남음** (아이콘은 이제 콘솔 등록본만 사용)
- `outdir` → `webBundleDir`
- `web.commands` → package.json scripts (`build` = `build-toss.js && ait build`)
- `@apps-in-toss/devtools` devDependency 추가

### 마이그레이션이 덮어쓴 것 (복원함)
`dev` 스크립트가 `devserver.js` → `build-toss.js`로 **덮어써졌다.**
로컬 정적 서버를 `serve`로 복원했다. (`npm run serve`, 포트 4600)

## 3. 4대 파손 지점 — 전부 실측 확인
### (1) esbuild 전이 의존 소실 → 확인됨, 해결
`npm ls esbuild`로 2.x에서 `web-framework@2.10.5` 전이로만 딸려오던 것을 확인.
3.x 설치 후 `node_modules/.bin/esbuild` 소멸 → build-toss.js가
`Could not resolve` 2건으로 실패. `esbuild@0.25.5`를 devDependencies에 명시 추가.

### (2) 패키지 통합 → 확인됨, 해결
`web-bridge`/`web-analytics` resolve 실패. 필요한 7개 export가
`web-framework` 3.0.5에 전부 있는지 **런타임으로 확인**(TossAds, loadFullScreenAd,
showFullScreenAd, share, getCurrentLocation, Accuracy, Analytics — 총 92개 export 중).
import 2줄을 1줄로 통합. ads.js 번들 80KB → 166KB(통합 SDK, 정상).

### (3) isSupported() 예외 → 확인됨, 해결
`window`는 있고 `__appsInTossConstants`만 없는 브라우저 조건으로 재현.

    loadFullScreenAd.isSupported()   → TypeError
    showFullScreenAd.isSupported()   → TypeError
    TossAds.initialize.isSupported() → false (안전)

`isSupported(fn)` 헬퍼로 try/catch 감싸 false로 떨어뜨림. 호출부 3곳 교체.
추가로 `share()`는 토스 밖에서 **동기 예외**를 던지는데 호출부가 `.catch()`로만 받고 있어
동기 예외가 새어나갔다. `tossShare`/`tossGetCurrentLocation`이 항상 Promise를 돌려주도록 감쌈.

### (4) CORS → GET으로 실측, 4곳 전부 통과
| 대상 | web.tossmini.com | private-web.tossmini.com |
|---|---|---|
| logichub24.github.io | 200 / ACAO `*` | 200 / ACAO `*` |
| apis.data.go.kr (실제 키) | 200 `resultCode 00` / origin echo | 200 `resultCode 00` / origin echo |
| api.open-meteo.com | 200 / ACAO `*` | 200 / ACAO `*` |
| dapi.kakao.com (실제 키) | preflight 204 + GET 200 / ACAO `*` | preflight 204 + GET 200 / ACAO `*` |

- 기상청은 **가짜 키로 GET하면 403**이라 그대로 봤으면 차단으로 오판했을 것. 실제 키로 재확인함.
- 카카오는 `Authorization` 헤더 때문에 **preflight(OPTIONS)** 가 뜬다. 별도 확인했고
  `Access-Control-Allow-Headers`에 Authorization 포함 확인.
- CORS 비대상: api.vworld.kr(JSONP+타일), map.kakao.com(링크 이동),
  tailwind/cdnjs/unpkg(script·link 태그), cartocdn(타일 이미지).

## 4. 빌드·검증
    .ait  5,946,785 → 2,226,644 bytes (-62%)
    RN 번들(bundle.ios/android) 없음 — 3.x 정상
    sources/ 25개: index.html, ads.js, sw.js, brands.json, deals.json, stores/*(19)
    dist/ads.js 최상위 import 0건, esm.sh 등 CDN import 0건

로컬 실행(`npm run serve` → /dist/index.html), 깨끗한 탭 기준
- **콘솔 오류 0건**
- 지도 생성, 마커 58, 흐린 마커(행사 0건) 15
- 전체행사 211건, 주변랭킹 58곳, '행사 없음' 뱃지 15, 마감 임박 10건
- 데이터 출처 = 원격 Pages (실시간 로드 정상)
- 전역 노출 정상: aitLog / showInterstitial / tossShare / tossGetCurrentLocation / onNavigateToMap
- `in-toss-app` false, `tossShare()`는 동기 예외 대신 **reject** (3항 수정 확인)
