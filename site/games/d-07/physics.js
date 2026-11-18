/* Distances are metres, angles radians, and time seconds in the tilted board frame. */
(function (root) {
  'use strict';
  const G = 9.80665, R = .008, PIN = .0047, K = 200, MASS = .00536, TILT = .29;
  const STEP = 1 / 480, CUP = [-.122, 0, .122], HUB = -.111, WHEEL = .052;
  const TAU = 2 * Math.PI, SLOT = TAU / 6;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const spring = (a, target, stiffness, drag, h) => {
    a.v += ((target - a.q) * stiffness - a.v * drag) * h;
    a.q += a.v * h;
  };
  const pins = [];
  for (let row = 0; row < 7; row++) {
    const count = row % 2 ? 8 : 7;
    for (let n = 0; n < count; n++) pins.push({x:(n-(count-1)/2)*.046, y:.368-row*.043});
  }
  const seatAt = (a) => ({x:WHEEL*Math.sin(a), y:HUB+WHEEL*Math.cos(a)-.007,z:.095});
  function create(seed = 1392) {
    let rng = seed >>> 0, remainder = 0;
    function random() { rng = (Math.imul(rng,1664525)+1013904223)>>>0; return rng/4294967296; }
    const osc = () => ({q:0,v:0});
    const ball = (id,x,y,z) => ({id,x,y,z,vx:0,vy:0,spin:0,wx:0,wy:0,rotation:[0,0,0,1],mode:'seat',hits:0,path:0,speed:0,cup:-1,basket:-1});
    const s = {time:0,phase:'ready',held:false,lever:osc(), springForce:0, releaseSpeed:0, idle:0,
      guide: {q:0,v:0,reach:0,stage:'rest',wait:0}, pins:pins.map(osc),
      cups:CUP.map(()=>({ball:null,wing:0,omega:0,bell:osc(),lip:osc()})),
      balls:[ball(0,0,.431,.014)],active:0,nextId:1,order:[],pause:0,
      wheel:{angle:0,v:0,goal:0,index:0,mode:'park',work:0}, baskets:Array.from({length:6},osc),
      lid:osc(),wind:.04,windTarget:.02,gustLeft:.7,
      cloth:Array.from({length:9},(_,i)=>({q:0,v:0,bias:(random()-.5)*.1,compliance:.75+random()*.5})),
      dust:Array.from({length:28},()=>({x:(random()-.5)*.88,y:.13+random()*.8,z:random()*.36,
        vx:(random()-.5)*.004,vy:0,vz:0,ax:0,ay:0,change:random()})), feedBias:0};
    const dustCenters=s.dust.map(p=>({x:p.x,y:p.y,z:p.z}));
    let events=[], rewardLeft=0, lastWheelV=0;
    const emit=(e)=>{if(events.length<128) events.push(e);};
    const active=()=>s.balls.find(b=>b.id===s.active);
    function press() {
      if(s.phase!=='ready'||s.held) return false;
      s.held=true; s.idle=0; s.guide.stage='rest'; return true;
    }
    function release() {
      if(!s.held) return false;
      s.held=false;
      const b=active(), compression=s.lever.q;
      // A preloaded detent releases even on a very quick tap. Only a small
      // fraction of the plunger energy reaches the rolling glass through the cam.
      const speed=Math.sqrt(.063**2+.012*K*compression**2/MASS);
      const direction=Math.sin(s.feedBias+.29)*.66;
      b.vx=speed*direction; b.vy=-speed*Math.sqrt(1-direction**2); b.mode='fall';
      s.releaseSpeed=speed; s.phase='rolling'; s.wheel.work+=.016+.5*K*compression**2;
      emit({kind:'pop',strength:speed}); return true;
    }
    function nudge(index,force) {
      if(index>=0 && index<s.pins.length) s.pins[index].v+=clamp(force,-.006,.006);
    }
    function environment(h) {
      s.gustLeft-=h;
      if(s.gustLeft<=0){s.windTarget=(random()-.43)*.25;s.gustLeft=1.1+random()*2.3;}
      s.wind+=(s.windTarget-s.wind)*h*.86;
      for(let i=0;i<s.cloth.length;i++){
        const c=s.cloth[i],next=s.cloth[i+1]||c,prev=s.cloth[i-1]||c;
        const load=(s.wind+c.bias)*c.compliance*.07+14*(next.q+prev.q-2*c.q);
        c.v+=(load-c.q*(3+i*.21)-c.v*1.8)*h; c.q+=c.v*h;
      }
      s.dust.forEach((p,i)=>{
        p.change-=h;
        if(p.change<=0){p.ax=(random()-.5)*.009;p.ay=(random()-.48)*.013;p.change=.55+random()*1.6;}
        // Weak restoring air currents keep particles away from the room boundaries.
        p.vx+=(s.wind*(.037+i*.001)+p.ax+.055*(dustCenters[i].x-p.x)-p.vx*.8)*h;
        p.vy+=(p.ay+.029*(dustCenters[i].y-p.y)-p.vy*.64)*h;
        p.vz+=(.016*(dustCenters[i].z-p.z)+.009*s.wind-p.vz*.6)*h;
        p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
      });
      const guide=s.guide;
      if(s.phase==='ready'&&!s.held) s.idle+=h; else s.idle=0;
      if(s.idle<4){guide.stage='rest';guide.wait=0;}
      else if(guide.stage==='rest' && (guide.wait-=h)<=0){guide.stage='press';}
      if(guide.stage==='press'&&guide.q>.975) {guide.stage='lift';}
      if(guide.stage==='lift'&&guide.q<.024){guide.stage='rest';guide.wait=1.65;}
      spring(guide,guide.stage==='press'?1:0,38,11,h);
      guide.reach+=((s.idle>=4&&guide.wait<.55?1:0)-guide.reach)*Math.min(1,7*h);
    }
    function settle(b) {
      const c=s.cups[b.cup];
      b.mode='pocket';c.ball=b.id;c.omega+=8.5+Math.abs(b.vy)*1.4;c.bell.v=.94;
      s.order.push(b.cup);s.phase='chime';s.pause=1.05;
      emit({kind:'chime',cup:b.cup});
    }
    function collide(b,j) {
      const p=pins[j], q=s.pins[j], dx=b.x-p.x-q.q,dy=b.y-p.y;
      const d=Math.hypot(dx,dy), r=R+PIN;
      if(d>=r||d<1e-8) return;
      const nx=dx/d,ny=dy/d,vn=(b.vx-q.v)*nx+b.vy*ny;
      b.x+=nx*(r-d);b.y+=ny*(r-d);
      if(vn<0) {
        const impulse=-(1+.55)*vn;
        b.vx+=impulse*nx;b.vy+=impulse*ny;
        q.v-=nx*impulse*.055;
        if(-vn>.08){b.hits++;emit({kind:'pin',pin:j,strength:-vn});}
      }
    }
    function falling(b,h) {
      b.vy-=G*Math.cos(TILT)*5/7*h;
      b.x+=b.vx*h;b.y+=b.vy*h;
      if(Math.abs(b.x)>.181-R){const sign=Math.sign(b.x);b.x=sign*(.181-R);b.vx=-sign*Math.abs(b.vx)*.55;}
      for(let j=0;j<pins.length;j++) if(Math.abs(b.y-pins[j].y)<R+PIN) collide(b,j);
      if(b.y<.075){
        const available=CUP.map((x,i)=>({i,dist:Math.abs(x-b.x)})).filter(c=>s.cups[c.i].ball===null);
        b.cup=available.reduce((a,c)=>a.dist<c.dist?a:c).i;b.mode='funnel';
      }
    }
    function funnel(b,h){
      // The loaded gate forms the high end of a sloping overflow rail. The
      // first unoccupied throat catches the marble in a compliant felt cup.
      const target=CUP[b.cup],dx=target-b.x;
      b.vx+=(clamp(dx*145,-2.5,2.5)-b.vx*9)*h;b.x+=b.vx*h;
      const floor=.026+Math.min(.043,Math.abs(dx)*.38);
      b.vy+=((floor-b.y)*430-b.vy*26)*h;b.y+=b.vy*h;
      b.z+=(.045-b.z)*h*6;
      if(Math.abs(dx)<.0018&&Math.abs(b.vx)<.016&&Math.abs(b.y-.026)<.002) settle(b);
    }
    function startPath(b,mode,end,bend) {
      b.mode=mode;b.path=0;b.speed=.025;
      b.from=[b.x,b.y,b.z];b.end=[end.x,end.y,end.z];b.bend=bend;
      b.length=Math.hypot(end.x-b.x,end.y-b.y,end.z-b.z)*1.08;
    }
    function pathStep(b,h){
      const u=b.path;
      const slope=(b.from[1]-b.end[1]-4*b.bend*(1-2*u))/Math.max(.001,b.length);
      b.speed+=((b.mode==='feed'?.6:.28)+G*5/7*Math.max(.012,slope)-2.7*b.speed)*h;
      b.path=Math.min(1,u+b.speed*h/b.length);
      const v=b.path,mix=i=>b.from[i]+(b.end[i]-b.from[i])*v;
      b.x=mix(0);b.y=mix(1)+4*b.bend*v*(1-v);b.z=mix(2);
      if(v<1) return;
      if(b.mode==='feed'){b.mode='seat';s.phase='ready';}
      else if(b.mode==='transfer'){
        b.mode='basket';s.wheel.index++;s.wheel.goal+=SLOT;
        s.baskets[b.basket].v+=.7;s.wheel.mode='index';emit({kind:'music',note:s.wheel.index+3});
      }else{b.mode='stored';}
    }
    function newRound(){
      const b=ball(s.nextId++,-.103,.477,.035);s.balls.push(b);s.active=b.id;
      s.feedBias+=2.399963+(random()-.5)*.6;
      startPath(b,'feed',{x:0,y:.431,z:.014},-.004);s.phase='feeding';
    }
    function machinery(h) {
      const w=s.wheel,opening=s.phase==='music';
      spring(s.lid,opening?1.12:0,42,11,h);
      for(const [j,c] of s.cups.entries()) {
        c.omega+=(-1.32*c.omega-.052*Math.sign(c.omega))*h;
        if(Math.abs(c.omega)<.001)c.omega=0;
        c.wing+=c.omega*h;spring(c.bell,(s.wind+.08*s.cloth[j*3].v)*(.004+j*.002),125,3.9,h);
        spring(c.lip,c.ball!==null?.22:0,64,9,h);
      }
      for (const q of s.pins) if(Math.abs(q.v)+Math.abs(q.q)>1e-9) spring(q,0,1150,10,h);
      if(opening) {
        const error=w.goal-w.angle;
        const torque=clamp(error*8,-3.0,3.0)*(.85+Math.min(w.work,.2));
        const weight=s.balls.reduce((sum,b)=>b.mode==='basket'?sum+.24*Math.sin(w.angle+b.basket*SLOT):sum,0);
        const escapement=Math.min(1,Math.abs(error)*2);
        w.v+=(torque+weight*escapement-3.3*w.v)*h;w.angle+=w.v*h;
        w.work=Math.max(0,w.work-.0009*Math.abs(w.v)*h);
        if(w.mode==='index'&&Math.abs(error)<.007&&Math.abs(w.v)<.025&&s.lid.q>1){
          if(w.index<3) {
            const cup=s.order[w.index], b=s.balls.find(b=>b.id===s.cups[cup].ball);
            s.cups[cup].ball=null;b.basket=((-Math.round(w.angle/SLOT)%6)+6)%6;
            startPath(b,'transfer',seatAt(w.angle+b.basket*SLOT),-.004);w.mode='loading';
          }else{w.goal+=TAU;w.mode='parade';}
        }
        else if(w.mode==='parade'&&Math.abs(error)<.015&&Math.abs(w.v)<.028){
          w.mode='unload';rewardLeft=.15;
        }
        if(w.mode==='unload' && (rewardLeft-=h)<=0) {
          const b=s.balls.find(b=>b.mode==='basket');
          if(b){startPath(b,'return',{x:b.x*.75,y:-.202,z:.063},0);rewardLeft=.28;}
          else if(!s.balls.some(b=>b.mode==='return')){s.phase='closing';s.pause=1.25;}
        }
      }
      const acc=(w.v-lastWheelV)/h;lastWheelV=w.v;
      s.baskets.forEach((a,i)=>{const angle=w.angle+i*SLOT;
        const load=s.balls.some(b=>b.basket===i&&b.mode==='basket')?1.16:1;
        spring(a,(-Math.cos(angle)*acc+Math.sin(angle)*w.v*w.v)*.026*load+s.wind*.018*(1+.3*Math.cos(angle)),65/load,3.8,h);
      });
      if(s.phase==='chime' && (s.pause-=h)<=0) {
        if(s.order.length===3){s.phase='music';w.index=0;w.mode='index';w.goal=w.angle;emit({kind:'overture'});}
        else newRound();
      }
      if(s.phase==='closing'&&(s.pause-=h)<=0){
        s.balls=[];s.order=[];
        w.goal=w.angle;w.v=0;lastWheelV=0;w.mode='park';newRound();
      }
    }
    function roll(b,dx,dy,h){
      // Contact friction brings angular velocity towards n cross v / R.
      // Residual rotation dies away in the felt after the centre comes to rest.
      const grip=b.mode==='pocket'||b.mode==='basket'?24:64;
      b.wx+=(-dy/(h*R)-b.wx)*Math.min(1,grip*h);
      b.wy+=( dx/(h*R)-b.wy)*Math.min(1,grip*h);
      const omega=Math.hypot(b.wx,b.wy);
      if(omega<1e-6){b.wx=0;b.wy=0;return;}
      const halfAngle=omega*h*.5,scale=Math.sin(halfAngle)/omega;
      const ax=b.wx*scale,ay=b.wy*scale,aw=Math.cos(halfAngle);
      const [x,y,z,w]=b.rotation;
      b.rotation[0]=aw*x+ax*w+ay*z;b.rotation[1]=aw*y+ay*w-ax*z;
      b.rotation[2]=aw*z+ax*y-ay*x;b.rotation[3]=aw*w-ax*x-ay*y;
      b.spin+=omega*h;
    }
    function tick(h){
      s.time+=h;environment(h);
      spring(s.lever,s.held?.043:0,K/.14,s.held?106:23,h);
      if(s.lever.q>=.04||s.lever.q<=0){s.lever.q=clamp(s.lever.q,0,.04);s.lever.v=0;}
      s.springForce=K*s.lever.q;
      for(const b of s.balls){
        const oldX=b.x,oldY=b.y;
        if(b.mode==='fall'||b.mode==='funnel'){
          if(b.mode==='fall') falling(b,h);else funnel(b,h);
        }else if(['feed','return','transfer'].includes(b.mode)) pathStep(b,h);
        else if(b.mode==='basket'){
          Object.assign(b,seatAt(s.wheel.angle+b.basket*SLOT));b.x+=.007*Math.sin(s.baskets[b.basket].q);
        }
        const carried=b.mode==='basket';roll(b,carried?0:b.x-oldX,carried?0:b.y-oldY,h);
      }
      machinery(h);
    }
    return {state:s,press,release,nudge,step(dt){
      if(!Number.isFinite(dt)||dt<0) return;
      remainder+=dt;const n=Math.floor((remainder+1e-12)/STEP);remainder-=n*STEP;
      for(let i=0;i<n;i++) tick(STEP);
    },getState:()=>JSON.parse(JSON.stringify(s)),drain(){const out=events;events=[];return out;}};
  }
  const api={create,pins,CUP,HUB,WHEEL,SLOT,R,TILT};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MarbleToy=api;
})(typeof window==='undefined'?globalThis:window);
