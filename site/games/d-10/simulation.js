/* Metres, kilograms, seconds. The renderer only samples this world. */
(function (root) {
'use strict';
const T = root.THREE, V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
const G=9.81, DT=1/180, SPRING=80, BALL_MASS=.2, BLOCK_MASS=.15, LIMIT=.3, R=.078;
const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
const floor=(x,z)=>.035*Math.max(-2,Math.min(2,z));
const narrow=typeof innerWidth==="number" && innerWidth/innerHeight<.83;
const porch={front:(narrow?2.43:1.57)-.1145,top:narrow?.235:.182};
const fork=narrow?V(-.128,.57,2.46):V(-.47,.57,1.60);
const towers=[{x:-.02,z:-.31},{x:-.96,z:-.78},{x:.94,z:-.65}];
if(narrow){towers[1].x=-.61;towers[1].z=-1.04;towers[2].x=.62;towers[2].z=-.98;}
const colors=['#e15740','#f2b742','#438eb1','#77aa83','#f0c885','#487f88','#e39069'];
const plans=[];
function piece(t,x,y,z,w,h,d,color,shape='box',yaw=0){
 plans.push({t,x:x+towers[t].x,y:y+floor(0,towers[t].z),z:z+towers[t].z,w,h,d,color,shape,yaw});
}
// Broad lintels span separate piers. Roofs sit loose on the top course.
for(const x of [-.23,.23]) piece(0,x,.135,0,.215,.27,.31,x<0?2:3);
piece(0,0,.388,0,.70,.236,.34,1,'arch');
for(const x of [-.15,.15]) piece(0,x,.625,0,.18,.238,.245,x<0?3:2,'cyl');
piece(0,0,.805,0,.56,.122,.28,4);
piece(0,0,1.005,0,.61,.278,.33,0,'roof');
for(const x of [-.135,.135]) piece(1,x,.122,0,.15,.244,.22,x<0?0:1);
piece(1,0,.30,0,.47,.112,.26,3);
piece(1,0,.452,0,.265,.192,.22,4,'window');
piece(1,0,.658,0,.38,.22,.27,2,'roof');
for(const x of [-.139,.139]) piece(2,x,.11,0,.154,.22,.225,x<0?3:2,'cyl');
piece(2,0,.284,0,.465,.128,.255,6);
piece(2,0,.425,0,.28,.154,.22,1,'arch');
piece(2,0,.612,0,.39,.22,.265,3,'roof');

plans.forEach(s=>{const t=towers[s.t],a=[-.135,.19,-.22][s.t],x=s.x-t.x,z=s.z-t.z;s.x=t.x+x*Math.cos(a)+z*Math.sin(a);s.z=t.z-x*Math.sin(a)+z*Math.cos(a);s.yaw=a;});
function cellIndex(x,z){return clamp(Math.floor((x+3.2)/.8),0,7)+8*clamp(Math.floor((z+3.3)/1.45),0,3);}
function makeRandom(seed){let s=seed>>>0;return ()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);}
function body(pos,m,h){
 const b={p:pos.clone(),q:new T.Quaternion(),v:V(),w:V(),h,im:1/m,sleep:true,quiet:0,
 axes:[V(1,0,0),V(0,1,0),V(0,0,1)], radius:h.length(),ii:V(3/(m*(h.y*h.y+h.z*h.z)),3/(m*(h.x*h.x+h.z*h.z)),3/(m*(h.x*h.x+h.y*h.y)))};
 return b;
}
function axes(b){b.axes[0].set(1,0,0).applyQuaternion(b.q);b.axes[1].set(0,1,0).applyQuaternion(b.q);b.axes[2].set(0,0,1).applyQuaternion(b.q);}
function inertia(b,u){return V().addScaledVector(b.axes[0],u.dot(b.axes[0])*b.ii.x).addScaledVector(b.axes[1],u.dot(b.axes[1])*b.ii.y).addScaledVector(b.axes[2],u.dot(b.axes[2])*b.ii.z);}
const components=['x','y','z'];
function closest(b,p){
 const d=p.clone().sub(b.p),o=b.p.clone();
 b.axes.forEach((a,i)=>o.addScaledVector(a,clamp(d.dot(a),-b.h[components[i]],b.h[components[i]])));return o;
}
function boxContact(a,b){
 const diff=a.p.clone().sub(b.p);
 if(diff.lengthSq()>(a.radius+b.radius)**2)return;
 let depth=Infinity,n;
 function test(v){
  const norm=v.length();if(norm<.001)return true;
  const va=v.clone().divideScalar(norm);
  let span=0;for(let i=0;i<3;i++)span+=Math.abs(a.axes[i].dot(va))*a.h[components[i]]+Math.abs(b.axes[i].dot(va))*b.h[components[i]];
  const d=diff.dot(va),overlap=span-Math.abs(d);if(overlap<=0)return false;
  if(overlap<depth){depth=overlap;n=va.multiplyScalar(d<0?-1:1);}return true;
 }
 for(let i=0;i<3;i++)if(!test(a.axes[i])||!test(b.axes[i]))return;
 for(const aa of a.axes)for(const bb of b.axes)if(!test(V().crossVectors(aa,bb)))return;
 const p=closest(a,b.p).add(closest(b,a.p)).multiplyScalar(.5);
 return {n,p,depth};
}
function impulse(b,r,j){if(!b||b.sleep)return;b.v.addScaledVector(j,b.im);b.w.add(inertia(b,V().crossVectors(r,j)));}
function contact(a,b,n,p,depth,bounce,mu){
 const ra=p.clone().sub(a.p),rb=b?p.clone().sub(b.p):V();
 const am=a.sleep?0:a.im,bm=b&&!b.sleep?b.im:0;if(am+bm===0)return;
 function velocity(body,r){return body?body.v.clone().add(V().crossVectors(body.w,r)):V();}
 function denom(body,r,dir){if(!body||body.sleep)return 0;const k=V().crossVectors(r,dir);return body.im+k.dot(inertia(body,k));}
 const relative=velocity(a,ra).sub(velocity(b,rb)),vn=relative.dot(n);
 if(vn<0){
  const j=-(1+(vn<-.32?bounce:0))*vn/(denom(a,ra,n)+denom(b,rb,n));
  const total=n.clone().multiplyScalar(j),tan=relative.addScaledVector(n,-vn),speed=tan.length();
  if(speed>.0001){tan.divideScalar(speed);total.addScaledVector(tan,-Math.min(mu*j,speed/(denom(a,ra,tan)+denom(b,rb,tan))));}
  impulse(a,ra,total);if(b)impulse(b,rb,total.negate());
 }
 const corr=.38*Math.max(0,depth-.00065)/(am+bm);
 a.p.addScaledVector(n,corr*am);if(b)b.p.addScaledVector(n,-corr*bm);
}
function integrate(b,dt){
 b.v.y-=G*dt;b.p.addScaledVector(b.v,dt);
 const ws=b.w.length();if(ws>.00001)b.q.premultiply(new T.Quaternion().setFromAxisAngle(b.w.clone().divideScalar(ws),ws*dt)).normalize();
 axes(b);
}
function corners(s,h){
 const pts=[];
 if(s.shape==='cyl'){
  for(const y of [-h.y,h.y])for(let j=0;j<12;j++){const a=j*Math.PI/6;pts.push(V(h.x*Math.cos(a),y,h.x*Math.sin(a)));}return pts;
 }
 for(const z of [-h.z,h.z]){
  for(const x of [-h.x,h.x])pts.push(V(x,-h.y,z));
  if(s.shape==='roof')pts.push(V(0,h.y,z));else for(const x of [-h.x,h.x])pts.push(V(x,h.y,z));
 }return pts;
}
function ballSurface(b,worldPoint){
 const s=plans[b.i];if(s.shape==='box')return closest(b,worldPoint);
 const p=worldPoint.clone().sub(b.p).applyQuaternion(b.q.clone().invert()),h=b.h,cl=p.clone();
 if(s.shape==='cyl'){
  const rad=Math.hypot(p.x,p.z),factor=rad>h.x?h.x/rad:1;cl.set(p.x*factor,clamp(p.y,-h.y,h.y),p.z*factor);
 }else{
  cl.set(clamp(p.x,-h.x,h.x),clamp(p.y,-h.y,h.y),clamp(p.z,-h.z,h.z));
  if(s.shape==='roof'){
   const poly=[[-h.x,-h.y],[h.x,-h.y],[0,h.y]];
   if(p.y < -h.y || p.y>h.y-Math.abs(p.x)*2*h.y/h.x){
    let best=Infinity;for(let i=0;i<3;i++){const [x,y]=poly[i],[xx,yy]=poly[(i+1)%3],dx=xx-x,dy=yy-y,u=clamp(((p.x-x)*dx+(p.y-y)*dy)/(dx*dx+dy*dy),0,1),qx=x+dx*u,qy=y+dy*u,dd=(p.x-qx)**2+(p.y-qy)**2;if(dd<best){cl.x=qx;cl.y=qy;best=dd;}}
   }
  }else if(s.shape==='arch'){
   const radius=s.w*.235,rx=cl.x,ry=cl.y+h.y;
   if(Math.abs(rx)<radius && ry<s.h*.55){
    let best=Infinity,bx=0,by=0;
    for(let j=0;j<=24;j++){const t=j/24,qx=radius*(2*(3*t*t-2*t*t*t)-1),qy=-h.y+s.h*2.16*t*(1-t),dd=(p.x-qx)**2+(p.y-qy)**2;if(dd<best){best=dd;bx=qx;by=qy;}}
    const archX=clamp((rx/radius+1)/2,0,1);let lo=0,hi=1;for(let j=0;j<9;j++){const t=(lo+hi)*.5;if(3*t*t-2*t*t*t<archX)lo=t;else hi=t;}
    if(ry<s.h*2.16*hi*(1-hi)){cl.x=bx;cl.y=by;}
   }
  }else if(s.shape==='window'){
   const x=p.x,y=p.y-.007,r=Math.hypot(x,y);if(r<.043){cl.x=.043*(r?x/r:1);cl.y=.007+.043*(r?y/r:0);}
  }
 }
 return cl.applyQuaternion(b.q).add(b.p);
}
function ground(b,sphere){
 const n=V(0,1,-(Math.abs(b.p.z)<2?.035:0)).normalize();
 if(sphere){
  const onPorch=b.p.z>porch.front&&Math.abs(b.p.x)<4.7;
  const surface=onPorch?porch.top:floor(b.p.x,b.p.z);if(onPorch)n.set(0,1,0);
  const d=R-(b.p.y-surface)*n.y;
  if(d>0)contact(b,null,n,b.p.clone().addScaledVector(n,-R),d,onPorch?.32:.27,onPorch?.33:.41);
  return d>-.002;
 }
 if(b.p.y-b.radius>floor(0,b.p.z)+.018)return false;
 let touching=false;
 for(const corner of b.corners){
  const p=corner.clone().applyQuaternion(b.q).add(b.p);
  const pen=floor(p.x,p.z)-p.y;if(pen>0){contact(b,null,n,p,pen,.09,.63);touching=true;}
 }return touching;
}
function ballBody(s){
 const b=body(s.p,BALL_MASS,V(R,R,R));b.ii.setScalar(2.5/(BALL_MASS*R*R));b.v.copy(s.v);b.sleep=false;return b;
}
function rollContact(b,assisted,goal,dt,iteration){
 const onSurface=ground(b,true);if(!onSurface||iteration!==0)return;
 // A gentle bank helps a short release roll on to the tower. Transverse
 // friction removes sideways velocity, and the grass brakes the spent ball.
 if(assisted){
  const d=goal.clone().sub(b.p);d.y=0;
  if(d.length()>.06){d.normalize();const cross=b.v.clone().addScaledVector(d,-b.v.dot(d));cross.y=0;b.v.addScaledVector(cross,-dt*3).addScaledVector(d,dt*.96);}
 }
 const drag=Math.exp(-dt*(assisted?.32:2.9));b.v.x*=drag;b.v.z*=drag;b.w.multiplyScalar(drag);
}
class Garden{
 constructor(seed=4281){
  this.rand=makeRandom(seed);this.time=0;this.acc=0;this.stage=0;this.mode='ready';this.wait=0;this.idle=0;this.events=[];this.shotId=0;this.reward=0;
  this.preview=[];this.pull=0;this.ring=0;this.ringV=0;this.side=0;this.speed=0;this.dragging=false;this.flight=null;this.oldBalls=[];this.hit=false;
  this.loaded=fork.clone();this.loadV=V();this.guide={p:0,v:0,alpha:0,phase:0,wait:0};
  this.cells=Array.from({length:32},(_,i)=>({wind:.03,bend:0,v:0,gust:.04,wait:this.rand()*1.7,wet:.32+this.rand()*.65,slip:0,drop:0,k:12+this.rand()*9,phase:i}));
  this.motes=Array.from({length:30},()=>({p:V(this.rand()*5-2.5,this.rand()*1.6+.1,-2.4+this.rand()*4),v:V(),lift:this.rand()*.13}));
  this.flags=Array.from({length:9},(_,i)=>Array.from({length:3},(_,j)=>({a:.06*i-.1,v:0,k:16+i*.8+j*2})));
  this.balloons=Array.from({length:3},(_,i)=>{const anchor=V((narrow?.47:1.12)+i*(narrow?.17:.24),1.20,-2.42-i*.07);return {anchor,p:anchor.clone().add(V((i-1)*.055,.43+[.09,.26,.04][i],0)),v:V(),length:.43+[.09,.26,.04][i],free:false};});
  this.bands=Array.from({length:2},()=>Array.from({length:6},()=>({p:fork.clone(),v:V()})));
  this.sections=[0,-.103,-.098];this.liftV=[0,0,0];
  this.blocks=plans.map((s,i)=>{const b=body(V(s.x,s.y+this.sections[s.t],s.z),BLOCK_MASS,V(s.w/2,s.h/2,s.d/2));b.q.setFromAxisAngle(V(0,1,0),s.yaw);axes(b);b.corners=corners(s,b.h);b.t=s.t;b.i=i;b.base=b.p.clone();return b;});
  this.restore=0;this.round=0;this.updateBands(0,true);
 }
 emit(type,value=1){this.events.push({type,value});if(this.events.length>36)this.events.shift();}
 grab(){if(this.mode!=='ready')return false;this.dragging=true;this.idle=0;this.guide.alpha=0;this.emit('grab');return true;}
 drag(length,side=0){if(!this.dragging)return;this.pull=clamp(length,0,LIMIT);this.side=clamp(side,-1,1);this.preview=this.trajectory();}
 cancel(){if(this.dragging){this.dragging=false;this.preview=[];this.pull=0;this.side=0;this.idle=0;}}
 destination(){
  const t=towers[this.stage];return V(t.x+.052+this.side*.092,.33+this.sections[this.stage],t.z);
 }
 direction(){const d=this.destination().sub(fork);d.y=0;return d.normalize();}
 pouch(){
  const length=this.dragging?this.pull:this.ring;
  const p=fork.clone().addScaledVector(this.direction(),-length*.96);
  p.y-=length*.23;return p;
 }
 launch(){
  const p=this.pouch(),dst=this.destination(),d=dst.clone().sub(p),dist=Math.hypot(d.x,d.z);
  const speed=Math.sqrt(SPRING/BALL_MASS)*this.pull;
  const disc=speed**4-G*(G*dist*dist+2*d.y*speed*speed);
  const angle=disc>0?Math.atan((speed*speed-Math.sqrt(disc))/(G*dist)):.23;
  return {p,v:V(d.x/dist*Math.cos(angle),Math.sin(angle),d.z/dist*Math.cos(angle)).multiplyScalar(speed)};
 }
 trajectory(){
  if(this.pull<.009)return [];
  const b=ballBody(this.launch()),goal=this.destination(),pieces=this.blocks.filter(k=>k.t===this.stage),dots=[];
  let previous=b.p.clone();
  for(let i=0;i<800&&dots.length<22;i++){
   integrate(b,DT);for(let j=0;j<3;j++)rollContact(b,true,goal,DT,j);
   if(pieces.some(k=>b.p.distanceToSquared(k.p)<(R+k.radius)**2 && ballSurface(k,b.p).distanceToSquared(b.p)<R*R))break;
   if(b.p.distanceTo(previous)>.083){dots.push(b.p.clone());previous=b.p.clone();}
  }return dots;
 }
 release(){
  if(!this.dragging)return false;this.ring=this.pull;this.ringV=0;this.dragging=false;this.preview=[];
  if(this.pull<.009){this.cancel();this.pull=0;this.side=0;return false;}
  const s=this.launch();this.speed=s.v.length();this.flight=ballBody(s);
  this.flight.id=++this.shotId;this.pull=0;this.mode='flight';this.wait=0;this.hit=false;this.emit('launch',this.speed);return true;
 }
 updateBands(dt,init=false){
  if(this.dragging){this.ring=this.pull;this.ringV=0;}else{this.ringV+=(-390*this.ring-11*this.ringV)*dt;this.ring+=this.ringV*dt;}
  const end=this.pouch();
  this.bands.forEach((row,i)=>{
   const start=fork.clone().add(V(i?.176:-.176,.052,-.018));
   row.forEach((s,j)=>{
    const u=j/(row.length-1),bulge=4*u*(1-u),target=start.clone().lerp(end,u);
    target.y-=bulge*(.023-this.pull*.065);target.z+=bulge*(.018+this.cells[i*7+j].bend*.014);
    if(init||j===0||j===row.length-1){s.p.copy(target);s.v.set(0,0,0);}
    else{s.v.addScaledVector(target.sub(s.p),dt*(550+80*j)).multiplyScalar(Math.exp(-dt*(10+2*j)));s.p.addScaledVector(s.v,dt);}
   });
  });
 }
 air(dt){
  this.cells.forEach((c,i)=>{
   if((c.wait-=dt)<=0){c.wait=.45+this.rand()*2;c.gust=(this.rand()-.32)*.75;}
   const neighbor=this.cells[(i&7)?i-1:i+1];
   c.wind+=dt*(1.7*(c.gust-c.wind)+.64*(neighbor.wind-c.wind));
   c.v+=dt*(c.wind*5-c.bend*c.k-c.v*2.7);c.bend+=c.v*dt;
   c.wet+=dt*(.008+.011*Math.abs(c.wind));if(c.wet>.83)c.slip+=dt*(c.wet-.8)*6;
   c.slip*=Math.exp(-dt*2.2);c.wet-=dt*c.slip;c.drop+=dt*(c.slip*2.2-c.drop*1.3);
  });
  this.flags.forEach((chain,i)=>chain.forEach((s,j)=>{
   const parent=j?chain[j-1].a:0,c=this.cells[(i*3+j)%32];s.v+=dt*(c.wind*(7+j*2)+s.k*(parent-s.a)-s.v*(2.2+j*.4));s.a+=dt*s.v;
  }));
  this.motes.forEach((m,i)=>{
   const c=this.cells[cellIndex(m.p.x,m.p.z)];m.v.x+=dt*(c.wind*.17-m.v.x*.7-m.p.x*.008);m.v.y+=dt*(m.lift+c.v*.08-(m.p.y-.15)*.13-m.v.y*.45);
   m.v.z+=dt*(c.bend*.09-m.v.z*.8);m.p.addScaledVector(m.v,dt);
  });
  this.balloons.forEach((b,i)=>{
   const c=this.cells[5+i*6],force=V(c.wind*.65,1.28+i*.09,c.bend*.7);
   if(!b.free&&b.p.y>b.anchor.y){const tether=b.p.clone().sub(b.anchor),l=tether.length();force.addScaledVector(tether,-Math.max(0,l-b.length)*85/Math.max(l,.0001));}
   b.v.addScaledVector(force,dt).multiplyScalar(Math.exp(-(b.free?.95:1.5)*dt));b.p.addScaledVector(b.v,dt);
  });
 }
 wake(t){for(const b of this.blocks)if(b.t===t){b.sleep=false;b.quiet=0;}}
 solve(dt){
  const balls=this.oldBalls.concat(this.flight?[this.flight]:[]),active=this.blocks.filter(b=>!b.sleep);
  if(!active.length&&!balls.some(b=>!b.sleep))return;
  for(const b of active){integrate(b,dt);b.w.multiplyScalar(Math.exp(-dt*.32));}
  for(const b of balls)if(!b.sleep)integrate(b,dt);
  for(let iter=0;iter<3;iter++){
   for(const b of balls)if(!b.sleep){
    rollContact(b,b===this.flight&&!this.hit,this.destination(),dt,iter);
    for(const k of this.blocks){
     if(k.t!==this.stage&&k.sleep&&this.mode!=='reward')continue;
     if(b.p.distanceToSquared(k.p)>(R+k.radius)**2)continue;
     const point=ballSurface(k,b.p),n=b.p.clone().sub(point),l=n.length();if(l>=R||l<1e-8)continue;
     if(b===this.flight&&!this.hit&&k.t===this.stage){
      this.hit=true;this.wake(k.t);this.mode='fall';this.wait=0;this.emit('wood',b.v.length());
     }
     contact(b,k,n.multiplyScalar(1/l),point,R-l,.16,.49);
    }
   }
   for(let i=0;i<this.blocks.length;i++){
    const a=this.blocks[i];if(!a.sleep)ground(a,false);
    for(let j=i+1;j<this.blocks.length;j++){
     const b=this.blocks[j];if(a.sleep&&b.sleep)continue;
     if(a.t!==b.t&&(a.sleep||b.sleep))continue;
     const c=boxContact(a,b);if(c)contact(a,b,c.n,c.p,c.depth,.08,.61);
    }
   }
  }
  for(const b of active){
   if(b.p.y-floor(0,b.p.z)<b.radius+.02){
    b.w.multiplyScalar(Math.exp(-dt*2));b.v.x*=Math.exp(-dt*.65);b.v.z*=Math.exp(-dt*.65);
   }
   if(b.v.lengthSq()<.0018&&b.w.lengthSq()<.09)b.quiet+=dt;else b.quiet=0;
   if(b.quiet>.42){b.sleep=true;b.v.set(0,0,0);b.w.set(0,0,0);}
  }
  for(const b of balls)if((b!==this.flight||this.hit)&&b.v.lengthSq()<.002&&b.p.y<R+floor(0,b.p.z)+.01){b.sleep=true;b.v.set(0,0,0);b.w.set(0,0,0);}
 }
 reload(){
  if(this.flight){this.oldBalls.push(this.flight);this.flight=null;}
  this.loaded.copy(fork).add(narrow?V(.24,-.21,.20):V(.68,-.23,.28));this.loadV.set(0,.88,0);this.mode='reload';this.wait=0;this.side=0;this.hit=false;
 }
 tick(dt){
  this.time+=dt;this.wait+=dt;this.air(dt);this.updateBands(dt);
  if(this.mode!=='reset')this.solve(dt);
  if(this.mode==='ready'&&!this.dragging){
   this.idle+=dt;const g=this.guide;
   if(this.idle>4){
    g.wait+=dt;const target=g.phase===1?1:0;
    g.alpha=clamp(g.alpha+dt*(g.phase===2?-2:3),0,1);g.v+=(22*(target-g.p)-8*g.v)*dt;g.p+=g.v*dt;
    if(g.wait>[.55,1.15,1.9][g.phase]){g.phase=(g.phase+1)%3;g.wait=0;}
   }
  }else{this.idle=0;this.guide.alpha=0;this.guide.phase=0;this.guide.wait=0;}
  if(this.mode==='fall'&&this.wait>1.65){
   if(this.stage<2){this.stage++;this.emit('rise',this.stage);this.reload();}
   else{this.mode='reward';this.reward=0;this.wait=0;this.emit('reward');}
  }
  if(this.mode==='flight'&&this.wait>10)this.reload();
  if(this.mode==='reload'){
   const dest=fork.clone();this.loadV.addScaledVector(dest.sub(this.loaded),dt*61).multiplyScalar(Math.exp(-dt*12));this.loaded.addScaledVector(this.loadV,dt);
   if(this.wait>.96&&this.balloons.every(b=>b.p.y>b.anchor.y+.23)){this.mode='ready';this.wait=0;this.loaded.copy(fork);}
  }
  if(this.mode==='reward'){
   this.reward+=dt;
   this.balloons.forEach((b,i)=>{if(!b.free&&this.reward>.35+i*.82){b.free=true;this.flags[8-i][0].v+=.6+i*.09;this.emit('balloon',i);}});
   if(this.reward>6.2){this.mode='reset';this.wait=0;this.restore=0;}
  }
  if(this.mode==='reset'){
   this.restore=Math.min(1,this.wait/1.05);
   if(this.restore===1){
    // Replant below the turf, after every old piece has sunk out of view.
    this.round++;this.stage=0;this.sections=[-1.25,-1.25,-1.25];this.liftV=[0,0,0];
    this.blocks.forEach(b=>{const s=plans[b.i];b.p.set(s.x,s.y+this.sections[s.t],s.z);b.q.setFromAxisAngle(V(0,1,0),s.yaw);axes(b);b.v.set(0,0,0);b.w.set(0,0,0);b.sleep=true;});
    this.balloons.forEach(b=>{b.free=false;b.p.copy(b.anchor).y-=1.65;b.v.set(0,.48,0);});
    this.flight=null;this.oldBalls=[];this.restore=0;this.reload();
   }
  }
  if(this.mode!=='reset')this.sections.forEach((h,i)=>{
   const goal=i<=this.stage?0:(i===1?-.103:-.098);
   this.liftV[i]+=dt*((goal-h)*32-10.4*this.liftV[i]);const change=this.liftV[i]*dt;this.sections[i]+=change;
   if(change)for(const b of this.blocks)if(b.t===i&&b.sleep)b.p.y+=change;
  });
 }
 step(dt){if(!Number.isFinite(dt)||dt<=0)return;this.acc+=dt;while(this.acc+1e-10>=DT){this.tick(DT);this.acc-=DT;}}
 getState(){
  const xyz=v=>v.toArray(),pack=b=>({p:xyz(b.p),v:xyz(b.v),q:b.q.toArray(),w:xyz(b.w),sleep:b.sleep});
  return {time:this.time,round:this.round,mode:this.mode,stage:this.stage,pull:this.pull,ring:this.ring,speed:this.speed,idle:this.idle,guide:{...this.guide},loaded:xyz(this.loaded),sections:[...this.sections],
   blocks:this.blocks.map(pack),ball:this.flight?{id:this.flight.id,...pack(this.flight)}:null,spent:this.oldBalls.map(b=>({id:b.id,...pack(b)})),
   bands:this.bands.map(r=>r.map(s=>xyz(s.p))),cells:this.cells.map(c=>({wind:c.wind,bend:c.bend,wet:c.wet,drop:c.drop})),flags:this.flags.map(r=>r.map(s=>s.a)),
   balloons:this.balloons.map(b=>({p:xyz(b.p),v:xyz(b.v),free:b.free})),motes:this.motes.map(m=>xyz(m.p)),restore:this.restore};
 }
}
root.ToyGarden={Garden,plans,colors,towers,floor,fork,R,narrow,porch,cellIndex,makeRandom};
})(globalThis);
