/* Distances are in scene units, volumes in cubic units, time in seconds.
   This module is shared by the touch scene and the headless experiment. */
(function (root) {
  'use strict';
  const N = 91, DX = 0.046, MID = (N - 1) / 2, CELL = DX * DX, DT = 1 / 120;
  const LOAD = 0.46, CONTACT = 0.003, YAW = 0.29;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const positive = v => Math.max(0, v);
  const ix = x => (x - MID) * DX;
  function createStudy(seed = 2937) {
    let randomState = seed >>> 0;
    function random() {
      randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
      return randomState / 4294967296;
    }
    const array = () => new Float64Array(N * N);
    const h = array(), heat = array(), set = array(), gas = array(), change = array();
    const thermalMass = array(), setMass = array(), pressure = array(), mobility = array();
    const floor = array(), adhesion = array(), conductivity = array(), nuclei = array(), skin = array();
    const panProfile=[[0,0],[1.51,0],[1.62,0.004],[1.73,0.019],[1.81,0.058],
      [1.885,0.13],[1.975,0.26],[2.05,0.409],[2.072,0.447],[2.099,0.467]];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = i + j * N, x = ix(i), z = ix(j);
      const radius=Math.hypot(x,z),wall=panProfile.findIndex(p=>p[0]>=radius);
      if(wall<0)floor[k]=2;
      else if(wall>0){
        const [ra,ya]=panProfile[wall-1],[rb,yb]=panProfile[wall];
        floor[k]=ya+(yb-ya)*(radius-ra)/(rb-ra);
      }
      adhesion[k] = 1 + 0.22 * Math.sin(6*x+3*z) + 0.14*Math.cos(9*z-2*x) + 0.09*random();
      conductivity[k] = 0.92 + 0.12*Math.cos(3*x-2*z) + 0.09*random();
      nuclei[k] = random() < 0.024 ? 0.037 + random()*0.14 : Infinity;
    }
    let tilt, tiltV, cx, cz, height, goal, flow, remaining, lipStore, outflow, lastGap;
    let bounds, particles, impacts, bubbles, breaks, pops, deposited, footprint, stage, quiet, dwell;
    let panTravel, panV, ladleTravel, ladleV, batch = 0, credit = 0, impact = null;
    function initialize() {
      tilt = tiltV = flow = lipStore = outflow = 0; remaining = LOAD;
      cx = cz = 0; height = 0.5; goal = {tilt:0,x:0,z:0,height:0.5};
      lastGap = true; particles = []; impacts = []; bubbles = []; breaks = pops = deposited = footprint = 0;
      bounds = {x0:N-3,x1:2,z0:N-3,z1:2}; quiet = dwell = 0; impact = null;
      for (const field of [h,heat,set,gas,skin,change,thermalMass,setMass]) field.fill(0);
    }
    initialize(); stage = 'ready'; panTravel = panV = ladleTravel = ladleV = 0;
    function control(input = {}) {
      if (!['ready','pour','cook'].includes(stage)) return;
      for (const name of ['tilt','x','z','height']) {
        if (Number.isFinite(input[name])) goal[name] = clamp(input[name], name==='x'||name==='z' ? -1 : 0, 1);
      }
      if (Number.isFinite(input.z) && !Number.isFinite(input.height)) goal.height = 0.5 - goal.z*0.45;
      if (goal.tilt>0.035 && remaining>0.002) {stage='pour'; quiet=0; dwell=0;}
    }
    function pose() {
      const angle = tilt*1.32;
      const bx = 0.17 + cx*0.72, by = 0.94 + height*0.95, bz = -0.37 + cz*0.57;
      const reach = 0.548*Math.cos(angle);
      return {bx,by,bz,angle,x:bx+Math.sin(YAW)*reach,y:by-0.548*Math.sin(angle),z:bz+Math.cos(YAW)*reach};
    }
    function pour() {
      tiltV += ((goal.tilt-tilt)*64 - tiltV*12)*DT;
      tilt = clamp(tilt + tiltV*DT,0,1);
      cx += clamp((goal.x-cx)*8,-2.7,2.7)*DT;
      cz += clamp((goal.z-cz)*7,-2.4,2.4)*DT;
      height += clamp((goal.height-height)*5,-1.3,1.3)*DT;
      const capacity = LOAD * Math.pow(positive(1-tilt*1.49),3.6);
      const head = positive((remaining-capacity)/LOAD - 0.009);
      const desired = stage==='pour' ? 0.295*Math.pow(head,0.73)*Math.pow(tilt,1.1) : 0;
      flow += (desired-flow)*(desired>flow?8.2:4.5)*DT;
      const volume = Math.min(remaining,flow*DT);
      remaining -= volume; outflow = volume/DT;
      lipStore += volume;
      const p = pose(), speed = 0.26 + 2.9*Math.sqrt(outflow);
      const thread = outflow > 0.019;
      if (lipStore>0 && (thread || lipStore>=0.00065 || (flow<0.00008 && lipStore>0.000006))) {
        particles.push({x:p.x,y:p.y,z:p.z,vx:0.10*Math.sin(YAW),vy:-speed,
          vz:0.10+0.24*tilt,v:lipStore,r:Math.sqrt(outflow/(Math.PI*speed)),q:outflow,
          weak:0.015+0.020*random(),spacing:speed*DT,connected:thread && !lastGap,drop:!thread});
        lipStore=0; lastGap=!thread;
      } else if (!thread) lastGap=true;
    }
    function deposit(p, volume, flattening) {
      const u = MID+p.x/DX, w = MID+p.z/DX;
      const i0 = Math.floor(u), j0 = Math.floor(w);
      const contactWidth = 2.55 + 0.26*Math.abs(p.vy) + p.r*9;
      const spread = Math.min(contactWidth*(0.46+0.54*flattening),1.16+Math.sqrt(deposited)*26+p.r*6);
      const reach = Math.ceil(spread);
      let sum = 0;
      for (let j=j0-reach;j<=j0+reach;j++) for (let i=i0-reach;i<=i0+reach;i++) {
        sum += positive(1-((i-u)**2+(j-w)**2)/(spread*spread))**2;
      }
      for (let j=j0-reach;j<=j0+reach;j++) for (let i=i0-reach;i<=i0+reach;i++) {
        const k = i+j*N, added = volume/CELL/sum*positive(1-((i-u)**2+(j-w)**2)/(spread*spread))**2;
        if (!added) continue;
        const before=h[k]; h[k]+=added;
        heat[k]*=before/h[k]; set[k]*=before/h[k];
      }
      bounds.x0=Math.min(bounds.x0,i0-reach-1); bounds.x1=Math.max(bounds.x1,i0+reach+1);
      bounds.z0=Math.min(bounds.z0,j0-reach-1); bounds.z1=Math.max(bounds.z1,j0+reach+1);
      deposited+=volume;
    }
    function fall() {
      // Viscous traction opposes extension between neighboring material parcels.
      // Equal and opposite impulses leave the falling strand's momentum intact.
      for (let n=1;n<particles.length;n++) {
        const p=particles[n],q=particles[n-1];if(!p.connected)continue;
        const x=p.x-q.x,y=p.y-q.y,z=p.z-q.z,dist=Math.hypot(x,y,z)||1e-6;
        const separating=((p.vx-q.vx)*x+(p.vy-q.vy)*y+(p.vz-q.vz)*z)/dist;
        const impulse=positive(separating)*Math.min(0.28,DT*(12+8*dist/p.spacing))/dist;
        const a=q.v/(p.v+q.v),b=1-a;
        p.vx-=x*impulse*a;p.vy-=y*impulse*a;p.vz-=z*impulse*a;
        q.vx+=x*impulse*b;q.vy+=y*impulse*b;q.vz+=z*impulse*b;
      }
      for (let n=particles.length-1;n>=0;n--) {
        const p=particles[n];
        p.vy-=19.5*DT; p.x+=p.vx*DT; p.y+=p.vy*DT; p.z+=p.vz*DT;
        if (!p.drop) {
          const neighbor=n>0 && p.connected?particles[n-1]:null;
          const axial=neighbor?Math.hypot(p.x-neighbor.x-neighbor.vx*DT,
            p.y-neighbor.y-(neighbor.vy-19.5*DT)*DT,p.z-neighbor.z-neighbor.vz*DT)/DT:0;
          const speed=Math.max(axial,Math.hypot(p.vx,p.vy,p.vz));
          p.r=Math.sqrt(p.q/(Math.PI*speed));
          if (p.connected && p.r<p.weak) {p.connected=false; breaks++;}
        } else p.r=Math.cbrt(3*p.v/(4*Math.PI));
        const k=Math.round(MID+p.x/DX)+Math.round(MID+p.z/DX)*N;
        if (p.y<=floor[k]+h[k]+p.r*0.4) {
          impact={x:p.x,z:p.z,speed:-p.vy};
          impacts.push({p,elapsed:0,fraction:0,duration:0.075+0.013*Math.abs(p.vy)});
          particles.splice(n,1);
          if (n<particles.length) particles[n].connected=false;
        }
      }
    }
    function flattenImpacts() {
      for(let i=impacts.length-1;i>=0;i--) {
        const contact=impacts[i];
        contact.elapsed+=DT;
        const u=Math.min(1,contact.elapsed/contact.duration),fraction=u*u*(3-2*u);
        deposit(contact.p,contact.p.v*(fraction-contact.fraction),u);
        contact.fraction=fraction;
        if(u===1)impacts.splice(i,1);
      }
    }
    // Conservative, face-by-face volume flux. Heat and set fraction travel with the flux.
    function transfer(a,b,factor) {
      const d=pressure[a]-pressure[b], src=d>0?a:b, dst=d>0?b:a;
      if (h[src]<0.00015 || mobility[src]<=0) return;
      const dh=Math.min(h[src]*0.19,Math.abs(d)*mobility[src]*factor);
      change[src]-=dh; change[dst]+=dh;
      thermalMass[src]-=dh*heat[src]; thermalMass[dst]+=dh*heat[src];
      setMass[src]-=dh*set[src]; setMass[dst]+=dh*set[src];
    }
    function cook() {
      if (!deposited) return;
      const {x0,x1,z0,z1}=bounds;
      // Subcycling bounds the explicit diffusion number even under a fresh impact.
      // Gradient-limited flux prevents adjacent cells from overshooting equilibrium.
      for(let pass=0;pass<5;pass++) {
        for (let j=z0;j<=z1;j++) for (let i=x0;i<=x1;i++) {
          const k=i+j*N, v=h[k], contact=Math.min(h[k-1],h[k+1],h[k-N],h[k+N]);
          const rim=positive(1-contact/0.055);
          pressure[k]=floor[k]+v-0.024*rim*Math.min(1,v/0.036);
          mobility[k]=Math.min(0.20,DT/(5*CELL)*230*v*v*v*adhesion[k]*Math.pow(1-set[k],4.6));
        }
        for (let j=z0;j<=z1;j++) for (let i=x0;i<=x1;i++) {
          const k=i+j*N;
          if(i<x1) transfer(k,k+1,0.66);
          if(j<z1) transfer(k,k+N,0.66);
          if(i<x1 && j<z1)transfer(k,k+N+1,0.17);
          if(i>x0 && j<z1)transfer(k,k+N-1,0.17);
        }
        for (let j=z0;j<=z1;j++) for (let i=x0;i<=x1;i++) {
          const k=i+j*N,old=h[k],v=old+change[k];
          if(v>0) {
            heat[k]=(heat[k]*old+thermalMass[k])/v;
            set[k]=clamp((set[k]*old+setMass[k])/v,0,1);
          }
          h[k]=v; change[k]=thermalMass[k]=setMass[k]=0;
        }
      }
      let cooked=0, mass=0;
      for (let j=z0;j<=z1;j++) for (let i=x0;i<=x1;i++) {
        const k=i+j*N, v=h[k];
        if(v<0.00014) continue;
        if(i<=x0+1) bounds.x0=Math.max(2,x0-1);
        if(i>=x1-1) bounds.x1=Math.min(N-3,x1+1);
        if(j<=z0+1) bounds.z0=Math.max(2,z0-1);
        if(j>=z1-1) bounds.z1=Math.min(N-3,z1+1);
        const edge=positive(1-Math.min(h[k-1],h[k+1],h[k-N],h[k+N])/0.035);
        heat[k]+=(1-heat[k])*conductivity[k]*(0.17+0.064/(0.027+v)+0.18*edge)*DT;
        set[k]+=(1-set[k])*positive(heat[k]-0.40)*1.6*DT;
        cooked+=v*set[k]; mass+=v;
        if(v>0.05 && set[k]>0.09 && set[k]<0.83 && Number.isFinite(nuclei[k])) {
          gas[k]+=DT*v*(heat[k]-0.32);
          if(gas[k]>nuclei[k] && skin[k]===0) {
            bubbles.push({k,x:ix(i),z:ix(j),r:0.001,limit:0.023+random()*0.029,
              growth:0.035+random()*0.038,opening:0,age:0,burst:false});
            skin[k]=1;
          }
        }
      }
      footprint=mass?cooked/mass:0;
      for(let n=bubbles.length-1;n>=0;n--) {
        const b=bubbles[n]; b.age+=DT;
        if(!b.burst) {
          b.r+=b.growth*(0.35+heat[b.k])*DT;
          if(b.r>=b.limit){b.burst=true;skin[b.k]=2;pops++;}
        } else {
          b.opening+=DT*(2.1+set[b.k]);
          if(b.opening>1.0) bubbles.splice(n,1);
        }
      }
    }
    function lifecycle() {
      const settled=outflow<0.0002 && particles.length===0 && impacts.length===0;
      if(stage==='pour' && settled && !deposited && goal.tilt===0 && lipStore<0.000006)stage='ready';
      if(stage==='pour' && settled && deposited>0 && (goal.tilt<0.035 || remaining<0.008 || flow<0.00002)){
        quiet+=DT; if(quiet>0.65){stage='cook';goal.tilt=0;}
      }
      if(stage==='cook' && footprint>0.86) {
        dwell+=DT; if(dwell>1.65) stage='leave';
      }
      const away=stage==='leave';
      panV+=((Number(away)-panTravel)*10-panV*6.2)*DT;
      panTravel+=panV*DT;
      ladleV+=((Number(away)-ladleTravel)*20-ladleV*8.7)*DT;
      ladleTravel+=ladleV*DT;
      if(away && panTravel>0.988){initialize();batch++;stage='return';}
      if(stage==='return' && panTravel<0.012)stage='ready';
    }
    function step(dt) {
      if (!Number.isFinite(dt) || dt<0) throw new RangeError('dt');
      credit+=dt;
      while(credit>=DT-1e-10) {pour();fall();flattenImpacts();cook();lifecycle();credit-=DT;}
    }
    function sample(x,z) {
      const u=clamp(MID+x/DX,1,N-2),v=clamp(MID+z/DX,1,N-2),i=Math.floor(u),j=Math.floor(v);
      const a=u-i,b=v-j,k=i+N*j;
      return (h[k]*(1-a)+h[k+1]*a)*(1-b)+(h[k+N]*(1-a)+h[k+N+1]*a)*b;
    }
    function getState() {
      let weight=0, mx=0,mz=0,peak=0,shine=0,perimeter=0,area=0,measuredVolume=0,edgeT=0,coreT=0,ew=0,cw=0;
      for(let j=bounds.z0;j<=bounds.z1;j++) for(let i=bounds.x0;i<=bounds.x1;i++) {
        const k=i+j*N, v=h[k]; if(v<CONTACT) continue;
        weight+=v;mx+=ix(i)*v;mz+=ix(j)*v;peak=Math.max(peak,v);
        shine+=v*(0.92-0.73*set[k]);
        if(v<0.047){ew++;edgeT+=heat[k];}else if(v>0.105){cw++;coreT+=heat[k];}
      }
      if(weight){mx/=weight;mz/=weight;}
      // Measure the actual piecewise-linear contact contour, including separate drops.
      function triangle(a,b,c) {
        const ids=[a,b,c], inside=ids.filter(k=>h[k]>=CONTACT), count=inside.length;
        if(!count) return;
        if(count===3){area+=CELL/2;measuredVolume+=CELL*(h[a]+h[b]+h[c])/6;return;}
        const odd=count===1?inside[0]:ids.find(k=>h[k]<CONTACT);
        const pair=ids.filter(k=>k!==odd), s=(h[odd]-CONTACT)/(h[odd]-h[pair[0]]),
          t=(h[odd]-CONTACT)/(h[odd]-h[pair[1]]);
        const dx=(pair[0]%N-odd%N)*s-(pair[1]%N-odd%N)*t;
        const dz=(Math.floor(pair[0]/N)-Math.floor(odd/N))*s-(Math.floor(pair[1]/N)-Math.floor(odd/N))*t;
        const cutVolume=CELL*s*t*(h[odd]+2*CONTACT)/6;
        measuredVolume+=count===1?cutVolume:CELL*(h[a]+h[b]+h[c])/6-cutVolume;
        area+=CELL*0.5*(count===1?s*t:1-s*t); perimeter+=DX*Math.hypot(dx,dz);
      }
      for(let j=bounds.z0;j<bounds.z1;j++) for(let i=bounds.x0;i<bounds.x1;i++){
        const k=i+N*j;
        if(h[k]+h[k+1]+h[k+N]+h[k+N+1]<CONTACT)continue;
        triangle(k,k+1,k+N);triangle(k+1,k+N+1,k+N);
      }
      return {stage,batch,radius:Math.sqrt(area/Math.PI),thickness:area?measuredVolume/area:0,
        peakThickness:peak,flow:outflow,circularity:perimeter?4*Math.PI*area/perimeter**2:null,
        gloss:weight?shine/weight:0.92,solidFraction:footprint,bubbleCount:bubbles.filter(b=>!b.burst).length,
        pops,breaks,centerX:mx,centerZ:mz,edgeTemp:ew?edgeT/ew:0,coreTemp:cw?coreT/cw:0,
        remaining,deposited,inFlight:particles.reduce((s,p)=>s+p.v,lipStore),
        atContact:impacts.reduce((s,c)=>s+c.p.v*(1-c.fraction),0),
        particles:particles.length,impactSpeed:impact?impact.speed:0,pose:pose()};
    }
    function view(){return {h,floor,heat,set,skin,bounds,particles,bubbles,stage,batch,pose:pose(),remaining,
      flow:outflow,lipStore,panTravel,ladleTravel,goal};}
    return {step,control,getState,view,sample,N,DX,MID,CONTACT,LOAD,YAW};
  }
  if(typeof module==='object' && module.exports) module.exports={createStudy,...createStudy()};
  else root.createPourStudy=createStudy;
})(globalThis);
