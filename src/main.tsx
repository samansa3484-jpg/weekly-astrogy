import TransitChart from './TransitChart';
import React,{useEffect,useState} from 'react';import * as Astronomy from 'astronomy-engine';import{createRoot}from'react-dom/client';import './style.css';
const days=['MON','TUE','WED','THU','FRI','SAT','SUN'];

// Weeks start on Monday in Japan; use UTC calendar dates to avoid timezone drift.
const weekMonday=(date:Date)=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d;};
const dateKey=(date:Date)=>date.toISOString().slice(0,10);
const shiftWeek=(date:Date,weeks:number)=>new Date(date.getTime()+weeks*7*86400000);
const initialWeek=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(key:string)=>Number(parts.find(p=>p.type===key)?.value);return weekMonday(new Date(Date.UTC(get('year'),get('month')-1,get('day'))));};
const themes=['整理して手放す','視野を広げる','丁寧に整える','つながりを広げる','バランスをとる','深く見つめる','次の一歩を描く'];
const questions=['今、手放したいことは？','今、学びたいことは？','今、整えたいことは？','今、つながりたい人は？','心と体のために意識したいことは？','今、深めたい考えは？','これから試したいことは？'];
const nights=['手放せたことは？','心が和らいだ瞬間は？','丁寧にできたことは？','対話から得た気づきは？','自分を労えたことは？','心が落ち着いた瞬間は？','踏み出せた一歩は？'];
// Tropical geocentric Moon longitude, with day boundaries in Japan Standard Time.
const signs=['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座'];
const jstInstant=(monday:Date,offset:number,hour=0)=>new Date(monday.getTime()+offset*86400000+(hour-9)*3600000);
const moonSignAt=(date:Date)=>Math.floor(Astronomy.EclipticGeoMoon(date).lon/30)%12;
const formatJstTime=(date:Date)=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
function moonSignForDay(monday:Date,day:number){
 const start=jstInstant(monday,day),end=jstInstant(monday,day+1),first=moonSignAt(start);
 const last=moonSignAt(new Date(end.getTime()-1000));
 if(first===last)return signs[first];
 let lo=start.getTime(),hi=end.getTime();
 for(let i=0;i<28;i++){const mid=Math.floor((lo+hi)/2);if(moonSignAt(new Date(mid))===first)lo=mid;else hi=mid;}
 return signs[first]+' → '+signs[last]+'（'+formatJstTime(new Date(hi))+'〜）';
}
const moonPhaseForDay=(monday:Date,day:number)=>Astronomy.MoonPhase(jstInstant(monday,day,12))/360;
function MoonPhaseIcon({fraction}:{fraction:number}){
  const radius=9, f=Math.max(0,Math.min(1,fraction));
  // SVG mask shows the illuminated portion: waxing on right, waning on left.
  const waxing=f<0.5, illumination=waxing?f*2:(1-f)*2;
  const bulge=radius*Math.abs(2*illumination-1);
  const sweep=illumination>0.5?1:0;
  const bright=illumination===0?null:illumination===1?<circle cx="12" cy="12" r={radius} fill="#dec48d"/>:
    <path d={waxing
      ?`M12 3 A9 9 0 0 1 12 21 A${bulge} 9 0 0 ${sweep} 12 3 Z`
      :`M12 3 A9 9 0 0 0 12 21 A${bulge} 9 0 0 ${sweep?0:1} 12 3 Z`
    } fill="#dec48d"/>;
  return <svg className="moon-phase-icon" viewBox="0 0 24 24" role="img" aria-label="計算した月相のイラスト"><circle cx="12" cy="12" r="9" fill="#4c5e75"/>{bright}<circle cx="12" cy="12" r="9" fill="none" stroke="#b89d73" strokeWidth=".75"/></svg>;
}
const sampleEvents:Record<number,{symbol:string;name:string;meaning:string}>={
  0:{symbol:'◐',name:'月相イベント',meaning:'見直しのきっかけ'},
  2:{symbol:'☿',name:'天体の動き',meaning:'考えを整理する'},
  4:{symbol:'✧',name:'主要アスペクト',meaning:'新しい視点を試す'}
};

// Calculated planetary sign ingresses (tropical, geocentric). All displayed times use JST.
// This is a first, deliberately limited weekly event feed; aspects and stations come later.
type AstroEvent={date:Date;label:string;symbol:string;kind:'ingress'|'phase'|'aspect'};
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

const aspectDefs=[{angle:0,name:'合',symbol:'☌'},{angle:60,name:'六',symbol:'⚹'},{angle:90,name:'矩',symbol:'□'},{angle:120,name:'三',symbol:'△'},{angle:180,name:'衝',symbol:'☍'}];
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
      if(exact<finish)found.push({date:exact,label:first.name+aspect.name+second.name,symbol:aspect.symbol,kind:'aspect'});
     }
     previous=next;old=current;
    }
   }
  }
 }
 return found;
}
const weeklyEvents=(week:Date):AstroEvent[]=>{
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
const eventText=(event:AstroEvent)=>event.symbol+' '+new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(event.date)+' '+event.label;

// Interpretive suggestions, not astronomical facts or predictions.
// Rules use the calculated event types; no personal natal information is assumed.
const guidanceByEvent:Record<string,{keyword:string;detail:string;good:string[];theme:string;question:string}>={
 '新月':{keyword:'新しい可能性に目を向ける週',detail:'今の関心を確かめ、始めたいことを小さな行動にしてみましょう。',good:['気になることを言葉にする','小さな目標を決める','最初の一歩を試す'],theme:'新しい一歩を選ぶ',question:'今の自分が試してみたい、小さな一歩は何ですか？'},
 '満月':{keyword:'積み重ねを確かめる週',detail:'これまでの経験から得たことを見つけ、次の選択に生かしてみましょう。',good:['できたことを振り返る','感謝を伝える','次に生かす経験を選ぶ'],theme:'実りに気づく',question:'これまでの経験から、どんな力が育っていますか？'},
 '上弦の月':{keyword:'選択を行動につなげる週',detail:'目標に近づくために、今できることを一つ選んでみましょう。',good:['優先順位を決める','小さな工夫を試す','必要な助けを探す'],theme:'行動を整える',question:'今あるリソースで、どんな工夫ができますか？'},
 '下弦の月':{keyword:'振り返りから整える週',detail:'今の自分に合う方法を見直し、次の段階への余白をつくりましょう。',good:['経験を整理する','役立つ習慣を選び直す','休息の時間を確保する'],theme:'整えて次へ',question:'今週、少し整えておきたいことは何ですか？'},
 'aspect':{keyword:'関係と可能性を見つめる週',detail:'人との関わりや異なる視点を、選択肢を広げるヒントにしてみましょう。',good:['異なる考えに耳を傾ける','自分の希望を伝える','選択肢を一つ増やす'],theme:'視点を広げる',question:'別の視点から見ると、どんな可能性がありますか？'},
 'ingress':{keyword:'新しい視点を取り入れる週',detail:'関心や取り組み方を見直し、今の自分に合う方向を探ってみましょう。',good:['新しい方法を調べる','気になることを試す','大切にしたいことを確認する'],theme:'可能性を探す',question:'今、どんな新しい選択肢が見えていますか？'},
 'quiet':{keyword:'自分のペースを大切にする週',detail:'日々の小さな変化に目を向け、自分らしい歩み方を選んでみましょう。',good:['自分の調子を確かめる','心地よい習慣を育てる','一歩を振り返る'],theme:'自分のペースで',question:'今の自分にとって、心地よい一歩は何ですか？'}
};
function weeklyGuidance(events:AstroEvent[]){
 const phase=events.find(e=>e.kind==='phase');
 return guidanceByEvent[phase?.label||events.find(e=>e.kind==='aspect')?.kind||events.find(e=>e.kind==='ingress')?.kind||'quiet'];
}
function dailyGuidance(events:AstroEvent[],week:Date,day:number,weekly:ReturnType<typeof weeklyGuidance>){
 const begin=jstInstant(week,day).getTime(),end=jstInstant(week,day+1).getTime();
 const today=events.find(e=>e.date.getTime()>=begin&&e.date.getTime()<end);
 if(!today)return {theme:weekly.theme,question:weekly.question};
 const guide=guidanceByEvent[today.kind==='phase'?today.label:today.kind];
 return {theme:guide.theme,question:guide.question};
}
type Data=Record<string,string>;
function App(){
const [week,setWeek]=useState<Date>(initialWeek);
const weekId=dateKey(week);
const storage='weekly-astrology-'+weekId+'-v1';
const [data,setData]=useState<Data>(()=>{try{return JSON.parse(localStorage.getItem('weekly-astrology-'+dateKey(initialWeek())+'-v1')||'{}')}catch{return{}}});
const changeWeek=(next:Date)=>{const key='weekly-astrology-'+dateKey(next)+'-v1';try{setData(JSON.parse(localStorage.getItem(key)||'{}'))}catch{setData({})}setWeek(next);};
useEffect(()=>{localStorage.setItem(storage,JSON.stringify(data))},[data,storage]);
const calculatedEvents=weeklyEvents(week);
const guidance=weeklyGuidance(calculatedEvents);
const symbolicEvent=calculatedEvents.find(event=>event.kind==='phase')||calculatedEvents[0];
const symbolicDate=symbolicEvent?.date||jstInstant(week,0,12);
const dailySuggestions=days.map((_,i)=>dailyGuidance(calculatedEvents,week,i,guidance));
const moonSigns=days.map((_,i)=>moonSignForDay(week,i));
const moonPhases=days.map((_,i)=>moonPhaseForDay(week,i));
const dates=days.map((_,i)=>{const d=new Date(week.getTime()+i*86400000);return (d.getUTCMonth()+1)+'/'+d.getUTCDate()});
const last=shiftWeek(week,1);last.setUTCDate(last.getUTCDate()-1);
const weekTitle=week.getUTCFullYear()+'年'+(week.getUTCMonth()+1)+'月'+week.getUTCDate()+'日 — '+last.getUTCFullYear()+'年'+(last.getUTCMonth()+1)+'月'+last.getUTCDate()+'日';
const field=(key:string,placeholder='',multi=false)=>multi?<textarea aria-label={key} placeholder={placeholder} value={data[key]||''} onChange={e=>setData(v=>({...v,[key]:e.target.value}))}/>:<input aria-label={key} placeholder={placeholder} value={data[key]||''} onChange={e=>setData(v=>({...v,[key]:e.target.value}))}/>;return <><div className="toolbar"><strong>☾ WEEKLY ASTROLOGY</strong><span>{weekTitle}</span><nav className="week-navigation" aria-label="週の移動"><button type="button" onClick={()=>changeWeek(shiftWeek(week,-1))}>‹ 前の週</button><button type="button" onClick={()=>changeWeek(initialWeek())}>今週</button><button type="button" onClick={()=>changeWeek(shiftWeek(week,1))}>次の週 ›</button><input aria-label="表示したい日付" title="表示したい日付を選択" type="date" value={weekId} onChange={e=>{if(e.target.value)changeWeek(weekMonday(new Date(e.target.value+'T00:00:00Z')))}}/></nav><button onClick={()=>window.print()}>印刷・PDF保存</button></div><main className="sheet"><aside><header className="mast"><svg className="mast-art" viewBox="0 0 340 108" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4d7e8"/><stop offset=".65" stopColor="#e4edf0"/><stop offset="1" stopColor="#fff9ed"/></linearGradient></defs><rect width="340" height="108" fill="url(#sky)"/><path d="M29 16a19 19 0 1 0 22 28A19 19 0 0 1 29 16Z" fill="#e5c88a"/>{[[78,15],[110,39],[250,22],[283,48],[316,13],[66,79],[297,86]].map(([x,y],i)=><g key={i} stroke="#b79a64" strokeWidth="1"><path d={`M${x-5} ${y}h10 M${x} ${y-5}v10`}/></g>)}<g fill="none" stroke="#8ba8a2" strokeWidth="1.4" strokeLinecap="round"><path d="M318 108Q289 76 307 25M316 96Q329 69 334 48M9 108Q28 78 20 49"/>{[[304,36,-11,-8],[308,51,13,-8],[307,65,-14,-8],[320,79,13,-9],[21,62,11,-7],[17,78,-12,-7]].map(([x,y,dx,dy],i)=><path key={i} d={`M${x} ${y}q${dx} ${dy} ${dx*1.4} ${dy*.4}q${-dx*.8} ${-dy*.9} ${-dx*1.4} ${-dy*.4}`}/>)}</g></svg><h1>WEEKLY<br/>ASTROLOGY</h1><small>{weekTitle}</small></header><section><h3>今週のキーワード</h3><p>{guidance.keyword}</p><small>{guidance.detail}</small></section><section><h3>今週の星の流れ</h3>{calculatedEvents.length?calculatedEvents.filter(e=>e.kind!=='aspect').concat(calculatedEvents.filter(e=>e.kind==='aspect').slice(0,3)).sort((a,b)=>a.date.getTime()-b.date.getTime()).slice(0,5).map((event,i)=><p key={i}>{eventText(event)}</p>):<p>今週は主要天体のサイン移動・月相の節目はありません。</p>}<small className="notice">※月相・月の星座・上記の月相節目と天体サイン移動は計算値です。キーワード・行動提案・朝の問いは計算イベントをもとにした解釈例です。逆行・日別イベントはまだ仮表示です。</small></section><section><h3>THIS WEEK IS GOOD FOR…</h3>{guidance.good.map(item=><p key={item}>・{item}</p>)}</section><section><h3>THIS WEEK'S DIRECTION</h3>{['RELEASE｜手放す','LEARN｜学ぶ','PREPARE｜準備する'].map((v,i)=><label className="check" key={v}><input type="checkbox" checked={data['check'+i]==='yes'} onChange={e=>setData(d=>({...d,['check'+i]:e.target.checked?'yes':''}))}/>{v}</label>)}</section><TransitChart date={symbolicDate} label={symbolicEvent?.label||'週のはじまり'} /></aside><div className="right"><div className="actions"><b>ONE ACTION</b>{[0,1,2].map(i=><label key={i}><span>{i+1}</span>{field('action'+i,'今週の小さな行動')}</label>)}</div><div className="week">{days.map((d,i)=><article key={d}><div className="dayhead"><div className="date-line"><div className="date">{dates[i]}</div><b className="weekday">{d}</b></div><div className="moon-sign" title="月の星座・移動時刻は天体計算に基づき日本時間で表示"><MoonPhaseIcon fraction={moonPhases[i]}/> {moonSigns[i]}</div><div className="event-slot">{sampleEvents[i]&&<div className="astro-event" aria-label="天体イベントの仮表示"><div className="astro-event-title"><span aria-hidden="true">{sampleEvents[i].symbol}</span> {sampleEvents[i].name}</div><div className="astro-event-meaning">{sampleEvents[i].meaning}</div></div>}</div><h4>{dailySuggestions[i].theme}</h4><p>{dailySuggestions[i].question}</p></div><div className="hours">{Array.from({length:19},(_,h)=><label className="hour" key={h}><time>{String(h+5).padStart(2,'0')}:00</time>{field('slot'+i+'-'+h)}</label>)}</div><div className="night"><div className="night-question">{nights[i]}</div><div className="night-writing"><textarea aria-label={`night${i}`} value={data['night'+i]||''} onChange={e=>setData(v=>({...v,['night'+i]:e.target.value}))}/></div></div></article>)}</div><div className="reflection"><h2>WEEKLY REFLECTION <small>今週を振り返って、気づきや次の一歩を見つけましょう。</small></h2><div className="refgrid">{[['GOOD（よかったこと）','今週、やってみてよかったことは？'],['NEW（新しく気づいたこと）','新しく気づいたことや初めての体験は？'],['感謝したいこと','今週、感謝したい人・こと・出来事は？'],['小さな一歩','来週につなげたい小さな一歩は？']].map(([name,q],i)=><section key={name}><h3>{name}</h3><small>{q}</small>{field('reflection'+i,'',true)}</section>)}</div></div></div><footer><b>THIS WEEK'S MOOD</b>{['😊 とても良い','🙂 良い','😐 ふつう','😕 ちょっと疲れた','😣 とても疲れた'].map(v=><label key={v}><input type="radio" name="mood" checked={data.mood===v} onChange={()=>setData(d=>({...d,mood:v}))}/>{v}</label>)}<span>メモ {field('memo')}</span></footer></main></>};createRoot(document.getElementById('root')!).render(<App/>);