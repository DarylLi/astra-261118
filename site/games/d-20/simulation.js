/* Coordinates are in metres. s follows the road into the valley, opposite world z. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SnowRoad = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const NX = 25, NS = 157, DX = .20, DS = .28, S0 = -10.08, END = 18;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const mix = (a, b, u) => a + (b - a) * u;
  const smooth = x => { x = clamp(x, 0, 1); return x*x*(3-2*x); };
  const roadX = s => -4.7 * smooth((s-7)/26) + .32*Math.sin(s*.17);
  function rng(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed/4294967296; };
  }
  function create(options = {}) {
    const seed=options.seed ?? 1735;
    const random=rng(seed),windRandom=rng(seed+11),flakeRandom=rng(seed+23),snowRandom=rng(seed+47);
    const baseDepth = options.depth ?? .2;
    const cells = [];
    for (let r=0; r<NS; r++) for (let j=0; j<NX; j++) {
      const s=S0+r*DS, x=(j-(NX-1)/2)*DX;
      const drift=1+.09*Math.sin(s*.83+x*1.3)+.045*Math.cos(s*2.6-x*1.5)+.032*(random()-.5);
      // Two shallow wheel grooves and the short apron already cleared behind the blade.
      const apron=smooth((2.01+x*.20-s)/.64)*smooth((1.4-Math.abs(x))/.30);
      const contact= Math.exp(-Math.pow((Math.abs(x)-.70)/.145,2))*smooth((.7-s)/.5);
      const turnout=smooth((s-18.65)/.58)*smooth((1.38-Math.abs(x-.73*smooth((s-20)/8)))/.28);
      const profile=drift*(1-.987*apron)*(1-.69*contact)*(1-.986*turnout);
      cells.push({s,x,profile,h:baseDepth*profile,water:.12*apron+.006*random(),
        grain:random(),density:mix(205,285,random()),heat:mix(-.65,.1,random())});
    }
    const car={s:0,x:0,v:0,vx:0,yaw:-Math.atan(.32*.17),yawV:0,load:0,pitch:0,pitchV:0,roll:0,rollV:0,
      blade:0,bladeV:0,beacon:0,wheels:[0,0,0,0],mounts:[0,0,0,0],mountV:[0,0,0,0]};
    const weather={wind:.20,gust:.45,next:1.3}, view={follow:0};
    const flakes=Array.from({length:205},(_,i)=>({id:i,x:mix(-15,15,random()),y:mix(.1,12,random()),s:mix(-7,35,random()),vx:0,vs:0,fall:mix(.12,.46,random()),drag:mix(.6,2,random())}));
    const flex=Array.from({length:10},()=>({a:0,v:0,k:mix(8,23,random()),exposure:mix(.24,1,random())}));
    const lamps=Array.from({length:12},(_,i)=>({heat:0,delay:i*.11+random()*.2,tau:mix(.27,.69,random())}));
    const bus={s:29.5,x:.73,v:0,wheel:0,turn:Math.PI,returning:false,path:0};
    let returnStart=0,returnYaw=Math.PI;
    const hand={alpha:0,s:.1,v:0,ext:0,mode:'reach',rest:0};
    const piles=Array.from({length:NS*2},(_,i)=>({s:S0+Math.floor(i/2)*DS,side:i%2?1:-1,volume:0,height:0,velocity:0}));
    const clods=[];
    let time=0, cycle=0, phase='plow', age=0, idle=0, target=null, depth=baseDepth, dustId=0, spawnMass=0, carry=0, pointerDown=false, refilled=0;
    const row = s => clamp(Math.round((s-S0)/DS),0,NS-1);
    const at = (s,x) => cells[row(s)*NX+clamp(Math.round(x/DX+(NX-1)/2),0,NX-1)];
    function enter(name){phase=name; age=0; target=null; pointerDown=false;}
    function aim(s,x=0){
      if(phase!=='plow')return false;
      target={s:clamp(s,0,END),x:clamp(x,-.36,.36)};
      idle=0;pointerDown=true;return true;
    }
    function release(tap=false){pointerDown=false;if(!tap)target=null;idle=0;}
    function spring(q,v,goal,k,damp,dt) {return v + ((goal-q)*k-v*damp)*dt;}
    function updateWeather(dt){
      weather.next-=dt;
      if(weather.next<=0){weather.gust=mix(-.18,1.02,windRandom());weather.next=mix(.8,3.8,windRandom());}
      weather.wind+=(weather.gust-weather.wind)*(1-Math.exp(-dt*.7));
      for(const b of flex){
        b.v=spring(b.a,b.v,weather.wind*.065*b.exposure,b.k,2.5,dt);
        b.a+=b.v*dt;
      }
      for(const f of flakes){
        const eddy=.19*Math.sin(f.s*.43+f.y*.72);
        f.vx+=(weather.wind+eddy-f.vx)*dt*f.drag;
        f.vs+=(eddy*.42-f.vs)*dt*f.drag;
        f.x+=f.vx*dt; f.s+=f.vs*dt; f.y-=f.fall*dt;
        if(f.y<.04 || f.x>16){f.id+=flakes.length;f.y=mix(9,13,flakeRandom());f.x=mix(-16,12,flakeRandom());f.s=mix(-7,35,flakeRandom());}
      }
    }
    function updateCar(dt) {
      const ahead=car.s+1.61;
      let mass=0;
      for(let j=-5;j<=5;j++){const c=at(ahead,car.x+j*DX);mass+=c.density*c.h/11;}
      car.load += (mass-car.load)*(1-Math.exp(-dt*7));
      let dest=target,limit=3/(1+car.load/190);
      if(phase==='shine')dest={s:END+1.9,x:3.1};
      if(phase==='refill'){dest={s:0,x:0};limit=3;}
      const gap=dest?dest.s-car.s:0;
      const speed=dest ? Math.sign(gap)*Math.min(limit,Math.sqrt(3.5*Math.abs(gap)),Math.abs(gap)*3) : 0;
      const old=car.s;
      car.v+=clamp((speed-car.v)*3.8,-2.6,1.65)*dt;
      if(Math.abs(car.v)<.0006 && Math.abs(speed)<.0006)car.v=0;
      const dx=dest?dest.x-car.x:0;
      car.vx=clamp(spring(0,car.vx,dx,10,6.5,dt),-1.35,1.35);
      const laneV=(roadX(old+car.v*dt)-roadX(old))/dt;
      const factor=Math.min(1,3/Math.max(.0001,Math.hypot(car.v,laneV+car.vx)));
      car.v*=factor;car.vx*=factor;car.s+=car.v*dt;car.x+=car.vx*dt;
      const travelX=roadX(car.s)-roadX(old)+car.vx*dt;
      const travel=Math.sign(car.v)*Math.hypot(car.s-old,travelX);
      const heading=Math.abs(car.v)>.07?-Math.atan(clamp(travelX/((car.s-old)||.00001),-2,2)):car.yaw;
      car.yawV=spring(car.yaw,car.yawV,heading,28,8.5,dt);car.yaw+=car.yawV*dt;
      for(let i=0;i<4;i++){
        const c=at(car.s+(i<2?.78:-.78),car.x+(i%2?.72:-.72));
        const q=c.h*.35+c.grain*.008*Math.min(1,Math.abs(car.v));
        car.mountV[i]=clamp(spring(car.mounts[i],car.mountV[i],q,85,10,dt),-.36,.36);
        car.mounts[i]+=car.mountV[i]*dt;
        car.wheels[i]+=(travel+car.yawV*dt*(i%2?.72:-.72))/(.418+car.mounts[i]*.11);
      }
      const m=car.mounts;
      car.pitchV=spring(car.pitch,car.pitchV,(m[0]+m[1]-m[2]-m[3])*.34-(speed-car.v)*.012,32,6,dt);
      car.rollV=spring(car.roll,car.rollV,(m[0]+m[2]-m[1]-m[3])*.45-car.vx*.016,39,6.4,dt);
      car.pitch+=car.pitchV*dt;car.roll+=car.rollV*dt;
      car.bladeV=spring(car.blade,car.bladeV,car.load*.00040*Math.min(1,Math.abs(car.v)) + (phase==='bus'||phase==='arrival'||phase==='refill'?.15:0),45,7,dt);
      car.blade+=car.bladeV*dt;
      car.beacon+=(.48+Math.abs(car.v)*1.6)*dt;
      if(target&&!pointerDown&&Math.abs(gap)<.025)target=null;
    }
    function pushSnow(dt){
      if(car.v<=.001 || (phase!=='plow'&&phase!=='shine'))return;
      const face=car.s+1.64, start=row(face-1.17), stop=row(face+.60);
      let removed=0;
      for(let r=start;r<=stop;r++) for(let j=0;j<NX;j++){
        const c=cells[r*NX+j],lateral=c.x-car.x;
        const overlap=smooth((1.53-Math.abs(lateral))/.16);
        const sweep=face+lateral*.20-c.s;
        if(!overlap||sweep<-.23||sweep>.85)continue;
        const cut=Math.min(c.h,dt*car.v*overlap*smooth((sweep+.23)/.30)*.65);
        c.h-=cut; const vol=cut*DX*DS;
        removed+=vol;
        const p=piles[r*2+(lateral>-.65?1:0)];
        p.volume+=vol*.82;
        spawnMass+=vol*.18;
      }
      // Cohesive slabs detach after enough snow has collected against the mouldboard.
      while(spawnMass>.005 && removed>0){
        const v=Math.min(spawnMass,.014);spawnMass-=v;
        const side=snowRandom()<.78?1:-1;
        clods.push({id:dustId++,side,s:face+mix(-.20,.23,snowRandom()),x:car.x+side*mix(.67,1.3,snowRandom()),
          y:mix(.14,.32,snowRandom()),vx:side*mix(1.4,2.9,snowRandom()),vy:mix(.7,1.65,snowRandom()),
          vs:car.v*.33,r:Math.cbrt(v)*.70,volume:v,spin:mix(-4,4,snowRandom()),angle:0});
      }
    }
    function settle(dt){
      for(let i=clods.length-1;i>=0;i--){
        const c=clods[i];c.vy-=5.9*dt;c.y+=c.vy*dt;c.x+=c.vx*dt;c.s+=c.vs*dt;c.angle+=c.spin*dt;
        const p=piles[row(c.s)*2+(c.side>0?1:0)];
        if(c.vy<0 && c.y<.08+p.height*.65){p.volume+=c.volume;clods.splice(i,1);}
      }
      for(const p of piles){
        const goal=Math.sqrt(p.volume/DS*.67);
        p.velocity=spring(p.height,p.velocity,goal,42,11,dt);
        p.height=Math.max(0,p.height+p.velocity*dt);
      }
    }
    function updateSurface(dt){
      let ready=true;
      for(const c of cells){
        const sun=(.83+c.grain*.32)*(1-.09*Math.abs(weather.wind));
        const exposed=1-smooth(c.h/.055);
        const eq=-.4+exposed*sun*1.6;
        c.heat+=(eq-c.heat)*dt*(.18+.13*c.grain);
        c.water=clamp(c.water+dt*(Math.max(0,c.heat)*exposed*.033-c.water*(.018+.02*c.grain)),0,.48);
        if(phase==='refill'){
          const front=END+5-age*4.2;
          const local=smooth((c.s-front+3)/2.5)+smooth((age-6.4)/1.8);
          const goal=depth*c.profile;
          c.h+=clamp(goal-c.h,-dt*.16,dt*(.11+c.grain*.10)*local);
          if(Math.abs(goal-c.h)>.0001)ready=false;
        }
      }
      if(phase==='refill'){refilled=ready?1:0;for(const p of piles)p.volume=Math.max(0,p.volume-dt*.019*(.7+.3*Math.cos(p.s)));}
    }
    function updateHand(dt){
      const active=phase==='plow' && !target && idle>=4;
      hand.alpha=clamp(hand.alpha+dt*(active?2.4:-5),0,1);
      if(!active){
        hand.v=spring(hand.s,hand.v,car.s+.1,18,8,dt);hand.s+=hand.v*dt;
        hand.ext*=Math.exp(-5*dt);hand.mode='reach';hand.rest=0;return;
      }
      const goal=hand.mode==='reach'?Math.min(END+.8,car.s+3.65):car.s+.1;
      hand.v=spring(hand.s,hand.v,goal,12,6.8,dt);hand.s+=hand.v*dt;
      hand.ext+=(Math.min(1,Math.abs(hand.v)) -hand.ext)*dt*5;
      if(Math.abs(goal-hand.s)<.09){hand.rest+=dt;if(hand.rest>.7){hand.mode=hand.mode==='reach'?'return':'reach';hand.rest=0;}}
    }
    function updateTrip(dt){
      if(phase==='plow' && car.s>=END-.19){
        let open=true;
        for(let r=row(1.6);r<=row(END+1.25);r++)for(let j=9;j<=15;j++)if(cells[r*NX+j].h>.045)open=false;
        if(open)enter('shine');
      }
      if(phase==='shine'&&age>3.2)enter('bus');
      const driving=phase==='bus',back=phase==='refill';
      // The return lane joins the road with two tangent semicircles. Distance, driven
      // by wheel speed, determines position and heading even across the joins.
      if(bus.returning){
        const r1=4.8,r2=(2*r1-.73)/2,straight=29.5-returnStart;
        const first=Math.PI*r1,second=first+straight,total=second+Math.PI*r2;
        const speed=Math.min(5.1,Math.sqrt(3.6*Math.max(0,total-bus.path)));
        bus.v+=clamp(speed-bus.v,-1.8*dt,1.55*dt);
        const ds=Math.min(total-bus.path,Math.abs(bus.v)*dt);bus.path+=ds;bus.wheel+=ds/.39;
        if(bus.path<first){
          const a=bus.path/r1;bus.x=r1*(1-Math.cos(a));bus.s=returnStart-r1*Math.sin(a);bus.turn=returnYaw+a;
        }else if(bus.path<second){
          bus.x=2*r1;bus.s=returnStart+(bus.path-first);bus.turn=returnYaw+Math.PI;
        }else{
          const a=(bus.path-second)/r2;bus.x=2*r1-r2*(1-Math.cos(a));bus.s=29.5+r2*Math.sin(a);bus.turn=returnYaw+Math.PI+a;
        }
        if(total-bus.path<.000001){bus.returning=false;bus.v=0;}
      }else{
        const speed=driving?-Math.min(3,Math.sqrt(3.6*Math.max(0,bus.s+12.3))):0;
        bus.v+=clamp(speed-bus.v,-1.28*dt,1.8*dt);
        const ds=Math.max(-12.3-bus.s,bus.v*dt);
        bus.s+=ds;bus.wheel+=Math.abs(ds)/.39;
        bus.x=.73*smooth((bus.s-20)/8);
      }
      for(const w of lamps){
        const lit=(phase==='bus' && bus.s<17-w.delay*2)||(phase==='arrival')||(phase==='refill'&&age<w.delay+.4);
        w.heat+=((lit?1:0)-w.heat)*(1-Math.exp(-dt/(lit?w.tau:w.tau*2.7)));
      }
      if(phase==='bus'&&bus.s<=-12.3+.001&&Math.abs(bus.v)<.04)enter('arrival');
      if(phase==='arrival'&&age>1.3){cycle++;depth=.52-(.52-baseDepth)*Math.pow(.80,cycle);bus.returning=true;bus.path=0;returnStart=bus.s;returnYaw=bus.turn;enter('refill');}
      if(back&&refilled&&Math.abs(car.s)<.006&&Math.abs(car.v)<.009){
        enter('plow');idle=0;
      }
    }

    function tick(dt){
      time+=dt;age+=dt;idle=target||pointerDown?0:idle+dt;
      updateWeather(dt);updateCar(dt);pushSnow(dt);settle(dt);updateSurface(dt);updateTrip(dt);updateHand(dt);
      const chase=phase==='plow'?car.s*.57:phase==='shine'?10.20:phase==='bus'?clamp((bus.s-5)*.7,0,10.2):0;
      view.follow+=(chase-view.follow)*(1-Math.exp(-dt*1.55));
    }
    function step(dt){
      if(!Number.isFinite(dt)||dt<0)throw new RangeError('dt must be a nonnegative duration');
      carry+=dt;
      while(carry>=1/60-1e-10){tick(1/60);carry-=1/60;}
    }
    function getState(){
      return {time,cycle,phase,age,idle,depth,bladeCarry:spawnMass,view:{...view},car:{...car,wheels:[...car.wheels],mounts:[...car.mounts],mountV:[...car.mountV]},
        target:target&&{...target},bus:{...bus},hand:{...hand},weather:{...weather},
        snow:cells.map(c=>c.h),water:cells.map(c=>c.water),heat:cells.map(c=>c.heat),
        piles:piles.map(p=>p.height),volume:piles.map(p=>p.volume),clods:clods.map(c=>({...c})),
        flex:flex.map(b=>b.a),lamps:lamps.map(w=>w.heat),flakes:flakes.map(f=>({...f}))};
    }
    return {step,getState,aim,release,at,car,weather,view,bus,hand,clods,cells,piles,flakes,flex,lamps,
      touchScenery(i){flex[Math.abs(i)%flex.length].v+=.052;},
      get phase(){return phase;},get age(){return age;},get depth(){return depth;},get cycle(){return cycle;}};
  }
  return {create,roadX,rng,NX,NS,DX,DS,S0,END,smooth,clamp};
});
