// ════════════════ WORLD & GAME STATE ═════════════════
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),mini=document.getElementById('mini'),mctx=mini.getContext('2d');
const W=3200,H=2400,ROAD=150,GRID=400;
let cash=250,player={x:480,y:480,a:0,speed:0,onFoot:true},camera={x:0,y:0},mode='arrows',keys={},sound=true,tilt=0,ownedPulse=false;
let cars=[],people=[],buildings=[],targets=[],bullets=[],missionIndex=0,missionDone=0;
const missions=Array.from({length:60},(_,i)=>({name:['City Explorer','Downtown Cruise','Park Visit','Coast Road','Market Run','Precision Driver'][i%6]+' '+(i+1),desc:['Visit the marked landmark','Drive around the city','Reach the highlighted checkpoint'][i%3],reward:100+(i%5)*50}));
const landmarks=[{x:500,y:350,n:'Central Plaza'},{x:1300,y:750,n:'Ocean Mall'},{x:2400,y:500,n:'Skyline Tower'},{x:650,y:1750,n:'Palm Park'},{x:2200,y:1900,n:'Harbour Point'}];
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}addEventListener('resize',resize);resize();
function rnd(a,b){return a+Math.random()*(b-a)}
// ════════════════ CITY GENERATION ═════════════════
for(let x=0;x<W;x+=GRID)for(let y=0;y<H;y+=GRID){
  if(x%800===0||y%800===0)continue;
  buildings.push({x:x+55,y:y+55,w:GRID-110,h:GRID-110,c:['#59616a','#66727b','#4e5b65','#6a6462'][Math.floor(rnd(0,4))],name:'Building'});
}
const carColors=['#e94d59','#e9ecef','#3478c5','#d9a441','#202b36','#6fbd9a'];
for(let i=0;i<70;i++){let horizontal=Math.random()>.5;cars.push({x:rnd(100,W-100),y:rnd(100,H-100),a:horizontal?0:Math.PI/2,color:carColors[i%carColors.length],parked:true,traffic:i%4===0,speed:0,occupied:false,model:['Vortex GT','Nova Sport','Metro X','Falcon RS'][i%4]})}
for(let i=0;i<95;i++)people.push({x:rnd(100,W-100),y:rnd(100,H-100),a:rnd(0,6.28),phase:rnd(0,10),talk:i%3===0,shirt:['#e5a35a','#66a9d8','#d77c9d','#a7c66b'][i%4]});
for(let i=0;i<18;i++)targets.push({x:rnd(250,W-250),y:rnd(250,H-250),active:true});
const collides=(x,y,r=18)=>buildings.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
function roadAt(x,y){return Math.min(Math.abs((x%800)-0),Math.abs((x%800)-400),Math.abs((y%800)-0),Math.abs((y%800)-400))<80}
function say(t){let el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1900)}
// ════════════════ AUDIO ════════════════════════════
let audio=null,engineOsc=null;
function beep(freq=440,dur=.12,type='sine'){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}}
function engine(){if(!sound||player.onFoot||!audio)return;beep(75+Math.abs(player.speed)*2,.08,'sawtooth')}
// ════════════════ MOVEMENT & INTERACTION ═══════════
function update(){
 const steer=(keys.left?-1:0)+(keys.right?1:0)+(mode==='tilt'?tilt:0);
 if(!player.onFoot){
   player.a+=steer*.045*(Math.abs(player.speed)/4+.3);
   player.speed+=(keys.gas?.18:0)-(keys.brake?.22:0);player.speed*=.985;player.speed=Math.max(-2.5,Math.min(7,player.speed));
 }else{player.a+=steer*.055;let f=(keys.gas?2.3:0)-(keys.brake?1.6:0);player.speed=(player.speed+f)*.82;player.speed=Math.max(-2,Math.min(2,player.speed))}
 let nx=player.x+Math.cos(player.a)*player.speed,ny=player.y+Math.sin(player.a)*player.speed;
 if(!collides(nx,ny,player.onFoot?12:27)){player.x=nx;player.y=ny}else player.speed=0;
 cars.forEach(c=>{if(c.traffic&&!c.occupied){c.x+=Math.cos(c.a)*.7;c.y+=Math.sin(c.a)*.7;if(c.x>W)c.x=0;if(c.y>H)c.y=0}});
 people.forEach(p=>{p.phase+=.015;if(p.phase>3){p.a+=rnd(-.015,.015);p.x+=Math.cos(p.a)*.12;p.y+=Math.sin(p.a)*.12} });
 bullets.forEach(b=>{b.x+=Math.cos(b.a)*8;b.y+=Math.sin(b.a)*8;b.life--;targets.forEach(t=>{if(t.active&&Math.hypot(t.x-b.x,t.y-b.y)<30){t.active=false;cash+=10;beep(680,.1);say('Training drone tagged +$10')}})});bullets=bullets.filter(b=>b.life>0);
 let goal=landmarks[missionIndex%landmarks.length];if(Math.hypot(goal.x-player.x,goal.y-player.y)<95){cash+=missions[missionIndex].reward;missionDone++;missionIndex=(missionIndex+1)%60;say('Mission complete! +$'+missions[(missionIndex+59)%60].reward)}
 document.getElementById('cash').textContent=cash;document.getElementById('vehicle').textContent=player.onFoot?'ON FOOT':'DRIVING';document.getElementById('mission').textContent=`MISSION ${String(missionIndex+1).padStart(2,'0')}/60`;
}
function interact(){if(player.onFoot){let c=cars.find(c=>Math.hypot(c.x-player.x,c.y-player.y)<75);if(c){player.onFoot=false;c.occupied=true;player.car=c;player.x=c.x;player.y=c.y;player.a=c.a;say('Entered '+c.model);beep(180,.2,'sawtooth')}else say('Go near a parked car to enter')}else{player.onFoot=true;player.car.occupied=false;player.car.x=player.x+Math.cos(player.a+1)*55;player.car.y=player.y+Math.sin(player.a+1)*55;player.car=null;player.speed=0;say('You are on foot')}}
function fire(){if(!ownedPulse){say('Buy the Pulse Blaster in the shop first');return}bullets.push({x:player.x,y:player.y,a:player.a,life:45});beep(520,.1,'triangle')}
function openPanel(html){document.getElementById('panelContent').innerHTML=html;document.getElementById('panel').classList.remove('hidden')}
function shop(){openPanel(`<h1> CITY SHOP </h1><p>Upgrade your city adventure.</p><button class="item" id="buyPulse">Pulse Blaster — training tool <span>$180</span></button><button class="item" id="buyPaint">Premium vehicle paint <span>$90</span></button><p>Pulse Blaster only tags floating training drones. No people are targets.</p>`);document.getElementById('buyPulse').onclick=()=>{if(cash>=180){cash-=180;ownedPulse=true;say('Pulse Blaster purchased');close()}else say('Not enough cash')};document.getElementById('buyPaint').onclick=()=>{if(cash>=90){cash-=90;if(!player.onFoot)player.car.color='#c43dff';say('New paint purchased');close()}else say('Not enough cash')}}
function missionPanel(){openPanel(`<h1>MISSIONS — 60</h1><p>Explore landmarks and earn cash. Current: ${missions[missionIndex].name}</p>`+missions.map((m,i)=>`<button class="item">${String(i+1).padStart(2,'0')} · ${m.name}<span>${i<missionIndex?'✓':'+$'+m.reward}</span></button>`).join(''))}
function settings(){openPanel(`<h1>SETTINGS</h1><button class="item" id="soundToggle">Sound: ${sound?'ON':'OFF'} <span>TOGGLE</span></button><button class="item" id="reset">Reset position <span>↺</span></button><p>Landscape mode · Control type can be changed using ‹ › / ◉ / ▣.</p>`);document.getElementById('soundToggle').onclick=()=>{sound=!sound;settings()};document.getElementById('reset').onclick=()=>{player.x=480;player.y=480;player.a=0;player.speed=0;close()}}
function close(){document.getElementById('panel').classList.add('hidden')}
document.getElementById('closePanel').onclick=close;document.getElementById('shopBtn').onclick=shop;document.getElementById('missionsBtn').onclick=missionPanel;document.getElementById('settingsBtn').onclick=settings;
document.getElementById('action').onclick=interact;document.getElementById('fire').onclick=fire;
document.getElementById('mapBtn').onclick=()=>openMap();
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));document.querySelectorAll('.steer').forEach(x=>x.classList.remove('active'));document.getElementById(mode).classList.add('active');if(mode==='tilt'&&DeviceOrientationEvent?.requestPermission)DeviceOrientationEvent.requestPermission().catch(()=>{})});
function bind(id,key){let el=document.getElementById(id);el.onpointerdown=e=>{e.preventDefault();keys[key]=true;el.setPointerCapture(e.pointerId)};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>el.addEventListener(ev,()=>keys[key]=false))}
bind('left','left');bind('right','right');bind('gas','gas');bind('brake','brake');
document.addEventListener('keydown',e=>{if(['ArrowLeft','a'].includes(e.key))keys.left=true;if(['ArrowRight','d'].includes(e.key))keys.right=true;if(['ArrowUp','w'].includes(e.key))keys.gas=true;if(['ArrowDown','s'].includes(e.key))keys.brake=true;if(e.key==='e')interact();if(e.key===' ')fire()});
document.addEventListener('keyup',e=>{if(['ArrowLeft','a'].includes(e.key))keys.left=false;if(['ArrowRight','d'].includes(e.key))keys.right=false;if(['ArrowUp','w'].includes(e.key))keys.gas=false;if(['ArrowDown','s'].includes(e.key))keys.brake=false});
addEventListener('deviceorientation',e=>{if(mode==='tilt'&&e.gamma!==null)tilt=Math.max(-1,Math.min(1,e.gamma/25))});
let wheel=document.getElementById('wheelPad');wheel.onpointermove=e=>{if(e.buttons){let r=wheel.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2);keys.left=dx<-10;keys.right=dx>10}};wheel.onpointerup=()=>{keys.left=keys.right=false};
// ════════════════ MAP & RENDERING ═════════════════
let mapOpen=false;function openMap(){mapOpen=true;openPanel(`<h1> ZANTA CITY MAP </h1><canvas id="bigmap" width="900" height="600" style="width:100%;border-radius:10px;background:#263b36"></canvas><p>Red marker: your location · Gold: mission destination</p>`);drawMap(document.getElementById('bigmap').getContext('2d'),900,600)}
function drawMap(c,w,h){c.fillStyle='#345448';c.fillRect(0,0,w,h);c.fillStyle='#777e83';for(let x=0;x<W;x+=400)c.fillRect(x/W*w-12,0,24,h);for(let y=0;y<H;y+=400)c.fillRect(0,y/H*h-12,w,24);c.fillStyle='#69727a';buildings.forEach(b=>c.fillRect(b.x/W*w,b.y/H*h,b.w/W*w,b.h/H*h));c.fillStyle='#ffd05a';let g=landmarks[missionIndex%landmarks.length];c.beginPath();c.arc(g.x/W*w,g.y/H*h,8,0,7);c.fill();c.fillStyle='#ff405b';c.beginPath();c.arc(player.x/W*w,player.y/H*h,9,0,7);c.fill()}
function render(){
 let vw=innerWidth,vh=innerHeight;camera.x=Math.max(0,Math.min(W-vw,player.x-vw/2));camera.y=Math.max(0,Math.min(H-vh,player.y-vh/2));
 ctx.clearRect(0,0,vw,vh);ctx.save();ctx.translate(-camera.x,-camera.y);
 ctx.fillStyle='#345448';ctx.fillRect(0,0,W,H);
 // street grid
 ctx.fillStyle='#596168';for(let x=0;x<W;x+=400)ctx.fillRect(x-ROAD/2,0,ROAD,H);for(let y=0;y<H;y+=400)ctx.fillRect(0,y-ROAD/2,W,ROAD);
 ctx.strokeStyle='#d9d5a055';ctx.setLineDash([25,25]);ctx.lineWidth=3;for(let x=0;x<W;x+=400){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=400){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.setLineDash([]);
 buildings.forEach(b=>{ctx.fillStyle='#17212a55';ctx.fillRect(b.x+12,b.y+14,b.w,b.h);ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#87949c';ctx.fillRect(b.x+10,b.y+10,b.w-20,8);ctx.fillStyle='#a7c5ce';for(let xx=b.x+22;xx<b.x+b.w-20;xx+=42)for(let yy=b.y+35;yy<b.y+b.h-20;yy+=45)ctx.fillRect(xx,yy,14,18);ctx.fillStyle='#e9edf0';ctx.font='12px Arial';ctx.fillText('NO ENTRY',b.x+15,b.y+b.h/2)});
 landmarks.forEach((l,i)=>{ctx.fillStyle='#f5c65b';ctx.beginPath();ctx.arc(l.x,l.y,28+Math.sin(Date.now()/250)*5,0,7);ctx.fill();ctx.fillStyle='#111';ctx.font='bold 12px Arial';ctx.fillText('★ '+l.n,l.x-40,l.y-40)});
 cars.forEach(c=>drawCar(c));people.forEach(p=>{ctx.fillStyle=p.shirt;ctx.beginPath();ctx.arc(p.x,p.y,9,0,7);ctx.fill();ctx.fillStyle='#f1c6a5';ctx.beginPath();ctx.arc(p.x,p.y-10,6,0,7);ctx.fill();if(p.talk&&Math.sin(p.phase*3)>.6){ctx.fillStyle='white';ctx.font='11px Arial';ctx.fillText('•••',p.x+8,p.y-18)}});
 targets.forEach(t=>{if(t.active){ctx.fillStyle='#64e7ff';ctx.beginPath();ctx.arc(t.x,t.y,13,0,7);ctx.fill();ctx.strokeStyle='white';ctx.stroke()}});bullets.forEach(b=>{ctx.fillStyle='#aaf5ff';ctx.beginPath();ctx.arc(b.x,b.y,5,0,7);ctx.fill()});
 if(player.onFoot){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.a);ctx.fillStyle='#f5d6b5';ctx.beginPath();ctx.arc(0,-7,7,0,7);ctx.fill();ctx.fillStyle='#ff405b';ctx.fillRect(-7,0,14,19);ctx.fillStyle='#20252a';ctx.fillRect(-8,17,6,8);ctx.fillRect(2,17,6,8);ctx.restore()}else drawCar(player.car,true);
 ctx.restore();
 mctx.clearRect(0,0,150,100);drawMap(mctx,150,100);
}
function drawCar(c,active=false){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.fillStyle='#10151b';ctx.fillRect(-30,-19,60,38);ctx.fillStyle=c.color;ctx.fillRect(-27,-16,54,32);ctx.fillStyle='#b6dce9';ctx.fillRect(-10,-13,22,26);ctx.fillStyle='#fff2a8';ctx.fillRect(23,-12,5,7);ctx.fillRect(23,5,5,7);if(active){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(-32,-21,64,42)}ctx.restore()}
function loop(){update();render();requestAnimationFrame(loop)}loop();
say('Welcome to ZANTA CITY — explore, drive and complete 60 missions!');
