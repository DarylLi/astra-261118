const Vehicles=(()=>{
  const {T,C,mat,group,mesh,box,rounded,orb,cyl,rod,surface,bake}=Art;
  const tireProfile=[[.20,-.135],[.285,-.166],[.35,-.169],[.39,-.14],[.417,-.09],[.421,.09],[.39,.14],[.35,.169],[.285,.166],[.2,.135]];
  const rubber=new T.LatheGeometry(tireProfile.map(p=>new T.Vector2(...p)),40);rubber.rotateZ(Math.PI/2);
  function wheel(g,x,z,sign,industrial=true){
    const w=group(g,x,.435,z);mesh(w,rubber,C.rubber);
    for(let i=0;i<30;i++){
      const a=i*Math.PI/15;
      for(const side of [-1,1]){
        const tread=box(w,C.tread,side*.087,.416*Math.cos(a),.416*Math.sin(a),.186,.049,.077);
        tread.rotation.order='XYZ';tread.rotation.x=a;tread.rotation.y=side*.42;
      }
    }
    const ring=(m,r,length,offset)=>{const p=cyl(w,m,sign*offset,0,0,r,r,length,32);p.rotation.z=Math.PI/2;};
    ring(C.black,.256,.05,.137);ring(industrial?C.cream:C.iron,.223,.048,.176);
    ring(C.iron,.121,.045,.204);ring(C.black,.071,.04,.231);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;orb(w,C.steel,sign*.204,.159*Math.sin(a),.159*Math.cos(a),.014,.023,.023);}
    return bake(w);
  }
  function stripePlate(g,x,y,z,width=.39){
    box(g,C.cream,x,y,z,width,.175,.029);
    for(let i=0;i<3;i++){
      const x0=x-width*.46+i*width*.30,w=width*.14;
      surface(g,C.red,[x0,y-.087,z+.016,x0+w,y-.087,z+.016,x0+w+.075,y+.087,z+.016,x0+.075,y+.087,z+.016],[0,1,2,0,2,3]);
    }
  }
  function plow(parent){
    const root=group(parent),body=group(root),wheels=[];
    rounded(body,C.black,0,.53,0,1.42,.31,2.55);
    for(const side of [-1,1]){
      for(const z of [-.74,.78]){
        wheels.push(wheel(root,.77*side,z,side));
        const fender=rounded(body,C.orange,side*.78,.943,z,.51,.108,.91,.04);
        for(const e of [-1,1])box(body,C.black,side*.78,.846,z+e*.44,.47,.16,.058).rotation.x=-e*.26;
      }
      box(body,C.iron,side*.86,.57,.04,.35,.068,.62);
      for(let k=0;k<6;k++)box(body,C.black,side*.95,.611,-.20+k*.078,.13,.012,.029);
    }
    // Rear engine cover, louvres, drawbar, reflectors and recessed service panels.
    rounded(body,C.orange,0,1.003,.70,1.36,.67,1.03,.10);
    rounded(body,C.cab,0,1.356,.72,1.26,.085,.95,.032);
    rounded(body,C.black,0,1.03,1.226,.93,.364,.055,.034);
    for(let i=0;i<8;i++)box(body,C.iron,0,.885+i*.040,1.26,.845,.013,.021);
    rounded(body,C.black,0,.683,1.286,1.59,.16,.19,.045);
    for(const side of [-1,1]){
      rounded(body,C.black,side*.582,1.05,1.224,.16,.224,.062,.02);
      rounded(body,C.tail,side*.582,1.091,1.263,.128,.091,.024,.01);
      box(body,C.beacon,side*.582,.999,1.262,.124,.051,.022);
      stripePlate(body,side*.565,.69,1.391,.35);
      for(let k=0;k<5;k++)box(body,C.black,side*.686,1.078,.43+k*.112,.017,.16,.048);
    }
    rod(body,C.iron,[0,.45,1.06],[0,.45,1.47],.064);
    // The cab has individual glazed panes, real pillars, seats and a little driver.
    rounded(body,C.cab,0,1.037,-.395,1.38,.71,1.30);
    const seat=mat(0x3d4c4a),coat=mat(0x567e83),hat=mat(0xd6aa77),skin=mat(0xc99773);
    rounded(body,seat,0,1.47,-.17,.55,.58,.16);orb(body,coat,0,1.58,-.36,.235,.27,.20);
    orb(body,skin,0,1.89,-.40,.148,.17,.145);orb(body,hat,0,1.986,-.39,.162,.119,.153);
    for(const side of [-1,1]){
      rod(body,C.black,[side*.65,1.33,.227],[side*.60,2.245,.125],.056);
      rod(body,C.black,[side*.67,1.33,-1.09],[side*.60,2.245,-.88],.058);
      rod(body,C.cab,[side*.68,1.32,.23],[side*.61,2.25,.13],.031);
      const sideGlass=box(body,C.glass,side*.643,1.784,-.416,.026,.817,1.096);sideGlass.rotation.z=side*.055;
      box(body,C.black,side*.667,1.35,-.425,.057,.071,1.27);
      box(body,C.black,side*.65,1.79,-.19,.04,.83,.035);
      rounded(body,C.black,side*.709,1.223,-.052,.05,.052,.184,.012);
      rod(body,C.black,[side*.62,2.15,-.73],[side*.958,2.09,-.65],.022);
      rod(body,C.black,[side*.958,2.09,-.65],[side*1.02,1.92,-.63],.022);
      rounded(body,C.black,side*1.013,1.895,-.64,.147,.237,.095,.038);
      box(body,C.steel,side*1.013,1.895,-.586,.108,.178,.01);
    }
    const back=box(body,C.glass,0,1.78,.188,1.185,.841,.035);back.rotation.x=-.111;
    const front=box(body,C.glass,0,1.786,-.988,1.198,.867,.03);front.rotation.x=.215;
    box(body,C.black,0,1.36,.241,1.28,.066,.062);rod(body,C.black,[.42,1.42,.243],[-.16,1.90,.205],.013);
    rod(body,C.black,[-.33,1.78,.214],[.03,2.05,.188],.014);
    rounded(body,C.black,0,2.242,-.392,1.49,.115,1.40,.055);
    rounded(body,C.cab,0,2.309,-.395,1.46,.118,1.37,.05);
    rounded(body,C.snowLight,.017,2.371,-.37,1.36,.047,1.22,.019);
    for(const side of [-1,1]){
      rounded(body,C.black,side*.565,2.27,.317,.213,.139,.108,.035);
      rounded(body,C.lamp,side*.565,2.27,.377,.160,.085,.02,.009);
    }
    cyl(body,C.black,-.43,2.413,-.20,.112,.117,.081);
    cyl(body,C.beacon,-.43,2.514,-.20,.078,.095,.15,24);
    orb(body,C.beacon,-.43,2.590,-.20,.078,.04,.078);
    cyl(body,C.iron,.48,1.63,.472,.078,.081,.55);
    cyl(body,C.black,.48,1.996,.472,.044,.049,.39);
    const exhaust=cyl(body,C.iron,.48,2.207,.48,.059,.052,.065);exhaust.rotation.x=.28;
    const blade=group(root,0,.09,-1.62);blade.rotation.y=.20;
    for(const s of [-1,1]){
      rod(body,C.black,[s*.49,.59,-.85],[s*.70,.33,-1.61],.066);
      rod(body,C.iron,[s*.49,.72,-.99],[s*.70,.39,-1.67],.034);
    }
    // A continuous curved steel mouldboard with a bolted wear edge and vertical ribs.
    const section=[[.025,-.23],[.13,-.04],[.30,.044],[.51,.027],[.66,-.042],[.70,-.095]];
    const sh=new T.Shape();sh.moveTo(section[0][1],section[0][0]);
    for(const [y,z] of section.slice(1))sh.lineTo(z,y);
    for(const [y,z] of [...section].reverse())sh.lineTo(z+.063,y);sh.closePath();
    const bladeGeo=new T.ExtrudeGeometry(sh,{depth:3.02,bevelEnabled:false});bladeGeo.rotateY(-Math.PI/2);bladeGeo.translate(1.51,0,0);
    mesh(blade,bladeGeo,C.gold);
    box(blade,C.iron,0,.061,-.181,3.07,.117,.082).rotation.x=-.28;
    rod(blade,C.gold,[-1.51,.71,-.055],[1.51,.71,-.055],.036);
    for(let i=-3;i<=3;i++){
      const x=i*.43;
      rod(blade,C.orange,[x,.13,.001],[x,.66,.035],.039);
      orb(blade,C.steel,x,.065,-.227,.023,.022,.009);
    }
    for(const s of [-1,1]){
      rod(blade,C.black,[s*1.47,.64,.01],[s*1.49,1.08,-.01],.019);
      cyl(blade,C.red,s*1.49,1.06,-.01,.027,.027,.24);
      cyl(blade,C.cream,s*1.49,1.075,-.01,.028,.028,.073);
    }
    bake(blade);bake(body);return {root,body,wheels,blade};
  }
  function bus(parent){
    const root=group(parent),g=group(root),wheels=[];
    rounded(g,C.black,0,.58,0,1.75,.28,4.82);
    rounded(g,C.bus,0,1.13,.02,1.94,1.04,4.87,.17);
    rounded(g,C.busTrim,0,1.95,.03,1.88,1.13,4.74,.18);
    rounded(g,C.cream,0,2.53,.06,1.95,.17,4.75,.08);
    rounded(g,C.snowLight,.015,2.619,.13,1.80,.077,4.42,.03);
    for(const sign of [-1,1]){
      for(let k=0;k<5;k++){
        rounded(g,C.black,sign*.927,1.984,-1.76+k*.858,.065,.809,.804,.042);
        rounded(g,C.deepGlass,sign*.965,1.997,-1.76+k*.858,.018,.710,.718,.008);
        box(g,C.iron,sign*.978,2.131,-1.76+k*.858,.009,.022,.714);
      }
      box(g,C.black,sign*.974,1.37,0,.036,.064,4.55);
      box(g,C.cream,sign*.981,1.22,0,.025,.061,4.54);
      for(const z of [-1.38,1.39])wheels.push(wheel(root,sign*.87,z,sign,false));
      rod(g,C.black,[sign*.89,2.27,-2.11],[sign*1.11,2.18,-2.47],.026);
      rounded(g,C.black,sign*1.11,2.08,-2.48,.17,.26,.095,.035);
    }
    rounded(g,C.black,0,1.96,-2.332,1.73,.88,.117,.05);
    rounded(g,C.deepGlass,0,1.97,-2.398,1.59,.74,.036,.017);
    box(g,C.black,0,1.98,-2.423,.035,.73,.02);
    for(const side of [-1,1]){
      rounded(g,C.lamp,side*.692,1.088,-2.425,.251,.141,.083,.037);
      rounded(g,C.tail,side*.72,1.18,2.452,.161,.203,.032,.015);
    }
    rounded(g,C.black,0,.765,-2.453,1.87,.165,.146,.05);
    rounded(g,C.deepGlass,0,1.991,2.388,1.62,.69,.045,.021);
    for(let k=0;k<4;k++)box(g,C.iron,0,.956+k*.064,-2.428,.68,.024,.021);
    bake(g);return {root,wheels};
  }
  return {plow,bus};
})();
