export type Site={id:string;name:string;mw:number;offshore:boolean;lat:number;lon:number;country:string;county:string;operator:string;turbines:number|null};
export type Marker=Site&{aggregate:boolean;siteCount:number;members:{id:string;name:string;mw:number}[]};
export function groupSites(sites:Site[],threshold:number):Marker[]{
 const member=(f:Site)=>({id:f.id,name:f.name,mw:f.mw});
 const markers:Marker[]=sites.filter(f=>f.offshore||f.mw>=threshold).map(f=>({...f,aggregate:false,siteCount:1,members:[member(f)]}));
 const groups=new Map<string,Site[]>();
 for(const site of sites){if(site.offshore||site.mw>=threshold)continue;const key=site.country+' / '+site.county;const group=groups.get(key)||[];group.push(site);groups.set(key,group)}
 for(const [key,group] of groups){const mw=group.reduce((s,f)=>s+f.mw,0);const first=group[0];markers.push({
 ...first,id:'area-'+key.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:first.county+' · smaller sites',mw:Math.round(mw*1000)/1000,
 lat:group.reduce((s,f)=>s+f.lat*f.mw,0)/mw,lon:group.reduce((s,f)=>s+f.lon*f.mw,0)/mw,
 operator:`REPD county area · ${group.length} smaller ${group.length===1?'site':'sites'}`,aggregate:true,siteCount:group.length,
 turbines:group.every(f=>f.turbines!==null)?group.reduce((s,f)=>s+f.turbines!,0):null,members:group.map(member)
 })}
 return markers.sort((a,b)=>b.mw-a.mw||a.id.localeCompare(b.id));
}
