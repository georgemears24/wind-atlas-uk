export function capacitySummary<T extends {mw:number;siteCount:number}>(farms:T[],threshold:number){
 const included=farms.filter(f=>f.mw>=threshold);
 const excluded=farms.filter(f=>f.mw<threshold);
 const sum=(items:T[])=>items.reduce((s,f)=>s+f.mw,0);
 return {included,excluded,shownMW:sum(included),excludedMW:sum(excluded),totalMW:sum(farms),shownSites:included.reduce((s,f)=>s+f.siteCount,0),excludedSites:excluded.reduce((s,f)=>s+f.siteCount,0)};
}
// The generic wind proxy is independent of device preference. The UI owns pause state,
// so an explicit Enable/Resume action can override the initial reduced-motion pause.
export function rotorStep(speed:number|undefined,paused:boolean,seconds:number){
 if(paused||speed===undefined||!Number.isFinite(speed)||speed<3||speed>=25)return 0;
 return -Math.min(18,4+(speed-3)*1.1)*Math.PI/30*Math.max(0,Math.min(seconds,.08));
}
