/* Metres, seconds and radians. The renderer only reads this model. */
(function (global) {
  'use strict';
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  const mix = (a,b,u)=>a+(b-a)*u;
  function random(seed) {
    return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
  }
  function spring(o,k,v,target,stiff,drag,dt) {
    o[v] += ((target-o[k])*stiff-o[v]*drag)*dt;
    o[k] += o[v]*dt;
  }
  function layout(portrait) {
    const x=portrait?-.50:-4.0,z=3.4, cx=portrait?2.05:5.55,cz=-7.6;
    return {cx,cz, boxes:[{x,z},{x:x-1.42,z:z+1.18},{x:x+1.51,z:z+0.68}],
      pads:[{x:cx-1.46,z:cz+3.32},{x:cx,z:cz+3.32},{x:cx+1.46,z:cz+3.32}], deck:1.12};
  }
  function create(opts={}) {
    const rand=random(817215), L=opts.ropeLength||8, map=layout(!!opts.portrait), source=map.boxes[0];
    const h={x:source.x,y:opts.initialHeight ?? L+1.56,z:source.z,vx:0,vz:0,vy:0,ax:0,az:0,roll:0,rv:0,pitch:0,pv:0};
    const rope=Array.from({length:8},(_,i)=>({ax:.012+i*.0008,az:-.008,vx:0,vz:0,x:h.x,y:h.y-L*(i+1)/8,z:h.z}));
    const crates=map.boxes.map(p=>({...p,y:0,tilt:0,tiltV:0,lid:0,lidV:0,rise:0,riseV:0,bell:0,bellV:0,ring:0,returnV:0,delivered:false}));
    const breeze=Array.from({length:18},(_,i)=>({x:(i%6-2.5)*4,z:(Math.floor(i/6)-1)*6,u:.15+rand()*.3,v:rand()*.18,du:0,dv:0,force:.1+rand()*.4,side:rand()*.3-.15,remain:.2+rand()*2,stem:rand()*.04,sv:0,wet:rand()*.1,wave:rand()*.04,wv:0}));
    const dust=Array.from({length:28},()=>({x:(rand()-.5)*19,y:.2+rand()*4,z:(rand()-.5)*14,vx:.03,vy:0,vz:0,life:rand()*.9+.1,bright:0,rest:0,generation:0}));
    const arms=Array.from({length:4},(_,i)=>({a:.1+i*.03,v:0}));
    const smoke=Array.from({length:22},()=>({x:0,y:0,z:0,v:0,heat:0,r:0,alpha:0,live:false,generation:0}));
    const arc=Array.from({length:21},()=>({mist:0,rate:0}));
    const rotor={phase:0,speed:18,tail:0,tailSpeed:61};
    const sock=Array.from({length:5},(_,i)=>({a:.06+i*.015,v:0}));
    const guide={idle:0,travel:0,v:0,alpha:0,rest:0,down:0};
    const S={h,rope,crates,breeze,dust,arms,smoke,arc,rotor,sock,guide,phase:'pickup',index:0,delivered:0,
      held:false,engaged:false,touchX:h.x,touchZ:h.z,targetX:h.x,targetZ:h.z,phaseAge:0,cover:0,cycles:0,
      time:0,length:L,map,bump:0,carryOffset:{x:0,y:0,z:0}};
    let puffIn=0,remainder=0;
    function phase(name){S.phase=name;S.phaseAge=0;guide.idle=0;guide.travel=0;guide.v=0;}
    function aim(x,z) { S.touchX=clamp(x,-10,11);S.touchZ=clamp(z,-10,9); }
    function press(kind,x,z) {
      const pick=S.phase==='pickup',fly=S.phase==='carry';
      guide.idle=0;
      if (!(pick||fly)||!(kind==='heli'||(pick&&kind==='crate')||(fly&&kind==='mat'))) {S.bump=Math.min(1,S.bump+.22);return false;}
      S.held=true;S.engaged=true;guide.idle=0;guide.travel=0;guide.v=0;
      const p=kind==='crate'?map.boxes[S.index]:kind==='mat'?map.pads[S.index]:h;
      aim(Number.isFinite(x)?x:p.x,Number.isFinite(z)?z:p.z);return true;
    }
    function nudge(i){const c=crates[i];if(c&&!c.delivered&&!(i===S.index&&S.phase==='carry'))c.tiltV+=.11;}
    function move(x,z){if(S.held) aim(x,z);}
    function release(){S.held=false;guide.idle=0;}
    function air(dt) {
      for(let i=0;i<breeze.length;i++){
        const b=breeze[i],prev=breeze[(i+17)%18];b.remain-=dt;
        if(b.remain<=0){b.force=rand()*.95-.1;b.side=rand()*.64-.30;b.remain=.55+rand()*2.1;}
        spring(b,'u','du',b.force*.78+prev.u*.22,2.2,2.15,dt);
        spring(b,'v','dv',b.side,2.8,2.3,dt);
        const dx=b.x-h.x,dz=b.z-h.z;
        const wash=2.8*Math.exp(-(dx*dx+dz*dz)/31)*Math.pow(8/h.y,2);
        spring(b,'stem','sv',b.u*.19+wash*dx*.026,15+i%5,3.2,dt);
        spring(b,'wave','wv',prev.wave*.23+b.v*.27+b.du*.075,8+i%3,1.9,dt);
        b.wet+=((.16+b.wave)*.4-b.wet*.4)*dt;
      }
      for(let i=0;i<dust.length;i++){
        const p=dust[i],b=breeze[i%18];p.rest-=dt;
        if(p.life<=0 && p.bright<.001 && p.rest<=0){
          p.generation++;p.x=(rand()-.5)*19;p.y=.1+rand()*.75;p.z=(rand()-.5)*14;p.vy=.08+rand()*.12;p.life=2+rand()*6;
        }
        p.life-=dt;
        p.bright+=((p.life>0?Math.min(1,p.life):0)-p.bright)*3*dt;
        const wash=.42*Math.exp(-((p.x-h.x)**2+(p.z-h.z)**2)/16);
        p.vx+=(b.u*.55-p.vx)*dt;p.vz+=(b.v*.55-p.vz)*dt;
        p.vy+=(.07+wash+b.du*.14-p.vy)*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      }
      for(let i=0;i<sock.length;i++){const s=sock[i],wind=breeze[7+i%3];spring(s,'a','v',(i?sock[i-1].a:0)*.49+.17+wind.u*.42+wind.dv*.22,15-i,3,dt);}
    }
    function flight(dt) {
      const pick=S.phase==='pickup',carrying=S.phase==='carry',pad=map.pads[S.index],box=map.boxes[S.index];
      if(S.held){S.targetX=S.touchX;S.targetZ=S.touchZ;}
      else if(pick){S.targetX=box.x;S.targetZ=box.z;}
      else if(carrying){
        if(Math.hypot(h.x-pad.x,h.z-pad.z)<3.4 || Math.hypot(S.targetX-pad.x,S.targetZ-pad.z)<2.9){S.targetX=pad.x;S.targetZ=pad.z;}
      } else if(S.phase==='return'){S.targetX=source.x;S.targetZ=source.z;}
      const dx=S.targetX-h.x,dz=S.targetZ-h.z,dist=Math.hypot(dx,dz),speed=Math.min(6,dist*1.55);
      const oldX=h.vx,oldZ=h.vz;
      h.vx+=((dist?dx/dist*speed:0)-h.vx)*Math.min(1,dt*3.2);
      h.vz+=((dist?dz/dist*speed:0)-h.vz)*Math.min(1,dt*3.2);
      h.ax=(h.vx-oldX)/dt;h.az=(h.vz-oldZ)/dt;h.x+=h.vx*dt;h.z+=h.vz*dt;
      const deck=map.deck*clamp(1-Math.max(0,Math.hypot(h.x-pad.x,h.z-pad.z)-1.7)/1.65,0,1);
      const floor=L+1.29+deck;
      const yy=clamp(h.y+(S.held?1.5:-1)*dt,floor,Math.max(13.35,L+2.60));
      h.vy=(yy-h.y)/dt; h.y=yy;
      spring(h,'roll','rv',clamp(-h.ax*.020+breeze[7].v*.04,-.16,.16),13,5,dt);
      spring(h,'pitch','pv',clamp(h.az*.018+breeze[8].du*.036,-.15,.15),11,4.5,dt);
      rotor.speed+=((S.held?23:18.3)+h.vy*.27-rotor.speed)*1.7*dt;rotor.phase+=rotor.speed*dt;
      rotor.tailSpeed+=(rotor.speed*3.8-rotor.tailSpeed)*4*dt;rotor.tail+=rotor.tailSpeed*dt;
      let px=h.x,py=h.y,pz=h.z;
      for(let i=0;i<rope.length;i++){
        const r=rope[i],b=breeze[6+i%6],before=rope[Math.max(0,i-1)],after=rope[Math.min(7,i+1)];
        const coupling=45, loss=carrying?.72:1.06;
        for(const [ang,vel,acc,wind] of [['ax','vx',h.ax,b.u],['az','vz',h.az,b.v]]){
          const tension=coupling*(before[ang]+after[ang]-2*r[ang]);
          r[vel]+=(-9.81/L*Math.sin(r[ang])-acc/L*Math.cos(r[ang])+wind*(carrying?.014:.045)*(1+i*.07)+tension-loss*r[vel])*dt;
          r[ang]+=r[vel]*dt;
        }
        const ax=Math.sin(r.ax),az=Math.sin(r.az),norm=Math.hypot(ax,1,az);
        px+=L/8*ax/norm;py-=L/8/norm;pz+=L/8*az/norm;r.x=px;r.y=py;r.z=pz;
      }
      const c=crates[S.index],attach=1.31;
      if(pick && S.engaged && Math.hypot(px-c.x,pz-c.z)<.72 && Math.abs(py-c.y-attach)<.48){
        S.carryOffset={x:c.x-px,y:c.y-(py-attach),z:c.z-pz};phase('carry');
      }
      if(S.phase==='carry'){
        const off=S.carryOffset;off.x*=Math.exp(-3*dt);off.y*=Math.exp(-3*dt);off.z*=Math.exp(-3*dt);
        c.x=px+off.x;c.z=pz+off.z;c.y=Math.max(0,py-attach+off.y);
        spring(c,'tilt','tiltV',-rope[7].ax*.85,12,3.8,dt);
        if(!S.held && Math.hypot(c.x-pad.x,c.z-pad.z)<1.02 && c.y<=map.deck+.10){
          c.delivered=true;S.delivered++;phase('chime');S.engaged=false;
        }
      }
    }
    function rewards(dt) {
      crates.forEach((c,i)=>{
        if(!c.delivered&&!(i===S.index&&S.phase==='carry'))spring(c,'tilt','tiltV',0,22,4.7,dt);
        const open=c.delivered && S.phase!=='return',p=map.pads[i];
        if(open){c.x+=(p.x-c.x)*3.4*dt;c.z+=(p.z-c.z)*3.4*dt;c.y+=(map.deck-c.y)*4*dt;spring(c,'tilt','tiltV',0,30,7,dt);}
        spring(c,'lid','lidV',open?1.87:0,11,5.4,dt);
        spring(c,'rise','riseV',open&&c.lid>.48?1.9:0,7.5,4.4,dt);
        const b=breeze[7+i];
        spring(c,'bell','bellV',c.rise>.2?b.v*.49+b.du*.17+c.riseV*.24:0,14+i,1.3,dt);
        if(Math.abs(c.bell)>.16 && Math.sign(c.bell)===Math.sign(c.bellV) && c.ring<=0){c.bellV*=-.32;c.ring=.45;}
        c.ring=Math.max(0,c.ring-dt);
      });
      arms.forEach((a,i)=>{
        const cheer=S.phase==='chime'||S.phase==='finale', wave=S.phase==='carry'&&i===1;
        spring(a,'a','v',cheer?2.50+.06*(i%2):wave?1.95:.15+breeze[i+5].u*.07,cheer?10+i:7+i*.6,4.6,dt);
      });
      if(S.phase==='chime'&&S.phaseAge>3.8){
        if(S.delivered===3)phase('finale');else{S.index++;phase('pickup');}
      }
      const warm=S.phase==='finale';
      if(warm) puffIn-=dt;
      if(warm&&puffIn<=0){const p=smoke.find(q=>!q.live);if(p)Object.assign(p,{live:true,generation:p.generation+1,x:0,y:0,z:0,v:.36+rand()*.08,heat:1,r:.08,alpha:0});puffIn=.43+rand()*.16;}
      for(const p of smoke){if(!p.live)continue;
        p.heat*=Math.exp(-.32*dt);p.v+=(p.heat*.76+.26-p.v)*dt;p.y+=p.v*dt;
        p.x+=breeze[1].v*.045*dt;p.z+=breeze[2].v*.035*dt;p.r+=(p.heat*.15+.018)*dt;
        p.alpha=clamp(p.y*2.8,0,1)*clamp((4.25-p.y)/1.2,0,1)*.42;if(p.y>=4.25)p.live=false;
      }
      arc.forEach((p,i)=>spring(p,'mist','rate',warm?clamp((S.phaseAge-.07*i)*.7,0,1):0,4.8,4.3,dt));
      if(warm&&S.phaseAge>9.4)phase('return');
      if(S.phase==='return'){
        S.cover=clamp(S.phaseAge/1.3,0,1);
        if(S.phaseAge>1.3)crates.forEach((c,i)=>{const p=map.boxes[i];const dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz);c.returnV+=(Math.min(5.2,d*3.0)-c.returnV)*5.5*dt;const u=d?Math.min(1,c.returnV*dt/d):0;c.x+=dx*u;c.z+=dz*u;c.y*=Math.exp(-2.6*dt);});
        if(S.phaseAge>5.4){crates.forEach(c=>{c.delivered=false;c.returnV=0;});S.index=0;S.delivered=0;S.cycles++;phase('pickup');}
      }else S.cover=Math.max(0,S.cover-dt*.77);
    }
    function tick(dt){
      S.time+=dt;S.phaseAge+=dt;S.bump*=Math.exp(-5*dt);
      air(dt);flight(dt);rewards(dt);
      const g=guide;g.idle=S.held?0:g.idle+dt;
      const teach=g.idle>4&&(S.phase==='pickup'||S.phase==='carry')&&g.rest<=0;
      g.alpha+=(Number(teach)-g.alpha)*dt*5;
      if(teach){g.v+=(.46-g.v)*dt*3;g.travel+=g.v*dt;if(g.travel>=1){g.rest=1.1;}}
      else if(g.rest>0){g.rest-=dt;if(g.rest<=0){g.travel=0;g.v=0;}}
      g.down+=(Number(teach&&g.travel>.16&&g.travel<.86)-g.down)*dt*8;
    }
    function step(dt){if(!Number.isFinite(dt)||dt<=0)return;remainder+=dt;
      while(remainder+1e-11>=1/120){tick(1/120);remainder-=1/120;}
    }
    return {state:S,step,getState:()=>JSON.parse(JSON.stringify(S)),press,move,release,nudge};
  }
  const api={create,layout,random};global.AlpineFlight=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
