import * as Astronomy from 'astronomy-engine';

const signs = ['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座'];
const glyphs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
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

export default function TransitChart({date,label}:{date:Date;label:string}) {
  const positions = bodies.map(([body,name,symbol]) => {
    const longitude = body === Astronomy.Body.Moon
      ? Astronomy.EclipticGeoMoon(date).lon
      : Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon;
    const minutes = Math.floor((longitude % 30) * 60);
    return {name,symbol,longitude,description: `${signs[Math.floor(longitude / 30)]} ${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2,'0')}′`};
  });
  // Keep labels on their exact longitude; use radial lanes for close conjunctions.
  const placed: {longitude:number;radius:number}[] = [];
  const plotted = positions.map(position => {
    let radius = 73;
    while (placed.some(p => p.radius === radius && Math.abs(((p.longitude-position.longitude+540)%360)-180) < 17)) radius -= 17;
    placed.push({longitude:position.longitude,radius});
    return {...position,radius};
  });
  const timestamp = new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
  return <section className="symbol">
    <h3>WEEK’S SYMBOLIC DAY</h3>
    <p>{label}</p><p className="chart-time"><time dateTime={date.toISOString()}>{timestamp}（日本時間）</time></p>
    <div className="wheel transit-wheel"><svg viewBox="0 0 240 240" width="100%" height="100%" role="img" aria-label={`${timestamp}の天体配置。牡羊座0度を左に固定した地心黄道図`}>
      <circle cx="120" cy="120" r="115" fill="#fffdf5" stroke="#b69b68"/>
      <circle cx="120" cy="120" r="89" fill="none" stroke="#c9bb9a"/>
      {glyphs.map((glyph,i) => {const a=point(i*30,89),b=point(i*30,115),t=point(i*30+15,102);return <g key={glyph}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c9b58c"/><text x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" fontSize="15" fill="#755e58">{glyph}</text></g>})}
      {plotted.map(p => {const a=point(p.longitude,86),b=point(p.longitude,p.radius+7),t=point(p.longitude,p.radius);return <g key={p.name} data-planet={p.name} data-longitude={p.longitude}><title>{p.name}：{p.description}</title><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b69b68" strokeWidth=".6"/><text x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" fontSize="14" fill="#34465d">{p.symbol}</text></g>})}
    </svg></div>
    <dl className="planet-positions">{positions.map(p=><div key={p.name}><dt>{p.symbol} {p.name}</dt><dd>{p.description}</dd></div>)}</dl>
    <small>地球から見た天体の位置（トロピカル方式）。出生図・ハウスは含みません。月相の節目、週の最初のイベントの順で選び、該当がない週は月曜正午を表示します。</small>
  </section>;
}
