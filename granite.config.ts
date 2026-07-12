import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'cafe-event-map', // 콘솔에 등록한 앱 ID와 반드시 일치해야 함
  brand: {
    displayName: '카페행사맵',
    primaryColor: '#00704A',
    icon: 'https://static.toss.im/appsintoss/placeholder-cafe-icon.png', // 콘솔에 등록한 로고와 정확히 일치해야 함(배포 전 교체)
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'node scripts/build-toss.js',
      build: 'node scripts/build-toss.js',
    },
  },
  permissions: [
    { name: 'geolocation', access: 'access' },
  ],
  outdir: 'dist',
});
