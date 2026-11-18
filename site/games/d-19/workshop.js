/* The workshop is built in decimetres. All patterns and lighting probes are
   generated locally. Geometry carries the silhouette, threads and stamped details. */
(function(){
'use strict';
const T=THREE,PI=Math.PI,TAU=2*PI;
let seed=825934;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function tex(w,h,paint,color=true){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  paint(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);
  if(color)t.colorSpace=T.SRGBColorSpace;
  t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}
const grain=tex(128,128,(c,w,h)=>{
  const im=c.createImageData(w,h);for(let i=0;i<w*h;i++){let v=212+rand()*39;
    im.data.set([v,v,v,255],i*4);}c.putImageData(im,0,0);
},false);
const wood=tex(1024,512,(c,w,h)=>{
  const a=c.createImageData(w,h),lines=Array.from({length:h},()=>rand());
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const bend=5*Math.sin(x*.006+y*.012)+2*Math.sin(.018*x+y*.021);
    const ring=Math.sin(y*.18+bend*.42+Math.sin(y*.068));
    const g=4.5*ring+lines[y]*3+(rand()-.5)*6+3*Math.sin(y*.042+bend*.22);
    const pore=Math.max(0,Math.cos(y*1.56+.7*bend)-.87)*26;
    a.data.set([216+g-pore,179+g-pore,133+g-pore,255],4*(x+y*w));
  }c.putImageData(a,0,0);
  for(let k=0;k<640;k++){let x=rand()*w,y=rand()*h;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+12,y-.45,x+rand()*76+5,y+(rand()-.5)*1.3);
    c.strokeStyle=rand()>.35?'rgba(103,71,43,.105)':'rgba(255,246,207,.19)';c.lineWidth=rand()*.75+.22;c.stroke();}
});
function material(color,metalness=0,roughness=.6,opts={}){return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:grain,...opts});}
const mat={
  oak:material(0xffffff,0,.58,{map:wood}),edge:material(0xab805a,0,.52),darkwood:material(0x926c4c,0,.58),
  red:material(0xb84234,.40,.28),stripe:material(0xc35642,.36,.32),
  steel:material(0xbec8c5,.88,.26),silver:material(0xe0e1d8,.91,.22),tin:material(0xa9b9ba,.80,.34),
  dark:material(0x414d4a,.72,.39),brass:material(0xc59b57,.78,.30),bronze:material(0xa78555,.76,.37),
  cream:material(0xece1c1,.25,.41),white:material(0xf5e9cf,.12,.42),
  sage:material(0x839e93,.26,.41),green:material(0x596f65,.32,.39),
  petrol:material(0x4f7976,.35,.39),charcoal:material(0x354741,.26,.38),
  rubber:material(0x343d37,.02,.68),amber:material(0xd8a65d,.37,.37),
  wall:material(0xb7c6b7,0,.86),rail:material(0xcdd1bd,0,.58),
  glass:material(0xbaccc5,.32,.12,{transparent:true,opacity:.36,depthWrite:false,side:T.DoubleSide}),
  water:material(0xa7c4bd,.43,.15,{transparent:true,opacity:.76}),
  earth:material(0x685644,0,.91),pot:material(0xc99370,.05,.68),
  leaf:material(0x859772,0,.62),leaf2:material(0x657e64,0,.62),
  cord:material(0x68665a,.35,.62),inset:material(0x657e74,.18,.61)
};
const geoCache=new Map();
function geometry(key,make){if(!geoCache.has(key))geoCache.set(key,make());return geoCache.get(key);}
function group(parent,x=0,y=0,z=0){let g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
function mesh(p,geo,m,x=0,y=0,z=0){let o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
function plateShape(w,h,r){
  const s=new T.Shape(),l=-w/2,b=-h/2;r=Math.min(w/2,h/2,r);
  s.moveTo(l+r,b);s.lineTo(-l-r,b);s.quadraticCurveTo(-l,b,-l,b+r);s.lineTo(-l,-b-r);
  s.quadraticCurveTo(-l,-b,-l-r,-b);s.lineTo(l+r,-b);s.quadraticCurveTo(l,-b,l,-b-r);
  s.lineTo(l,b+r);s.quadraticCurveTo(l,b,l+r,b);return s;
}
function extrude(s,depth,bevel=.012){const g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,depth-2*bevel),
  bevelEnabled:bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:12});
  g.translate(0,0,-(depth-2*bevel)/2);return g;}
function box(p,w,h,d,m,x=0,y=0,z=0,r=.012){
  r=Math.min(r,w*.15,h*.15,d*.15);const geo=geometry('b'+[w,h,d,r],()=>{
    if(!r)return new T.BoxGeometry(w,h,d);
    const g=extrude(plateShape(w-2*r,h-2*r,r),d,r);
    const uv=g.attributes.uv,pos=g.attributes.position,n=g.attributes.normal;
    for(let i=0;i<uv.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));
      uv.setXY(i,(nx>.6?pos.getZ(i)/d:pos.getX(i)/w)+.5,(ny>.6?pos.getZ(i)/d:pos.getY(i)/h)+.5);}
    return g;
  });return mesh(p,geo,m,x,y,z);
}
function flat(p,w,d,h,r,m,x,y,z){const o=mesh(p,geometry('flat'+[w,d,h,r],()=>extrude(plateShape(w,d,r),h,Math.min(.009,h*.15))),m,x,y,z);o.rotation.x=-PI/2;return o;}
function cyl(p,r1,r2,h,m,x=0,y=0,z=0,n=32,open=false){
  return mesh(p,geometry('cy'+[r1,r2,h,n,open],()=>new T.CylinderGeometry(r1,r2,h,n,1,open)),m,x,y,z);}
function ball(p,x,y,z,sx,sy,sz,m){const o=mesh(p,geometry('sphere',()=>new T.SphereGeometry(1,24,16)),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function ring(p,r,tube,m,x=0,y=0,z=0,flatRing=true){const o=mesh(p,geometry('r'+[r,tube],()=>new T.TorusGeometry(r,tube,10,56)),m,x,y,z);
  if(flatRing)o.rotation.x=PI/2;return o;}
function rod(p,a,b,r,m,r2=r,n=16){
  let v=new T.Vector3(...a),end=new T.Vector3(...b),diff=end.clone().sub(v);
  const o=cyl(p,r2,r,diff.length(),m,0,0,0,n);o.position.copy(v.add(end).multiplyScalar(.5));
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize());return o;
}
function pathTube(p,pts,r,m,n=28){
  return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a))),n,r,8,false),m);
}
function slotted(p,x,y,z,size,m,vertical=false){const g=group(p,x,y,z);
  if(vertical)g.rotation.x=PI/2;cyl(g,size,size*.90,.018,m);box(g,size*1.30,.0025,size*.20,mat.dark,0,.010,0,.001).rotation.y=-.43;return g;}
function profile(p,coordinates,m,n=64){return mesh(p,new T.LatheGeometry(coordinates.map(a=>new T.Vector2(...a)),n),m);}
function washer(p,outer,inner,h,m,sides=48){
  const shape=new T.Shape(),hole=new T.Path();
  if(sides===6){for(let i=0;i<=6;i++){let a=i*PI/3;shape[i?'lineTo':'moveTo'](outer*Math.cos(a),outer*Math.sin(a));}}
  else shape.absarc(0,0,outer,0,TAU,false);
  hole.absarc(0,0,inner,0,TAU,true);shape.holes.push(hole);
  const o=mesh(p,geometry('washer'+[outer,inner,h,sides],()=>extrude(shape,h,.006)),m);o.rotation.x=-PI/2;return o;
}
function lighting(scene,renderer){
  // Wide bright window panes, shadowed rafters and bench bounce in the reflection probe.
  const w=256,h=128,data=new Uint16Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h;let c=v>.51?[.48,.59,.64]:[.46,.36,.24];
    if(v>.78)c=[.79,.81,.73];
    if(u>.03&&u<.37&&v>.44&&v<.82)c=(Math.abs((u-.03)%(.113)-.057)<.051&&Math.abs((v-.44)%.19-.095)<.085)?[3.8,4.0,3.9]:[.52,.51,.44];
    if(u>.50&&u<.68&&v>.38&&v<.66)c=[.13,.17,.16];
    if(u>.73&&u<.88&&v>.52&&v<.72)c=[1.26,1.15,.88];
    const i=(y*w+x)*4;for(let j=0;j<3;j++)data[i+j]=T.DataUtils.toHalfFloat(c[j]);data[i+3]=T.DataUtils.toHalfFloat(1);
  }
  const e=new T.DataTexture(data,w,h,T.RGBAFormat,T.HalfFloatType);e.mapping=T.EquirectangularReflectionMapping;e.needsUpdate=true;
  const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromEquirectangular(e).texture;
  scene.environmentIntensity=.75;pm.dispose();e.dispose();
  scene.add(new T.HemisphereLight(0xdbeafc,0xdac0a2,1.15));
  const sun=new T.DirectionalLight(0xffe8c5,2.65);sun.position.set(-5.6,8.6,-3.8);sun.target.position.set(.6,0,.7);
  scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:24});
  sun.shadow.bias=-.00024;sun.shadow.normalBias=.006;sun.shadow.radius=2;
}
function matPattern(){
  const t=tex(1024,640,(c,w,h)=>{
    c.fillStyle='#9fae9b';c.fillRect(0,0,w,h);
    const im=c.getImageData(0,0,w,h);for(let i=0;i<w*h;i++){let f=(rand()-.5)*6;
      for(let j=0;j<3;j++)im.data[i*4+j]+=f;}c.putImageData(im,0,0);
    c.strokeStyle='rgba(230,232,204,.25)';c.lineWidth=1.1;
    for(let x=32;x<w;x+=32){c.beginPath();c.moveTo(x,36);c.lineTo(x,h-36);c.stroke();}
    for(let y=32;y<h;y+=32){c.beginPath();c.moveTo(36,y);c.lineTo(w-36,y);c.stroke();}
    c.strokeStyle='rgba(233,232,206,.72)';c.lineWidth=2;c.beginPath();c.roundRect(16,16,w-32,h-32,27);c.stroke();
    c.lineWidth=1;for(let x=65;x<w-55;x+=16){c.beginPath();c.moveTo(x,17);c.lineTo(x,x%64===1?29:23);c.stroke();}
    for(let j=0;j<140;j++){let x=rand()*w,y=rand()*h;c.strokeStyle='rgba(219,226,204,.19)';c.beginPath();c.moveTo(x,y);c.lineTo(x+12+rand()*64,y+rand()*19-9);c.stroke();}
  });t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return t;
}
function bench(s){
  box(s,15,.36,6.75,mat.edge,0,-.22,-.42,.048);
  for(let i=0;i<8;i++){
    const m=mat.oak.clone();m.color.setRGB(1-i%3*.021,1-i%3*.03,1-i%3*.044);
    m.map=wood.clone();m.map.offset.set(rand()*.8,rand()*.7);m.map.repeat.set(2.1,.47);m.map.needsUpdate=true;
    box(s,15,.119,.838,m,0,-.061,-3.37+i*.844,.018);
  }
  box(s,15,.18,.12,mat.darkwood,0,-.34,2.96);
  box(s,14.5,1.7,.28,mat.sage,0,-1.25,2.71,.04);
  for(let i=-1;i<=1;i++){
    let x=i*3.25;box(s,3.13,1.18,.14,mat.green,x,-1.10,2.90,.035);
    box(s,2.98,1.04,.12,mat.sage,x,-1.10,2.98,.035);
    for(const dx of [-.30,.30])rod(s,[x+dx,-.98,3.02],[x+dx,-.98,3.16],.054,mat.bronze);
    rod(s,[x-.30,-.98,3.16],[x+.30,-.98,3.16],.054,mat.brass);
  }
  flat(s,5.15,2.02,.034,.125,mat.green,0,.006,-.36);
  let surface=flat(s,5.12,2.00,.025,.12,material(0xffffff,.04,.78,{map:matPattern()}),0,.028,-.36);
  // Planar UVs keep the fine ruled grid continuous across the softly rounded mat.
  const pos=surface.geometry.attributes.position,uv=surface.geometry.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/5.12+.5,pos.getY(i)/2+.5);
  for(const x of [-2.43,2.43])for(const z of [-1.20,.49])slotted(s,x,.045,z,.035,mat.bronze);
}
function windowAndWall(s){
  box(s,24,12,.16,mat.wall,0,3,-3.94).castShadow=false;
  box(s,18,.20,.13,mat.rail,0,.69,-3.80);
  const bg=material(0xdce9d2,0,.86,{emissive:0xe3edce,emissiveIntensity:.28});
  const win=group(s,-3.76,3.48,-3.73);win.userData.window=true;
  box(win,3.45,5.16,.11,mat.darkwood).castShadow=false;box(win,3.32,5.03,.14,bg,0,0,.07).castShadow=false;
  for(let i=0;i<12;i++){
    const m=material(i%3?0xb2c6a3:0xc5d4ad,0,.93,{emissive:0xb7c8a4,emissiveIntensity:.14});
    ball(win,(rand()-.5)*3.2,-1.55+rand()*.72,.15,.29+rand()*.38,.31+rand()*.42,.028,m).castShadow=false;
  }
  for(let x of [-1.77,1.77])box(win,.18,5.34,.28,mat.white,x,0,.20,.022);
  for(let y of [-2.58,.24,2.58])box(win,3.58,.14,.28,mat.white,0,y,.20,.02);
  box(win,.089,5.09,.17,mat.white,-.18,0,.22,.012);
  box(win,3.93,.14,.55,mat.cream,0,-2.68,.18,.035);
  const skylight=group(s,-5.22,4.83,-2.61);skylight.rotation.y=-.39;
  for(const x of [-1.61,0,1.61])box(skylight,.085,.095,4.26,mat.rail,x,0,0,.009);
  for(const z of [-2.12,0,2.12])box(skylight,3.30,.095,.088,mat.rail,0,0,z,.009);
  // Hand-tool peg rail and its recessed holes.
  const frame=group(s,1.48,2.62,-3.72);
  box(frame,5.78,3.39,.17,mat.edge,0,0,-.01,.033);
  box(frame,5.67,3.28,.09,mat.darkwood,0,0,.09,.023);
  const pegMap=tex(128,128,(c,w,h)=>{
    c.fillStyle='#bfa588';c.fillRect(0,0,w,h);
    for(let i=0;i<800;i++){c.fillStyle=rand()>.5?'#bda285':'#c3a98b';c.fillRect(rand()*w,rand()*h,2,1);}
    c.beginPath();c.arc(64,65,8,0,TAU);c.fillStyle='#cfb493';c.fill();
    c.beginPath();c.arc(64,63,7.4,0,TAU);c.fillStyle='#8e785e';c.fill();
    c.beginPath();c.arc(64,62,5.2,0,TAU);c.fillStyle='#74634f';c.fill();
  });pegMap.repeat.set(27,16);
  box(frame,5.55,3.16,.033,material(0xffffff,0,.82,{map:pegMap}),0,0,.152,0);
  for(const x of [-2.67,2.67])for(const y of [-1.49,1.49])slotted(frame,x,y,.180,.037,mat.bronze,true);
  // Actual spanner jaw and ring, hung on a small brass peg.
  function spanner(x,y,len,roll){
    const g=group(frame,x,y,.26);g.rotation.z=roll;
    ring(g,.102,.037,mat.tin,0,0,0,false);box(g,.098,len,.054,mat.tin,0,-len*.54,0,.022);
    const sh=new T.Shape();sh.moveTo(-.06,.10);sh.quadraticCurveTo(-.24,.01,-.143,-.17);
    sh.lineTo(-.075,-.083);sh.lineTo(.043,-.091);sh.lineTo(.099,-.192);
    sh.quadraticCurveTo(.23,-.035,.077,.10);sh.closePath();
    mesh(g,extrude(sh,.068,.012),mat.tin,0,-len-.035,0);
    rod(frame,[x,y+.055,.17],[x,y+.055,.35],.028,mat.brass);
  }
  spanner(-2.12,.85,.87,-.13);spanner(-1.67,.83,.68,.075);
  for(let i=0;i<2;i++){const x=1.80+i*.39;
    rod(frame,[x,.83,.23],[x,.13,.23],.029,mat.tin);
    cyl(frame,.081,.058,.43,i?mat.sage:mat.amber,x,-.06,.23);
    rod(frame,[x-.08,.18,.17],[x-.08,.20,.33],.023,mat.brass);}
}
function robotShelf(s,state,portrait) {
  const rx=portrait?1.16:1.76,ry=portrait?1.64:1.05,rz=-2.70;
  state.receiver={x:rx/10,y:(ry+.80)/10,z:(rz+.18)/10};
  const shelf=group(s,rx-.13,ry-.08,rz);shelf.userData.toyShelf=true;
  box(shelf,2.54,.16,1.03,mat.oak,0,0,0,.04);
  for(const x of [-.97,.97]){
    box(shelf,.12,.51,.15,mat.green,x,-.29,-.33);
    rod(shelf,[x,-.53,-.32],[x,-.09,.33],.048,mat.green);}
  const base=group(s,rx,ry,rz+.035);
  const hip=group(base,0,.458,0),legs=[];
  for(const x of [-.224,.224]){
    const j=group(hip,x,-.005,0);legs.push(j);cyl(j,.082,.082,.20,mat.dark,0,-.082,0);
    for(let i=0;i<3;i++)ring(j,.089,.018,mat.tin,0,-.05-i*.056,0);
    box(j,.22,.22,.245,mat.petrol,0,-.24,0,.043);
    box(j,.32,.128,.40,mat.petrol,0,-.39,.068,.047);
    box(j,.324,.045,.42,mat.dark,0,-.441,.07,.016);}
  const body=group(hip,0,0,0);
  box(body,.78,.59,.44,mat.petrol,0,.273,0,.077);
  const badge=box(body,.52,.33,.043,mat.cream,0,.286,.225,.034);
  for(const x of [-.202,.202])slotted(badge,x,.098,.027,.023,mat.brass,true);
  const keyhole=group(badge,0,-.008,.035);
  ring(keyhole,.075,.014,mat.bronze,0,0,0,false);ball(keyhole,0,0,0,.049,.049,.013,mat.amber);
  for(let i=-1;i<=1;i++)box(body,.071,.020,.013,mat.dark,i*.102,.061,.226,.004);
  cyl(body,.114,.114,.14,mat.brass,0,.598,0);
  const head=group(body,0,.843,0);
  box(head,.79,.45,.46,mat.sage,0,0,0,.087);
  box(head,.65,.305,.067,mat.white,0,-.007,.220,.066);
  const eyes=[];
  for(const x of [-.159,.159]){
    const eye=ball(head,x,.012,.262,.050,.061,.025,mat.charcoal);eyes.push(eye);
    ball(head,x-.012,.037,.284,.011,.012,.006,mat.white);
    const ear=cyl(head,.100,.100,.068,mat.brass,x<0?-.413:.413,-.003,0);ear.rotation.z=PI/2;
  }
  pathTube(head,[[-.068,-.073,.257],[0,-.092,.26],[.068,-.073,.257]],.010,mat.bronze,12);
  rod(head,[0,.199,0],[.044,.346,0],.022,mat.bronze);
  ball(head,.044,.365,0,.061,.061,.061,mat.red);
  const arms=[];
  for(let i=0;i<2;i++){const side=i?1:-1;
    const j=group(body,side*.438,.442,0);arms.push(j);j.rotation.z=side*.19;
    ball(j,0,0,0,.102,.102,.102,mat.brass);cyl(j,.063,.064,.27,mat.dark,0,-.17,0);
    for(let k=0;k<4;k++)ring(j,.068,.017,mat.tin,0,-.091-k*.051,0);
    box(j,.177,.207,.19,mat.sage,0,-.313,0,.035);
    cyl(j,.067,.085,.075,mat.brass,0,-.439,0);
    for(const dx of [-.058,.058])ball(j,dx,-.478,.012,.046,.076,.074,mat.cream);
  }
  const key=group(body,.47,.237,-.105);rod(key,[0,0,0],[.20,0,0],.027,mat.brass);
  for(const y of [-.078,.078]){const loop=ring(key,.068,.021,mat.brass,.20,y,0,false);loop.rotation.y=PI/2;}
  base.rotation.y=-.13;base.scale.setScalar(1.10);
  return {base,hip,head,legs,arms,key,rx,ry,rz};
}
function sparkle(p,x,y,z,r,m){
  const sh=new T.Shape();sh.moveTo(0,r);sh.quadraticCurveTo(r*.12,r*.12,r*.72,0);
  sh.quadraticCurveTo(r*.12,-r*.1,0,-r);sh.quadraticCurveTo(-r*.1,-r*.1,-r*.72,0);
  sh.quadraticCurveTo(-r*.1,r*.12,0,r);
  return mesh(p,extrude(sh,.012,.002),m,x,y,z);
}
function magnetModel(s) {
  const g=group(s),tilt=group(g);tilt.rotation.y=-.16;
  // Continuous enamel arch; the broad pole shoes share its flat end faces.
  const sh=new T.Shape(),outer=.636,inner=.268,center=.645,foot=.212;
  sh.moveTo(-outer,foot);sh.lineTo(-outer,center);
  sh.absarc(0,center,outer,PI,0,true);sh.lineTo(outer,foot);sh.lineTo(inner,foot);sh.lineTo(inner,center);
  sh.absarc(0,center,inner,0,PI,false);sh.lineTo(-inner,foot);sh.closePath();
  mesh(tilt,extrude(sh,.344,.043),mat.red);
  for(const side of [-1,1]){
    const x=side*.452;
    box(tilt,.441,.248,.351,mat.silver,x,.125,0,.026);
    box(tilt,.448,.032,.358,mat.dark,x,.252,0,.006);
    // Thin exposed metal lip at the joint in the enamel.
    box(tilt,.445,.018,.356,mat.tin,x,.271,0,.004);
  }
  const med=group(tilt,0,1.094,.175);
  const bezel=cyl(med,.115,.115,.031,mat.bronze);bezel.rotation.x=PI/2;
  const enamel=cyl(med,.093,.093,.036,mat.cream,0,0,.006);enamel.rotation.x=PI/2;
  sparkle(med,0,0,.028,.071,mat.bronze);
  cyl(tilt,.097,.123,.077,mat.brass,0,1.329,0);
  ring(tilt,.105,.030,mat.brass,0,1.432,0,false);
  const link=ring(tilt,.112,.025,mat.dark,0,1.592,0,false);link.scale.y=1.26;link.rotation.y=.91;
  return g;
}
function canModel(s,c,index){
  const g=group(s,c.x*10,0,c.z*10);
  const satin=[mat.tin,material(0xb1bdba,.83,.35),material(0xa5b2ad,.80,.33)][index];
  const points=[[.010,.022],[.423,.022],[.452,.033],[.468,.075],[.48,.62],[.496,.839],[.508,.868],[.503,.89],[.480,.892],[.468,.865],[.453,.65],[.437,.10],[.412,.070],[.010,.070]];
  profile(g,points,satin);
  cyl(g,.426,.426,.024,mat.dark,0,.073,0,64);
  for(const [y,r,t] of [[.060,.449,.028],[.122,.463,.012],[.173,.467,.008],[.655,.486,.012],[.710,.489,.012],[.763,.494,.012],[.879,.5,.032]])ring(g,r,t,mat.silver,0,y,0);
  for(const y of [.21,.26,.31,.36,.41,.46,.51,.56,.61])ring(g,.468+(y-.21)*.039,.006,satin,0,y,0);
  rod(g,[-.465,.10,-.005],[-.49,.85,-.005],.010,mat.steel);
  const badge=group(g,0,.44,.482);badge.rotation.x=-.045;
  box(badge,.510,.340,.041,mat.bronze,0,0,0,.046);
  box(badge,.479,.310,.047,[mat.cream,mat.sage,mat.amber][index],0,0,.010,.042);
  for(const x of [-.184,.184])ball(badge,x,0,.036,.017,.017,.009,mat.brass);
  const symbol=group(badge,0,0,.038);
  if(index===0){
    symbol.rotation.z=-.57;box(symbol,.052,.156,.018,mat.green,0,-.021,0,.006);
    box(symbol,.121,.051,.021,mat.green,0,.075,0,.012);
    for(let i=0;i<3;i++)box(symbol,.07,.013,.020,mat.green,0,-.034-i*.025,0,.003).rotation.z=.31;
  }else{
    const o=washer(symbol,.097,index===1?.042:.060,.020,index===1?mat.cream:mat.bronze,index===1?6:36);o.rotation.x=0;
  }
  const tab=group(g,.37,.84,-.273);
  rod(tab,[-.064,0,0],[.064,0,0],.024,mat.brass);
  const tongue=box(tab,.127,.17,.028,mat.bronze,0,.078,0,.017);
  sparkle(tongue,0,.027,.018,.032,mat.cream);
  tab.rotation.x=-.94;g.userData.tab=tab;
  g.rotation.y=[.13,.035,-.105][index];return g;
}
function partModel(s,p){
  const g=group(s),core=group(g),m=p.id%4===1?mat.tin:mat.steel;
  if(p.kind==='nut'){
    washer(core,.133,.063,.091,m,6);
    for(const h of [-.024,.013])ring(core,.067,.006,mat.dark,0,h,0);
  } else if(p.kind==='washer'){washer(core,.130,.064,.031,mat.silver);}
  else{
    // Local Y is the bolt axis. A real helical wire leaves alternating lit and shadowed flanks.
    core.rotation.z=PI/2-.055;
    const bolt=p.kind==='bolt',nail=p.kind==='nail',l=bolt?.347:nail?.40:.308;
    const rad=bolt?.055:nail?.027:.041;
    cyl(core,rad,rad*.91,l,m);
    if(bolt){cyl(core,.111,.103,.096,mat.silver,0,l/2+.011,0,6);
      ring(core,.082,.011,m,0,l/2-.034,0);}
    else {
      cyl(core,nail?.068:.091,nail?.044:.052,.047,mat.tin,0,l/2,0);
      if(!nail){box(core,.125,.006,.018,mat.dark,0,l/2+.026,0,.002);box(core,.024,.006,.085,mat.dark,0,l/2+.026,0,.002);}
    }
    if(!nail){
      const pts=[],turns=6.3;
      for(let k=0;k<=84;k++){let u=k/84,a=u*TAU*turns;
        pts.push([Math.cos(a)*rad,-l*.46+u*l*.78,Math.sin(a)*rad]);}
      pathTube(core,pts,bolt?.012:.010,mat.silver,86);
    }
    ball(core,0,-l/2,0,rad*.93,rad*.48,rad*.93,m);
  }
  return g;
}
function plant(s,portrait){
  const g=group(s,portrait?-1.94:-3.35,.03,-2.86);g.userData.plant=true;
  profile(g,[[.03,.01],[.264,.01],[.346,.48],[.365,.49],[.363,.57],[.307,.57],[.292,.45]],mat.pot);
  ring(g,.354,.021,mat.pot,0,.525,0);cyl(g,.32,.32,.018,mat.earth,0,.52,0);
  const leaves=[];
  for(let i=0;i<9;i++){
    const a=i*2.36,reach=.23+(i%3)*.062,h=.60+rand()*.48;
    const ex=Math.cos(a)*reach,ez=Math.sin(a)*reach;
    pathTube(g,[[0,.48,0],[ex*.23,.60+h*.31,ez*.25],[ex,.52+h,ez]],.014,mat.green,12);
    const joint=group(g,ex,.52+h,ez);joint.rotation.y=-a;
    const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.19,.12,-.17,.37,0,.54);
    shape.bezierCurveTo(.153,.39,.16,.146,0,0);
    const leaf=mesh(joint,extrude(shape,.014,.007),i%3?mat.leaf:mat.leaf2);leaf.rotation.z=-.59;
    pathTube(leaf,[[0,.02,.012],[.01,.20,.014],[0,.49,.011]],.005,mat.leaf2,8);
    leaves.push(joint);
  }
  return leaves;
}
function jar(s){
  const g=group(s,-2.83,0,-1.59);
  // Thick transparent lip and independently displaced water surface inside the glass.
  profile(g,[[.02,.022],[.277,.022],[.294,.066],[.294,.51],[.244,.588],[.248,.65],[.223,.655],[.225,.589],[.268,.5],[.268,.085],[.02,.078]],mat.glass);
  ring(g,.241,.023,mat.glass,0,.654,0);ring(g,.28,.022,mat.glass,0,.062,0);
  cyl(g,.275,.274,.306,mat.glass,0,.227,0,48,true);
  const pts=[0,.385,0],ind=[];
  for(let i=0;i<15;i++){let a=i*TAU/15;pts.push(.275*Math.cos(a),.385,.275*Math.sin(a));ind.push(0,1+(i+1)%15,1+i);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.setIndex(ind);geo.computeVertexNormals();
  mesh(g,geo,mat.water);return geo;
}
function sundries(s){
  // Stacked timber offcuts and a workshop pencil on the left apron.
  const pieces=group(s,-3.57,0,.19);pieces.rotation.y=-.18;
  for(let i=0;i<2;i++)box(pieces,1.32,.115,.63,mat.oak,i*.044,.063+i*.12,0,.018);
  const pencil=group(pieces,.08,.28,.025);pencil.rotation.y=-.21;
  rod(pencil,[-.57,0,0],[.52,0,0],.048,mat.amber,.048,6);
  rod(pencil,[-.74,0,0],[-.57,0,0],.012,mat.edge,.049,6);
  rod(pencil,[.52,0,0],[.60,0,0],.047,mat.brass);
  // Turned wood screwdriver handle with inset grip flutes, ferrule and a blunt blade.
  const driver=group(s,2.09,.173,2.52);driver.userData.driver=true;driver.rotation.y=-.43;
  const axis=group(driver);axis.rotation.z=-PI/2;
  profile(axis,[[.01,-.61],[.134,-.596],[.176,-.50],[.19,-.31],[.178,.13],[.135,.29],[.105,.32],[.103,.41],[.01,.41]],mat.darkwood,56);
  for(let k=0;k<8;k++){
    const a=k*TAU/8;pathTube(axis,[[.165*Math.cos(a),-.43,.165*Math.sin(a)],[.187*Math.cos(a),-.23,.187*Math.sin(a)],[.166*Math.cos(a),.12,.166*Math.sin(a)]],.007,mat.edge,10);}
  cyl(axis,.113,.121,.15,mat.brass,0,.389,0);
  cyl(axis,.043,.046,.65,mat.silver,0,.77,0);box(axis,.085,.130,.032,mat.steel,0,1.13,0,.007);
  // Brass workshop ruler with engraved index strokes and a hanging hole.
  const rule=group(s,-2.83,.026,2.27);rule.rotation.y=.32;
  flat(rule,2.20,.25,.031,.035,mat.bronze,0,0,0);
  for(let i=0;i<31;i++)box(rule,.009,.004,i%5?.056:.113,mat.dark,-.96+i*.058,.018,-.074+(i%5?0:.025),0);
  ring(rule,.041,.011,mat.dark,1.0,.018,0);
  // Spool and a folded shop cloth in the far corner.
  const rag=group(s,3.34,0,-1.98);rag.rotation.y=.11;
  for(let i=0;i<3;i++)box(rag,.94,.050,.57,mat.sage,i*.025,.034+i*.046,0,.022);
  for(const x of [-.32,-.27])box(rag,.025,.006,.55,mat.cream,x,.154,0,.002);
  const spool=group(s,3.05,0,-2.58);cyl(spool,.18,.18,.39,mat.cream,0,.245,0);
  for(let i=0;i<13;i++)ring(spool,.185,.015,mat.cord,0,.09+i*.025,0);
  for(let y of [.055,.442])cyl(spool,.244,.244,.048,mat.oak,0,y,0);
  cyl(spool,.043,.043,.005,mat.dark,0,.470,0);
}
function handModel(s){
  // A small ivory glove-shaped cursor, modelled as one rounded solid.
  const sh=new T.Shape();sh.moveTo(-.095,-.07);sh.lineTo(-.095,.18);
  sh.bezierCurveTo(-.095,.249,-.018,.249,-.018,.18);sh.lineTo(-.018,.055);
  sh.bezierCurveTo(.006,.104,.053,.097,.058,.048);sh.bezierCurveTo(.086,.088,.127,.071,.130,.024);
  sh.bezierCurveTo(.161,.054,.20,.035,.196,-.012);sh.lineTo(.184,-.158);
  sh.quadraticCurveTo(.165,-.255,.066,-.252);sh.lineTo(-.028,-.249);
  sh.quadraticCurveTo(-.075,-.246,-.111,-.185);sh.lineTo(-.208,-.051);
  sh.bezierCurveTo(-.238,-.001,-.184,.039,-.147,-.004);sh.closePath();
  const m=material(0xfff3d3,.12,.42,{transparent:true,opacity:0,depthWrite:false});
  const h=mesh(s,extrude(sh,.069,.012),m);h.castShadow=false;return h;
}
// Make each rigid assembly a small number of draw calls. Animated joints stay
// separate; each batch keeps its original PBR material and shadow behaviour.
function batchRigid(root,keep=[]){
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),sets=new Map();
  function gather(o){
    if(keep.includes(o))return;
    if(o.isMesh && !o.material.transparent){
      const key=o.material.uuid+o.castShadow+o.receiveShadow;
      if(!sets.has(key))sets.set(key,[]);
      sets.get(key).push(o);
    }
    for(const child of o.children)gather(child);
  }
  for(const child of root.children)gather(child);
  for(const meshes of sets.values()){
    if(meshes.length<2)continue;
    const pos=[],norm=[],uv=[],indices=[];let base=0;
    for(const o of meshes){
      const geo=o.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      const a=geo.attributes;
      for(const v of a.position.array)pos.push(v);
      for(const v of a.normal.array)norm.push(v);
      for(const v of a.uv.array)uv.push(v);
      if(geo.index){for(const v of geo.index.array)indices.push(base+v);}
      else for(let i=0;i<a.position.count;i++)indices.push(base+i);
      base+=a.position.count;geo.dispose();
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    geo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geo.setIndex(indices);
    const o=mesh(root,geo,meshes[0].material);o.castShadow=meshes[0].castShadow;o.receiveShadow=meshes[0].receiveShadow;
    for(const original of meshes){
      // A stamped plate may itself carry a screw of a different material.
      for(const child of [...original.children])root.attach(child);
      original.removeFromParent();
    }
  }
}
window.makeWorkshop=function(s,renderer,state,portrait){
  lighting(s,renderer);bench(s);windowAndWall(s);
  const robot=robotShelf(s,state,portrait),leaves=plant(s,portrait),water=jar(s);sundries(s);
  const magnet=magnetModel(s),cans=state.cans.map((c,i)=>canModel(s,c,i)),parts=state.parts.map(p=>partModel(s,p));
  const props=s.children.filter(o=>o.userData.plant||o.userData.driver||o.userData.window||o.userData.toyShelf);
  for(const part of [...parts,magnet])batchRigid(part);
  for(const can of cans)batchRigid(can,[can.userData.tab]);
  const joints=[robot.hip,robot.head,robot.key,...robot.legs,...robot.arms];
  for(const j of joints)batchRigid(j,joints.filter(other=>other!==j));
  for(const prop of props)batchRigid(prop,leaves);
  batchRigid(s,[robot.base,magnet,...parts,...cans,...props,...leaves]);
  const cords=new T.InstancedMesh(geometry('reelThread',()=>new T.CylinderGeometry(.005,.005,1,6)),mat.bronze,state.parts.length*2);
  cords.frustumCulled=false;cords.count=0;s.add(cords);
  const cord=group(s),ropeMat=mat.cord;
  for(let i=0;i<3;i++){const pts=[];for(let n=0;n<=130;n++){const a=n*.73+i*TAU/3;pts.push([.015*Math.cos(a),n/130,.015*Math.sin(a)]);}
    pathTube(cord,pts,.013,ropeMat,230);}
  const flecks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),material(0xffecc2,.08,.58,{transparent:true,opacity:.44}),state.dust.length);s.add(flecks);
  const hand=handModel(s),obj=new T.Object3D(),a=new T.Vector3(),b=new T.Vector3(),up=new T.Vector3(0,1,0);
  return {magnet,parts,cans,robot,resize(portrait){
    robot.rx=portrait?1.16:1.76;robot.ry=portrait?1.64:1.05;
    // The shelf follows the toy when the device rotates.
    const shelf=robot.base.parent.children.find(o=>o.userData.toyShelf);
    if(shelf)shelf.position.set(robot.rx-.13,robot.ry-.08,robot.rz);
    s.children.find(o=>o.userData.driver).position.x=portrait?1.38:2.09;
    s.children.find(o=>o.userData.plant).position.x=portrait?-1.94:-3.35;
    s.children.find(o=>o.userData.window).position.x=portrait?-3.07:-3.76;
    state.receiver.x=robot.rx/10;state.receiver.y=(robot.ry+.80)/10;
  },draw(camera){
    const m=state.magnet,rs=state.robot;
    magnet.position.set(m.x*10,m.y*10,m.z*10);magnet.rotation.z=m.angle;
    a.set(0,1.716,0).applyEuler(magnet.rotation).add(magnet.position);
    b.set(-.48,9.4,-.50);cord.position.copy(a);b.sub(a);cord.scale.set(1,b.length(),1);
    cord.quaternion.setFromUnitVectors(up,b.normalize());
    state.cans.forEach((c,i)=>{cans[i].position.y=-10*c.depth;cans[i].userData.tab.rotation.x=-.94+c.tabAngle;});
    state.parts.forEach((p,i)=>{const o=parts[i];o.position.set(p.x*10,p.y*10,p.z*10);
      o.rotation.order='YXZ';o.rotation.set(p.tilt*.4,p.angle,p.tilt);
      o.visible=p.mode!=='received';});
    let strand=0;
    for(const p of state.parts){
      if(p.mode!=='deliver'&&p.mode!=='return')continue;
      a.set(state.receiver.x*10,state.receiver.y*10,state.receiver.z*10);
      b.set(p.x*10,p.y*10,p.z*10);
      const middle=a.clone().lerp(b,.5);middle.y-=Math.min(.076,a.distanceTo(b)*.027);
      for(const [start,end] of [[a,middle],[middle,b]]){
        const dir=end.clone().sub(start);obj.position.copy(start).lerp(end,.5);obj.scale.set(1,dir.length(),1);
        if(dir.lengthSq()>.000001)obj.quaternion.setFromUnitVectors(up,dir.normalize());
        obj.updateMatrix();cords.setMatrixAt(strand++,obj.matrix);
      }
    }
    cords.count=strand;cords.instanceMatrix.needsUpdate=true;obj.quaternion.identity();
    robot.base.position.set(robot.rx+rs.x*10,robot.ry,robot.rz+.035);
    robot.hip.rotation.z=rs.joints[4].a;
    robot.legs.forEach((l,i)=>l.rotation.x=rs.joints[i].a);
    robot.arms.forEach((l,i)=>l.rotation.x=rs.joints[i+2].a);
    robot.head.rotation.y=rs.gaze;robot.key.rotation.x=rs.keyAngle;
    for(let i=0;i<leaves.length;i++)leaves[i].rotation.z=state.leaves[i].a;
    const attr=water.attributes.position;
    for(let i=0;i<15;i++)attr.setY(i+1,.385+state.water[i].h*10);
    attr.needsUpdate=true;water.computeVertexNormals();
    state.dust.forEach((p,i)=>{obj.position.set(p.x*10,p.y*10,p.z*10);obj.scale.setScalar(p.size*10);obj.updateMatrix();flecks.setMatrixAt(i,obj.matrix);});
    flecks.instanceMatrix.needsUpdate=true;
    const g=state.guide;hand.visible=g.visible>.008;
    if(hand.visible){hand.quaternion.copy(camera.quaternion);hand.rotateZ(.23);hand.material.opacity=g.visible*.86;
      hand.position.set(g.x*10+.12,g.y*10-.12,g.z*10+.16);}
  }};
};
})();
