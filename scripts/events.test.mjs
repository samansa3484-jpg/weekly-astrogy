import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Astronomy from 'astronomy-engine';
import {weeklyEvents,eventsForJstDay,jstInstant,compactEventLabel,timelineForDay,jstClock} from '../src/events.ts';
const week=new Date('2026-10-26T00:00:00Z');
const events=weeklyEvents(week);
test('JST day boundaries include midnight once and exclude the next midnight',()=>{
 const start=jstInstant(week,0),end=jstInstant(week,1);
 const input=[{date:end,label:'next',kind:'phase'},{date:new Date(end.getTime()-1),label:'last',kind:'phase'},{date:new Date(start.getTime()-1),label:'previous',kind:'phase'},{date:start,label:'first',kind:'phase'}];
 assert.deepEqual(eventsForJstDay(input,week,0).map(e=>e.label),['first','last']);
 assert.deepEqual(eventsForJstDay(input,week,1).map(e=>e.label),['next']);
});
test('assigns full moon and exact aspects to their Japanese dates',()=>{
 const monday=eventsForJstDay(events,week,0);
 assert.deepEqual(monday.map(e=>e.label),['満月','太陽スクエア冥王星']);
 assert.equal(monday[0].date.toISOString().slice(0,16),'2026-10-26T04:12');
 assert.ok(Math.abs(Astronomy.MoonPhase(monday[0].date)-180)<.001);
 assert.equal(eventsForJstDay(events,week,4).length,0);
 assert.equal(eventsForJstDay(events,week,5)[0].label,'水星スクエア火星');
 assert.equal(compactEventLabel(monday[1]),'太陽 90° 冥王星');
});
test('aspect times have the claimed separation and remain inside the week',()=>{
 const names={太陽:Astronomy.Body.Sun,水星:Astronomy.Body.Mercury,金星:Astronomy.Body.Venus,火星:Astronomy.Body.Mars,木星:Astronomy.Body.Jupiter,土星:Astronomy.Body.Saturn,天王星:Astronomy.Body.Uranus,海王星:Astronomy.Body.Neptune,冥王星:Astronomy.Body.Pluto};
 const longitude=(body,date)=>Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon;
 assert.equal(new Set(events.map(e=>e.date.toISOString()+e.label)).size,events.length);
 for(const event of events){
  assert.ok(event.date>=jstInstant(week,0)&&event.date<jstInstant(week,7));
  if(event.kind==='aspect'){
   const distance=Math.abs(longitude(names[event.planets[0]],event.date)-longitude(names[event.planets[1]],event.date));
   assert.ok(Math.abs(Math.min(distance,360-distance)-event.aspectAngle)<.001);
  }
 }
});
test('planetary ingresses are real sign changes and use JST when grouped',()=>{
 const date=new Date('2026-02-16T00:00:00Z');
 const ingress=weeklyEvents(date).find(e=>e.kind==='ingress');
 assert.equal(ingress.label,'太陽 魚座へ');
 const signAt=stamp=>Math.floor(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun,new Date(stamp),true)).elon/30);
 assert.equal(signAt(ingress.date.getTime()-60000),10);
 assert.equal(signAt(ingress.date.getTime()+60000),11);
 assert.ok(eventsForJstDay([ingress],date,3).includes(ingress));
});

test('timeline retains every event and keeps pre-5am events outside the displayed hours',()=>{
 const input=[0,4,5,13,13+59/60,23+59/60].map((hour,index)=>({date:new Date(jstInstant(week,0).getTime()+Math.round(hour*3600000)),label:String(index),symbol:'□',kind:'aspect'}));
 const timeline=timelineForDay(input);
 assert.equal(timeline.beforeHours.length,2);assert.equal(timeline.hours.length,19);
 assert.equal(timeline.hours[0].length,1);assert.equal(timeline.hours[8].length,2);assert.equal(timeline.hours[18].length,1);
 assert.equal(new Set([...timeline.beforeHours,...timeline.hours.flat()]).size,input.length);
 assert.deepEqual(jstClock(input[4].date),{hour:13,minute:59});
});
