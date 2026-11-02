import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91b2cc);
scene.fog=new THREE.Fog(0x91b2cc,95,360);
const camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.1,700);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.getElementById('app').prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f3ff,0x56616b,2));
const sun=new THREE.DirectionalLight(0xfff0d8,2.1);sun.position.set(-80,120,60);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const mat=(c,rough=.8,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
const M={road:mat(0x303743),side:mat(0x9ca4a9),grass:mat(0x557b55),line:new THREE.MeshBasicMaterial({color:0xe5e4d6}),build:[0x647a8b,0x9b8d82,0x566a79,0x87989b,0x756e80,0xb1a18c].map(c=>mat(c)),glass:mat(0x8bbbd0,.25,.15),car:mat(0xd91f43,.28,.5),dark:mat(0x121923,.4,.3),tire:mat(0x111214),white:mat(0xf3eee1),lamp:new THREE.MeshBasicMaterial({color:0xffe3a1})};
function cube(parent,w,h,d,material,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(600,600),M.grass);floor.rotation.x=-Math.PI/2;floor.position.y=-.12;floor.receiveShadow=true;scene.add(floor);
const step=44,limit=5,roadW=15;
for(let i=-limit;i<=limit;i++){let p=i*step;cube(scene,roadW,.12,540,M.road,p,0,0);cube(scene,540,.12,roadW,M.road,0,0,p);
 for(let n=-6;n<=6;n++){cube(scene,.14,.02,3.8,M.line,p,.08,n*step+10);cube(scene,3.8,.02,.14,M.line,n*step+10,.08,p);}}
for(let x=-limit;x<limit;x++)for(let z=-limit;z<limit;z++){let cx=(x+.5)*step,cz=(z+.5)*step;cube(scene,29,.3,29,M.side,cx,.08,cz);
 const n=1+Math.floor(Math.random()*3);
 for(let j=0;j<n;j++){let w=7+Math.random()*9,d=7+Math.random()*9,h=10+Math.random()*48,ox=(Math.random()-.5)*15,oz=(Math.random()-.5)*15,mm=M.build[Math.floor(Math.random()*M.build.length)];
 cube(scene,w,h,d,mm,cx+ox,h/2+.25,cz+oz);
 for(let yy=3;yy<h-2;yy+=4)for(let xx=-w/2+1.5;xx<w/2-1;xx+=3){cube(scene,.12,1.45,.1,M.glass,cx+ox+xx,yy,cz+oz+d/2+.06);cube(scene,.12,1.45,.1,M.glass,cx+ox+xx,yy,cz+oz-d/2-.06);}
 }}
// Decorative roadside trees.
for(let i=0;i<80;i++){let x=(Math.floor(Math.random()*10)-5)*step+(Math.random()-.5)*22,z=(Math.floor(Math.random()*10)-5)*step+(Math.random()-.5)*22;if(Math.abs(x%step)<11||Math.abs(z%step)<11)continue;
cube(scene,.45,3,.45,mat(0x60452f),x,1.5,z);let crown=new THREE.Mesh(new THREE.SphereGeometry(1.8,8,7),mat(0x34734a));crown.position.set(x,4,z);crown.castShadow=true;scene.add(crown);}

const car=new THREE.Group();scene.add(car);
cube(car,2.2,.65,4.3,M.car,0,.83,0);cube(car,1.68,.72,1.9,M.dark,0,1.48,-.35);cube(car,1.48,.48,1.35,M.glass,0,1.55,-.4);cube(car,2.1,.14,.9,M.car,0,1.15,1.5);
for(const x of [-1.13,1.13])for(const z of [-1.4,1.4]){let w=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.3,16),M.tire);w.rotation.z=Math.PI/2;w.position.set(x,.52,z);w.castShadow=true;car.add(w);}
for(const x of [-.72,.72]){cube(car,.34,.17,.08,M.lamp,x,.95,-2.16);cube(car,.34,.17,.08,M.car,x,.95,2.16);}
const traffic=[];
for(let i=0;i<14;i++){let g=new THREE.Group(),body=mat([0x2374b8,0xe2d9c7,0x252b35,0xd9a12b][i%4],.35,.25);cube(g,1.8,.62,3.6,body,0,.7,0);cube(g,1.4,.5,1.5,M.glass,0,1.18,-.2);scene.add(g);let axis=i%2===0;g.position.set(axis?(Math.floor(i/2)-3)*44:((i%3)-1)*2,0,axis?((i%3)-1)*2:(Math.floor(i/2)-3)*44);g.rotation.y=axis?Math.PI/2:0;traffic.push({g,axis,v:6+Math.random()*8,dir:i%4<2?1:-1});}
const checkpoints=[];for(let i=0;i<5;i++){let r=new THREE.Mesh(new THREE.TorusGeometry(5,.35,10,32),new THREE.MeshBasicMaterial({color:0xff3455}));r.position.set([0,88,88,-88,-88][i],3,[88,88,-88,-88,0][i]);if(i===0)r.position.set(0,3,-44);scene.add(r);checkpoints.push(r);}
let running=false,race=false,cp=0,speed=0,heading=0,camMode=0;
const keys={},touch={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ')e.preventDefault();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.querySelectorAll('[data-control]').forEach(b=>{let k=b.dataset.control;const on=e=>{e.preventDefault();touch[k]=true;},off=e=>{e.preventDefault();touch[k]=false;};b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(v=>b.addEventListener(v,off));});
const $=id=>document.getElementById(id);
async function goFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch(_){/* Browser may not allow orientation lock; user can rotate manually. */}}
function start(isRace){race=isRace;running=true;cp=0;speed=0;car.position.set(0,0,0);heading=0;$('mainMenu').classList.add('hidden');$('hud').classList.remove('hidden');$('mobileControls').classList.remove('hidden');$('modeLabel').textContent=race?'CITY RACE':'FREE DRIVE';$('mission').textContent=race?'Reach every glowing checkpoint':'Explore Zanta City';$('checkpointCount').textContent=race?'0 / 5':'CITY IS OPEN';checkpoints.forEach((p,i)=>p.visible=race&&i===0);goFullscreen();}
$('freeDrive').onclick=()=>start(false);$('startRace').onclick=()=>start(true);
$('backMenu').onclick=()=>{running=false;speed=0;$('mainMenu').classList.remove('hidden');$('hud').classList.add('hidden');$('mobileControls').classList.add('hidden');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});};
$('cameraBtn').onclick=()=>camMode=(camMode+1)%3;
let audioOn=true;$('soundBtn').onclick=()=>{audioOn=!audioOn;$('soundBtn').textContent=audioOn?'♫ SOUND ON':'♫ SOUND OFF';};
const clock=new THREE.Clock();
function frame(){requestAnimationFrame(frame);let dt=Math.min(clock.getDelta(),.04);
 if(running){let gas=keys.w||keys.arrowup||touch.gas,brake=keys.s||keys.arrowdown||touch.brake,left=keys.a||keys.arrowleft||touch.left,right=keys.d||keys.arrowright||touch.right,nitro=keys.shift||touch.nitro;
 if(gas)speed=Math.min(speed+(nitro?31:18)*dt,nitro?58:39);else speed=Math.max(0,speed-6.5*dt);if(brake)speed=Math.max(-8,speed-30*dt);
 heading+=((left?1:0)-(right?1:0))*dt*(1.5+Math.abs(speed)*.035)*(speed<0?-1:1);car.rotation.y=heading;
 let f=new THREE.Vector3(Math.sin(heading),0,-Math.cos(heading));car.position.addScaledVector(f,speed*dt);car.position.x=THREE.MathUtils.clamp(car.position.x,-245,245);car.position.z=THREE.MathUtils.clamp(car.position.z,-245,245);
 traffic.forEach(t=>{let axis=t.axis?'x':'z';t.g.position[axis]+=t.v*t.dir*dt;if(t.g.position[axis]>245)t.g.position[axis]=-245;if(t.g.position[axis]<-245)t.g.position[axis]=245;});
 if(race&&cp<5&&car.position.distanceTo(checkpoints[cp].position)<7){checkpoints[cp].visible=false;cp++;if(cp<5)checkpoints[cp].visible=true;$('checkpointCount').textContent=cp+' / 5';$('mission').textContent=cp===5?'RACE COMPLETE! NICE DRIVING':'Checkpoint '+(cp+1)+' / 5';if(cp===5){race=false;$('modeLabel').textContent='RACE COMPLETE';}}
 $('speed').textContent=String(Math.round(Math.abs(speed)*3.6)).padStart(3,'0');$('speedFill').style.width=Math.min(100,Math.abs(speed)/58*100)+'%';
 }
 let f=new THREE.Vector3(Math.sin(heading),0,-Math.cos(heading)),desired;
 if(camMode===0)desired=car.position.clone().add(new THREE.Vector3(0,7,0)).addScaledVector(f,-11);else if(camMode===1)desired=car.position.clone().add(new THREE.Vector3(0,15,0)).addScaledVector(f,-19);else desired=car.position.clone().add(new THREE.Vector3(0,2.2,0)).addScaledVector(f,2.8);
 camera.position.lerp(desired,.1);camera.lookAt(car.position.clone().add(new THREE.Vector3(0,1,0)).addScaledVector(f,camMode===2?12:5));renderer.render(scene,camera);}
frame();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
$('boot').style.display='none';
