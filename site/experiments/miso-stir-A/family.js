'use strict';
// Lofted cross sections keep the jaw, shoulders and clothing silhouettes continuous.
function surface(p,m,rings,n=36,shape=null){
 const pos=[],uv=[],idx=[];
 for(let j=0;j<rings.length;j++){
   const [y,w,d,z=0,x=0]=rings[j];
   for(let i=0;i<=n;i++){
     const a=i/n*TAU,v=V(x+w*Math.sin(a),y,z+d*Math.cos(a));
     if(shape)shape(v,a,j);pos.push(v.x,v.y,v.z);uv.push(i/n,j/(rings.length-1));
     if(i<n && j<rings.length-1){const k=j*(n+1)+i;idx.push(k,k+1,k+n+2,k,k+n+2,k+n+1);}
   }
 }
 const g=geometry(pos,idx,uv);
 // Average the two normals at the azimuth seam.
 const normals=g.attributes.normal,b=V(),c=V();
 for(let j=0;j<rings.length;j++){let k=j*(n+1);b.fromBufferAttribute(normals,k).add(c.fromBufferAttribute(normals,k+n)).normalize();normals.setXYZ(k,b.x,b.y,b.z);normals.setXYZ(k+n,b.x,b.y,b.z);}
 return mesh(p,g,m);
}
const skin=mat(0xe7ac88,.69), blush=mat(0xc98772,.77),lips=mat(0xb77566,.66),lash=mat(0x44332c,.78);
const hair=mat(0x322a26,.44),hairWarm=mat(0x45352c,.48),hairGlint=mat(0x554034,.49);
const shirts=[cloth(0xf4e6ca),cloth(0xba745b),cloth(0x809083)];
const aprons=[mat(0xfff5db,.91,0,{map:plaid,bumpMap:weave,bumpScale:.004}),cloth(0x5d7971),cloth(0x635e4b)];
const stitch=cloth(0xe1d4b5), ivory=mat(0xe4ceb1,.68);
function makeHead(person,type){
 const child=type===0,mom=type===1;
 const g=group(person,0,child?1.87:2.08,.04),s=group(g);g.rotation.order='YXZ';
 const profile=[[-.43,.08,.14,.045],[-.397,.168,.210,.042],[-.32,.247,.253,.03],[-.218,.309,.292,.015],[-.106,.345,.311,0],[.01,.355,.32,-.009],[.13,.358,.324,-.018],[.25,.344,.312,-.029],[.37,.303,.268,-.04],[.456,.203,.192,-.041],[.495,.02,.03,-.035]];
 const w=child?1.06:mom?.95:1.04,h=child?.91:mom?1:1.055;
 s.scale.set(w,h,1);
 const hill=(x,y,cx,cy,wx,wy)=>Math.exp(-(((x-cx)/wx)**2+((y-cy)/wy)**2));
 // Smooth face relief is sampled above the basic loft resolution.
 const refined=[];
 for(let j=0;j<profile.length-1;j++)for(let k=0;k<5;k++)refined.push(profile[j].map((v,i)=>v+(profile[j+1][i]-v)*k/5));
 refined.push(profile[profile.length-1]);
 surface(s,skin,refined,72,(v,a)=>{
    const front=Math.max(0,Math.cos(a));
    if(front===0)return;
    const x=v.x,y=v.y;
    v.z+=front*(.083*hill(x,y,0,-.067,.061,.171)+.112*hill(x,y,0,-.151,.072,.066)
        +.026*hill(Math.abs(x),y,.057,-.172,.035,.032)
        -.029*hill(Math.abs(x),y,.138,.004,.095,.052)
        +.027*hill(Math.abs(x),y,.163,.084,.13,.05)
        +.035*hill(Math.abs(x),y,.20,-.107,.114,.09)
        +.024*hill(x,y,0,-.248,.132,.069));
 });
 const eyes=[];
 for(const sign of [-1,1]){
    oval(s,skin,sign*.346,-.06,-.004,.065,.105,.050).rotation.z=-sign*.11;
    oval(s,blush,sign*.369,-.054,.027,.022,.056,.017);
    const eye=group(s,sign*.139,.002,.279);
    eye.rotation.y=sign*.39;eyes.push(eye);
    // Almond fissure, small iris, lower eyelid and a tapered upper lash.
    oval(eye,ivory,0,-.002,.006,.074,.024,.020);
    oval(eye,lash,-sign*.009,-.006,.026,.025,.022,.011);
    oval(eye,mat(0x241e19,.3),-sign*.009,-.007,.034,.013,.013,.005);
    oval(eye,crock,-.012,.002,.039,.005,.004,.003);
    line(eye,lash,[[-.073,-.002,.009],[-.04,.014,.024],[0,.022,.027],[.043,.013,.024],[.073,-.002,.009]],child?.007:.006,12);
    line(eye,skin,[[-.069,-.004,.009],[0,-.024,.020],[.069,-.004,.009]],.0065,9);
    const brow=group(s,eye.position.x,eye.position.y,eye.position.z);brow.rotation.copy(eye.rotation);
    line(brow,hairWarm,[[-.077,.077,.014],[-.03,.09,.024],[.021,.092,.025],[.076,.072,.013]],child?.011:.014,12);
    oval(s,lips,sign*.041,-.174,.440,.013,.005,.007);
 }
 const mouth=group(s,0,-.253,.295);
 line(mouth,lips,[[-.089,.010,-.007],[-.041,.001,.013],[0,.002,.018],[.041,.001,.013],[.089,.01,-.007]],.009,14);
 oval(mouth,mat(0xd58e78,.65),0,-.011,.014,.055,.012,.012);
 // Fitted scalp with a swept hairline. Ridges follow the flow of the part.
 function scalp(a,t,lift=0){
   const f=Math.cos(a),offset=type===2?.29:.42;
   const brow=1.05+.18*Math.sin(a*2.0+offset);
   const edge=brow+(2.11-brow)*Math.pow((1-f)/2,.60)+.07*Math.sin(a*3.0);
   const theta=.008+(edge-.008)*t;
   return V((.373+lift)*Math.sin(theta)*Math.sin(a),.068+(.459+lift)*Math.cos(theta),-.028+(.345+lift)*Math.sin(theta)*Math.cos(a));
 }
 const pos=[],idx=[];
 for(let j=0;j<=18;j++)for(let i=0;i<=64;i++){
   const v=scalp(i/64*TAU,j/18);pos.push(v.x,v.y,v.z);
   if(i<64&&j<18){const k=j*65+i;idx.push(k,k+66,k+1,k,k+65,k+66);}
 }
 mesh(s,geometry(pos,idx),hair);
 for(let i=0;i<42;i++){
    const a=i*TAU/42+.04*Math.sin(i);
    const pts=[];for(let j=0;j<7;j++){let t=.13+.85*j/6;
      pts.push(scalp(a+.64*(1-t),t,.0018));}
    line(s,i%5===0?hairGlint:hairWarm,pts,i%3===0?.004:.0028,14,5);
 }
 for(const sign of [-1,1]){const lock=oval(s,hair,sign*.329,.002,-.023,.058,.135,.085);lock.rotation.x=.18;}
 if(child){
   for(const k of [-1,1]){
    const a=group(s,k*.32,-.015,-.19);a.rotation.z=k*.39;
    oval(a,mat(0xc2924a,.57),0,-.012,0,.084,.076,.081);
    oval(a,hair,0,-.14,-.017,.104,.159,.099);
    for(let i=0;i<7;i++){const ang=i*TAU/7;
      line(a,hairWarm,[[.046*Math.sin(ang),-.02,.045*Math.cos(ang)],[.103*Math.sin(ang),-.15,.084*Math.cos(ang)-.014],[.037*Math.sin(ang),-.27,.040*Math.cos(ang)-.018]],.005,10);}
   }
 }else if(mom){
   oval(s,hair,0,-.038,-.337,.202,.183,.157);
   for(let i=0;i<9;i++){
    const a=i*TAU/9;line(s,hairWarm,[[.15*Math.sin(a),.06,-.33],[.198*Math.sin(a),-.024,-.36+.07*Math.cos(a)],[.082*Math.sin(a),-.154,-.34]],.009,9);}
   for(const sign of [-1,1])oval(s,brass,sign*.365,-.148,.008,.019,.022,.019);
 }else{
   const frames=mat(0x574b3a,.34,.58);
   for(const sign of [-1,1]){
     const pts=[];for(let i=0;i<=24;i++){const a=i/24*TAU,x=.143*Math.cos(a);
       pts.push([sign*.147+x,.001+.087*Math.sin(a),.346-x*sign*.38]);}
     line(s,frames,pts,.007,28);
     line(s,frames,[[sign*.282,.004,.295],[sign*.34,.01,.17],[sign*.362,-.015,.002]],.007,9);
   }
   line(s,frames,[[-.021,.026,.383],[0,.036,.389],[.021,.026,.383]],.007,6);
 }
 // All eye surfaces and both lips stay on the same head throughout a cycle.
 for(const part of [...eyes,mouth])part.removeFromParent();
 batch(s,true);
 for(const part of [...eyes,mouth]){s.add(part);batch(part,true);}
 for(const o of mouth.children){
   if(!o.isMesh)continue;
   const neutral=o.geometry.attributes.position,smile=neutral.clone();
   for(let j=0;j<smile.count;j++){
     const x=neutral.getX(j);smile.setXYZ(j,x*1.13,neutral.getY(j)+.031*(x/.10)**2,neutral.getZ(j)-.004*(x/.10)**2);
   }
   o.geometry.morphAttributes.position=[smile];o.updateMorphTargets();
 }
 g.userData.eyes=eyes;g.userData.mouth=mouth;
 return g;
}
function limbSegment(p,m,r,profile){
 const g=group(p);surface(g,m,profile.map(([h,w,d])=>[h,w*r,d*r]),24);batch(g);return g;
}
function setSegment(g,a,b){
 g.position.copy(a);const v=V().subVectors(b,a);g.scale.y=v.length();g.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());
}
function hand(p,center,scale,rot=0,grip=false){
 const g=group(p,...center);g.scale.setScalar(scale);g.rotation.z=rot;
 oval(g,skin,0,0,0,.107,.134,.066);
 for(let i=0;i<4;i++){
   const x=-.072+i*.047,h=(i===1?.128:i===3?.094:.112);
   const f=oval(g,skin,x,-.099-h*.30,grip?.034:0,.025,h*.68,.028);f.rotation.x=grip?-.93:-.14;
 }
 const thumb=oval(g,skin,-.093,-.042,.041,.035,.081,.036);thumb.rotation.z=-.41;
 batch(g);return g;
}
function person(scene,type,x,y,z,turn){
 const child=type===0,mom=type===1,root=group(scene,x,y,z);root.rotation.y=turn;
 const body=group(root),shirt=shirts[type],apron=aprons[type],width=child?.41:mom?.46:.52;
 const ground=child?-1.10-y:-2.24-y;
 const trousers=cloth(child?0x857663:mom?0x775f4e:0x424d4a);
 for(const side of [-1,1]){
   const leg=group(body,side*width*.46,0,0);
   surface(leg,trousers,[[ground+.11,.121,.13,0],[ground+.21,.143,.144,0],[ground*.55,.131,.14,.018],[ground*.26,.18,.171,0],[.14,.19,.181,-.016]],24);
   oval(leg,child?walnut:dark,0,ground+.104,.056,.14,.103,.226);
 }
 if(child){
   const step=group(body,0,ground-.064,0);
   box(step,walnut,0,0,0,1.03,.126,.88,.048);
   for(const sx of [-1,1])for(const sz of [-1,1])rod(step,walnut,[sx*.48,-1.07,sz*.41],[sx*.41,-.03,sz*.33],.046,.057);
   box(step,walnut,0,-.54,.378,.88,.086,.08);
 }
 const rings=[[-.53,width*.86,.275,0],[.1,width*.94,.288,0],[.48,width*.85,.244,0],[.86,width*.91,.25,0],[1.18,width*1.02,.269,0],[1.35,width*1.04,.235,-.014],[1.45,width*.91,.195,-.016],[1.53,width*.46,.151,0],[1.55,.124,.129,.01]];
 const shrink=child?.89:1;
 surface(body,shirt,rings.map(([y,w,d,z])=>[y*shrink,w,d,z]),48,(v,a)=>{v.z+=.012*Math.sin(9*a+v.y)*Math.min(1,Math.abs(v.y-.9));});
 surface(body,skin,[[1.36*shrink,.169,.15,0],[1.49*shrink,.122,.121,.012],[child?1.64:1.83,.115,.123,.035]]);
 // Fabric apron wraps the body and narrows at the bib.
 const A=child?1.21:1.34;
 if(type!==2){
   const pos=[],uv=[],index=[],spec=[[-.51,width*1.01,1.78,.286],[.27,width,.99,.287],[.58,width,.99,.265],[.91,width,.75,.286],[A,width,.60,.259]];
   for(let j=0;j<spec.length;j++)for(let i=0;i<=32;i++){
    const [h,w,a,d]=spec[j],u=i/32,theta=(u*2-1)*a;
    pos.push(w*Math.sin(theta),h+.009*Math.cos(theta),d*Math.cos(theta)+.016+.007*Math.sin(theta*12));
    uv.push(u,(h+.51)/1.9);if(i<32&&j<spec.length-1){let k=j*33+i;index.push(k,k+1,k+34,k,k+34,k+33);}
   }
   mesh(body,geometry(pos,index,uv),apron);
   for(const sign of [-1,1]){
    const a=sign*width*.55;
    line(body,apron,[[a,A-.035,.242],[a+sign*.022,A+.102,.179],[a+sign*.007,1.49*shrink,.02],[a,1.42*shrink,-.15]],.037,14,9);
    oval(body,brass,a,A-.028,.253,.026,.026,.008);
   }
   line(body,stitch,[[-width*.62,.49,.214],[-width*.37,.473,.274],[0,.47,.288],[width*.37,.473,.274],[width*.62,.49,.214]],.008,14);
 }else{
   for(const k of [-1,1]){
     const collar=oval(body,shirt,k*.107,1.474,.135,.082,.128,.025);collar.rotation.z=-k*.63;
   }
   line(body,shirt,[[0,.23,.29],[0,.7,.254],[0,1.15,.282],[0,1.44,.198]],.019);
   for(let i=0;i<5;i++)oval(body,walnut,.005,.45+i*.20,.273+.012*Math.cos(i),.021,.021,.009);
   box(body,shirt,-.24,1.10,.222,.213,.197,.03,.024).rotation.y=-.42;
 }
 const sh=child?1.19:1.33;
 // Resting arm and fingers are modeled as one stable pose.
 const sides=child?[-1]:[-1,1];
 for(const sign of sides){
    const shoulder=V(sign*width*.94,sh,0),elbow=V(sign*(width+.106),child?.85:.79,.11);
    const wrist=V(sign*width*(child?.85:.60),child?.72:.65,child?.37:.36);
    const sleeve=limbSegment(body,shirt,child?.121:.137,[[0,.84,.8],[.14,1.12,1.12],[.52,1,1.03],[1,.85,.85]]);
    setSegment(sleeve,shoulder,elbow);
    const fore=limbSegment(body,skin,child?.087:.097,[[0,.94,1],[.19,1.02,1],[.7,.75,.81],[1,.66,.69]]);
    setSegment(fore,elbow,wrist);
    oval(body,shirt,shoulder.x,shoulder.y,shoulder.z,.126,.127,.126);
    hand(body,[wrist.x,wrist.y-.05,wrist.z+.045],child?.72:.84,sign*.17);
 }
 batch(body,true);
 const head=makeHead(root,type);
 let arm=null;
 if(child){
   const shoulder=V(width*.94,sh,0);
   const upper=limbSegment(root,shirt,.135,[[0,.79,.8],[.14,1.09,1.03],[.48,1.1,1.04],[.83,.94,.98],[.93,.85,.90],[1,.87,.91]]);
   const fore=limbSegment(root,skin,.084,[[0,.91,1],[.17,1,1],[.68,.82,.81],[1,.65,.66]]);
   const palm=hand(root,[0,0,0],.75,-.58,true);
   arm={shoulder,upper,fore,palm};
 }
 root.updateWorldMatrix(true,true);
 return {root,head,arm,type,turn};
}
function family(scene){
 const cast=[person(scene,0,-.69,.46,-1.53,.22),person(scene,1,-1.69,.67,-2.58,.46),person(scene,2,1.33,.90,-2.71,-.42)];
 const focus=V(),childFace=V();let previous=0;
 return (time,joy,grip,bowl)=>{
  const follow=time===0?1:1-Math.exp(-Math.max(0,time-previous)*3.5);previous=time;
  cast[0].head.getWorldPosition(childFace);
  for(const {root,head,arm,type} of cast){
   const t=time+(type*2.3);
   const blinkPhase=(t+1.23)%(4.63+type*.49);
   const blink=blinkPhase<.21?Math.sin(Math.PI*blinkPhase/.21)**2:0;
   for(const eye of head.userData.eyes)eye.scale.y=(1-.9*blink)*(1-.22*joy);
   for(const o of head.userData.mouth.children)if(o.morphTargetInfluences)o.morphTargetInfluences[0]=joy;
   focus.copy(bowl);if(type!==0)focus.lerp(childFace,joy*.62);
   root.worldToLocal(focus);focus.sub(head.position);
   const pitch=Math.min(.54,Math.atan2(-focus.y,Math.hypot(focus.x,focus.z))*.82)+.012*Math.sin(t*.76)-joy*(.09+.064*Math.sin(time*2.6));
   const yaw=T.MathUtils.clamp(Math.atan2(focus.x,focus.z),-.54,.54)*.80;
   head.rotation.x+=(pitch-head.rotation.x)*follow;head.rotation.y+=(yaw-head.rotation.y)*follow;
   head.rotation.z=.017*Math.sin(t*.57)+joy*.051*Math.sin(t*2);
   head.position.y=(type===0?1.87:2.08)+.0045*Math.sin(t*1.4)+joy*.026*(.5+.5*Math.sin(t*2.8));
   if(!arm)continue;
   const w=root.worldToLocal(grip.clone()),s=arm.shoulder,axis=V().subVectors(w,s);let dist=axis.length();axis.normalize();
   const d=Math.min(dist,1.76),upper=.89,lower=.88;
   const along=(upper*upper-lower*lower+d*d)/(2*Math.max(.001,d));
   const pole=V(.73,-1,-.23);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const elbow=s.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(.005,upper*upper-along*along)));
   setSegment(arm.upper,s,elbow);setSegment(arm.fore,elbow,w);arm.palm.position.copy(w);arm.palm.rotation.x=-.68;
  }
 };
}
