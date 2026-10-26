import type {AstroEvent} from './events.ts';

const extraActions:Record<string,string[]>={
 '新月':['始めたいことのために時間を空ける','気になる選択肢を一つ調べる'],
 '満月':['自分の変化を言葉にする','大切にしたい習慣を選び直す'],
 '上弦の月':['予定に無理がないか確かめる','できた一歩を記録する'],
 '下弦の月':['保留にしていたことを見直す','次の一歩に必要な余白をつくる'],
 'aspect':['信頼できる人とゆっくり話す','対話の気づきを小さな行動にする'],
 'ingress':['慣れたやり方を一つ見直す','試して感じたことを記録する'],
 'quiet':['好きなことを楽しむ時間をつくる','今日の小さな充実を書き留める'],
};
// Interpretive suggestions, not astronomical facts or predictions.
// Rules use the calculated event types; no personal natal information is assumed.
const guidanceByEvent:Record<string,{keyword:string;detail:string;good:string[];theme:string;question:string}>={
 '新月':{keyword:'新しい可能性に目を向ける週',detail:'始まりを意識する節目。今の関心や願いを確かめ、自分に合う一歩を考えるヒントに。',good:['気になることを言葉にする','小さな目標を決める','最初の一歩を試す'],theme:'新しい一歩を選ぶ',question:'今の自分が試してみたい、小さな一歩は何ですか？'},
 '満月':{keyword:'積み重ねを確かめる週',detail:'積み重ねや変化を見つめる節目。今の気持ちと照らし合わせ、次の選択を考えるヒントに。',good:['できたことを振り返る','感謝を伝える','次に生かす経験を選ぶ'],theme:'実りに気づく',question:'これまでの経験から、どんな力が育っていますか？'},
 '上弦の月':{keyword:'選択を行動につなげる週',detail:'思いと行動を照らし合わせる節目。進み方や必要な調整を考えるヒントに。',good:['優先順位を決める','小さな工夫を試す','必要な助けを探す'],theme:'行動を整える',question:'今あるリソースで、どんな工夫ができますか？'},
 '下弦の月':{keyword:'振り返りから整える週',detail:'経験を振り返る節目。続けたいこと・手放したいことを、自分の気持ちから確かめるヒントに。',good:['経験を整理する','役立つ習慣を選び直す','休息の時間を確保する'],theme:'整えて次へ',question:'今週、少し整えておきたいことは何ですか？'},
 'aspect':{keyword:'関係と可能性を見つめる週',detail:'異なる思いや視点を見つめるテーマ。人との関わりから、自分にとって大切な選択肢を考えるヒントに。',good:['異なる考えに耳を傾ける','自分の希望を伝える','選択肢を一つ増やす'],theme:'視点を広げる',question:'別の視点から見ると、どんな可能性がありますか？'},
 'ingress':{keyword:'新しい視点を取り入れる週',detail:'関心や取り組み方の変化に目を向けるテーマ。今の自分に合う方向を考えるヒントに。',good:['新しい方法を調べる','気になることを試す','大切にしたいことを確認する'],theme:'可能性を探す',question:'今、どんな新しい選択肢が見えていますか？'},
 'quiet':{keyword:'自分のペースを大切にする週',detail:'大きな節目の少ない週も、日々の小さな変化は選択のヒントに。今の気持ちやペースを確かめる時間に。',good:['自分の調子を確かめる','心地よい習慣を育てる','一歩を振り返る'],theme:'自分のペースで',question:'今の自分にとって、心地よい一歩は何ですか？'}
};
export function weeklyGuidance(events:AstroEvent[]){
 const phase=events.find(e=>e.kind==='phase');
 const key=phase?.label||events.find(e=>e.kind==='aspect')?.kind||events.find(e=>e.kind==='ingress')?.kind||'quiet';
 return {...guidanceByEvent[key],good:[...guidanceByEvent[key].good,...extraActions[key]]};
}

// Highlight a readable selection; the daily columns retain the complete feed.
export function selectedWeeklyEvents(events:AstroEvent[]){
 return events.filter(e=>e.kind==='phase').concat(events.filter(e=>e.kind==='ingress'),events.filter(e=>e.kind==='aspect')).slice(0,4).sort((a,b)=>a.date.getTime()-b.date.getTime());
}
export function explainEvent(event:AstroEvent){
 if(event.kind==='phase')return ({
  '新月':'始まりや種まきの節目。今の願いを確かめるヒントに。',
  '満月':'実りや区切りを見つめる節目。これまでの変化に気づくヒントに。',
  '上弦の月':'思いと行動を照らし合わせ、進み方を見直す節目。',
  '下弦の月':'経験を振り返る節目。続けたいこと・手放したいことを考えるヒントに。',
 } as Record<string,string>)[event.label]||'今の自分の調子を確かめるきっかけに。';
 if(event.kind==='ingress'){
  if(event.label.includes('蠍座'))return '関心を深め、本質に目を向けるテーマ。大切な思いを確かめるヒントに。';
  if(event.label.includes('魚座'))return '想像力や心の余白がテーマ。休息や創作を見つめ直すヒントに。';
  if(event.label.includes('射手座'))return '学びや広がりがテーマ。今の視野や可能性を確かめるヒントに。';
  return '関心や取り組み方が移る節目。自分に合う方法を考えるヒントに。';
 }
 const planets:string[]=event.planets||[];
 if(event.aspectAngle===0){
  if(planets.includes('水星'))return '意志と言葉が重なるテーマ。考えや伝えたい思いを確かめるヒントに。';
  if(planets.includes('金星'))return '心地よさや価値観がテーマ。自分の好みや大切なものを見つめるヒントに。';
  if(planets.includes('土星')&&planets.includes('海王星'))return '理想と現実を照らす節目。描く未来と今できることを考えるヒントに。';
  return '二つのテーマが重なる節目。力を注ぎたいことを考えるヒントに。';
 }
 if(event.aspectAngle===60||event.aspectAngle===120){
  if(planets.includes('金星')&&planets.includes('木星'))return '喜びや交流の広がりがテーマ。心が豊かになる関わりを考えるヒントに。';
  if(planets.includes('水星'))return '対話や学びの広がりがテーマ。新しい視点や選択肢に気づくヒントに。';
  return '持ち味のつながりがテーマ。自分の強みや周囲の助けを確かめるヒントに。';
 }
 if(planets.includes('水星'))return '考えと行動の調整がテーマ。情報や伝え方を見直すヒントに。';
 if(planets.includes('太陽')&&planets.includes('冥王星'))return '意志や変化を見つめるテーマ。力の入れ方や自分の望みを考えるヒントに。';
 return '違いや緊張から調整を考えるテーマ。自分に合うペースを探すヒントに。';
}
