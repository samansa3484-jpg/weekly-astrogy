export const majorAspectTypes = [
  {angle:0,name:'コンジャンクション',kind:'conjunction'},
  {angle:60,name:'セクスタイル',kind:'soft'},
  {angle:90,name:'スクエア',kind:'hard'},
  {angle:120,name:'トライン',kind:'soft'},
  {angle:180,name:'オポジション',kind:'hard'},
] as const;

// Use the shortest separation across 0° Aries; apply the same 6° orb to all bodies.
export function majorAspects<T extends {name:string;longitude:number}>(positions:T[]) {
  return positions.flatMap((first,i)=>positions.slice(i+1).flatMap(second=>{
    const difference=((first.longitude-second.longitude)%360+360)%360;
    const separation=Math.min(difference,360-difference);
    const aspect=majorAspectTypes.find(type=>Math.abs(separation-type.angle)<=6);
    return aspect?[{first,second,...aspect,orb:Math.abs(separation-aspect.angle)}]:[];
  }));
}
