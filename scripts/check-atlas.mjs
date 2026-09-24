import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layoutFarms,turbineScale,landHeight} from '../app/map-layout.ts';
import {PerspectiveCamera,Vector3} from 'three';
import {groupSites} from '../app/grouping.ts';
import {capacitySummary,rotorStep} from '../app/atlas-model.ts';
const sites=JSON.parse(fs.readFileSync(new URL('../app/data/sites.json',import.meta.url)));
const farms=groupSites(sites,20);
const cells=JSON.parse(fs.readFileSync(new URL('../public/voxels.json',import.meta.url)));
assert.equal(turbineScale(400)/turbineScale(100),2);
assert(cells.every(([x,z])=>{
 const previous=4.5+Math.floor((Math.sin(x*.22)*Math.cos(z*.14)+1)*1.5)*.38;
 return Math.abs(landHeight(x,z)*2-previous)<1e-10;
}));
for(const threshold of [0,20,100,500,5000]){
 const summary=capacitySummary(farms,threshold);
 assert(Math.abs(summary.shownMW+summary.excludedMW-summary.totalMW)<1e-8);
 assert.equal(summary.included.length+summary.excluded.length,farms.length);
 assert(summary.included.every(f=>f.mw>=threshold));
 assert(summary.excluded.every(f=>f.mw<threshold));
}
const at20=capacitySummary([{mw:19,siteCount:1},{mw:20,siteCount:3},{mw:21,siteCount:1}],20);
assert.equal(at20.shownMW,41);assert.equal(at20.excludedMW,19);assert.equal(at20.shownSites,4);
assert.equal(capacitySummary(farms,0).excludedMW,0);
assert.equal(capacitySummary(farms,5000).included.length,0);
assert.equal(rotorStep(10,true,1/60),0,'Pause stops rotation');
assert(rotorStep(10,false,1/60)<0,'Explicit resume allows rotation');
assert.equal(rotorStep(undefined,false,1/60),0,'Missing weather never invents motion');
assert.equal(rotorStep(2,false,1/60),0);assert.equal(rotorStep(25,false,1/60),0);
assert(Math.abs(rotorStep(12,false,1/60))>Math.abs(rotorStep(5,false,1/60)));
assert(Math.abs(rotorStep(10,false,1/30)-2*rotorStep(10,false,1/60))<1e-10,'Motion is frame-rate independent');
const ids=farms.flatMap(f=>f.members.map(m=>m.id));assert.equal(new Set(ids).size,ids.length,'No member appears in more than one marker');
for(const f of farms){assert(Math.abs(f.mw-f.members.reduce((s,m)=>s+m.mw,0))<.001);assert.equal(f.siteCount,f.members.length);assert(!f.aggregate||f.members.every(m=>m.mw<20))}
const start=performance.now();const positions=layoutFarms(farms,cells);assert.equal(positions.size,farms.length);
for(const f of farms){const p=positions.get(f.id);assert(Number.isFinite(p.x)&&Number.isFinite(p.z));const onLand=cells.some(c=>Math.abs(c[0]-p.x)<.7&&Math.abs(c[1]-p.z)<.7);assert.equal(onLand,!f.offshore,`${f.name} must stay on the appropriate surface`)}
const camera=new PerspectiveCamera(33,.85,.1,600);camera.position.set(42,128,139);camera.lookAt(-1,0,-3);camera.updateMatrixWorld();
const clipped=farms.filter(f=>{const p=positions.get(f.id);const v=new Vector3(p.x,(f.offshore?0:landHeight(p.x,p.z))+6*p.scale,p.z).project(camera);return Math.abs(v.x)>1||Math.abs(v.y)>1}).map(f=>f.name);
let coastalDistance=Infinity;const off=farms.filter(f=>f.offshore);for(let i=0;i<off.length;i++)for(let j=i+1;j<off.length;j++){const a=positions.get(off[i].id),b=positions.get(off[j].id);coastalDistance=Math.min(coastalDistance,Math.hypot(a.x-b.x,a.z-b.z))}
console.log({markers:farms.length,sites:ids.length,aggregates:farms.filter(f=>f.aggregate).length,layoutMs:Math.round(performance.now()-start),minimumOffshoreDistance:coastalDistance.toFixed(2),clipped});

const defaults=capacitySummary(farms,20);console.log({threshold:20,shownMarkers:defaults.included.length,excludedMarkers:defaults.excluded.length,excludedMW:Number(defaults.excludedMW.toFixed(3)),totalMW:Number(defaults.totalMW.toFixed(3))});
