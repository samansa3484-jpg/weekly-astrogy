import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyGuidance} from '../src/daily-guidance.ts';
import {weeklyEvents,jstInstant} from '../src/events.ts';
const week=new Date('2026-11-02T00:00:00Z');
const event=(kind,label,extra={})=>({kind,label,date:jstInstant(week,0,10),symbol:'',...extra});
test('pairs morning and evening prompts with the selected lunar phase',()=>{
 const result=dailyGuidance(weeklyEvents(week),week,0);
 assert.equal(result.basis,'下弦の月');assert.match(result.question,/手放/);assert.match(result.night,/手放/);
 const full=dailyGuidance(weeklyEvents(new Date('2026-10-26')),new Date('2026-10-26'),0);
 assert.match(full.question,/実り/);assert.match(full.night,/実り/);
});
test('prefers a phase over an earlier aspect and keeps midnight in the next day',()=>{
 const aspect=event('aspect','earlier',{date:jstInstant(week,0,1),aspectAngle:90,planets:['太陽','火星']});
 const phase=event('phase','新月');
 assert.equal(dailyGuidance([aspect,phase],week,0).basis,'新月');
 assert.notEqual(dailyGuidance([{...phase,date:jstInstant(week,1)}],week,0).basis,'新月');
});
test('distinguishes soft, hard and conjunction prompts',()=>{
 const soft=dailyGuidance([event('aspect','金星セクスタイル木星',{aspectAngle:60,planets:['金星','木星']})],week,0);
 assert.match(soft.question,/楽しさ/);assert.match(soft.night,/豊か/);
 const hard=dailyGuidance([event('aspect','水星スクエア火星',{aspectAngle:90,planets:['水星','火星']})],week,0);
 assert.match(hard.question,/確かめ/);assert.match(hard.night,/整理/);
 const conjunction=dailyGuidance([event('aspect','太陽合水星',{aspectAngle:0,planets:['太陽','水星']})],week,0);
 assert.match(conjunction.question,/言葉/);assert.match(conjunction.night,/言葉/);
});
test('quiet-day prompts use the noon JST Moon and vary without randomness',()=>{
 const first=dailyGuidance([],week,1),second=dailyGuidance([],week,2);
 // The Nov 3 ingress is at 17:27 JST, so the noon Moon is still in Leo.
 assert.match(first.basis,/正午の月：獅子座/);
 assert.match(second.basis,/正午の月：乙女座/);
 assert.notEqual(first.question,second.question);assert.notEqual(first.night,second.night);
 assert.deepEqual(first,dailyGuidance([],week,1));
 const later=dailyGuidance([],new Date('2026-11-09'),1);
 assert.notEqual(first.basis,later.basis);
});
