// Symbol locations are cartographic displacements; source coordinates remain unchanged.
export type Cell = number[];
export type MapFarm = {id:string;mw:number;lat:number;lon:number;offshore:boolean};
export const turbineScale=(mw:number)=>.82*Math.sqrt(mw/500);
export const landHeight=(x:number,z:number)=>2.25+Math.floor((Math.sin(x*.22)*Math.cos(z*.14)+1)*1.5)*.19;
export const worldPoint=(lon:number,lat:number)=>({x:(lon+3)*6.3,z:(55.2-lat)*10.8});
export function layoutFarms(farms:MapFarm[],cells:Cell[]){
 const onLand=(x:number,z:number,padding=.7)=>cells.some(c=>Math.abs(c[0]-x)<padding&&Math.abs(c[1]-z)<padding);
 const positions=new Map<string,{x:number;z:number;sourceX:number;sourceZ:number;scale:number;displaced:boolean}>();
 const placed:{x:number;z:number;radius:number;offshore:boolean}[]=[];
 for(const farm of [...farms].sort((a,b)=>b.mw-a.mw||a.id.localeCompare(b.id))){
  const source=worldPoint(farm.lon,farm.lat);const scale=turbineScale(farm.mw);const radius=Math.max(.9,4*scale+.65);
  // Inland location accuracy takes priority over spacing. Only snap to the nearest
  // UK land voxel (coastline rasterisation); never repel a county into another area.
  if(!farm.offshore){
   const nearest=cells.filter(c=>!c[2]).reduce((best,c)=>Math.hypot(c[0]-source.x,c[1]-source.z)<Math.hypot(best[0]-source.x,best[1]-source.z)?c:best,cells.find(c=>!c[2])!);
   const x=nearest[0],z=nearest[1];
   positions.set(farm.id,{x,z,sourceX:source.x,sourceZ:source.z,scale,displaced:Math.hypot(x-source.x,z-source.z)>1.5});
   placed.push({x,z,radius,offshore:false});continue;
  }
  let anchor={...source};
  if(farm.offshore){const coast=cells.reduce((best,c)=>Math.hypot(c[0]-source.x,c[1]-source.z)<Math.hypot(best[0]-source.x,best[1]-source.z)?c:best,cells[0]);anchor={x:coast[0]+(source.x-coast[0])*1.75,z:coast[1]+(source.z-coast[1])*1.75}}
  let best={...anchor},bestScore=-Infinity;
  // Offshore spacing uses a wider distance scale; inland glyphs stay on nearby land cells.
  const candidates=farm.offshore?Array.from({length:720},(_,i)=>{const r=Math.sqrt(i)*1.05,angle=i*2.399963229728653;return {x:anchor.x+Math.cos(angle)*r,z:anchor.z+Math.sin(angle)*r}}):cells.filter(c=>!c[2]&&Math.hypot(c[0]-source.x,c[1]-source.z)<11).map(c=>({x:c[0],z:c[1]}));
  if(!farm.offshore&&candidates.length===0){const nearest=cells.filter(c=>!c[2]).sort((a,b)=>Math.hypot(a[0]-source.x,a[1]-source.z)-Math.hypot(b[0]-source.x,b[1]-source.z))[0];if(nearest)candidates.push({x:nearest[0],z:nearest[1]})}
  for(const p of candidates){if(farm.offshore&&onLand(p.x,p.z,1.7))continue;
   let overlap=0;for(const q of placed){const dx=p.x-q.x,dz=p.z-q.z;const distance=Math.hypot(.957*dx-.289*dz,(.194*dx+.643*dz)*1.25);const needed=radius+q.radius;overlap+=Math.max(0,needed-distance)**2}
   const distance=Math.hypot(p.x-anchor.x,p.z-anchor.z);const score=-overlap*50-distance*.65;
   if(score>bestScore){bestScore=score;best=p}
  }
  placed.push({...best,radius,offshore:farm.offshore});positions.set(farm.id,{...best,sourceX:source.x,sourceZ:source.z,scale,displaced:Math.hypot(best.x-source.x,best.z-source.z)>1.5});
 }
 return positions;
}
