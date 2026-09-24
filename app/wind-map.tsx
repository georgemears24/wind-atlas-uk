'use client';
import {useEffect,useRef,useState} from 'react';
import type {Farm,Weather} from './page';
import {rotorStep} from './atlas-model';
import {landHeight,layoutFarms} from './map-layout';
type Props={farms:Farm[];selected:string;threshold:number;onSelect:(f:Farm)=>void;weather:Weather;paused:boolean;command:{type:string;n:number}};
export default function WindMap(props:Props){
 const savedView=useRef<{position:[number,number,number];target:[number,number,number]}|null>(null);
 const host=useRef<HTMLDivElement>(null);const live=useRef(props);live.current=props;
 const [ready,setReady]=useState(false);const [error,setError]=useState(false);const label=useRef<HTMLDivElement>(null);
 useEffect(()=>{let disposed=false;let cleanup=()=>{};
 async function init(){
 const THREE=await import('three');const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
 const response=await fetch(import.meta.env.BASE_URL+'voxels.json');if(!response.ok)throw Error('geography');const cells:number[][]=await response.json();if(disposed||!host.current)return;
 const el=host.current;const scene=new THREE.Scene();
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0x0c2833,0);renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(33,1,.1,600);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=65;controls.maxDistance=420;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.12;controls.enablePan=true;
 const fitPoints:import('three').Vector3[]=[];
 const reset=()=>{const narrow=el.clientWidth<600;camera.position.set(42,narrow?157:128,narrow?172:139);controls.target.set(-1,0,-3);controls.update();camera.updateMatrixWorld();
 let fit=1;for(const p of fitPoints){const v=p.clone().project(camera);fit=Math.max(fit,Math.abs(v.x)*1.16,Math.abs(v.y)*1.16)}
 if(fit>1){const offset=camera.position.clone().sub(controls.target).multiplyScalar(fit);camera.position.copy(controls.target).add(offset);controls.update()}};reset();
 scene.add(new THREE.AmbientLight(0xc8e5ee,1.7));const sun=new THREE.DirectionalLight(0xfff4d5,3.1);sun.position.set(-60,110,70);scene.add(sun);const fill=new THREE.DirectionalLight(0x7dc7e5,1);fill.position.set(60,40,-50);scene.add(fill);
 const box=new THREE.BoxGeometry(1,1,1);const land=new THREE.InstancedMesh(box,new THREE.MeshStandardMaterial({roughness:1}),cells.length);const dummy=new THREE.Object3D();const color=new THREE.Color();
 const height=landHeight;
 cells.forEach(([x,z,ireland],i)=>{const h=height(x,z);dummy.position.set(x,h/2,z);dummy.scale.set(1.365,h,1.38);dummy.updateMatrix();land.setMatrixAt(i,dummy.matrix);color.set(ireland?0x526d66:0x83a887);color.multiplyScalar(.88+((i*17)%13)/45);land.setColorAt(i,color)});scene.add(land);
 // Shallow stepped blocks form the ocean surface, below the raised land shelf.
 const seaCells:{x:number;z:number;top:number;tone:number}[]=[];
 for(let ix=-82;ix<=82;ix++)for(let iz=-100;iz<=100;iz++){
  const x=ix*1.386,z=iz*1.404;const wave=Math.sin(ix*.42+iz*.22)+Math.cos(iz*.38-ix*.11);
  const band=Math.floor((wave+2)*1.25);const noise=((ix*73856093^iz*19349663)>>>0)%19/19;
  seaCells.push({x,z,top:-.22+band*.065,tone:.82+band*.055+noise*.12});
 }
 const sea=new THREE.InstancedMesh(box,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.82,metalness:.12,emissive:0x041920,emissiveIntensity:.24}),seaCells.length);
 seaCells.forEach((c,i)=>{dummy.position.set(c.x,c.top-.65,c.z);dummy.scale.set(1.374,1.3,1.392);dummy.updateMatrix();sea.setMatrixAt(i,dummy.matrix);color.set(0x164454).multiplyScalar(c.tone);sea.setColorAt(i,color)});scene.add(sea);
 const layout=layoutFarms(live.current.farms,cells);
 cells.forEach(([x,z])=>fitPoints.push(new THREE.Vector3(x,height(x,z),z)));
 const leaderMaterial=new THREE.LineBasicMaterial({color:0x89b6bd,transparent:true,opacity:.42});
 const aggregateMaterial=new THREE.MeshStandardMaterial({color:0x13171c,roughness:.85});

 // A shared cube vocabulary makes each turbine an equal-shape volumetric glyph.
 const white=new THREE.MeshStandardMaterial({color:0xe9eee1,roughness:.78});const shade=new THREE.MeshStandardMaterial({color:0xb7cbc4,roughness:.8});const offshore=new THREE.MeshStandardMaterial({color:0xd0b662,roughness:.8});const onshore=new THREE.MeshStandardMaterial({color:0xc0d5b3,roughness:.8});
 const hitMeshes:import('three').Mesh[]=[];const turbines:{farm:Farm;group:import('three').Group;container:import('three').Group;rotor:import('three').Group;marker:import('three').Mesh;point:import('three').Vector3}[]=[];
 function cube(w:number,h:number,d:number,x:number,y:number,z:number,mat:import('three').Material,parent:import('three').Group){const mesh=new THREE.Mesh(box,mat);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 for(const farm of live.current.farms){
 const placement=layout.get(farm.id)!;const {x,z,scale,sourceX,sourceZ,displaced}=placement;const container=new THREE.Group();scene.add(container);const group=new THREE.Group();group.scale.setScalar(scale);group.position.set(x,farm.offshore?-.08:height(x,z),z);
 if(displaced){const sy=farm.offshore?.16:height(sourceX,sourceZ)+.1;const dy=farm.offshore?.16:height(x,z)+.1;const leader=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sourceX,sy,sourceZ),new THREE.Vector3(x,dy,z)]),leaderMaterial);container.add(leader);const anchor=new THREE.Mesh(box,new THREE.MeshBasicMaterial({color:0xa0c9c3}));anchor.scale.set(.3,.12,.3);anchor.position.set(sourceX,sy,sourceZ);container.add(anchor)}
 if(farm.aggregate){const areaBase=new THREE.Mesh(box,aggregateMaterial);areaBase.scale.set(Math.max(1.4,scale*2.1),.22,Math.max(1.4,scale*2.1));areaBase.position.set(x,group.position.y+.11,z);container.add(areaBase)}
 cube(.65,6,.65,0,3,0,white,group);cube(1.5,.9,1.5,0,.45,0,farm.aggregate?aggregateMaterial:farm.offshore?offshore:onshore,group);cube(1,.8,1.45,0,6,0,shade,group);
 const rotor=new THREE.Group();rotor.position.set(0,6,.88);group.add(rotor);cube(.65,.65,.5,0,0,0,white,rotor);
 for(let j=0;j<3;j++){const arm=new THREE.Group();arm.rotation.z=j*Math.PI*2/3;cube(.42,1.7,.25,0,1.15,0,white,arm);cube(.33,1.4,.25,-.11,2.55,0,white,arm);cube(.24,.9,.25,-.19,3.5,0,white,arm);rotor.add(arm)}
 rotor.rotation.z=farm.mw;container.add(group);
 const hit=new THREE.Mesh(new THREE.SphereGeometry(3.8,8,6),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(x,group.position.y+5*scale,z);hit.scale.setScalar(Math.max(.28,scale));hit.userData.farm=farm;container.add(hit);hitMeshes.push(hit);
 const marker=new THREE.Mesh(new THREE.RingGeometry(1.3,1.5,40),new THREE.MeshBasicMaterial({color:0xd0f79b,side:THREE.DoubleSide,transparent:true,opacity:.85}));marker.rotation.x=-Math.PI/2;marker.position.set(x,group.position.y+.04,z);marker.visible=false;container.add(marker);
 fitPoints.push(new THREE.Vector3(x,group.position.y+11*scale,z));
 turbines.push({farm,group,container,rotor,marker,point:new THREE.Vector3(x,group.position.y+11*scale,z)});
 }
 // Geographic labels are projected with the map, rather than baked into the artwork.
 const labels=[['SCOTLAND',-4.8,57.05],['ENGLAND',-1.6,52.3],['WALES',-4.1,52.05],['IRELAND',-8,53.2],['NORTH SEA',1.5,56.5],['ATLANTIC OCEAN',-9,57.8]] as const;
 const textLabels=labels.map(([text,lon,lat])=>{const div=document.createElement('div');div.textContent=text;Object.assign(div.style,{position:'absolute',pointerEvents:'none',font:'10px monospace',letterSpacing:'2.5px',color:text.includes('SEA')||text.includes('OCEAN')?'#608b9b':'#c9dfd4',textShadow:'0 1px 6px #153e42',whiteSpace:'nowrap'});el.appendChild(div);return {div,point:new THREE.Vector3((lon+3)*6.3,text.includes('SEA')||text.includes('OCEAN')?.4:4,(55.2-lat)*10.8)}});
 let firstResize=true;const resize=()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);if(firstResize&&savedView.current){camera.position.fromArray(savedView.current.position);controls.target.fromArray(savedView.current.target);controls.update()}else reset();firstResize=false};const observer=new ResizeObserver(resize);observer.observe(el);resize();
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0};const pointerdown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}};
 const pick=(e:PointerEvent)=>{const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(hitMeshes.filter(mesh=>mesh.userData.farm.mw>=live.current.threshold))[0]};
 const pointerup=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const hit=pick(e);if(hit)live.current.onSelect(hit.object.userData.farm)};
 const pointermove=(e:PointerEvent)=>{renderer.domElement.style.cursor=pick(e)?'pointer':'grab'};
 renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointerup',pointerup);renderer.domElement.addEventListener('pointermove',pointermove);
 let frame=0,last=performance.now(),lastCommand=live.current.command.n;
 const project=(point:import('three').Vector3)=>{const p=point.clone().project(camera);return {x:(p.x*.5+.5)*el.clientWidth,y:(-p.y*.5+.5)*el.clientHeight,visible:p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1}};
 const draw=(now:number)=>{if(disposed)return;frame=requestAnimationFrame(draw);const dt=Math.min((now-last)/1000,.08);last=now;const state=live.current;
 if(lastCommand!==state.command.n){lastCommand=state.command.n;if(state.command.type==='reset')reset();else {const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(state.command.type==='in'?.82:1.22);offset.clampLength(65,420);camera.position.copy(controls.target).add(offset)}}
 controls.update();
 if(label.current)label.current.style.display='none';
 turbines.forEach(t=>{const visible=t.farm.mw>=state.threshold;t.container.visible=visible;const w=state.weather[t.farm.id];if(visible)t.rotor.rotation.z+=rotorStep(w?.speed,state.paused,dt);t.marker.visible=visible&&t.farm.id===state.selected;
 if(t.marker.visible&&label.current){const pos=project(t.point);label.current.textContent=t.farm.name.replace(/ - .*/,'');label.current.style.left=pos.x+'px';label.current.style.top=pos.y+'px';label.current.style.display=pos.visible?'block':'none'}
 });textLabels.forEach(({div,point})=>{const p=project(point);div.style.left=p.x+'px';div.style.top=p.y+'px';div.style.transform='translate(-50%,-50%)';div.style.display=p.visible?'block':'none'});renderer.render(scene,camera)};frame=requestAnimationFrame(draw);setReady(true);
 cleanup=()=>{savedView.current={position:camera.position.toArray(),target:controls.target.toArray()};cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointerup',pointerup);renderer.domElement.removeEventListener('pointermove',pointermove);scene.traverse(o=>{const m=o as import('three').Mesh;m.geometry?.dispose();if(m.material){(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>mat.dispose())}});renderer.dispose();renderer.domElement.remove();textLabels.forEach(l=>l.div.remove())};
 }
 init().catch(()=>{if(!disposed)setError(true)});return()=>{disposed=true;cleanup()};
 },[props.farms]);
 return <div ref={host} className="map-canvas" role="img" aria-label="Voxel map of the United Kingdom. Use the wind farm chooser for keyboard access to all sites.">{!ready&&!error&&<div className="map-loading">Building the landscape…</div>}{error&&<div className="webgl-error">The 3D map could not load. Enable WebGL and reload to explore the landscape. Farm details remain available in the panel.</div>}<div className="map-label" ref={label} style={{display:'none'}}/></div>
}
