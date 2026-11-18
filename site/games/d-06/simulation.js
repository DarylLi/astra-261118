/* Distances are metres, time is seconds. Rendering only reads this model. */
(function (host) {
  'use strict';
  const STEP = 1 / 120, spacing = 18.6, dock = { x: 4.87, z: -1.60 };
  const sites = [-1.48, 1.47].flatMap(z => [-2.85, 0, 2.85].map(x => ({x, z})));
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const smooth = x => { x=clamp(x,0,1); return x*x*(3-2*x); };
  const levels = [0,.5,1,1.5];
  const pitches = [.62,.87,.53,.76], offsets = [0,-.19,.24,.02];
  const pots = [[.31,.02],[.05,.52],[.44,.27],[.54,.50]];
  const axis = x => ({x,v:0});
  function spring(a,goal,k,d,dt) {
    a.v += ((goal-a.x)*k-a.v*d)*dt;
    a.x += a.v*dt;
  }
  function motor(a,goal,maxSpeed,dt) {
    const acc=clamp((goal-a.x)*15-7.45*a.v,-5.4,5.4);
    a.v=clamp(a.v+acc*dt,-maxSpeed,maxSpeed);a.x+=a.v*dt;
  }
  function randomizer(seed) {
    return () => { seed^=seed<<13; seed^=seed>>>17; seed^=seed<<5; return (seed>>>0)/4294967296; };
  }
  // The track is a capsule. s is continuous across a lap and drives each axle.
  const straight=8.75, radius=3.58, lap=2*straight+2*Math.PI*radius;
  function rail(s) {
    s=((s%lap)+lap)%lap;
    const a=straight/2;
    if(s<straight) return {x:-a+s,z:radius,yaw:0};
    s-=straight;
    if(s<Math.PI*radius) {
      const q=s/radius; return {x:a+Math.sin(q)*radius,z:Math.cos(q)*radius,yaw:q};
    }
    s-=Math.PI*radius;
    if(s<straight) return {x:a-s,z:-radius,yaw:Math.PI};
    const q=(s-straight)/radius; return {x:-a-Math.sin(q)*radius,z:-Math.cos(q)*radius,yaw:Math.PI+q};
  }
  function make(seed=7301) {
    const rand=randomizer(seed);
    const lots=sites.map((p,i)=>({...p,i,status:'empty',variant:0,taps:0,landed:0,
      bed:axis(0),tilt:axis(0),pitch:axis(pitches[0]),ridge:axis(0),pots:pots[0].map(axis),
      charge:.55+rand()*.28, field:rand(),air:0,airGoal:0,windIn:rand(),
      lamp:0,window:0, layers:levels.map((y,j)=>({x:dock.x,z:dock.z,y:y+j*.12-3.3,vy:0,angle:axis(0),contact:false})),
    }));
    const dust=Array.from({length:32},()=>({x:rand()*13-6.5,y:.25+rand()*3,z:rand()*7-3.5,
      vx:(rand()-.5)*.1,vy:0,vz:0,life:rand()*8+1,age:rand()*4,seed:rand()}));
    const water=Array.from({length:63},()=>({h:(rand()-.5)*.004,v:0}));
    const lamps=sites.map((p,i)=>({heat:0,supply:0,delay:0.5+i*.53,tau:.20+rand()*.09}));
    const crane={x:axis(dock.x),trolley:axis(2.90),yaw:axis(-1.08),hatch:axis(0),sling:axis(.07),swing:axis(.007),hook:axis(2.3),
      spool:0,targetX:dock.x,targetZ:dock.z,mastZ:-4.50};
    const cars=Array.from({length:3},(_,i)=>({s:1.22-i*.85,v:0,bounce:axis(0),wheel:0}));
    let incoming=null;
    const s={retire:axis(1),time:0,phase:'build',phaseAge:0,district:0,pan:axis(0),bridge:axis(0),
      idle:0,cue:0,cueDepth:axis(0),cueAge:0,cuePhase:'rest',hint:3, completeDelay:0,
      lots,lamps,crane,cars,dust,water,dropIn:.45,queue:[],job:null,trainStart:1.22,events:[]};
    const event=(name,i=0)=>{s.events.push({name,i,time:s.time}); if(s.events.length>48)s.events.shift();};
    const phase=p=>{s.phase=p;s.phaseAge=0;};
    function tap(i) {
      const p=lots[i]; if(!p || s.phase!=='build') return false;
      s.idle=0;s.cuePhase='rest';s.cueAge=0;
      if(p.status==='done') {
        p.taps++;p.variant=(p.variant+1)%4;p.tilt.v+=.066*(p.variant%2?1:-1);
        p.bed.v-=.035;p.pots[p.variant%2].v+=.16;event('roof',i);return true;
      }
      if(p.status!=='empty') {p.tilt.v+=.015;return false;}
      p.status='queued';p.taps++;s.queue.push(i);p.bed.v=-.05;event('tap',i);return true;
    }
    function begin() {
      if(!s.queue.length)return;
      const i=s.queue.shift();lots[i].status='building';
      s.job={i,stage:'collect',age:0,course:0,release:0,travel:0};
    }
    function jobStep(dt) {
      const j=s.job,c=crane;
      if(!j){if(s.phase==='build')begin();return;}
      const p=lots[j.i];
      j.age+=dt;
      const next=stage=>{j.stage=stage;j.age=0;};
      if(j.stage==='collect') {
        c.targetX=dock.x;c.targetZ=dock.z;
        if(Math.abs(c.yaw.x)<.015 && Math.abs(c.x.x-dock.x)<.04 && Math.abs(c.trolley.x-(dock.z-c.mastZ))<.05)next('lift');
      } else if(j.stage==='lift') {
        j.travel=smooth(j.age/1.80);
        if(j.age>=1.80)next('carry');
      } else if(j.stage==='carry') {
        c.targetX=p.x;c.targetZ=p.z;
        if(Math.abs(c.x.x-p.x)<.012 && Math.abs(c.trolley.x-(p.z-c.mastZ))<.014 && Math.abs(c.x.v)+Math.abs(c.trolley.v)<.085)next('stack');
      } else if(j.stage==='stack'){
        j.release=clamp(j.age/.8,0,1);
      }
      p.layers.forEach((l,n)=>{
        if(l.contact) {
          const target=levels[n]+p.bed.x;
          l.vy+=((target-l.y)*220-l.vy*19)*dt;l.y+=l.vy*dt;
          spring(l.angle,0,66,8,dt);return;
        }
        const prev=l.y;
        const hanging=levels[n]+.73+n*.12;
        const pickup=levels[n]+n*.12-3.3;
        if(j.stage==='collect')return;
        const lowered=j.stage==='stack' && n===j.course?smooth(j.release):0;
        l.x=c.x.x+Math.sin(c.yaw.x)*c.trolley.x;l.z=c.mastZ+Math.cos(c.yaw.x)*c.trolley.x;
        l.y=pickup+(hanging-pickup)*j.travel-(hanging-levels[n]-p.bed.x)*lowered;
        l.vy=(l.y-prev)/dt;
        spring(l.angle,c.swing.x*(1.2-n*.13)*(1-lowered),35+n*2,7,dt);
      });
      if(j.stage==='stack' && j.age>=.8-1e-8) {
        const n=j.course,l=p.layers[n];l.contact=true;l.vy=-.09-.013*n;
        p.landed++;p.bed.v-=.071+n*.008;p.tilt.v+=(n%2?1:-1)*.025;
        event('land',p.i);j.course++;j.age=0;j.release=0;
        if(j.course===4){p.status='done';s.job=null;s.completeDelay=0;event('built',p.i);}
      }
    }
    function localStep(p,dt) {
      // Elastic soil takes each course's static load and landing impulse.
      spring(p.bed,-p.landed*(.012+p.i*.0007),95+p.i*2,11,dt);
      spring(p.tilt,p.air*.007,36+p.i*1.7,5.9,dt);
      p.windIn-=dt;
      if(p.windIn<=0){p.airGoal=(rand()-.5)*1.25;p.windIn=.42+rand()*1.8;}
      p.air+=(p.airGoal-p.air)*dt*1.3;
      // Local oscillators charge the inset guide lamps through a resistance.
      p.field+=(.75+.09*p.i+.18*p.air)*dt;
      const target=p.status==='empty'?.60+.21*Math.sin(p.field)+(p.i===s.hint?.13:0):
        p.status==='queued'?.98:p.status==='building'?.48:.075;
      p.charge+=(target-p.charge)*dt*(2.65+.12*p.i);
      spring(p.pitch,pitches[p.variant],40,8.5,dt);spring(p.ridge,offsets[p.variant],35,7.8,dt);
      p.pots.forEach((a,q)=>spring(a,pots[p.variant][q],22+q*1.5,7.9,dt));
      if(p.status==='done')p.layers.forEach((l,n)=>{
        const y=levels[n]+p.bed.x;l.vy+=((y-l.y)*180-18*l.vy)*dt;l.y+=l.vy*dt;
        spring(l.angle,p.tilt.x*(.4+.09*n),45,7,dt);
      });
    }
    function atmosphere(dt) {
      s.dropIn-=dt;
      if(s.dropIn<=0) {
        const cell=10+Math.floor(rand()*43);water[cell].v-=.15+rand()*.15;
        s.dropIn=.55+rand()*1.65;
      }
      for(let z=0;z<9;z++)for(let x=0;x<7;x++){
        const i=z*7+x,w=water[i],h=w.h;
        const sum=(x?water[i-1].h:0)+(x<6?water[i+1].h:0)+(z?water[i-7].h:0)+(z<8?water[i+7].h:0);
        w.v+=((sum-4*h)*52-w.v*2.45)*dt;
      }
      water.forEach(w=>w.h+=w.v*dt);
      dust.forEach(d=>{
        const i=clamp(Math.floor((d.x+4.2)/2.85),0,2)+(d.z>0?3:0);
        d.vx+=((.10+lots[i].air*.23)-d.vx)*dt*1.6;
        d.vy+=((.018+lots[i].air*.047)-d.vy)*dt;
        d.vz+=((d.seed-.5)*.04-d.vz)*dt;
        d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.age+=dt;
        // Grains settle/fade before re-emission at the windward rim.
        if(d.age>d.life+.18){d.age=-.18;d.life=4+rand()*8;d.x=rand()*12-6;d.y=.2+rand()*2.2;d.z=rand()*7-3.5;}
      });
    }
    function mechanics(dt) {
      const c=crane,old=c.x.v,oldT=c.trolley.v;
      if(!s.job && s.phase!=='expand'){c.targetZ=dock.z;c.targetX=dock.x;}
      motor(c.x,c.targetX,2.65,dt);motor(c.trolley,c.targetZ-c.mastZ,2.25,dt);
      const open=s.job && ['collect','lift'].includes(s.job.stage);
      spring(c.hatch,open?1:0,19,8.5,dt);
      spring(c.yaw,s.phase==='expand'?.34:s.job?0:-1.08,11,6.5,dt);
      const impulse=-(c.x.v-old)*.035-(c.trolley.v-oldT)*.017;
      c.swing.v+=impulse;spring(c.swing,lots[1].air*.016,9,1.4,dt);
      const j=s.job;
      const hookY=s.phase==='expand'&&c.x.x>5.45?.54:j?(j.stage==='collect'?.62: j.stage==='lift'?.62+3*j.travel:3.62-(j.course===3?.75*smooth(j.release):0)):2.30;
      spring(c.hook,hookY,45,11,dt);
      let reach=.07;
      if(j && j.stage!=='collect'){
        const cargo=lots[j.i].layers[j.course];
        reach=clamp(c.hook.x-.16-Math.max(.22,.27+cargo.y+.09),.07,3.25);
      }
      spring(c.sling,reach,96,17,dt);c.spool+=c.trolley.v*dt/.16;
    }
    function reward(dt) {
      if(s.phase==='build' && lots.every(p=>p.status==='done')){
        s.completeDelay+=dt;if(s.completeDelay>1.7){phase('lamps');event('lights');}
      }
      lamps.forEach((l,i)=>{
        if(s.phase==='lamps' && s.phaseAge>=l.delay && !l.supply){l.supply=1;event('lamp',i);}
        l.heat+=(l.supply-l.heat)*dt/l.tau;
        lots[i].window+=(Math.max(0,(l.heat-.22)/.78)-lots[i].window)*dt*(1.7+i*.12);
      });
      if(s.phase==='lamps' && lamps[5].heat>.976){phase('train');event('train');}
      const head=cars[0],remaining=Math.max(0,s.trainStart+lap-head.s);
      if(s.phase==='train'){
        const demand=Math.min(3.0,Math.sqrt(2*1.05*remaining),remaining*2.4);
        head.v+=clamp(demand-head.v,-1.15*dt,.86*dt);
        head.s+=head.v*dt;
        if(remaining<.007 && head.v<.022){head.v=0;phase('station');event('station');}
      }
      cars.forEach((a,i)=>{
        if(i){const lead=cars[i-1];const pull=(lead.s-.85-a.s)*82+(lead.v-a.v)*12;
          a.v+=clamp(pull,-1.22,1.22)*dt;a.s+=a.v*dt;}
        a.wheel+=a.v*dt/.105;
        spring(a.bounce,Math.sin(a.s*24+i)*Math.abs(a.v)*.004,102+i*5,6,dt);
      });
      if(s.phase==='station' && s.phaseAge>1.1){phase('expand');incoming=make(7301+(s.district+1)*23);event('expand');}
      if(s.phase==='expand'){
        crane.targetX=5.75;crane.targetZ=-.16;
        incoming.step(dt);
        const atEnd=crane.x.x>5.66 && crane.hook.x<.59 && Math.abs(crane.yaw.x-.34)<.09;
        spring(s.bridge,atEnd?1:0,8,5.5,dt);
        spring(s.pan,s.bridge.x>.86?spacing:0,1.1,2.06,dt);
        if(s.pan.x>spacing-.009 && s.pan.v<.015){
          const fresh=incoming.getState();incoming=null;
          water.splice(0,water.length,...fresh.water);dust.splice(0,dust.length,...fresh.dust);s.dropIn=fresh.dropIn;s.retire=axis(0);
          lots.splice(0,6,...fresh.lots);lamps.splice(0,6,...fresh.lamps);cars.splice(0,3,...fresh.cars);
          Object.assign(crane,fresh.crane);s.district++;s.pan=axis(0);s.bridge=axis(0);s.idle=0;
          s.cueAge=0;s.cuePhase='rest';s.cueDepth=axis(0);s.cue=0;s.hint=3;phase('build');
        }
      }
    }
    function hint(dt){
      s.idle+=dt;s.cueAge+=dt;
      if(s.phase==='build' && !s.job && !s.queue.length){
        const order=[3,1,5,0,4,2],i=order.find(i=>lots[i].status==='empty');
        if(i!==undefined)s.hint=i;
        if(i!==undefined && s.idle>4 && s.cuePhase==='rest'){s.cuePhase='point';s.cueAge=0;}
      }
      if(s.job || s.phase!=='build')s.cuePhase='rest';
      const pointing=s.cuePhase==='point';
      s.cue+=((pointing?1:0)-s.cue)*dt*6;
      spring(s.cueDepth,pointing && s.cueAge>.65 && s.cueAge<1.45?1:0,31,7.8,dt);
      if(pointing && s.cueAge>2.2){s.cuePhase='rest';s.idle=1.65;s.cueAge=0;}
    }
    let remainder=0;
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)throw Error('Invalid elapsed seconds');
      remainder+=dt;
      while(remainder>=STEP-1e-10){
        remainder-=STEP;s.time+=STEP;s.phaseAge+=STEP;
        spring(s.retire,1,1.45,2.4,STEP);lots.forEach(p=>localStep(p,STEP));jobStep(STEP);mechanics(STEP);atmosphere(STEP);reward(STEP);hint(STEP);
      }
    }
    return {step,tap,preview:()=>incoming && incoming.read(),getState:()=>JSON.parse(JSON.stringify(s)),read:()=>s};
  }
  const api={make,rail,lap,sites,spacing,dock};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  else host.TownModel=api;
})(typeof globalThis==='undefined'?this:globalThis);
