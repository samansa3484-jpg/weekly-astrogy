import * as Astronomy from 'astronomy-engine';

export const signs=['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座'];
export const jstInstant=(monday:Date,offset:number,hour=0)=>new Date(monday.getTime()+offset*86400000+(hour-9)*3600000);

// Calculated planetary sign ingresses (tropical, geocentric). All displayed times use JST.
// This feed covers lunar phases, planetary ingresses, and exact major aspects excluding the Moon.
export type AstroEvent={date:Date;label:string;symbol:string;kind:'ingress'|'phase'|'aspect';aspectAngle?:number;planets?:[string,string]};
const planetDefs=[
 {body:Astronomy.Body.Sun,name:'太陽',symbol:'☉'},
 {body:Astronomy.Body.Mercury,name:'水星',symbol:'☿'},
 {body:Astronomy.Body.Venus,name:'金星',symbol:'♀'},
 {body:Astronomy.Body.Mars,name:'火星',symbol:'♂'},
 {body:Astronomy.Body.Jupiter,name:'木星',symbol:'♃'},
 {body:Astronomy.Body.Saturn,name:'土星',symbol:'♄'},
 {body:Astronomy.Body.Uranus,name:'天王星',symbol:'♅'},
 {body:Astronomy.Body.Neptune,name:'海王星',symbol:'♆'},
 {body:Astronomy.Body.Pluto,name:'冥王星',symbol:'♇'}
];
const planetSign=(body:Astronomy.Body,date:Date)=>Math.floor(Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon/30)%12;

const aspectDefs=[{angle:0,name:'合',symbol:'☌'},{angle:60,name:'セクスタイル',symbol:'⚹'},{angle:90,name:'スクエア',symbol:'□'},{angle:120,name:'トライン',symbol:'△'},{angle:180,name:'オポジション',symbol:'☍'}];
const longitudeAt=(body:Astronomy.Body,date:Date)=>Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon;
const signedAngle=(value:number)=>((value+180)%360+360)%360-180;
const aspectOffset=(first:Astronomy.Body,second:Astronomy.Body,date:Date,target:number)=>signedAngle(longitudeAt(first,date)-longitudeAt(second,date)-target);
function calculateAspects(begin:Date,finish:Date):AstroEvent[]{
 const found:AstroEvent[]=[];
 for(let i=0;i<planetDefs.length;i++)for(let j=i+1;j<planetDefs.length;j++){
  const first=planetDefs[i],second=planetDefs[j];
  for(const aspect of aspectDefs){
   const targets=aspect.angle===0||aspect.angle===180?[aspect.angle]:[aspect.angle,-aspect.angle];
   for(const target of targets){
    let previous=begin,old=aspectOffset(first.body,second.body,previous,target);
    for(let stamp=begin.getTime()+6*3600000;stamp<=finish.getTime();stamp+=6*3600000){
     const next=new Date(stamp),current=aspectOffset(first.body,second.body,next,target);
     if(old*current<=0&&Math.abs(old-current)<90){
      let lo=previous.getTime(),hi=stamp,loValue=old;
      for(let k=0;k<23;k++){
       const mid=Math.floor((lo+hi)/2),value=aspectOffset(first.body,second.body,new Date(mid),target);
       if(loValue*value<=0)hi=mid;else{lo=mid;loValue=value;}
      }
      const exact=new Date(hi);
      if(exact<finish)found.push({date:exact,label:first.name+aspect.name+second.name,symbol:aspect.symbol,kind:'aspect',aspectAngle:aspect.angle,planets:[first.name,second.name]});
     }
     previous=next;old=current;
    }
   }
  }
 }
 return found;
}
export const weeklyEvents=(week:Date):AstroEvent[]=>{
 const begin=jstInstant(week,0),finish=jstInstant(week,7),found:AstroEvent[]=[];
 for(const planet of planetDefs){
  let prev=begin,prevSign=planetSign(planet.body,prev);
  for(let stamp=begin.getTime()+6*3600000;stamp<=finish.getTime();stamp+=6*3600000){
   const next=new Date(stamp),nextSign=planetSign(planet.body,next);
   if(nextSign!==prevSign){
    let lo=prev.getTime(),hi=stamp;
    for(let k=0;k<24;k++){const mid=Math.floor((lo+hi)/2);if(planetSign(planet.body,new Date(mid))===prevSign)lo=mid;else hi=mid;}
    const exact=new Date(hi);
    if(exact<finish)found.push({date:exact,label:planet.name+' '+signs[nextSign]+'へ',symbol:planet.symbol,kind:'ingress'});
   }
   prev=next;prevSign=nextSign;
  }
 }
 // Astronomy Engine's quarter search returns the next lunar quarter after the start.
 let quarter=Astronomy.SearchMoonQuarter(new Date(begin.getTime()-1000));
 for(let n=0;n<3;n++){
  const exact=quarter.time.date;
  if(exact>=finish)break;
  if(exact>=begin){const labels=['新月','上弦の月','満月','下弦の月'];found.push({date:exact,label:labels[quarter.quarter],symbol:'☾',kind:'phase'});}
  quarter=Astronomy.NextMoonQuarter(quarter);
 }
 found.push(...calculateAspects(begin,finish));
 return found.sort((x,y)=>x.date.getTime()-y.date.getTime());
};
export const eventText=(event:AstroEvent)=>event.symbol+' '+new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(event.date)+' '+event.label;

// Each displayed date runs from 00:00 JST inclusive to the next midnight exclusive.
export function eventsForJstDay(events:AstroEvent[],week:Date,day:number){
 const begin=jstInstant(week,day).getTime(),end=jstInstant(week,day+1).getTime();
 return events.filter(event=>event.date.getTime()>=begin&&event.date.getTime()<end).sort((a,b)=>a.date.getTime()-b.date.getTime());
}
export const compactEventLabel=(event:AstroEvent)=>event.planets?`${event.planets[0]} ${event.aspectAngle}° ${event.planets[1]}`:event.label;

export function jstClock(date:Date){
 const local=new Date(date.getTime()+9*3600000);
 return {hour:local.getUTCHours(),minute:local.getUTCMinutes()};
}
export function timelineForDay(events:AstroEvent[]){
 return {beforeHours:events.filter(event=>jstClock(event.date).hour<5),hours:Array.from({length:19},(_,index)=>events.filter(event=>jstClock(event.date).hour===index+5))};
}
