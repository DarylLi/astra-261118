// Distances are scene units, times are seconds, angular velocities are radians/s.
(function (root) {
  'use strict';
  const TAU = 2 * Math.PI;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const ease = x => x * x * (3 - 2 * x);
  const mix = (a, b, t) => a + (b - a) * t;
  const approach = (a, b, rate, dt) => mix(a, b, -Math.expm1(-rate * dt));
  const rest = { x: .37, z: -.22 };
  const soupY = 1.19;
  const rim = 1.46;
  const radiusLimit = 1.02;
  const home = [
    ['tofu', -.83, .34], ['tofu', .76, .54], ['tofu', -.45, -.80], ['tofu', .82, -.73],
    ['wakame', -.89, -.40], ['wakame', .25, .79], ['wakame', .39, -.95], ['wakame', .94, -.10],
    ['negi', -.28, .65], ['negi', -.55, .82], ['negi', .10, -.57], ['negi', .68, .18],
    ['negi', -.97, .08], ['negi', .01, 1.18], ['negi', -.16, -.85], ['negi', 1.09, .28]
  ];
  const cast = [
    { id: 'girl', garment: 'marigold', x: 1.62, z: -1.96 },
    { id: 'mama', garment: 'sage', x: -2.48, z: -3.36 },
    { id: 'papa', garment: 'indigo', x: 3.48, z: -3.48 }
  ];
  function limit(x, z) {
    const k = Math.min(1, radiusLimit / (Math.hypot(x, z) || 1));
    return { x: x * k, z: z * k };
  }
  function surface(x, z, s) {
    const r = Math.hypot(x, z);
    const spin = Math.abs(s.whirl);
    return soupY + .011 * Math.sin(4*x + 3*z + s.heatPhase) +
      .006 * Math.sin(6*z - 1.7*s.heatPhase) - .055*spin*Math.exp(-2.9*r*r) +
      (.003 + .007*spin)*Math.sin(11*r - 2*s.heatPhase + 2*x) +
      .024*s.wallWave*r*r*Math.cos(4*r - s.flowAngle);
  }
  function separate(a,b,space,dt,share) {
    const x=a.x-b.x,z=a.z-b.z,d=Math.hypot(x,z);
    if(d>=space)return;
    const push=Math.min(space-d,dt*2.9), nx=d>1e-7?x/d:1,nz=d>1e-7?z/d:0;
    a.x+=nx*push*(1-share);a.z+=nz*push*(1-share);
    if(share){b.x-=nx*push*share;b.z-=nz*push*share;}
  }
  function createSim() {
    let input = { ...rest }, held = false, traveled = 0, tapTime = 0, tapBase = rest;
    let vx = 0, vz = 0, energy = 0, waveV = 0, phaseTime = 0, age = 12;
    const previous=home.map(([,x,z])=>({x,z}));
    const spinRates = home.map(()=>0);
    const foodRadius = home.map(([kind])=>kind==='tofu'?.225:kind==='wakame'?.258:.098);
    let stirredThisRound = false;
    const s = {
      time: 0, round: 0, phase: 'mix', progress: 0, down: false, contact: 0,
      ladle: { ...rest, vx: 0, vz: 0, speed: 0, tilt: 0 }, whirl: 0, flowAngle: 0, wallWave: 0,
      heatPhase: .4, heat: .48, simmer: 0, steam: .11, steamPhase: .3, joy: 0, guide: .65,
      broth: { color: [0,0,0], contrast: 1 }, lump: {x: -.26, z: .025, radius: .34},
      plumes: Array.from({length: 6}, (_,i) => ({x: -.26, z: .025, age: 4+i, strength: 0, angle: 0})),
      foods: home.map(([kind,x,z],i) => ({kind,x,z,y:soupY,vx:0,vz:0,angle:i*1.83,rock:0})),
      bubbles: Array.from({length: 17}, (_,i) => ({phase:(.12+i*.618034)%1,x:0,z:0,size:0})),
      people: cast.map(p => ({...p}))
    };
    let plumeClock = 0, plumeIndex = 0;
    function press() {
      held = true; s.down = true; traveled = 0; tapTime = 0; age = 0;
      input = {x:s.ladle.x,z:s.ladle.z};
      s.contact = 1; s.ladle.tilt = .115;
    }
    function move(x,z) {
      if (!held || !Number.isFinite(x+z)) return;
      stirredThisRound = true;
      const next = limit(x,z);
      traveled += Math.hypot(next.x-input.x,next.z-input.z);
      input = next;
    }
    function release(cancelled = false) {
      if (!held) return;
      held = false; s.down = false; age = 0;
      if (traveled < .045 && !cancelled) {
        tapTime = .55; stirredThisRound = true;
        tapBase = {x:s.ladle.x,z:s.ladle.z};
      }
    }
    function visuals() {
      const p = s.progress;
      s.lump.radius = .34 * (1-ease(p));
      s.lump.y=surface(s.lump.x,s.lump.z,s)-.021-(s.phase==='renew'?.17*Math.sin(Math.PI*p):0);
      s.broth.contrast = 1-ease(p);
      s.broth.color = [.50+.21*p,.268+.158*p,.080+.125*p];
      s.simmer = .5+.5*Math.sin(s.heatPhase);
      for (let i=0;i<s.bubbles.length;i++) {
        const b=s.bubbles[i], a=i*2.39996+.13*Math.sin(i+s.heatPhase*.34);
        const r=.89+.42*((i*.372)%1);
        b.x=r*Math.cos(a); b.z=r*Math.sin(a);
        b.size=(.031+.031*(i%4)/3)*Math.sin(Math.PI*b.phase)**2*(.62+.57*s.heat);
      }
      for (let i=0;i<s.foods.length;i++) {
        const f=s.foods[i];
        f.y=surface(f.x,f.z,s)+.019*Math.sin(s.heatPhase*(.8+.02*i)+i);
        f.rock=.075*Math.sin(i+s.heatPhase+1.5*s.flowAngle)+.035*s.whirl;
      }
    }
    function advance(dt) {
      s.time+=dt; phaseTime+=dt; age+=dt;
      s.heat=.53+.12*Math.sin(.38*s.time)+.09*Math.sin(.81*s.time+1.2);
      s.heatPhase+=dt*(1.45+s.heat);
      s.steamPhase+=dt*(.84+.25*s.heat+.34*s.joy);
      s.guide=approach(s.guide, !held && age>1.5 && s.phase==='mix' ? .72+.28*Math.sin(s.time*2.8) : 0,4,dt);
      let target=input;
      if (!held && tapTime>0) {
        const a=(1-tapTime/.55)*TAU;
        target=limit(tapBase.x+.28*(Math.cos(a)-1),tapBase.z+.28*Math.sin(a));
        tapTime=Math.max(0,tapTime-dt);
      } else if (!held) {
        target={x:rest.x+.063*s.guide*Math.sin(s.time*2.1),z:rest.z+.038*s.guide*Math.sin(s.time*2.1+.8)};
      }
      const l=s.ladle, drive=held || tapTime>0;
      const w=drive ? 21 : 4.8;
      vx+=dt*(w*w*(target.x-l.x)-2*w*vx);
      vz+=dt*(w*w*(target.z-l.z)-2*w*vz);
      l.x+=dt*vx; l.z+=dt*vz; l.vx=vx; l.vz=vz; l.speed=Math.hypot(vx,vz);
      s.contact=approach(s.contact,held?.47:0,9,dt);
      l.tilt=.115*s.contact+.044*s.guide*Math.sin(2.1*s.time);
      const torque=l.x*vz-l.z*vx;
      const direction=Math.abs(torque)>.055 ? Math.sign(torque) : (Math.sign(s.whirl)||1);
      const force=drive ? clamp(1.35*torque+.26*l.speed*direction,-4,4) : 0;
      s.whirl=approach(s.whirl, force, drive ? 2.5 : .72,dt);
      s.flowAngle+=s.whirl*dt;
      waveV+=dt*(25*(.14*s.whirl-s.wallWave)-3.8*waveV);
      s.wallWave+=dt*waveV;
      for (let i=0;i<s.foods.length;i++) {
        const f=s.foods[i], rate=f.kind==='tofu'?2.5:3.8;
        previous[i].x=f.x;previous[i].z=f.z;
        spinRates[i]=approach(spinRates[i],s.whirl*(.82+.025*(i%5)),rate,dt);
        let angle=Math.atan2(f.z,f.x)+spinRates[i]*dt;
        if (s.phase==='renew' && !drive) {
          const diff=Math.atan2(home[i][2],home[i][1])-angle;
          angle+=Math.atan2(Math.sin(diff),Math.cos(diff))*(-Math.expm1(-.95*dt));
        }
        const rr=Math.hypot(home[i][1],home[i][2])+.030*Math.sin(.74*s.heatPhase+i);
        const radius=approach(Math.hypot(f.x,f.z),rr,.80,dt);
        const x=radius*Math.cos(angle), z=radius*Math.sin(angle);
        f.x=x;f.z=z;
        f.angle+=dt*(.49*spinRates[i]+.05*Math.sin(s.heatPhase+i));
      }
      // Floating pieces slide around the submerged bowl, paste and each other.
      for(let pass=0;pass<3;pass++){
        for(let i=0;i<s.foods.length;i++){
          const f=s.foods[i],r=foodRadius[i];
          separate(f,l,r+.268,dt,0);
          separate(f,s.lump,r+s.lump.radius*.91,dt,0);
          for(let j=0;j<i;j++)separate(f,s.foods[j],r+foodRadius[j],dt,.5);
          const distance=Math.hypot(f.x,f.z),wall=rim-r-.013;
          if(distance>wall){
            f.x*=wall/distance;f.z*=wall/distance;
            // At the rim, use the circle intersection to slide food past the ladle.
            const space=r+.268, lr=Math.hypot(l.x,l.z);
            if(lr>0 && Math.hypot(f.x-l.x,f.z-l.z)<space){
              const side=Math.sign(l.x*f.z-l.z*f.x)||1;
              const arc=Math.acos(clamp((wall*wall+lr*lr-space*space)/(2*wall*lr),-1,1));
              const a=Math.atan2(l.z,l.x)+side*arc;
              f.x=wall*Math.cos(a);f.z=wall*Math.sin(a);
            }
          }
        }
      }
      s.foods.forEach((f,i)=>{f.vx=(f.x-previous[i].x)/dt;f.vz=(f.z-previous[i].z)/dt;});
      // Heat-only convection carries no stirring work into a fresh serving.
      const foodSpeed=s.foods.reduce((sum,f)=>sum+Math.hypot(f.vx,f.vz),0)/s.foods.length;
      const spin=Math.abs(s.whirl);
      energy=approach(energy, .57*spin+.43*foodSpeed*Math.min(1,spin),3.1,dt);
      if (s.phase==='mix') {
        if(stirredThisRound)s.progress=clamp(s.progress+dt*energy*.060,0,1);
        if (s.progress>=1) { s.phase='savor'; phaseTime=0; }
      } else if (s.phase==='savor') {
        if (phaseTime>=3.5) { s.phase='renew'; phaseTime=0; }
      } else {
        s.progress=1-ease(clamp(phaseTime/3.8,0,1));
        if (phaseTime>=3.8) { s.round++; s.phase='mix'; phaseTime=0; stirredThisRound=held; energy=0; }
      }
      s.joy=approach(s.joy,s.phase==='savor'?1:0,s.phase==='savor'?1.9:1.35,dt);
      s.steam=approach(s.steam,.09+.08*s.heat+.17*s.progress+.49*s.joy+.025*Math.abs(s.whirl),1.2,dt);
      s.lump.x=-.26+.14*Math.sin(s.flowAngle*.56);
      s.lump.z=.025+.13*Math.sin(s.flowAngle*.72);
      plumeClock+=dt;
      if (s.phase==='mix' && energy>.08 && plumeClock>.47) {
        const p=s.plumes[plumeIndex];
        Object.assign(p,{x:s.lump.x,z:s.lump.z,age:0,angle:s.flowAngle,strength:0});
        plumeIndex=(plumeIndex+1)%s.plumes.length; plumeClock=0;
      }
      for (const p of s.plumes) {
        const a=dt*s.whirl*.76, x=p.x;
        const spread=p.age<2.8 ? 1+dt*(.10+.12*Math.abs(s.whirl)) : 1;
        p.x=(x*Math.cos(a)-p.z*Math.sin(a))*spread;
        p.z=(x*Math.sin(a)+p.z*Math.cos(a))*spread;
        p.age+=dt; p.angle+=a;
        p.strength=Math.sin(Math.PI*clamp(p.age/2.8,0,1))**2*(1-s.progress);
      }
      s.bubbles.forEach((b,i)=>{b.phase=(b.phase+dt*(.43+.052*(i%7)+.21*s.heat))%1;});
      visuals();
    }
    function step(dt) {
      if (!Number.isFinite(dt) || dt<=0) return;
      const t=Math.min(.08,dt), n=Math.ceil(t*120);
      for (let i=0;i<n;i++) advance(t/n);
    }
    visuals();
    return {press,move,release,step,getState:()=>JSON.parse(JSON.stringify(s))};
  }
  const api={createSim,surface,soupY,rim,radiusLimit};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  else root.MisoSim=api;
})(globalThis);
