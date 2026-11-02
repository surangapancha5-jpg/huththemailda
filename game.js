import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb9d2);
scene.fog = new THREE.Fog(0x9bb9d2, 90, 330);
const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, .1, 600);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xddeeff,0x566070,2.0));
const sun = new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(-70,120,60); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); scene.add(sun);

const mats = {
 road:new THREE.MeshStandardMaterial({color:0x303640,roughness:.95}),
 line:new THREE.MeshBasicMaterial({color:0xe5e5d5}),
 grass:new THREE.MeshStandardMaterial({color:0x527c55}),
 sidewalk:new THREE.MeshStandardMaterial({color:0x9a9da0}),
 building:[0x687b8d,0x9a8f83,0x596c79,0x8b9b9d,0x7a7180].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.8})),
 window:new THREE.MeshStandardMaterial({color:0x9bc5d8,emissive:0x1a3544,roughness:.3}),
 red:new THREE.MeshStandardMaterial({color:0xd92342,metalness:.45,roughness:.28}),
 black:new THREE.MeshStandardMaterial({color:0x111722,metalness:.35,roughness:.4}),
 tire:new THREE.MeshStandardMaterial({color:0x101114,roughness:.9}),
 white:new THREE.MeshStandardMaterial({color:0xf4f4f4})
};

const ground = new THREE.Mesh(new THREE.PlaneGeometry(520,520),mats.grass); ground.rotation.x=-Math.PI/2; ground.position.y=-.08; ground.receiveShadow=true; scene.add(ground);

// City grid: roads with sidewalks and varied buildings.
const roadWidth=14, block=42, cityLimit=5;
function box(w,h,d,mat,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
for(let i=-cityLimit;i<=cityLimit;i++){
  const p=i*block;
  const roadX=box(roadWidth,.12,500,mats.road,p,.02,0); roadX.receiveShadow=true;
  const roadZ=box(500,.12,roadWidth,mats.road,0,.025,p); roadZ.receiveShadow=true;
  for(let n=-5;n<=5;n++){
    const dashZ=box(.16,.025,4,mats.line,p,.1,n*block+10);
    const dashX=box(4,.025,.16,mats.line,n*block+10,.1,p);
  }
}
for(let gx=-cityLimit;gx<cityLimit;gx++) for(let gz=-cityLimit;gz<cityLimit;gz++){
  const cx=(gx+.5)*block, cz=(gz+.5)*block;
  // sidewalks and building footprints
  box(28,.35,28,mats.sidewalk,cx,.08,cz);
  const count=1+Math.floor(Math.random()*3);
  for(let k=0;k<count;k++){
    const w=7+Math.random()*9,d=7+Math.random()*9,h=9+Math.random()*42;
    const ox=(Math.random()-.5)*15,oz=(Math.random()-.5)*15;
    const mat=mats.building[Math.floor(Math.random()*mats.building.length)];
    box(w,h,d,mat,cx+ox,h/2+.25,cz+oz);
    // rows of simple reflective windows
    for(let y=3;y<h-2;y+=4){
      for(let x=-w/2+1.5;x<w/2-1;x+=3){
        box(.12,1.5,.12,mats.window,cx+ox+x,y,cz+oz+d/2+.07);
        box(.12,1.5,.12,mats.window,cx+ox+x,y,cz+oz-d/2-.07);
      }
    }
  }
}

// Player car group: local forward is -Z.
const car=new THREE.Group(); scene.add(car);
box(2.15,.62,4.2,mats.red,0,.85,0,car);
box(1.65,.68,1.8,mats.black,0,1.45,-.35,car);
box(1.45,.45,1.1,mats.window,0,1.52,-.4,car);
box(2.0,.16,1.0,mats.red,0,1.15,1.45,car);
for(const x of [-1.12,1.12]) for(const z of [-1.35,1.35]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.28,16),mats.tire);
  wheel.rotation.z=Math.PI/2; wheel.position.set(x,.52,z); wheel.castShadow=true; car.add(wheel);
}
for(const x of [-.72,.72]){box(.35,.18,.08,mats.white,x,.92,-2.12,car);box(.35,.18,.08,mats.red,x,.92,2.12,car);}
car.position.set(0,0,0);

// Traffic vehicles travel along city streets.
const traffic=[];
for(let i=0;i<12;i++){
  const g=new THREE.Group(); scene.add(g);
  const color=[0x2476b9,0xe1d9c5,0x252a34,0xd8a52e][i%4];
  const body=new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.4});
  box(1.8,.55,3.5,body,0,.7,0,g); box(1.4,.5,1.4,mats.window,0,1.15,-.2,g);
  const axis=i%2===0;
  g.position.set(axis?(Math.floor(i/2)-3)*42:((i%3)-1)*2,0,axis?((i%3)-1)*2:(Math.floor(i/2)-3)*42);
  g.rotation.y=axis?Math.PI/2:0;
  traffic.push({g,axis,speed:7+Math.random()*7,dir:i%4<2?1:-1});
}

// Race checkpoints: glowing rings positioned around the road grid.
const checkpoints=[];
for(let i=0;i<5;i++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(5,.35,10,32),new THREE.MeshBasicMaterial({color:0xff304f}));
  ring.position.set([0,84,84,-84,-84][i],3,[84,84,-84,-84,0][i]);
  if(i===0) ring.position.set(0,3,-42);
  scene.add(ring); checkpoints.push(ring);
}
let race=false, cp=0, speed=0, heading=0, cameraMode=0, running=false, soundOn=true;
const keys={}; const touch={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ')e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.querySelectorAll('[data-control]').forEach(b=>{
  const k=b.dataset.control;
  const down=e=>{e.preventDefault();touch[k]=true;};
  const up=e=>{e.preventDefault();touch[k]=false;};
  b.addEventListener('pointerdown',down); b.addEventListener('pointerup',up); b.addEventListener('pointerleave',up); b.addEventListener('pointercancel',up);
});
const $=id=>document.getElementById(id);
async function requestLandscape(){
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (err) { console.log('Landscape lock is controlled by the browser or Android app settings.'); }
}
function start(isRace){
  requestLandscape();
  race=isRace; running=true; speed=0; cp=0;
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); $('mobileControls').classList.remove('hidden'); $('help').classList.remove('hidden');
  $('modeLabel').textContent=race?'CITY RACE':'FREE DRIVE';
  $('mission').textContent=race?'Drive through the glowing checkpoints!':'Explore Zanta City';
  $('raceInfo').style.display=race?'block':'none';
  checkpoints.forEach((c,i)=>c.visible=race&&i===0);
}
$('freeDrive').onclick=()=>start(false);
$('startRace').onclick=()=>start(true);
$('backMenu').onclick=()=>{running=false;$('menu').classList.remove('hidden');$('hud').classList.add('hidden');$('mobileControls').classList.add('hidden');$('help').classList.add('hidden');speed=0;};
$('cameraBtn').onclick=()=>cameraMode=(cameraMode+1)%3;
$('soundBtn').onclick=()=>{soundOn=!soundOn;$('soundBtn').textContent='SOUND: '+(soundOn?'ON':'OFF');};

const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04);
 if(running){
  const gas=keys.w||keys.arrowup||touch.gas, brake=keys.s||keys.arrowdown||touch.brake;
  const left=keys.a||keys.arrowleft||touch.left, right=keys.d||keys.arrowright||touch.right;
  const nitro=keys.shift||touch.nitro;
  if(gas)speed=Math.min(speed+(nitro?30:18)*dt, nitro?58:38);
  else speed=Math.max(0,speed-7*dt);
  if(brake)speed=Math.max(-8,speed-32*dt);
  const steer=(left?1:0)-(right?1:0);
  heading+=steer*dt*(1.5+Math.abs(speed)*.035)*(speed<0?-1:1);
  car.rotation.y=heading;
  const forward=new THREE.Vector3(Math.sin(heading),0,-Math.cos(heading));
  car.position.addScaledVector(forward,speed*dt);
  car.position.x=THREE.MathUtils.clamp(car.position.x,-230,230);
  car.position.z=THREE.MathUtils.clamp(car.position.z,-230,230);
  traffic.forEach(t=>{
    if(t.axis)t.g.position.x+=t.speed*t.dir*dt; else t.g.position.z+=t.speed*t.dir*dt;
    const v=t.axis?t.g.position.x:t.g.position.z;if(v>230)t.g.position[t.axis?'x':'z']=-230;if(v< -230)t.g.position[t.axis?'x':'z']=230;
  });
  if(race){
    const target=checkpoints[cp];
    if(target && car.position.distanceTo(target.position)<7){
      target.visible=false; cp++;
      if(cp<5)checkpoints[cp].visible=true;
      $('checkpointCount').textContent=cp+' / 5';
      $('mission').textContent=cp===5?'RACE COMPLETE! Great driving!':'Checkpoint '+(cp+1)+' of 5';
      if(cp===5){race=false;$('modeLabel').textContent='RACE COMPLETE';}
    }
  }
  $('speed').textContent=String(Math.round(Math.abs(speed)*3.6)).padStart(3,'0');
 }
 const follow=new THREE.Vector3(Math.sin(heading),0,-Math.cos(heading));
 let desired;
 if(cameraMode===0) desired=car.position.clone().add(new THREE.Vector3(0,7,0)).addScaledVector(follow,-11);
 else if(cameraMode===1) desired=car.position.clone().add(new THREE.Vector3(0,15,0)).addScaledVector(follow,-18);
 else desired=car.position.clone().add(new THREE.Vector3(0,2.2,0)).addScaledVector(follow,2.5);
 camera.position.lerp(desired,.09);
 const look=car.position.clone().add(new THREE.Vector3(0,1,0)).addScaledVector(follow,cameraMode===2?12:5);
 camera.lookAt(look);
 renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
$('loading').style.display='none';
