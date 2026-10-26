import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectedWeeklyEvents,weeklyGuidance,explainEvent} from '../src/weekly-guidance.ts';
const event=(day,kind,label)=>({date:new Date(`2026-10-${day}T00:00:00Z`),kind,label,symbol:''});
test('busy-week highlights retain lunar phases and ingresses without inventing events',()=>{
 const input=[event(26,'aspect','A'),event(27,'aspect','B'),event(28,'aspect','C'),event(29,'aspect','D'),event(30,'ingress','太陽 蠍座へ'),event(31,'phase','満月')];
 const original=[...input];
 const selected=selectedWeeklyEvents(input);
 assert.equal(selected.length,4);
 assert.ok(selected.includes(input[4]));assert.ok(selected.includes(input[5]));
 assert.ok(selected.every(e=>input.includes(e)));
 assert.deepEqual(input,original);
 assert.ok(selected.every((e,i)=>!i||e.date>=selected[i-1].date));
});
test('quiet weeks have no fabricated highlights and still offer optional actions',()=>{
 assert.deepEqual(selectedWeeklyEvents([]),[]);
 assert.equal(weeklyGuidance([]).good.length,5);
});
test('real event descriptions and weekly actions are available for each supported event type',()=>{
 for(const sample of [event(26,'phase','満月'),event(27,'ingress','太陽 蠍座へ'),{...event(28,'aspect','太陽スクエア冥王星'),aspectAngle:90,planets:['太陽','冥王星']}]){
  assert.ok(explainEvent(sample).length>0);
  const actions=weeklyGuidance([sample]).good;
  assert.equal(actions.length,5);assert.equal(new Set(actions).size,5);
 }
});
