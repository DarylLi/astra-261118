'use strict';
const room=group(scene),floorFinish=[0xdcc3a0,0xe5ceab,0xdcc5a4,0xe6cfae].map(c=>timber(c,.57));
const curtainShade={value:new T.Vector3()};
function sunlight(m){
 m.onBeforeCompile=sh=>{
  sh.vertexShader='varying vec3 where;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nwhere=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.uniforms.drape=curtainShade;
  sh.fragmentShader='varying vec3 where; uniform vec3 drape;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 w=vec2(where.x+where.z*.52,where.z-where.x*.24);
   w.x+=mix(drape.x,drape.y,smoothstep(-.45,.1,w.x))*2.8+drape.z*w.y;
   float frames=smoothstep(.008,.033,abs(mod(w.x+.31,.45)-.225))*smoothstep(.009,.038,abs(mod(w.y+.14,.65)-.325));
   float patch=smoothstep(-1.1,-.94,w.x)*(1.-smoothstep(.79,1.,w.x))*smoothstep(-.63,-.50,w.y);
   diffuseColor.rgb*=mix(vec3(.84,.86,.89),vec3(1.12,1.085,1.01),frames*patch);
  `);
 };
}
floorFinish.forEach(sunlight);
for(let j=0;j<22;j++){
 const z=-1.5+j*.143,offset=(j%3)*.39;
 for(let i=-2;i<=2;i++){
  const plank=box(room,1.177,.1418,.02,floorFinish[(j*3+i+8)%4],i*1.18+offset,-.011,z,.0012);
  plank.rotation.x=-Math.PI/2;
 }
}
// A real opening in the plaster lets the garden sit behind the glazing.
for(const [x,y,w,h] of [[-1.75,1.24,1.30,2.50],[1.29,1.24,2.22,2.50],[-.46,.085,1.28,.19],[-.46,1.87,1.28,1.26]])
 box(room,w,h,.035,M.wall,x,y,-.75,.001);
const outdoors=paint(0xedf2df,.92);outdoors.emissive.setHex(0xd5e4ce);outdoors.emissiveIntensity=.65;
box(room,4.4,2.8,.03,outdoors,-.46,.84,-1.76,.001);
const foliage=[0xc0caa9,0xd2d5b2,0xb7c6a5].map(c=>{const m=paint(c,.93);m.emissive.setHex(c);m.emissiveIntensity=.33;return m;});
for(let i=0;i<24;i++){
 const x=-1.47+i*.067,y=.23+.11*Math.sin(i*.21+.3)+rand()*.09;
 const leaf=orb(room,x,y,-1.48+rand()*.09,.10+rand()*.07,.11+rand()*.12,.08,foliage[i%3]);leaf.castShadow=false;
}
const trim=paint(0xede9d8,.63);
box(room,4.8,.076,.030,trim,0,.038,-.72,.003);
box(room,4.8,.012,.042,trim,0,.081,-.72,.003);
const windowG=group(room,-.46,.71,-.69);
const glass=paint(0xe3efe6,.18,.07);glass.emissive.setHex(0xdbe9d8);glass.emissiveIntensity=.34;
glass.transparent=true;glass.opacity=.23;glass.depthWrite=false;
box(windowG,1.27,1.06,.018,glass,0,0,-.013,.003);
for(const x of [-.64,0,.64])box(windowG,.026,1.08,.042,trim,x,0,.011,.003);
for(const y of [-.53,-.044,.53])box(windowG,1.31,.026,.047,trim,0,y,.019,.003);
box(windowG,1.39,.024,.117,trim,0,-.557,.039,.006);
box(windowG,1.32,.033,.045,trim,0,-.582,.006,.004);
const clothMat=paint(0xfff5e3,.96);clothMat.map=weave;clothMat.side=T.DoubleSide;
clothMat.emissive.setHex(0xdec9a6);clothMat.emissiveIntensity=.10;
const curtains=[];
function curtain(x,width,bottom,phase){
 const nx=55,ny=14,geom=new T.PlaneGeometry(1,1,nx,ny),a=geom.attributes.position;
 const basis=[],strips=[];const uv=geom.attributes.uv;
 for(let i=0;i<a.count;i++){
  const u=uv.getX(i),v=uv.getY(i);
  const fold=Math.cos(TAU*(u*5.2+phase+.087*Math.sin(v*3.2+u*5)));
  const hem=bottom+.013*fold+.018*Math.sin(u*4);
  const xx=x+(u-.5)*width*(1.16-.24*v)+.014*Math.sin(v*5+phase);
  const yy=hem+(1.29-hem)*v,zz=-.57+fold*.022*(1+.3*(1-v))+.016*Math.sin(v*4+u*3);
  basis.push([xx,yy,zz,v]);strips.push(Math.min(8,Math.floor(u*9)));a.setXYZ(i,xx,yy,zz);
  uv.setXY(i,u*4,v*18);
 }
 geom.computeVertexNormals();const m=mesh(room,geom,clothMat);m.userData.moving=true;
 curtains.push({geom,basis,strips});
}
curtain(-.94,.28,.18,0);curtain(.165,.18,.39,.59);
function updateCurtains(){
 curtainShade.value.set(S.cloth[0].q,S.cloth[4].q,S.cloth[8].q);
 for(const c of curtains){
  const a=c.geom.attributes.position;
  c.basis.forEach(([x,y,z,v],i)=>{const d=S.cloth[c.strips[i]].q*(1-v)**2;
    a.setXYZ(i,x+.5*d,y+.11*d,z+2.2*d);});
  a.needsUpdate=true;
 }
}
// Braided oval mat. Individual rows and the woven surface have real relief.
const rug=group(room,0,.004,.017),rugMat=paint(0xd4ba8e,.96);rugMat.map=weave;sunlight(rugMat);
const rugFace=cyl(rug,1,1,.007,rugMat,0,0,0,'y',112);rugFace.scale.set(.354,1,.235);
const cords=[0xbc9e74,0xe1c9a0,0xc9b186,0x9eab93,0xdac39c].map(c=>paint(c,.9));
for(let i=0;i<13;i++){
 const rad=.343-i*.0043,pts=[];
 for(let j=0;j<=120;j++){const a=TAU*j/120;pts.push([Math.cos(a)*rad,.0039,Math.sin(a)*rad*.656]);}
 tube(rug,pts,i===4?.0026:.00115,cords[i===4||i===6?3:i%3],160);
}
shade(room,.018,.009,.004,.56,.34,.34,true);
// A quiet, out-of-focus houseplant behind the cabinet.
const plant=group(room,.51,0,-.37),potMat=paint(0xd1b79a,.57),leafColors=[0x7f9073,0x647e68,0x98a185,0x6e8970].map(c=>paint(c,.62));
lathe(plant,[[0,.008],[.063,.008],[.079,.025],[.084,.105],[.092,.12],[.092,.132],[.082,.132],[.078,.12]],potMat,0,0,0);
cyl(plant,.081,.080,.008,M.deep,0,.12,0);
for(let i=0;i<13;i++){
 const ang=i*2.399+.3,reach=.055+rand()*.08,height=.115+rand()*.205;
 const end=[Math.cos(ang)*reach,.127+height,Math.sin(ang)*reach];
 tube(plant,[[0,.12,0],[end[0]*.23,.15+height*.55,end[2]*.23],end],.002,leafColors[i%4],10);
 const leaf=new T.Shape();leaf.moveTo(0,0);leaf.bezierCurveTo(-.04,.014,-.023,.069,0,.09);leaf.bezierCurveTo(.032,.063,.035,.022,0,0);
 const l=solid(plant,leaf,.0014,leafColors[i%4],...end,.00035);
 l.rotation.set(.52*Math.sin(ang),ang,.7*Math.cos(ang));l.scale.setScalar(.7+rand()*.42);
}
shade(room,.51,.002,-.37,.27,.23,.27,true);
// The foreground block and the tips of two knitted slippers are placed at the frame edges.
const block=moving(group(scene)),sock=moving(group(scene)),sockMat=paint(0xcaa894,.9);
sockMat.map=weave;box(block,.079,.078,.077,M.honey,0,.039,0,.009);
const inset=box(block,.06,.059,.002,M.coral,0,.039,.038,.008);
ring(block,0,.039,.040,.020,.0014,M.cream);star(block,0,.039,.041,.013,M.cream);
const blockTop=group(block,0,.078,.001);blockTop.rotation.x=-Math.PI/2;star(blockTop,0,0,0,.023,M.birch,5);
for(let i=0;i<2;i++){const foot=group(sock,i*.043,0,i*.017);foot.rotation.y=-.21;
 orb(foot,0,.016,.033,.020,.018,.043,sockMat);
 for(let k=0;k<3;k++)orb(foot,0,.017,.043+k*.006,.019,.0184,.0035,k===1?M.coral:M.cream);
}
const moteMat=paint(0xfff1d0,.66);moteMat.emissive.setHex(0xe3c49e);moteMat.emissiveIntensity=.29;
const motes=new T.InstancedMesh(new T.SphereGeometry(1,6,4),moteMat,S.dust.length);motes.userData.moving=true;scene.add(motes);motes.frustumCulled=false;
const moteDummy=new T.Object3D();
function updateDust(){
 S.dust.forEach((d,i)=>{moteDummy.position.set(d.x,d.y,d.z);moteDummy.scale.setScalar(.00032+(i%5)*.000095);moteDummy.updateMatrix();motes.setMatrixAt(i,moteDummy.matrix);});motes.instanceMatrix.needsUpdate=true;
}
batch(room);batch(block);batch(sock);
