const Family=(()=>{
  const {T,PI,TAU,group,mat,mesh,ball,rounded,tube,rod,cloth,M}=Studio;
  function shell(parent,rows,m,start=0,end=TAU,n=40){
    const p=[],uv=[],ix=[];
    rows.forEach(([y,rx,rz,z=0],j)=>{
      for(let i=0;i<=n;i++){
        const a=start+(end-start)*i/n;
        p.push(rx*Math.sin(a),y,z+rz*Math.cos(a));uv.push(i/n,j/(rows.length-1));
        if(i<n&&j<rows.length-1){const k=j*(n+1)+i;ix.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
      }
    });
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
    return mesh(parent,g,m);
  }
  function person(scene,who){
    const little=who===1,dad=who===2,root=group(scene),figure=group(root);
    const skin=mat([0xd7a381,0xe6b18a,0xc79774][who],.62), cheek=mat([0xdba384,0xe4a485,0xca9474][who],.69);
    const hair=mat([0x4c3229,0x68412d,0x4a3930][who],.59), strand=mat([0x604535,0x80523a,0x594438][who],.67);
    const shirt=little?cloth('#e6b64f','#ebcb75'):dad?cloth('#9bafac','#5b7778','check'):cloth('#bf8573','#cd9b83');
    const apron=cloth(little?'#657f9b':dad?'#4d6c70':'#798b6d',little?'#839bb3':dad?'#698588':'#95a48b');
    const hem=mat(little?0xc9b993:0xb0a284,.82), lips=mat(dad?0xa66c59:0xaf7162,.61);
    const ivory=mat(0xf1dbb8,.41), eye=mat(0x46372e,.24);
    const torso=[[.09,.25,.177],[.27,.33,.19],[.51,.276,.165],[.68,.285,.172],[.85,.335,.181],[.967,.32,.15],[1.035,.19,.135],[1.045,.115,.117]];
    shell(figure,torso,shirt);
    const ap=[[.092,.272,.197],[.26,.348,.21],[.48,.302,.184],[.60,.299,.193],[.69,.278,.195],[.78,.205,.196],[.901,.177,.187]];
    shell(figure,ap,apron,-1.48,1.48);
    for(const sign of [-1,1]){
      tube(figure,[[sign*.132,.88,.128],[sign*.146,1.012,.126],[sign*.16,1.04,.035],[sign*.16,1.01,-.105]],.023,apron);
      ball(figure,sign*.132,.883,.136,.014,.014,.009,M.brass);
    }
    const pocket=rounded(figure,.053,.413,.189,.21,.138,.013,.025,apron);pocket.rotation.y=.12;
    tube(figure,[[-.047,.476,.202],[.045,.469,.208],[.148,.469,.18]],.0035,hem);
    if(little){
      for(let i=0;i<5;i++){const a=i*TAU/5;const petal=ball(figure,.048+Math.cos(a)*.023,.427+Math.sin(a)*.022,.212,.008,.014,.003,M.porcelain);petal.rotation.z=a-PI/2;}
      ball(figure,.048,.427,.216,.007,.007,.004,M.ochre);
    }
    ball(figure,0,1.055,0,.088,.158,.093,skin);
    const head=group(figure,0,1.30,.012);
    const hw=little?1.09:dad?1.045:1;
    head.scale.set(hw,little?1.0:1.07,hw);
    shell(head,[[-.244,.04,.055,.025],[-.225,.100,.096,.03],[-.171,.143,.14,.017],[-.088,.173,.166,.01],[.032,.184,.177],[.129,.179,.171],[.206,.149,.14],[.247,.078,.077],[.254,.006,.006]],skin);
    for(let side of [-1,1]){
      const ear=ball(head,side*.177,-.028,.002,.039,.065,.029,skin);ear.rotation.z=-side*.15;
      ball(head,side*.197,-.025,.022,.013,.029,.007,cheek);
      if(who===0)ball(head,side*.185,-.086,.013,.012,.014,.011,M.brass);
      const brow=[[side*.033,.046,.173],[side*.069,.056,.167],[side*.113,.046,.146]];
      tube(head,brow,dad?.009:.006,hair,12);
    }
    const eyes=[];
    for(const side of [-1,1]){
      const eyelid=group(head,side*.073,.003,.161);
      eyelid.rotation.y=side*.33;
      ball(eyelid,0,0,0,.036,.015,.009,ivory);
      ball(eyelid,-side*.002,-.001,.009,.013,.013,.004,eye);
      ball(eyelid,-.003,.003,.013,.003,.003,.001,M.white);
      tube(eyelid,[[-.036,0,.002],[0,.014,.008],[.036,.001,.002]],.0038,hair,10);
      eyes.push(eyelid);
      ball(head,side*.115,-.055,.129,.042,.023,.009,cheek).rotation.y=side*.63;
    }
    ball(head,0,-.039,.173,.022,.053,.027,skin);
    ball(head,0,-.064,.192,.029,.021,.021,skin);
    tube(head,[[-.048,-.126,.143],[-.022,-.134,.153],[0,-.135,.157],[.024,-.132,.153],[.046,-.123,.143]],.0046,lips,16);
    // Hairline rises across the forehead and falls behind the ears.
    const verts=[],indices=[];
    for(let j=0;j<=16;j++)for(let i=0;i<=48;i++){
      const a=i*TAU/48, forehead=Math.cos(a);
      const bound=1.95-.97*forehead+.12*Math.sin(3*a+.4)+.045*Math.cos(7*a);
      const phi=.007+(bound-.007)*j/16;
      verts.push(.193*Math.sin(phi)*Math.sin(a),.027+.254*Math.cos(phi),.183*Math.sin(phi)*Math.cos(a)-.013);
      if(j<16&&i<48){const k=j*49+i;indices.push(k,k+49,k+1,k+1,k+49,k+50);}
    }
    const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(verts,3));hg.setIndex(indices);hg.computeVertexNormals();hair.side=T.DoubleSide;mesh(head,hg,hair);
    for(let i=0;i<16;i++){
      const a=(i-7.5)*.16, points=[];
      for(let j=0;j<=6;j++){
        const f=j/6,ang=a+.52*(1-f),ph=.21+f*(1.72-.88*Math.cos(a)+.11*Math.sin(a*3+.4));
        points.push([.197*Math.sin(ph)*Math.sin(ang),.029+.254*Math.cos(ph),.185*Math.sin(ph)*Math.cos(ang)-.013]);
      }
      tube(head,points,i%3===0?.006:.003,i%3===0?hair:strand,12,5);
    }
    if(who===0){
      ball(head,0,.09,-.198,.151,.143,.113,hair);
      for(let i=0;i<5;i++)ball(head,-.095+i*.046,.096,-.242,.054,.107,.067,i%2?strand:hair);
    }
    if(little)for(const sign of [-1,1]){
      ball(head,sign*.156,-.077,-.075,.073,.085,.067,hair);
      ball(head,sign*.183,-.127,-.044,.059,.029,.054,mat(0xd8a944,.72));
      for(let j=0;j<3;j++)ball(head,sign*(.187+.016*Math.sin(j)),-.158-j*.046,-.038+j*.014,.05-j*.008,.057,.044,iHair(j));
    }
    function iHair(j){return j%2?strand:hair;}
    if(dad){
      for(const sign of [-1,1]){
        const points=[];for(let i=0;i<=24;i++){const a=i*TAU/24;points.push([sign*.078+.055*Math.cos(a),.007+.040*Math.sin(a),.184-sign*.016*Math.cos(a)]);}
        tube(head,points,.004,M.brass,32);
        tube(head,[[sign*.131,.012,.162],[sign*.177,.017,.081],[sign*.185,.002,-.002]],.004,M.brass);
      }
      tube(head,[[-.024,.009,.182],[0,.016,.19],[.024,.009,.182]],.004,M.brass);
    }
    const arms=[];
    for(let sign of [-1,1]){
      const shoulder=group(figure,sign*.272,.936,.003);
      shoulder.rotation.z=sign*.16;
      const elbow=group(shoulder,sign*.075,-.285,.041);
      rod(shoulder,[0,0,0],[sign*.075,-.285,.041],.113,shirt,.076);
      ball(shoulder,0,0,0,.119,.107,.113,shirt);
      ball(elbow,0,0,0,.077,.079,.079,shirt);
      rod(elbow,[0,0,.006],[-sign*.033,-.21,.102],.078,shirt,.056);
      rod(elbow,[-sign*.033,-.21,.102],[-sign*.041,-.25,.123],.059,shirt,.059);
      const palm=group(elbow,-sign*.041,-.274,.138);
      ball(palm,0,0,0,.056,.067,.035,skin);
      for(let i=0;i<4;i++)ball(palm,(i-1.5)*.022,-.058+Math.abs(i-1.5)*.007,.008,.012,.037-i*.001,.014,skin);
      const thumb=ball(palm,-sign*.05,-.014,.018,.022,.042,.021,skin);thumb.rotation.z=-sign*.44;
      arms.push({shoulder,elbow,palm});
    }
    // The child stands on a kitchen step. All three bodies continue below the island.
    for(let sign of [-1,1])ball(figure,sign*.135,-.25,-.008,.134,.43,.14,mat(0x596664,.78));
    return {root,figure,head,eyes,arms,who,blink:2+who*.83,look:0};
  }
  function layout(people,narrow){
    people.forEach((p,i)=>{
      const sc=[.94,.77,1.02][i], x=(i-1)*(narrow?.69:1.32);
      p.root.position.set(x,[.25,.17,.22][i],i===1?-1.82:-2.67);
      p.figure.scale.setScalar(sc);
      p.figure.rotation.y=(1-i)*.19;
    });
  }
  const tip=new T.Vector3(),mouth=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),delta=new T.Quaternion();
  function bringForkToMouth(p,arm,t) {
    const weight=T.MathUtils.smoothstep(t,.08,.72)*(1-T.MathUtils.smoothstep(t,1.09,1.62));
    if(weight===0)return;
    p.head.localToWorld(mouth.set(0,-.13,.173));
    const joints=[arm.palm,arm.elbow,arm.shoulder];
    for(let pass=0;pass<5;pass++)for(const joint of joints) {
      p.morsel.getWorldPosition(tip);
      joint.parent.worldToLocal(from.copy(tip)).sub(joint.position).normalize();
      joint.parent.worldToLocal(to.copy(mouth)).sub(joint.position).normalize();
      delta.setFromUnitVectors(from,to);joint.quaternion.premultiply(delta);
    }
    for(let i=0;i<3;i++)joints[i].quaternion.slerp(arm.resting[i],1-weight);
  }
  function act(people,s,dt,focus){
    for(const p of people) {
      const target=Math.atan2(focus.x-p.root.position.x,focus.z-p.root.position.z)*.69;
      p.head.rotation.y=PancakePhysics.relax(p.head.rotation.y,target-p.figure.rotation.y,3,dt);
      const eating=s.phase==='eat' && p.who===[1,0,2][s.servings];
      const bite=eating?Math.sin(Math.min(1,s.biteTime/1.65)*PI):0;
      p.head.rotation.x=PancakePhysics.relax(p.head.rotation.x,.16+(p.who===1?.09:0)+bite*.14,2.6,dt);
      p.blink-=dt;if(p.blink<-.15)p.blink=2.9+Studio.rand()*3.3;
      p.eyes.forEach(o=>o.scale.y=p.blink<0?.14:1);
      p.arms.forEach((arm,i)=>{
        const {elbow,shoulder,palm}=arm;
        if(arm.resting){palm.quaternion.copy(arm.resting[0]);elbow.quaternion.copy(arm.resting[1]);shoulder.quaternion.copy(arm.resting[2]);}
        const guide=(i===0&&p.who===1)?1:0, engaged=s.phase==='mix'?Math.min(1,Math.abs(s.bowl.swirl)/5):0;
        shoulder.rotation.x=PancakePhysics.relax(shoulder.rotation.x,-.12-guide*(.28+engaged*.18)-(i===1?bite*.82:0),4,dt);
        elbow.rotation.x=PancakePhysics.relax(elbow.rotation.x,-.25-(p.who!==2&&i===0?.48:0)-guide*.27-(i===1?bite*1.26:0),4,dt);
        if(p.fork && i===1){
          p.fork.visible=eating;
          if(!arm.resting)arm.resting=[new T.Quaternion(),new T.Quaternion(),new T.Quaternion()];
          arm.resting[0].copy(palm.quaternion);arm.resting[1].copy(elbow.quaternion);arm.resting[2].copy(shoulder.quaternion);
          if(eating)bringForkToMouth(p,arm,s.biteTime);
        }
      });
    }
  }
  return {person,layout,act};
})();
