const TownArt=(()=>{
  const {T,mat,group,geom,mesh,box,cyl,orb,rod,arch,batch,noise}=Craft;
  const M=TownModel, wood=c=>mat(c,'wood'),metal=c=>mat(c,'iron'),brass=mat('#d0a162','brass');
  const pine=wood('#be9466'),birch=wood('#e2bd8c'),walnut=wood('#785644'),endgrain=wood('#c9a073');
  const steel=metal('#464d51'),dark=mat('#333d41'),stone=mat('#969087','rock'),moss=mat('#858351','leaf');
  const sage=mat('#62816f','paint'),gold=mat('#e7ad55','paint'),teal=mat('#346969','paint'),cream=wood('#e6cc9c');
  const roofColors=['#a45c52','#557c81','#777b9b','#a77e52','#6b8877','#ad6a56'];
  const timberColors=['#ddba85','#c99a6c','#d9ac74','#c5a27e','#d7b68b','#dab382'].map(wood);
  const glow=(color,emit,strength)=>{const m=mat(color,'glass').clone();m.emissive.set(emit);m.emissiveIntensity=strength;return m;};
  const glass=glow('#eed7a4','#ffc379',.5),signal=glow('#ffce7b','#ffa941',.9);
  const bulbShape=(g,x,y,z,m)=>orb(g,x,y,z,.065,.073,.065,m);
  function slab(g,w,d,h,x,y,z,r,m,bevel=.025){
    const s=new T.Shape(),a=w/2-r,b=d/2-r;
    s.moveTo(-a,-d/2);s.lineTo(a,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-b);
    s.lineTo(w/2,b);s.quadraticCurveTo(w/2,d/2,a,d/2);s.lineTo(-a,d/2);
    s.quadraticCurveTo(-w/2,d/2,-w/2,b);s.lineTo(-w/2,-b);s.quadraticCurveTo(-w/2,-d/2,-a,-d/2);
    const geo=geom('sl'+[w,d,h,r,bevel],()=>{const a=new T.ExtrudeGeometry(s,{depth:h,curveSegments:4,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2});a.rotateX(-Math.PI/2);return a;});
    return mesh(g,geo,m,x,y,z);
  }
  function tree(g,x,z,h,species=0){
    const stem=wood('#74604a');
    cyl(g,.09*h,.16*h,.075,x,.045,z,moss,11);
    cyl(g,.038*h,.057*h,.48*h,x,.235*h,z,stem,10);
    const greens=[['#476b64','#51786d','#648573'],['#3f6262','#527571','#648480'],['#687c62','#82906b','#a2a178']][species%3].map(c=>mat(c,'leaf'));
    // Overlapping carved boughs have scalloped rims and a separate edge bevel.
    for(let l=0;l<3;l++){
      const geo=geom('bough'+l,()=>{
        const p=[],idx=[],uv=[],N=20;
        [[.07,.06],[.04,.89],[.12,1],[.21,.89],[.58,.54],[.94,.10],[1,.025]].forEach(([y,r],j)=>{
          for(let i=0;i<=N;i++){
            const a=i/N*2*Math.PI,flute=1+.05*Math.cos(5*a+.5*l)+.035*Math.cos(3*a+1);
            p.push(Math.sin(a)*r*flute,y+(j<=3?.037*Math.cos(5*a+.5*l):0),Math.cos(a)*r*flute);uv.push(i/N,y);
            if(j<6&&i<N){const k=j*(N+1)+i;idx.push(k,k+1,k+N+1,k+1,k+N+2,k+N+1);}
          }
        });
        const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(p,3));b.setAttribute('uv',new T.Float32BufferAttribute(uv,2));b.setIndex(idx);b.computeVertexNormals();return b;
      });
      const o=mesh(g,geo,greens[l],x,.19*h+l*.19*h,z);
      o.scale.set(h*(.246-l*.047),h*(.48-.033*l),h*(.246-l*.047));o.rotation.y=noise()*.9;
    }
  }
  function rock(g,x,z,size){
    const o=mesh(g,geom('stone',()=>new T.DodecahedronGeometry(1,0)),mat(['#979184','#b7a38b','#7e8177'][Math.floor(noise()*3)],'rock'),x,.10*size,z);
    o.scale.set(size,.56*size,.73*size);o.rotation.set(.12,noise()*6,.12);
  }
  function turf(g,x,z,rx,rz,color='#929162'){
    const o=cyl(g,1,1.02,.041,x,.023,z,mat(color,'soil'),24);o.scale.set(rx,1,rz);
  }
  function timberFence(g,x,z,count,angle=0){
    const f=group(g,x,0,z);f.rotation.y=angle;
    for(let i=0;i<count;i++){
      box(f,.13,.46,.14,i*.54,.23,0,walnut);
      box(f,.147,.055,.157,i*.54,.47,0,endgrain);
    }
    for(const h of [.19,.34])box(f,.54*(count-1)+.07,.067,.07,(count-1)*.27,h,.085,pine,.009);
  }
  function pathStrip(g,offset,width,height,base,m){
    const p=[],uv=[],index=[],N=228;
    for(let i=0;i<=N;i++){
      const a=M.rail(M.lap*i/N),nx=Math.sin(a.yaw),nz=Math.cos(a.yaw);
      const section=[[-width*.51,0],[-width*.47,height],[width*.47,height],[width*.51,0]];
      section.forEach(([q,h],j)=>{
        p.push(a.x+nx*(q+offset),base+h,a.z+nz*(q+offset));uv.push(i/N*34,j/3);
        if(i<N && j<3){const k=i*4+j;index.push(k,k+1,k+4,k+1,k+5,k+4);}
      });
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(index);geo.computeVertexNormals();mesh(g,geo,m);
  }
  function track(g){
    pathStrip(g,0,.70,.046,.024,mat('#7b7466','soil'));
    const N=156;
    for(let i=0;i<N;i++){const a=M.rail(i*M.lap/N);
      box(g,.099,.077,.64,a.x,.096,a.z,i%4?walnut:pine,.011).rotation.y=a.yaw;
    }
    for(const d of [-.215,.215]){
      pathStrip(g,d,.058,.074,.125,metal('#655c53'));pathStrip(g,d,.075,.026,.195,mat('#c0aba0','brass'));
    }
  }
  function windowFrame(g,x,y,z,w,h,lit,rot=0){
    const t=group(g,x,y,z);t.rotation.y=rot;
    box(t,w+.082,h+.082,.046,0,0,0,walnut,.012);
    box(t,w,h,.041,0,0,.036,lit,.011);
    box(t,.035,h,.038,0,0,.067,cream,.004);
    box(t,w,.033,.038,0,.022,.067,cream,.004);
    box(t,w+.13,.048,.12,0,-h*.54,.033,birch,.009);
  }
  function station(g){
    const base=group(g,-4.96,.03,1.57);
    slab(base,2.65,2.63,.14,0,0,0,.15,stone);
    const st=group(base,0,.13,0);
    const siding=[wood('#d4af7d'),wood('#e0bb88')];
    for(let i=0;i<7;i++)box(st,1.60,.185,1.59,0,.098+i*.177,-.03,siding[i%2],.017);
    for(const x of [-.76,.76])for(const z of [-.80,.74])box(st,.098,1.32,.10,x,.65,z,cream,.011);
    arch(st,[[-.81,1.24],[.81,1.24],[0,1.94]],-.825,.76,birch);
    const tile=mat('#96534e'),tile2=mat('#b06153');
    for(const dir of [-1,1]){
      const span=1.0,rise=.76,len=Math.hypot(span,rise);
      const r=group(st,dir*.5,1.62,-.032);r.rotation.z=-dir*Math.atan2(rise,span);
      box(r,len,.115,1.94,0,0,0,tile);
      for(let n=0;n<11;n++)box(r,len+.015,.034,.035,0,.066,-.90+n*.18,tile2,.008);
      box(r,len+.02,.13,.09,0,-.032,.985,cream,.01);
    }
    box(st,.12,.12,2.01,0,2.01,-.032,tile2,.04);
    box(st,.25,.60,.27,.49,1.79,-.49,wood('#a36f59'));
    box(st,.31,.09,.32,.49,2.11,-.49,tile);
    for(const x of [-.51,.53])windowFrame(st,x,.72,.78,.37,.50,glass);
    for(const z of [-.48,.29])windowFrame(st,.82,.76,z,.34,.49,glass,Math.PI/2);
    box(st,.36,.84,.06,0,.42,.81,teal);windowFrame(st,0,.62,.86,.20,.27,glass);
    orb(st,.105,.35,.867,.024,.024,.021,brass);
    const clockFace=cyl(st,.217,.217,.064,0,1.48,.817,brass,32);clockFace.rotation.x=Math.PI/2;
    cyl(st,.178,.178,.066,0,1.48,.848,mat('#f3e2bb'),32).rotation.x=Math.PI/2;
    rod(st,[0,1.48,.889],[-.082,1.55,.889],.013,steel);rod(st,[0,1.48,.889],[.01,1.61,.889],.011,steel);
    box(st,1.98,.09,.57,0,1.12,1.005,teal).rotation.x=.13;
    for(const x of [-.87,.87]){cyl(st,.035,.048,.98,x,.5,1.19,cream,10);orb(st,x,.99,1.17,.065,.085,.065,brass);}
    for(let i=0;i<11;i++)box(base,.236,.091,.4,-1.20+.24*i,.175,1.42,pine,.012);
    box(base,1.12,.10,.25,-.03,.09,1.71,stone);
    // Luggage and a slatted station bench, all built in place.
    for(const x of [-.45,.45])box(base,.08,.23,.26,x+.2,.25,-1.05,steel);
    box(base,1.16,.08,.26,.2,.4,-1.05,walnut);
    for(const y of [.51,.62])box(base,1.16,.078,.07,.2,y,-1.16,pine);
  }
  function crate(g,x,y,z,size=.5){
    box(g,size,size*.78,size*.85,x,y+size*.4,z,pine,.028);
    for(const dx of [-.38,.38])box(g,.045,size*.8,size*.87,x+dx*size,y+size*.4,z,walnut,.006);
    box(g,size*.85,.06,.028,x,y+size*.4,z+size*.44,cream,.006).rotation.z=.55;
  }
  function landscape(g){
    slab(g,16.85,9.83,.34,0,-.83,-.27,.60,walnut,.065);
    slab(g,16.98,9.90,.09,0,-.50,-.27,.59,birch);
    slab(g,16.86,9.80,.32,0,-.40,-.27,.56,wood('#ba9468'),.035);
    slab(g,16.75,9.68,.10,0,-.095,-.27,.53,mat('#aaa077','soil'));
    for(let i=0;i<14;i++){
      const x=-7.78+i*1.194;
      if(i%2===0){box(g,.46,.105,.038,x,-.31,4.642,walnut,.009);box(g,.46,.09,.038,x,-.67,4.642,endgrain,.009);}
    }
    for(const x of [-7.1,7.1])for(const z of [-3.9,3.5])cyl(g,.49,.43,.22,x,-.96,z,walnut,24);
    track(g);
    // Brick road. Individual offsets, worn stone colours and cambered shoulders.
    slab(g,14.95,1.08,.035,0,.004,0,.39,mat('#79776b','rock'),.009);
    const cobbles=['#aa9b88','#b8aa95','#a59788','#c1ad94','#ab9f90'].map(c=>mat(c,'rock'));
    for(let j=0;j<5;j++)for(let i=0;i<31;i++){
      const x=-7.19+i*.473+(j%2)*.18;
      box(g,.44,.061+noise()*.015,.188,x,.048,(j-2)*.2,cobbles[Math.floor(noise()*5)],.029).rotation.y=(noise()-.5)*.048;
    }
    for(const z of [-.56,.56])for(let n=0;n<19;n++)box(g,.73,.092,.101,-7.05+n*.78,.06,z,stone,.022);
    for(const [x,z,h,t] of [[-6.69,-1.68,2.74,0],[-5.96,-2.77,2.12,2],[-6.8,-2.69,1.48,1],[-7.41,1.32,1.57,1],[-7.03,1.96,1.17,2],
      [6.28,-2.22,2.60,1],[7.00,-1.90,2.08,0],[6.67,-1.73,1.33,2],[6.54,2.07,1.78,0],[7.2,2.02,1.1,2],[-4.81,-1.81,1.17,2]]){
      turf(g,x,z,h*.31,h*.28);tree(g,x,z,h,t);
    }
    for(const [x,z] of [[-6.65,-1.68],[6.30,-1.63],[6.64,1.84],[-7.14,1.55],[-5.7,-2.3]]){
      for(let n=0;n<5;n++)rock(g,x+(noise()-.5)*1.1,z+(noise()-.5)*.9,.09+noise()*.15);
    }
    timberFence(g,-6.01,-.62,4);timberFence(g,4.38,-.65,4);timberFence(g,-4.68,-2.66,4);
    timberFence(g,4.43,2.85,4);timberFence(g,-6.45,2.87,3);
    for(const x of [-2.7,1.45,5.70]){ // Low groundcover on the outer bank.
      for(let i=0;i<11;i++){
        const px=x+(noise()-.5)*1.7,pz=4.04+noise()*.32;
        orb(g,px,.06,pz,.07+noise()*.1,.08+noise()*.1,.08,moss);
      }
    }
    station(g);
    for(const [x,z,size] of [[-3.44,-4.36,.65],[-3.94,-4.31,.49],[-3.31,-3.88,.43],[-5.88,2.67,.39],[-6.21,2.64,.31]])crate(g,x,.075,z,size);
    // A small loading hatch inside the rear crane siding.
    slab(g,2.24,1.63,.105,M.dock.x,.045,M.dock.z,.12,walnut);
    box(g,1.99,.016,1.43,M.dock.x,.162,M.dock.z,dark);
    for(const x of [-1.065,1.065])box(g,.093,.085,1.54,M.dock.x+x,.19,M.dock.z,brass);
    for(const z of [-4.76,-4.20])box(g,12.7,.082,.072,0,.14,z,steel);
    for(let i=0;i<31;i++)box(g,.12,.075,.75,-6+i*.40,.074,-4.48,walnut,.008);
    // Water's elliptical stone bank.
    const o=cyl(g,1,1.025,.074,5.29,.061,1.45,mat('#8e9178','rock'),44);o.scale.set(1.04,1,1.12);
    for(let i=0;i<32;i++){
      const a=i/32*Math.PI*2,sz=.102+noise()*.076;
      rock(g,5.29+Math.cos(a)*.98,1.45+Math.sin(a)*1.02,sz);
    }
    for(let i=0;i<9;i++){
      const x=6.05+noise()*.23,z=1.30+noise()*.54;
      rod(g,[x,.09,z],[x-.045,.36+noise()*.19,z+.04],.013,moss,6);
    }
    for(let i=0;i<4;i++)box(g,.32,.075,.51,4.22+.29*i,.17,2.25,pine,.013);
    for(const x of [4.21,5.07])cyl(g,.041,.058,.29,x,.14,2.30,walnut,8);
  }
  function createPlot(parent,p){
    const base=group(parent,p.x,.03,p.z),floor=group(base);
    slab(floor,2.39,1.95,.09,0,0,0,.13,mat('#81745f','rock'));
    slab(floor,2.30,1.87,.08,0,.08,0,.11,walnut);
    for(let n=0;n<7;n++)box(floor,.306,.080,1.72,-.972+n*.324,.176,0,timberColors[(n+p.i)%6],.014);
    const light=glow('#ffe2a1','#ffb551',1),metalPin=mat('#c5ac87','brass');
    for(const dx of [-1,1])for(const dz of [-1,1]){
      box(floor,.32,.032,.10,dx*.918,.233,dz*.775,metalPin,.014);
      box(floor,.10,.034,.3,dx*1.031,.234,dz*.679,metalPin,.014);
      cyl(floor,.035,.032,.021,dx*1.025,.26,dz*.769,light,10);
    }
    for(const z of [-.85,.85])box(floor,2.02,.033,.039,0,.221,z,light,.012);
    for(const x of [-1.09,1.09])box(floor,.04,.033,1.55,x,.221,0,light,.012);
    for(let a=0;a<2;a++)box(floor,a?.088:.45,.038,a?.45:.088,0,.232,0,light,.016);
    batch(floor);
    const panes=glow('#8b958b','#ffbe61',.045),layers=[],roof={};
    const hue=mat(roofColors[p.i]),trim=mat(new T.Color(roofColors[p.i]).lerp(new T.Color('#fff2d8'),.24).getStyle());
    for(let n=0;n<4;n++){
      const l=group(parent);layers.push(l);
      if(n<3){
        const carp=group(l);
        for(let x=0;x<3;x++)for(let z=0;z<2;z++)
          box(carp,.496,.496,.496,(x-1)*.5,.25,(z-.5)*.5,timberColors[(p.i+x+z+n*2)%6],.026);
        if(n<2){
          for(const x of [-.50,.50])windowFrame(carp,x,.27,.505,.285,.30,panes);
          windowFrame(carp,.758,.26,0,.31,.28,panes,Math.PI/2);
          if(n===0){box(carp,.33,.475,.054,0,.247,.515,hue);box(carp,.20,.26,.03,0,.305,.56,panes);
            orb(carp,.108,.143,.57,.023,.023,.022,brass);}
        } else {
          for(const z of [-.51,.51]){box(carp,1.54,.072,.07,0,.407,z,cream);windowFrame(carp,0,.205,z,.49,.22,panes,z<0?Math.PI:0);}
          for(const x of [-.74,.74])box(carp,.074,.48,1.02,x,.25,0,endgrain);
        }
        batch(carp);
      } else {
        box(l,1.63,.095,1.12,0,.012,0,cream);
        // Two hinged roof planes meet at a moving ridge; chimney sleeves slide through their collars.
        roof.gables=[];
        for(const z of [-.509,.509]){
          const f=arch(l,[[-.77,0],[.77,0],[0,1]],z-.025,z+.025,birch);roof.gables.push(f);
        }
        roof.panels=[-1,1].map(side=>{
          const hinge=group(l,.88*side,.018,0),assembly=group(hinge,-side*.5,0,0);
          box(assembly,1,.079,1.31,0,0,0,hue);
          for(let n=0;n<8;n++)box(assembly,1,.025,.034,0,.051,-.602+n*.172,trim,.008);
          box(assembly,1,.085,.049,0,-.018,.666,cream,.009);batch(assembly);return hinge;
        });
        roof.ridge=box(l,.089,.091,1.38,0,.61,0,trim,.035);
        roof.pipes=[-.47,.44].map((x,i)=>{
          const t=group(l,x,0,i?-.29:.27);
          box(t,.19,.56,.20,0,-.25,0,mat('#966b59'));box(t,.25,.074,.26,0,.025,0,walnut);
          box(t,.13,.015,.14,0,.067,0,dark);batch(t);return t;
        });
      }
    }
    return {base,floor,light,panes,layers,roof};
  }
  function lamp(parent,x,z,sign){
    const g=group(parent,x,0,z),m=glow('#d6b78b','#ffae48',.18);
    cyl(g,.115,.17,.14,0,.07,0,stone,12);cyl(g,.061,.094,.20,0,.22,0,teal);
    cyl(g,.035,.053,.93,0,.735,0,metal('#495557'),12);
    cyl(g,.095,.058,.064,0,1.215,0,brass);
    cyl(g,.095,.070,.19,0,1.342,0,m,8);
    for(const x of [-.064,.064])for(const z of [-.064,.064])rod(g,[x*.8,1.25,z*.8],[x,1.446,z],.009,steel,6);
    cyl(g,.028,.147,.102,0,1.493,0,teal,8);bulbShape(g,0,1.55,0,brass).scale.multiplyScalar(.46);
    batch(g);return {light:m};
  }
  function crane(parent){
    const moving=group(parent,0,0,-4.50),b=group(moving),frame=mat('#d89d4f'),edges=mat('#ebbb6e'),red=mat('#a55b49');
    box(b,1.16,.24,.99,0,.36,0,teal,.052);
    for(const x of [-.41,.41])for(const z of [-.29,.29])cyl(b,.154,.154,.112,x,.21,z,steel).rotation.x=Math.PI/2;
    box(b,.76,.26,.75,0,.59,0,frame,.043);
    const H=4.18,W=.24;
    for(const x of [-W,W])for(const z of [-W,W])box(b,.080,H-.65,.08,x,(H+.65)/2,z,frame,.016);
    for(let i=0;i<7;i++){
      const y=.66+i*.50;
      for(const a of [-W,W]){
        rod(b,[-W,y,a],[W,y+.50,a],.025,edges);rod(b,[a,y,-W],[a,y+.50,W],.025,frame);
        rod(b,[-W,y,a],[W,y,a],.031,frame);rod(b,[a,y,-W],[a,y,W],.031,frame);
      }
    }
    cyl(b,.39,.36,.13,0,H,0,steel,24);batch(b);
    const swivel=group(moving,0,H+.04,0),arm=group(swivel);
    box(arm,.67,.17,.92,0,.08,0,frame);
    box(arm,.43,.55,.58,-.48,.16,.06,frame);
    box(arm,.454,.29,.49,-.483,.245,.067,mat('#728a8d','glass'));
    box(arm,.53,.071,.66,-.48,.476,.07,cream);
    for(const x of [-.68,-.28])box(arm,.044,.30,.047,x,.245,.322,edges);
    for(const x of [-.22,.22]){
      rod(arm,[x,.25,-1.42],[x,.25,4.01],.047,frame);
      rod(arm,[x,.26,0],[0,.95,0],.043,frame);
    }
    rod(arm,[0,.57,-1.42],[0,.57,4.01],.049,edges);
    for(let j=0;j<14;j++){
      const z=-1.43+j*.39;
      for(const x of [-.22,.22]){
        rod(arm,[x,.25,z],[0,.57,z+.197],.025,frame);
        rod(arm,[0,.57,z+.197],[x,.25,z+.39],.022,edges);
      }
      rod(arm,[-.22,.25,z],[.22,.25,z],.024,frame);
    }
    for(const z of [-1.2,2.95])rod(arm,[0,.96,0],[0,.57,z],.016,steel);
    for(const z of [-1.37,-1.09])box(arm,.74,.56,.26,0,.15,z,mat('#757c75'),.035);
    box(arm,.50,.07,.42,0,.23,4.04,red);batch(arm);
    const extension=group(swivel,0,.28,2.06);
    for(const x of [-.106,.106])box(extension,.045,.06,2.14,x,0,1.04,edges,.009);
    for(let i=0;i<7;i++)box(extension,.23,.053,.06,0,.015,i*.32,frame);
    batch(extension);
    const trolley=group(swivel,0,.19,1);
    box(trolley,.44,.17,.37,0,0,0,red);box(trolley,.31,.085,.31,0,-.12,0,steel);batch(trolley);
    const cable=group(trolley,0,-.13,0),line=cyl(cable,.012,.012,1,0,-.5,0,steel,8),line2=line.clone();line.position.x=-.042;line2.position.x=.042;cable.add(line2);
    const hook=group(cable);
    cyl(hook,.087,.087,.10,0,0,0,frame).rotation.z=Math.PI/2;
    const hookMesh=mesh(hook,geom('hook',()=>new T.TorusGeometry(.077,.021,9,16,Math.PI*1.64)),brass,0,-.106,0);hookMesh.rotation.z=2.10;
    const yoke=group(hook,0,-.145,0);
    for(const z of [-.54,.54])box(yoke,1.62,.046,.043,0,0,z,frame,.009);
    for(const x of [-.80,.80]){
      box(yoke,.039,.047,1.09,x,0,0,frame,.008);
      for(const z of [-.54,.54])rod(yoke,[0,.13,0],[x,0,z],.009,steel,7);
    }
    batch(hook);
    const slings=[];
    for(const x of [-.80,.80])for(const z of [-.54,.54]){
      const wire=cyl(hook,.009,.009,1,x,-.18,z,steel,7);
      const clip=orb(hook,x,-.18,z,.025,.031,.025,brass);slings.push({wire,clip});
    }
    return {moving,swivel,extension,trolley,cable,lines:[line,line2],hook,slings};
  }
  function train(parent){
    const cars=[];
    for(let i=0;i<3;i++){
      const g=group(parent),b=group(g),wheels=[];
      box(b,.78,.12,.52,0,.225,0,walnut);
      for(const x of [-.39,.39])cyl(b,.034,.034,.11,x,.21,0,brass).rotation.z=Math.PI/2;
      if(!i){
        cyl(b,.174,.174,.51,.105,.46,0,teal,24).rotation.z=Math.PI/2;
        for(const x of [-.06,.26])cyl(b,.18,.18,.033,x,.46,0,brass,24).rotation.z=Math.PI/2;
        cyl(b,.165,.165,.062,.385,.46,0,steel,24).rotation.z=Math.PI/2;
        cyl(b,.047,.066,.152,.22,.668,0,steel);cyl(b,.096,.052,.083,.22,.775,0,brass);
        cyl(b,.072,.084,.107,-.012,.663,0,brass);
        box(b,.31,.35,.51,-.235,.46,0,teal);box(b,.28,.23,.44,-.235,.717,0,glass);
        for(const x of [-.37,-.10])for(const z of [-.23,.23])box(b,.032,.22,.032,x,.71,z,teal,.003);
        box(b,.42,.085,.60,-.24,.873,0,mat('#4a5559'),.034);
        cyl(b,.074,.074,.087,.418,.617,0,brass).rotation.z=Math.PI/2;
        cyl(b,.053,.053,.093,.433,.617,0,signal).rotation.z=Math.PI/2;
        box(b,.126,.08,.60,.42,.24,0,redPaint());
      }else{
        const body=i===1?mat('#be8457'):mat('#9d6153');
        box(b,.72,.30,.48,0,.411,0,body,.043);box(b,.64,.21,.448,0,.655,0,glass);
        for(const x of [-.299,-.101,.101,.299])for(const z of [-.229,.229])box(b,.034,.225,.035,x,.66,z,cream,.004);
        box(b,.81,.105,.569,0,.81,0,i===1?sage:teal,.052);
        for(const z of [-.249,.249])box(b,.64,.041,.035,0,.374,z,brass,.006);
      }
      batch(b);
      for(const x of [-.247,.247])for(const z of [-.219,.219]){
        const pivot=group(g,x,.111,z),o=cyl(pivot,.115,.115,.068,0,0,0,steel,18);o.rotation.x=Math.PI/2;
        const sign=Math.sign(z);
        cyl(pivot,.084,.084,.021,0,0,.045*sign,mat('#a46b53')).rotation.x=Math.PI/2;
        for(let q=0;q<3;q++)box(pivot,.146,.016,.014,0,0,.057*sign,brass,.003).rotation.z=q*Math.PI/3;
        orb(pivot,0,0,.069*sign,.027,.027,.012,brass);batch(pivot);wheels.push(pivot);
      }
      cars.push({g,b,wheels});
    }
    return cars;
  }
  function redPaint(){return mat('#a96456');}
  function pool(parent){
    const p=[],ix=[],uv=[];
    for(let j=0;j<9;j++)for(let i=0;i<7;i++){
      const u=i/3-1,v=j/4-1;
      p.push(u*Math.sqrt(1-v*v/2)*.99,.118,v*Math.sqrt(1-u*u/2)*1.054);uv.push(i/6,j/8);
      const k=j*7+i;if(i<6&&j<8)ix.push(k,k+7,k+1,k+1,k+7,k+8);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const o=mesh(parent,geo,mat('#618b8b','water'),5.29,0,1.45);o.castShadow=false;return o;
  }
  function create(s,shared){
    const root=group(),terrain=shared?shared.clone():group();
    if(!shared){landscape(terrain);batch(terrain);}
    root.add(terrain);
    const plots=s.lots.map(p=>createPlot(root,p));
    const lamps=s.lots.map((p,i)=>lamp(root,p.x+(i<3?-1.22:1.22),i<3?-.71:.71,i%2));
    const machine=crane(root),cars=train(root),water=pool(root),bridge=group(root,6.36,.09,0);
    const deck=Array.from({length:5},(_,j)=>{
      const t=group(bridge,0,.085+j*.032,0);
      for(let i=0;i<5;i++)box(t,.197,.07,.93,.10+i*.204,0,0,i%3?pine:birch,.012);
      for(const z of [-.43,.43])box(t,1.04,.09,.061,.51,-.053,z,walnut);
      if(j===4)for(const z of [-.35,.35])cyl(t,.051,.056,.052,.94,.055,z,brass);
      return batch(t);
    });
    const hatch=[-1,1].map(side=>{
      const t=group(root,M.dock.x+side*1.01,.214,M.dock.z);
      for(let i=0;i<4;i++)box(t,.233,.059,1.42,-side*(.127+i*.25),0,0,pine);
      return batch(t);
    });
    const dust=Array.from({length:s.dust.length},()=>{const o=orb(root,0,0,0,.013,.013,.013,signal);o.castShadow=false;return o;});
    return {root,terrain,plots,lamps,machine,cars,water,deck,hatch,dust};
  }
  function update(a,s){
    for(const p of s.lots){
      const v=a.plots[p.i];v.floor.position.y=p.bed.x;v.floor.rotation.z=p.tilt.x;
      v.light.emissiveIntensity=.22+p.charge*1.26;v.panes.emissiveIntensity=.05+p.window*2.0;
      v.panes.color.setRGB(.21+.58*p.window,.26+.25*p.window,.24-.02*p.window);
      a.lamps[p.i].light.emissiveIntensity=.14+s.lamps[p.i].heat*2.6;
      p.layers.forEach((l,n)=>{
        const b=v.layers[n];b.visible=p.status==='done'||(p.status==='building' && l.y+(n===3?.76:.5)>-.10);
        b.position.set(l.x,.27+l.y,l.z);b.rotation.z=l.angle;
      });
      const r=v.roof,h=p.pitch.x,shift=p.ridge.x;
      r.gables.forEach(f=>{f.scale.y=h;f.updateMatrix();f.matrixAutoUpdate=false;f.matrix.elements[4]=shift;f.matrixWorldNeedsUpdate=true;});
      r.panels.forEach((o,i)=>{const sign=i?1:-1,span=.88-sign*shift;
        o.rotation.z=-sign*Math.atan2(h,span);o.scale.x=Math.hypot(h,span);});
      r.ridge.position.set(shift,h+.055,0);
      r.pipes.forEach((t,i)=>{const x=t.position.x,ground=h*(1-Math.abs(x-shift)/(.88-Math.sign(x)*shift));t.position.y=ground+p.pots[i].x;});
    }
    const c=s.crane,v=a.machine;v.moving.position.x=c.x.x;v.swivel.rotation.y=c.yaw.x;
    v.extension.position.z=Math.max(2.05,c.trolley.x-2.01);v.trolley.position.z=c.trolley.x;
    const length=Math.max(.15,4.28-c.hook.x);v.cable.rotation.z=c.swing.x;
    for(const l of v.lines){l.scale.y=length;l.position.y=-length/2;}v.hook.position.y=-length;
    for(const {wire,clip} of v.slings){wire.scale.y=c.sling.x;wire.position.y=-.145-c.sling.x*.5;clip.position.y=-.145-c.sling.x;}
    s.cars.forEach((c,i)=>{const v=a.cars[i],p=M.rail(c.s);v.g.position.set(p.x,.223,p.z);v.g.rotation.y=p.yaw;v.b.position.y=c.bounce.x;v.wheels.forEach(w=>w.rotation.z=-c.wheel);});
    const pos=a.water.geometry.attributes.position;
    s.water.forEach((w,i)=>pos.setY(i,.118+w.h));pos.needsUpdate=true;a.water.geometry.computeVertexNormals();
    s.dust.forEach((d,i)=>{const o=a.dust[i],fade=Math.max(0,Math.min(1,d.age*2.3,(d.life-d.age)*2.3));
      o.position.set(d.x,d.y,d.z);o.scale.setScalar(fade*(.009+.007*d.seed));});
    a.deck.forEach((t,i)=>t.position.x=(.77+i*.834)*s.bridge.x);
    a.hatch.forEach((t,i)=>t.rotation.z=(i?-1:1)*s.crane.hatch.x*1.49);
  }
  return {create,update};
})();
