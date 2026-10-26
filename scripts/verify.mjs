import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.screenshot({path:'artifacts/screen.png',fullPage:true});
const checks=await page.evaluate(()=>{
 const sheet=document.querySelector('.sheet');
 const week=document.querySelector('.week');
 const wheel=document.querySelector('.wheel');
 const rect=wheel.getBoundingClientRect();
 const labels=[...document.querySelectorAll('.hour time')].map(x=>x.textContent);
 return {title:document.title,days:week.children.length,hourLabels:labels.length,firstHour:labels[0],lastHour:labels[labels.length-1],reflectionSections:document.querySelectorAll('.refgrid section').length,wheelWidth:rect.width,wheelHeight:rect.height,sheetWidth:sheet.getBoundingClientRect().width};
});
fs.writeFileSync('artifacts/checks.json',JSON.stringify(checks,null,2));
if(checks.days!==7||checks.hourLabels!==133||checks.firstHour!=='05:00'||checks.lastHour!=='23:00'||checks.reflectionSections!==4||Math.abs(checks.wheelWidth-checks.wheelHeight)>1)throw Error('Layout checks failed: '+JSON.stringify(checks));
const verifyHourlySpacing=async()=>{
 const columns=await page.locator('.week article').evaluateAll(nodes=>nodes.map(node=>{
  const rows=[...node.querySelectorAll('.hour')].map(row=>row.getBoundingClientRect());
  const night=node.querySelector('.night').getBoundingClientRect();
  return {heights:rows.map(row=>row.height),gap:night.top-rows.at(-1).bottom};
 }));
 if(columns.some(column=>Math.abs(column.gap)>1||Math.max(...column.heights)-Math.min(...column.heights)>1))throw Error('Hours must evenly fill the space up to the evening reflection');
};
await verifyHourlySpacing();
// Zodiac marks must remain monochrome vectors on systems with emoji fonts.
const zodiacMarks=page.locator('[data-zodiac]');
if(await zodiacMarks.count()!==12||await zodiacMarks.locator('path').count()!==12||await zodiacMarks.locator('text,image').count()!==0)throw Error('Zodiac marks must use vector paths');
if(!await zodiacMarks.evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).stroke===getComputedStyle(node).color&&getComputedStyle(node).fill==='none')))throw Error('Zodiac marks must inherit the text color');
const verifyChartLabels=async()=>{
 const labels=await page.locator('[data-planet]').evaluateAll(nodes=>nodes.map(node=>{
   const box=node.querySelector('.planet-label rect').getBoundingClientRect();
   const longitude=Number(node.getAttribute('data-longitude'));
   const minutes=Math.floor(longitude%30*60);
   return {degree:node.querySelector('.planet-degree').textContent,expected:`${Math.floor(minutes/60)}°${String(minutes%60).padStart(2,'0')}′`,x:box.x,y:box.y,right:box.right,bottom:box.bottom};
 }));
 if(labels.length!==10||labels.some(label=>label.degree!==label.expected))throw Error('All ten planets need their calculated degrees inside the chart');
 if(labels.some((a,i)=>labels.slice(i+1).some(b=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y)))throw Error('Planet labels overlap');
 if(await page.locator('.planet-positions').count())throw Error('External degree list should be removed');
};
await verifyChartLabels();
if(checks.wheelWidth<300)throw Error('The screen chart should use the space freed by its legend');
const verifyAspects=async()=>{
 const result=await page.evaluate(()=>{
  const planets=[...document.querySelectorAll('[data-planet]')].map(n=>({name:n.dataset.planet,longitude:Number(n.dataset.longitude)}));
  const expected=[];
  for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){
   const gap=Math.abs(planets[i].longitude-planets[j].longitude);
   const separation=Math.min(gap,360-gap);
   for(const angle of [0,60,90,120,180])if(Math.abs(separation-angle)<=6)expected.push(`${planets[i].name}-${planets[j].name}-${angle}`);
  }
  const nodes=[...document.querySelectorAll('[data-aspect]')];
  const actual=nodes.map(n=>`${n.dataset.first}-${n.dataset.second}-${n.dataset.aspect}`);
  const colors=nodes.every(n=>getComputedStyle(n).stroke===({soft:'rgb(119, 150, 172)',hard:'rgb(170, 119, 117)',conjunction:'rgb(182, 155, 104)'})[n.classList[0].replace('aspect-','')]);
  return {expected:expected.sort(),actual:actual.sort(),colors};
 });
 if(JSON.stringify(result.expected)!==JSON.stringify(result.actual)||!result.colors)throw Error('Major aspects must match calculated separations and muted color categories');
};
await verifyAspects();
const verifyHouses=async()=>{
 const result=await page.evaluate(()=>{
  const houses=[...document.querySelectorAll('[data-house]')].map(n=>Number(n.dataset.cusp));
  const asc=document.querySelector('[data-angle="ASC"] line');
  const mc=document.querySelector('[data-angle="MC"] line');
  return {houses,ascX:asc.x1.baseVal.value,ascY:asc.y1.baseVal.value,mcY:mc.y1.baseVal.value,caption:document.querySelector('.symbol>small').textContent};
 });
 if(result.houses.length!==12||result.houses.some(x=>!Number.isFinite(x)||x<0||x>=360))throw Error('Placidus chart needs twelve valid cusps');
 for(let i=0;i<6;i++)if(Math.abs(((result.houses[i+6]-result.houses[i]+360)%360)-180)>1e-6)throw Error('Opposite house cusps must differ by 180 degrees');
 if(Math.abs(result.ascX-31)>.001||Math.abs(result.ascY-120)>.001||result.mcY>=120||!result.caption.includes('東京基準・プラシーダス'))throw Error('Tokyo Placidus chart must put ASC at left and MC above');
};
await verifyHouses();
const verifyDailyEvents=async()=>{
 const valid=await page.locator('.week article').evaluateAll(nodes=>nodes.every(node=>{
  const day=node.querySelector('.date').textContent;
  const slot=node.querySelector('.event-slot').getBoundingClientRect();
  return [...node.querySelectorAll('.daily-event-row')].every(row=>{
   const time=row.querySelector('time'),date=new Date(time.dateTime);
   const displayedDay=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).format(date);
   const displayedTime=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
   const box=row.getBoundingClientRect();
   return day===displayedDay&&time.textContent===displayedTime&&box.top>=slot.top-1&&box.bottom<=slot.bottom+1;
  });
 }));
 if(!valid)throw Error('Daily events must fit their columns and match JST dates/times');
 if(await page.getByLabel('天体イベントの仮表示').count())throw Error('Sample event cards must be removed');
};
await verifyDailyEvents();
// A known full-moon week checks the calculated chart and week navigation.
const weekPicker=page.getByLabel('表示したい日付');
const originalWeek=await weekPicker.inputValue();
await weekPicker.fill('2026-10-26');
if(await page.locator('.symbolic-event-name').textContent()!=='牡牛座満月'||!(await page.locator('.symbolic-event time').textContent()).includes('10/26（月）13:12頃')||!(await page.locator('.symbolic-meaning').textContent()).includes('気づきと収穫'))throw Error('Symbolic day caption must describe the Taurus full moon in JST');
if(await page.locator('[data-first="太陽"][data-second="月"]').getAttribute('data-aspect')!=='180')throw Error('Full moon must show Sun–Moon opposition');
if(await page.locator('.week article').nth(0).locator('.daily-event-row').count()!==2||await page.locator('.week article').nth(5).locator('[data-event-label="水星スクエア火星"]').count()!==1||await page.locator('.week article').nth(4).locator('.no-daily-event').count()!==1)throw Error('Known full-moon week daily events are incorrect');
await verifyDailyEvents();
const chartTime=await page.locator('.symbol time').getAttribute('datetime');
const positions=await page.locator('[data-planet]').evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('data-planet'),longitude:Number(node.getAttribute('data-longitude'))})));
const sun=positions.find(p=>p.name==='太陽'),moon=positions.find(p=>p.name==='月');
if(positions.length!==10||positions.some(p=>!Number.isFinite(p.longitude)||p.longitude<0||p.longitude>=360)||!chartTime?.startsWith('2026-10-26')||!sun||!moon||Math.abs(Math.abs(sun.longitude-moon.longitude)-180)>.1)throw Error('Calculated transit chart check failed');
await page.getByRole('button',{name:'次の週 ›'}).click();
if(await page.locator('.symbol time').getAttribute('datetime')===chartTime||Number(await page.locator('[data-planet="月"]').getAttribute('data-longitude'))===moon.longitude)throw Error('Transit chart did not follow week navigation');
if(await page.locator('.symbolic-event-name').textContent()!=='獅子座下弦の月'||!(await page.locator('.symbolic-meaning').textContent()).includes('手放して整える'))throw Error('Symbolic day caption did not follow the lunar event');
await weekPicker.fill('2026-11-09');
if(await page.locator('.symbolic-event-name').textContent()!=='蠍座新月'||!(await page.locator('.symbolic-meaning').textContent()).includes('願いの種'))throw Error('New moon caption is incorrect');
if(await page.locator('[data-first="太陽"][data-second="月"]').getAttribute('data-aspect')!=='0')throw Error('New moon must show Sun–Moon conjunction');
for(const date of ['2026-02-16','2026-06-15','2026-12-21','2020-01-06']){
 await weekPicker.fill(date);await verifyChartLabels();await verifyAspects();await verifyHouses();await verifyDailyEvents();
}
await weekPicker.fill(originalWeek);
console.log('Transit chart: ten valid positions, full-moon opposition and week navigation passed');
await page.emulateMedia({media:'print'});
await verifyHourlySpacing();
await verifyChartLabels();
await verifyAspects();
await verifyHouses();
await verifyDailyEvents();
if(!await page.evaluate(()=>document.querySelector('footer').getBoundingClientRect().bottom<=document.querySelector('.sheet').getBoundingClientRect().bottom))throw Error('Enlarged chart must leave the footer inside the printed page');
await page.pdf({path:'artifacts/a4-landscape.pdf',format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
await browser.close();
console.log(checks);
