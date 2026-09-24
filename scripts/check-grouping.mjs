import assert from 'node:assert/strict';
import fs from 'node:fs';
import {groupSites} from '../app/grouping.ts';
import {capacitySummary} from '../app/atlas-model.ts';
import {layoutFarms} from '../app/map-layout.ts';
const sites=JSON.parse(fs.readFileSync(new URL('../app/data/sites.json',import.meta.url)));
const cells=JSON.parse(fs.readFileSync(new URL('../public/voxels.json',import.meta.url)));
const total=sites.reduce((s,f)=>s+f.mw,0);
for(const threshold of [0,20,25,50,100,200,1500,5000]){
 const markers=groupSites(sites,threshold);const ids=markers.flatMap(f=>f.members.map(m=>m.id));
 assert.equal(ids.length,sites.length);assert.equal(new Set(ids).size,sites.length,'Every site occurs once');
 const summary=capacitySummary(markers,threshold);assert(Math.abs(summary.shownMW+summary.excludedMW-total)<1e-7);
 for(const m of markers){assert(Math.abs(m.mw-m.members.reduce((s,f)=>s+f.mw,0))<.001);if(m.aggregate)assert(m.members.every(f=>f.mw<threshold));else assert(m.offshore||m.mw>=threshold)}
}
const base={...sites[0],offshore:false,county:'Example',country:'England'};
const example=[{...base,id:'a',mw:20},{...base,id:'b',mw:10},{...base,id:'c',mw:10},{...base,id:'d',mw:10}];
const before=groupSites(example,20),after=groupSites(example,25);
assert(before.some(m=>m.id==='a'&&!m.aggregate));assert.equal(before.find(m=>m.aggregate).mw,30);
assert.equal(after.length,1);assert.equal(after[0].mw,50);assert.equal(after[0].siteCount,4);
const at25=groupSites(sites,25);const gm=at25.find(f=>f.aggregate&&f.county==='Greater Manchester');const p=layoutFarms(at25,cells).get(gm.id);
const lat=55.2-p.z/10.8,lon=p.x/6.3-3;
assert(lat>53.5&&lat<53.9&&lon>-2.4&&lon<-1.8,'Manchester must remain near Rochdale, not North Wales');
const at20=groupSites(sites,20);assert.equal(at20.filter(m=>!m.aggregate&&!m.offshore&&m.country==='Scotland').length,144);
console.log({manchester:{lat,lon,mw:gm.mw},scottishIndividualFarms:144,scottishPools:at20.filter(m=>m.aggregate&&m.country==='Scotland').map(m=>({area:m.county,mw:m.mw,sites:m.siteCount})),defaultMarkers:capacitySummary(at20,20).included.length});
