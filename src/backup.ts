export type PlannerData=Record<string,string>;
export type PlannerBackup={format:'weekly-astrology-backup';version:1;createdAt:string;weeks:{week:string;data:PlannerData}[]};
type Store=Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>;
const prefix='weekly-astrology-';
const fieldPattern=/^(action[0-2]|slot[0-6]-(?:[0-9]|1[0-8])|night[0-6]|reflection[0-3]|check[0-2]|mood|memo)$/;
const invalid=()=>new Error('この手帳のバックアップファイルを選んでください。記録は変更していません。');
function validateWeek(week:unknown):asserts week is string{
 if(typeof week!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(week))throw invalid();
 const date=new Date(week+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==week||date.getUTCDay()!==1)throw invalid();
}
function validateData(data:unknown):asserts data is PlannerData{
 if(!data||typeof data!=='object'||Array.isArray(data))throw invalid();
 for(const [key,value] of Object.entries(data))if(!fieldPattern.test(key)||typeof value!=='string'||value.length>100000)throw invalid();
}
const storageKey=(week:string)=>prefix+week+'-v1';
export function parseBackup(text:string):PlannerBackup{
 if(text.length>10*1024*1024)throw new Error('ファイルが大きすぎます。10MB以下のバックアップを選んでください。');
 let value;try{value=JSON.parse(text);}catch{throw invalid();}
 if(!value||value.format!=='weekly-astrology-backup'||value.version!==1||!Array.isArray(value.weeks)||value.weeks.length>2000||typeof value.createdAt!=='string'||!Number.isFinite(Date.parse(value.createdAt)))throw invalid();
 const seen=new Set<string>();
 for(const entry of value.weeks){
  if(!entry||typeof entry!=='object')throw invalid();
  validateWeek(entry.week);validateData(entry.data);
  if(seen.has(entry.week))throw invalid();seen.add(entry.week);
 }
 return value;
}
function readWeek(store:Store,week:string):PlannerData{
 const text=store.getItem(storageKey(week));if(text===null)return {};
 let data;try{data=JSON.parse(text);}catch{throw new Error('保存されている記録を読み取れません。記録は変更していません。');}
 validateData(data);return data;
}
export function createBackup(store:Store,current:{week:string;data:PlannerData}):PlannerBackup{
 validateWeek(current.week);validateData(current.data);
 const weeks=new Map<string,PlannerData>();
 for(let i=0;i<store.length;i++){
  const key=store.key(i),match=key?.match(/^weekly-astrology-(\d{4}-\d{2}-\d{2})-v1$/);
  if(!match)continue;validateWeek(match[1]);weeks.set(match[1],readWeek(store,match[1]));
 }
 weeks.set(current.week,current.data);
 return {format:'weekly-astrology-backup',version:1,createdAt:new Date().toISOString(),weeks:[...weeks].filter(([,data])=>Object.values(data).some(value=>value!=='')).sort(([a],[b])=>a.localeCompare(b)).map(([week,data])=>({week,data}))};
}
export function restoreBackup(store:Store,backup:PlannerBackup,mode:'keep'|'replace'){
 // Validate and plan every week before writing anything. Keep unrelated application data.
 const checked=parseBackup(JSON.stringify(backup));
 const plan=checked.weeks.map(({week,data})=>{
  const existing=readWeek(store,week);
  const merged=mode==='keep'?{...data,...existing}:{...existing,...data};
  const changed=Object.keys(merged).some(key=>!(key in existing)||merged[key]!==existing[key]);
  return {key:storageKey(week),before:store.getItem(storageKey(week)),after:JSON.stringify(merged),changed};
 }).filter(entry=>entry.changed);
 const written:typeof plan=[];
 try{for(const entry of plan){store.setItem(entry.key,entry.after);written.push(entry);}}
 catch{
  let rollbackFailed=false;
  for(const entry of written.reverse())try{if(entry.before===null)store.removeItem(entry.key);else store.setItem(entry.key,entry.before);}catch{rollbackFailed=true;}
  throw new Error(rollbackFailed?'読み込みに失敗し、一部の記録を元に戻せませんでした。バックアップファイルを保管してください。':'保存容量などの理由で読み込めませんでした。変更した記録は元に戻しました。');
 }
 return plan.length;
}
