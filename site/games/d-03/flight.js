/* Coordinates are metres. s increases in the direction of the valley. */
(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, f) => a + (b - a) * f;
  const rad = Math.PI / 180;
  const sat = x => clamp(x, 0, 1);
  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function hash(x, y) {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    let u = x-i, v = y-j;
    u = u*u*(3-2*u); v = v*v*(3-2*v);
    return mix(mix(hash(i,j), hash(i+1,j), u), mix(hash(i,j+1), hash(i+1,j+1), u), v);
  }
  const lakeAxis = s => 55 + 24*Math.cos(s*.008) + 23*Math.sin(s*.017 + 1);
  const lakeWidth = s => 54 + 16*Math.cos(s*.009) + 10*Math.sin(s*.006);
  function terrain(x, s) {
    const shore = Math.abs(x-lakeAxis(s)) - lakeWidth(s);
    const shoreHeight = Math.min(shore * .24, 5 + 10*noise(x*.009, s*.009)) + 1.1*noise(x*.07,s*.07);
    const side = Math.max(0, Math.abs(x - 40) - 107);
    return Math.max(-14, shoreHeight) + side * (.23 + .32*noise(x*.0041, s*.0041)) +
      Math.min(1,side/120)*28*noise(x*.015,s*.014);
  }
  const waveCols = 18, waveRows = 24;
  const create = (options = {}) => {
    const seed = options.seed === undefined ? 7031 : options.seed;
    const spread = options.spread === undefined ? 1 : options.spread;
    const thermalCount = options.thermalCount === undefined ? 6 : options.thermalCount;
    let rng, state, wNext, accumulator = 0;
    function reset(cycle = 0) {
      rng = random(seed);
      const balloons = Array.from({length:20}, (_,i) => {
        const x = i === 0 ? -15*spread : i === 1 ? 22*spread :
          (Math.sin(i*.49+.53)*25 + Math.sin(i*.91)*10+(rng()-.5)*6)*spread;
        const s = i===0 ? 47 : i===1 ? 82 : 100+(i-2)*28+rng()*18;
        // The outer balloons drift in on the cross-valley breeze.
        const drift=i<2?0:(hash(i,104)-.5)*Math.min(134,s*.34)*spread;
        return {id:i, lane:x, x:x+drift, vx:-drift*.042, vs:3.4+hash(i,22)*1.5, s, y:i===0 ? 51.8 : i===1 ? 55.2 : 54+Math.sin(i*.72)*6+rng()*3,
          scale:i===0 ? 1 : .76 + rng()*.39, visited:false, heat:.13+rng()*.13,
          fuel:0, glow:.1, sway:(rng()-.5)*.027, swayRate:(rng()-.5)*.015,
          heave:rng()*.3, heaveRate:0, draft:0, basketTilt:0, basketRate:0,
          gust:rng()*.3, valve:.1, visitAge:100, recycled:0};
      });
      const thermals = Array.from({length:thermalCount}, (_,i) => ({
        x:i===0 ? -3 : -30 + hash(i,92)*39, s:(i*97+56)%640, radius:23+hash(i,19)*12,
        temperature:5+hash(i,31)*3, excess:0, velocity:0,
        tracers:Array.from({length:24},(_,j)=>({dx:Math.cos(j*2.4)*(2+hash(i,j)*7),
          dz:Math.sin(j*2.4)*(2+hash(i,j)*7),height:hash(j+6,i)*55,vy:.6}))
      }));
      const waves = new Float64Array(waveCols*waveRows), waveV = new Float64Array(waves.length);
      for (let i=0;i<waves.length;i++) { waves[i]=(rng()-.5)*.052; waveV[i]=(rng()-.5)*.02; }
      wNext = new Float64Array(waves.length);
      const seeds = Array.from({length:84}, () => ({
        x:(rng()-.5)*100, s:rng()*112-12, y:34+rng()*40, vx:0, vy:rng()*.15, vs:0, size:.018+rng()*.037
      }));
      state = {cycle, elapsed:0, phase:'flight', phaseAge:0, idle:0, count:0, active:0, sequence:0,
        input:{held:false, x:0, y:0, follow:false}, plane:{x:0,y:52,s:0,speed:12,roll:-.045,pitch:0,
          rollRate:0,pitchRate:0,heading:0,vy:0,rudder:0,aileron:0,hingeRate:0,lift:0,updraft:0},
        air:{gust:.15,wind:.42}, balloons, thermals, waves, waveV, seeds,
        light:{elevation:.076,rate:0,gold:.05}, guide:{amount:0,stroke:0},
        family:{arms:[{angle:.04,rate:0,drive:.80,limit:.37},{angle:-.13,rate:.1,drive:1.08,limit:.45},
          {angle:.19,rate:0,drive:-.61,limit:.31}]}, landing:null};
    }
    reset();
    function touch(x,y,follow=false) {
      if (state.phase!=='flight') return;
      Object.assign(state.input, {held:true,x:clamp(x,-1,1),y:clamp(y,-1,1),follow});
      state.idle=0;
    }
    function release() {state.input.held=false;state.input.follow=false;}
    function localAir(x,s) {
      return (noise(x*.043 + state.air.gust*.2,s*.031)-.5)*2.4+state.air.wind;
    }
    function updateThermals(dt) {
      const {plane:p, light} = state;
      p.updraft=0;
      for (const c of state.thermals) {
        const centerS=c.s+Math.round((p.s-c.s)/640)*640;
        c.centerS=centerS;c.centerX=Math.min(c.x,lakeAxis(centerS)-lakeWidth(centerS)-9);
        const ds=p.s-centerS;
        const distance2=(p.x-c.centerX)**2+ds**2;
        const heating=(6.4+2*noise(c.x*.1,c.s*.1)+light.gold*1.3-c.temperature)*.17;
        c.temperature+=heating*dt;
        c.velocity += (Math.sqrt(c.temperature*1.65)-c.velocity)*dt*.87;
        c.excess=c.velocity*Math.exp(-distance2/(2*c.radius**2)-Math.max(0,p.y-49)*.075);
        p.updraft+=c.excess;
        for(const d of c.tracers) {
          const vx=-d.dz*.12+state.air.wind*.17, vz=d.dx*.12;
          d.dx+=vx*dt;d.dz+=vz*dt;d.vy+=(c.velocity*(1-d.height/100)-d.vy)*dt*.68;
          d.height+=d.vy*dt;
          if(d.height>57){d.height=0;d.dx*=.87;d.dz*=.87;}
        }
      }
    }
    const wingLift=p=>.5*1.16*12.4*p.speed*p.speed*(.67+.67*p.pitch);
    function updateFlight(dt) {
      const p=state.plane, input=state.input, b=state.balloons[state.active];
      let x=input.held ? input.x : 0, y=input.held ? input.y : 0;
      if (input.held && input.follow && b) {
        x=clamp((b.x-p.x)/Math.max(6,(b.s-p.s)*.47),-1,1);
        y=clamp((b.y+1-p.y)/Math.max(5,(b.s-p.s)*.3),-1,1);
      }
      const targetRoll=-35*rad*x, targetPitch=15*rad*y;
      p.rollRate+=((targetRoll-p.roll)*11-5.4*p.rollRate)*dt;
      p.pitchRate+=((targetPitch-p.pitch)*9-5.1*p.pitchRate)*dt;
      p.roll=clamp(p.roll+p.rollRate*dt,-35*rad,35*rad);
      p.pitch=clamp(p.pitch+p.pitchRate*dt,-15*rad,15*rad);
      p.heading+=(-p.roll*.91-p.heading)*dt*1.48;
      p.lift=wingLift(p);
      const ground=terrain(p.x,p.s);
      const support=Math.max(0,ground+19-p.y)*1.45;
      const ceiling=Math.max(0,p.y-78)*.48;
      const vertical=(p.lift/70.7*Math.cos(p.roll)-9.81)*.48 +
        (p.speed*Math.sin(p.pitch)+p.updraft-.27-p.vy)*.94+support-ceiling;
      p.vy+=vertical*dt; p.y+=p.vy*dt;
      p.x+=(Math.sin(p.heading)*p.speed + localAir(p.x,p.s)*.12 -
        Math.sign(p.x)*Math.max(0,Math.abs(p.x)-85)*.27)*dt;
      p.s+=Math.cos(p.heading)*Math.cos(p.pitch)*p.speed*dt;
    }
    function updateHinges(dt) {
      const p=state.plane;
      const load=localAir(p.x,p.s)*.013-p.rollRate*.31+(state.input.held ? state.input.x*.05 : 0);
      p.hingeRate+=((load-p.aileron)*48-5.8*p.hingeRate)*dt;
      p.aileron+=p.hingeRate*dt;
      p.rudder+=(-p.heading*.31+localAir(p.x+2,p.s-2)*.01-p.rudder)*dt*4;
    }
    function findActive() {
      const p=state.plane;
      const eligible=state.balloons.filter(b=>!b.visited && b.s>p.s-7);
      eligible.sort((a,b)=>a.s-b.s);
      return eligible.length ? eligible[0].id : -1;
    }
    function updateBalloons(dt) {
      const p=state.plane;
      for (const b of state.balloons) {
        if (state.phase==='flight' && !b.visited && b.s < p.s-62) {
          const queue=state.balloons.filter(o=>o!==b && !o.visited && o.s>p.s);
          b.s=Math.max(p.s+67,...queue.map(o=>o.s+28));
          b.x=p.x*.23+clamp(b.x,-22,22)*.57;b.lane=b.x;b.vx=0;
          b.y=clamp(p.y+1,42,76); b.recycled++;
        }
      }
      state.active=state.phase==='flight' ? findActive() : -1;
      for (const b of state.balloons) {
        b.visitAge+=dt;
        const cross=localAir(b.x,b.s);
        b.vx+=((b.lane-b.x)*.038+cross*.047-b.vx)*dt*.72;
        b.vs+=(2.45+cross*.38-b.vs)*dt*.16;
        b.x+=b.vx*dt;b.s+=b.vs*dt;
        const ds=b.s-p.s, dx=b.x-p.x, dy=b.y+b.heave+1.5-p.y;
        const near=Math.exp(-(ds*ds+dx*dx+dy*dy)/550);
        const target=b.id===state.active, wind=localAir(b.x,b.s);
        if (target && Math.abs(ds)<8.5 && (dx/11.7)**2+(dy/11)**2<1.55) {
          b.visited=true; b.visitAge=0; b.fuel=1; state.count++; state.sequence++;
          b.swayRate+=(dx>0?1:-1)*(.19+.11*near); b.heaveRate+=.52;
          if (state.count===20) {state.phase='sunrise';state.phaseAge=0;release();}
        }
        b.gust+=((rng()-.5)*1.75-b.gust*.87)*dt;
        b.valve+=((.14 + (target?.28:0) + (target && state.input.follow?.26:0) +
          b.fuel*2.4+b.gust*.26)-b.valve)*dt*3.5;
        b.fuel=Math.max(0,b.fuel-dt*.23);
        b.heat+=(b.valve-b.heat*.85)*dt*1.5;
        b.glow+=(b.heat*(1+.13*wind)+b.gust*.7-b.glow)*dt*8;
        b.draft+=((b.heat-.25)*.78-b.draft)*dt*.8;
        b.heaveRate+=(b.draft-.3*b.heave-.82*b.heaveRate)*dt;
        b.heave+=b.heaveRate*dt;
        b.swayRate+=(wind*.009+b.gust*.035-b.sway*.93-b.swayRate*.58)*dt;
        b.sway+=b.swayRate*dt;
        b.basketRate+=((b.sway*.68-b.basketTilt)*5.3-b.basketRate*.85)*dt;
        b.basketTilt+=b.basketRate*dt;
      }
      state.active=state.phase==='flight' ? findActive() : -1;
    }
    function updateWater(dt) {
      const {waves:h, waveV:v}=state;
      for(let j=0;j<waveRows;j++) for(let i=0;i<waveCols;i++) {
        const k=j*waveCols+i;
        const lap=h[j*waveCols+(i+1)%waveCols]+h[j*waveCols+(i+waveCols-1)%waveCols]+
          h[((j+1)%waveRows)*waveCols+i]+h[((j+waveRows-1)%waveRows)*waveCols+i]-4*h[k];
        const pressure=(rng()-.5)*.43*(.55+Math.abs(localAir(i*4,j*7))*.28);
        wNext[k]=v[k]+(lap*11+pressure-v[k]*.67-h[k]*.8)*dt;
      }
      for(let k=0;k<h.length;k++){v[k]=wNext[k];h[k]+=v[k]*dt;}
    }
    function updateSeeds(dt) {
      const p=state.plane;
      for(const d of state.seeds) {
        const wind=localAir(d.x,d.s);
        let rising=0;
        for(const c of state.thermals){const d2=(d.x-c.centerX)**2+(d.s-c.centerS)**2;
          if(d2<c.radius*c.radius*6)rising+=c.velocity*Math.exp(-d2/(2*c.radius*c.radius));}
        d.vx+=(wind*.64-d.vx)*dt; d.vy+=(rising*.52+wind*.19-.15-d.vy)*dt*.8;
        d.vs+=(wind*.21-d.vs)*dt; d.x+=d.vx*dt;d.y+=d.vy*dt;d.s+=d.vs*dt;
        if(d.s<p.s-24 || d.y>p.y+36) {
          d.s=p.s+84+rng()*24;d.x=p.x+(rng()-.5)*95;d.y=p.y+(rng()-.52)*47;
        }
      }
    }
    function updateArrival(dt) {
      const p=state.plane;
      if(state.phase==='sunrise') {
        updateFlight(dt);
        if(state.phaseAge>5) {
          state.phase='landing';state.phaseAge=0;
          const clearance=p.y-terrain(p.x,p.s)-.68;
          const approach=Math.max(137,clearance*3.55),finish=p.s+approach+24;
          const x=lakeAxis(finish)-lakeWidth(finish)-46;
          state.landing={touchdown:p.s+approach,finish,x,glideSlope:clearance/approach,
            vx:Math.sin(p.heading)*p.speed,rolling:false};
        }
      } else if (state.phase==='landing') {
        const l=state.landing,ground=terrain(p.x,p.s)+.68,clearance=Math.max(0,p.y-ground);
        const remaining=l.touchdown-p.s;
        if(!l.rolling){
          const nextHeight=terrain(p.x,p.s+3)+.68;
          const slope=(nextHeight-ground)/3;
          // The glider follows the meadow approach, then flares in ground effect.
          const heightError=remaining*l.glideSlope-clearance;
          const targetVy=clamp(p.speed*(slope-l.glideSlope)+heightError*.65,-4.15,1.1);
          const targetSpeed=8.2+3.8*sat(clearance/19);
          p.speed+=(targetSpeed-p.speed)*dt*.8;
          const groundEffect=Math.exp(-clearance/2.2)*.54;
          p.vy+=((targetVy-p.vy)*1.65+groundEffect)*dt;p.y+=p.vy*dt;
          l.vx+=(clamp((l.x-p.x)*.35,-4.1,4.1)-l.vx)*dt*.95;
          p.x+=l.vx*dt;
          p.pitch+=(clamp(p.vy/Math.max(1,p.speed)*.61+groundEffect*.22,-15*rad,.115)-p.pitch)*dt*1.45;
          p.heading+=(Math.atan2(l.vx,p.speed)-p.heading)*dt*1.2;
          p.roll+=(-l.vx*.024-p.roll)*dt*1.6;
          p.s+=Math.cos(p.heading)*p.speed*dt;
          if(p.y<=terrain(p.x,p.s)+.68){l.rolling=true;p.vy=0;}
        }
        if(l.rolling){
          const friction=1.43+.25*noise(p.x*.11,p.s*.07);
          p.speed=Math.max(0,p.speed-friction*dt);
          p.s+=p.speed*dt;p.y=terrain(p.x,p.s)+.68;
          p.pitch*=Math.exp(-dt*1.6);p.roll*=Math.exp(-dt*1.8);p.heading*=Math.exp(-dt);
          if(p.speed===0){state.phase='meadow';state.phaseAge=0;}
        }
        p.lift=wingLift(p);
      } else if(state.phase==='meadow') {
        p.pitch*=Math.exp(-dt*2);
        if(state.phaseAge>8) reset(state.cycle+1);
      }
    }
    function tick(dt) {
      state.elapsed+=dt;state.phaseAge+=dt;state.idle=state.input.held ? 0 : state.idle+dt;
      state.air.gust+=dt*(.21+state.air.wind*.11);
      state.air.wind+=((noise(state.air.gust,12)-.44)*2.1-state.air.wind)*dt*.35;
      updateThermals(dt);
      if(state.phase==='flight') updateFlight(dt); else updateArrival(dt);
      updateHinges(dt);updateBalloons(dt);updateWater(dt);updateSeeds(dt);
      const sun=state.light, reward=state.phase!=='flight';
      const angle=reward?.207:.076+state.air.wind*.0008;
      sun.rate+=((angle-sun.elevation)*.52-sun.rate*1.35)*dt;
      sun.elevation+=sun.rate*dt;
      sun.gold+=((reward?1:.05)-sun.gold)*dt*(reward?.49:.15);
      const guide=state.guide;
      guide.amount+=((state.idle>4 && !reward?1:0)-guide.amount)*dt*3.8;
      guide.stroke=guide.amount>.01 ? (guide.stroke+dt*.41)%1 : 0;
      for(const f of state.family.arms){
        if(Math.abs(f.angle)>f.limit)f.drive=-Math.sign(f.angle)*Math.abs(f.drive);
        f.rate+=(f.drive-f.angle*.75-f.rate*.55)*dt*3.5;f.angle+=f.rate*dt;
      }
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return;
      accumulator+=dt;
      const fixed=1/60;
      while(accumulator>=fixed-1e-12){tick(fixed);accumulator-=fixed;}
    }
    return {step,touch,release,getState:()=>state};
  };
  const api={create,terrain,lakeAxis,lakeWidth,random,hash,noise,mix,clamp,waveCols,waveRows};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.Flight=api;
})(globalThis);
