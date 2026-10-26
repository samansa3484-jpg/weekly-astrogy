import * as Astronomy from 'astronomy-engine';

const signs = ['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座'];
// Vector strokes avoid platform emoji fonts and always inherit the text color.
const zodiacPaths = [
  'M12 21V10C12 1 2 1 3 8C4 13 8 11 8 8M12 10C12 1 22 1 21 8C20 13 16 11 16 8',
  'M4 2C4 11 20 11 20 2M18 15A6 6 0 1 1 6 15A6 6 0 1 1 18 15',
  'M4 3Q12 7 20 3M4 21Q12 17 20 21M8 5V19M16 5V19',
  'M4 9C8 2 18 3 21 7M9 9A3 3 0 1 1 3 9A3 3 0 1 1 9 9M20 15C16 22 6 21 3 17M21 15A3 3 0 1 1 15 15A3 3 0 1 1 21 15',
  'M9 15A4 4 0 1 1 1 15A4 4 0 1 1 9 15M8 12C3 1 18 0 18 8C18 13 11 17 15 21C18 24 22 20 22 17',
  'M2 5V19M2 9C2 4 7 4 7 9V19M7 9C7 4 12 4 12 9V19M12 9C12 4 17 4 17 9V15C17 20 21 22 23 22M15 22C22 19 24 10 20 9C15 7 15 17 23 19',
  'M3 20H21M3 15H8A6 6 0 1 1 16 15H21',
  'M2 5V19M2 9C2 4 7 4 7 9V19M7 9C7 4 12 4 12 9V19M12 9C12 4 17 4 17 9V17Q17 21 22 19M19 16L22 19L19 22',
  'M4 21L21 4M12 4H21V13M5 10L14 19',
  'M2 8L5 5L9 19L13 5Q18 8 16 15C12 25 25 22 22 16C19 11 12 18 9 21',
  'M2 9L6 5L10 9L14 5L18 9L22 5M2 19L6 15L10 19L14 15L18 19L22 15',
  'M5 2C11 8 11 16 5 22M19 2C13 8 13 16 19 22M3 12H21',
];
const bodies = [
  [Astronomy.Body.Sun,'太陽','☉'], [Astronomy.Body.Moon,'月','☽'],
  [Astronomy.Body.Mercury,'水星','☿'], [Astronomy.Body.Venus,'金星','♀'],
  [Astronomy.Body.Mars,'火星','♂'], [Astronomy.Body.Jupiter,'木星','♃'],
  [Astronomy.Body.Saturn,'土星','♄'], [Astronomy.Body.Uranus,'天王星','♅'],
  [Astronomy.Body.Neptune,'海王星','♆'], [Astronomy.Body.Pluto,'冥王星','♇'],
] as const;
const point = (longitude: number, radius: number) => {
  const angle = (180 - longitude) * Math.PI / 180;
  return {x: 120 + radius * Math.cos(angle), y: 120 - radius * Math.sin(angle)};
};

const phaseMeanings:Record<string,string> = {
  '新月':'願いの種をまき、新しい一歩を選ぶタイミング',
  '上弦の月':'方向を確かめ、小さな行動を重ねるタイミング',
  '満月':'気づきと収穫のタイミング',
  '下弦の月':'経験を振り返り、手放して整えるタイミング',
};

export default function TransitChart({date,label,meaning}:{date:Date;label:string;meaning:string}) {
  const positions = bodies.map(([body,name,symbol]) => {
    const longitude = body === Astronomy.Body.Moon
      ? Astronomy.EclipticGeoMoon(date).lon
      : Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon;
    const minutes = Math.floor((longitude % 30) * 60);
    const degreeText = `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2,'0')}′`;
    return {name,symbol,longitude,degreeText,description: `${signs[Math.floor(longitude / 30)]} ${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2,'0')}′`};
  });
  // Spread nearby labels while keeping each leader anchored to the true longitude.
  const placed: {x:number;y:number}[] = [];
  const offsets = [0,...Array.from({length:22},(_,i)=>[(i+1)*8,-(i+1)*8]).flat(),180];
  const plotted = positions.map(position => {
    const candidates = offsets.flatMap(offset=>[70,56,42,28,14,0].map(radius=>point(position.longitude+offset,radius)));
    const fits = (candidate:{x:number;y:number}) =>
      Math.hypot(Math.abs(candidate.x-120)+16,Math.abs(candidate.y-120)+12)<87 &&
      placed.every(other=>Math.abs(other.x-candidate.x)>=34||Math.abs(other.y-candidate.y)>=26);
    const location = candidates.find(fits) || candidates[0];
    placed.push(location);
    return {...position,location};
  });
  const timestamp = new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
  const moonSign = signs[Math.floor(positions[1].longitude / 30)];
  const eventName = Object.hasOwn(phaseMeanings,label) ? `${moonSign}${label}` : label;
  const eventMeaning = phaseMeanings[label] || meaning;
  const dateParts = new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const part = (type:string) => dateParts.find(p=>p.type===type)?.value;
  const shortTimestamp = `${part('month')}/${part('day')}（${part('weekday')}）${part('hour')}:${part('minute')}頃`;
  return <section className="symbol">
    <h3>WEEK’S SYMBOLIC DAY</h3>
    <p className="symbolic-event"><time dateTime={date.toISOString()} title={`${timestamp}（日本時間）`}>{shortTimestamp}</time><strong className="symbolic-event-name">{eventName}</strong></p>
    <p className="symbolic-meaning">（{eventMeaning}）</p>
    <div className="wheel transit-wheel"><svg viewBox="0 0 240 240" width="100%" height="100%" role="img" aria-label={`${timestamp}の天体配置。牡羊座0度を左に固定した地心黄道図`}>
      <circle cx="120" cy="120" r="115" fill="#fffdf5" stroke="#b69b68"/>
      <circle cx="120" cy="120" r="89" fill="none" stroke="#c9bb9a"/>
      {zodiacPaths.map((path,i) => {const a=point(i*30,89),b=point(i*30,115),t=point(i*30+15,102);return <g key={signs[i]}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c9b58c"/><g data-zodiac={signs[i]} transform={`translate(${t.x-7.5} ${t.y-7.5}) scale(.625)`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><title>{signs[i]}</title><path d={path}/></g></g>})}
      {plotted.map(p => {const a=point(p.longitude,87),t=p.location;return <g key={p.name} data-planet={p.name} data-longitude={p.longitude} aria-label={`${p.name}：${p.description}`}><title>{p.name}：{p.description}</title><line x1={a.x} y1={a.y} x2={t.x} y2={t.y} stroke="#b69b68" strokeWidth=".5"/><circle cx={a.x} cy={a.y} r="1" fill="#b69b68"/><g className="planet-label" transform={`translate(${t.x} ${t.y})`}><rect x="-16" y="-12" width="32" height="24" rx="3" fill="#fffdf5"/><text x="0" y="-3" textAnchor="middle" dominantBaseline="central" fontSize="13" fill="currentColor">{p.symbol}</text><text className="planet-degree" x="0" y="8" textAnchor="middle" dominantBaseline="central" fontSize="7.5" fill="currentColor">{p.degreeText}</text></g></g>})}
    </svg></div>
    <small title="出生図・ハウスは含みません。月相の節目、週の最初のイベントの順で選び、該当がない週は月曜正午を表示します。">地心・トロピカル方式／日本時間（JST）。<br/>意味は振り返りのヒントです。</small>
  </section>;
}
