/* All bath coordinates and velocities use metres and seconds. Liquid is stored in litres. */
(function (root) {
  'use strict';
  const H = .106, NX = 15, NZ = 9, FIXED = 1 / 120;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const area = 3.65232684942716; // 4 Γ(1 + 1/3.6)² / Γ(1 + 2/3.6)
  function capacity(h) {
    const a = .243, b = .122, da = .044 / H, db = .026 / H;
    const q = clamp(h, 0, H);
    return 1000 * area * (a*b*q + (a*db+b*da)*q*q/2 + da*db*q*q*q/3
      + Math.max(0,h-H)*.287*.148);
  }
  function random(seed) {
    return () => {seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296;};
  }
  function createGame(options = {}) {
    const rand = random(options.seed ?? 804), flow = options.flow ?? .8;
    const make = (n, fn) => Array.from({length:n},(_,i)=>fn(i));
    const bodies = [
      {name:'boat', x:-.113,z:-.025,mass:.073,height:.034,area:.0083},
      {name:'ball', x:.003,z:.059,mass:.018,height:.065,area:0},
      {name:'bucket', x:.139,z:-.014,mass:.085,height:.079,area:Math.PI*(.397/7.4)**2}
    ].map(b=>({...b,homeX:b.x,homeZ:b.z,y:0,vy:0,vx:0,vz:0,roll:0,spin:0,volume:0,buoyancy:0}));
    const surface = make(NX*NZ,()=>({h:0,v:0}));
    const jet = make(12,()=>0);
    const rim = make(7,i=>({crest:0,q:0,film:0,slices:Array(7).fill(0),offset:.00015*Math.abs(i-3)}));
    const floor = make(20,()=>({litres:0,wet:0,out:0}));
    const air = make(9,()=>({v:(rand()-.5)*.02,target:0,life:rand()}));
    const motes = make(39,i=>({x:rand(),y:rand(),z:rand(),vx:0,vy:0,heat:.25+rand()*.7,steam:i<14,fade:0,birth:0}));
    motes.forEach(m=>m.fade=clamp(Math.min(m.y,1-m.y,m.x,1-m.x)*7,0,1));
    const s = {time:0,stage:'fill',next:'tap',cycle:0,big:false,bucketBonus:false,litres:0,level:0,
      valve:0,valveV:0,discharge:0,delivered:0,overflow:0,waste:0,floorWaste:0,
      jet, rim, floor, surface, bodies, air, motes, vortex:0,vortexAngle:0,drainFlow:0,
      outlet:0,outletV:0,tension:true,rewardTime:0,idle:0,press:null,depthDemand:0,
      hinge:.23,hingeV:0,guide:0,guideV:0,guideOpacity:0,guidePhase:'approach',
      exchange:0,exchangeV:0,exchangePart:'rest',light:1,lightV:0,
      drops:make(66,()=>({active:false,birth:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,r:0})), splashBudget:0,beadSway:0,beadV:0,beadStretch:0,beadStretchV:0,
      sourceFlow:flow, rimHeight:H};
    let rest = 0;
    function immersed(b,h) {
      const d=clamp(h-b.y,0,b.height);
      if(b.name==='ball') return Math.PI*d*d*(b.height/2-d/3);
      if(b.name==='boat')return b.area*d*(.38+.58*d/b.height);
      // Integral of the tapered pail's circular cross-section, measured to the outside of the lip.
      const taper=.184*d/b.height;
      return b.area*d*(.816**2+.816*taper+taper*taper/3);
    }
    function waterline() {
      if(s.litres<1e-9) return 0;
      let lo=0, hi=H+.08;
      for(let i=0;i<23;i++) {
        const h=(lo+hi)/2;
        if(capacity(h)-1000*bodies.reduce((sum,b)=>sum+immersed(b,h),0)>s.litres) hi=h; else lo=h;
      }
      return (lo+hi)/2;
    }
    function aim() {
      if(s.stage==='drain'||s.stage==='exchange') return null;
      if(s.stage==='reward'){
        if(s.rewardTime<=2.4 || s.floorWaste<=.0001)return null;
        return s.big && !s.bucketBonus?'bucket':'plug';
      }
      if(s.level>=.1054) return 'bucket';
      return 'tap';
    }
    function touch(target) {
      s.idle=0;
      const valid=target===aim()|| (target==='tap' && s.stage==='fill');
      if(valid && target) {
        s.press=target;
        if(target==='plug'){ s.stage='drain'; s.press=null; }
        return true;
      }
      const b=bodies.find(o=>o.name===target);
      if(b) b.spin+=.12;
      return false;
    }
    function release() {s.press=null; s.idle=0;}
    function moveAir(dt) {
      air.forEach(p=>{
        p.life-=dt;
        if(p.life<=0){p.target=(rand()-.5)*.10; p.life=.4+rand()*1.9;}
        p.v+=(p.target-p.v)*dt*1.6;
      });
      motes.forEach(m=>{
        const w=air[Math.min(8,Math.floor(m.x*3)+3*Math.floor(m.z*3))].v;
        m.vx+=(w-m.vx)*dt*(m.steam?.9:.5);
        m.vy+=((m.steam?.12*m.heat+.045:.014)+w*.2-m.vy)*dt;
        m.x+=m.vx*dt; m.y+=m.vy*dt; m.heat-=dt*.018;
        if(m.y>1 || m.x<0 || m.x>=1) {m.birth++;m.y=0; m.x=.13+rand()*.74;m.z=rand();m.heat=.55+rand()*.45;}
        m.fade=clamp(Math.min(m.y,1-m.y,m.x,1-m.x)*7,0,1);
      });
      s.lightV+=(air[5].v*.52+(1-s.light)*1.8-s.lightV*2.2)*dt;
      s.light+=s.lightV*dt;
    }
    function feed(dt) {
      s.valveV+=((Number(s.press==='tap')-s.valve)*43-s.valveV*10)*dt;
      s.valve=clamp(s.valve+s.valveV*dt,0,1);
      if(s.valve<.0001 && s.press!=='tap') {s.valve=0;s.valveV=0;}
      s.discharge=flow*s.valve; s.delivered+=s.discharge*dt;
      s.beadV+=(air[1].v*.26-s.beadSway*38-s.beadV*2.8)*dt;
      s.beadSway+=s.beadV*dt;
      s.beadStretchV+=(s.beadV*.05+s.discharge*.075-s.beadStretch*31-s.beadStretchV*3.1)*dt;
      s.beadStretch+=s.beadStretchV*dt;
      // Each falling slice transfers its contents only to the slice below it.
      let incoming=s.discharge;
      for(let i=0;i<jet.length;i++){
        const out=jet[i]*(31+i*2.5);
        jet[i]+=(incoming-out)*dt; incoming=out;
      }
      s.litres+=incoming*dt;
      return incoming;
    }
    function waves(dt,incoming) {
      const wet=clamp(s.level/.008,0,1);
      for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
        const n=j*NX+i,c=surface[n];
        const lap=surface[j*NX+Math.max(i-1,0)].h+surface[j*NX+Math.min(i+1,NX-1)].h
          +surface[Math.max(j-1,0)*NX+i].h+surface[Math.min(j+1,NZ-1)*NX+i].h-4*c.h;
        const impact=(i===3 && j===6)?-incoming*.095:0;
        const shove=(i===11 && j===4)?-bodies[2].vy*.24:0;
        const kick=(j===NZ-1 && i>=7)?-rim[Math.min(6,i-7)].q*.042:0;
        c.v+=(lap*85 -(2.8+(1-wet)*8)*c.v-2.2*c.h +wet*(impact+shove+kick+air[(i+j)%9].v*.009))*dt;
      }
      surface.forEach(c=>c.h+=c.v*dt);
    }
    function floatBodies(dt){
      s.depthDemand+=((s.press==='bucket'?1:0)-s.depthDemand)*dt*6;
      bodies.forEach((b,i)=>{
        const col=clamp(Math.round((b.x/.28+1)*(NX-1)/2),1,NX-2);
        const row=clamp(Math.round((b.z/.145+1)*(NZ-1)/2),1,NZ-2), n=row*NX+col;
        const local=s.level+surface[n].h;
        b.volume=immersed(b,local);
        b.buoyancy=b.volume*1000*9.81;
        const push=i===2 ? s.depthDemand*(s.big?9.0:4.5):0;
        const drag=b.mass*(b.volume>0 ? (i===2?48:19) : 2);
        b.vy+=((b.buoyancy-push)/b.mass-9.81-b.vy*drag/b.mass)*dt;
        b.y+=b.vy*dt;
        if(b.y<=0){b.y=0;b.vy=0;}
        const slope=(surface[n+1].h-surface[n-1].h)/.075;
        const mobile=clamp(b.y/.006,0,1);
        b.vx+=(-(b.x-b.homeX)*2.4-b.vx*2.2-mobile*slope*.8)*dt;
        b.vz+=(-(b.z-b.homeZ)*2.8-b.vz*2-mobile*(surface[n+NX].h-surface[n-NX].h)*8)*dt;
        b.x+=b.vx*dt;b.z+=b.vz*dt;
        b.spin+=(-b.roll*8-b.spin*2.1+mobile*(slope*12+air[i].v*.8))*dt;
        b.roll+=b.spin*dt;
      });
      if(s.big && !s.bucketBonus && s.depthDemand>.1 && bodies[2].volume*1000-bodies[2].mass>.35){
        s.bucketBonus=true;
        if(s.stage==='reward')s.rewardTime=0;
      }
      s.hingeV+=(-10*(s.hinge-.23)-1.9*s.hingeV+bodies[2].vy*9+air[2].v*.15)*dt;
      s.hinge+=s.hingeV*dt;
    }
    function spill(dt){
      const excess=s.level-H;
      if(s.tension && excess>.0021 && rim[3].crest>.00175){
        s.tension=false;
        if(s.stage==='fill'){s.stage='reward';s.rewardTime=0;if(s.press==='bucket')s.idle=0;}
      }
      rim.forEach((r,i)=>{
        const head=Math.max(0,excess-r.offset+surface[(NZ-1)*NX+7+i].h*.1);
        r.crest+=(Math.min(.0028,head)*(s.tension?1:.19)-r.crest)*dt*(s.tension?7:16);
        const target=s.tension?0:900*(head**1.5);
        r.q+=(target-r.q)*dt*8;
        const q=Math.min(r.q,s.litres/dt);s.litres-=q*dt; s.overflow+=q*dt;
        let falling=q;
        r.film=0;
        for(let j=0;j<r.slices.length;j++){
          const out=r.slices[j]*(25+6*j);
          r.slices[j]+=(falling-out)*dt;r.film+=r.slices[j];falling=out;
        }
        floor[Math.floor(Math.abs(i-3)*.68)].litres+=falling*dt;
      });
      // Conservative downhill transport; absorbed films evaporate only after the front passes.
      let arriving=0;
      floor.forEach((c,i)=>{
        c.litres+=arriving*dt;
        c.out=Math.min(c.litres/dt,c.litres*(5.8+.21*i));
        c.litres-=c.out*dt;arriving=c.out;
        c.wet+=((1-c.wet)*Math.min(9,c.litres*35)-c.wet*.07)*dt;
      });
      s.floorWaste+=arriving*dt;
      s.vortex+=(arriving*24-s.vortex*2.3)*dt;
      s.vortexAngle+=s.vortex*dt;
    }
    function droplets(dt,q) {
      s.splashBudget+=dt*(q*38+rim.reduce((a,r)=>a+r.q,0)*26);
      s.drops.forEach(d=>{
        if(!d.active && s.splashBudget>=1){
          s.splashBudget--;d.active=true;d.birth++;
          const spill=rim[3].q>.012 && rand()<.6;
          d.floor=spill;d.x=spill?.036+rand()*.14:-1.30/7.4;d.z=spill?.18:.53/7.4;
          d.y=spill?-.057:s.level+.0006;
          d.vx=(rand()-.5)*.20;d.vz=(rand()-.42)*.22;d.vy=.12+rand()*.37;d.r=.0009+rand()*.0015;
        }
        if(d.active){
          d.vy-=9.81*dt;d.y+=d.vy*dt;d.x+=d.vx*dt;d.z+=d.vz*dt;
          const boundary=d.floor?-.062:s.level;
          if(d.vy<0 && d.y<=boundary){
            d.active=false;
            if(!d.floor){
              const i=clamp(Math.round((d.x/.287+1)*(NX-1)/2),0,NX-1),j=clamp(Math.round((d.z/.148+1)*(NZ-1)/2),0,NZ-1);
              surface[j*NX+i].v+=d.vy*d.r*.9;
            }
          }
        }
      });
    }
    function empty(dt) {
      s.outletV+=((Number(s.stage==='drain')-s.outlet)*32-9*s.outletV)*dt;
      s.outlet=clamp(s.outlet+s.outletV*dt,0,1);
      s.drainFlow=Math.min(s.litres/dt,s.outlet*6.4*Math.sqrt(Math.max(0,s.level)));
      s.litres-=s.drainFlow*dt;s.waste+=s.drainFlow*dt;
      if(s.stage==='drain' && s.litres<1e-6 && bodies.every(b=>b.y<.0001)){
        s.stage='exchange';s.press=null;s.exchangePart='lift';s.exchange=0;
      }
      if(s.stage==='exchange'){
        // A taut handle lifts the old pail behind the back lip. The replacement settles under gravity.
        const dest=s.exchangePart==='lift'?1:0;
        s.exchangeV+=((dest-s.exchange)*14-6*s.exchangeV)*dt;s.exchange+=s.exchangeV*dt;
        if(s.exchangePart==='lift' && s.exchange>.993){
          s.big=!s.big;s.bucketBonus=false;s.cycle++;const b=bodies[2];
          b.height=s.big?.098:.079;b.area=Math.PI*((s.big?.50:.397)/7.4)**2;b.mass=s.big?.128:.085;
          s.exchangePart='lower';
        }
        if(s.exchangePart==='lower' && s.exchange<.00008){
          s.exchange=0;s.exchangeV=0;s.stage='fill';s.exchangePart='rest';s.tension=true;s.idle=0;s.rewardTime=0;
        }
      }
    }
    function guide(dt){
      s.next=aim();
      if(s.press) s.idle=0;else s.idle+=dt;
      const show=s.idle>4 && s.next;
      s.guideOpacity+=(Number(!!show)-s.guideOpacity)*dt*5;
      if(!show){s.guidePhase='approach';}
      const target=show && s.guidePhase==='approach'?1:0;
      s.guideV+=((target-s.guide)*10-5*s.guideV)*dt;s.guide+=s.guideV*dt;
      if(show && s.guide>.985)s.guidePhase='retreat';
      if(show && s.guide<.025)s.guidePhase='approach';
    }
    function step(seconds){
      if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid time step');
      rest+=seconds;
      while(rest>=FIXED-1e-12){
        rest-=FIXED; s.time+=FIXED;
        moveAir(FIXED);const q=feed(FIXED);
        floatBodies(FIXED);s.level=waterline();
        waves(FIXED,q);spill(FIXED);droplets(FIXED,q);empty(FIXED);s.level=waterline();
        if(s.stage==='reward')s.rewardTime+=FIXED;
        guide(FIXED);
      }
    }
    return {step,touch,release,state:s,getState:()=>JSON.parse(JSON.stringify(s))};
  }
  const api={createGame,H,NX,NZ,capacity};
  if(typeof module!=='undefined' && module.exports) module.exports=api;else root.BathPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
