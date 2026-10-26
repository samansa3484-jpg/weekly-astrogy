import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,parseBackup,restoreBackup} from '../src/backup.ts';
const key=week=>`weekly-astrology-${week}-v1`;
function store(entries={}){const map=new Map(Object.entries(entries));return {get length(){return map.size},key:index=>[...map.keys()][index]??null,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};}
const fixture=weeks=>({format:'weekly-astrology-backup',version:1,createdAt:'2026-10-26T10:00:00Z',weeks});
test('exports all recorded weeks and the latest edit, without unrelated storage',()=>{
 const storage=store({[key('2026-10-26')]:JSON.stringify({action0:'old'}),[key('2026-11-02')]:JSON.stringify({night0:'ありがとう\n次の一歩'}),[key('2026-11-09')]:'{}',unrelated:'private'});
 const result=createBackup(storage,{week:'2026-10-26',data:{action0:'最新の予定'}});
 assert.equal(result.weeks.length,2);assert.equal(result.weeks[0].data.action0,'最新の予定');assert.equal(result.weeks[1].data.night0,'ありがとう\n次の一歩');assert.ok(!JSON.stringify(result).includes('private'));assert.deepEqual(parseBackup(JSON.stringify(result)),result);
});
test('default merge retains existing values, including intentionally empty ones',()=>{
 const storage=store({[key('2026-10-26')]:JSON.stringify({action0:'現在の予定',memo:''}),unrelated:'keep'});
 const backup=fixture([{week:'2026-10-26',data:{action0:'以前の予定',memo:'old',night0:'新しい振り返り'}},{week:'2026-11-02',data:{reflection0:'感謝'}}]);
 assert.equal(restoreBackup(storage,backup,'keep'),2);
 assert.deepEqual(JSON.parse(storage.getItem(key('2026-10-26'))),{action0:'現在の予定',memo:'',night0:'新しい振り返り'});assert.equal(storage.getItem('unrelated'),'keep');
 assert.equal(restoreBackup(storage,backup,'keep'),0);
});
test('explicit replacement overwrites only matching fields',()=>{
 const storage=store({[key('2026-10-26')]:JSON.stringify({action0:'現在',night0:'残す'})});
 restoreBackup(storage,fixture([{week:'2026-10-26',data:{action0:'ファイル'}}]),'replace');
 assert.deepEqual(JSON.parse(storage.getItem(key('2026-10-26'))),{action0:'ファイル',night0:'残す'});
});
test('rejects unsupported, malformed, duplicate, invalid-date and unsafe-field data',()=>{
 const good=fixture([{week:'2026-10-26',data:{memo:'ok'}}]);
 for(const value of [{...good,version:2},{...good,weeks:[{week:'2026-10-27',data:{}}]},{...good,weeks:[{week:'2026-02-30',data:{}}]},{...good,weeks:[...good.weeks,...good.weeks]},{...good,weeks:[{week:'2026-10-26',data:{memo:42}}]},{...good,weeks:[{week:'2026-10-26',data:JSON.parse('{"__proto__":"bad"}')}]}])assert.throws(()=>parseBackup(JSON.stringify(value)));
 assert.throws(()=>parseBackup('not JSON'));
});
test('validates the entire file before changing any existing week',()=>{
 const original=JSON.stringify({memo:'元の記録'});const storage=store({[key('2026-10-26')]:original});
 assert.throws(()=>restoreBackup(storage,fixture([{week:'2026-10-26',data:{memo:'new'}},{week:'bad',data:{}}]),'replace'));
 assert.equal(storage.getItem(key('2026-10-26')),original);
});
test('rolls back earlier writes when storage fails',()=>{
 const storage=store({[key('2026-10-26')]:JSON.stringify({memo:'元の記録'})});const write=storage.setItem;let calls=0;
 storage.setItem=(key,value)=>{if(++calls===2)throw new Error('quota');return write(key,value)};
 assert.throws(()=>restoreBackup(storage,fixture([{week:'2026-10-26',data:{memo:'new'}},{week:'2026-11-02',data:{memo:'new week'}}]),'replace'),/元に戻しました/);
 assert.deepEqual(JSON.parse(storage.getItem(key('2026-10-26'))),{memo:'元の記録'});assert.equal(storage.getItem(key('2026-11-02')),null);
});
