/* Metres, kilograms, seconds. The model can run without a DOM or a renderer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Harbor = factory();
})(globalThis, function () {
  'use strict';
  const TAU = Math.PI * 2, G = 9.81, RHO = 1025;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function random(seed) {
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  // Positions are composed on the water plane, including on tall screens.
  const scatter = [
    [.72,.795,'boat'], [.518,.735,'glass'], [.89,.665,'crate'], [.45,.613,'crate'],
    [.665,.589,'float'], [.34,.516,'boat'], [.80,.492,'glass'], [.56,.473,'crate'],
    [.925,.421,'float'], [.165,.469,'glass'], [.63,.404,'boat'], [.395,.395,'crate'],
    [.105,.584,'float'], [.80,.365,'crate'], [.49,.902,'crate'], [.908,.865,'glass'],
    [.565,.555,'glass'], [.748,.666,'crate'], [.265,.378,'float'], [.095,.401,'crate']
  ];
  function layout(aspect) {
    const narrow = clamp((1.15-aspect)/.65,0,1);
    const pitch = (8.7 + 1.2*narrow)*Math.PI/180, height=4.25+1.0*narrow, eyeZ=12;
    const tan=Math.tan(17.5*Math.PI/180);
    function waterAt(u,v) {
      const dy=(1-2*v)*tan, dist=height/(Math.sin(pitch)-dy*Math.cos(pitch));
      return {x:(2*u-1)*tan*aspect*dist,z:eyeZ+dist*(-Math.cos(pitch)-dy*Math.sin(pitch))};
    }
    const goal=waterAt(.228-.02*narrow,.766+.035*narrow);
    const shipHome=waterAt(.684,.354+.018*narrow);
    return {aspect,narrow,height,pitch,eyeZ,goal,shipHome,waterAt, scale:1-.23*narrow,
      points:scatter.map(([u,v,kind])=>({...waterAt(u,v+.010*narrow),kind}))};
  }
  const kinds={
    crate:{h:.63,w:.80,d:.72,rho:445}, float:{h:.63,w:.63,d:.63,rho:267},
    glass:{h:.68,w:.68,d:.68,rho:370}, boat:{h:.56,w:1.01,d:2.55,rho:360}
  };
  function fraction(kind,depth,h) {
    const u=clamp(depth/h,0,1);
    if(kind==='glass'||kind==='float') return u*u*(3-2*u);
    return kind==='boat'?u*(.46+.54*u):u;
  }
  function create(aspect=1.44,seed=29143) {
    let frame=layout(aspect), rand=random(seed), elapsed=0, remainder=0, cycle=0;
    let phase='collect', idle=0, collected=0, active=0, guide=null, timer=0, serial=0, tick=0;
    const waves=[],wakes=[],drops=[],events=[],floats=[],dust=[],mooring={angle:.035,omega:0};
    let boat, wind=.72, gust=.70, gustIn=0, lastWave=null;
    const field={cols:21,rows:26,x0:-32,z0:-59,dx:3.2,dz:3,
      h:[],v:[],load:[],flow:[],turn:[]};
    for(let i=0;i<field.cols*field.rows;i++){
      field.h.push((rand()-.5)*.048);field.v.push((rand()-.5)*.06);
      field.load.push((rand()-.5)*.19);field.flow.push(rand()*6.28);field.turn.push(.2+rand()*2);
    }
    for(let i=0;i<30;i++) dust.push({x:rand()*18-9,y:rand()*3+.35,z:4-rand()*15,vx:rand()*.078,vy:0,age:rand()*7});
    function makeFloats(incoming=false){
      floats.length=0;collected=0;active=0;guide=null;idle=0;
      frame.points.forEach((p,id)=>{
        const k=kinds[p.kind],s=frame.scale*(.94+.13*rand()),h=k.h*s;
        const volume=k.w*k.d*k.h*s*s*s*(p.kind==='boat'?.57:p.kind==='crate'?1:Math.PI/6);
        let lo=0,hi=h;
        for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(fraction(p.kind,mid,h)<k.rho/RHO)lo=mid;else hi=mid;}
        const yaw = p.kind==='boat'? [1.00,-1.12,.9][id===0?0:id===5?1:2]:rand()*TAU;
        floats.push({id,kind:p.kind,x:p.x,z:p.z,homeX:p.x,homeZ:p.z,y:h/2-hi,
          vx:0,vz:0,vy:0,pitch:0,roll:0,dp:0,dr:0,yaw,turn:0,
          h,s,volume,mass:volume*k.rho,submerged:volume*k.rho/RHO,draft:hi,
          salt:rand(),status:incoming?'incoming':'drift',wait:incoming?rand()*2:0,charge:0,travel:0,trail:0,packed:0});
        if(incoming)floats[id].y=-h*1.10;
      });
    }
    makeFloats();
    function resetBoat(){
      boat={x:frame.shipHome.x,z:frame.shipHome.z,vx:0,vz:0,y:0,vy:0,yaw:1.24,roll:0,dr:0,
        steer:0,wakeDistance:0,loaded:0,loadTime:0,transfer:0,fresh:false,manifest:[]};
    }
    resetBoat();
    function sample(arr,x,z){
      const ix=clamp((x-field.x0)/field.dx,0,field.cols-1.001), iz=clamp((z-field.z0)/field.dz,0,field.rows-1.001);
      const i=Math.floor(ix)+Math.floor(iz)*field.cols,a=ix%1,b=iz%1,n=field.cols;
      return (arr[i]*(1-a)+arr[i+1]*a)*(1-b)+(arr[i+n]*(1-a)+arr[i+n+1]*a)*b;
    }
    function updateField(dt){
      gustIn-=dt;
      if(gustIn<=0){gust=.45+rand()*.7;gustIn=.6+rand()*1.5}
      wind+=(gust-wind)*dt*.65;
      const {cols,rows,h,v,load,flow,turn}=field;
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const k=j*cols+i;turn[k]-=dt;
        if(turn[k]<=0){load[k]=(rand()-.5)*.24*wind;turn[k]=.5+rand()*2.8;}
        const lap=h[k+(i<cols-1?1:0)]+h[k-(i?1:0)]+h[k+(j<rows-1?cols:0)]+h[k-(j?cols:0)]-4*h[k];
        v[k]+=(lap*.96-h[k]*1.1+load[k]-.87*v[k])*dt;
        flow[k]+=(.13*wind+.58*v[k]+.034*load[k])*dt;
      }
      for(let k=0;k<h.length;k++)h[k]+=v[k]*dt;
    }
    function packet(x,z,lambda,amp,source){
      const w={id:++serial,x,z,lambda,amp,source,age:0,radius:0};
      waves.push(w);if(waves.length>52)waves.shift(); return w;
    }
    function influence(w,x,z){
      const dist=Math.hypot(x-w.x,z-w.z),delta=dist-w.radius,width=.30+w.lambda*.48;
      if(Math.abs(delta)>width*2.7)return 0;
      return w.amp*Math.exp(-.5*(delta/width)**2)/Math.sqrt(1+.45*dist);
    }
    function surface(x,z){
      let height=sample(field.h,x,z);
      for(const w of waves){const e=influence(w,x,z);if(e)height+=e*Math.cos(TAU*(Math.hypot(x-w.x,z-w.z)-w.radius)/w.lambda);}
      return height;
    }
    function candidate(x,z) {
      let best=null,score=Infinity;
      if(phase!=='collect')return null;
      for(const f of floats)if(f.status==='drift'||f.status==='riding'){
        const d=Math.hypot(f.x-x,f.z-z);
        const reach=1.28*f.s+(f.kind==='boat'?.82:0)+Math.max(0,-f.z)*.025;
        if(d<=reach && d/reach<score){score=d/reach;best=f;}
      }
      return best;
    }
    function stroke(x,z,speed,dx=0,dz=0){
      if(![x,z,speed,dx,dz].every(Number.isFinite))return false;
      const f=candidate(x,z);if(!f)return false;
      idle=0;guide=null;active=f.id;
      // Finger speed changes only wavelength. Water displacement per pulse is fixed.
      const w=packet(x,z,.40+.17*clamp(speed,0,7),.105,'finger');
      lastWave={lambda:w.lambda,speed,id:w.id};
      f.charge=Math.min(1,f.charge+.49);
      const len=Math.hypot(dx,dz);
      if(len>.001){f.vx+=.14*dx/len;f.vz+=.14*dz/len;}
      return true;
    }
    function splash(x,z,count,power){
      for(let i=0;i<count;i++){
        const a=rand()*TAU,speed=(.4+rand()*1.30)*power;
        drops.push({x,y:.045,z,vx:Math.cos(a)*speed,vy:(1.2+rand()*2)*power,vz:Math.sin(a)*speed,r:.012+rand()*.026});
      }
    }
    function wake(x,z,vx,vz,strength){
      wakes.push({x,z,vx,vz,age:0,strength,width:.08,life:13+rand()*4});
      if(wakes.length>230)wakes.shift();
    }
    function finish(f){
      f.status='stowed';f.packed=collected++;f.charge=0;
      events.push({type:'bell',id:f.id});splash(frame.goal.x+.65*frame.scale,frame.goal.z-.67*frame.scale,28,1.06);
      packet(frame.goal.x+.65,frame.goal.z-.67,.67,.09,'basket');
      mooring.omega+=.26;active=(floats.find(o=>o.status==='drift')||f).id;
      if(collected===20){phase='arrival';timer=0;guide=null;events.push({type:'horn'});}
    }
    function updateFloat(f,dt){
      if(f.status==='stowed'||f.status==='aboard')return;
      if(f.status==='incoming'){f.wait-=dt;if(f.wait>0)return;f.status='drift';}
      if(f.status==='lifting'){
        f.travel+=dt*1.15;
        if(f.travel>=1){finish(f);return;}
        const t=f.travel;
        f.x=f.startX+(frame.goal.x-f.startX)*t;
        f.z=f.startZ+(frame.goal.z-f.startZ)*t;
        f.y=f.startY+2.26*frame.scale*4*t*(1-t)+.90*t;
        return;
      }
      const water=surface(f.x,f.z),imm=clamp(water-f.y+f.h*.5,0,f.h);
      f.submerged=f.volume*fraction(f.kind,imm,f.h); f.draft=imm;
      f.vy+=((RHO*f.submerged/f.mass-1)*G-3.3*f.vy)*dt;f.y+=f.vy*dt;
      const sx=(surface(f.x+.22,f.z)-surface(f.x-.22,f.z))/.44;
      const sz=(surface(f.x,f.z+.22)-surface(f.x,f.z-.22))/.44;
      const sn=Math.sin(f.yaw),cs=Math.cos(f.yaw);
      f.dp+=(-Math.atan(sz*cs+sx*sn)-f.pitch)*10*dt-2.5*f.dp*dt;
      f.dr+=(Math.atan(sx*cs-sz*sn)-f.roll)*11*dt-2.6*f.dr*dt;
      f.pitch+=f.dp*dt;f.roll+=f.dr*dt;
      let ax=0,az=0,energy=0;
      for(const w of waves){
        const e=influence(w,f.x,f.z),d=Math.max(.15,Math.hypot(f.x-w.x,f.z-w.z));
        const impulse=e*(w.source==='finger'&&active===f.id?9:2.2);
        ax+=impulse*(f.x-w.x)/d;az+=impulse*(f.z-w.z)/d;
        if(w.source==='finger')energy+=e;
      }
      if(f.status==='drift' && f.charge>.35 && energy>.009)f.status='riding';
      if(f.status==='riding'){
        // The packet releases the load into the intake current at the pier.
        const gx=frame.goal.x+.54*frame.scale-f.x,gz=frame.goal.z-.85*frame.scale-f.z;
        const d=Math.hypot(gx,gz);
        if(d<.42*frame.scale){Object.assign(f,{status:'lifting',travel:0,startX:f.x,startZ:f.z,startY:f.y});return;}
        const flow=Math.min(3.35,1.1+.24*d);
        ax+=(gx/d*flow-f.vx)*1.28;az+=(gz/d*flow-f.vz)*1.28;
        f.trail+=Math.hypot(f.vx,f.vz)*dt;
        if(f.trail>.43){wake(f.x,f.z,-f.vx*.04,-f.vz*.04,.23);f.trail=0;}
      }else{
        ax+=(f.homeX-f.x)*.13-.47*f.vx-.38*sx;
        az+=(f.homeZ-f.z)*.13-.47*f.vz-.38*sz;
      }
      f.vx+=ax*dt;f.vz+=az*dt;f.x+=f.vx*dt;f.z+=f.vz*dt;
      f.turn+=((sx-sz)*.19+.035*(f.vx*cs-f.vz*sn)-.86*f.turn)*dt;
      f.yaw+=f.turn*dt;
    }
    function updateShip(dt){
      const dock=frame.goal, outbound=phase==='departure';
      const moving=phase==='arrival'||outbound;
      if(moving){
        const target=outbound?frame.shipHome:{x:dock.x+2.9*frame.scale,z:dock.z-2.35*frame.scale};
        const dx=target.x-boat.x,dz=target.z-boat.z,d=Math.max(.001,Math.hypot(dx,dz));
        const v=Math.min(outbound?5.3:4.8,.45+.36*d);
        boat.vx+=(v*dx/d-boat.vx)*dt*.89;boat.vz+=(v*dz/d-boat.vz)*dt*.89;
        const angle=Math.atan2(boat.vx,boat.vz)-boat.yaw;
        boat.steer+=(Math.atan2(Math.sin(angle),Math.cos(angle))*2.8-2.5*boat.steer)*dt;
        boat.yaw+=boat.steer*dt;boat.x+=boat.vx*dt;boat.z+=boat.vz*dt;
        const speed=Math.hypot(boat.vx,boat.vz);boat.wakeDistance+=speed*dt;
        if(boat.wakeDistance>.65){
          boat.wakeDistance=0;
          const sin=Math.sin(boat.yaw),cos=Math.cos(boat.yaw);
          const sternX=boat.x-2.15*frame.scale*sin,sternZ=boat.z-2.15*frame.scale*cos;
          for(const side of [-1,1])wake(sternX+side*.4*cos,sternZ-side*.4*sin,side*.32*cos-.12*sin,-side*.32*sin-.12*cos,.80);
          packet(sternX,sternZ,1.23,.045+speed*.012,'ship');
        }
        if(d<.38 && !outbound){phase='loading';boat.vx=boat.vz=0;timer=0;}
        if(outbound && !boat.fresh && d<.60*Math.hypot(frame.shipHome.x-dock.x,frame.shipHome.z-dock.z)){
          boat.manifest=floats.map(f=>({id:f.id,slot:f.packed,s:f.s}));boat.fresh=true;
          makeFloats(true);
        }
        if(d<.50 && outbound){
          cycle++;boat.vx=boat.vz=boat.steer=0;boat.loadTime=boat.transfer=boat.loaded=0;
          boat.fresh=false;boat.manifest=[];phase='collect';timer=idle=0;
        }
      }else if(phase==='loading'){
        boat.loadTime+=dt;boat.transfer=Math.min(20,boat.loadTime*3.6);
        const loaded=Math.floor(boat.transfer);
        while(boat.loaded<loaded){floats.find(f=>f.packed===boat.loaded).status='aboard';boat.loaded++;boat.vy-=.055;}
        if(boat.loaded===20&&boat.loadTime>6.4){phase='departure';timer=0;events.push({type:'outbound'});}
      }
      const level=surface(boat.x,boat.z)-boat.loaded*.0025;
      boat.vy+=((level-boat.y)*7-2.7*boat.vy)*dt;boat.y+=boat.vy*dt;
      boat.dr+=((surface(boat.x+.7,boat.z)-level)*4-boat.roll*6-boat.dr*2)*dt;boat.roll+=boat.dr*dt;
    }
    function updateGuide(){
      const f=floats[active];
      if(idle<4||phase!=='collect'||!f||f.status!=='drift'){guide=null;return;}
      // Pauses between gestures. Recompute the stroke from the drifting target.
      const p=(idle-4)%5.5;
      if(p>2.8){guide=null;return;}
      const t=clamp((p-.30)/1.65,0,1),d=Math.max(.01,Math.hypot(frame.goal.x-f.x,frame.goal.z-f.z));
      const a=1.48-t*.98;
      guide={x:f.x-(frame.goal.x-f.x)/d*a*f.s,z:f.z-(frame.goal.z-f.z)/d*a*f.s,
        y:.16+.17*(1-Math.sin(t*Math.PI)),alpha:Math.min(1,p*4,(2.8-p)*3),t};
    }
    function advance(dt){
      elapsed+=dt;timer+=dt;idle+=dt;tick++;updateField(dt);
      for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.age+=dt;w.radius+=1.2*dt;w.amp*=Math.exp(-.9*dt);if(w.age>7.5)waves.splice(i,1);}
      for(let i=wakes.length-1;i>=0;i--){const w=wakes[i];w.age+=dt;w.x+=w.vx*dt;w.z+=w.vz*dt;w.width+=dt*(.046+w.strength*.04);if(w.age>w.life)wakes.splice(i,1);}
      for(let i=drops.length-1;i>=0;i--){const p=drops[i];p.vy-=G*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<0)drops.splice(i,1);}
      for(const f of floats)updateFloat(f,dt);
      if(floats[active].status!=='drift') {const next=floats.find(f=>f.status==='drift');if(next)active=next.id;}
      updateShip(dt);updateGuide();
      mooring.omega+=(-7.4*mooring.angle-1.12*mooring.omega+surface(frame.goal.x,frame.goal.z)*.94)*dt;mooring.angle+=mooring.omega*dt;
      for(const p of dust){p.vx+=(wind*.11-p.vx)*dt*.5;p.vy+=(sample(field.v,p.x,p.z)*.6-.3*p.vy)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.age+=dt;if(p.x>9)p.x-=18;if(p.y<.22)p.y=2.6;}
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      remainder+=dt;while(remainder>=1/60-1e-12){advance(1/60);remainder-=1/60;}
    }
    function resize(aspect){
      const next=layout(aspect);
      const scale=next.scale/frame.scale;
      for(const f of floats){
        const p=next.points[f.id];
        if(f.status==='drift'||f.status==='incoming'){f.x+=p.x-f.homeX;f.z+=p.z-f.homeZ;}
        f.homeX=p.x;f.homeZ=p.z;f.s*=scale;f.h*=scale;f.y*=scale;f.draft*=scale;
        f.mass*=scale**3;f.volume*=scale**3;f.submerged*=scale**3;
      }
      frame=next;if(phase==='collect')resetBoat();
    }
    const live=()=>({frame,field,floats,boat,guide,active,phase,elapsed,cycle,collected,idle,waves,wakes,drops,dust,mooring,wind,tick,lastWave});
    return {step,stroke,surface,resize,candidate,live,drain:()=>events.splice(0),
      getState:()=>JSON.parse(JSON.stringify(live()))};
  }
  return {create,layout,random};
});
