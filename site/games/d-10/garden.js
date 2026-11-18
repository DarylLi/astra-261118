(() => {
'use strict';
const T=THREE,{Garden,plans,colors,towers,fork,floor,R,narrow,makeRandom}=ToyGarden;
const world=new Garden(), random=makeRandom(17031), v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const range=(a,b)=>a+(b-a)*random(), pick=a=>a[Math.floor(random()*a.length)], tau=Math.PI*2;
const canvas=document.getElementById('garden'),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new T.Scene(),staticRoot=new T.Group();scene.add(staticRoot);
const camera=new T.PerspectiveCamera(38,1,.035,60);scene.fog=new T.FogExp2(0xe0dfba,.057);
function texture(w,h,paint){
 const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}
const grain=texture(256,512,(g,w,h)=>{
 const img=g.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const xx=x+2.4*Math.sin(y/h*tau+x*.018)+1.8*Math.cos(y/h*tau*2+x*.013);
  const a=235+3*Math.sin(xx*.58)+4*Math.cos(xx*.105)+2*Math.sin(xx*1.73)+range(-5,5),j=4*(y*w+x);
  img.data[j]=a+4;img.data[j+1]=a+2;img.data[j+2]=a-2;img.data[j+3]=255;
 }g.putImageData(img,0,0);
 for(let i=0;i<160;i++){const x=range(0,w),y=range(0,h),l=range(5,118);g.strokeStyle='rgba(106,72,39,'+range(.035,.16)+')';g.lineWidth=range(.3,.95);g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+1,y+l*.4,x-2,y+l*.7,x-1,y+l);g.stroke();}
});
grain.colorSpace=T.SRGBColorSpace;
const rough=texture(128,128,(g,w,h)=>{const p=g.createImageData(w,h);for(let i=0;i<p.data.length;i+=4){const a=range(215,253);p.data[i]=p.data[i+1]=p.data[i+2]=a;p.data[i+3]=255;}g.putImageData(p,0,0);});
function material(color,opts={}){
 return new T.MeshStandardMaterial({color,roughness:.77,metalness:0,roughnessMap:rough,...opts});
}
function wood(color,r=.59){return material(color,{map:grain,roughness:r,bumpMap:grain,bumpScale:.00048});}
const timber=wood('#bb834e'),lightWood=wood('#deb47b'),cutwood=wood('#edcd95'),bark=wood('#876c50');
const grassMat=material('#ffffff',{vertexColors:true,side:T.DoubleSide,roughness:.88});
const leafMat=material('#ffffff',{vertexColors:false,roughness:.86});
const brass=material('#cca75f',{metalness:.68,roughness:.31}),ivory=material('#eed9ab'),cord=material('#9b7954');
const leafPalette=['#658556','#789260','#77935c','#819d63','#587e58','#8b9e67'];
function mesh(geo,mat,parent=staticRoot,x=0,y=0,z=0){
 const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
const sphere=new T.SphereGeometry(1,20,14),smallSphere=new T.SphereGeometry(1,10,7);
function oval(parent,x,y,z,rx,ry,rz,mat,geo=sphere){const o=mesh(geo,mat,parent,x,y,z);o.scale.set(rx,ry,rz);return o;}
function rod(parent,a,b,r1,r2,mat,n=10){
 const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r2,r1,d.length(),n),mat,parent);o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;
}
function polygon(points){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return s;}
function extrude(shape,depth,b=.008){
 const g=new T.ExtrudeGeometry(shape,{depth:depth-2*b,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:20});
 g.translate(0,0,-depth/2+b);return g;
}
function box(w,h,d,b=.008){
 b=Math.min(b,w*.15,h*.15,d*.15);
 const shape=polygon([[-w/2+b,-h/2+b],[w/2-b,-h/2+b],[w/2-b,h/2-b],[-w/2+b,h/2-b]]);
 return extrude(shape,d,b);
}
function boxAt(parent,x,y,z,w,h,d,mat,b){return mesh(box(w,h,d,b),mat,parent,x,y,z);}
function tube(points,r,mat,parent=staticRoot,segments=24){
 return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,r,7,false),mat,parent);
}
// An analytic sky lights the varnish, dew and brass with the same morning horizon.
const sw=256,sh=128,skyData=new Float32Array(sw*sh*4),sunDir=v(-5.2,2.85,3.7).normalize();
const zen=new T.Color('#96c6db'),horizon=new T.Color('#f9e9cb'),land=new T.Color('#6f8359'),lightColor=new T.Color();
for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
 const lat=((y+.5)/sh-.5)*Math.PI,lon=((x+.5)/sw-.5)*tau,d=v(Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)),j=(y*sw+x)*4;
 lightColor.copy(horizon).lerp(zen,Math.pow(Math.max(0,d.y),.48));
 if(d.y<0)lightColor.lerp(land,Math.min(1,-d.y*7));
 const sd=Math.max(0,d.dot(sunDir)),glow=.35*Math.pow(sd,14)+3*Math.pow(sd,480)+13*Math.pow(sd,2600);
 skyData[j]=lightColor.r+glow;skyData[j+1]=lightColor.g+glow*.81;skyData[j+2]=lightColor.b+glow*.49;skyData[j+3]=1;
}
const sky=new T.DataTexture(skyData,sw,sh,T.RGBAFormat,T.FloatType);sky.mapping=T.EquirectangularReflectionMapping;sky.needsUpdate=true;
const pm=new T.PMREMGenerator(renderer),env=pm.fromEquirectangular(sky);pm.dispose();scene.environment=env.texture;scene.environmentIntensity=.34;scene.background=sky;
const hemi=new T.HemisphereLight(0xcfe9ff,0xc4af76,1.48);scene.add(hemi);
const sun=new T.DirectionalLight(0xffe2ac,2.35);sun.position.set(-5.2,2.85,3.7);sun.castShadow=true;sun.target.position.set(0,0,-.3);scene.add(sun,sun.target);
Object.assign(sun.shadow.camera,{left:-4.3,right:4.3,top:4.4,bottom:-4.4,near:.3,far:13});sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.006;sun.shadow.bias=-.00022;sun.shadow.radius=2;
// Continuous grass under individually modelled blades.
const turf=texture(512,512,(g,w,h)=>{
 g.fillStyle='#91a966';g.fillRect(0,0,w,h);
 for(let i=0;i<21000;i++){g.fillStyle=pick(['#677f4b38','#a7bb7b52','#c0c78a42','#748e544e']);const x=range(0,w),y=range(0,h);g.beginPath();g.ellipse(x,y,range(.7,4),range(.5,1.7),range(-2,2),0,tau);g.fill();}
 for(let i=0;i<28000;i++){const x=range(0,w),y=range(0,h);g.strokeStyle=pick(['#5e804761','#d4d39291','#84a25b99']);g.lineWidth=range(.4,1.1);g.beginPath();g.moveTo(x,y);g.lineTo(x+range(-2.2,3.4),y-range(1.5,5));g.stroke();}
});
turf.colorSpace=T.SRGBColorSpace;turf.repeat.set(27,28);
const plane=new T.PlaneGeometry(45,45,2,120);plane.rotateX(-Math.PI/2);
const pa=plane.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,floor(pa.getX(i),pa.getZ(i))-.004);plane.computeVertexNormals();
mesh(plane,material('#cad6ac',{map:turf,roughness:.91}),staticRoot).castShadow=false;
const bladeP=[],bladeC=[],bladeCell=[],bladeWeight=[],wetTips=[];
const grasses=['#819958','#8ea55f','#9bac6c','#afba72','#698952','#aeaf64','#799c60'].map(c=>new T.Color(c));
function blade(x,y,z,h,w,angle,lean,col,cell,dewy){
 const wx=Math.cos(angle)*w,wz=Math.sin(angle)*w,lx=Math.sin(angle)*lean,lz=-Math.cos(angle)*lean;
 if(dewy)wetTips.push({x:x+lx*2.9,y:y+h,z:z+lz*2.9,h,cell});
 const verts=[[x-wx,y,z-wz],[x+wx,y,z+wz],[x+lx+wx*.48,y+h*.62,z+lz+wz*.48],[x+lx-wx*.48,y+h*.62,z+lz-wz*.48],[x+lx*2.9,y+h,z+lz*2.9]];
 for(const j of [0,1,2,0,2,3,3,2,4]){
  bladeP.push(...verts[j]);const f=[.67,.77,1.02,.92,1.23][j];bladeC.push(col.r*f,col.g*f,col.b*f);bladeCell.push(cell);bladeWeight.push([0,0,.34,.34,1][j]*h);
 }
}
const grassEdge=ToyGarden.porch.front;
for(let i=0;i<12200;i++){
 const x=range(-4.9,4.9),z=range(-5,2.86),h=range(.019,.067),c=pick(grasses),cell=ToyGarden.cellIndex(x,z);
 const seedA=range(0,tau);for(let j=0;j<3;j++)blade(x+range(-.01,.01),floor(x,z)-.008,z+range(-.01,.01),h*range(.6,1.13),range(.0024,.005),seedA+j*2,range(.002,.011),c,cell,i%8===0&&j===0&&z<grassEdge);
}
const bladeGeo=new T.BufferGeometry();bladeGeo.setAttribute('position',new T.Float32BufferAttribute(bladeP,3));bladeGeo.setAttribute('color',new T.Float32BufferAttribute(bladeC,3));bladeGeo.setAttribute('grassPatchId',new T.Float32BufferAttribute(bladeCell,1));bladeGeo.setAttribute('flex',new T.Float32BufferAttribute(bladeWeight,1));bladeGeo.computeVertexNormals();
const windUniform={value:new Float32Array(32)};
grassMat.onBeforeCompile=shader=>{
 shader.uniforms.localWind=windUniform;shader.vertexShader='attribute float grassPatchId;attribute float flex;uniform float localWind[32];\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=localWind[int(grassPatchId)]*flex;');
};
const grassMesh=mesh(bladeGeo,grassMat,scene);grassMesh.castShadow=false;
// Plant masses use irregular curved crowns, fine leaves and visible forked trunks.
function shaggy(seed,detail=2){
 const rand=makeRandom(seed),g=new T.IcosahedronGeometry(1,detail),p=g.attributes.position,amp=range(.055,.105);
 const a=rand()*13,b=rand()*9;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+amp*Math.sin(x*5.8+y*3+a)*Math.cos(z*5+b)+.038*Math.sin(x*9-z*8+y*4);p.setXYZ(i,x*k,y*k,z*k);}
 // Radial normals give the softly trimmed leaves a continuous silhouette.
 const normals=[];for(let i=0;i<p.count;i++){const n=v(p.getX(i),p.getY(i)*.94,p.getZ(i)).normalize();normals.push(n.x,n.y,n.z);}g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return g;
}
const bushes=[],leaves=[],twigMat=wood('#857b58'),clusterGeo=shaggy(431,2),leafGeo=shaggy(164,0);
function mass(x,y,z,sx,sy,sz,col,fine=55){
 bushes.push({x,y,z,sx,sy,sz,col,ry:range(0,6)});
 const base=new T.Color(col);
 for(let j=0;j<fine;j++){
  const yy=range(-.65,1),a=range(0,tau),rr=Math.sqrt(1-yy*yy),dx=rr*Math.cos(a),dz=rr*Math.sin(a),k=range(.87,1);
  leaves.push({x:x+dx*sx*k,y:y+yy*sy*k,z:z+dz*sz*k,sx:range(.026,.069)*Math.sqrt(sx),sy:range(.026,.06)*Math.sqrt(sy),sz:range(.02,.05)*Math.sqrt(sz),ry:a,col:base.clone().offsetHSL(range(-.015,.015),0,range(-.045,.075))});
 }
}
function instances(geo,mat,data,parent=staticRoot,shadow=true){
 const o=new T.InstancedMesh(geo,mat,data.length),dummy=new T.Object3D();data.forEach((p,i)=>{
  dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx,p.sy,p.sz);dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(p.col)o.setColorAt(i,new T.Color(p.col));
 });o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;
}
for(let i=0;i<34;i++){const x=-9+i*.56,z=range(-5.8,-4.55);mass(x,range(.34,.55),z,range(.51,.86),range(.49,.84),range(.45,.76),pick(leafPalette),80);}
for(const side of [-1,1])for(let j=0;j<7;j++){const z=-3.65+j*.59;mass(side*range(3.60,4.35),range(.24,.48),z,range(.46,.81),range(.35,.71),range(.46,.84),pick(leafPalette));}
function tree(x,y,z,s){
 const base=v(x,y,z),mid=v(x+.10*s,y+1.23*s,z+.04*s);
 rod(staticRoot,base,mid,.141*s,.089*s,twigMat,15);
 for(let j=0;j<8;j++){const a=j*2.40,ext=range(.3,.88)*s,top=v(x+Math.cos(a)*ext,y+(1.62+range(.04,.79))*s,z+Math.sin(a)*ext*.85);
 rod(staticRoot,mid,top,.067*s,.033*s,twigMat,10);mass(top.x,top.y,top.z,range(.51,.84)*s,range(.39,.56)*s,range(.52,.84)*s,pick(leafPalette),100);}
}
tree(-3.58,0,-3.3,1.26);tree(3.37,0,-4.08,1.16);tree(-5.2,0,-6.6,1.52);tree(.45,0,-8.2,.79);tree(5.7,0,-6.9,1.4);
for(let i=0;i<16;i++){const x=range(-13,13);mass(x,.7,-10-range(0,3),1.6,range(.6,1.5),1.3,pick(['#94ae91','#99b3a0','#a4b9a0']),10);}
instances(clusterGeo,leafMat,bushes);instances(leafGeo,leafMat,leaves,staticRoot,false);
// A slightly uneven painted fence, its posts and rails are actual solids.
const fencePaint=['#e5dfbf','#ebe4c8','#e1dbb9'].map(c=>wood(c,.79));
for(const h of [.18,.46])boxAt(staticRoot,0,h,-3.87,16,.085,.075,fencePaint[0]);
for(let i=-35;i<=35;i++){
 const x=i*.218,z=-3.84+.036*Math.cos(i*.39),h=range(.61,.72),w=range(.162,.181);
 const sh=polygon([[-w/2,0],[w/2,0],[w/2,h-.075],[0,h],[-w/2,h-.075]]);
 const m=mesh(extrude(sh,.054,.008),pick(fencePaint),staticRoot,x,-.055,z);m.rotation.z=range(-.019,.019);
}
const stems=material('#74905a'),petalM=material('#fff1cd'),centerM=material('#e9b542'),flowerBits=[],flowerEyes=[],gardenLeaves=[];
const bloomClusters=[[-1.43,.26,15],[1.44,.52,18],[-1.53,-1.52,15],[1.73,-1.25,17],[-.95,1.26,11],[1.07,1.47,10],[-2.66,-.46,16],[2.5,-.18,14]];
if(narrow)bloomClusters.push([-.56,1.31,9],[.55,.62,8]);
for(const [cx,cz,count] of bloomClusters)for(let i=0;i<count;i++){
 const x=cx+range(-.28,.28),z=cz+range(-.19,.19),y=floor(x,z),h=range(.043,.128),r=range(.012,.031);
 if(i%3===0)rod(staticRoot,v(x,y,z),v(x+.01,y+h,z),.002,.0015,stems,4);
 for(let j=0;j<7;j++){const a=j*tau/7+i;flowerBits.push({x:x+Math.cos(a)*r*.68,y:y+h+.004,z:z+Math.sin(a)*r*.68,sx:r*.58,sy:r*.15,sz:r*.24,ry:-a,col:pick(['#fff8de','#f8eccb','#fffcef'])});}
 flowerEyes.push({x,y:y+h+.009,z,sx:r*.35,sy:r*.22,sz:r*.35});
 for(let j=0;j<3;j++)gardenLeaves.push({x:x+range(-.017,.017),y:y+h*.3,z:z+range(-.02,.02),sx:.025,sy:.007,sz:.012,ry:range(0,6),rz:range(-.7,.7),col:pick(leafPalette)});
}
instances(smallSphere,petalM,flowerBits,staticRoot,false);instances(smallSphere,centerM,flowerEyes,staticRoot,false);instances(leafGeo,leafMat,gardenLeaves,staticRoot,false);
// Garden line, turned wooden finials, linen pennants and their brass clips.
const postL=narrow?-1.05:-2.05,postR=narrow?1.08:2.06,lineZ=-2.56;
function clothes(u){return v(postL+(postR-postL)*u,1.385-.20*4*u*(1-u)+.017*u,lineZ-.026*4*u*(1-u));}
for(const x of [postL,postR]){
 rod(staticRoot,v(x,-.06,lineZ),v(x,1.44,lineZ),.041,.032,lightWood,20);
 oval(staticRoot,x,1.46,lineZ,.05,.047,.05,cutwood);rod(staticRoot,v(x,1.343,lineZ),v(x,1.371,lineZ),.039,.039,brass,20);
 for(let j=0;j<4;j++)rod(staticRoot,v(x,1.376+j*.008,lineZ),v(x,1.383+j*.008,lineZ),.038,.038,cord,16);
}
tube(Array.from({length:15},(_,i)=>clothes(i/14)),.006,cord);
const fabric=texture(64,64,(g,w,h)=>{g.fillStyle='#faf7ec';g.fillRect(0,0,w,h);for(let i=0;i<64;i+=2){g.fillStyle=i%4?'#e8e6da':'#efede3';g.fillRect(i,0,1,h);g.fillRect(0,i,w,1);}});
fabric.colorSpace=T.SRGBColorSpace;fabric.repeat.set(6,6);
const flagColors=['#d96c51','#ebbc65','#7b9e9b','#efdfb3','#d3896f','#698e9c','#e8c06b','#91aa83','#d97d66'];
const flagModels=[];
for(let i=0;i<9;i++){
 const u=.09+i*.096,anchor=clothes(u),width=(postR-postL)*.061,height=width*(narrow?1.45:1.16);
 const pos=[],uv=[],indices=[];
 for(let j=0;j<=3;j++){const f=j/3,half=width*.5*(1-.985*f);pos.push(-half,-f*height,0,half,-f*height,0);uv.push(0,1-f,1,1-f);if(j<3){let k=2*j;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const flag=mesh(geo,material(flagColors[i],{side:T.DoubleSide,map:fabric,roughness:.94}),scene,...anchor.toArray());flagModels.push({flag,height,width});
 boxAt(staticRoot,anchor.x,anchor.y+.003,anchor.z,width*1.04,.015,.013,wood('#cab58e'),.003);
}
const lathe=(points,seg=48)=>new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),seg);
const balloonGeo=lathe([[.001,-.164],[.013,-.149],[.024,-.125],[.051,-.096],[.088,-.06],[.115,-.012],[.123,.034],[.119,.074],[.104,.109],[.076,.135],[.043,.15],[.001,.156]],48);
function liveString(count,r,mat){
 const geo=new T.BufferGeometry(),p=new Float32Array(count*6*3),normal=new Float32Array(p.length),idx=[];
 for(let i=0;i<count;i++)for(let j=0;j<6;j++){if(i<count-1){const a=i*6+j,b=i*6+(j+1)%6;idx.push(a,b,a+6,b,b+6,a+6);}}
 geo.setIndex(idx);geo.setAttribute('position',new T.BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('normal',new T.BufferAttribute(normal,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(new Float32Array(count*6*2),2));
 const m=mesh(geo,mat,scene);m.frustumCulled=false;
 return {m,update(points){
  const pp=geo.attributes.position,nn=geo.attributes.normal;for(let i=0;i<count;i++){
   const dir=points[Math.min(count-1,i+1)].clone().sub(points[Math.max(i-1,0)]).normalize(),a=v().crossVectors(dir,Math.abs(dir.z)<.89?v(0,0,1):v(1,0,0)).normalize(),b=v().crossVectors(dir,a).normalize();
   for(let j=0;j<6;j++){const angle=j/6*tau,n=a.clone().multiplyScalar(Math.cos(angle)).addScaledVector(b,Math.sin(angle)),pt=points[i];pp.setXYZ(i*6+j,pt.x+r*n.x,pt.y+r*n.y,pt.z+r*n.z);nn.setXYZ(i*6+j,n.x,n.y,n.z);}
  }pp.needsUpdate=nn.needsUpdate=true;
 }};
}
const balloonModels=world.balloons.map((b,i)=>{
 const mat=new T.MeshPhysicalMaterial({color:['#e58a71','#eac36c','#8cbbb1'][i],roughness:.27,roughnessMap:rough,clearcoat:.38,clearcoatRoughness:.16,metalness:.035});
 const group=new T.Group();scene.add(group);mesh(balloonGeo,mat,group);const knot=mesh(new T.ConeGeometry(.014,.026,12),mat,group,0,-.162,0);
 knot.rotation.z=.16;const line=liveString(9,.0037,ivory),at=clothes((b.anchor.x-postL)/(postR-postL));
 tube([at,at.clone().lerp(b.anchor,.5).add(v(0,-.014,0)),b.anchor],.005,cord);
 oval(staticRoot,b.anchor.x,b.anchor.y,b.anchor.z,.012,.012,.012,brass,smallSphere);return {group,line};
});
// Broad porch boards run across the near edge. Edge grain and inset fasteners
// make the scale of the small playthings legible from the low camera.
const porchZ=narrow?2.43:1.57,porchY=narrow?.235:.182;
const plankM=['#ac7d52','#bb8b5c','#bf9065','#b88b62','#be9064'].map(c=>wood(c,.74));
plankM.forEach(m=>{m.map=grain.clone();m.map.rotation=Math.PI/2;m.map.center.set(.5,.5);m.map.repeat.set(1.5,2.7);m.map.needsUpdate=true;});
for(let i=0;i<16;i++){
 const z=porchZ+i*.235;boxAt(staticRoot,0,porchY-.056,z,9.4,.112,.229,plankM[i%5],.006);
 for(const x of [-1.32,-.68,.85,1.41]){const stud=mesh(new T.CylinderGeometry(.009,.008,.0025,12),brass,staticRoot,x,porchY+.001,z+.066);stud.castShadow=false;}
}
const edgeX=narrow?.113:.408,trayZ=narrow?2.66:1.88,trayWidth=narrow?.37:.71;
const trayMat=wood('#a97648'),trayTop=wood('#d6af77'),trayRail=wood('#e1bd88');
boxAt(staticRoot,edgeX,porchY+.037,trayZ,trayWidth,.072,.223,trayTop,.023);
for(const dz of [-.106,.106])boxAt(staticRoot,edgeX,porchY+.065,trayZ+dz,trayWidth+.016,.064,.026,trayRail,.009);
for(const dx of [-1,1])boxAt(staticRoot,edgeX+dx*trayWidth*.5,porchY+.067,trayZ,.026,.066,.21,trayMat,.009);
const ballMats=['#ce654e','#6c9cb0','#d9ad4b','#80a98e'].map(c=>material(c,{roughness:.46,map:grain}));
const ballTrim=material('#fff0cd',{roughness:.49}),ballPin=material('#d7b880',{roughness:.45});
const ballLayers=new Map();
function playBall(rad,c,parent){
 const group=new T.Group();parent.add(group);if(!ballLayers.has(rad)){
  const layers=[new T.SphereGeometry(rad,48,32)];
  for(const [from,len] of [[1.33,.052],[1.415,.235],[1.69,.038]])layers.push(new T.SphereGeometry(rad*1.004,48,8,0,tau,from,len));
  ballLayers.set(rad,layers);
 }
 const layers=ballLayers.get(rad);[ballMats[c%4],ballPin,ballTrim,ballTrim].forEach((mat,i)=>mesh(layers[i],mat,group));return group;
}
const reserves=[];for(let i=0;i<3;i++){
 const r=narrow?.052:.079+.002*i,o=playBall(r,[2,1,3][i],scene);o.position.set(edgeX+(i-1)*trayWidth*.276,porchY+.073+r,trayZ);
 o.rotation.set(.14+i*.43,.22+i,-.46+i*.46);reserves.push(o);
}
// Hand-carved fork. The shaft changes radius along the grain instead of using
// intersecting straight cylinders.
function branch(points,radii,mat){
 const curve=new T.CatmullRomCurve3(points),steps=32,sides=20,frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],ix=[];
 for(let i=0;i<=steps;i++){const f=i/steps,pt=curve.getPointAt(f),rf=f*(radii.length-1),k=Math.min(radii.length-2,Math.floor(rf)),r=radii[k]+(radii[k+1]-radii[k])*(rf-k);
  for(let j=0;j<=sides;j++){const a=j/sides*tau,bump=r*(1+.03*Math.sin(a*3+f*3));const pp=pt.clone().addScaledVector(frames.normals[i],Math.cos(a)*bump).addScaledVector(frames.binormals[i],Math.sin(a)*bump);p.push(...pp.toArray());uv.push(j/sides,f*2);
   if(i<steps&&j<sides){const n=i*(sides+1)+j;ix.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
 // Frenet rings use N x B = tangent. Reverse the winding to face the bark outward.
 for(let i=0;i<ix.length;i+=3){const t=ix[i];ix[i]=ix[i+1];ix[i+1]=t;}g.setIndex(ix);g.computeVertexNormals();return mesh(g,mat);
}
const slingWood=wood('#bf8956',.46),warmWood=wood('#c69461',.47),binding=material('#576f68',{roughness:.85,map:fabric}),leather=wood('#885c3f');
const fx=fork.x,fz=fork.z,joint=v(fx-.015,.382,fz+.065),handleBase=v(fx+.015,porchY-.045,fz+.17);
branch([handleBase,v(fx+.004,.25,fz+.14),joint,v(fx-.082,.467,fz+.035),v(fx-.157,.551,fz),v(fx-.178,.631,fz-.018)],[.059,.069,.077,.053,.046,.041],slingWood);
branch([joint.clone().add(v(-.01,-.025,.009)),v(fx+.038,.413,fz+.053),v(fx+.119,.49,fz+.022),v(fx+.164,.552,fz),v(fx+.176,.631,fz-.018)],[.074,.062,.052,.045,.041],warmWood);
const torus=(major,minor,mat,x,y,z,rot=0)=>{const o=mesh(new T.TorusGeometry(major,minor,9,36),mat,staticRoot,x,y,z);o.rotation.set(Math.PI/2,rot,0);return o;};
for(const side of [-1,1]){
 const x=fx+side*.176;
 oval(staticRoot,x,.633,fz-.018,.041,.022,.041,cutwood);
 for(let i=0;i<5;i++){const wrap=torus(.042,.0056,i===4?brass:binding,x-side*.0016*(4-i),.585+i*.009,fz-.014);wrap.rotation.y=-side*.1;}
}
for(let j=0;j<4;j++)torus(.062,.0052,leather,fx+.004,.235+j*.011,fz+.144-j*.004);
const peg=oval(staticRoot,fx-.015,.383,fz+.134,.014,.014,.006,brass);
const rubber=material('#a16d42',{roughness:.45}),strapModels=world.bands.map(()=>liveString(6,.0095,rubber));
const pouchGroup=new T.Group();scene.add(pouchGroup);oval(pouchGroup,0,-.017,.035,.099,.048,.039,leather);
for(const s of [-1,1])oval(pouchGroup,.065*s,-.007,.059,.009,.009,.004,brass);
const currentBall=playBall(R,0,scene),spentBalls=new Map();
const toyMats=colors.map(c=>wood(c,.54)),inlay=wood('#e9c794',.55);
function blockGeometry(s){
 const {w,h,d}=s,b=.008;
 if(s.shape==='cyl')return lathe([[0,-h/2],[w*.44,-h/2],[w*.5,-h/2+.01],[w*.5,h/2-.012],[w*.45,h/2],[0,h/2]],48);
 if(s.shape==='roof')return extrude(polygon([[-w/2+b,-h/2+b],[w/2-b,-h/2+b],[0,h/2-b]]),d,b);
 if(s.shape==='arch'){
  const left=-w/2+b,right=w/2-b,low=-h/2+b,high=h/2-b,r=w*.235,a=new T.Shape();
  a.moveTo(left,low);a.lineTo(-r,low);a.bezierCurveTo(-r,low+h*.72,r,low+h*.72,r,low);a.lineTo(right,low);a.lineTo(right,high);a.lineTo(left,high);a.closePath();return extrude(a,d,b);
 }
 if(s.shape==='window'){
  const a=polygon([[-w/2+b,-h/2+b],[w/2-b,-h/2+b],[w/2-b,h/2-b],[-w/2+b,h/2-b]]);
  const hole=new T.Path();hole.absarc(0,.007,.043,0,tau,true);a.holes.push(hole);return extrude(a,d,b);
 }return box(w,h,d,b);
}
const blockModels=plans.map(s=>{
 const g=new T.Group();scene.add(g);mesh(blockGeometry(s),toyMats[s.color],g);
 if(s.shape==='roof'){
  const r=s.w*.095;const badge=mesh(new T.CylinderGeometry(r,r*.98,.009,40),inlay,g,0,-s.h*.105,s.d*.5+.002);badge.rotation.x=Math.PI/2;
  const inset=mesh(new T.TorusGeometry(r*.76,.0026,7,36),toyMats[s.color],g,0,-s.h*.105,s.d*.5+.008);
  if(s.t===0){const hub=oval(g,0,-s.h*.105,s.d*.5+.009,r*.32,r*.32,.003,toyMats[1]);
   for(let i=0;i<8;i++){const a=i*tau/8;const ray=boxAt(g,Math.sin(a)*r*.53,Math.cos(a)*r*.53-s.h*.105,s.d*.5+.009,.0027,r*.17,.002,toyMats[1],.0004);ray.rotation.z=-a;}}
 }
 return g;
});
// Dew is a set of separate, reflective droplets on bent blades. Nearest drops
// go through the depth-of-field pass along with the rest of the garden.
const dewData=wetTips.map(t=>{const r=range(.0021,.0064);return {...t,sx:r*.85,sy:r,sz:r*.85};});
const dewMat=new T.MeshPhysicalMaterial({color:0xdcebe0,metalness:.23,roughness:.065,roughnessMap:rough,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:2.1});
const dews=instances(smallSphere,dewMat,dewData,scene,false),dewDummy=new T.Object3D();
const dustMat=material('#fff0c5',{roughness:.43,emissive:0xc8ad72,emissiveIntensity:.24});
const motes=world.motes.map((m,i)=>oval(scene,...m.p.toArray(),.0018+i%3*.0007,.002,.002,dustMat,smallSphere));
motes.forEach(m=>m.castShadow=false);
// The demonstration is a small ivory hand token floating beside the pouch.
const fingerShape=new T.Shape();fingerShape.moveTo(-.031,-.091);fingerShape.bezierCurveTo(-.054,-.071,-.092,-.022,-.091,-.006);fingerShape.bezierCurveTo(-.089,.008,-.074,.011,-.063,.001);fingerShape.lineTo(-.045,-.017);fingerShape.lineTo(-.045,.080);fingerShape.bezierCurveTo(-.045,.103,-.017,.105,-.016,.080);fingerShape.lineTo(-.016,.018);fingerShape.bezierCurveTo(-.013,.04,.012,.039,.014,.018);fingerShape.bezierCurveTo(.023,.037,.044,.026,.045,.010);fingerShape.bezierCurveTo(.057,.024,.076,.016,.076,-.006);fingerShape.lineTo(.072,-.055);fingerShape.quadraticCurveTo(.067,-.082,.051,-.093);fingerShape.closePath();
const handMat=material('#ffedc6',{roughness:.56,transparent:true,opacity:0,depthWrite:false});
const hand=mesh(extrude(fingerShape,.015,.004),handMat,scene);hand.castShadow=false;hand.receiveShadow=false;
const aimMat=material('#fff3cb',{roughness:.42,emissive:0xfbe3a2,emissiveIntensity:.45});
const aimDots=Array.from({length:22},()=>oval(scene,0,0,0,.011,.011,.011,aimMat,smallSphere));aimDots.forEach(o=>{o.castShadow=false;});
// Batch immutable craftwork by finish. Movable pieces keep their own matrices.
function bake(root){
 root.updateMatrixWorld(true);const sets=new Map();
 root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
  const key=o.material.uuid+o.castShadow+o.receiveShadow;if(!sets.has(key))sets.set(key,{list:[],mat:o.material,cast:o.castShadow,receive:o.receiveShadow});sets.get(key).list.push(o);
 });
 for(const {list,mat,cast,receive} of sets.values()){
  if(list.length<2)continue;const pp=[],nn=[],uv=[];
  list.forEach(o=>{
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
   const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
   for(let i=0;i<p.count;i++){pp.push(p.getX(i),p.getY(i),p.getZ(i));nn.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(u?u.getX(i):0,u?u.getY(i):0);}
   g.dispose();o.removeFromParent();
  });
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('normal',new T.Float32BufferAttribute(nn,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const m=mesh(g,mat,root);m.castShadow=cast;m.receiveShadow=receive;
 }
}
bake(staticRoot);
const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const finish=new T.ShaderMaterial({
 uniforms:{frame:{value:target.texture},depths:{value:target.depthTexture},pixel:{value:new T.Vector2()},focus:{value:3.6},eye:{value:new T.Vector3()},nearP:{value:camera.near},farP:{value:camera.far}},
 vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`
 uniform vec3 eye;uniform sampler2D frame,depths;uniform vec2 pixel;uniform float focus,nearP,farP;varying vec2 coord;
 float distanceAt(vec2 uv){float d=texture2D(depths,uv).r;return nearP*farP/(farP-d*(farP-nearP));}
 void main(){
 vec2 uv=coord;float z=distanceAt(uv);
 float height=eye.x+z*(eye.y+eye.z*(uv.y*2.-1.)*.34433);
 float foreground=(1.-smoothstep(.12,.24,height))*clamp((focus*.74-z)*3.4,0.,2.5);
 float blur=clamp((z-focus-1.3)*.64,0.,3.4)+foreground;
 vec3 src=texture2D(frame,uv).rgb,col=src*2.,bloom=vec3(0.);float total=2.;
 for(int i=0;i<12;i++){float a=float(i)*2.399963,rr=sqrt((float(i)+.5)/12.);
 vec2 dir=vec2(cos(a),sin(a));vec2 sampleUv=uv+dir*rr*blur*pixel;
 float amount=smoothstep(.5,1.,distanceAt(sampleUv)/max(.01,z));vec3 s=texture2D(frame,sampleUv).rgb;col+=s*amount;total+=amount;
 vec3 br=texture2D(frame,uv+dir*pixel*(2.+rr*4.)).rgb;bloom+=max(br-vec3(1.20),vec3(0.));}
 col=col/total+bloom*.0023;
 vec2 edge=(uv-.5)*1.45;col*=1.-.12*pow(dot(edge,edge),1.35);
 col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.0036;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`
});
postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
function resize(){
 const w=innerWidth,h=innerHeight,a=w/h,ratio=Math.min(devicePixelRatio||1,1.6,Math.sqrt(1950000/(w*h)));
 renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);target.setSize(Math.round(w*ratio),Math.round(h*ratio));
 finish.uniforms.pixel.value.set(1/(w),1/(h));camera.aspect=a;
 // Landscape frame includes the veranda lip. A long portrait frame places the
 // line further behind the keep and the fork close to the viewer.
 const isPortrait=a<.83,cz=isPortrait?(narrow?Math.max(4.56,2.11/a):Math.max(5.2,3.5/a)):(narrow?4.05:3.47);
 const cy=isPortrait?1.06:.87;camera.position.set(0,cy,cz);camera.lookAt(0,isPortrait?.535:.54,-.30);
 finish.uniforms.focus.value=cz+.31;camera.updateProjectionMatrix();camera.updateMatrixWorld();finish.uniforms.eye.value.set(cy,camera.getWorldDirection(v()).y,camera.matrixWorld.elements[5]);
}
addEventListener('resize',resize);resize();
const hitPoint=new T.Vector3(),screen=new T.Vector2();
function project(p){hitPoint.copy(p).project(camera);return new T.Vector2((hitPoint.x+1)*innerWidth*.5,(1-hitPoint.y)*innerHeight*.5);}
function shotDisplay(){
 aimDots.forEach((o,i)=>{
  const point=world.preview[i];o.visible=!!point;
  if(point){o.position.copy(point);o.scale.setScalar(.0128-i*.00019);}
 });
}
let lastStageKey='',lastRound=-1,ballColor=0;
function sync(){
 world.cells.forEach((c,i)=>windUniform.value[i]=c.bend);
 const sink=world.restore*world.restore*(3-2*world.restore)*1.55;
 blockModels.forEach((o,i)=>{const b=world.blocks[i];o.position.copy(b.p);o.position.y-=sink;o.quaternion.copy(b.q);});
 flagModels.forEach(({flag,height,width},i)=>{
  const p=flag.geometry.attributes.position,chain=world.flags[i];let yy=0,zz=0;
  for(let j=0;j<=3;j++){
   if(j){const a=chain[j-1].a;yy-=Math.cos(a)*height/3;zz+=Math.sin(a)*height/3;}
   for(let k=0;k<2;k++){
    const side=k?1:-1,h=width*.5*(1-.985*j/3),fold=(j?chain[j-1].a:0)*side*.019;
    p.setXYZ(j*2+k,side*h+.022*zz,yy+side*h*.07,zz+fold);
   }
  }p.needsUpdate=true;flag.geometry.computeVertexNormals();
 });
 world.balloons.forEach((b,i)=>{
  const {group,line}=balloonModels[i];group.position.copy(b.p);group.rotation.z=-b.v.x*.15;const foot=b.p.clone().add(v(0,-.163,0));
  const bottom=b.free?foot.clone().add(v(-b.v.x*.25,-b.length+.16,-b.v.z*.19)):b.anchor;
  const pts=Array.from({length:9},(_,j)=>{const u=j/8;return bottom.clone().lerp(foot,u).add(v((world.cells[i+5].bend*.17+.019)*4*u*(1-u),-.024*4*u*(1-u),.008*Math.sin(Math.PI*u)));});line.update(pts);
 });
 world.bands.forEach((s,i)=>strapModels[i].update(s.map(n=>n.p)));
 const pouch=world.pouch();pouchGroup.position.copy(pouch);
 if(lastRound!==world.round){for(const o of spentBalls.values())o.removeFromParent();spentBalls.clear();lastRound=world.round;}
 const b=world.flight;currentBall.visible=!!b||world.mode==='ready'||world.mode==='reload';currentBall.position.copy(b?b.p:world.mode==='reload'?world.loaded:pouch);currentBall.position.y-=sink;
 if(b)currentBall.quaternion.copy(b.q);else currentBall.rotation.set(.14,0,-.33);
 const newColor=(Math.max(0,world.stage))%4;if(ballColor!==newColor){ballColor=newColor;currentBall.children[0].material=ballMats[ballColor];}
 for(const s of world.oldBalls){
  let o=spentBalls.get(s.id);if(!o){o=playBall(R,(s.id-1)%3,scene);spentBalls.set(s.id,o);}
  o.position.copy(s.p);o.position.y-=sink;o.quaternion.copy(s.q);
 }
 world.motes.forEach((m,i)=>motes[i].position.copy(m.p));
 for(let i=0;i<dewData.length;i++){
  const d=dewData[i],c=world.cells[d.cell];dewDummy.position.set(d.x+c.bend*d.h,d.y-c.drop*.018,d.z);dewDummy.scale.set(d.sx*(.78+c.wet*.31),d.sy*(.72+c.wet*.36),d.sz);dewDummy.updateMatrix();dews.setMatrixAt(i,dewDummy.matrix);
 }dews.instanceMatrix.needsUpdate=true;
 const g=world.guide;hand.visible=g.alpha>.008;handMat.opacity=g.alpha*.86;
 if(hand.visible){hand.position.copy(fork).add(v(.069,-.065,.078)).addScaledVector(world.direction(),-g.p*.27);hand.position.y-=g.p*.10;hand.rotation.set(-.15,.08,.25+g.p*.12);}
 shotDisplay();
 const stageKey=world.mode==='reward'||world.mode==='reset'?'reward':String(world.stage);
 if(lastStageKey!==stageKey){document.querySelectorAll('#journey i').forEach((e,i)=>e.className=stageKey==='reward'||i<world.stage?'done':i===world.stage?'current':'');lastStageKey=stageKey;}
}
let audio,mute=false;
function enableAudio(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();}catch(_){return;}}if(audio.state==='suspended')audio.resume().catch(()=>{});}
function note(freq,span,type='sine',volume=.06,delay=0,end=freq){
 if(!audio||mute)return;const now=audio.currentTime+delay,osc=audio.createOscillator(),amp=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),now+span);amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(volume,now+.008);amp.gain.exponentialRampToValueAtTime(.0001,now+span);osc.connect(amp).connect(audio.destination);osc.start(now);osc.stop(now+span+.01);osc.onended=()=>{osc.disconnect();amp.disconnect();};
}
function sounds(){for(const e of world.events.splice(0)){
 if(e.type==='grab')note(360,.07,'sine',.035);
 if(e.type==='launch')note(185+e.value*13,.19,'triangle',.069,0,74);
 if(e.type==='wood'){note(315,.127,'triangle',.078,0,108);note(524,.11,'sine',.045,.07,220);}
 if(e.type==='rise'){note(523,.27);note(784,.38,'sine',.041,.14);}
 if(e.type==='reward')for(let i=0;i<4;i++)note([523,659,784,1046][i],.63,'sine',.042,i*.135);
 if(e.type==='balloon')note([659,784,988][e.value],.75,'sine',.045);
}}
function speaker(){
 const ctx=document.querySelector('#sound canvas').getContext('2d');ctx.clearRect(0,0,64,64);ctx.fillStyle=ctx.strokeStyle='#586451';ctx.lineWidth=4.4;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(10,25);ctx.lineTo(20,25);ctx.lineTo(32,15);ctx.lineTo(32,49);ctx.lineTo(20,39);ctx.lineTo(10,39);ctx.closePath();ctx.fill();
 if(mute){ctx.beginPath();ctx.moveTo(42,25);ctx.lineTo(54,39);ctx.moveTo(54,25);ctx.lineTo(42,39);ctx.stroke();}
 else for(const r of [12,20]){ctx.beginPath();ctx.arc(32,32,r,-.78,.78);ctx.stroke();}
}
document.querySelector('#sound').addEventListener('click',e=>{enableAudio();mute=!mute;e.currentTarget.setAttribute('aria-pressed',String(!mute));speaker();if(!mute)note(660,.2);});speaker();
let pointer=null,start=new T.Vector2(),lastTension=0,dragPixels=100;
function canGrab(x,y){
 if(world.mode!=='ready')return false;const pos=new T.Vector2(x,y),mid=project(fork),left=project(fork.clone().add(v(-.176,.052,0))),right=project(fork.clone().add(v(.176,.052,0)));
 function distance(a,b){const ab=b.clone().sub(a),u=T.MathUtils.clamp(pos.clone().sub(a).dot(ab)/Math.max(1,ab.lengthSq()),0,1);return pos.distanceTo(a.clone().addScaledVector(ab,u));}
 const r=Math.max(23,project(fork.clone().add(v(R,0,0))).distanceTo(mid)*1.35);
 return distance(left,mid)<r||distance(right,mid)<r;
}
canvas.addEventListener('pointerdown',e=>{
 if(pointer!==null||!canGrab(e.clientX,e.clientY)||!world.grab())return;
 enableAudio();pointer=e.pointerId;start.set(e.clientX,e.clientY);canvas.setPointerCapture(pointer);dragPixels=Math.max(54,Math.min(116,innerHeight*.145,innerHeight-e.clientY-12));canvas.style.cursor='grabbing';lastTension=0;e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
 if(pointer!==e.pointerId){if(pointer===null&&e.pointerType==='mouse')canvas.style.cursor=canGrab(e.clientX,e.clientY)?'grab':'default';return;}
 const dx=e.clientX-start.x,dy=e.clientY-start.y,dist=Math.hypot(dx*.78,dy);world.drag(Math.min(1,dist/dragPixels)*.3,-dx/dragPixels);
 const notch=Math.floor(world.pull/.06);if(notch>lastTension){note(160+70*notch,.07,'sine',.013);lastTension=notch;}
});
function endPointer(e,cancel){if(pointer!==e.pointerId)return;pointer=null;cancel?world.cancel():world.release();canvas.style.cursor='default';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
canvas.addEventListener('pointerup',e=>endPointer(e,false));canvas.addEventListener('pointercancel',e=>endPointer(e,true));canvas.addEventListener('lostpointercapture',e=>endPointer(e,true));
window.__GAME__={step:dt=>world.step(dt),getState:()=>world.getState()};
let last=performance.now();function frame(now){const dt=Math.min(.055,Math.max(0,(now-last)/1000));last=now;world.step(dt);sync();sounds();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden&&pointer!==null)endPointer({pointerId:pointer},true);});
sync();requestAnimationFrame(frame);
})();
