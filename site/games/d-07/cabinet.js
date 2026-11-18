'use strict';
const toy=group(scene),board=group(toy,0,.219,.022);board.rotation.x=-MarbleToy.TILT;
const pocketPaint=[M.teal,M.gold,M.coral],pocketDark=[M.jade,M.mustard,M.red];
const pi=Math.PI;
function plaque(p,x,y,z,w,h,r,mat){return box(p,w,h,.0022,mat,x,y,z,r);}
function screw(p,x,y,z,r=.0032){
 orb(p,x,y,z,r,r,r*.44,M.brass);
 const slot=box(p,r*1.02,r*.13,.0002,M.deep,x,y,z+r*.43,.0001);slot.rotation.z=.62;
}
function archShape(w,base,shoulder,top){
 const s=new T.Shape();s.moveTo(-w/2,base);s.lineTo(-w/2,shoulder);
 s.bezierCurveTo(-w/2,shoulder+.026,-w*.36,shoulder+.016,-w*.27,shoulder+.029);
 s.bezierCurveTo(-w*.19,shoulder+.035,-w*.16,top,0,top);
 s.bezierCurveTo(w*.16,top,w*.19,shoulder+.035,w*.27,shoulder+.029);
 s.bezierCurveTo(w*.36,shoulder+.016,w/2,shoulder+.026,w/2,shoulder);
 s.lineTo(w/2,base);s.closePath();return s;
}
solid(board,archShape(.414,-.188,.46,.548),.030,M.walnut,0,0,-.021,.003);
solid(board,archShape(.406,-.187,.46,.546),.014,M.maple,0,0,-.005,.0026);
solid(board,archShape(.385,.378,.453,.531),.003,M.cream,0,0,.003,.001);
solid(board,archShape(.373,.387,.451,.525),.003,M.birch,0,0,.006,.001);
// The little sunrise is cut from separate pieces of lacquered wood.
const crest=group(board,0,.472,.010);
for(let i=0;i<8;i++){
 const a=-1.36+i*.39,rad=.051;
 const ray=box(crest,.0029,i%2?.009:.013,.002,M.mustard,Math.sin(a)*rad,Math.cos(a)*rad,0,.0013);ray.rotation.z=-a;
}
medallion(crest,0,-.006,.001,.031,M.gold);
function hill(points,mat,z){solid(crest,outline(points),.002,mat,0,0,z,.0007);}
hill([[-.096,-.043],[-.096,-.021],[-.077,-.009],[-.058,-.018],[-.035,.002],[-.004,-.023],[.022,-.006],[.043,-.023],[.083,-.009],[.097,-.024],[.097,-.043]],M.aqua,.003);
hill([[-.094,-.043],[-.094,-.034],[-.064,-.02],[-.043,-.029],[-.014,-.015],[.009,-.025],[.043,.007],[.071,-.014],[.091,-.007],[.096,-.013],[.096,-.043]],M.teal,.006);
hill([[.025,-.012],[.043,.007],[.059,-.007],[.051,-.006],[.047,-.009],[.040,-.004],[.035,-.01]],M.cream,.008);
for(const side of [-1,1]){
 const x=.193*side;
 box(board,.022,.469,.023,M.honey,x,.207,.009,.008,true);
 box(board,.009,.444,.009,M.birch,x-.004*side,.211,.024,.004,true);
 for(const y of [-.014,.153,.318,.43])screw(board,x+.002*side,y,.024,.0029);
}
// The returning ripples are shallow brass and ivory marquetry set into the board.
for(const side of [-1,1]){
 for(let i=0;i<3;i++){
  const x=(.168-.005*i)*side;
  tube(board,[[x,.344,.003],[(.164-.005*i)*side,.316,.003],[(.145-.005*i)*side,.296,.003],[(.145-.005*i)*side,.276,.003]],.00072,i===1?M.honey:M.birch,24);
  tube(board,[[x,.142,.003],[(.16-.004*i)*side,.13,.003],[(.151-.004*i)*side,.114,.003]],.00065,M.birch,15);
 }
 for(const [x,y,r] of [[.164,.38,.006],[.151,.393,.0033],[.17,.26,.004],[.163,.154,.0035]])star(board,side*x,y,.003,r,M.cream);
}
const pins=MarbleToy.pins,pinCollars=group(board);
const pinStem=new T.InstancedMesh(new T.CylinderGeometry(.0036,.0047,.012,18).rotateX(pi/2),M.brass,pins.length);
const capGeo=new T.SphereGeometry(1,16,10).scale(.0049,.0049,.0034);
const pinCaps=[new T.InstancedMesh(capGeo,M.bright,pins.filter((_,i)=>i%5!==0).length),
 new T.InstancedMesh(capGeo,M.birch,pins.filter((_,i)=>i%5===0).length)];
for(const inst of [pinStem,...pinCaps]){
 board.add(inst);inst.userData.moving=true;inst.castShadow=true;inst.receiveShadow=true;inst.frustumCulled=false;
}
pins.forEach(p=>cyl(pinCollars,.0066,.0076,.0024,M.honey,p.x,p.y,.0036,'z',20));
const pinMatrix=new T.Matrix4(),pinOffset=new T.Matrix4();
function updatePins(){
 const count=[0,0];pins.forEach((p,i)=>{
  pinMatrix.makeRotationY(S.pins[i].q/.016);pinMatrix.setPosition(p.x,p.y,.004);
  pinStem.setMatrixAt(i,pinOffset.copy(pinMatrix).multiply(pinDepth[0]));
  const type=i%5===0?1:0;
  pinCaps[type].setMatrixAt(count[type]++,pinOffset.copy(pinMatrix).multiply(pinDepth[1]));
 });
 for(const inst of [pinStem,...pinCaps])inst.instanceMatrix.needsUpdate=true;
}
const pinDepth=[.005,.012].map(z=>new T.Matrix4().makeTranslation(0,0,z));
// Loading trough, with its turned lip and a milled viewing notch.
const hopper=group(board,-.119,.466,.019);hopper.rotation.z=.055;
box(hopper,.124,.009,.056,M.honey,0,-.007,.013,.003);
box(hopper,.124,.037,.008,M.walnut,0,.005,-.012,.003);
for(const d of [-1,1])box(hopper,.009,.044,.058,M.maple,d*.061,.009,.012,.004);
const lipShape=new T.Shape();lipShape.moveTo(-.061,-.012);lipShape.lineTo(-.061,.024);lipShape.lineTo(-.047,.024);
lipShape.bezierCurveTo(-.037,.024,-.036,.011,-.024,.011);lipShape.lineTo(.024,.011);
lipShape.bezierCurveTo(.037,.011,.037,.024,.048,.024);lipShape.lineTo(.061,.024);lipShape.lineTo(.061,-.012);lipShape.closePath();
solid(hopper,lipShape,.006,M.maple,0,0,.04,.002);
box(hopper,.099,.0015,.001,M.birch,0,-.004,.044,.0006);
for(const x of [-.052,.052])screw(hopper,x,.009,.044,.0024);
const glassPalette=[0x3caba8,0xdf8b59,0xe0b64e,0x6999ae,0xca786a];
const marbleMaterials=glassPalette.map(c=>new T.MeshPhysicalMaterial({color:c,roughness:.105,roughnessMap:rough,metalness:.12,clearcoat:1,clearcoatRoughness:.055,ior:1.52,envMapIntensity:1.45}));
const shells=glassPalette.map(c=>new T.MeshPhysicalMaterial({color:0xffffff,roughness:.075,roughnessMap:rough,
 transmission:.90,thickness:.015,ior:1.52,attenuationDistance:.024,attenuationColor:new T.Color(c),
 clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.24}));
const glassGeo=new T.SphereGeometry(.008,32,22);
const ribbons=[M.aqua,M.cream,M.cream,M.cream,M.gold].map(m=>{const finish=m.clone();finish.side=T.DoubleSide;return finish;});
marbleMaterials.forEach(m=>m.side=T.DoubleSide);
function marble(g,i){
 const id=i%5;
 // A twisted coloured ribbon and an opal filament are enclosed in solid optical glass.
 for(let k=0;k<2;k++){
  const vertices=[],indices=[],uv=[];
  for(let j=0;j<=30;j++){
   const t=-1.45+j/30*2.9,ang=t*2.03+k*pi+.8*id;
   for(const side of [-1,1]){
    const r=.0046+side*(k===0?.00245:.0017),a=ang+side*.46;
    vertices.push(r*Math.cos(t)*Math.cos(a),.00735*Math.sin(t),r*Math.cos(t)*Math.sin(a));
    uv.push(j/30,(side+1)/2);
   }
   if(j<30){const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  mesh(g,geo,k===0?marbleMaterials[id]:ribbons[id]);
 }
 const core=orb(g,.0007,0,0,.0025,.0058,.0027,marbleMaterials[id]);core.rotation.z=.5;
 mesh(g,glassGeo,shells[id]);
}
for(let i=0;i<11;i++){
 const g=group(hopper,-.044+(i%5)*.020+(i===10?.044:0),i<5?.009:i<10?.015:.03,i<5?.026:.007);
 marble(g,(i*3+1)%5);g.rotation.z=rand()*TAU;
}
const feedTrack=[0,.33,.66,1].map(u=>[-.103*(1-u),.477-.046*u-.016*u*(1-u),.035-.021*u]);
for(const k of [-1,1])tube(board,feedTrack.map(([x,y,z])=>[x,y-.007,z+k*.006]),.00175,M.bright);
const cradle=group(board,0,.426,.009);
box(cradle,.030,.008,.019,M.teal,0,-.004,0,.003);
for(const k of [-1,1])orb(cradle,k*.011,.002,.002,.003,.006,.006,M.brass);
// The push cap is a real axial plunger. The helix shortens between two fixed collars.
const launcher=group(board,.134,.423,.037),cap=moving(group(launcher,0,.072,0));
box(launcher,.085,.023,.044,M.honey,0,-.003,-.007,.007);
cyl(launcher,.022,.025,.010,M.teal,0,.011,0);
cyl(launcher,.016,.016,.006,M.bright,0,.017,0);
const helix=moving(group(launcher,0,.017,0));
const coil=[];for(let i=0;i<=150;i++){const a=i/150*TAU*6.6;coil.push([.011*Math.cos(a),i/150*.049,.011*Math.sin(a)]);}
tube(helix,coil,.00155,M.bright,150);
cyl(cap,.006,.006,.059,M.steel,0,-.025,0);
cyl(cap,.019,.014,.009,M.brass,0,-.004,0);
const handleFinish=new T.MeshPhysicalMaterial({color:0xc9654b,roughness:.28,roughnessMap:rough,clearcoat:.68,clearcoatRoughness:.21});
lathe(cap,[[0,0],[.02,0],[.034,.003],[.039,.007],[.0395,.014],[.037,.019],[.028,.023],[.012,.026],[0,.0265]],handleFinish,0,0,0);
const capInlay=ring(cap,0,.025,0,.015,.00085,M.cream);capInlay.rotation.x=pi/2;
const brassRim=ring(cap,0,.003,0,.031,.0014,M.bright);brassRim.rotation.x=pi/2;
const touchTarget=mesh(launcher,new T.BoxGeometry(.111,.111,.086),M.cream,0,.051,.002);
touchTarget.visible=false;touchTarget.userData.keep=true;
const pinwheelGroups=[],bells=[],lips=[];
for(let j=0;j<3;j++){
 const x=MarbleToy.CUP[j],g=group(board,x,.018,.018);
 box(g,.115,.014,.047,M.honey,0,-.018,.008,.005);
 for(const side of [-1,1]){
  const b=box(g,.008,.055,.044,M.birch,side*.055,.005,.009,.004);
  b.rotation.z=-side*.11;
 }
 box(g,.103,.012,.035,M.felt,0,-.003,.012,.003);
 const sh=new T.Shape();sh.moveTo(-.056,-.022);sh.quadraticCurveTo(-.06,-.018,-.058,-.006);sh.lineTo(-.056,.023);
 sh.quadraticCurveTo(-.056,.028,-.05,.027);sh.bezierCurveTo(-.036,.025,-.039,.003,0,.003);
 sh.bezierCurveTo(.036,.003,.038,.026,.051,.027);sh.quadraticCurveTo(.057,.028,.057,.02);sh.lineTo(.058,-.01);
 sh.quadraticCurveTo(.057,-.023,.048,-.023);sh.closePath();
 solid(g,sh,.008,pocketPaint[j],0,0,.039,.002);
 const inlay=group(g,.019,-.009,.044);for(let n=-1;n<=1;n++)medallion(inlay,n*.007,0,0,n===0?.0022:.0012,M.cream);
 const wind=moving(group(g,-.033,-.004,.049));pinwheelGroups.push(wind);
 for(let k=0;k<4;k++){
  const blade=group(wind);blade.rotation.z=k*pi/2;
  solid(blade,outline([[.0008,0],[-.004,.006],[-.0044,.016],[.001,.0172],[.0065,.010],[.004,.002]]),.0028,k%2?M.cream:M.birch,0,0,0,.0008);
 }
 orb(wind,0,0,.0023,.003,.003,.0025,M.bright);
 const gate=moving(group(g,0,.045,-.010));lips.push(gate);
 box(gate,.099,.0035,.010,M.bright,0,0,0,.0015);
 const bell=moving(group(g,.043,-.024,.046));bells.push(bell);
 lathe(bell,[[.001,0],[.003,-.002],[.004,-.006],[.007,-.009],[.007,-.010],[.005,-.010]],M.brass,0,0,0);
 orb(bell,0,-.010,0,.0017,.002,.0017,M.deep);
}
// Cabinet plinth and arched automaton theatre.
const base=group(board,0,-.117,.011);
box(base,.409,.155,.077,M.honey,0,0,-.024,.009);
box(base,.385,.137,.012,M.maple,0,.002,.020,.006);
const theatre=new T.Shape();theatre.moveTo(-.087,-.067);theatre.lineTo(-.087,.007);
theatre.bezierCurveTo(-.087,.088,.087,.088,.087,.007);theatre.lineTo(.087,-.067);theatre.closePath();
solid(base,theatre,.005,M.birch,0,0,.029,.004);
const inside=solid(base,theatre,.005,M.jade,0,-.003,.034,.001);inside.scale.set(.91,.92,1);
for(let j=0;j<15;j++){
 const a=j/14*pi,xx=.077*Math.cos(a),yy=.004+.060*Math.sin(a);
 medallion(base,xx,yy,.0385,.0016,M.cream);
}
for(const side of [-1,1]){
 const g=group(base,side*.141,-.006,.031);
 box(g,.081,.107,.006,M.honey,0,0,0,.02);
 box(g,.074,.100,.006,M.birch,0,0,.004,.017);
 // Three turned reed pipes on either side of the music box.
 for(let i=-1;i<=1;i++){
  const h=.038+.015*(1-Math.abs(i));
  box(g,.0074,h,.005,M.honey,i*.017,.003,.008,.0036);
  box(g,.0027,h-.008,.002,M.walnut,i*.017,.003,.011,.0013);
 }
 star(g,0,.039,.009,.004,M.gold);
 for(const k of [-1,1])screw(g,k*.029,-.038,.008,.002);
}
const topTrim=box(base,.412,.014,.077,M.maple,0,.077,.005,.005);
for(let i=-9;i<=9;i++){
 const scallop=group(base,i*.0207,.070,.042);
 orb(scallop,0,0,0,.01035,.008,.0039,i%2===0?M.cream:M.aqua);
}
box(base,.415,.011,.089,M.birch,0,-.079,.003,.004);
const wheelGroup=moving(group(board,0,MarbleToy.HUB,.064)),gondolas=[];
for(const z of [-.011,.011]){
 ring(wheelGroup,0,0,z,MarbleToy.WHEEL,.0039,M.maple);
 ring(wheelGroup,0,0,z+.0013,MarbleToy.WHEEL-.0044,.00135,M.cream);
 for(let i=0;i<6;i++){
  const a=i*MarbleToy.SLOT;
  rod(wheelGroup,[0,0,z],[Math.sin(a)*MarbleToy.WHEEL,Math.cos(a)*MarbleToy.WHEEL,z],.0027,M.birch);
 }
}
for(let i=0;i<6;i++){
 const a=i*MarbleToy.SLOT,x=Math.sin(a)*MarbleToy.WHEEL,y=Math.cos(a)*MarbleToy.WHEEL;
 cyl(wheelGroup,.0026,.0026,.032,M.brass,x,y,.004,'z');
 const g=moving(group(board,x,y+MarbleToy.HUB,.094));gondolas.push(g);
 for(const k of [-1,1])rod(g,[0,.002,-.012],[k*.010,-.010,.002],.00115,M.bright);
 const bucket=new T.Shape();bucket.moveTo(-.012,-.007);bucket.lineTo(.012,-.007);bucket.lineTo(.009,-.016);bucket.quadraticCurveTo(0,-.022,-.009,-.016);bucket.closePath();
 solid(g,bucket,.014,pocketPaint[i%3],0,0,.001,.0012);
 box(g,.024,.0026,.017,M.cream,0,-.007,.001,.001);
}
for(const k of [-1,1])rod(board,[k*.035,-.18,.083],[0,MarbleToy.HUB,.081],.0038,M.teal);
cyl(board,.011,.011,.011,M.bright,0,MarbleToy.HUB,.084,'z');star(board,0,MarbleToy.HUB,.091,.0063,M.cream);
box(board,.212,.009,.105,M.walnut,0,-.198,.065,.004);
for(const x of [-.102,.102])box(board,.009,.032,.100,M.maple,x,-.183,.066,.004);
box(board,.20,.026,.006,M.honey,0,-.184,.019,.003);
for(let i=0;i<12;i++){
 const z=.068+i*.0008;
 box(board,.004,.0018,.027+i*.001,M.bright,(i-5.5)*.0065,-.187,z,.0008);
}
cyl(board,.009,.009,.111,M.brass,0,-.18,.049,'x');
const lid=moving(group(board,0,-.196,.116));
box(lid,.202,.031,.011,M.maple,0,.016,0,.004);
box(lid,.202,.005,.032,M.birch,0,.031,-.011,.003);box(lid,.181,.016,.002,M.teal,0,.012,.006,.004);
for(const x of [-.078,.078])screw(lid,x,.012,.0075,.0023);
box(lid,.031,.005,.008,M.bright,0,.015,.009,.002);
for(const k of [-1,1])cyl(board,.006,.006,.026,M.brass,k*.078,-.194,.112,'x');
for(let j=0;j<3;j++){
 const x=MarbleToy.CUP[j],y0=.026,y1=MarbleToy.HUB+MarbleToy.WHEEL-.007;
 for(const side of [-1,1])tube(board,[[x+side*.0055,y0-.008,.043],[x*.65+side*.0055,y0*.65+y1*.35-.012,.061],[x*.32+side*.0055,y0*.32+y1*.68-.012,.077],[side*.0055,y1-.008,.095]],.0012,M.brass,18);
}
for(const x of [-.166,.166]){
 box(toy,.064,.022,.178,M.walnut,x,.024,.012,.008);
 box(toy,.051,.012,.147,M.deep,x,.014,.012,.005);
 rod(toy,[x,.036,-.061],[x,.48,-.09],.013,M.honey);
}
box(toy,.438,.025,.209,M.maple,0,.045,.008,.008);
box(toy,.423,.010,.194,M.honey,0,.032,.008,.005);
for(const k of [-1,1]){box(toy,.024,.073,.111,M.honey,k*.194,.082,.009,.007,true);}
const balls3D=new Map();
function updateBalls(){
 const ids=new Set();
 for(const b of S.balls){
  ids.add(b.id);let g=balls3D.get(b.id);
  if(!g){g=moving(group(board));marble(g,(b.id*2)%5);balls3D.set(b.id,g);}
  g.position.set(b.x,b.y,b.z);g.visible=b.mode!=='stored';g.quaternion.fromArray(b.rotation);
 }
 for(const [id,g] of balls3D)if(!ids.has(id)){g.removeFromParent();for(const o of g.children)if(o.geometry!==sphereGeo&&o.geometry!==glassGeo)o.geometry.dispose();balls3D.delete(id);}
}
// A carved ivory pointing hand approaches the cap from its outside edge.
const guideHand=moving(group(launcher)),handMat=paint(0xffeac5,.43);
const handShape=new T.Shape();handShape.moveTo(-.009,.001);
handShape.bezierCurveTo(-.014,-.006,-.021,-.002,-.017,.004);handShape.lineTo(-.009,.017);
handShape.lineTo(-.009,.034);handShape.quadraticCurveTo(-.010,.040,-.004,.040);handShape.quadraticCurveTo(.001,.040,.001,.034);
handShape.lineTo(.001,.022);handShape.bezierCurveTo(.004,.027,.008,.025,.009,.022);
handShape.bezierCurveTo(.013,.025,.017,.022,.016,.018);handShape.bezierCurveTo(.021,.020,.023,.016,.021,.011);
handShape.lineTo(.018,-.001);handShape.quadraticCurveTo(.015,-.009,.004,-.010);handShape.quadraticCurveTo(-.004,-.011,-.009,.001);
solid(guideHand,handShape,.007,handMat,0,0,0,.0015);guideHand.rotation.z=2.47;
const cuff=box(guideHand,.022,.007,.009,M.aqua,.005,-.01,0,.002);
function updateToy(){
 cap.position.y=.072-S.lever.q;helix.scale.y=1-S.lever.q/.049;
 const g=S.guide;guideHand.visible=g.reach>.01;
 guideHand.position.set(.053-.010*g.reach,.151-.023*g.reach-.019*g.q,.025);
 guideHand.scale.setScalar(g.reach);
 handleFinish.emissive.setHex(0xaf5634);handleFinish.emissiveIntensity=S.phase==='ready'?.12+.16*g.q:.018;
 updatePins();
 S.cups.forEach((c,i)=>{pinwheelGroups[i].rotation.z=c.wing;bells[i].rotation.z=c.bell.q;lips[i].rotation.z=c.lip.q*(i===2?1:-1);});
 wheelGroup.rotation.z=-S.wheel.angle;lid.rotation.x=S.lid.q;
 gondolas.forEach((g,i)=>{const a=S.wheel.angle+i*MarbleToy.SLOT;g.position.x=Math.sin(a)*MarbleToy.WHEEL;g.position.y=MarbleToy.HUB+Math.cos(a)*MarbleToy.WHEEL;g.rotation.z=S.baskets[i].q;});
 updateBalls();
}
batch(toy);batch(wheelGroup);batch(guideHand);batch(cap);gondolas.forEach(batch);pinwheelGroups.forEach(batch);
