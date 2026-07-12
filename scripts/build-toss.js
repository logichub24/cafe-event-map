// 토스인앱(Apps in Toss) 빌드용 스크립트.
// granite.config.ts의 web.commands.build/dev에서 호출됨.
// 정적 HTML 앱이라 별도 번들러 없이, 필요한 파일만 dist/로 복사한다.
// v1은 실크롤러가 없어 샘플 데이터(deals.json, stores/)를 함께 배포한다.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', '카페 행사');
const DIST_DIR = path.join(__dirname, '..', 'dist');

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

fs.copyFileSync(path.join(SRC_DIR, '1_1.html'), path.join(DIST_DIR, 'index.html'));

// ads.js는 @apps-in-toss/web-bridge를 esm.sh CDN이 아닌 로컬 패키지로 번들링한다.
// WebView 환경에서 외부 CDN 접근이 차단될 수 있어 번들로 내장해야 광고 SDK가 동작한다.
const adsSrc = path.join(SRC_DIR, 'ads.js');
const adsDist = path.join(DIST_DIR, 'ads.js');
const esbuild = path.join(__dirname, '..', 'node_modules', '.bin', 'esbuild');
execSync(
  `"${esbuild}" "${adsSrc}" --bundle --format=esm --outfile="${adsDist}" --platform=browser`,
  { stdio: 'inherit' }
);

// sw.js(서비스워커) + 아이콘 + 샘플 데이터 복사
for (const file of fs.readdirSync(SRC_DIR)) {
  if (/^icon.*\.(png|svg)$/.test(file) || file === 'sw.js' || file === 'deals.json' || file === 'brands.json') {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DIST_DIR, file));
  }
}

// stores/ 디렉터리 통째로 복사
const storesSrc = path.join(SRC_DIR, 'stores');
if (fs.existsSync(storesSrc)) {
  const storesDist = path.join(DIST_DIR, 'stores');
  fs.mkdirSync(storesDist, { recursive: true });
  for (const f of fs.readdirSync(storesSrc)) {
    fs.copyFileSync(path.join(storesSrc, f), path.join(storesDist, f));
  }
}

console.log('토스 빌드 완료:', DIST_DIR);
