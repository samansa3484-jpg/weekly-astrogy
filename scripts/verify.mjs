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
  return {houses,ascX:asc.x1.baseVal.value,ascY:asc.y1.baseVal.value,mcY:mc.y1.baseVal.value,caption:document.querySelector('.transit-wheel svg').getAttribute('aria-label')};
 });
 if(result.houses.length!==12||result.houses.some(x=>!Number.isFinite(x)||x<0||x>=360))throw Error('Placidus chart needs twelve valid cusps');
 for(let i=0;i<6;i++)if(Math.abs(((result.houses[i+6]-result.houses[i]+360)%360)-180)>1e-6)throw Error('Opposite house cusps must differ by 180 degrees');
 if(Math.abs(result.ascX-31)>.001||Math.abs(result.ascY-120)>.001||result.mcY>=120||!result.caption.includes('東京基準のプラシーダス'))throw Error('Tokyo Placidus chart must put ASC at left and MC above');
};
await verifyHouses();
const verifyDailyEvents=async()=>{
 const valid=await page.locator('.week article').evaluateAll(nodes=>nodes.every(node=>{
  const day=node.querySelector('.date').textContent;
  return [...node.querySelectorAll('[data-timeline-event]')].every(mark=>{
   const date=new Date(mark.dataset.eventTime);
   const displayedDay=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).format(date);
   const local=new Date(date.getTime()+9*3600000),hour=local.getUTCHours(),minute=local.getUTCMinutes();
   const row=mark.closest('[data-hour]');
   const correctlyPlaced=hour<5?!!mark.closest('.before-hours-event'):row?.dataset.hour===String(hour)&&Number(mark.dataset.minute)===minute;
   const box=mark.getBoundingClientRect();
   const container=(hour<5?mark.closest('.before-hours-slot'):row)?.getBoundingClientRect();
   return day===displayedDay&&correctlyPlaced&&mark.textContent===mark.dataset.eventSymbol+'\uFE0E'&&box.top>=container.top-1&&box.bottom<=container.bottom+1;
  });
 }));
 if(!valid)throw Error('Timeline marks must match JST dates, hours and minutes without crossing rows');
 if(await page.locator('.event-slot,.no-daily-event').count())throw Error('Repeated event cards and empty-day notices should be removed');
};
await verifyDailyEvents();
const verifyPromptFit=async()=>{
 if(!await page.locator('.night-question,.morning-question').evaluateAll(nodes=>nodes.every(node=>{
  const range=document.createRange();range.selectNodeContents(node);
  return node.classList.contains('night-question')?range.getBoundingClientRect().height<=node.getBoundingClientRect().height+1:node.getBoundingClientRect().bottom<=node.closest('article').querySelector('.hours').getBoundingClientRect().top+1;
 })))throw Error('Morning and evening prompts must fit without covering writing space');
};
await verifyPromptFit();
const verifyWeeklyContext=async()=>{
 const directions=page.locator('.direction-description');
 if(await directions.count()!==3||(await directions.allTextContents()).some(text=>!text.trim()))throw Error('All three weekly directions need explanations');
 const items=page.locator('.weekly-flow-item');
 if(await items.count()>3)throw Error('Weekly context should highlight at most three events');
 for(const item of await items.all())if(!(await item.locator('time').getAttribute('datetime'))||!(await item.locator('.flow-explanation').textContent()).trim())throw Error('Each weekly event needs a real timestamp and explanation');
 if(await page.locator('.weekly-good-for>p').count()!==5||!(await page.locator('.weekly-choice-note').textContent()).includes('自由に選んで'))throw Error('Five optional action hints should be offered');
};
await verifyWeeklyContext();
// A known full-moon week checks the calculated chart and week navigation.
const weekPicker=page.getByLabel('表示したい日付');
const originalWeek=await weekPicker.inputValue();
await weekPicker.fill('2026-10-26');
if(await page.locator('.symbolic-event-name').textContent()!=='牡牛座満月'||!(await page.locator('.symbolic-event time').textContent()).includes('10/26（月）13:12頃')||!(await page.locator('.symbolic-meaning').textContent()).includes('気づきと収穫'))throw Error('Symbolic day caption must describe the Taurus full moon in JST');
if(await page.locator('[data-first="太陽"][data-second="月"]').getAttribute('data-aspect')!=='180')throw Error('Full moon must show Sun–Moon opposition');
if(await page.locator('.week article').nth(0).locator('[data-timeline-event]').count()!==2||await page.locator('.week article').nth(5).locator('[data-event-label="水星スクエア火星"]').count()!==1||await page.locator('.week article').nth(4).locator('[data-timeline-event]').count()!==0)throw Error('Known full-moon week daily events are incorrect');
await verifyDailyEvents();
if(!(await page.locator('.morning-question').first().textContent()).includes('実り')||!(await page.locator('.night-question').first().textContent()).includes('実り'))throw Error('Full moon morning and night prompts should be paired');
const release=page.getByRole('checkbox',{name:'RELEASE｜手放す',exact:true});
const fullMoonDirection=await page.locator('.direction-description').first().textContent();
await release.check();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('weekly-astrology-2026-10-26-v1')||'{}').check0==='yes');
await page.reload();await weekPicker.fill('2026-10-26');
if(!await release.isChecked())throw Error('Direction check should persist after reload');
const chartTime=await page.locator('.symbol time').getAttribute('datetime');
const positions=await page.locator('[data-planet]').evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('data-planet'),longitude:Number(node.getAttribute('data-longitude'))})));
const sun=positions.find(p=>p.name==='太陽'),moon=positions.find(p=>p.name==='月');
if(positions.length!==10||positions.some(p=>!Number.isFinite(p.longitude)||p.longitude<0||p.longitude>=360)||!chartTime?.startsWith('2026-10-26')||!sun||!moon||Math.abs(Math.abs(sun.longitude-moon.longitude)-180)>.1)throw Error('Calculated transit chart check failed');
await page.getByRole('button',{name:'次の週 ›'}).click();
if(await release.isChecked())throw Error('Direction checks should be independent for each week');
if(await page.locator('.direction-description').first().textContent()===fullMoonDirection)throw Error('Direction explanations should follow the weekly theme');
await page.getByRole('button',{name:'‹ 前の週'}).click();
if(!await release.isChecked())throw Error('Returning to a week should restore its direction checks');
await release.uncheck();await page.getByRole('button',{name:'次の週 ›'}).click();
if(await page.locator('.symbol time').getAttribute('datetime')===chartTime||Number(await page.locator('[data-planet="月"]').getAttribute('data-longitude'))===moon.longitude)throw Error('Transit chart did not follow week navigation');
if(await page.locator('.symbolic-event-name').textContent()!=='獅子座下弦の月'||!(await page.locator('.symbolic-meaning').textContent()).includes('手放して整える'))throw Error('Symbolic day caption did not follow the lunar event');
if(!(await page.locator('.morning-question').first().textContent()).includes('手放')||!(await page.locator('.night-question').first().textContent()).includes('手放'))throw Error('Last quarter morning and night prompts should be paired');
if(await page.locator('.morning-question').nth(1).textContent()===await page.locator('.morning-question').nth(3).textContent())throw Error('Quiet-day questions should vary');
const nightField=page.getByRole('textbox',{name:'night0',exact:true});
await nightField.fill('問いの更新後も残す振り返り');
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('weekly-astrology-2026-11-02-v1')||'{}').night0==='問いの更新後も残す振り返り');
await page.reload();
await weekPicker.fill('2026-11-02');
if(await nightField.inputValue()!=='問いの更新後も残す振り返り')throw Error('Evening entries should persist across reload');
await page.getByRole('button',{name:'次の週 ›'}).click();
if(await nightField.inputValue()!=='')throw Error('Different weeks must keep separate entries');
await page.getByRole('button',{name:'‹ 前の週'}).click();
if(await nightField.inputValue()!=='問いの更新後も残す振り返り')throw Error('Week navigation must preserve the evening entry');
await nightField.fill('');
await weekPicker.fill('2026-11-09');
if(await page.locator('.symbolic-event-name').textContent()!=='蠍座新月'||!(await page.locator('.symbolic-meaning').textContent()).includes('願いの種'))throw Error('New moon caption is incorrect');
if(await page.locator('[data-first="太陽"][data-second="月"]').getAttribute('data-aspect')!=='0')throw Error('New moon must show Sun–Moon conjunction');
for(const date of ['2026-02-16','2026-06-15','2026-12-21','2020-01-06']){
 await weekPicker.fill(date);await verifyChartLabels();await verifyAspects();await verifyHouses();await verifyDailyEvents();await verifyPromptFit();await verifyWeeklyContext();
}
await weekPicker.fill(originalWeek);
console.log('Transit chart: ten valid positions, full-moon opposition and week navigation passed');
// Print real form values, including two-line evening and three-line weekly notes.
const printSamples=[['action0','大切な予定を進める'],['slot0-0','朝の散歩'],['night0','できたことを認める\n気づきを次の一歩へ'],['reflection0','よかったこと\n新しく気づいたこと\n次の一歩へ']];
for(const [name,value] of printSamples)await page.getByRole('textbox',{name,exact:true}).fill(value);
await page.emulateMedia({media:'print'});
await verifyHourlySpacing();
await verifyChartLabels();
await verifyAspects();
await verifyHouses();
await verifyDailyEvents();
await verifyPromptFit();
await verifyWeeklyContext();
if(!await page.evaluate(()=>document.querySelector('footer').getBoundingClientRect().bottom<=document.querySelector('.sheet').getBoundingClientRect().bottom))throw Error('Enlarged chart must leave the footer inside the printed page');
if(await page.locator('.toolbar').isVisible())throw Error('Toolbar should not appear in print');
if(!await page.evaluate(()=>{const sheet=document.querySelector('.sheet').getBoundingClientRect();return sheet.width<=document.body.clientWidth+1&&sheet.height<=document.body.clientHeight+1;}))throw Error('Printed sheet must fit inside the printable area');
if(!await page.locator('.night-writing textarea,.refgrid textarea').evaluateAll(nodes=>nodes.every(node=>node.scrollHeight<=node.clientHeight+1)))throw Error('Printed sample notes should not be clipped');
for(const [name,value] of printSamples)if(await page.getByRole('textbox',{name,exact:true}).inputValue()!==value)throw Error('Printed form value changed');
await page.pdf({path:'artifacts/a4-landscape.pdf',format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
// Keep the longer-caption and ingress-heavy weeks in the print regression check.
for(const date of ['2026-11-02','2026-11-09','2026-02-16']){
 await page.emulateMedia({media:'screen'});await weekPicker.fill(date);
 await page.emulateMedia({media:'print'});
 await verifyPromptFit();await verifyWeeklyContext();await verifyHourlySpacing();
 if(!await page.evaluate(()=>document.querySelector('footer').getBoundingClientRect().bottom<=document.querySelector('.sheet').getBoundingClientRect().bottom))throw Error('Printed content is clipped in '+date);
 await page.pdf({path:`artifacts/print-${date}.pdf`,format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
}
await browser.close();
console.log(checks);
