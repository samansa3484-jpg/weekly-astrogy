import * as Astronomy from 'astronomy-engine';
import {eventsForJstDay,jstInstant,signs} from './events.ts';
import type {AstroEvent} from './events.ts';

type DailyGuidance={theme:string;question:string;night:string;basis:string};
const phases:Record<string,Omit<DailyGuidance,'basis'>>={
 '新月':{theme:'願いを小さな一歩に',question:'今日、始めてみたい小さなことは？',night:'今日まいた願いの種は？'},
 '満月':{theme:'実りを受け取る',question:'今、受け取りたい実りは何ですか？',night:'今日、気づいた自分の実りは？'},
 '上弦の月':{theme:'選んで試してみる',question:'一歩進むために、何を選びますか？',night:'今日、試してみた工夫は？'},
 '下弦の月':{theme:'手放して余白をつくる',question:'次の一歩のために、何を手放しますか？',night:'今日、手放せたことは？'},
};
const lunarThemes=[
 {theme:'自分の一歩を選ぶ',focus:'自分の希望'},
 {theme:'心地よさを大切に',focus:'心地よさ'},
 {theme:'言葉と学びを楽しむ',focus:'学ぶ楽しさ'},
 {theme:'安心できる時間を',focus:'安心できる時間'},
 {theme:'自分らしい楽しさを',focus:'自分らしい楽しさ'},
 {theme:'日々を丁寧に整える',focus:'丁寧な暮らし'},
 {theme:'心地よい関わりを',focus:'人との対話'},
 {theme:'大切な思いに触れる',focus:'大切な思い'},
 {theme:'可能性に目を向ける',focus:'これからの可能性'},
 {theme:'小さく積み重ねる',focus:'毎日の積み重ね'},
 {theme:'新しい視点を探す',focus:'新しい視点'},
 {theme:'心に余白をつくる',focus:'心の休息'},
];

// These are reflection prompts, not predictions. Prefer a phase, then ingress,
// then the first exact aspect; quiet days use the Moon's sign at noon JST.
export function dailyGuidance(events:AstroEvent[],week:Date,day:number):DailyGuidance{
 const today=eventsForJstDay(events,week,day);
 const event=today.find(e=>e.kind==='phase')||today.find(e=>e.kind==='ingress')||today.find(e=>e.kind==='aspect');
 if(event?.kind==='phase'&&phases[event.label])return {...phases[event.label],basis:event.label};
 if(event?.kind==='ingress')return {theme:'新しい流れを試す',question:'今までと少し違う方法を試すなら？',night:'新しいやり方で気づいたことは？',basis:event.label};
 if(event?.kind==='aspect'){
  const basis=event.label,angle=event.aspectAngle;
  if(angle===0)return event.planets?.includes('水星')
   ?{theme:'思いを言葉にする',question:'今の気持ちを、どんな言葉にしたい？',night:'今日、言葉にできた思いは？',basis}
   :{theme:'大切なことに集中',question:'今日、いちばん力を注ぎたいことは？',night:'大切なことに使えた時間は？',basis};
  if(angle===60||angle===120){
   if(event.planets?.includes('金星')&&event.planets.includes('木星'))return {theme:'楽しさを分かち合う',question:'誰と、どんな楽しさを分かち合いたい？',night:'今日、心が豊かになった瞬間は？',basis};
   if(event.planets?.includes('水星'))return {theme:'対話から広げる',question:'誰のどんな考えに耳を傾けたい？',night:'対話から得た気づきは？',basis};
   return {theme:'得意を生かす',question:'今ある力を、どこで生かせそうですか？',night:'今日、自然にできたことは？',basis};
  }
  if(event.planets?.includes('水星'))return {theme:'考えを整理する',question:'伝える前に、確かめておきたいことは？',night:'考えを整理できた場面は？',basis};
  return {theme:'自分のペースを整える',question:'無理なく進むために、何を調整しますか？',night:'自分を労えたことは？',basis};
 }
 const sign=Math.floor(Astronomy.EclipticGeoMoon(jstInstant(week,day,12)).lon/30)%12;
 const {theme,focus}=lunarThemes[sign];
 const questions=[`今日、${focus}のために何ができますか？`,`今日、${focus}をどう大切にしたいですか？`,`${focus}につながる小さな一歩は？`];
 const nights=[`今日、${focus}を感じた場面は？`,`${focus}のためにできたことは？`,`${focus}についての気づきは？`];
 return {theme,question:questions[day%3],night:nights[day%3],basis:`正午の月：${signs[sign]}（日本時間）`};
}
