// 스타벅스 newsListAjax 페이지네이션 파라미터 + newsList_v2.js AJAX 호출 패턴
const https = require('https');
function fetch(url) {
  return new Promise(resolve => {
    https.get(url,{headers:{'User-Agent':'Mozilla/5.0 Chrome/120'},rejectUnauthorized:false,timeout:12000},res=>{
      const ch=[]; res.on('data',c=>ch.push(c));
      res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(ch).toString('utf-8')}));
    }).on('error',()=>resolve({status:'error',body:''})).on('timeout',function(){this.destroy();resolve({status:'timeout',body:''});});
  });
}
async function main() {
  // newsList_v2.js AJAX 호출 구간
  const js = await fetch('https://www.starbucks.co.kr/common/js/whats_new/newsList_v2.js?v=20220217');
  const ajaxIdx = js.body.indexOf('newsListAjax');
  if (ajaxIdx>=0) console.log('AJAX 호출 주변:\n' + js.body.slice(Math.max(0,ajaxIdx-100), ajaxIdx+500));
  // imgDomain 정의
  const imgDomIdx = js.body.indexOf('imgDomain');
  if (imgDomIdx>=0) console.log('\nimgDomain 정의:\n' + js.body.slice(imgDomIdx-50, imgDomIdx+200));

  // pageIndex 파라미터 시도
  const r2 = await fetch('https://www.starbucks.co.kr/whats_new/newsListAjax.do?cateType=&pageIndex=2&recordCountPerPage=10');
  const d2 = JSON.parse(r2.body);
  console.log(`\npageIndex=2: list.length=${d2.list.length}`);
  if (d2.list[0]) console.log('item[0].title:', d2.list[0].title, '/ rnum:', d2.list[0].rnum);

  // pageNo=2 다시 확인 — rnum으로 실제 순서 확인
  const r1 = await fetch('https://www.starbucks.co.kr/whats_new/newsListAjax.do?cateType=&pageNo=1&recordCountPerPage=10');
  const d1 = JSON.parse(r1.body);
  console.log(`\npageNo=1: rnum 범위 ${d1.list[0]?.rnum} ~ ${d1.list[d1.list.length-1]?.rnum}`);
  const r3 = await fetch('https://www.starbucks.co.kr/whats_new/newsListAjax.do?cateType=&pageNo=2&recordCountPerPage=10');
  const d3 = JSON.parse(r3.body);
  console.log(`pageNo=2: rnum 범위 ${d3.list[0]?.rnum} ~ ${d3.list[d3.list.length-1]?.rnum}`);
  const r4 = await fetch('https://www.starbucks.co.kr/whats_new/newsListAjax.do?cateType=&pageNo=3&recordCountPerPage=10');
  const d4 = JSON.parse(r4.body);
  console.log(`pageNo=3: rnum 범위 ${d4.list[0]?.rnum} ~ ${d4.list[d4.list.length-1]?.rnum}`);
}
main();
