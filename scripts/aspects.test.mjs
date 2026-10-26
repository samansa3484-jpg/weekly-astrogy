import {test} from 'node:test';
import assert from 'node:assert/strict';
import {majorAspects} from '../src/aspects.ts';
const pair=(a,b)=>majorAspects([{name:'A',longitude:a},{name:'B',longitude:b}]);
test('classifies all five major angles and colors',()=>{
 for(const [angle,kind] of [[0,'conjunction'],[60,'soft'],[90,'hard'],[120,'soft'],[180,'hard']]){
  const result=pair(0,angle);assert.equal(result.length,1);assert.equal(result[0].angle,angle);assert.equal(result[0].kind,kind);
 }
});
test('wraps Aries and accepts the six-degree boundary',()=>{
 assert.equal(pair(359,1)[0].angle,0);
 assert.equal(pair(350,50)[0].angle,60);
 assert.equal(pair(0,66)[0].orb,6);
 assert.equal(pair(0,66.001).length,0);
 assert.equal(pair(0,174)[0].angle,180);
 assert.equal(pair(0,173.999).length,0);
});
test('excludes minor aspects and duplicate or self pairs',()=>{
 assert.equal(pair(0,150).length,0);assert.equal(pair(0,45).length,0);
 const result=majorAspects([{name:'A',longitude:0},{name:'B',longitude:60},{name:'C',longitude:120}]);
 assert.equal(result.length,3);assert.equal(new Set(result.map(a=>[a.first.name,a.second.name].join('-'))).size,3);
 assert.equal(majorAspects([]).length,0);
});
