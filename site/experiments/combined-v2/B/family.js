'use strict';
const Family = (() => {
  const {T,V,scene,M,mat,obj,mesh,ball,lathe,rod,tube,rnd,texture}=Studio;
  const tau=Math.PI*2;
  function surface(parent,m,nu,nv,point){
    const xyz=[],uv=[],index=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
      xyz.push(...point(i/nu,j/nv));uv.push(i/nu,j/nv);
      if(i&&j){const a=j*(nu+1)+i;index.push(a-1,a-nu-2,a-nu-1,a-1,a-nu-1,a);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
    m.side=T.DoubleSide;return mesh(parent,g,m);
  }
  function splineBody(p,rows,m) {
    const shape=new T.CatmullRomCurve3(rows.map(([y,x,z])=>V(x,y,z)));
    return surface(p,m,52,32,(u,v)=>{
      const a=u*tau,r=shape.getPoint(v),wrinkle=1+.012*Math.sin(9*a+.8*Math.sin(v*6))*Math.pow(1-v,.8);
      return [Math.sin(a)*r.x*wrinkle,r.y,Math.cos(a)*r.z*wrinkle];
    });
  }
  function person(role,x,z,scale,y){
    const kid=role==='child',dad=role==='father';
    const base=obj(scene,x,y,z);base.scale.setScalar(scale);
    const body=obj(base), skin=mat(kid?0xeac0a5:dad?0xc3987d:0xe2b69c,.58),
      lip=mat(kid?0xcb9482:0xbd8b7a,.56), hair=mat(dad?0x493d32:kid?0x51392d:0x624536,.58),
      strands=mat(dad?0x5a4b3c:kid?0x6a4a36:0x795643,.64);
    const cotton=mat(kid?0xe6ddc5:dad?0x98a7a7:0xe2ddd3,.91,0,{bumpMap:M.linen.bumpMap,bumpScale:.004});
    if(dad){const stripe=texture((a,b)=>b%20<3?185:250,160,true);stripe.repeat.set(1,2);cotton.map=stripe;}
    const apron=mat(kid?0xc2ad85:dad?0x9e9480:0x9ba99a,.94,0,{bumpMap:M.linen.bumpMap,bumpScale:.005});
    const seam=mat(kid?0xd6c39d:0xc3c0a9,.88);
    const w=kid?.40:dad?.51:.437;
    splineBody(body,[[-.93,w*.81,.24],[-.45,w*.92,.265],[.04,w*.84,.245],[.35,w*.91,.262],[.61,w,.264],[.76,w*.90,.214],[.82,.16,.15]],cotton);
    // Front apron panel narrows naturally at the bib and curls around the waist.
    surface(body,apron,38,32,(u,v)=>{
      const a=(u-.5)*(v<.55?2.68:2.68-(v-.55)*2.7),rr=w*(1.04-.12*v);
      return [rr*Math.sin(a),-.86+v*1.59,.025+(.284+.024*Math.cos(a*7)*(1-v))*Math.cos(a)+.013*v];
    });
    for(const sg of [-1,1]){
      tube(body,[[sg*.202,.70,.238],[sg*.217,.79,.193],[sg*.202,.841,.03],[sg*.22,.786,-.16]],.031,apron);
      ball(body,sg*.198,.706,.245,.025,.025,.009,M.brass);
      tube(body,[[sg*w*.93,.023,.105],[sg*w*.94,.025,.032],[sg*w*.95,.03,-.14]],.033,apron);
    }
    tube(body,[[-.205,-.24,.279],[-.13,-.267,.305],[.03,-.272,.319],[.205,-.24,.276]],.006,seam);
    ball(body,0,.83,0,.134,.225,.136,skin);
    Studio.batch(body);
    const head=obj(body,0,kid?1.102:1.15,.006),hs=kid?1.16:1;
    head.scale.setScalar(hs);const fw=dad?.282:.263,fh=kid?.323:.35,fd=.245;
    function facePoint(a,b){
      const cy=Math.cos(b),sy=Math.sin(b),nx=Math.sin(a)*sy,nz=Math.cos(a)*sy;
      const jaw=cy<0?1-.22*cy*cy:1;
      const cheek=.012*Math.exp(-((Math.abs(nx)-.54)**2/.034+(cy+.12)**2/.07))*Math.max(0,nz);
      return [fw*nx*jaw,fh*cy,fd*nz+cheek-.019*Math.max(0,-cy)];
    }
    surface(head,skin,56,40,(u,v)=>facePoint(u*tau,(1-v)*Math.PI));
    for(const sg of [-1,1]){
      ball(head,sg*(fw-.008),-.009,-.002,.043,.073,.046,skin);
      ball(head,sg*(fw+.018),-.006,.017,.013,.042,.021,lip);
    }
    const white=mat(0xeae1d4,.38),iris=mat(0x614938,.30),pupil=mat(0x292820,.23),lash=mat(0x775744,.64);
    for(const sg of [-1,1]){
      const eye=obj(head,sg*.100,.029,.219);eye.rotation.y=sg*.34;
      ball(eye,0,0,0,.050,.021,.019,white);
      ball(eye,-sg*.004,-.003,.017,.017,.016,.005,iris);
      ball(eye,-sg*.004,-.004,.021,.008,.010,.003,pupil);
      ball(eye,-.004,.003,.024,.004,.0038,.002,M.china);
      tube(eye,[[-.049,-.002,0],[-.025,.015,.013],[0,.020,.018],[.031,.014,.009],[.05,-.001,-.001]],.0038,lash);
      tube(eye,[[-.047,.052,-.001],[-.023,.064,.009],[.012,.066,.007],[.045,.054,-.003]],dad?.010:.0078,hair);
    }
    const nose=ball(head,0,-.003,.238,.031,.074,.031,skin);nose.rotation.x=-.20;
    ball(head,0,-.045,.260,.038,.031,.034,skin);
    for(const sg of [-1,1])ball(head,sg*.029,-.054,.247,.018,.016,.018,skin);
    const smile=mat(0xa77563,.69);
    tube(head,[[-.060,-.121,.212],[-.034,-.129,.222],[0,-.132,.226],[.031,-.13,.221],[.060,-.120,.213]],.0048,smile);
    const lowerLip=ball(head,0,-.140,.219,.041,.009,.007,lip);
    function hairline(a){return 1.75-.72*Math.cos(a)+.105*Math.sin(a*2+.35)+.039*Math.cos(a*4);}
    function hairPt(a,b,extra=0){
      const s=Math.sin(b);return [(fw+.018+extra)*s*Math.sin(a), (fh+.028+extra)*Math.cos(b)+.008,(fd+.018+extra)*s*Math.cos(a)-.006];
    }
    surface(head,hair,68,34,(u,v)=>{const a=u*tau;return hairPt(a,(1-v)*hairline(a));});
    for(let i=0;i<40;i++){
      const end=(i+.3*rnd())*tau/40,pts=[];
      for(let j=0;j<=9;j++){
        const t=j/9,a=end+(.72+Math.sin(end)*.22)*(1-t),b=.24+(hairline(end)-.24)*t;
        pts.push(hairPt(a,b,.002));
      }
      tube(head,pts,.002+rnd()*.0014,strands,13,4);
    }
    if(kid){
      for(const sg of [-1,1]){
        const pig=ball(head,sg*.236,-.042,-.134,.087,.167,.083,hair);pig.rotation.z=sg*.39;
        ball(head,sg*.221,.051,-.131,.065,.029,.059,apron);
      }
    }else if(!dad){
      ball(head,.015,.025,-.244,.148,.156,.130,hair);
      for(let i=0;i<6;i++){const a=i*.75;tube(head,[[.143*Math.cos(a),.12,-.237],[.139*Math.cos(a+.43),.071,-.31],[.08*Math.cos(a+.95),-.02,-.35]],.007,strands);}
    }
    lowerLip.removeFromParent();Studio.batch(head);head.add(lowerLip);
    const opening=ball(head,0,-.132,.219,.047,.001,.006,smile);
    const arms=[];
    for(const sg of [-1,1]){
      const shoulder=V(sg*w*.88,.66,0),elbow=V(),hand=obj(body);
      const sleeve=ball(body,0,0,0,1,1,1,cotton),fore=ball(body,0,0,0,1,1,1,skin),cuff=ball(body,0,0,0,1,1,1,cotton);
      ball(hand,0,0,0,.072,.052,.097,skin);
      for(let k=0;k<4;k++){const finger=ball(hand,(k-1.5)*.031,-.014,.082-.013*Math.abs(k-1.5),.017,.024,.063-.009*Math.abs(k-1.5),skin);finger.rotation.x=.21;}
      const thumb=ball(hand,-sg*.067,-.005,.035,.026,.028,.063,skin);thumb.rotation.y=-sg*.51;
      Studio.batch(hand);
      arms.push({sg,shoulder,elbow,hand,sleeve,fore,cuff,pos:V(sg*w,.16,.28)});
    }
    return {role,base,body,head,lowerLip,opening,arms,w,start:x,y,z};
  }
  const people=[person('mother',-2.79,-1.40,1.33,.60),person('father',-.26,-1.91,1.4,.62),person('child',-1.55,-1.11,1.03,.12)];
  const up=V(0,1,0);
  function segment(o,start,end,width){
    o.position.copy(start).lerp(end,.5);
    const dir=end.clone().sub(start);o.scale.set(width,dir.length()*.57,width*.94);
    o.quaternion.setFromUnitVectors(up,dir.normalize());
  }
  function update(dt,s,focus,toolPos,eatingPose){
    const mix=['milk','mix'].includes(s.phase), meal=['eat','lastBite'].includes(s.phase);
    for(let i=0;i<3;i++){
      const p=people[i],kid=i===2,k=1-Math.exp(-dt*3.0);
      const groupX=mix?-1.60:s.phase==='wash'||s.phase==='drain'?-4.05:focus.x;
      const x=groupX+(p.start+1.60)*(meal?.85:1);
      p.base.position.x+=(x-p.base.position.x)*k*.49;
      const mouthOpen=eatingPose&&eatingPose.person===i?eatingPose.open:0;
      p.opening.scale.y=.001+.015*mouthOpen;
      p.lowerLip.position.y=-.140-.017*mouthOpen;
      const target=eatingPose && eatingPose.person===i? eatingPose.pos:focus;
      const dx=target.x-p.base.position.x,dz=target.z-p.z;
      const yaw=Math.atan2(dx,Math.max(.38,dz));
      p.body.rotation.y+=(T.MathUtils.clamp(yaw*.55,-.63,.63)-p.body.rotation.y)*k;
      p.head.rotation.y+=(T.MathUtils.clamp(yaw-p.body.rotation.y,-.68,.68)-p.head.rotation.y)*k;
      p.head.rotation.x+=(T.MathUtils.clamp((p.base.position.y+1.16*p.base.scale.y-target.y)*.32,.06,.55)-p.head.rotation.x)*k;
      p.base.updateMatrixWorld(true);
      for(const a of p.arms){
        const active=(kid&&a.sg===1)||(mix&&i===0&&a.sg===1)||(!mix&&!kid&&i===1&&a.sg===-1);
        let dest=V(a.sg*p.w*.94,.04,.25);
        if(active){
          const grip=i===0&&s.phase==='milk'?Food.pitcher.localToWorld(V(-.32,.39,0)):(kid?toolPos:focus);
          dest=p.body.worldToLocal(grip.clone());
          if(!kid)dest.z-=.19;
        }
        if(eatingPose&&eatingPose.person===i&&a.sg===1)dest=p.body.worldToLocal(eatingPose.pos.clone());
        const dir=dest.clone().sub(a.shoulder),reach=kid?1.01:1.14;
        dir.clampLength(.24,reach);dest.copy(a.shoulder).add(dir);a.pos.lerp(dest,k*1.5>1?1:k*1.5);
        a.elbow.copy(a.shoulder).lerp(a.pos,.49);a.elbow.y-=Math.max(.08,.28*(1-dir.length()/reach)+.11);a.elbow.x+=a.sg*.095;
        segment(a.sleeve,a.shoulder,a.elbow,kid?.122:.140);
        segment(a.fore,a.elbow,a.pos,kid?.073:.083);
        const ca=a.shoulder.clone().lerp(a.elbow,.84);segment(a.cuff,ca,a.elbow,kid?.107:.120);
        a.hand.position.copy(a.pos);a.hand.rotation.x=active?.16:.57;a.hand.rotation.y=a.sg*-.19;
      }
    }
  }
  return {people,update};
})();
