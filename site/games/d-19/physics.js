/* All distances are metres, time is seconds and masses are kilograms.
   Rendering reads this model; it never advances an individual mechanism. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Workshop = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';
  const H = 1 / 180, CAPACITY = 4, G = 9.81;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const length = (x,y,z) => Math.hypot(x,y,z);
  const mix = (a,b,k) => a+(b-a)*k;
  const smooth = u => u*u*(3-2*u);
  function field(distance, strength) {
    return strength * Math.min(1, 0.04 * 0.04 / Math.max(1e-12,distance*distance));
  }
  const layout = [
    [-.164,-.095,'bolt',9],[-.109,-.050,'nut',7],[-.052,-.097,'screw',5],
    [.034,-.094,'washer',4],[.123,-.088,'bolt',10],[.179,-.056,'nut',8],
    [-.192,-.002,'screw',5],[-.129,.033,'washer',4],[-.083,-.002,'bolt',10],
    [-.012,-.022,'nut',7],[.070,-.018,'nail',4],[.142,.008,'screw',6],
    [-.055,.048,'nail',4],[.025,.040,'bolt',12],[.099,.059,'nut',8],
    [.199,.047,'washer',4],[-.201,.059,'nut',8]
  ];
  function create(options={}) {
    let seed = options.seed ?? 53977, debt = 0, events = [];
    const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const initialY = kind => .004+({bolt:.009,screw:.0075,nut:.005,nail:.005,washer:.0027})[kind];
    const state = {
      time:0, cycle:0, phase:'collect', idle:0, strength:options.strength ?? .20,
      magnet:{x:-.043,y:.108,z:-.035,vx:0,vy:0,vz:0,tx:-.043,tz:-.035,angle:-.095,omega:0,drag:false,pending:-1},
      parts:layout.map(([x,z,kind,g],i)=>({id:i,kind,mass:g/1000,x,y:initialY(kind),z,
        homeX:x,homeZ:z,floor:initialY(kind),vx:0,vy:0,vz:0,angle:(random()-.5)*5.6,
        tilt:0,omega:0,mode:'table',bin:-1,pole:i%2?1:-1,slot:0,age:0,force:0})),
      cans:[-.146,0,.146].map((x,i)=>({x,z:.158+(i===1?.012:0),rim:.089,depth:0,v:0,count:0,hits:0,tabAngle:0,tabSpeed:0})),
      air:Array.from({length:5},()=>({v:0,p:(random()-.5)*.6,next:random()*.65})),
      dust:Array.from({length:38},()=>({x:(random()-.5)*.96,y:.028+random()*.51,z:(random()-.55)*.57,
        vx:(random()-.5)*.004,vy:0,vz:0,buoy:(random()-.5)*.005,size:.00025+random()*.00055})),
      leaves:Array.from({length:9},(_,i)=>({a:0,v:0,k:14+i*1.8})),
      water:Array.from({length:15},(_,i)=>({h:.00015*Math.cos(i*1.2),v:0})),
      robot:{x:0,v:0,energy:0,progress:0,bin:-1,foot:0,travel:0,gaze:0,gazeV:0,keyAngle:0,keySpeed:0,
        joints:Array.from({length:5},()=>({a:0,v:0,goal:0}))},
      guide:{visible:0,age:0,leg:0,x:0,y:.15,z:-.035,vx:0,vy:0,vz:0,bin:0,part:0}
    };
    function holding(){return state.parts.filter(p=>p.mode==='held');}
    function point(x,z) {
      if (!state.magnet.drag) return;
      state.magnet.tx=clamp(x,-.225,.225);state.magnet.tz=clamp(z,-.14,.21);
    }
    function grab() {
      if(state.phase!=='collect'||state.magnet.pending>=0) return false;
      state.magnet.drag=true;state.idle=0;return true;
    }
    function overCan(x,z,r=.053) {
      return state.cans.findIndex(c=>Math.hypot(x-c.x,z-c.z)<r);
    }
    function release(cancel=false) {
      const m=state.magnet;
      if(!m.drag) return;
      m.drag=false;state.idle=0;
      const i=overCan(m.tx,m.tz,.062);
      if(!cancel && i>=0 && (holding().length || state.parts.some(p=>p.mode==='flying'))) {
        m.pending=i;m.tx=state.cans[i].x;m.tz=state.cans[i].z;
      }
    }
    function updateAir(dt) {
      state.air.forEach((a,i)=>{
        a.next-=dt;
        if(a.next<=0){a.p=(random()-.47)*1.6;a.next=.45+random()*1.8;}
        a.v+=(a.p-a.v)*(1+i*.16)*dt;
      });
      state.dust.forEach((p,i)=>{
        const a=state.air[i%5].v,b=state.air[(i+2)%5].v;
        p.vx+=(a*.009-p.x*.012-p.vx*.86)*dt;
        p.vy+=(b*.003+p.buoy+(.25-p.y)*.019-p.vy)*dt;
        p.vz+=(b*.005-p.z*.016-p.vz)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      });
      state.leaves.forEach((l,i)=>{
        l.v+=(state.air[i%5].v*(1.4+i*.11)-l.k*l.a-2.4*l.v)*dt;l.a+=l.v*dt;
      });
      const w=state.water;
      w.forEach((p,i)=>{
        const lap=w[(i+14)%15].h+w[(i+1)%15].h-2*p.h;
        p.v+=(44*lap-26*p.h-2.8*p.v+state.air[i%5].v*.003)*dt;
      });
      w.forEach(p=>p.h+=p.v*dt);
    }
    function updateMagnet(dt) {
      const m=state.magnet;
      const near=Math.min(...state.cans.map(c=>Math.hypot(m.x-c.x,m.z-c.z)));
      const clearance=smooth(clamp((.125-near)/.072,0,1));
      const working=m.drag||m.pending>=0;
      const goalY=mix(working?.037:.108,.131,clearance);
      const a=state.air[1].v;
      for(const [coord,goal] of [['x',m.tx+(working?0:a*.0022)],['y',goalY],['z',m.tz]]) {
        const v='v'+coord; const acc=(goal-m[coord])*136-22*m[v];
        m[v]+=clamp(acc,-5,5)*dt;
      }
      const ratio=Math.min(1,.58/Math.max(.00001,length(m.vx,m.vy,m.vz)));
      for(const coord of ['x','y','z']){const v='v'+coord;m[v]*=ratio;m[coord]+=m[v]*dt;}
      m.omega+=((-0.095-m.angle)*32-4.7*m.omega+m.vx*4.1+a*.10)*dt;
      m.angle+=m.omega*dt;
    }
    function tip(p,side,slot=0) {
      const m=state.magnet,d=side*.045;
      return {x:m.x+d*Math.cos(m.angle)+Math.sin(slot*2.36)*.012,
        y:m.y+d*Math.sin(m.angle)-.004-Math.floor(slot/3)*.008,
        z:m.z+Math.sin(slot*1.6)*.010};
    }
    function springTo(p,g,dt,k,d,speedLimit=Infinity) {
      for(const c of ['x','y','z']){const v='v'+c;p[v]+=((g[c]-p[c])*k-p[v]*d)*dt;}
      const speed=length(p.vx,p.vy,p.vz);
      const ratio=speed>speedLimit?speedLimit/speed:1;
      for(const c of ['x','y','z']){const v='v'+c;p[v]*=ratio;p[c]+=p[v]*dt;}
    }
    function updatePart(p,dt) {
      p.age+=dt;p.force=0;
      const m=state.magnet,r=state.robot;
      if(p.mode==='return' || p.mode==='deliver') {
        // A spring-driven pickup reels parts to the chest and pays them out again.
        // The can lip and shelf edge are detents. Crossing each releases the next
        // length of wire. Mass determines the acceleration and settling time.
        const delivery=p.mode==='deliver',c=state.cans[p.bin];
        let g;
        if(delivery){
          if(!p.stage && p.y>=c.rim+.043)p.stage=1;
          g=p.stage?state.receiver:{x:p.sx,y:c.rim+.063,z:p.sz};
        } else {
          if(!p.stage && (p.z>state.receiver.z+.066 || p.sy<.14))p.stage=1;
          g={x:p.homeX,y:p.stage?p.floor:p.sy+.035,z:p.homeZ};
        }
        const k=.50/p.mass;
        springTo(p,g,dt,k,1.79*Math.sqrt(k),.48);
        p.omega+=((delivery?.36:0)-p.tilt)*k*.48*dt-p.omega*8*dt;p.tilt+=p.omega*dt;
        const gap=length(g.x-p.x,g.y-p.y,g.z-p.z);
        if(p.stage && gap<.00065 && length(p.vx,p.vy,p.vz)<.012){
          p.x=g.x;p.y=g.y;p.z=g.z;p.vx=p.vy=p.vz=0;
          if(delivery){p.mode='received';r.energy+=1;events.push({type:'receive'});}
          else{p.mode='table';p.omega*=.42;}
        }
        return;
      }
      if(p.mode==='received'||p.mode==='inside')return;
      if(p.mode==='drop') {
        const c=state.cans[p.bin],floor=.014+Math.min(4,c.count)*.009+p.floor;
        p.vx+=((c.x+p.landing-p.x)*90-p.vx*10)*dt;p.vz+=((c.z-p.z)*90-p.vz*10)*dt;
        p.vy-=G*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.angle+=p.omega*dt;
        if(p.y<=floor-c.depth){p.y=floor-c.depth;p.vy=p.vx=p.vz=0;p.mode='inside';p.omega=0;
          c.count++;c.hits++;c.v+=.046+p.mass*3;state.water[p.id%15].v+=p.mass*.23;
          events.push({type:'clank',bin:p.bin,mass:p.mass});}
        return;
      }
      if(p.mode==='held') {
        const g=tip(p,p.pole,p.slot);
        springTo(p,g,dt,630,42);
        p.omega+=((-.72*p.pole-p.tilt)*87-6.7*p.omega-m.vx*5)*dt;p.tilt+=p.omega*dt;
        return;
      }
      const side=p.mode==='flying'?p.pole:(p.x<m.x?-1:1),g=tip(p,side);
      const dx=g.x-p.x,dy=g.y-p.y,dz=g.z-p.z,dist=Math.max(.001,length(dx,dy,dz));
      // The two independent pole shoes each have one exposed contact face.
      const occupied=state.parts.some(q=>q!==p&&q.pole===side&&(q.mode==='held'||q.mode==='flying'));
      const active=state.phase==='collect' && !occupied && (m.drag||p.mode==='flying') && m.pending<0;
      const force=active?field(dist,state.strength):0;
      p.force=force;
      if(p.mode==='table') {
        const vibration=state.air[p.id%5].v*.018+state.cans[p.id%3].v*2;
        p.omega+=(vibration/(p.mass*40)-29*p.tilt-5*p.omega)*dt;p.tilt+=p.omega*dt;
        if(force*dy/dist>p.mass*G*1.015){p.mode='flying';p.pole=side;p.age=0;events.push({type:'lift',id:p.id});}
        else {
          const horizontal=Math.hypot(dx,dz);
          const friction=.38*Math.max(0,p.mass*G-force*dy/dist);
          const lateral=Math.max(0,force*horizontal/dist-friction);
          const denom=Math.max(.0001,horizontal)*p.mass;
          p.vx+=(lateral*dx/denom-18*p.vx)*dt;p.vz+=(lateral*dz/denom-18*p.vz)*dt;
          p.x+=p.vx*dt;p.z+=p.vz*dt;return;
        }
      }
      const accel=force/p.mass;
      p.vx+=(accel*dx/dist-7*p.vx)*dt;p.vz+=(accel*dz/dist-7*p.vz)*dt;
      // Contact passes the piece to the pole; attraction supports its weight there.
      p.vy+=(accel*dy/dist-G-5*p.vy)*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      p.omega+=(-p.pole*accel*.19-p.omega*7)*dt;p.tilt+=p.omega*dt;
      if(length(g.x-p.x,g.y-p.y,g.z-p.z)<.014 && active){
        p.mode='held';p.slot=holding().filter(q=>q!==p&&q.pole===side).length;p.age=0;
        events.push({type:'attach',id:p.id,mass:p.mass});
      } else if(p.y<=p.floor && p.vy<0){p.y=p.floor;p.vy=0;p.mode='table';}
    }
    function startTransfer(p,mode) {
      p.sx=p.x;p.sy=p.y;p.sz=p.z;p.age=0;p.stage=0;p.mode=mode;p.vx=p.vy=p.vz=0;
    }
    function updateMechanisms(dt) {
      const m=state.magnet,r=state.robot;
      state.cans.forEach(c=>{
        // A light steel telltale is pulled upright by an approaching loaded magnet.
        const gap=Math.hypot(c.x-m.x,c.z-m.z,m.y-c.rim);
        const pull=holding().length?field(gap,state.strength)*4.5:0;
        c.tabSpeed+=((Math.min(.76,pull)-c.tabAngle)*64-8*c.tabSpeed)*dt;
        c.tabAngle+=c.tabSpeed*dt;
        c.v+=((c.count*.00072-c.depth)*235-10*c.v)*dt;c.depth+=c.v*dt;
      });
      if(m.pending>=0) {
        const c=state.cans[m.pending];
        if(Math.hypot(m.x-c.x,m.z-c.z)<.009 && m.y>.114) {
          for(const p of holding()) {p.bin=m.pending;p.mode='drop';p.omega=p.pole*(2+p.slot*.4);
            p.landing=clamp((p.x-m.x)*.48,-.025,.025);p.vx=(c.x-p.x)*2;}
          m.pending=-1;
        }
      }
      if(state.phase==='collect'){
        const full=state.cans.findIndex(c=>c.count>=CAPACITY);
        if(full>=0&&!state.parts.some(p=>p.mode==='drop')){
          state.phase='receive';r.bin=full;r.progress=0;m.drag=false;
          state.parts.filter(p=>p.mode==='held'||p.mode==='flying').forEach(p=>startTransfer(p,'return'));
        }
      } else {
        r.progress+=dt;
        if(state.phase==='receive'){
          const all=state.parts.filter(p=>p.mode==='inside');
          if(all.length && r.progress>.48){const p=all[0];startTransfer(p,'deliver');state.cans[p.bin].count--;r.progress=.35;}
          if(!all.length&&!state.parts.some(p=>p.mode==='deliver')){state.phase='walk';r.progress=0;r.travel=0;r.foot=0;events.push({type:'wind'});}
        } else if(state.phase==='walk'){
          const speed=(r.progress<1.65?1:-1)*.045*clamp(r.energy,.55,1.1);
          r.v+=(speed-r.v)*dt*6;r.x+=r.v*dt;r.travel+=Math.abs(r.v)*dt;r.energy*=Math.exp(-.27*dt);
          if(r.travel>.021){r.travel-=.021;r.foot=1-r.foot;events.push({type:'step',foot:r.foot});}
          if(r.progress>3.45){state.phase='reset';r.progress=0;}
        } else if(state.phase==='reset'){
          r.v+=(-28*r.x-9*r.v)*dt;r.x+=r.v*dt;
          if(r.progress>.2){const next=state.parts.find(p=>p.mode==='received'||p.mode==='inside');
            if(next){startTransfer(next,'return');r.progress=.1;}
            else if(!state.parts.some(p=>p.mode==='return')){
              state.phase='collect';state.cycle++;state.idle=0;r.energy=0;r.bin=-1;
            }}
          m.tx=-.043;m.tz=-.035;
        }
      }
      const walk=state.phase==='walk',sign=r.foot?1:-1,load=walk?clamp(r.energy,.55,1):0;
      const goals=[sign*.49,-sign*.49,-sign*.56,sign*.64,sign*.055];
      r.joints.forEach((j,i)=>{j.goal=goals[i]*load+(i===3&&state.phase==='receive'?.7:0);
        j.v+=((j.goal-j.a)*(58+i*6)-(8+i*.5)*j.v)*dt;j.a+=j.v*dt;});
      const drive=state.phase==='receive'?2.9:state.phase==='walk'?-3.6*load:0;
      r.keySpeed+=(drive-r.keySpeed)*4*dt;r.keyAngle+=r.keySpeed*dt;
      const looking=state.phase==='receive'?r.bin===0?-.32:.18:clamp((m.x-state.receiver.x)*1.65,-.34,.34);
      r.gazeV+=((looking-r.gaze)*18-6*r.gazeV)*dt;r.gaze+=r.gazeV*dt;
    }
    function updateGuide(dt) {
      const g=state.guide,m=state.magnet;
      state.idle=m.drag||state.phase!=='collect'?0:state.idle+dt;
      const show=state.idle>=4&&m.pending<0;
      g.visible=clamp(g.visible+(show?2:-6)*dt,0,1);
      if(!show){g.age=0;g.leg=0;
        if(g.visible===0)springTo(g,{x:m.x+.02,y:m.y+.06,z:m.z+.028},dt,34,10);
        return;
      }
      g.age+=dt;
      if(g.leg===0){
        const ranked=state.parts.filter(p=>p.mode==='table').sort((a,b)=>Math.hypot(a.x-m.x,a.z-m.z)-Math.hypot(b.x-m.x,b.z-m.z));
        if(ranked.length)g.part=ranked[0].id;
        const p=state.parts[g.part];g.bin=state.cans.reduce((best,c,i)=>c.count>state.cans[best].count||
          (c.count===state.cans[best].count&&Math.abs(c.x-p.x)<Math.abs(state.cans[best].x-p.x))?i:best,0);
        g.leg=1;
      }
      const p=state.parts[g.part],c=state.cans[g.bin];
      const goal= g.age<.88?{x:m.x+.02,y:m.y+.065,z:m.z+.025}:
        g.age<2&&!holding().length?{x:p.x,y:.027,z:p.z}:{x:c.x,y:c.rim+.034,z:c.z};
      springTo(g,goal,dt,34,10);
      if(g.age>3.7){state.idle=1.8;g.age=0;g.leg=0;}
    }
    state.receiver={x:.176,y:.20,z:-.26};
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      debt+=dt;
      while(debt>=H-1e-12){
        debt-=H;state.time+=H;updateAir(H);updateMagnet(H);
        state.parts.forEach(p=>updatePart(p,H));updateMechanisms(H);updateGuide(H);
      }
    }
    return {state,step,getState:()=>JSON.parse(JSON.stringify(state)),grab,point,release,overCan,
      drainEvents:()=>{const batch=events;events=[];return batch;}};
  }
  return {create,field,CAPACITY};
});
