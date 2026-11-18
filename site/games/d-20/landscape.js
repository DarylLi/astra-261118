const Landscape=(()=>{
  const {T,C,mat,group,mesh,box,rounded,orb,cyl,rod,surface,bake,rand}=Art;
  const {roadX,smooth}=SnowRoad;
  const noise=(x,z)=>Math.sin(.93*x+1.37*z)*.41+Math.sin(1.98*x-.71*z)*.24+Math.sin(-2.75*x+2.88*z)*.19+Math.cos(4.28*x+3.27*z)*.16;
  const hill=(x,s)=>{const dist=Math.abs(x-roadX(s));return -.065+smooth((dist-2.7)/10)*(.40+.16*Math.sin(x*.7+s*.32)+.43*Math.sin(x*.14-s*.22));};
  function ground(g){
    const pos=[],idx=[],colors=[];
    for(let iz=0;iz<=100;iz++)for(let ix=0;ix<=108;ix++){
      const x=(ix-54)*1.55,s=(iz-21)*1.03,y=hill(x,s);
      const v=.968+.017*noise(x*.27,s*.27);
      pos.push(x,y,-s);colors.push(v*.921,v*.967,v);
      if(iz<100&&ix<108){const i=iz*109+ix;idx.push(i,i+1,i+109,i+1,i+110,i+109);}
    }
    const snow=surface(g,mat(0xf0f4f0,.93,0,{vertexColors:true,bumpMap:Art.crust,bumpScale:.026}),pos,idx,colors);snow.castShadow=false;
    // Three separate folded ridgelines have snow on ledges and exposed rock on steep faces.
    const layers=[
      {s:141,base:6,amp:25,scale:1.08,rock:0x8794a1,white:0xd6dce2},
      {s:109,base:4,amp:16,scale:1.37,rock:0x83929b,white:0xcbd7dd},
      {s:77,base:1.4,amp:8.2,scale:1.95,rock:0x778e92,white:0xc4d3d6}
    ];
    for(let l=0;l<layers.length;l++){
      const L=layers[l],p=[],face=[],col=[],n=240,rows=24;
      const rock=new T.Color(L.rock),white=new T.Color(L.white),tone=new T.Color();
      for(let z=0;z<=rows;z++)for(let i=0;i<=n;i++){
        const x=(i-n/2)*1.72,u=z/rows,k=x*L.scale;
        const ridge=.30+.33*Math.abs(Math.sin(k*.047+1.8*l))+.26*Math.abs(Math.sin(k*.081+2.1*l+.6))+.11*Math.cos(k*.15+l);
        const saddle=.37*Math.exp(-Math.pow((x+L.s*.42)/(L.s*.31),4));
        const crest=L.base+L.amp*ridge*(1-saddle)+noise(k*.12,l)*1.6;
        const fold=.48*Math.sin(x*.39+u*4+l)+.27*Math.sin(x*.78-u*7)+.13*Math.sin(x*1.52+u*11);
        const y=-1+(crest+1)*Math.pow(u,.83) + fold*(1.1+u*1.7)*Math.sin(u*Math.PI);
        const s=L.s+u*20+3.7*Math.sin(k*.089+l)+2.05*fold;
        p.push(x,y,-s);
        const snowy=smooth((u-.25)*1.25+fold*.65+.28*noise(k*.24,u*12));
        tone.copy(rock).lerp(white,snowy);col.push(tone.r,tone.g,tone.b);
        if(i<n&&z<rows){const a=z*(n+1)+i;face.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}
      }
      const mountain=surface(g,mat(0xffffff,.98,0,{vertexColors:true,flatShading:true,side:T.DoubleSide}),p,face,col);mountain.castShadow=false;
    }
  }
  function pineGeometry(seed){
    const r=SnowRoad.rng(seed),p=[],cols=[],indices=[];
    const needle=new T.Color(0x405b5b),shade=new T.Color(0x647d80),snow=new T.Color(0xe0eaeb),edge=new T.Color(0xc1d2d7),t=new T.Color();
    function pt(x,y,z,c){p.push(x,y,z);cols.push(c.r,c.g,c.b);return p.length/3-1;}
    function tri(a,b,c){indices.push(a,b,c);}
    const tilt=(r()-.5)*.055;
    // Each branch has a dark, drooping lower fan below a rounded, lobed snow load.
    for(let tier=0;tier<11;tier++){
      const u=tier/11,h=.09+.84*u,rad=.238*Math.pow(1-u,.79)+.008;
      const branches=Math.round(12-6*u),offset=r()*6.28;
      for(let j=0;j<branches;j++){
        const a=offset+(j+r()*.32)*Math.PI*2/branches,len=rad*(.82+.34*r()),w=(.34+.17*r())*len;
        const y=h+(r()-.5)*.044,dip=(.11-.065*u)*(.8+.4*r());
        const dx=Math.cos(a),dz=Math.sin(a),broad=.67+.23*r();
        function v(d,side,up,c){return pt(tilt*h+dx*d-dz*side,y+up,dz*d+dx*side,c);}
        t.copy(needle).lerp(shade,r()*.6);
        const base=v(0,0,.045,t),l=v(len*.69,-w,-dip*.66,t),m=v(len,0,-dip,t),rr=v(len*.7,w,-dip*.69,t);
        tri(base,l,m);tri(base,m,rr);tri(l,rr,m);
        const cap=v(len*.27,0,.056*(1-u*.69),snow),sl=v(len*.60,-w*broad,-dip*.36,edge),sr=v(len*.59,w*broad,-dip*.35,edge);
        const nose=v(len*.94,0,-dip*.75,edge),mid=v(len*.67,0,-dip*.16,snow);
        tri(base,cap,sl);tri(base,sr,cap);tri(cap,mid,sl);tri(cap,sr,mid);tri(mid,nose,sl);tri(mid,sr,nose);
      }
    }
    const top=pt(tilt,1.036,0,snow);
    for(let j=0;j<7;j++){const a=j*.898,b=(j+1)*.898;tri(top,pt(tilt+.045*Math.cos(a),.886,.045*Math.sin(a),edge),pt(tilt+.045*Math.cos(b),.886,.045*Math.sin(b),snow));}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));const uv=[];for(let i=0;i<p.length;i+=3)uv.push(p[i]*2+p[i+1],p[i+2]*2);
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  function forest(g){
    const trees=[],rnd=SnowRoad.rng(9321);
    const add=(x,s,h)=>trees.push({x,s,h,a:rnd()*6.28,w:.88+rnd()*.29});
    [[-7,4,7.6],[-8.7,7.2,6.8],[-8.4,12,5],[-10,3,5.8],[-12,15,8.1],[-10.6,23,6.5],[6.8,15.5,6.4],[6.9,21,7.7],[8.5,24,6.4],[4.9,28.5,4.7],[-10.7,29,5.9],[-8.6,34,4.1]].forEach(v=>add(...v));
    for(let i=0;i<155;i++){
      let s=rnd()*86+2,x=(rnd()-.5)*112;
      if(s<40 && x>-13&&x<12)continue;
      if(s>37&&s<53 && Math.abs(x+3)<5)continue;
      add(x,s,2.8+rnd()*6.2);
    }
    // Foothill spruce line; simpler trees at this distance keep the horizon fine.
    const distant=mat(0x748a8d,.98),dgeo=new T.ConeGeometry(1,1,7);
    const far=new T.InstancedMesh(dgeo,distant,370),dummy=new T.Object3D();
    for(let i=0;i<370;i++){const x=(rnd()-.5)*145,s=52+rnd()*24,h=2+rnd()*4+2*Math.cos(x*.08);
      dummy.position.set(x,h*.5+hill(x,s),-s);dummy.scale.set(h*.19,h,h*.19);dummy.rotation.set(0,rnd()*6.28,0);dummy.updateMatrix();far.setMatrixAt(i,dummy.matrix);}
    g.add(far);
    const tm=mat(0xffffff,.94,0,{vertexColors:true,side:T.DoubleSide});
    for(let k=0;k<4;k++){
      const part=trees.filter((_,i)=>i%4===k);
      const m=new T.InstancedMesh(pineGeometry(329+k),tm,part.length);
      for(let i=0;i<part.length;i++){const q=part[i],h=hill(q.x,q.s);
        dummy.position.set(q.x,h,-q.s);dummy.rotation.set(0,q.a,0);dummy.scale.set(q.h*q.w,q.h,q.h*q.w);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
        rod(g,C.bark,[q.x,h-.05,-q.s],[q.x,h+q.h*.63,-q.s],q.h*.023,q.h*.011,7);}
      m.castShadow=true;m.receiveShadow=true;g.add(m);
    }
  }
  function snowyRoof(g,x,y,z,w,d,rise){
    // Ridge along z, gable faces the road.
    const slope=Math.atan2(rise,w*.5),span=Math.hypot(w*.5,rise);
    for(const side of [-1,1]){
      const sheet=box(g,C.roof,x+side*w*.25,y+rise*.5,z,span+.17,.15,d);sheet.rotation.z=-side*slope;
      const cap=box(g,C.snowLight,x+side*w*.25,y+rise*.5+.102,z,span+.22,.18,d+.14);cap.rotation.z=-side*slope;
      rod(g,C.darkWood,[x,y+rise,z+d*.5+.024],[x+side*w*.51,y-.04,z+d*.5+.024],.052);
    }
    const m=mat(0xc2b198,.9,0,{side:T.DoubleSide});
    surface(g,m,[x-w*.49,y,z+d*.49,x+w*.49,y,z+d*.49,x,y+rise,z+d*.49],[0,1,2]);
  }
  function school(g){
    const b=group(g,-1.63,.08,-40),windows=[];
    box(b,C.wall,0,2.00,0,8.3,4.0,4.6);
    box(b,C.darkWood,0,.27,0,8.45,.52,4.7);
    box(b,C.cream,0,2.0,.01,8.42,.13,4.77);
    const roof=group(b,0,0,0);roof.rotation.y=Math.PI/2;snowyRoof(roof,0,4.04,0,5.26,8.94,1.67);bake(roof);
    const frame=mat(0x768886,.63),pane=mat(0x758c90,.16,.34);
    let idx=0;
    for(const level of [1.08,2.95])for(const x of [-3.27,-2.16,-1.04,1.04,2.16,3.27]){
      box(b,C.cream,x,level,2.332,.90,1.18,.09);box(b,frame,x,level,2.392,.791,1.064,.08);
      const m=pane.clone();m.emissive.setHex(0xffb658);
      const win=box(b,m,x,level,2.445,.697,.972,.026);windows.push(m);idx++;
      box(b,C.cream,x,level+.12,2.47,.70,.044,.035);
      box(b,C.cream,x,level-.02,2.472,.048,.96,.03);
      box(b,C.snowLight,x,level-.57,2.44,1.01,.093,.22);
    }
    // Front clock gable, a timber entrance and a small bell cupola.
    box(b,C.wall,0,2.07,2.36,1.78,4.14,.75);snowyRoof(b,0,4.15,2.39,2.4,1.48,1.25);
    const axis=(m,r,z,h)=>{const o=cyl(b,m,0,4.325,z,r,r,h,40);o.rotation.x=Math.PI/2;};
    axis(C.darkWood,.391,3.13,.13);axis(C.cream,.335,3.214,.05);
    rod(b,C.black,[0,4.325,3.25],[-.145,4.425,3.25],.021);
    rod(b,C.black,[0,4.325,3.256],[.06,4.565,3.256],.014);
    box(b,C.teal,0,.95,2.77,1.03,1.89,.14);
    for(const s of [-1,1]){box(b,C.deepGlass,s*.24,1.32,2.85,.36,.74,.03);rod(b,C.darkWood,[s*.83,.1,3.42],[s*.83,2.3,3.42],.067);}
    snowyRoof(b,0,2.27,3.04,2.21,1.37,.54);
    box(b,C.icy,0,.09,3.05,2.17,.18,1.55);
    box(b,C.teal,0,5.93,-.17,.86,.79,.86);
    for(const s of [-1,1])for(const k of [-1,0,1])box(b,C.black,k*.205,5.96,s*.444,.11,.39,.03);
    const rooflet=cyl(b,C.roof,0,6.55,-.17,0,.87,.73,4);rooflet.rotation.y=Math.PI/4;
    const snowlet=cyl(b,C.snowLight,0,6.64,-.17,0,.88,.73,4);snowlet.rotation.y=Math.PI/4;
    rod(b,C.iron,[0,6.93,-.17],[0,7.28,-.17],.027);
    bake(b);return windows;
  }
  function family(g,x,y,z,scale,coat,hat){
    const p=group(g,x,y,z);p.scale.setScalar(scale);
    for(const k of [-1,1]){
      rod(p,C.black,[k*.105,.12,.004],[k*.09,.59,0],.067);
      orb(p,C.darkWood,k*.105,.084,.039,.092,.08,.15);
    }
    const jacket=mat(coat,.90),knit=mat(hat,.95),skin=mat(0xbf9071,.89);
    const a=cyl(p,jacket,0,.79,0,.162,.225,.61,14);
    orb(p,jacket,0,1.07,0,.178,.127,.16);
    orb(p,skin,0,1.275,0,.135,.171,.131);
    orb(p,knit,0,1.383,-.01,.145,.124,.141);
    cyl(p,knit,0,1.35,0,.148,.151,.058,16);
    orb(p,knit,0,1.512,-.01,.051,.052,.05);
    rod(p,jacket,[-.125,1.055,.00],[-.245,.719,.025],.069);
    rod(p,jacket,[.13,1.05,0],[.244,.96,.129],.069);
    orb(p,skin,.24,.966,.157,.057,.065,.052);bake(p);return p;
  }
  function shelter(g){
    const x=roadX(16)-3.61,s=16.5;
    const p=group(g,x,.135,-s);p.rotation.y=.26;
    box(p,C.icy,0,.037,0,3.22,.129,1.86);
    for(const sign of [-1,1]){
      box(p,C.teal,sign*1.32,1.14,-.52,.099,2.25,.11);
      box(p,C.teal,sign*1.32,1.16,.57,.099,2.28,.11);
    }
    for(let i=0;i<8;i++)box(p,C.freshWood,0,.56+i*.157,-.56,2.74,.136,.074);
    box(p,C.wood,0,.537,-.28,2.43,.111,.43);
    for(const k of [-1,1])box(p,C.teal,k*.88,.28,-.29,.09,.55,.3);
    const roof=box(p,C.teal,0,2.32,0,3.12,.142,1.69);roof.rotation.x=-.12;
    const cap=rounded(p,C.snowLight,0,2.419,-.012,3.19,.134,1.78,.048);cap.rotation.x=-.12;
    // Text-free enamel bus-stop sign, modelled in relief.
    rod(p,C.iron,[1.88,.02,.47],[1.88,2.97,.47],.043);
    const disk=(m,r,z,h)=>{const d=cyl(p,m,1.88,2.78,z,r,r,h,32);d.rotation.x=Math.PI/2;};
    disk(C.teal,.322,.49,.076);disk(C.cream,.269,.543,.03);
    rounded(p,C.teal,1.88,2.79,.566,.29,.28,.043,.02);
    box(p,C.cream,1.88,2.83,.595,.215,.10,.012);
    for(const sign of [-1,1]){box(p,C.teal,1.88+sign*.086,2.635,.571,.043,.062,.031);orb(p,C.cream,1.88+sign*.085,2.728,.593,.022,.017,.012);}
    family(p,.42,.09,.52,.99,0x7c8795,0xb78965);
    family(p,-.92,.09,.62,1.03,0x526b6c,0xdfc5a0);
    family(p,-.27,.09,.83,.69,0xad7951,0xc79682);
    const umbrella=group(p,-.65,1.68,.69);umbrella.rotation.z=-.105;
    rod(umbrella,C.wood,[.02,-.62,0],[0,.33,0],.017);
    const po=[],ix=[],co=[],red=new T.Color(0xab6d5d),cream=new T.Color(0xc08b75),clr=new T.Color();
    for(let k=0;k<10;k++){
      const a=k*Math.PI/5,b=a+Math.PI/5;const id=po.length/3;
      clr.copy(k%2?red:cream);
      for(const [r,ang,h] of [[0,a,.36],[.43,a,.225],[.43,b,.225],[.64,a,.035],[.62,(a+b)*.5,.09],[.64,b,.035]]){
        po.push(Math.cos(ang)*r,h,Math.sin(ang)*r);co.push(clr.r,clr.g,clr.b);}
      ix.push(id,id+2,id+1,id+1,id+2,id+4,id+1,id+4,id+3,id+2,id+5,id+4);
    }
    surface(umbrella,mat(0xffffff,.83,0,{vertexColors:true,side:T.DoubleSide}),po,ix,co);
    bake(p);return umbrella;
  }
  function details(g){
    // Snow guards at the roadside carry a narrow rust-red band, with no lettering.
    for(const side of [-1,1])for(let i=0;i<6;i++){
      const s=1.6+i*6.62+(side>0?1.35:0),x=roadX(s)+side*2.90;
      if(side<0&&s>13&&s<20)continue;
      rod(g,C.wood,[x,.17,-s],[x+.018*side,1.07,-s],.041,.032);
      cyl(g,C.cream,x+.018*side,.972,-s,.039,.039,.28,10);
      cyl(g,C.red,x+.018*side,1.024,-s,.04,.04,.084,10);
    }
    // Split rails end at the stop and at the school gate.
    for(const [side,first,count] of [[-1,-6.1,7],[1,8.7,5],[1,26.2,4]]){
      let prev=null;
      for(let i=0;i<count;i++){
        const s=first+i*2.52,x=roadX(s)+side*(4.22+.12*Math.sin(i)),h=.78+rand()*.12;
        box(g,C.wood,x,h*.5,-s,.158,h,.169).rotation.z=(rand()-.5)*.05;
        orb(g,C.snowLight,x,h+.012,-s,.112,.061,.122);
        if(prev)for(const y of [.33,.65]){
          const a=[prev.x,y,-prev.s],b=[x,y+.021,-s];rod(g,C.freshWood,a,b,.065,.066,5);
          if(y>.5)rod(g,C.snow,[a[0],a[1]+.044,a[2]],[b[0],b[1]+.044,b[2]],.043,.04,5);
        }prev={x,s};
      }
    }
    const stone=mat(0x869797,.94),rock=new T.IcosahedronGeometry(1,1);
    for(let i=0;i<66;i++){
      const s=rand()*54-11,side=rand()<.5?-1:1,x=roadX(s)+side*(3.27+rand()*4.4),r=.13+rand()*.44;
      const o=mesh(g,rock,stone,x,hill(x,s)+.035,-s);o.scale.set(r,r*.55,r*.75);o.rotation.y=rand()*6.28;
      const cap=mesh(g,rock,C.snow,x-.018,hill(x,s)+.095+r*.11,-s);cap.scale.set(r*.98,r*.44,r*.75);cap.rotation.y=o.rotation.y;
    }
    // A few golden grass blades break through the white shoulders.
    const stem=mat(0x9e937b,.96);
    for(let i=0;i<73;i++){
      const s=rand()*41-8,x=roadX(s)+(rand()<.5?-1:1)*(2.93+rand()*3.2);
      for(let j=0;j<4;j++){const dx=(rand()-.5)*.2;
        rod(g,stem,[x+dx,hill(x,s)+.03,-s],[x+dx*2+.06,.21+rand()*.29,-s+rand()*.11],.008,.003,4);}
    }
    for(const [x,s,w,h] of [[-15,26,3.7,2.4],[-13,38,4.8,2.9],[10,42,4.3,2.6],[-22,32,4.3,2.3],[9,50,3.6,2.1]]){
      const hse=group(g,x,hill(x,s),-s);hse.rotation.y=rand()*.55-.2;
      box(hse,C.freshWood,0,h/2,0,w,h,3.25);snowyRoof(hse,0,h,0,w+.52,3.86,1.46);
      for(const k of [-1,1]){box(hse,C.cream,k*w*.24,h*.56,1.65,.90,1.04,.075);box(hse,C.deepGlass,k*w*.24,h*.56,1.709,.71,.83,.044);box(hse,C.cream,k*w*.24,h*.56,1.737,.042,.84,.019);}
      box(hse,C.darkWood,-.87,h+1.02,.44,.43,1.1,.45);bake(hse);
    }
    // High wires follow a sagging catenary between wooden poles on the far verge.
    const poles=[[-11,13,5.3],[-12.5,29,5.15],[-12,46,5],[-13.5,64,5]];
    for(let i=0;i<poles.length;i++){const [x,s,h]=poles[i];rod(g,C.wood,[x,0,-s],[x,h,-s],.106,.082);
      box(g,C.wood,x,h-.19,-s,1.12,.092,.09);
      for(const side of [-1,1]){
        cyl(g,C.icy,x+side*.44,h-.07,-s,.059,.067,.17,8);
        if(i){const [px,ps,ph]=poles[i-1];let a=[px+side*.44,ph,-ps];
          for(let k=1;k<=9;k++){const u=k/9,b=[px+(x-px)*u+side*.44,ph+(h-ph)*u-.39*4*u*(1-u),-(ps+(s-ps)*u)];rod(g,C.darkWood,a,b,.013,.013,5);a=b;}}
      }
    }
  }
  function build(scene){const staticGroup=group(scene);ground(scene);forest(staticGroup);details(staticGroup);
    const lamps=school(staticGroup),umbrella=shelter(staticGroup);bake(staticGroup);return {lamps,umbrella};}
  return {build,hill};
})();
