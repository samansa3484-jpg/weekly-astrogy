import {useRef,useState} from 'react';
import {createBackup,parseBackup,restoreBackup} from './backup';
import type {PlannerBackup,PlannerData} from './backup';

export default function BackupControls({week,data,onRestore}:{week:string;data:PlannerData;onRestore:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const input=useRef<HTMLInputElement>(null);
 const [pending,setPending]=useState<PlannerBackup|null>(null);
 const [mode,setMode]=useState<'keep'|'replace'>('keep');
 const [confirmed,setConfirmed]=useState(false);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const reset=()=>{setPending(null);setMode('keep');setConfirmed(false);setMessage('');if(input.current)input.current.value='';};
 const exportFile=()=>{
  try{
   const backup=createBackup(localStorage,{week,data});
   if(!backup.weeks.length){setMessage('まだ保存する記録がありません。予定や振り返りを書いてから保存できます。');return;}
   const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=`weekly-astrology-${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date())}.json`;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage(`${backup.weeks.length}週分の記録を保存しました。ダウンロードしたファイルを保管してください。`);
  }catch(error){setMessage(error instanceof Error?error.message:'バックアップを保存できませんでした。');}
 };
 const readFile=async(file:File|undefined)=>{
  setPending(null);setMessage('');setMode('keep');setConfirmed(false);
  if(!file)return;
  setBusy(true);
  try{
   if(file.size>10*1024*1024)throw new Error('10MB以下のバックアップファイルを選んでください。');
   const backup=parseBackup(await file.text());
   if(!backup.weeks.length)throw new Error('このファイルには読み込める記録がありません。');
   setPending(backup);
  }catch(error){if(input.current)input.current.value='';setMessage(error instanceof Error?error.message:'ファイルを読み取れませんでした。');}
  finally{setBusy(false);}
 };
 const restore=()=>{
  if(!pending||busy||(mode==='replace'&&!confirmed))return;
  try{
   // Include the currently edited state before merging the imported records.
   localStorage.setItem(`weekly-astrology-${week}-v1`,JSON.stringify(data));
   const count=restoreBackup(localStorage,pending,mode);onRestore();setPending(null);if(input.current)input.current.value='';
   setMessage(count?`${count}週分の記録を更新しました。`:'現在の記録を優先したため、変更はありませんでした。');
  }catch(error){setMessage(error instanceof Error?error.message:'読み込みに失敗しました。');}
 };
 const dates=pending?.weeks.map(entry=>entry.week).sort();
 return <>
  <button type="button" onClick={()=>{reset();dialog.current?.showModal();}}>記録のバックアップ</button>
  <dialog className="backup-dialog" ref={dialog} aria-labelledby="backup-title" onCancel={event=>{if(busy)event.preventDefault();else reset();}}>
   <h2 id="backup-title">記録のバックアップ</h2>
   <p>予定や振り返りを、週ごとまとめて保存・読み込みできます。</p>
   <section><h3>ファイルに保存する</h3><p>このブラウザにある全ての週の記録を保存します。</p><button type="button" onClick={exportFile} disabled={busy}>記録をファイルに保存</button></section>
   <section><h3>保存したファイルを読み込む</h3><label className="backup-file">バックアップファイルを選択<input ref={input} type="file" accept=".json,application/json" disabled={busy} onChange={event=>void readFile(event.target.files?.[0])}/></label>
    {busy&&<p role="status">ファイルを確認しています…</p>}
    {pending&&<div className="backup-preview"><p><strong>{pending.weeks.length}週分の記録</strong>を読み込めます。<br/>{dates?.[0]} 〜 {dates?.[dates.length-1]}</p>
     <fieldset><legend>同じ項目に記録がある場合</legend><label><input type="radio" name="restore-mode" value="keep" checked={mode==='keep'} onChange={()=>{setMode('keep');setConfirmed(false);}}/>今の記録を残して追加（おすすめ）</label><label><input type="radio" name="restore-mode" value="replace" checked={mode==='replace'} onChange={()=>setMode('replace')}/>ファイルの記録を優先して上書き</label></fieldset>
     {mode==='replace'&&<label className="backup-confirm"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>同じ項目の記録が置き換わることを確認しました</label>}
     <button type="button" disabled={busy||(mode==='replace'&&!confirmed)} onClick={restore}>この内容で読み込む</button>
    </div>}
   </section>
   {message&&<p className="backup-message" role="status">{message}</p>}
   <p className="backup-note">ファイルはこの端末内で読み込みます。保存したファイルは別の端末でも使えます。</p>
   <button type="button" className="backup-close" onClick={()=>{dialog.current?.close();reset();}} disabled={busy}>閉じる</button>
  </dialog>
 </>;
}
