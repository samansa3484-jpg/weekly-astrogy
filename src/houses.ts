import {MakeTime,SiderealTime,e_tilt} from 'astronomy-engine';

const radians = Math.PI / 180;
const normalize = (degrees:number) => ((degrees % 360) + 360) % 360;

/** Tropical Placidus cusps: trisect diurnal/nocturnal semi-arcs, not ecliptic quadrants. */
export function placidusHouses(date:Date,latitude:number,longitude:number) {
  if(!Number.isFinite(date.getTime())||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('日時・緯度・経度を確認してください。');
  const obliquity = e_tilt(MakeTime(date)).tobl * radians;
  if(Math.abs(latitude)>=90-obliquity/radians)throw new Error('この高緯度ではプラシーダス方式のハウスを計算できません。');
  const meridian = normalize(SiderealTime(date)*15+longitude);
  const theta = meridian*radians;
  const mc = normalize(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(obliquity))/radians);
  const latitudeTangent = Math.tan(latitude*radians);
  const temporalPosition = (eclipticLongitude:number) => {
    const lambda = eclipticLongitude*radians;
    const rightAscension = Math.atan2(Math.sin(lambda)*Math.cos(obliquity),Math.cos(lambda))/radians;
    let distance = normalize(rightAscension-meridian);
    if(distance>270)distance-=360; // Keep floating point noise at the MC near zero.
    const declination = Math.asin(Math.sin(obliquity)*Math.sin(lambda));
    const semiDay = Math.acos(-latitudeTangent*Math.tan(declination))/radians;
    return {distance,semiDay};
  };
  const solve = (target:(semiDay:number)=>number) => {
    let lo=mc,hi=mc+180;
    for(let i=0;i<60;i++){
      const mid=(lo+hi)/2;
      const {distance,semiDay}=temporalPosition(mid);
      if(distance<target(semiDay))lo=mid;else hi=mid;
    }
    return normalize((lo+hi)/2);
  };
  const asc=solve(semiDay=>semiDay);
  const cusp11=solve(semiDay=>semiDay/3);
  const cusp12=solve(semiDay=>semiDay*2/3);
  const cusp2=solve(semiDay=>semiDay+(180-semiDay)/3);
  const cusp3=solve(semiDay=>semiDay+(180-semiDay)*2/3);
  return {asc,mc,cusps:[asc,cusp2,cusp3,normalize(mc+180),normalize(cusp11+180),normalize(cusp12+180),normalize(asc+180),normalize(cusp2+180),normalize(cusp3+180),mc,cusp11,cusp12]};
}
