'use client';
import { useState, useEffect, useMemo } from 'react';
import { Wind, ArrowUpRight, Pause, Play, Plus, Minus, RotateCcw, Compass, Waves, MapPin } from 'lucide-react';
import sites from './data/sites.json';
import {groupSites, type Marker} from './grouping';
import WindMap from './wind-map';
import {Slider} from '@/components/ui/slider';
import {Input} from '@/components/ui/input';
import {windForPoints} from './wind-data';
import {capacitySummary} from './atlas-model';
import {Select, SelectTrigger, SelectContent, SelectItem} from '@/components/ui/select';
export type Farm = Marker;
export type Weather = Record<string, {speed:number; direction:number; time:string}>;
const maxThreshold=Math.ceil(Math.max(...sites.map(f=>f.mw))/100)*100;
export default function Home(){
 const [selectedId,setSelectedId]=useState(sites[0].id); const [threshold,setThreshold]=useState(20); const [weather,setWeather]=useState<Weather>({});
 const [appliedThreshold,setAppliedThreshold]=useState(20); const [sliderMax,setSliderMax]=useState(200);
 useEffect(()=>{const timeout=setTimeout(()=>setAppliedThreshold(threshold),200);return()=>clearTimeout(timeout)},[threshold]);
 const farms=useMemo(()=>groupSites(sites,appliedThreshold),[appliedThreshold]);
 const [status,setStatus]=useState('Connecting to wind data'); const [paused,setPaused]=useState(false); const [command,setCommand]=useState({type:'reset',n:0});
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;setReducedMotion(reduce);setPaused(reduce)},[]);
 const summary=capacitySummary(farms,appliedThreshold);
 const visible=summary.included;
 const selected=visible.find(f=>f.id===selectedId)||visible[0];
 const aggregates=visible.filter(f=>f.aggregate).length;
 const setSelected=(farm:Farm)=>setSelectedId(farm.id);
 const [updated,setUpdated]=useState(''); const [retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true; let retryTimer:ReturnType<typeof setTimeout>|undefined;
 setWeather({});setUpdated('');setStatus('Updating wind readings');
 async function refresh(){try {const markers=groupSites(sites,appliedThreshold).filter(f=>f.mw>=appliedThreshold);const weather=await windForPoints(markers);const count=Object.keys(weather).length;if(markers.length&&count===0)throw new Error('Wind feed unavailable');const data={weather,time:new Date().toISOString(),partial:count<markers.length};if(alive){setWeather(data.weather);setUpdated(data.time);setStatus(data.partial?'Some wind readings unavailable':'Current wind conditions');if(data.partial)retryTimer=setTimeout(refresh,60000);}}catch{if(alive){setStatus('Wind data unavailable');setWeather({});setUpdated('');retryTimer=setTimeout(refresh,60000);}}}
 refresh();const timer=setInterval(refresh,15*60*1000);return()=>{alive=false;clearInterval(timer);clearTimeout(retryTimer)};
 },[retry,appliedThreshold]);
 const current=selected?weather[selected.id]:undefined; const act=(type:string)=>setCommand(c=>({type,n:c.n+1}));
 return <main className="atlas">
 <header className="topbar"><a className="brand" href={import.meta.env.BASE_URL} aria-label="Wind Atlas home"><Wind size={28}/><span>wind<span className="brand-light">atlas</span><i>UK</i></span></a><div className="top-caption">A living landscape of wind energy</div><div className="live-pill"><span className={updated?'live-dot':'waiting-dot'}/>{updated?'WIND FEED CONNECTED':'WIND FEED'}<span className="live-tag">15 MIN</span></div></header>
 <div className="workspace">
 <section className="map-area" aria-label="Interactive wind farm map">
 <div className="map-heading"><div className="eyebrow">UNITED KINGDOM / WIND ENERGY</div><h1>Power in motion<span>.</span></h1><p>Wind farms and local wind, together.<br/>A different perspective on our energy.</p></div>
 <WindMap farms={farms} selected={selected?.id??''} threshold={appliedThreshold} onSelect={setSelected} weather={weather} paused={paused} command={command}/>
 <div className="north"><Compass size={24}/><span>N</span></div>
 <div className="map-controls"><button onClick={()=>act('in')} aria-label="Zoom in"><Plus size={18}/></button><button onClick={()=>act('out')} aria-label="Zoom out"><Minus size={18}/></button><button onClick={()=>act('reset')} aria-label="Reset map"><RotateCcw size={17}/></button></div>
 <div className="map-bottom"><span className="gesture">Drag to orbit · Scroll to zoom · Select a turbine</span><button className="pause" onClick={()=>{setPaused(!paused);setReducedMotion(false)}}>{paused?<Play size={15}/>:<Pause size={15}/>} {paused?(reducedMotion?'Enable motion':'Resume motion'):'Pause motion'}</button></div>
 <div className="map-credit">Raised terrain · Inland positions preserved · Offshore spacing expanded</div>
 </section>
 <aside className="sidebar">
 <section className="overview"><div className="eyebrow">THE BIG PICTURE</div><div className="stats"><div><strong>{summary.shownSites}</strong><span>Operational sites shown</span></div><div><strong>{(summary.shownMW/1000).toFixed(2)}<small> GW</small></strong><span>Capacity on the map</span></div></div><div className="split"><span><i className="key green"/>{visible.filter(f=>!f.offshore).reduce((sum,f)=>sum+f.siteCount,0)} onshore</span><span><i className="key blue"/>{visible.filter(f=>f.offshore).length} offshore</span></div><p className="aggregate-count"><i className="key black"/>{aggregates} county-area aggregates · {visible.length-aggregates} individual sites</p>
 <div className="capacity-filter"><div className="filter-heading"><div><label id="capacity-label" htmlFor="capacity-number">Capacity threshold</label><span>Installed capacity · MW</span></div><div className="threshold-input"><Input id="capacity-number" type="number" min={0} max={maxThreshold} step={5} value={threshold} onChange={e=>{if(e.target.value!==''){const n=Math.max(0,Math.min(maxThreshold,Number(e.target.value)));setThreshold(n);setSliderMax(Math.max(200,Math.ceil(n/100)*100))}}}/><span>MW</span></div></div><Slider min={0} max={sliderMax} step={5} value={[threshold]} onValueChange={value=>setThreshold(Array.isArray(value)?value[0]:value)} aria-labelledby="capacity-label" aria-valuetext={`${threshold} megawatts`} /><div className="filter-scale"><span>0</span><span>{sliderMax/2}</span><span>{sliderMax} MW</span></div><div className="threshold-presets">{[0,20,50,100].map(value=><button key={value} aria-pressed={threshold===value} onClick={()=>{setThreshold(value);setSliderMax(200)}}>{value===0?'Show all':`${value} MW`}</button>)}</div><p className="grouping-explanation">Farms at or above the threshold stand alone. Smaller onshore farms pool into their county area; the pool appears if its total meets the same threshold. Offshore farms stay individual.</p><div className="threshold-example">At 25 MW: a 20 MW onshore farm + 30 MW of other small sites → one 50 MW county marker.</div></div>
 <div className="excluded-capacity" aria-live="polite"><div><span>Capacity not on the map</span><strong>{summary.excludedMW.toLocaleString('en-GB',{maximumFractionDigits:2})}<small> MW</small></strong></div><p>{summary.excludedSites} sites in {summary.excluded.length} markers below {appliedThreshold} MW.<br/>Loaded dataset: {(summary.totalMW/1000).toFixed(2)} GW.</p></div>
 </section>
 {selected?<section className="farm-detail"><div className="detail-top"><span className="eyebrow">{selected.aggregate?'SELECTED COUNTY AREA':'SELECTED WIND FARM'}</span><span className="number">{String(visible.findIndex(f=>f.id===selected.id)+1).padStart(2,'0')} / {visible.length}</span></div><div className="farm-type">{selected.offshore?<Waves size={15}/>:<MapPin size={15}/>} {selected.aggregate?'County aggregate':selected.offshore?'Offshore':'Onshore'} <span>· {selected.country}</span></div><h2>{selected.name}</h2><p className="operator">{selected.operator}</p><div className="capacity"><strong>{selected.mw.toLocaleString('en-GB')}</strong><span>MW<br/>installed capacity</span></div>
 <div className="wind-card"><div className="wind-card-label"><Wind size={17}/><span>{selected.aggregate?'Wind near the area centre':'Wind at the geographic location'}</span></div><div className="wind-reading"><strong>{current?current.speed.toFixed(1):'—'}</strong><span>m/s</span>{current&&<div className="direction"><ArrowUpRight style={{transform:`rotate(${current.direction-45}deg)`}} size={23}/><span>{current.direction}°</span></div>}</div><div className="wind-meta">{current?`Model time ${new Date(current.time+'Z').toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})} UTC · 10 m height`:'Waiting for current weather data'}</div></div>
 <div className="location"><span>{selected.lat.toFixed(2)}° N, {Math.abs(selected.lon).toFixed(2)}° {selected.lon<0?'W':'E'}</span><span>{selected.aggregate?`${selected.siteCount} sites`:selected.turbines?`${selected.turbines} turbines`:'Operational'}</span></div>
 {selected.aggregate&&<div className="aggregate-note"><p>Combined capacity of {selected.siteCount} operational sites in the REPD {selected.county} area. Only onshore sites smaller than {appliedThreshold} MW enter this pool. Larger farms remain individual. Wind is sampled at the capacity-weighted centre.</p><details key={selected.id}><summary>Included sites ({selected.siteCount})</summary><ul>{selected.members.map(m=><li key={m.id}><span>{m.name}</span><b>{m.mw.toLocaleString('en-GB')} MW</b></li>)}</ul></details></div>}
 <Select value={selected.id} onValueChange={id=>{const farm=visible.find(f=>f.id===id);if(farm)setSelected(farm)}}><SelectTrigger className="browse" aria-label="Choose a farm or county">Choose a farm or county</SelectTrigger><SelectContent className="farm-picker" alignItemWithTrigger={false}>{visible.map(f=><SelectItem key={f.id} value={f.id}>{f.name} · {f.mw} MW</SelectItem>)}</SelectContent></Select>
 </section>:<section className="farm-detail"><h2>No markers at this threshold</h2><p className="operator">Lower the capacity threshold to bring farms back onto the map.</p></section>}
 <section className="reading"><div className="eyebrow">READING THE LANDSCAPE</div><div className="legend-row"><span className="legend-symbol">√</span><p><b>Square-root capacity scale</b><br/>Turbine dimensions scale with √MW. Four times the capacity, twice the height.</p></div><div className="legend-row"><Wind size={23}/><p><b>Motion is wind</b><br/>Faster winds, faster rotation. A visual proxy, not measured turbine RPM.</p></div><div className="legend-row"><span className="legend-symbol area-symbol">▦</span><p><b>Gold offshore, black county bases</b><br/>Smaller local sites combined, without double-counting individual farms.</p></div></section>
 </aside></div>
 <footer><div className="feed"><span className={updated?'live-dot':'waiting-dot'}/>{status}{status.toLowerCase().includes('unavailable')&&<button onClick={()=>setRetry(r=>r+1)}>Retry</button>}</div><div className="sources">Operational wind sites · <a href="https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract" target="_blank" rel="noreferrer">DESNZ, Jul 2026 <ArrowUpRight size={12}/></a><span> / </span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo <ArrowUpRight size={12}/></a></div></footer>
 </main>
}
