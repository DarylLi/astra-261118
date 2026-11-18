/* Distances in metres, time in seconds, earth and water in cubic metres. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const NX = 31, NZ = 23, cx = .60, cz = 1.26, rx = 2.02, rz = 1.35;
  const dx = 2 * rx / (NX - 1), dz = 2 * rz / (NZ - 1), area = dx * dz;
  const home = {x: .45, y: .88, z: 1.36};
  const bed = {x: 2.55, y: 2.18, z: -1.72};
  const binX=9,binZ=5,binW=.28,binD=.30,bedFloor=1.61;
  const binAt=(x,z)=>clamp(Math.floor((z-bed.z)/binD+binZ/2),0,binZ-1)*binX+
    clamp(Math.floor((x-bed.x)/binW+binX/2),0,binX-1);
  function create(options = {}) {
    let seed = options.seed ?? 42817;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    const spring = (p, key, vel, target, k, drag, dt, limit = Infinity) => {
      p[vel] = clamp((p[vel] + (target - p[key]) * k * dt) / (1 + drag * dt), -limit, limit);
      p[key] += p[vel] * dt;
    };
    const cells = [];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = cx - rx + i * dx, z = cz - rz + j * dz;
      const r = ((x-cx)/rx)**2 + ((z-cz)/rz)**2;
      const bank = Math.max(0, 1-r);
      const grain = random();
      cells.push({x,z, rest: -.018 + bank * (.32 + .10*Math.sin(x*4+z*2) + .053*grain),
        hardness: options.hardness ?? (.66 + .54 * (.5+.5*Math.sin(2*x-z*1.8)) + .12*grain),
        depth:0, settleV:0, water:0, flux:0, moisture:.16+.22*grain, bank, grain});
    }
    const winds = Array.from({length:16}, (_,i) => ({bend:random()*.04, v:0,
      air:random()*.18, impulse:random()*.4, next:.2+random()*1.4, stiffness:3+i%5}));
    const motes = Array.from({length:43}, () => ({x:random()*21-10, y:.28+random()*5.1,
      z:random()*12-5, vx:random()*.07, vy:0, lift:random()*.08, life:.1+random()*7}));
    const s = {phase:'soil', action:'rest', time:0, phaseAge:0, actionAge:0, idle:0, cycle:0,
      cells, winds, motes, grains:[], serial:0, tip:{...home,vx:0,vy:0,vz:0,curl:.08,vc:0},
      aim:{x:home.x,z:home.z}, held:false, pending:false, contacted:false, cutAge:0,
      scoop:0, capacity:1.02, bucketCapacity:.34, activeMass:0,
      truck:{load:0,x:0,v:0,wheel:0,front:0,rear:0,vf:0,vr:0,frontMass:0,bins:Array(binX*binZ).fill(0)},
      hint:{x:home.x,z:home.z,pressure:0,v:0,mode:'sleep',age:0},
      clouds:Array.from({length:3},()=>({cover:.43+random()*.22,v:0,target:.35+random()*.45,next:1+random()*2})),
      puddles:Array.from({length:2},()=>({h:Array(18).fill(0),v:Array(18).fill(0),next:.3+random()})),
      source:0, chest:{x:cx,z:cz,y:-1.2,vy:0,exposed:0,lid:0,vl:0,pull:false,effort:0},
      horn:{height:0,vh:0,ring:0,vr:0,energy:0,plays:0,quiet:0},
      focus:{amount:0,v:0,x:cx,vx:0,y:.42,vy:0,z:cz,vz:0},
      engine:{p:0,v:0,pulse:.07}, wobble:0,wobbleV:0, waterIn:0,gas:0,gasLimit:.0018,ripples:[]};
    const near = (x,z) => clamp(Math.round((z-cz+rz)/dz),0,NZ-1)*NX+
      clamp(Math.round((x-cx+rx)/dx),0,NX-1);
    const ground = (x,z) => {const c=cells[near(x,z)];return c.rest-c.depth;};
    const setAction = a => {s.action=a;s.actionAge=0;};
    const setPhase = p => {s.phase=p;s.phaseAge=0;s.idle=0;s.hint.mode='sleep';};
    function down(x,z,thing='soil') {
      s.idle=0; s.hint.mode='sleep';
      if (s.phase==='horn' && thing==='horn') {
        s.horn.vr+=1.2; s.horn.energy=1; s.horn.plays++; s.horn.quiet=0; return true;
      }
      if (s.phase==='chest' && (thing==='chest'||thing==='soil') &&
          Math.hypot(x-s.chest.x,z-s.chest.z)<1.18) {
        s.chest.pull=true; s.chest.effort=.36; s.held=true; return true;
      }
      if (thing==='soil' && s.phase==='soil' && s.action==='rest' &&
          ((x-cx)/rx)**2+((z-cz)/rz)**2<=1.04) {
        s.aim={x,z}; s.held=true; s.pending=false; s.contacted=false; s.cutAge=0; setAction('cut');return true;
      }
      s.wobbleV+=.045;return false;
    }
    function move(x,z) {
      if(s.held && s.action==='cut' && ((x-cx)/rx)**2+((z-cz)/rz)**2<1.04) s.aim={x,z};
    }
    function up() {if(s.held && s.action==='cut')s.pending=true; s.held=false;}
    function grain(x,y,z,vx,vy,vz,m,kind) {
      s.grains.push({id:++s.serial,x,y,z,vx,vy,vz,m,kind,age:0,r:.025+random()*.050,spin:random()*6, landed:false});
    }
    // The cutting lip contacts a local footprint. Denser soil resists penetration.
    function cut(dt) {
      const t=s.tip;
      if(Math.hypot(t.x-s.aim.x,t.z-s.aim.z)>.45 || t.y>ground(t.x,t.z)+.22)return;
      s.contacted=true;s.cutAge+=dt;
      const radius=.68+Math.min(.68,s.cutAge*.12);
      let total=0;
      const removed=[];
      for (const c of cells) {
        const r2=((c.x-t.x)**2+(c.z-t.z)**2)/radius**2;
        if(r2>=1 || !c.bank)continue;
        const d=Math.min(1.44-c.depth,dt*.59*(1-r2)**1.5/(c.hardness*(1.10-c.moisture*.25)));
        if(d<=0)continue;
        removed.push([c,d]); total+=d*area;
      }
      const scale=total ? clamp((Math.min(s.bucketCapacity,s.capacity-s.truck.load)-s.scoop)/total,0,1) : 0;
      for(const [c,d] of removed)c.depth+=d*scale;
      s.scoop+=total*scale;
      if(scale && random()<dt*17) grain(t.x,t.y+.12,t.z,(random()-.5)*1.6,.5+random(),(random()-.5)*1.3,0,'crumb');
    }
    function arm(dt) {
      let goal={...home}, curl=.08;
      const t=s.tip, a=s.action;
      if(s.phase==='chest'||s.phase==='opening') {
        goal={x:s.chest.x-.29,y:s.chest.pull ? ground(s.chest.x,s.chest.z)+.10+s.chest.exposed*.59 : 1.45,z:s.chest.z-.17};
        if(s.phase==='opening')goal.y=2.45;
      } else if(a==='cut') { goal={...s.aim,y:ground(s.aim.x,s.aim.z)-.03};curl=.10+.99*s.scoop/s.bucketCapacity; }
      else if(a==='lift'){goal={...s.aim,y:2.85};curl=1.12;}
      else if(a==='swing'||a==='pour'){goal={...bed,y:bed.y+.62};curl=a==='pour' ? -.70:1.12;}
      else if(a==='return'){goal={...home,y:1.56};}
      for(const ax of ['x','y','z'])spring(t,ax,'v'+ax,goal[ax],38,11,dt,4.8);
      spring(t,'curl','vc',curl,46,9,dt,3.5);
      if(a==='cut'){
        cut(dt);
        if(s.pending && s.contacted && s.cutAge>=.13)setAction('lift');
      }
      if(a==='lift' && t.y>2.38)setAction('swing');
      if(a==='swing' && Math.hypot(t.x-bed.x,t.z-bed.z)<.13)setAction('pour');
      if(a==='pour' && t.curl<.36 && s.scoop>0) {
        const m=Math.min(s.scoop,dt*.49);
        s.scoop-=m; s.activeMass+=m;
        grain(t.x+(random()-.5)*.67,t.y+.03,t.z+(random()-.5)*.44,
          (random()-.5)*1.22,-.24-random()*.3,(random()-.5)*.87,m,'load');
      }
      if(a==='pour' && s.scoop<1e-9 && s.activeMass<1e-8)setAction('return');
      if(a==='return' && Math.hypot(t.x-home.x,t.z-home.z)<.1){
        setAction('rest');
        let best=0;
        for(let i=0;i<cells.length;i++) if(cells[i].bank>.4 && cells[i].bank-.83*cells[i].depth>best){
          best=cells[i].bank-.83*cells[i].depth;s.hint.x=cells[i].x;s.hint.z=cells[i].z;
        }
      }
    }
    function deposit(p){
      // The loose clod breaks on contact. Its landing footprint spans neighbouring bins.
      const ix=binAt(p.x,p.z)%binX,iz=Math.floor(binAt(p.x,p.z)/binX);
      const parts=[];let sum=0;
      for(let j=Math.max(0,iz-1);j<=Math.min(binZ-1,iz+1);j++)for(let i=Math.max(0,ix-1);i<=Math.min(binX-1,ix+1);i++){
        const x=bed.x+(i-(binX-1)/2)*binW,z=bed.z+(j-(binZ-1)/2)*binD;
        const weight=Math.exp(-((p.x-x)**2+(p.z-z)**2)/.081);
        parts.push([j*binX+i,weight]);sum+=weight;
      }
      for(const [i,w] of parts)s.truck.bins[i]+=p.m*w/sum;
    }
    function particles(dt) {
      s.grains=s.grains.filter(p=>{
        p.age+=dt; p.vy-=9.81*dt; p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.spin+=p.vx*dt*3;
        const floor=p.kind==='load' ? bedFloor+s.truck.bins[binAt(p.x,p.z)]/(binW*binD):ground(p.x,p.z);
        if(p.y<=floor+p.r && p.vy<0){
          p.y=floor+p.r;
          if(p.kind==='load'){deposit(p);s.truck.load+=p.m;s.truck.frontMass+=p.m*clamp(.33+(p.x-bed.x)*.47,.12,.70);
            s.truck.vr+=p.m*Math.abs(p.vy)*.15;s.activeMass-=p.m;return false;}
          p.vy*=-.21;p.vx*=.52;p.vz*=.52;p.landed=true;
        }
        return p.age<1.6;
      });
    }
    function truck(dt) {
      const b=s.truck, exit=['spring','chest','opening','horn'].includes(s.phase);
      // Grains slide between adjacent bed compartments until below the angle of repose.
      if(b.load>0)for(let i=0;i<b.bins.length;i++)for(const j of [i%binX<binX-1?i+1:-1,i+binX]){
        if(j<0||j>=b.bins.length)continue;
        const diff=b.bins[i]-b.bins[j],excess=Math.abs(diff)-.44*(j-i===1?binW:binD)*binW*binD;
        if(excess>0){const m=Math.sign(diff)*excess*Math.min(.2,dt*6.7);b.bins[i]-=m;b.bins[j]+=m;}
      }
      spring(b,'front','vf',.14*b.frontMass,65,8,dt);
      spring(b,'rear','vr',.18*(b.load-b.frontMass),59,8,dt);
      const speed=s.phase==='reset'?-Math.min(5.6,b.x*2.0):exit && b.x<16 ? Math.min(4.6,.9+(b.x+.1)*1.3) : 0;
      b.v+=(speed-b.v)*Math.min(1,dt*(s.phase==='reset'?5:1.65)); b.x=Math.max(0,b.x+b.v*dt); b.wheel+=b.v*dt/.45;
      if(b.load>=s.capacity-1e-7 && s.phase==='soil' && s.activeMass<1e-8 && s.scoop<1e-8) {
        s.source=cells.reduce((best,c,i)=>c.depth>cells[best].depth?i:best,0);
        const c=cells[s.source];s.chest.x=c.x;s.chest.z=c.z;
        setPhase('spring');setAction('return');
      }
    }
    const flows = new Float64Array(cells.length);
    // Local hydraulic head drives exchange across wet neighbouring cells.
    function water(dt) {
      if(s.phase==='soil')return;
      flows.fill(0);
      const src=cells[s.source];
      const feed=s.phase==='reset'?0:dt*.26*Math.max(0,1-src.water/.51);
      flows[s.source]+=feed; s.waterIn+=feed*area; s.gas+=feed*area;
      if(s.gas>s.gasLimit && src.water>.013){
        const i=s.source+(random()>.5?0:src.x>cx?-1:1);
        s.ripples.push({i,r:.018,v:.24+random()*.13,energy:1});
        s.gas-=s.gasLimit;s.gasLimit=.0018+random()*.0028;
      }
      s.ripples=s.ripples.filter(r=>{r.r+=r.v*dt;r.v*=Math.exp(-dt*.92);
        r.energy*=Math.exp(-dt*(1.6+cells[r.i].hardness));return r.energy>.021;});
      for(let i=0;i<cells.length;i++) {
        const a=cells[i];
        for(const j of [i%NX<NX-1?i+1:-1,i+NX]){
          if(j<0||j>=cells.length)continue;
          const b=cells[j], head=a.rest-a.depth+a.water-b.rest+b.depth-b.water;
          const donor=head>0?a:b;
          const d=Math.sign(head)*Math.min(donor.water*.19,Math.abs(head)*dt*2.7);
          flows[i]-=d;flows[j]+=d;
        }
      }
      for(let i=0;i<cells.length;i++) {
        const c=cells[i];c.water=Math.max(0,c.water+flows[i]-(s.phase==='reset'?.22:.00025)*dt);
        c.flux+=(flows[i]/dt-c.flux)*dt*5;
        c.moisture+=dt*(Math.min(.95,.19+c.grain*.2+3*c.water)-c.moisture)*.65;
      }
    }
    function reward(dt) {
      const c=s.chest,h=s.horn;
      if(s.phase==='spring'){
        spring(c,'y','vy',ground(c.x,c.z)-.52,15,6,dt);
        if(s.phaseAge>2.1)setPhase('chest');
      }
      if(s.phase==='chest'){
        const base=ground(c.x,c.z);
        // The lip pries against one side; soil clears before the chest lifts free.
        if(c.pull && Math.hypot(s.tip.x-c.x+.29,s.tip.z-c.z+.17)<.36 && s.tip.y<base+.38+c.exposed*.60){
          const loosen=Math.min(1-c.exposed,dt*.74/cells[s.source].hardness);
          c.exposed+=loosen;
          for(const cell of cells){
            const r=Math.hypot((cell.x-c.x)/.83,(cell.z-c.z)/.63);
            if(r<1 && cell.bank>0)cell.depth+=loosen*.23*(1-r);
          }
          if(!s.held)c.effort-=dt;
          if(c.effort<=0)c.pull=false;
        }
        const corner=base+cells[s.source].water-.39;
        spring(c,'y','vy',corner+c.exposed*(.53-corner),20,7,dt);
        if(c.exposed>=1){setPhase('opening');s.held=false;}
      }
      if(s.phase==='opening'||s.phase==='horn'){
        spring(c,'y','vy',.53,20,7,dt);
        spring(c,'lid','vl',1.92,12,4.8,dt);
        spring(h,'height','vh',c.lid>1 ? .91 : 0,13,5.8,dt);
        if(s.phase==='opening' && h.height>.81)setPhase('horn');
        if(s.phase==='horn' && h.plays){h.quiet+=dt;if(h.quiet>4.4)setPhase('reset');}
      }
      spring(h,'ring','vr',0,190,5.3,dt);h.energy*=Math.exp(-2.4*dt);
      if(s.phase==='reset'){
        for(const cell of cells)if(cell.depth>0){
          const k=4.2/cell.hardness;
          spring(cell,'depth','settleV',0,k,2*Math.sqrt(k),dt,.77);
        }
        spring(c,'y','vy',-1.4,10,6,dt,.85);spring(h,'height','vh',0,18,7,dt);
        spring(c,'lid','vl',0,12,5,dt);
        const loss=Math.exp(-3*dt);
        s.truck.load*=loss;s.truck.frontMass*=loss;
        for(let i=0;i<s.truck.bins.length;i++)s.truck.bins[i]*=loss;
        // The truck returns from off-site along the same driveway.
        if(s.truck.x<.025 && s.phaseAge>5.5){
          for(const cell of cells){cell.depth=0;cell.settleV=0;cell.water=0;cell.flux=0;}
          Object.assign(c,{y:-1.4,vy:0,lid:0,vl:0,exposed:0,pull:false});
          Object.assign(h,{height:0,vh:0,plays:0,quiet:0});
          Object.assign(s.truck,{x:0,v:0,load:0,frontMass:0});s.truck.bins.fill(0);s.waterIn=0;s.gas=0;s.ripples=[];s.cycle++;
          setPhase('soil');setAction('rest');s.hint.x=home.x;s.hint.z=home.z;
        }
      }
    }
    function ambient(dt) {
      for(const w of winds) {
        w.next-=dt;
        if(w.next<=0){w.impulse=(random()-.28)*.68;w.next=.55+random()*2.8;}
        w.air+=(w.impulse-w.air)*dt*.8;
        spring(w,'bend','v',w.air*.36,w.stiffness,2.2,dt);
      }
      for(let i=0;i<s.clouds.length;i++){
        const c=s.clouds[i];c.next-=dt*(.56+Math.abs(winds[i*3].air));
        if(c.next<=0){c.target=.24+random()*.55;c.next=.9+random()*3.2;}
        spring(c,'cover','v',c.target,.52+i*.12,1.8,dt);
      }
      for(let k=0;k<s.puddles.length;k++){
        const p=s.puddles[k];p.next-=dt*(.89+Math.abs(winds[k+3].air));
        if(p.next<=0){p.v[Math.floor(random()*18)]+=.011+random()*.018;p.next=.35+random()*1.7;}
        for(let i=0;i<18;i++){
          const h=p.h[i], tension=p.h[(i+17)%18]+p.h[(i+1)%18]-2*h;
          p.v[i]+=(tension*92-h*30-p.v[i]*3.6)*dt;
        }
        for(let i=0;i<18;i++)p.h[i]+=p.v[i]*dt;
      }
      for(let i=0;i<s.motes.length;i++) {
        const p=s.motes[i],w=winds[i%winds.length];
        p.life-=dt;if(p.life<=0){p.lift=(random()-.42)*.11;p.life=1+random()*4.4;}
        p.vx+=(.057+w.air*.44-Math.max(0,p.x-9)*.16-p.vx)*dt*.7;p.vy+=(p.lift+(.8-p.y)*.011-p.vy)*dt*.65;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=w.v*dt*.23;
      }
      const e=s.engine;e.pulse-=dt;
      if(e.pulse<=0){e.v+=(.010+random()*.026)*(s.action==='cut'?2.8:1);e.pulse=.085+random()*.07;}
      spring(e,'p','v',0,135,6,dt);
      spring(s,'wobble','wobbleV',0,60,8,dt);
      const f=s.focus, close=s.phase!=='soil'&&s.phase!=='reset';
      spring(f,'amount','v',close?1:0,2.8,3.5,dt);
      spring(f,'x','vx',close?s.chest.x:cx,8,5,dt);
      spring(f,'z','vz',close?s.chest.z:cz,8,5,dt);
      spring(f,'y','vy',close?Math.max(-.23,s.chest.y+.30+s.horn.height*.66):.42,7,5,dt);
      const h=s.hint;
      if(!s.held && s.action==='rest')s.idle+=dt;else s.idle=0;
      if(s.idle>=4 && h.mode==='sleep' && ['soil','chest','horn'].includes(s.phase)){h.mode='press';h.age=0;}
      if(h.mode!=='sleep'){h.age+=dt;if(h.age>1.55)h.mode='lift';
        if(h.age>2.75){h.mode='sleep';s.idle=1.25;}}
      spring(h,'pressure','v',h.mode==='press'?1:0,26,8,dt);
    }
    function step(seconds) {
      if(!Number.isFinite(seconds)||seconds<=0)return;
      const n=Math.ceil(seconds/(1/100)), dt=seconds/n;
      for(let i=0;i<n;i++){s.time+=dt;s.phaseAge+=dt;s.actionAge+=dt;
        arm(dt);particles(dt);truck(dt);water(dt);reward(dt);ambient(dt);}
    }
    function getState(){return JSON.parse(JSON.stringify(s));}
    return {step,getState,down,move,up,state:s,ground,near};
  }
  const api={create,NX,NZ,cx,cz,rx,rz,dx,dz,area,home,bed,binX,binZ,binW,binD,bedFloor};
  root.DigPhysics=api;if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
