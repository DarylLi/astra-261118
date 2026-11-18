'use strict';
const Toys = (() => {
  const {T,PI,TAU,group,mesh,mat,box,cyl,sphere,torus,ring,rod,tube,shape,M,bolt,batch}=Craft;
  const paintRed=mat(0xb83f2e,.52,.33), redTrim=mat(0x79342c,.57,.39);
  const paintBlue=mat(0x47798c,.57,.35),blueTrim=mat(0x344f5a,.58,.40);
  const enamel=mat(0xe3d7b5,.43,.38);
  const optic=mat(0x17272a,.64,.15);
  const amber=mat(0xf9cc79,.24,.22,{emissive:0xe6a84d,emissiveIntensity:.4});
  function frontDisc(p,x,y,z,r,d,m,segments=40){
    const o=cyl(p,r,r,d,m,x,y,z,segments);o.rotation.x=PI/2;return o;
  }
  function sideDisc(p,x,y,z,r,d,m,segments=40){
    const o=cyl(p,r,r,d,m,x,y,z,segments);o.rotation.z=PI/2;return o;
  }
  function coil(parent,a,b,radius,turns,wire) {
    const start=new T.Vector3(...a),axis=new T.Vector3(...b).sub(start),up=axis.clone().normalize();
    const cross=new T.Vector3(0,0,1).cross(up).normalize(),other=new T.Vector3().crossVectors(up,cross);
    const points=[];
    for(let i=0;i<=turns*12;i++){
      const u=i/(turns*12),angle=u*turns*TAU;
      points.push(start.clone().addScaledVector(axis,u).addScaledVector(cross,Math.cos(angle)*radius).addScaledVector(other,Math.sin(angle)*radius).toArray());
    }
    return tube(parent,points,wire,M.bright,turns*15);
  }
  function tracks(parent,scale=1) {
    const g=group(parent);g.scale.setScalar(scale);
    box(g,.66,.205,.45,M.iron,0,-.005,0,.055);
    for(const z of [-.22,.22])sideDisc(g,0,0,z,.068,.93,M.bright);
    box(g,.43,.061,.31,M.brass,0,.116,.01,.029);
    for(const side of [-1,1]){
      const x=side*.475;
      box(g,.29,.38,.97,M.black,x,.01,0,.167);
      box(g,.31,.217,.81,M.iron,x,.012,0,.096);
      const face=x+side*.162;
      for(let i=-1;i<=1;i++){
        sideDisc(g,face,0,i*.273,.113,.028,M.brass);
        sideDisc(g,face+side*.022,0,i*.273,.067,.026,M.iron);
        sideDisc(g,face+side*.038,0,i*.273,.029,.022,M.bright);
      }
    }
    batch(g);
    const cleats=new T.InstancedMesh(new T.BoxGeometry(.304,.034,.049),M.iron,48);
    cleats.castShadow=true;cleats.receiveShadow=true;cleats.frustumCulled=false;g.add(cleats);
    const jig=new T.Object3D(), straight=.621,r=.169,arc=PI*r,length=2*(straight+arc);
    g.userData.drive=function(distance){
      for(let i=0;i<48;i++){
        let k=((i%24)/24*length+distance)%length;if(k<0)k+=length;
        let z,y,angle;
        if(k<straight){z=k-straight/2;y=r;angle=0;}
        else if(k<straight+arc){angle=(k-straight)/r;z=straight/2+r*Math.sin(angle);y=r*Math.cos(angle);}
        else if(k<2*straight+arc){z=straight/2-(k-straight-arc);y=-r;angle=PI;}
        else{angle=PI+(k-2*straight-arc)/r;z=-straight/2+r*Math.sin(angle);y=r*Math.cos(angle);}
        jig.position.set(i<24?-.475:.475,y,z);jig.rotation.x=angle;jig.updateMatrix();cleats.setMatrixAt(i,jig.matrix);
      }
      cleats.instanceMatrix.needsUpdate=true;
    };
    g.userData.drive(0);return g;
  }
  function bigArms(parent) {
    const g=group(parent);
    box(g,1.18,.156,.16,M.iron,0,.065,-.158,.06);
    box(g,.28,.201,.19,M.brass,0,.069,-.142,.045);
    for(const k of [-1,1]){
      const h=group(g,k*.68,0,0);
      box(h,.47,.50,.58,paintRed,0,0,.04,.16);
      box(h,.49,.12,.56,M.cream,0,-.093,.04,.05);
      frontDisc(h,0,.054,.344,.111,.021,M.brass);
      frontDisc(h,0,.054,.363,.059,.019,M.iron);
    }
    batch(g);return g;
  }
  function windKey(parent) {
    const anchor=group(parent,-.20,1.09,-.355);
    const axis=new T.Vector3(-.34,.12,-.91).normalize(), normal=new T.Vector3(-.70,.25,.75);
    const x=new T.Vector3().crossVectors(axis,normal).normalize(),z=new T.Vector3().crossVectors(x,axis);
    anchor.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,axis,z));
    cyl(anchor,.17,.22,.155,M.iron,0,.055,0);
    cyl(anchor,.128,.165,.10,M.brass,0,.165,0);
    const rotor=group(anchor);
    cyl(rotor,.077,.092,.46,M.bright,0,.38,0);
    for(const y of [.22,.29,.53])ring(rotor,.091,.018,M.brass,0,y);
    const outline=new T.Shape();outline.moveTo(-.085,.49);
    outline.lineTo(-.095,.64);outline.bezierCurveTo(-.22,.57,-.44,.567,-.47,.78);
    outline.bezierCurveTo(-.53,1.036,-.256,1.16,-.081,1.016);
    outline.quadraticCurveTo(0,.952,.081,1.016);outline.bezierCurveTo(.256,1.16,.53,1.036,.47,.78);
    outline.bezierCurveTo(.44,.567,.22,.57,.095,.64);outline.lineTo(.085,.49);outline.closePath();
    for(const sign of [-1,1]){const path=new T.Path();path.absellipse(sign*.281,.860,.112,.124,0,TAU,true,.10*sign);outline.holes.push(path);}
    const m=mat(0xe3ad4d,.75,.25,{emissive:0xb27527,emissiveIntensity:.10});
    const wing=shape(rotor,outline,.068,m,.025);wing.position.z=-.033;
    const tip=group(anchor,0,.86,.02);
    batch(rotor);return {anchor,rotor,tip,m};
  }
  function robot(parent,isRed) {
    const color=isRed?paintRed:paintBlue, trim=isRed?redTrim:blueTrim;
    const root=group(parent), frame=group(root), base=group(frame), body=group(frame);
    const leftRight=[-1,1], wheels=[];
    // Heavy rounded shoes with formed toe caps and exposed winding drums.
    for(const side of leftRight) {
      const x=side*.355, shoe=group(base,x,.025,.035);
      box(shoe,.574,.108,.889,M.dark,0,.062,.017,.048);
      box(shoe,.563,.264,.867,color,0,.195,0,.108);
      box(shoe,.568,.052,.848,trim,0,.116,.008,.023);
      box(shoe,.478,.087,.32,enamel,0,.245,.263,.038);
      cyl(shoe,.122,.125,.22,M.steel,0,.401,-.045);
      ring(shoe,.125,.025,M.dark,0,.394,-.045);
      for(const zz of [-.245,.244]) {
        const w=group(root,x+side*.277,.143,zz+.03);wheels.push(w);
        sideDisc(w,0,0,0,.123,.074,M.dark);
        sideDisc(w,side*.04,0,0,.086,.025,M.brass);
        sideDisc(w,side*.06,0,0,.033,.018,M.iron);
        for(let i=0;i<3;i++){
          const a=i*TAU/3;
          sideDisc(w,side*.056,Math.cos(a)*.054,Math.sin(a)*.054,.015,.012,M.iron,12);
        }
        batch(w);
      }
    }
    batch(base);
    // Lower flywheel housing, enamel lap seam, brass retaining screws.
    box(body,.86,.25,.60,M.iron,0,.53,-.018,.103);
    box(body,isRed?1.12:1.01,.86,.735,color,0,1.032,-.035,.178);
    box(body,isRed?1.129:1.023,.123,.74,trim,0,.756,-.035,.053);
    box(body,.80,.072,.065,M.bright,0,.753,.337,.028);
    for(const side of leftRight){bolt(body,side*.435,1.31,.305,.037,M.brass);bolt(body,side*.427,.812,.325,.029,M.steel);}
    if(isRed) {
      // The dial needle is mechanically coupled to spring deflection.
      frontDisc(body,0,1.088,.341,.255,.07,M.dark);
      frontDisc(body,0,1.088,.396,.230,.047,M.brass);
      frontDisc(body,0,1.088,.426,.191,.015,enamel);
      torus(body,.198,.014,M.bright,0,1.088,.439);
      for(let i=0;i<9;i++){
        const a=-1.32+i*.33;
        const tick=box(body,.011,.039,.009,i>6?paintRed:M.iron,Math.sin(a)*.154,1.088+Math.cos(a)*.154,.439,.003);
        tick.rotation.z=-a;
      }
    } else {
      box(body,.656,.448,.069,enamel,0,1.09,.334,.032);
      for(let i=0;i<4;i++)box(body,.401-Math.abs(i-1.5)*.036,.044,.034,M.iron,0,.985+i*.075,.382,.018);
      for(const a of [-1,1])bolt(body,a*.267,1.097,.378,.029,M.brass);
    }
    for(const side of leftRight){
      box(body,.092,.24,.057,enamel,side*.405,1.099,.324,.027);
      sideDisc(body,side*.566,1.23,-.028,.182,.133,M.dark);
      sideDisc(body,side*.629,1.23,-.028,.135,.07,M.brass);
    }
    cyl(body,.20,.246,.179,M.iron,0,1.518,-.03);ring(body,.197,.028,M.bright,0,1.544,-.03);
    coil(body,[0,1.46,-.03],[0,1.68,-.03],.183,4,.017);
    for(const side of leftRight)coil(body,[side*.53,1.26,0],[side*.74,1.26,0],.094,3,.016);
    batch(body);
    const needle=group(body,0,1.087,.456);
    box(needle,.023,.138,.012,paintRed,0,.057,0,.005);frontDisc(needle,0,0,.011,.035,.02,M.iron);
    needle.visible=isRed;batch(needle);

    const head=group(frame,0,1.596,-.017);
    const shell=group(head), hw=isRed?1.34:1.23, hh=isRed?.779:.845;
    box(shell,hw,hh,.855,color,0,hh*.49,0,.184);
    // Raised wraparound rim and a recessed, dark eye surround.
    box(shell,hw+.013,.061,.862,trim,0,.16,0,.029);
    box(shell,hw-.098,hh-.184,.163,M.bright,0,hh*.51,.365,.078);
    box(shell,hw-.167,hh-.253,.158,isRed?enamel:M.cream,0,hh*.51,.413,.077);
    box(shell,hw-.274,.347,.086,mat(0x3a403a,.52,.40),0,hh*.555,.488,.042);
    for(const side of leftRight) {
      bolt(shell,side*(hw*.5-.148),hh*.51+.205,.476,.027,M.iron);
      bolt(shell,side*(hw*.5-.148),hh*.51-.183,.478,.026,M.iron);
    }
    const eyes=[];
    for(const side of leftRight) {
      const x=side*(isRed?.283:.252), y=hh*.564;
      frontDisc(shell,x,y,.527,.200,.068,M.iron);
      torus(shell,.170,.024,M.brass,x,y,.572);
      sphere(shell,.151,.151,.068,optic,x,y,.57);
      const eye=group(head,x,y,.633);eyes.push(eye);
      sphere(eye,.072,.088,.031,isRed?amber:enamel,0,0,0);
      sphere(eye,.027,.033,.013,optic,.012,.007,.03);
      sphere(eye,.014,.016,.009,mat(0xffefd2,.15,.20,{emissive:0xffe8c1,emissiveIntensity:.28}),-.014,.032,.028);
      batch(eye);
    }
    // A curved grille gives both little machines a smiling mouth.
    tube(shell,[[-.115,.188,.497],[-.053,.164,.510],[.022,.159,.512],[.093,.184,.502]],.016,M.dark);
    if(isRed){
      box(shell,.54,.037,.36,trim,0,.785,-.054,.016);
      for(const x of [-.14,0,.14])box(shell,.041,.015,.229,M.dark,x,.807,-.047,.007);
    }else{
      cyl(shell,.30,.413,.076,blueTrim,0,.845,-.013);
      cyl(shell,.212,.272,.047,M.steel,0,.896,-.013);
    }
    for(const side of leftRight)coil(shell,[side*(hw/2-.035),hh*.51,-.021],[side*(hw/2+.123),hh*.51,-.021],.099,3,.013);
    batch(shell);
    const ears=[];
    for(const side of leftRight) {
      const e=group(head,side*hw*.5,hh*.51,-.021);ears.push(e);
      sideDisc(e,side*.023,0,0,.210,.117,M.dark);
      sideDisc(e,side*.104,0,0,.183,.111,M.brass);
      sideDisc(e,side*.166,0,0,.133,.064,color);
      sideDisc(e,side*.205,0,0,.065,.028,M.bright);
      batch(e);
    }
    const aerial=group(head,isRed?-.335:.20,isRed?.764:.888,-.075);
    cyl(aerial,.075,.096,.092,M.brass,0,.035,0);
    rod(aerial,[0,.05,0],[-.026,.244,.003],.024,M.bright);
    sphere(aerial,.084,.083,.084,isRed?amber:blueTrim,-.03,.277,0);batch(aerial);
    const arms=[];
    for(const side of leftRight) {
      const arm=group(frame,side*.634,1.258,-.002);arms.push(arm);
      sideDisc(arm,side*.032,-.012,0,.17,.151,trim);
      sphere(arm,.161,.181,.167,color,side*.077,-.078,.016);
      const aa=[side*.083,-.126,.025],bb=[side*.134,-.373,.095];rod(arm,aa,bb,.077,M.bright);
      for(let i=0;i<4;i++)cyl(arm,.107,.107,.034,i%2?M.iron:M.steel,side*(.09+i*.011),-.158-i*.056,.041+i*.014);
      const glove=group(arm,side*.139,-.462,.153);glove.rotation.x=-.17;
      box(glove,.292,.27,.301,trim,0,0,0,.091);
      box(glove,.316,.258,.319,color,0,-.047,.03,.101);
      box(glove,.25,.062,.147,M.bright,0,-.125,.143,.027);
      sphere(glove,.095,.095,.113,M.brass,-side*.106,.014,.129);
      batch(arm);
    }
    const key=isRed?windKey(frame):null;
    const upgradeTracks=isRed?tracks(frame):null,upgradeArms=isRed?bigArms(frame):null;
    if(isRed){upgradeTracks.position.y=.223;upgradeTracks.visible=false;upgradeArms.position.set(0,.813,.172);upgradeArms.visible=false;}
    return {root,frame,base,body,head,eyes,ears,aerial,arms,wheels,key,needle,upgradeTracks,upgradeArms};
  }
  function guide(parent) {
    // A small ivory demonstration hand: the tip is the local origin.
    const g=group(parent),m=mat(0xffe4b5,.14,.38,{emissive:0xf4c581,emissiveIntensity:.16});
    sphere(g,.162,.191,.087,m,.084,.425,0);
    rod(g,[0,.035,.015],[0,.366,.0],.056,m,24);
    sphere(g,.055,.067,.056,m,0,.047,.015);
    for(let i=0;i<3;i++){
      const x=.088+i*.071;
      rod(g,[x,.32,.026],[x+.007,.429-i*.02,.038],.048,m);
      sphere(g,.051,.059,.049,m,x,.315+i*.016,.023);
    }
    const thumb=sphere(g,.064,.132,.064,m,-.073,.400,.013);thumb.rotation.z=-.54;
    box(g,.21,.089,.128,M.brass,.084,.595,0,.044);batch(g);g.visible=false;return g;
  }
  return {robot,tracks,bigArms,guide};
})();
