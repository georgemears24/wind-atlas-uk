import fs from 'node:fs';
import proj4 from 'proj4';
const rows=JSON.parse(fs.readFileSync(new URL('./repd-wind-july-2026.json',import.meta.url),'utf8'));
const bng='+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=OSGB36 +units=m +no_defs';
const all=rows.map(r=>{const [lon,lat]=proj4(bng,'EPSG:4326',[+r['X-coordinate'],+r['Y-coordinate']]);return {id:r['Ref ID'],name:r['Site Name'].trim(),mw:+r['Installed Capacity (MWelec)'],offshore:r['Technology Type'].includes('Offshore'),lat,lon,country:r.Country,county:r.County?.trim()||r.Region||r.Country,operator:r['Operator (or Applicant)'],turbines:+r['No. of Turbines']||null}}).filter(f=>f.mw>0&&Number.isFinite(f.lat)&&f.lat>49&&f.lat<62&&f.lon>-9&&f.lon<4).sort((a,b)=>b.mw-a.mw);
fs.writeFileSync(new URL('../app/data/sites.json',import.meta.url),JSON.stringify(all));
console.log(JSON.stringify({sites:all.length,mw:all.reduce((s,f)=>s+f.mw,0)}));
