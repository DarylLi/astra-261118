/* The workshop builds solid parts. Textures are locally generated material grain. */
'use strict';
const T=THREE, model=MarbleToy.create(), S=model.state, canvas=document.querySelector('#toy');
window.__GAME__={step:dt=>model.step(dt),getState:()=>model.getState()};
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.03;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.045,12);
scene.background=new T.Color(0xe6e1cf);
scene.fog=new T.FogExp2(0xe6e1cf,.16);
let seed=94832;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const TAU=Math.PI*2;
function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
function moving(g){g.userData.moving=true;return g;}
function mesh(p,geo,mat,x=0,y=0,z=0){
 const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
}
function texture(w,h,pixel,srgb=false){
 const bytes=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++) for(let x=0;x<w;x++){
   const c=pixel(x/w,y/h,x,y),k=(y*w+x)*4;
   for(let j=0;j<3;j++) bytes[k+j]=Math.max(0,Math.min(255,Math.round(c[j])));
   bytes[k+3]=c[3]===undefined?255:c[3];
 }
 const a=new T.DataTexture(bytes,w,h);a.wrapS=a.wrapT=T.RepeatWrapping;a.magFilter=T.LinearFilter;
 a.minFilter=T.LinearMipmapLinearFilter;a.generateMipmaps=true;a.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 if(srgb)a.colorSpace=T.SRGBColorSpace;a.needsUpdate=true;return a;
}
const grain=texture(512,512,(u,v)=>{
 const wave=v+.020*Math.sin(TAU*u)+.008*Math.sin(TAU*(2*u+v))+.011*Math.sin(TAU*(u+2*v));
 const ring=.5+.5*Math.cos(TAU*(wave*11+.24*Math.sin(TAU*wave*3)));
 const fibre=Math.sin(TAU*(wave*115+.22*Math.sin(TAU*(u*3+v*6))));
 const fleck=rand();const shade=7*ring+12*ring**10+3*fibre+3*(rand()-.5)+(fleck>.985?17:0);
 return [251-shade,247-shade*1.11,236-shade*1.25];
},true);
const rough=texture(64,64,(u,v)=>{let n=220+14*Math.sin(TAU*5*v+Math.sin(TAU*u))+rand()*18;return[n,n,n];});
const weave=texture(128,128,(u,v,x,y)=>{const n=224+12*Math.cos(TAU*u*16)+10*Math.cos(TAU*v*16+(x%8<4?0:3.14))+7*rand();return[n,n*.987,n*.95];},true);
function paint(color,r=.49,metal=0){return new T.MeshStandardMaterial({color,roughness:r,metalness:metal,roughnessMap:rough});}
function timber(color,r=.46){const m=paint(color,r);m.map=grain;m.userData.wood=true;return m;}
const M={
 maple:timber(0xe4b57d),birch:timber(0xf1d49d),honey:timber(0xc58a51),end:timber(0xc38b57),
 walnut:timber(0x875636),deep:timber(0x66442e),edge:timber(0xd6a574),
 teal:paint(0x538e87),aqua:paint(0x83b4a8), jade:paint(0x497d76),
 gold:paint(0xe3ac4e),mustard:paint(0xc68d39), coral:paint(0xd88366),red:paint(0xb96852),
 cream:paint(0xf8e8c8), pearl:paint(0xfff1d7),dark:paint(0x4f4e3d),
 brass:paint(0xc99a54,.25,.73),bright:paint(0xe6c47d,.2,.72),steel:paint(0xd9d3bd,.22,.84),
 felt:paint(0x5a7568,.87),wall:paint(0xdadcc9,.92)};
function mapWood(g,vertical=false){
 const pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv,shift=rand()*2;
 for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
   const across=Math.abs(nor.getZ(i))>.55?y:z;
   uv.setXY(i,(vertical?y:Math.abs(nor.getX(i))>.75?z:x)/.41+shift,(vertical?(Math.abs(nor.getX(i))>.75?z:x):across)/.146+shift);
 }
}
function solid(p,shape,depth,mat,x,y,z,bevel=.0015,vertical=false,curveSegments=16){
 const geom=new T.ExtrudeGeometry(shape,{depth:Math.max(.0001,depth-2*bevel),bevelEnabled:bevel>0,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments});
 geom.translate(0,0,-depth/2+bevel);mapWood(geom,vertical);return mesh(p,geom,mat,x,y,z);
}
function outline(points){const sh=new T.Shape();points.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();return sh;}
function rounded(w,h,r){
 r=Math.min(r,w*.49,h*.49);const x=-w/2,y=-h/2,s=new T.Shape();
 s.moveTo(x+r,y);s.lineTo(-x-r,y);s.quadraticCurveTo(-x,y,-x,y+r);s.lineTo(-x,-y-r);s.quadraticCurveTo(-x,-y,-x-r,-y);
 s.lineTo(x+r,-y);s.quadraticCurveTo(x,-y,x,-y-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function box(p,w,h,d,mat,x,y,z,r=.002,vertical=h>w*1.3){
 const b=Math.min(r*.42,d*.23,w*.075,h*.075);
 return solid(p,rounded(w-2*b,h-2*b,Math.max(0,r-b)),d,mat,x,y,z,b,vertical,r<.002?3:r<.007?5:9);
}
const sphereGeo=new T.SphereGeometry(1,28,18);
function orb(p,x,y,z,rx,ry,rz,mat){const m=mesh(p,sphereGeo,mat,x,y,z);m.scale.set(rx,ry,rz);return m;}
function cyl(p,rt,rb,height,mat,x,y,z,axis='y',sides=36){
 const m=mesh(p,new T.CylinderGeometry(rt,rb,height,sides),mat,x,y,z);
 if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=-Math.PI/2;return m;
}
function rod(p,a,b,r,mat,r2=r){
 const A=new T.Vector3(...a),B=new T.Vector3(...b),D=B.clone().sub(A);
 const m=cyl(p,r2,r,D.length(),mat,...A.clone().lerp(B,.5).toArray(),'y',16);
 m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),D.normalize());return m;
}
function tube(p,pts,r,mat,n=30){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),n,r,8,false),mat);}
function ring(p,x,y,z,r,t,mat){return mesh(p,new T.TorusGeometry(r,t,10,64),mat,x,y,z);}
function medallion(p,x,y,z,r,mat){
 const m=cyl(p,r,r,.0017,mat,x,y,z,'z');return m;
}
function star(p,x,y,z,r,mat,points=4){
 let a=[];for(let i=0;i<points*2;i++){let t=i*Math.PI/points,k=i%2?.42:1;a.push([Math.sin(t)*r*k,Math.cos(t)*r*k]);}
 return solid(p,outline(a),.001,mat,x,y,z,.0002);
}
function lathe(p,profile,mat,x,y,z,arc=TAU){
 return mesh(p,new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),48,0,arc),mat,x,y,z);
}
// A generated radiance field supplies window and floor reflections to varnish, glass and brass.
{
 const w=512,h=256,arr=new Float32Array(w*h*4);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  const a=i/w,b=j/h,sky=Math.max(0,(b-.47)*2),floor=Math.max(0,(.48-b)*2);
  const win=(a>.14&&a<.42&&b>.52&&b<.83&&Math.abs(a-.28)>.006&&Math.abs(b-.675)>.008)?3.1:0;
  const k=(j*w+i)*4;arr[k]=.33+.28*sky+.17*floor+win;arr[k+1]=.31+.35*sky+.09*floor+win;arr[k+2]=.25+.48*sky+win*1.04;arr[k+3]=1;
 }
 const src=new T.DataTexture(arr,w,h,T.RGBAFormat,T.FloatType);src.mapping=T.EquirectangularReflectionMapping;src.needsUpdate=true;
 const gen=new T.PMREMGenerator(renderer);scene.environment=gen.fromEquirectangular(src).texture;scene.environmentIntensity=.52;src.dispose();gen.dispose();
}
const sun=new T.DirectionalLight(0xffe4b9,2.45);sun.position.set(-1.4,2.15,.58);sun.target.position.set(0,.22,0);scene.add(sun,sun.target);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-1.30,right:1.30,top:1.28,bottom:-1.28,near:.1,far:5});
sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00021;sun.shadow.normalBias=.0006;sun.shadow.radius=3;
scene.add(new T.HemisphereLight(0xe6f2ff,0xd6b793,1.25));
const shadowTex=texture(96,96,(x,y)=>{const r=((x-.5)**2+(y-.5)**2)*4;return [255,255,255,Math.round(255*Math.max(0,1-r)**3)];});
function shade(p,x,y,z,w,h,opacity=.24,floor=false){
 const m=new T.MeshStandardMaterial({color:0x53391f,map:shadowTex,roughness:1,roughnessMap:rough,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const a=mesh(p,new T.PlaneGeometry(w,h),m,x,y,z);a.castShadow=false;if(floor)a.rotation.x=-Math.PI/2;return a;
}
// Combine stationary timber, fasteners and upholstery by finish to keep mobile draw calls bounded.
function batch(root){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),sets=new Map(),old=[];
 function walk(o){
  if(o.userData.moving||o.userData.keep)return;
  if(o.isMesh&&!Array.isArray(o.material)&&!o.material.transparent){
   const key=o.material.uuid+'_'+o.castShadow+'_'+o.receiveShadow;
   if(!sets.has(key))sets.set(key,{mat:o.material,cast:o.castShadow,receive:o.receiveShadow,parts:[]});
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
   g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));sets.get(key).parts.push(g);old.push(o);
  }
  o.children.forEach(walk);
 }
 root.children.forEach(walk);
 for(const set of sets.values()){
  const geom=new T.BufferGeometry();
  for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
   let length=0;for(const g of set.parts)length+=g.attributes.position.count*size;
   const array=new Float32Array(length);let at=0;
   for(const g of set.parts){if(g.attributes[name])array.set(g.attributes[name].array,at);at+=g.attributes.position.count*size;}
   geom.setAttribute(name,new T.BufferAttribute(array,size));
  }
  const m=new T.Mesh(geom,set.mat);m.castShadow=set.cast;m.receiveShadow=set.receive;root.add(m);
  set.parts.forEach(g=>g.dispose());
 }
 for(const o of old)o.removeFromParent();
}
