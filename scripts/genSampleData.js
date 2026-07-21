// 카페 행사(deals.json) 샘플 생성기. 매장은 fetchStores.js의 실데이터를 쓰므로 여기선 행사만 만든다.
// 브랜드 목록은 fetchStores.js가 만든 brands.json에서 읽어와, 실제 데이터에 존재하는 모든 브랜드를 커버한다.
// (커버해야 하는 이유: 엔진이 events 있는 브랜드의 매장만 지도에 표시하므로, 브랜드마다 최소 몇 건은 있어야 함.)
// 실제 카페 행사 API는 공개된 게 없어, 프로모션 내용은 샘플이다. 매장 위치/브랜드는 실데이터.
const fs = require('fs');
const path = require('path');

// ⚠ 안전장치: 이 스크립트는 실제로 존재하지 않는 행사를 무작위로 지어낸다.
// (메뉴·할인율·마감일 전부 랜덤. 브랜드가 팔지도 않는 메뉴가 붙기도 한다.)
// 그대로 배포하면 하지 않는 행사를 광고하는 셈이라 실제로 문제가 됐고, 전량 삭제했다.
// 실서비스 deals.json은 crawlEvents.js(브랜드 공식 페이지 크롤링)로만 채운다.
// 개발용 더미가 꼭 필요할 때만 --i-know-this-is-fake 플래그로 명시 실행할 것.
if (!process.argv.includes('--i-know-this-is-fake')) {
  console.error('[중단] 이 스크립트는 가짜 행사를 생성해 deals.json을 덮어씁니다.');
  console.error('       실서비스 데이터는 crawlEvents.js로만 갱신하세요.');
  console.error('       개발용으로 정말 필요하면: node scripts/genSampleData.js --i-know-this-is-fake');
  process.exit(1);
}

const OUT = path.join(__dirname, '..', '카페 행사');
const brands = JSON.parse(fs.readFileSync(path.join(OUT, 'brands.json'), 'utf-8'));
const MENU_PRICES = JSON.parse(fs.readFileSync(path.join(OUT, 'menu-prices.json'), 'utf-8'));

const TYPES = ['할인', '쿠폰', '신메뉴', '시즌', '사이즈업', '이벤트'];
const MENU_POOL = {
  '커피':   [['아메리카노',2000],['카페라떼',3200],['카푸치노',3500],['바닐라라떼',3800],['카라멜 마키아토',4500],['콜드브루',4000],['디카페인 아메리카노',2500],['플랫화이트',4700]],
  '음료':   [['자몽 에이드',4300],['청귤 스무디',5200],['딸기 라떼',5000],['초콜릿 라떼',4200],['그린티 라떼',4500],['레몬 아이스티',3500],['복숭아 아이스티',3800]],
  '디저트': [['치즈케이크',5900],['티라미수',6200],['마카롱 세트',7500],['초코 브라우니',4800],['생크림 롤케이크',5500],['푸딩',3900]],
  '베이커리':[['크루아상',3800],['소금빵',3200],['에그타르트',3500],['플레인 스콘',3400],['치아바타 샌드위치',6500],['베이글',3600]],
  'MD·기타':[['텀블러',22000],['보온병',28000],['원두 250g',12000],['드립백 10입',9000]],
};
const CATEGORIES = Object.keys(MENU_POOL);
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;

const deals = [];
let uid = 0;
brands.forEach(brand => {
  const nEvents = 4 + Math.floor(Math.random() * 5); // 브랜드당 4~8개
  const used = new Set();
  for (let i = 0; i < nEvents; i++) {
    const cat = pick(CATEGORIES);
    const [menu, basePrice] = pick(MENU_POOL[cat]);
    const key = brand.name + menu;
    if (used.has(key)) continue;
    used.add(key);

    const type = pick(TYPES);
    // 브랜드 가격 DB에서 실제 가격 조회, 없으면 basePrice 사용
    const brandPrices = MENU_PRICES[brand.name] || {};
    const price = brandPrices[menu] || basePrice;
    let discountPrice = price, discountRate = 0, saving = 0;
    if ((type === '할인' || type === '쿠폰') && price > 0) {
      discountRate = [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)];
      discountPrice = Math.round(price * (100 - discountRate) / 100 / 10) * 10;
      saving = price - discountPrice;
    }
    const daysLeft = chance(0.15) ? 0 : chance(0.25) ? (1 + Math.floor(Math.random() * 2)) : (3 + Math.floor(Math.random() * 20));
    const isNew = chance(0.2);
    const titleByType = {
      '할인': discountRate ? `${menu} ${discountRate}% 할인` : `${menu} 할인 행사`,
      '쿠폰': discountRate ? `앱 쿠폰 ${menu} ${discountRate}% 할인` : `앱 쿠폰 ${menu} 할인`,
      '신메뉴': `[신메뉴] ${menu} 출시`,
      '시즌': `[시즌] ${menu}`,
      '사이즈업': `${menu} 무료 사이즈업`,
      '이벤트': `${menu} 구매 이벤트`,
    };
    deals.push({
      id: `${brand.name}_${menu}_${uid++}`.replace(/\s/g, ''),
      name: menu, category: cat, price, saving, discountPrice, discountRate,
      eventTitle: titleByType[type],
      conditionText: type === '쿠폰' ? '브랜드 공식 앱 쿠폰 적용 시. 일부 매장 제외.' : type === '사이즈업' ? '동일 메뉴 사이즈 업그레이드 무료. 일부 매장 제외.' : '매장별 적용 여부가 다를 수 있어요. 방문 전 확인 권장.',
      officialUrl: brand.event || '',
      isCoupon: type === '쿠폰', isNewMenu: type === '신메뉴', isSeasonMenu: type === '시즌',
      events: { [brand.name]: { type, isNew, daysLeft, image: '' } },
    });
  }
});

fs.writeFileSync(path.join(OUT, 'deals.json'), JSON.stringify(deals));
console.log(`행사 ${deals.length}건 생성(브랜드 ${brands.length}개 커버) → deals.json`);
