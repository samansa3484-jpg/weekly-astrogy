import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {placidusHouses} from '../src/houses.ts';
const fixtures=JSON.parse(fs.readFileSync(new URL('./placidus-reference.json',import.meta.url),'utf8'));
const delta=(a,b)=>Math.abs(((a-b+540)%360)-180);
for(const fixture of fixtures.cases){
 test(`Placidus matches Swiss Ephemeris within one arcsecond: ${fixture.date}, ${fixture.latitude}, ${fixture.longitude}`,()=>{
  const actual=placidusHouses(new Date(fixture.date),fixture.latitude,fixture.longitude);
  assert.equal(actual.cusps.length,12);
  actual.cusps.forEach((cusp,i)=>{assert.ok(Number.isFinite(cusp)&&cusp>=0&&cusp<360);assert.ok(delta(cusp,fixture.cusps[i])<1/3600);});
  assert.equal(actual.asc,actual.cusps[0]);assert.equal(actual.mc,actual.cusps[9]);
  for(let i=0;i<6;i++)assert.ok(delta(actual.cusps[i]+180,actual.cusps[i+6])<1e-8);
 });
}
test('location and time alter the houses',()=>{
 const date=new Date('2026-10-26T04:12:00Z');
 const tokyo=placidusHouses(date,35.6762,139.6503);
 assert.ok(delta(tokyo.asc,placidusHouses(date,34.6937,135.5023).asc)>1);
 assert.ok(delta(tokyo.mc,placidusHouses(new Date(date.getTime()+3600000),35.6762,139.6503).mc)>10);
});
test('rejects invalid inputs and unsupported polar latitudes',()=>{
 for(const latitude of [NaN,91,70,-70])assert.throws(()=>placidusHouses(new Date(),latitude,0));
 assert.throws(()=>placidusHouses(new Date('invalid'),35,139));
 assert.throws(()=>placidusHouses(new Date(),35,181));
});
