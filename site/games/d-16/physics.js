/* SI units. The launch site and the small curved world share one local vertical. */
(function (root) {
  'use strict';
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const smooth = (a, b, x) => { const u = clamp((x-a)/(b-a),0,1); return u*u*(3-2*u); };
  function createSimulation(seed = 43922) {
    let rng = seed >>> 0;
    const random = () => ((rng = (Math.imul(1664525,rng)+1013904223)>>>0)/4294967296);
    const G = 9.81, wet = 1100, fixed = 1/120;
    const radius=1260, mu=G*radius*radius, orbitHeight=845;
    let remainder = 0;
    const state = {
      elapsed:0, cycle:0, phase:'pad', held:false, ignition:false, hold:0,
      idle:0, hint:0, hintVelocity:0, hintRest:0, lever:0, leverVelocity:0,
      chamber:0, valve:1, thrust:0, fuel:720, upperFuel:190, mass:wet,
      altitude:0, velocity:0, acceleration:0, separation:0, detached:false,
      lowerOffset:0, lowerVelocity:0, lowerRoll:0, cloudPassed:false,
      tangential:0, orbitAngle:0, radialForce:0, sideForce:0, pitch:0, busRoll:0, busRollRate:0,
      orbitTime:0, payloadGap:0, payloadSpeed:0, released:false,
      fairing:[0,0], fairingSpeed:[0,0], wings:[0,0,0,0], wingSpeed:[0,0,0,0],
      lookDown:0, lookRate:0, shutter:0, shutterSpeed:0, opening:false,
      wind:1.4, gust:1.7, windClock:1.2, drift:0, seaTravel:0, lamp:0.81,
      lampHeat:0.72, lampLoad:0.8, lampClock:0.8,
      waves:[], vapor:[], mounts:[], sock:[], salt:[], heat:[0,0,0,0,0,0], jets:[],
    };
    const s=state;
    for(let i=0;i<32;i++) s.waves.push({h:(random()-.5)*.025,v:(random()-.5)*.08,force:(random()-.5)*.16,rest:random()*1.4});
    for(let i=0;i<4;i++) s.mounts.push({angle:0,speed:0,free:false});
    for(let i=0;i<6;i++) s.jets.push({length:0,speed:0,eddy:random(),rest:random()*.1});
    // A parcel is recycled only after its density reaches zero. Its new nozzle
    // position is a birth event, not a teleport of visible condensation.
    function parcel(p,i,warm) {
      const age=warm?random()*5.8:0, side=i%3===0?-1:1;
      p.generation=(p.generation||0)+1; p.age=age; p.life=3.8+random()*3.7;
      p.x=side*(1.2+random()*1.9)+age*.74; p.y=.42+random()*.7+age*.12;
      p.z=(random()-.38)*4; p.vx=side*(.45+random()*.8);
      p.vy=.15+random()*.20; p.vz=(random()-.5)*.33;
      p.water=.7+random()*.27; p.radius=.28+random()*.4+.20*age;
      p.density=warm ? .5*p.water*smooth(0,.58,age)*(1-smooth(p.life*.4,p.life,age)):0;
      p.rotation=random()*6.28; return p;
    }
    for(let i=0;i<80;i++) s.vapor.push(parcel({},i,true));
    for(let i=0;i<6;i++)s.sock.push({angle:-.24-i*.029,speed:0,flow:1.4});
    // 海塩の粒は甲板から風で浮き、上昇気流を抜けると沈む。
    // 接地後は静止し、付着した水滴が乾いてから次の粒を生む。
    function saltGrain(g,warm){
      g.generation=(g.generation||0)+1;g.x=-7+random()*10;g.z=-2+random()*12;
      g.y=warm?.12+random()*1.7:.07;g.vx=.15+random()*.32;g.vy=.52+random()*.65;
      g.radius=.012+random()*.017;g.age=warm?random():0;g.rest=0;g.alpha=0;return g;
    }
    for(let i=0;i<28;i++)s.salt.push(saltGrain({},true));
    function press() {
      if(s.phase!=='pad' || s.ignition || s.opening) return false;
      s.held=true; s.ignition=true; s.phase='burn'; s.idle=0;return true;
    }
    function release(){ s.held=false; }
    function ambient(dt){
      s.windClock-=dt;
      if(s.windClock<=0){s.gust=.4+random()*2.6;s.windClock=.65+random()*2.35;}
      s.wind+=(s.gust-s.wind)*(1-Math.exp(-dt*.82));
      s.drift+=s.wind*dt; s.seaTravel+=(.34+.18*s.wind)*dt;
      s.lampClock-=dt;
      if(s.lampClock<=0){s.lampLoad=.61+random()*.33;s.lampClock=.3+random()*1.5;}
      s.lampHeat+=(s.lampLoad-s.lampHeat)*dt*1.7;s.lamp=.45+.5*s.lampHeat;
      const waves=s.waves;
      for(let i=0;i<waves.length;i++){
        const w=waves[i]; w.rest-=dt;
        if(w.rest<=0){w.force=(random()-.5)*.41*s.wind;w.rest=.5+random()*1.6;}
        const curvature=waves[(i+31)%32].h+waves[(i+1)%32].h-2*w.h;
        w.v+=(curvature*4.4-w.h*1.6-w.v*.93+w.force)*dt;
      }
      for(const w of waves)w.h+=w.v*dt;
      // 布の輪ごとに風圧が伝わる。重力と釣り合う角度へ戻り、
      // 風が弱まった後も角速度が残る。口金だけを固定する。
      s.sock.forEach((c,i)=>{
        const upstream=i?s.sock[i-1].flow:s.wind;
        c.flow+=(upstream-c.flow)*(4.4-i*.35)*dt;
        const sag=-(.68+.10*i)/(1+c.flow*c.flow);
        c.speed+=((sag-c.angle)*(12-i*.73)-c.speed*(3.7-i*.17))*dt;
        c.angle+=c.speed*dt;
      });
      for(const g of s.salt){
        g.age+=dt;
        if(g.rest>0){
          g.rest+=dt;g.alpha=Math.max(0,g.alpha-dt*.44);
          if(g.rest>1.5&&g.alpha===0)saltGrain(g,false);
        }else{
          g.vx+=(s.wind*.63-g.vx)*dt*.79;
          g.vy+=(-.42+Math.exp(-g.age*1.9)*s.wind*.21-g.vy*.32)*dt;
          g.x+=g.vx*dt;g.y+=g.vy*dt;
          g.alpha=Math.min(.52,g.alpha+dt*.52);
          if(g.y<=.068){g.y=.068;g.vx=g.vy=0;g.rest=dt;}
        }
      }
      s.vapor.forEach((p,i)=>{
        if(p.age>=p.life){parcel(p,i,false);}
        p.age+=dt;
        const jet=s.thrust/(wet*G)*Math.exp(-s.altitude*.13);
        p.vx+=(s.wind*.65+jet*Math.sign(p.x)*4.5-p.vx)*dt*.86;
        p.vy+=(.12+p.water*.16+jet*.48-p.vy)*dt*.64;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        p.water=Math.max(0,p.water-(.040+.022*s.wind)*dt);
        p.radius+=(.16+.075*Math.abs(p.vx)+jet*.32)*dt;
        p.rotation+=p.vz*dt*.4;
        p.density=p.water*.5*smooth(0,.58,p.age)*(1-smooth(p.life*.4,p.life,p.age));
      });
    }
    function flight(dt){
      if(!s.ignition)return;
      if(s.held){s.hold=Math.min(2,s.hold+dt);if(s.hold>=2-1e-8)s.held=false;}
      s.valve+=((s.held?1:.5)-s.valve)*(1-Math.exp(-7*dt));
      if(!s.detached){
        s.chamber=Math.min(1,s.chamber+dt/1.9);
        const available=smooth(0,26,s.fuel);
        s.thrust=wet*G*1.4*s.chamber*s.valve*available;
        s.fuel=Math.max(0,s.fuel-167*s.chamber*s.valve*dt);
        s.mass=190+190+s.fuel;
        if(s.fuel<20 && s.altitude>4){s.detached=true;s.phase='upper';s.lowerVelocity=s.velocity-1.3;s.radialForce=s.thrust;s.separation=0;s.mass=94+s.upperFuel;}
      } else {
        s.separation+=dt;
        const r=radius+s.altitude, gravity=mu/(r*r);
        // Guidance gradually pitches the upper engine toward the local tangent.
        // Once cut off, the payload coasts under central gravity alone.
        const targetV=Math.sqrt(mu/r)*smooth(130,650,s.altitude);
        const radial=s.mass*(gravity-s.tangential*s.tangential/r+
          clamp((orbitHeight-s.altitude)*.047-s.velocity*.32,-30,32));
        const side=s.mass*((targetV-s.tangential)*.64+s.velocity*s.tangential/r);
        const limit=9100*smooth(0,3.5,s.upperFuel)*smooth(.02,.82,s.separation);
        const radialCommand=Math.max(0,radial),sideCommand=Math.max(0,side);
        const scale=s.released?0:Math.min(1,limit/Math.max(.01,Math.hypot(radialCommand,sideCommand)));
        const response=1-Math.exp(-dt*(s.released?6:5));
        s.radialForce+=(radialCommand*scale-s.radialForce)*response;
        s.sideForce+=(sideCommand*scale-s.sideForce)*response;
        s.thrust=Math.hypot(s.radialForce,s.sideForce);
        s.upperFuel=Math.max(0,s.upperFuel-s.thrust/780*dt);
        s.mass=94+s.upperFuel;
        if(!s.released)s.pitch+=(Math.atan2(Math.max(.0001,s.sideForce),s.radialForce)-s.pitch)*(1-Math.exp(-2.6*dt));
      }
      const r=radius+s.altitude,gravity=mu/(r*r);
      const drag=.035*Math.exp(-s.altitude/155)*s.velocity*Math.abs(s.velocity);
      const radialForce=s.detached?s.radialForce:s.thrust;
      s.acceleration=(radialForce-drag)/s.mass-gravity+s.tangential*s.tangential/r;
      if(s.altitude<=0 && s.acceleration<0)s.acceleration=0;
      s.tangential+=((s.detached?s.sideForce/s.mass:0)-s.velocity*s.tangential/r)*dt;
      s.orbitAngle+=s.tangential/r*dt;
      s.velocity+=s.acceleration*dt;s.altitude+=s.velocity*dt;
      if(s.altitude<0){s.altitude=0;s.velocity=Math.max(0,s.velocity);}
      if(s.altitude>65)s.cloudPassed=true;
      if(!s.released && s.detached && s.altitude>orbitHeight-13 && s.tangential>Math.sqrt(mu/r)*.96){
        s.released=true;s.phase='deploy';
      }
      if(s.released){
        s.orbitTime+=dt;
        s.payloadSpeed+=(2.2-s.payloadSpeed)*dt*.55;s.payloadGap+=s.payloadSpeed*dt;
        for(let i=0;i<2;i++){
          const target=(i===0||s.payloadGap>.09)?1.39:0;
          s.fairingSpeed[i]+=((target-s.fairing[i])*(3.4+i*.25)-s.fairingSpeed[i]*3.1)*dt;
          s.fairing[i]+=s.fairingSpeed[i]*dt;
        }
        for(let i=0;i<4;i++){
          const clear=i<2?s.fairing[i]>1.04:s.wings[i-2]>.87;
          const target=clear?Math.PI/2:0;
          s.wingSpeed[i]+=((target-s.wings[i])*(2.7-i*.19)-s.wingSpeed[i]*(2.56-i*.05))*dt;
          s.wings[i]+=s.wingSpeed[i]*dt;
        }
        if(s.wings[3]>1.53){s.phase='sunrise';}
        const target=s.phase==='sunrise'?1:0;
        s.lookRate+=((target-s.lookDown)*.98-s.lookRate*1.8)*dt;s.lookDown+=s.lookRate*dt;
        if(s.orbitTime>17)s.phase='return';
      }
      if(s.detached){
        s.lowerVelocity+=(-G-.012*s.lowerVelocity*Math.abs(s.lowerVelocity))*dt;
        s.lowerOffset+=(s.lowerVelocity-s.velocity)*dt;s.lowerRoll+=dt*.084;
      }
    }
    function mechanisms(dt){
      const attitude=s.released&&s.fairing[0]>.8?-.16:-s.pitch;
      s.busRollRate+=((attitude-s.busRoll)*2.7-s.busRollRate*2.65)*dt;
      s.busRoll+=s.busRollRate*dt;
      const desired=s.ignition&&!s.detached?(s.held?.99:.41):0;
      s.leverVelocity+=((desired-s.lever)*47-s.leverVelocity*10)*dt;s.lever+=s.leverVelocity*dt;
      s.mounts.forEach((m,i)=>{
        if(s.altitude>.015+.06*i)m.free=true;
        const target=m.free?.75+i*.047:0;
        m.speed+=((target-m.angle)*(9-i*.6)-m.speed*(3.25+i*.2))*dt;m.angle+=m.speed*dt;
      });
      s.heat.forEach((h,i)=>{
        const active=i===5?s.detached:!s.detached;
        const feed=active?s.thrust/(wet*G*1.4)*(i===0?.83:i===5?1:1-i*.041):0;
        s.heat[i]+=(feed-h)*(feed>h?2.1+i*.31:.92+i*.16)*dt;
        const j=s.jets[i];j.rest-=dt;if(j.rest<=0){j.eddy=.84+random()*.31;j.rest=.055+random()*.11;}
        j.speed+=((feed*j.eddy*(i===5||i===0?5.7:3.8)-j.length)*43-j.speed*8.7)*dt;j.length=Math.max(0,j.length+j.speed*dt);
      });
      if(s.phase==='pad'&&!s.opening){s.idle+=dt;s.hintRest=Math.max(0,s.hintRest-dt);}
      const show=s.idle>4&&s.phase==='pad'&&s.hintRest<=0;
      s.hintVelocity+=(((show?1:0)-s.hint)*14-6*s.hintVelocity)*dt;s.hint+=s.hintVelocity*dt;
      if(show&&s.hint>.985){s.hintRest=2.15;}
    }
    function tick(dt){
      s.elapsed+=dt;ambient(dt);flight(dt);mechanisms(dt);
      const close=s.phase==='return';
      s.shutterSpeed+=(((close?1.08:0)-s.shutter)*8-s.shutterSpeed*5)*dt;s.shutter=clamp(s.shutter+s.shutterSpeed*dt,0,1);
      if(close&&s.shutter>=.999){
        Object.assign(s,{cycle:s.cycle+1,phase:'pad',ignition:false,held:false,hold:0,idle:0,hint:0,hintVelocity:0,hintRest:0,chamber:0,valve:1,thrust:0,fuel:720,upperFuel:190,mass:wet,altitude:0,velocity:0,acceleration:0,separation:0,detached:false,lowerOffset:0,lowerVelocity:0,lowerRoll:0,cloudPassed:false,tangential:0,orbitAngle:0,radialForce:0,sideForce:0,pitch:0,busRoll:0,busRollRate:0,orbitTime:0,payloadGap:0,payloadSpeed:0,released:false,lookDown:0,lookRate:0,opening:true});
        s.wings.fill(0);s.wingSpeed.fill(0);s.fairing.fill(0);s.fairingSpeed.fill(0);
        for(const m of s.mounts){m.free=false;m.angle=0;m.speed=0;}
      }
      if(s.opening&&s.shutter<.04)s.opening=false;
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      remainder+=dt;while(remainder>=fixed-1e-10){tick(fixed);remainder-=fixed;}
    }
    return {state:s,step,press,release,getState:()=>JSON.parse(JSON.stringify(s))};
  }
  root.RocketFlight={createSimulation,smooth};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.RocketFlight;
})(typeof window==='undefined'?globalThis:window);
