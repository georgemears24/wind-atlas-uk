type Point={id:string;lat:number;lon:number};
type Reading={speed:number;direction:number;time:string};
const cache=new Map<string,{value:Reading;fetchedAt:number}>();
const pending=new Map<string,Promise<Reading|null>>();
let active=0;const waiting:(()=>void)[]=[];
async function limited<T>(job:()=>Promise<T>){
 if(active>=2)await new Promise<void>(resolve=>waiting.push(resolve));
 active++;
 try{return await job()}finally{active--;waiting.shift()?.()}
}
const key=(p:Point)=>p.lat.toFixed(4)+','+p.lon.toFixed(4);
const fresh=(r:Reading)=>{const age=Date.now()-Date.parse(r.time+'Z');return age>=-900000&&age<7200000};
export async function windForPoints(points:Point[]){
 const unique=new Map(points.map(p=>[key(p),p]));
 const missing=[...unique].filter(([k])=>{const c=cache.get(k);return !pending.has(k)&&(!c||Date.now()-c.fetchedAt>=900000||!fresh(c.value))});
 for(let i=0;i<missing.length;i+=35){const batch=missing.slice(i,i+35);
  const response=limited(async()=>{
   const params=new URLSearchParams({latitude:batch.map(([,p])=>p.lat.toFixed(4)).join(','),longitude:batch.map(([,p])=>p.lon.toFixed(4)).join(','),current:'wind_speed_10m,wind_direction_10m',wind_speed_unit:'ms',timezone:'GMT',forecast_days:'1'});
   const r=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw new Error('Wind provider status '+r.status);
   const raw=await r.json();const data=Array.isArray(raw)?raw:[raw];if(data.length!==batch.length)throw new Error('Incomplete weather batch');
   const readings=new Map<string,Reading>();
   data.forEach((row,j)=>{const c=row?.current;if(typeof c?.wind_speed_10m==='number'&&typeof c?.wind_direction_10m==='number'&&typeof c?.time==='string'){
    const value={speed:c.wind_speed_10m,direction:c.wind_direction_10m,time:c.time};if(fresh(value)){readings.set(batch[j][0],value);cache.set(batch[j][0],{value,fetchedAt:Date.now()})}
   }});return readings;
  }).catch(()=>new Map<string,Reading>());
  for(const [k] of batch)pending.set(k,response.then(readings=>readings.get(k)??null).finally(()=>pending.delete(k)));
 }
 const resolved=await Promise.all([...unique].map(async([k])=>{const task=pending.get(k);const c=cache.get(k);const value=task?await task:c?.value;return [k,value&&fresh(value)?value:null] as const}));
 const byPoint=new Map(resolved);const weather:Record<string,Reading>={};for(const p of points){const r=byPoint.get(key(p));if(r)weather[p.id]=r}
 if(cache.size>5000)for(const [k,c] of cache){if(Date.now()-c.fetchedAt>900000)cache.delete(k)}
 return weather;
}
