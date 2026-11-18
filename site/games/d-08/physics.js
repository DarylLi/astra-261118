/* Metres, seconds, radians. A fixed integration step makes input and drawing independent. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortPhysics = factory();
})(globalThis, function () {
  'use strict';
  const clamp = (x,a,b) => Math.max(a,Math.min(x,b));
  const homes = [-3.5,1.45,6.4], slots = [-3.5,1.45,6.4];
  const yardZ = -3.55, deckZ = 3.9, yardY = 1.86, boxH = 1.85, cruise = 5.85;
  const nx = 55, nz = 25, cell = 1.45, x0 = -39.15, z0 = 0.10;
  function create(options={}) {
    const ropeLength = options.ropeLength ?? 12;
    if (!(ropeLength > 0 && Number.isFinite(ropeLength))) throw Error('ropeLength');
    let seed = options.seed ?? 74983;
    const rand = () => ((seed = (1664525*seed+1013904223)>>>0)/4294967296);
    const winds = Array.from({length:9},(_,i)=>({u:.16*(rand()-.4),v:0,goal:.2*rand(),wait:.3+rand()*2, light:.3+i*.025}));
    const water = {h:new Float64Array(nx*nz),v:new Float64Array(nx*nz),foam:new Float64Array(nx*nz)};
    for(let i=0;i<water.h.length;i++) water.h[i]=.012*Math.sin(i%nx*.61+Math.floor(i/nx)*.48)+.004*(rand()-.5);
    const fenders = Array.from({length:19},(_,i)=>({x:-26+i*3,angle:(rand()-.5)*.035,v:0}));
    const motes = Array.from({length:35},()=>({x:rand()*48-24,y:rand()*9+1,z:rand()*20-13,vx:0,vy:0,anchor:0}));
    motes.forEach(p=>{p.anchor=p.y;p.home=p.x;});
    const hook={x:homes[0]-.9,z:yardZ+.75,vx:0,vz:0,tx:homes[0]-.9,tz:yardZ+.75,y:cruise,vy:0,
      ax:.009,az:-.006,wx:0,wz:0,lock:0,lockV:0,spool:0,beacon:0,lightV:0};
    let seq=0, cargoSeq=0;
    const ship = (x,mode) => ({id:seq++,x,speed:0,heave:0,heaveV:0,roll:0,rollV:0,trim:0,trimV:0,load:0,displacementKg:0,mode});
    let ships=[ship(0,'berth'),ship(-55,'waiting')],activeShip=ships[0], cargo=[];
    const sleds=homes.map((x,kind)=>({x,kind,z:yardZ,speed:0}));
    let round=0, phase='pick', age=0, idle=0, elapsed=0, pointer=false, candidate=0, selected=null, dropSlot=0, offset=0;
    const occupied = () => cargo.filter(c=>c.carrier===activeShip.id);
    function batch(replenish) {
      for(let i=0;i<3;i++) cargo.push({id:cargoSeq++,kind:i,massKg:[9800,10600,9450][i],mode:replenish?'feed':'yard',carrier:null,
        x:homes[i],z:replenish?sleds[i].z:yardZ,y:yardY,roll:0,trim:0,slot:-1,speed:0,shake:0,w:0});
    }
    batch(false);
    const events=[];
    const emit = (type,power=1) => {events.push({type,power,time:elapsed});if(events.length>64)events.shift();};
    function enter(name){phase=name;age=0;}
    const available=()=>cargo.filter(c=>c.mode==='yard');
    const free=()=>[0,1,2].filter(i=>!occupied().some(c=>c.slot===i));
    const near=(items,x,pos)=>items.reduce((a,b)=>Math.abs(pos(a)-x)<Math.abs(pos(b)-x)?a:b);
    function target(x,z){
      const dx=clamp(x,-5.8,8.2)+7.3,dz=clamp(z,-6,6.1)+2.05;
      const reach=Math.min(1,15.48/Math.hypot(dx,dz));
      hook.tx=-7.3+dx*reach;hook.tz=-2.05+dz*reach;
    }
    function press(hit) {
      if(pointer || !hit || !['pick','carry'].includes(phase)) return false;
      if(phase==='pick' && hit.type==='cargo'){
        const c=available().find(c=>c.id===hit.id);if(!c)return false;
        candidate=c.id;target(c.x,c.z);
      }else if(phase==='carry' && hit.type==='deck'){
        dropSlot=near(free(),hit.x,i=>slots[i]);target(slots[dropSlot],deckZ);
      }else if(hit.type!=='hook')return false;
      pointer=true;idle=0;return true;
    }
    function move(x,z){
      if(!pointer || !Number.isFinite(x+z))return;
      target(x,z);idle=0;
    }
    function release(hit) {
      if(!pointer)return;pointer=false;idle=0;
      if(phase==='pick'){
        let chosen=hit?.type==='cargo' && available().find(c=>c.id===hit.id);
        if(!chosen)chosen=near(available(),hook.tx,c=>c.x);
        selected=chosen;candidate=chosen.id;target(chosen.x,chosen.z);enter('alignPick');
      }else if(phase==='carry'){
        if(hit?.type==='deck' || (hook.tz>1.5 && hook.tz<6.4)){
          dropSlot=near(free(),hit?.type==='deck'?hit.x:hook.tx,i=>slots[i]);
          target(slots[dropSlot],deckZ);enter('alignDrop');
        }else target(hook.x,hook.z);
      }
    }
    function cancel(){pointer=false;target(hook.x,hook.z);idle=0;}
    function sample(x,z){
      const gx=clamp((x-x0)/cell,0,nx-1.001),gz=clamp((z-z0)/cell,0,nz-1.001);
      const i=Math.floor(gx)+nx*Math.floor(gz),a=gx%1,b=gz%1,h=water.h;
      return (h[i]*(1-a)+h[i+1]*a)*(1-b)+(h[i+nx]*(1-a)+h[i+nx+1]*a)*b;
    }
    function updateAir(dt){
      for(let i=0;i<winds.length;i++){
        const w=winds[i];w.wait-=dt;
        if(w.wait<=0){w.wait=1.1+rand()*2.65;w.goal=(rand()-.38)*.95;}
        w.v+=((w.goal-w.u)*1.4-w.v*1.7)*dt;w.u+=w.v*dt;
        w.light+=(clamp(.52+w.u*.65,.22,.92)-w.light)*dt*.42;
      }
      motes.forEach((p,i)=>{
        const w=winds[i%9];
        p.vx+=(.6*w.u+.07*(p.home-p.x)-p.vx*.52)*dt;
        p.vy+=(w.v*.18+(p.anchor-p.y)*.28-p.vy*.37)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
      });
    }
    // Finite-difference shallow water. No flux through the quay. The outer sea absorbs energy.
    function updateWater(dt){
      const h=water.h,v=water.v,f=water.foam;
      for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
        const k=j*nx+i,a=h[k],l=h[i?k-1:k],r=h[i<nx-1?k+1:k],front=h[j?k-nx:k],back=h[j<nz-1?k+nx:k];
        const w=winds[Math.min(8,Math.floor(i/6.2))];
        const offshore=(j===nz-4?1:0)-(j===nz-5?1:0);
        const inshore=i%9===2?((j===3?1:0)-(j===4?1:0)):0;
        const forcing=(offshore+inshore)*w.u*.28;
        v[k]+=(5.7*(l+r+front+back-4*a)+forcing-(.28+(j>nz-4 || i<2 || i>nx-3?.9:0))*v[k])*dt;
        f[k]+=(clamp((Math.abs(v[k])-.028)*(j===0?6.8:1.6)+Math.abs(l-r)*.25,0,1)-f[k])*dt*(j===0?2:1.25);
      }
      for(const s of ships){
        if(s.speed<.08)continue;
        const stern=(s.x-9.7-x0)/cell, bow=(s.x+10.5-x0)/cell;
        for(let j=0;j<7;j++)for(let i=Math.max(0,Math.floor(stern)-3);i<=Math.min(nx-1,Math.ceil(bow)+2);i++){
          const k=j*nx+i,dy=j-(deckZ-z0)/cell;
          const throat=Math.exp(-.7*(i-stern)**2-.52*dy*dy), shoulder=Math.exp(-.8*(i-bow)**2-.4*dy*dy);
          v[k]+=dt*s.speed*(.078*shoulder-.094*throat);
          f[k]=Math.min(1,f[k]+dt*s.speed*.34*throat);
        }
      }
      for(let k=0;k<h.length;k++)h[k]+=v[k]*dt;
      for(const b of fenders){
        const surf=sample(b.x,.2);
        b.v+=(surf*1.7+winds[Math.abs(Math.round(b.x))%9].u*.022-3.7*b.angle-1.1*b.v)*dt;
        b.angle+=b.v*dt;
      }
    }
    function updateShips(dt){
      ships.forEach(s=>{
        let goal=0;
        if(s.mode==='leave')goal=4.55;
        if(s.mode==='arrive'||s.mode==='berth')goal=clamp(-s.x*.36,-.6,4.4);
        s.speed+=clamp((goal-s.speed)*1.7,-1.5,1.05)*dt;
        s.x+=s.speed*dt;
        const nearH=sample(s.x,2),farH=sample(s.x,5.8),bow=sample(s.x+8,deckZ),stern=sample(s.x-8,deckZ);
        s.heaveV+=((.42*(nearH+farH)-s.displacementKg/(1025*82)-s.heave)*4.8-2.25*s.heaveV)*dt;
        s.heave+=s.heaveV*dt;
        s.rollV+=((clamp((nearH-farH)/4,-.04,.04)-s.roll)*5.2-1.65*s.rollV)*dt;s.roll+=s.rollV*dt;
        const balance=cargo.reduce((v,c)=>v+(c.carrier===s.id?slots[c.slot]*-.0008:0),0);
        s.trimV+=(((bow-stern)/21+balance-s.trim)*3.7-s.trimV*1.9)*dt;s.trim+=s.trimV*dt;
      });
    }
    function updateHook(dt){
      const h=hook,dx=h.tx-h.x,dz=h.tz-h.z,dist=Math.hypot(dx,dz);
      const k=Math.min(2.6,1.5/Math.max(.00001,dist));
      let fx=(dx*k-h.vx)*3.7,fz=(dz*k-h.vz)*3.7;
      const acceleration=2.8/(1+(selected?.mode==='hook'?selected.massKg/20000:0));
      const a=Math.min(1,acceleration/Math.max(.00001,Math.hypot(fx,fz)));fx*=a;fz*=a;
      h.vx+=fx*dt;h.vz+=fz*dt;h.x+=h.vx*dt;h.z+=h.vz*dt;
      const guiding=['alignPick','lowerPick','lock','alignDrop','lowerDrop','unlock'].includes(phase);
      const w=winds[3], friction=guiding?2.9:2*.4;
      h.wx+=(-9.81/ropeLength*Math.sin(h.ax)-fx/ropeLength-friction*h.wx+(guiding?-2.6*h.ax:0)+w.u*.0009)*dt;
      h.wz+=(-9.81/ropeLength*Math.sin(h.az)-fz/ropeLength-friction*h.wz+(guiding?-2.6*h.az:0)+w.v*.0007)*dt;
      // Cable brake limits the world-space travel of the suspended hook as well as the trolley.
      const px=h.x+ropeLength*Math.sin(h.ax),pz=h.z+ropeLength*Math.sin(h.az);
      const nx=h.x+ropeLength*Math.sin(h.ax+h.wx*dt),nz=h.z+ropeLength*Math.sin(h.az+h.wz*dt);
      const stepX=h.vx*dt+nx-px,stepZ=h.vz*dt+nz-pz;
      const governor=Math.min(1,1.5*dt/Math.max(1e-12,Math.hypot(stepX,stepZ)));
      const ax=Math.asin(clamp(Math.sin(h.ax)+(stepX*governor-h.vx*dt)/ropeLength,-1,1));
      const az=Math.asin(clamp(Math.sin(h.az)+(stepZ*governor-h.vz*dt)/ropeLength,-1,1));
      h.wx=(ax-h.ax)/dt;h.wz=(az-h.az)/dt;h.ax=ax;h.az=az;
      let y=cruise;
      if(phase==='lowerPick'||phase==='lock')y=yardY+boxH;
      if(phase==='lowerDrop'||phase==='unlock')y=deckHeight(activeShip,dropSlot)+boxH;
      const drive=clamp((y-h.y)*2.8,-1.7,1.7);
      h.vy+=clamp((drive-h.vy)*5.8,-4.1,4.1)*dt;
      const oldY=h.y;
      h.y+=h.vy*dt;
      if(y<cruise && h.y<y){h.y=y;h.vy=Math.max(0,h.vy);}
      h.spool-=(h.y-oldY)/.24;
      const lockOn=['lock','lift','carry','alignDrop','lowerDrop'].includes(phase);
      h.lockV+=((Number(lockOn)-h.lock)*83-8*h.lockV)*dt;h.lock+=h.lockV*dt;
      const motor=pointer||phase.startsWith('align')||phase.startsWith('lower')||phase==='lift';
      h.lightV+=((motor?3.5:.55)-h.lightV)*dt*2.3;h.beacon+=h.lightV*dt;
    }
    function tip(){
      const dx=ropeLength*Math.sin(hook.ax),dz=ropeLength*Math.sin(hook.az);
      const vertical=Math.sqrt(Math.max(0,ropeLength*ropeLength-dx*dx-dz*dz));
      return {x:hook.x+dx,z:hook.z+dz,y:hook.y+(ropeLength-vertical)};
    }
    function deckHeight(s,i){return 2.09+s.heave+slots[i]*Math.sin(s.trim);}
    function updateCargo(dt){
      const end=tip();
      for(const sled of sleds){
        const occupied=cargo.some(c=>c.kind===sled.kind && (c.mode==='feed'||c.mode==='yard'||c.mode==='hook'&&c.y<yardY+.65&&Math.abs(c.z-yardZ)<.5));
        const dz=(occupied?yardZ:-21.25-.95*sled.kind)-sled.z;
        const speedLimit=1.77+.08*winds[sled.kind].light,goal=clamp(dz*1.6,-speedLimit,speedLimit);
        const traction=(1.14+.12*winds[sled.kind].light)/(occupied?1.12:1);
        sled.speed+=clamp((goal-sled.speed)*3.0,-traction,traction)*dt;sled.z+=dt*sled.speed;
      }
      for(const c of cargo){
        c.w+=(-16*c.shake-3.1*c.w+(c.mode==='yard'?winds[c.kind].v*.0009:0))*dt;c.shake+=c.w*dt;
        if(c.mode==='feed'){
          c.speed=sleds[c.kind].speed;c.z=sleds[c.kind].z;
          if(Math.abs(c.z-yardZ)<.003 && Math.abs(c.speed)<.012)c.mode='yard';
        }else if(c.mode==='hook'){
          c.x=end.x;c.z=end.z;c.y=end.y-boxH+offset;
          c.roll+=((hook.az*.55)-c.roll)*dt*8;c.trim+=(-hook.ax*.55-c.trim)*dt*8;
          offset*=Math.exp(-4*dt);
        }else if(c.mode==='deck'){
          const s=ships.find(s=>s.id===c.carrier);
          c.x=s.x+slots[c.slot]*Math.cos(s.trim);c.z=deckZ;c.y=deckHeight(s,c.slot);
          c.roll=s.roll;c.trim=s.trim;
        }
      }
    }
    function workflow(){
      const end=tip(), error=Math.hypot(end.x-hook.tx,end.z-hook.tz),still=Math.hypot(hook.vx,hook.vz)<.08;
      if(phase==='alignPick'&&error<.095&&still)enter('lowerPick');
      else if(phase==='lowerPick'&&Math.abs(hook.y-yardY-boxH)<.014) {enter('lock');emit('latch',.55);}
      else if(phase==='lock'&& age>.65){
        selected.mode='hook';offset=selected.y+boxH-hook.y;enter('lift');
      }else if(phase==='lift'&&hook.y>cruise-.07){enter('carry');dropSlot=near(free(),hook.x,i=>slots[i]);idle=0;}
      else if(phase==='alignDrop'&&error<.095&&still)enter('lowerDrop');
      else if(phase==='lowerDrop'&&Math.abs(hook.y-boxH-deckHeight(activeShip,dropSlot))<.018 && error<.017){
        const force=(Math.abs(hook.vy)+.46)*selected.massKg/10000;
        selected.mode='deck';selected.slot=dropSlot;selected.carrier=activeShip.id;activeShip.load++;activeShip.displacementKg+=selected.massKg;
        activeShip.heaveV-=force*.17;activeShip.rollV+=force*.009;selected.w=.035;
        const wi=Math.round((slots[dropSlot]-x0)/cell)+nx;water.v[wi]+=.038*force;
        emit('impact',force);enter('unlock');
      }else if(phase==='unlock'&&age>.83)enter('retract');
      else if(phase==='retract'&&hook.y>cruise-.07){
        selected=null;
        if(activeShip.load===3){emit('horn');enter('salute');}
        else {candidate=available()[0].id;enter('pick');idle=0;}
      }else if(phase==='salute'&&age>1.45){
        activeShip.mode='leave';
        ships.find(s=>s.mode==='waiting').mode='arrive';target(homes[0],yardZ);enter('sail');
      }else if(phase==='sail'&&activeShip.x>17){
        activeShip=ships.find(s=>s.mode==='arrive');batch(true);round++;enter('arrival');
      }else if(phase==='arrival'&&Math.abs(activeShip.x)<.04 && available().length===3){
        activeShip.mode='berth';ships.push(ship(-55,'waiting'));candidate=available()[0].id;enter('pick');idle=0;emit('ready',.25);
      }
      const gone=ships.filter(s=>s.mode==='leave'&&s.x>65);
      if(gone.length){ships=ships.filter(s=>!gone.includes(s));cargo=cargo.filter(c=>!gone.some(s=>s.id===c.carrier));}
    }
    function tick(dt){
      elapsed+=dt;age+=dt;if(!pointer)idle+=dt;
      updateAir(dt);updateWater(dt);updateShips(dt);updateHook(dt);updateCargo(dt);workflow();
    }
    let remainder=0;
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)throw Error('dt');
      remainder+=dt;
      while(remainder>=.01-1e-12){tick(.01);remainder-=.01;}
    }
    function live(){return {elapsed,phase,age,idle,pointer,hintActive:!pointer&&idle>=4-1e-9&&(phase==='pick'||phase==='carry'),round,hook,tip:tip(),cargo,ships,shipId:activeShip.id,
      candidate,selected:selected?.id??null,dropSlot,water,winds,fenders,motes,sleds,ropeLength};}
    function getState(){
      const s=live();return JSON.parse(JSON.stringify({...s,water:{h:[...water.h],v:[...water.v],foam:[...water.foam]}}));
    }
    return {step,getState,live,press,move,release,cancel,events,sample};
  }
  return {create,homes,slots,yardZ,deckZ,yardY,boxH,nx,nz,cell,x0,z0};
});
