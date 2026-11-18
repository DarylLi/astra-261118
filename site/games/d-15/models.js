'use strict';
const cream=mat('#f9ecd0',.57), ink=mat('#343f3d',.46,.36), steel=mat('#a2aaa3',.29,.78),coal=mat('#384542',.64,.27),trim=mat('#ddc7a0'),red=mat('#ae5139',.63),brass=mat('#bd975a',.33,.65);
function wood(color,seed){
  const w=128,h=64,data=new Uint8Array(w*h*4),base=C(color).convertLinearToSRGB();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const grain=noise(x*.029+seed,y*.72+noise(x*.032,y*.08)*1.7),ring=Math.sin(y*.98+noise(x*.047,y*.12)*3.1),v=.86+grain*.18+ring*.035+hash(x,y)*.045,i=(y*w+x)*4;
    data[i]=Math.min(255,base.r*v*255);data[i+1]=Math.min(255,base.g*v*255);data[i+2]=Math.min(255,base.b*v*255);data[i+3]=255;}
  const t=new T.DataTexture(data,w,h);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return mat(0xffffff,.82,0,{map:t});
}
const timber=wood('#9a714b',3),log=wood('#a17952',11),honey=wood('#c49a65',32),lightWood=wood('#ddbb86',6),darkwood=wood('#70523e',17);
function badge(p,x,y,z,r){
  // Enamel edelweiss, repeated on the fuselage and the cargo seals.
  const disc=mesh(p,new T.CylinderGeometry(r,r,.022,32),red,x,y,z);disc.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){const a=i*tau/6;ell(p,cream,x+Math.sin(a)*r*.34,y+Math.cos(a)*r*.34,z+.017,r*.145,r*.30,.012).rotation.z=-a;}
  ell(p,brass,x,y,z+.034,r*.16,r*.16,.014);
}
function helicopter(){
  const root=group(),airframe=group(root),gold=mat('#efb52f',.34,.32),sun=mat('#ffcd49',.37,.23),edge=mat('#b28226',.43,.39),black=mat('#273332',.41,.40);
  const glass=new T.MeshPhysicalMaterial({color:'#344f56',roughness:.115,metalness:.41,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.65,roughnessMap:roughTex,side:T.DoubleSide});
  const sections=[[-1.83,.12,.16,.85],[-1.55,.48,.55,.88],[-1.08,.73,.76,.93],[-.48,.83,.87,.94],[.35,.86,.90,.94],[.85,.80,.82,.91],[1.3,.65,.66,.85],[1.59,.41,.47,.76],[1.78,.17,.23,.70],[1.83,.02,.055,.69]];
  function surface(x,a,out=0){
    let i=0;while(i<sections.length-2&&sections[i+1][0]<x)i++;const A=sections[i],B=sections[i+1],u=sat((x-A[0])/(B[0]-A[0]));
    return V(x,mix(A[3],B[3],u)+(mix(A[2],B[2],u)+out)*Math.sin(a),(mix(A[1],B[1],u)+out)*Math.cos(a));
  }
  function skin(parent,m,x0,x1,a0,a1,out,n,mn,shape){
    const pos=[],ind=[];for(let i=0;i<=n;i++)for(let j=0;j<=mn;j++){const u=i/n,v=j/mn;
      const p=shape?shape(u,v):surface(mix(x0,x1,u),mix(a0,a1,v),out);pos.push(p.x,p.y,p.z);
      const k=i*(mn+1)+j;if(i<n&&j<mn)ind.push(k,k+mn+1,k+1,k+1,k+mn+1,k+mn+2);}
    return mesh(parent,geom(pos,ind),m);
  }
  gold.side=T.DoubleSide;skin(airframe,gold,-1.83,1.83,-Math.PI,Math.PI,0,54,36);
  for(const side of [1,-1]){
    function panel(x1,x2,lo,hi,slope){
      const point=(u,v,out)=>{const x=mix(x1,x2,u)+(v-.5)*slope*(1-u);const angle=mix(lo+.035*Math.sin(u*Math.PI),hi,v);return surface(x,side===1?angle:Math.PI-angle,out);};
      skin(airframe,glass,0,1,0,1,0,16,9,(u,v)=>point(u,v,.018));
      for(const [u1,v1,u2,v2] of [[0,0,1,0],[0,1,1,1],[0,0,0,1],[1,0,1,1]]){
        const pts=Array.from({length:10},(_,i)=>point(mix(u1,u2,i/9),mix(v1,v2,i/9),.035));
        tube(airframe,black,pts,.024,6);
      }
    }
    panel(-.99,-.47,.06,.98,.14);panel(-.39,.39,.045,1.09,.06);panel(.48,1.76,-.045,1.50,.32);
    const line=[];for(let j=0;j<18;j++){const x=mix(-1.49,1.35,j/17);line.push(surface(x,side===1?-.23:Math.PI+.23,.012));}
    tube(airframe,cream,line,.035,8);
    const joint=[];for(const [x,a] of [[-.43,.97],[-.43,-.15],[-.39,-.57],[.33,-.58],[.45,-.32],[.48,.04]])joint.push(surface(x,side===1?a:Math.PI-a,.017));tube(airframe,edge,joint,.012,5);
    box(airframe,black,-.25,.89,side*.871,.23,.052,.038);
  }
  badge(airframe,-.82,.73,.764,.175);
  for(let i=0;i<5;i++)ell(airframe,steel,-1+i*.30,.49,.69,.020,.020,.018);
  // Transmission cowling, roof air inlet, exhaust ring and inspection ribs.
  ell(airframe,gold,-.53,1.73,0,.94,.40,.55);ell(airframe,edge,-.67,1.76,.46,.47,.19,.071);
  for(let i=0;i<7;i++)box(airframe,black,-.98+i*.090,1.8,.509,.032,.19,.025).rotation.z=-.22;
  for(const s of [-1,1]){cyl(airframe,steel,V(-1.06,1.78,s*.31),V(-1.57,1.86,s*.34),.15,.175,20);cyl(airframe,black,V(-1.56,1.86,s*.34),V(-1.58,1.86,s*.34),.118,.123,20);}
  cyl(airframe,gold,V(-1.33,1.04,0),V(-4.43,1.58,0),.132,.46,20);
  for(let i=0;i<2;i++){const x=-3.84-i*.235,t=(-1.33-x)/3.1;
    cyl(airframe,cream,V(x,1.04+t*.54,0),V(x-.13,1.04+(t+.042)*.54,0),.46-(t+.042)*.328+.012,.46-t*.328+.012,18);}
  function fin(points,depth,m){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const o=mesh(airframe,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.023,bevelSize:.023,bevelSegments:2,steps:1}),m);o.position.z=-depth/2;return o;}
  fin([[-4.46,1.45],[-4.68,2.60],[-4.37,2.55],[-3.89,1.54]],.13,gold);fin([[-4.62,2.38],[-4.68,2.60],[-4.37,2.55],[-4.26,2.36]],.143,cream);
  box(airframe,gold,-3.55,1.40,0,.48,.075,1.48).rotation.z=.03;
  for(const side of [-1,1]){
    tube(airframe,coal,[V(-1.70,-.31,side*.82),V(-1.54,-.41,side*.82),V(-1.2,-.42,side*.82),V(.98,-.42,side*.82),V(1.35,-.39,side*.82),V(1.61,-.17,side*.82)],.063,10);
    for(const x of [-.88,.80])tube(airframe,steel,[V(x,.46,side*.49),V(x+.04,.14,side*.66),V(x+.07,-.34,side*.82)],.049,8);
    box(airframe,black,-.02,-.34,side*.83,.96,.06,.13);
  }
  ell(airframe,black,0,-.17,0,.19,.22,.17);cyl(airframe,steel,V(0,1.91,0),V(0,2.46,0),.064,.082);ell(airframe,black,0,2.20,0,.19,.13,.19);
  for(const x of [-.17,.17])cyl(airframe,steel,V(x,1.94,.07),V(x*.66,2.4,.07),.021);
  const rotor=group(root);rotor.position.y=2.45;ell(rotor,steel,0,0,0,.205,.095,.20);
  for(let i=0;i<3;i++){
    const arm=group(rotor);arm.rotation.y=i*tau/3;
    box(arm,steel,.27,0,0,.46,.05,.082);
    const blade=box(arm,black,1.94,.026,.068,2.99,.042,.174);blade.rotation.z=.014;blade.rotation.y=-.03;
    box(arm,sun,3.37,.047,.112,.18,.048,.176);box(arm,cream,3.50,.048,.116,.075,.046,.176);
  }
  const tail=group(root);tail.position.set(-4.41,1.74,.17);ell(tail,steel,0,0,.075,.105,.105,.09);
  for(let i=0;i<2;i++){const arm=group(tail);arm.rotation.z=i*Math.PI;box(arm,black,.34,0,.078,.65,.092,.036);box(arm,cream,.62,0,.078,.10,.092,.040);box(arm,red,.53,0,.078,.081,.092,.040);}
  batch(airframe);batch(rotor);batch(tail);
  const links=Array.from({length:8},()=>mesh(scene,new T.CylinderGeometry(.022,.022,1,8),mat('#736448',.86,.13)));
  const hook=group();tube(hook,brass,[V(0,.09,0),V(0,-.04,0),V(.085,-.135,0),V(.16,-.08,0),V(.146,-.015,0)],.037,8);ell(hook,steel,0,.10,0,.059,.087,.059);
  return {root,update(S){root.position.set(S.h.x,S.h.y+.45,S.h.z);root.rotation.set(S.h.pitch,.44,S.h.roll);rotor.rotation.y=S.rotor.phase;tail.rotation.z=S.rotor.tail;
    let a=V(S.h.x,S.h.y+.05,S.h.z);S.rope.forEach((r,i)=>{const b=V(r.x,r.y,r.z),d=V().subVectors(b,a),o=links[i];o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());o.scale.y=d.length();a=b;});hook.position.copy(a);}};
}
function makeCrate(i){
  const root=group(),body=group(root),lid=group(root),bell=group(root),stamp=mat('#c6714c'),slat=i%2?lightWood:honey;
  for(let j=0;j<4;j++){
    const y=.13+j*.234;for(const z of [-.50,.50])box(body,j%2?honey:slat,0,y,z,1.23,.223,.078);
    for(const x of [-.584,.584])box(body,j%2?honey:slat,x,y,0,.075,.223,.95);
  }
  box(body,darkwood,0,.09,0,1.16,.15,.99);
  for(const z of [-.57,.57]){
    for(const x of [-.535,.535])box(body,lightWood,x,.48,z,.16,.98,.071);
    for(const y of [.10,.86])box(body,lightWood,0,y,z,1.23,.16,.073);
    beam(body,lightWood,V(-.49,.18,z),V(.49,.80,z),.125,.081);
    for(const x of [-.535,.535])for(const y of [.12,.84])ell(body,coal,x,y,z+Math.sign(z)*.040,.024,.024,.013,littleSphere);
  }
  lid.position.set(0,.98,-.51);
  for(let j=0;j<5;j++)box(lid,j%2?lightWood:honey,0,0,.115+j*.205,1.27,.095,.199);
  for(const x of [-.452,.452])box(lid,stamp,x,.062,.52,.093,.035,1.08);
  tube(lid,brass,[V(-.13,.05,.52),V(-.11,.24,.52),V(0,.292,.52),V(.11,.24,.52),V(.13,.05,.52)],.035,8);
  badge(body,.18,.55,.615,.145);batch(body);batch(lid);
  // Suspended Japanese glass bell, brass tubes, wooden clapper and paper sail.
  const glass=new T.MeshPhysicalMaterial({color:'#b7dbd3',metalness:.25,roughness:.14,clearcoat:1,roughnessMap:roughTex});
  const profile=[[.04,.31],[.12,.28],[.205,.19],[.228,.08],[.233,.025],[.217,.012]].map(([x,y])=>new T.Vector2(x,y));
  const shell=mesh(bell,new T.LatheGeometry(profile,28),glass);shell.material.side=T.DoubleSide;
  cyl(bell,brass,V(0,.31,0),V(0,.39,0),.040);cyl(bell,brass,V(0,.15,0),V(0,-.53,0),.012);
  for(let j=0;j<3;j++){const a=j*tau/3;cyl(bell,brass,V(Math.cos(a)*.145,.07,Math.sin(a)*.145),V(Math.cos(a)*.145,-.22-j*.048,Math.sin(a)*.145),.026);}
  ell(bell,honey,0,-.29,0,.07,.052,.07);box(bell,[red,cream,mat('#67958c')][i],0,-.55,0,.13,.29,.026);batch(bell);
  const hanger=mesh(root,new T.CylinderGeometry(.018,.025,1,8),brass);return {root,update(c){
    root.position.set(c.x,c.y,c.z);root.rotation.z=c.tilt;lid.rotation.x=-c.lid;bell.visible=c.rise>.17;bell.position.set(0,.40+c.rise,0);bell.rotation.z=c.bell;hanger.visible=c.rise>.17;hanger.position.set(0,1.05+c.rise*.36,-.06);hanger.scale.y=c.rise*.76;
  }};
}
function person(parent,x,z,variant){
  const p=group(parent);p.position.set(x,1.13,z);p.rotation.y=variant?-.14:-.24;
  const body=group(p),skin=mat(variant?'#d4a080':'#c78e6c'),hair=mat(variant?'#654736':'#644936'),shirt=mat(variant?'#a6b9a2':'#ae6b4c'),trouser=mat(variant?'#54676a':'#677976');
  for(const s of [-1,1]){cyl(body,trouser,V(s*.105,.68,0),V(s*.118,.11,.017),.083,.097);ell(body,darkwood,s*.116,.078,.061,.105,.071,.16);}
  ell(body,shirt,0,.85,0,.27,.38,.18);cyl(body,skin,V(0,1.10,0),V(0,1.28,0),.081);
  ell(body,skin,0,1.41,.01,.185,.235,.165);ell(body,hair,0,1.53,-.026,.194,.148,.174);
  ell(body,skin,0,1.40,.17,.042,.048,.045);
  for(const s of [-1,1])ell(body,hair,s*.073,1.45,.153,.017,.017,.014);
  if(!variant){ell(body,hair,.13,1.35,-.094,.109,.19,.105);ell(body,hair,-.08,1.31,-.139,.15,.15,.12);ell(body,cream,0,1.57,-.01,.245,.034,.212);ell(body,honey,0,1.62,-.02,.172,.105,.163);}
  else{ell(body,hair,0,1.52,.085,.167,.070,.12);box(body,cream,0,1.084,.151,.13,.054,.03);}
  batch(body);
  return [-1,1].map(s=>{const joint=group(p);joint.position.set(s*.217,1.033,0);
    cyl(joint,shirt,V(0,0,0),V(s*.07,-.207,.018),.075,.096);cyl(joint,skin,V(s*.07,-.19,.018),V(s*.107,-.391,.071),.050,.066);
    ell(joint,skin,s*.108,-.416,.072,.063,.077,.056);batch(joint);return {joint,s};});
}
function cabin(map){
  const root=group();root.position.set(map.cx,0,map.cz);const p=group(root),roof=mat('#506d66',.57,.32),seam=mat('#729085',.59,.33),stone=mat('#9a9a85'),glass=mat('#4d7175',.13,.46),awning=mat('#b7654b',.89),linen=mat('#eee1ba',.94);
  // Rubble footing, raised veranda and individually laid wall courses.
  box(p,stone,0,.43,-.10,4.65,.86,3.65);
  for(let i=0;i<16;i++)for(let j=0;j<2;j++)box(p,i%3?stone:trim,-2.26+i*.301,.23+.33*j,1.75,.282,.30,.15);
  for(let i=0;i<15;i++){const y=.94+i*.182;box(p,i%3?log:timber,0,y,-.12,4.76,.171,3.68);}
  for(const x of [-2.30,2.3])for(const z of [-1.91,1.68])box(p,darkwood,x,2.1,z,.18,2.90,.18);
  const gable=geom([-2.38,3.58,1.74,2.38,3.58,1.74,0,5.40,1.74,-2.38,3.58,-2.00,2.38,3.58,-2,0,5.4,-2],[0,1,2,5,4,3]);mesh(p,gable,log);
  for(let j=0;j<8;j++){const y=3.62+j*.194;box(p,honey,0,y,1.769,4.54*(1-(y-3.6)/1.83),.039,.04);}
  for(const s of [-1,1]){
    const a=V(0,5.56,-.14),b=V(s*2.79,3.45,-.14);
    const r=beam(p,roof,a,b,.16,4.91);
    for(let j=0;j<=15;j++){const z=-2.55+j*.324;beam(p,seam,V(0,5.65,z),V(s*2.81,3.51,z),.043,.049);}
    for(const z of [-2.57,2.29])beam(p,cream,V(0,5.55,z),V(s*2.82,3.42,z),.13,.14);
  }
  cyl(p,roof,V(0,5.60,-2.58),V(0,5.60,2.31),.102,.102,12);
  box(p,darkwood,0,3.77,1.83,4.76,.13,.12);beam(p,cream,V(-1.05,3.85,1.82),V(0,4.77,1.82),.072,.082);beam(p,cream,V(1.05,3.85,1.82),V(0,4.77,1.82),.072,.082);
  function windowAt(x,y,w,h,shutters){
    box(p,cream,x,y,1.777,w+.14,h+.14,.095);box(p,glass,x,y,1.84,w,h,.053);
    box(p,cream,x,y,1.885,.049,h,.042);box(p,cream,x,y,1.886,w,.055,.042);
    box(p,honey,x,y-h/2-.08,1.89,w+.26,.091,.19);
    if(shutters)for(const s of [-1,1]){const sx=x+s*(w*.5+.24);box(p,red,sx,y,1.82,.31,h+.05,.094);for(let j=0;j<5;j++)box(p,awning,sx,y-h*.38+j*h*.19,1.88,.24,.047,.035);}
  }
  windowAt(0,4.35,.54,.47,false);windowAt(-1.30,2.59,.77,.87,true);windowAt(1.32,2.59,.77,.87,true);
  box(p,darkwood,0,1.98,1.81,.88,1.98,.12);box(p,glass,0,2.30,1.89,.58,.89,.04);box(p,cream,0,2.29,1.92,.58,.043,.03);ell(p,brass,.27,1.75,1.94,.041,.041,.027);
  // View-facing deck with a clear landing mat and low side railings.
  for(let i=0;i<22;i++)box(p,i%4?honey:timber,-2.93+i*.279,1.04,2.73,.267,.15,2.79);
  box(p,darkwood,0,.89,4.04,6.18,.22,.17);
  for(const x of [-2.85,0,2.85]){box(p,darkwood,x,.45,3.90,.21,.9,.21);beam(p,timber,V(x,.27,3.88),V(x+.49,.88,3.88),.13,.13);}
  for(const s of [-1,1]){
    for(const z of [1.74,2.53,3.92])box(p,honey,s*2.88,1.58,z,.14,1.12,.14);
    box(p,cream,s*2.88,2.12,2.84,.17,.112,2.36);box(p,log,s*2.88,1.59,2.84,.068,.065,2.18);
    for(const x of [s*2.86,s*2.33])box(p,honey,x,1.50,4.01,.11,.84,.12);
    box(p,cream,s*2.58,1.94,4.01,.70,.096,.15);
  }
  for(let j=0;j<13;j++){const x=-2.53+j*.423;const m=j%2?linen:awning;
    // The awning is a sloped fabric panel above each matching scallop.
    const cloth=box(p,m,x,3.305,2.24,.420,.048,1.075);cloth.rotation.x=.36;box(p,m,x,3.055,2.745,.419,.175,.055);ell(p,m,x,2.979,2.743,.206,.073,.029);}
  for(const x of [-2.60,2.60]){box(p,log,x,2.08,2.67,.112,2.12,.11);beam(p,timber,V(x,2.68,2.65),V(x,3.21,2.10),.073,.076);}
  for(let i=0;i<9;i++){box(p,i%3?stone:trim,1.31+.017*(i%2),4.36+i*.218,-.99,.57,.208,.65);}
  box(p,coal,1.31,6.22,-.99,.72,.12,.76);box(p,coal,1.31,6.30,-.99,.46,.10,.49);
  const rug=mat('#a75640',.99);box(p,rug,0,1.129,3.36,4.79,.024,1.30);
  for(const z of [2.82,2.92,3.80,3.90])box(p,linen,0,1.145,z,4.79,.013,.049);
  for(let j=0;j<41;j++)for(const side of [-1,1])box(p,linen,-2.34+j*.117,1.121,3.36+side*.688,.035,.02,.13);
  for(const x of [-1.46,0,1.46]){const tile=box(p,linen,x,1.151,3.35,.38,.010,.38);tile.rotation.y=Math.PI/4;box(p,rug,x,1.159,3.35,.20,.01,.20).rotation.y=Math.PI/4;}
  batch(p);
  const arms=[...person(root,-1.75,2.40,0),...person(root,1.68,2.32,1)];
  return S=>arms.forEach(({joint,s},i)=>{joint.rotation.z=s*S.arms[i].a;joint.rotation.x=-.11-S.arms[i].a*.10;});
}
function fence(map){
  const p=group();
  function run(points){let prev;for(const [x,z] of points){const y=landY(x,z);box(p,timber,x,y+.57,z,.16,1.18,.18).rotation.z=.035;
    if(prev)for(const h of [.42,.86])beam(p,honey,V(prev[0],prev[1]+h,prev[2]),V(x,y+h,z),.098,.125);
    prev=[x,y,z];}}
  run([[-14,8],[-11.8,7.7],[-9.7,7.2],[-8.1,6.7]]);
  run([[map.cx+4.4,-9],[map.cx+5.7,-7.4],[map.cx+7.4,-6.4],[map.cx+9.2,-5.8],[map.cx+11.4,-5.0]]);
  run([[-9.6,-8.5],[-7.9,-9.9],[-5.7,-10.5],[-3.7,-11.4]]);
  batch(p);
}
function windsock(map){
  const base=group(),x=map.cx-3.65,z=map.cz+1.15;box(base,timber,x,2.05,z,.095,4.1,.095);ell(base,brass,x,4.19,z,.12,.12,.12);
  const fabric=[cream,red],parts=[];for(let i=0;i<5;i++){
    const r=.25-i*.031,o=mesh(scene,new T.CylinderGeometry(r-.031,r,.31,16,1,true),fabric[i%2]);parts.push(o);}
  const pole=V(x,4.01,z);return S=>{const a=pole.clone();parts.forEach((o,i)=>{const s=S.sock[i],dir=V(.87,-.37+i*.034+s.a*.51,s.a*.78).normalize(),d=.31;o.position.copy(a).addScaledVector(dir,d/2);o.quaternion.setFromUnitVectors(V(0,1,0),dir);a.addScaledVector(dir,d);});};
}
function atmosphere(map){
  const dustMat=mat('#fae6ae',.54,0,{emissive:'#dccd90',emissiveIntensity:.12});
  const pollen=instance(scene,new T.IcosahedronGeometry(1,0),dustMat,Array.from({length:28},()=>({p:[0,0,0]})),false);pollen.frustumCulled=false;
  const smoke=Array.from({length:22},()=>{const m=mat('#e1dbcc',1,0,{transparent:true,opacity:0,depthWrite:false});const o=ell(scene,m,0,0,0,1,1,1,littleSphere);o.castShadow=false;return o;});
  const hues=['#d68578','#edaf7b','#e8cf85','#a8c899','#83babb','#989dc6'];
  const bows=[];const centerX=-2.1,centerZ=-31;
  for(let j=0;j<21;j++){
    const sections=[];for(let k=0;k<6;k++){const p=[],ind=[];for(let i=0;i<=3;i++){const a=(j+i/3)/21*Math.PI;
      for(const r of [7.25-k*.104,7.14-k*.104])p.push(centerX+Math.cos(a)*r,1.1+Math.sin(a)*r*.80,centerZ);}
      for(let i=0;i<3;i++){const n=i*2;ind.push(n,n+1,n+2,n+1,n+3,n+2);}
      const m=mat(hues[k],1,0,{transparent:true,depthWrite:false,opacity:0,side:T.DoubleSide,emissive:hues[k],emissiveIntensity:.15});
      const o=mesh(scene,geom(p,ind),m);o.castShadow=false;sections.push(o);}
    bows.push(sections);
  }
  const halo=group(),gold=mat('#f5d47a',.59,.10,{emissive:'#e7c46a',emissiveIntensity:.23});
  for(let i=0;i<14;i++){
    const a=i*tau/14,points=Array.from({length:5},(_,j)=>V(Math.cos(a+j*.066)*1.0,.028,Math.sin(a+j*.066)*.94));tube(halo,gold,points,.027,7);
  }
  batch(halo);const dummy=new T.Object3D();
  return S=>{S.dust.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar((.008+.008*(i%3))*p.bright);dummy.updateMatrix();pollen.setMatrixAt(i,dummy.matrix);});pollen.instanceMatrix.needsUpdate=true;
    S.smoke.forEach((p,i)=>{const o=smoke[i];o.visible=p.live&&p.alpha>.002;if(o.visible){o.position.set(map.cx+1.31+p.x,6.33+p.y,map.cz-.99+p.z);o.scale.set(p.r*.81,p.r*1.33,p.r*.88);o.material.opacity=p.alpha;}});
    bows.forEach((band,i)=>band.forEach(o=>{const density=S.arc[i].mist;o.visible=density>.004;if(o.visible)o.material.opacity=density*.50;}));
    halo.visible=S.phase==='pickup'||S.phase==='carry';const pick=S.phase==='pickup',c=pick?map.boxes[S.index]:map.pads[S.index];halo.position.set(c.x,pick?.005:1.168,c.z);
    const s=1+S.breeze[6].du*.034+S.guide.down*.044;halo.scale.set(pick?s:1.2*s,1,pick?s:.64*s);
  };
}
