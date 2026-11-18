/* Procedural highland. All landscape and prop surfaces have real geometry. */
'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), C=c=>new T.Color(c);
const tau=Math.PI*2, sat=x=>Math.max(0,Math.min(1,x)), mix=(a,b,u)=>a+(b-a)*u;
const smooth=(a,b,x)=>{const u=sat((x-a)/(b-a));return u*u*(3-2*u);};
const rng=AlpineFlight.random(73241), rr=(a,b)=>mix(a,b,rng());
function hash(x,z){let n=Math.imul(x^7823,374761393)+Math.imul(z^371,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function noise(x,z){const i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);}
const fb=(x,z)=>noise(x,z)*.54+noise(x*2.1,z*2.1)*.27+noise(x*4.3,z*4.3)*.13+noise(x*8.7,z*8.7)*.06;
const texSize=128,grainData=new Uint8Array(texSize*texSize*4);
for(let i=0;i<texSize*texSize;i++){const v=209+Math.floor(rng()*40);grainData.set([v,v,v,255],i*4);}
const roughTex=new T.DataTexture(grainData,texSize,texSize);roughTex.wrapS=roughTex.wrapT=T.RepeatWrapping;roughTex.magFilter=T.LinearFilter;roughTex.minFilter=T.LinearMipmapLinearFilter;roughTex.generateMipmaps=true;roughTex.needsUpdate=true;
function mat(color,roughness=.78,metalness=0,more={}){return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:roughTex,...more});}
const scene=new T.Scene(), group=(p=scene)=>{const g=new T.Group();p.add(g);return g;};
function mesh(p,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
const unitBox=new T.BoxGeometry(),sphere=new T.SphereGeometry(1,20,14),littleSphere=new T.IcosahedronGeometry(1,1);
function box(p,m,x,y,z,w,h,d){const o=mesh(p,unitBox,m,x,y,z);o.scale.set(w,h,d);return o;}
function ell(p,m,x,y,z,a,b,c,geo=sphere){const o=mesh(p,geo,m,x,y,z);o.scale.set(a,b,c);return o;}
const cylCache=new Map();
function cyl(p,m,a,b,r1,r2=r1,sides=12){
  const ratio=r1/r2,key=ratio.toFixed(4)+'/'+sides;
  if(!cylCache.has(key))cylCache.set(key,new T.CylinderGeometry(ratio,1,1,sides));
  const delta=V().subVectors(b,a),o=mesh(p,cylCache.get(key),m);o.position.copy(a).addScaledVector(delta,.5);o.quaternion.setFromUnitVectors(V(0,1,0),delta.clone().normalize());o.scale.set(r2,delta.length(),r2);return o;
}
function beam(p,m,a,b,w,d=w){const v=V().subVectors(b,a),o=box(p,m,0,0,0,w,v.length(),d);o.position.copy(a).addScaledVector(v,.5);o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;}
function tube(p,m,points,r,sides=8){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(8,points.length*4),r,sides,false),m);}
function geom(pos,indices,colors,uv){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));if(indices)g.setIndex(indices);if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));else{const coords=[];for(let i=0;i<pos.length;i+=3)coords.push(pos[i]*.83+pos[i+2]*.24,pos[i+1]+pos[i+2]*.53);g.setAttribute('uv',new T.Float32BufferAttribute(coords,2));}g.computeVertexNormals();return g;}
// Collapse rigid fittings sharing material into one draw, preserving their PBR properties.
function batch(root){
  root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),sets=new Map(),q=new T.Matrix4();
  root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)){const a=sets.get(o.material)||[];a.push(o);sets.set(o.material,a);}});
  for(const [m,items] of sets){if(items.length<2)continue;
    const pos=[],nor=[],uv=[],col=[];let usesColor=false;
    for(const o of items){q.multiplyMatrices(inv,o.matrixWorld);const normal=new T.Matrix3().getNormalMatrix(q),g=o.geometry,A=g.attributes,idx=g.index,p=V(),n=V();
      for(let i=0,count=idx?idx.count:A.position.count;i<count;i++){const j=idx?idx.getX(i):i;p.fromBufferAttribute(A.position,j).applyMatrix4(q);pos.push(p.x,p.y,p.z);n.fromBufferAttribute(A.normal,j).applyNormalMatrix3(normal);nor.push(n.x,n.y,n.z);uv.push(A.uv?A.uv.getX(j):0,A.uv?A.uv.getY(j):0);if(A.color){col.push(A.color.getX(j),A.color.getY(j),A.color.getZ(j));usesColor=true;}else col.push(1,1,1);}
      o.removeFromParent();
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(usesColor)g.setAttribute('color',new T.Float32BufferAttribute(col,3));mesh(root,g,m);
  }
}
function sky(renderer){
  const w=768,h=384,px=new Uint8Array(w*h*4),sun=V(-.53,.72,.52).normalize();
  for(let y=0;y<h;y++){const lat=(y/(h-1)-.5)*Math.PI,dy=Math.sin(lat),r=Math.cos(lat);
    for(let x=0;x<w;x++){const lon=(x/w-.5)*tau,dx=r*Math.cos(lon),dz=r*Math.sin(lon),i=(y*w+x)*4;
      const k=Math.pow(sat(dy*3.1),.58),n=fb(dx*9/(dy+.46||1)+3,dz*13/(dy+.46||1)+7);
      const cloud=smooth(.56,.78,n)*smooth(.025,.14,dy)*(.73-.27*k);
      const glow=Math.pow(Math.max(0,dx*sun.x+dy*sun.y+dz*sun.z),42), disk=Math.pow(Math.max(0,dx*sun.x+dy*sun.y+dz*sun.z),1000);
      let c=dy>=0?[mix(213,83,k),mix(230,154,k),mix(231,202,k)]:[105,127,90];
      for(let j=0;j<3;j++)px[i+j]=Math.min(255,mix(c[j],[255,250,235][j],cloud)+glow*(25-j*4)+disk*90);px[i+3]=255;
    }}
  const t=new T.DataTexture(px,w,h,T.RGBAFormat);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;t.magFilter=t.minFilter=T.LinearFilter;t.needsUpdate=true;
  scene.background=t; const gen=new T.PMREMGenerator(renderer);scene.environment=gen.fromEquirectangular(t).texture;scene.environmentIntensity=.58;gen.dispose();
  scene.fog=new T.FogExp2(0xc0d4d1,.0093);
  scene.add(new T.HemisphereLight(0xe2f2ff,0xa2a580,1.39));
  const key=new T.DirectionalLight(0xffefcd,3.05);key.position.set(-20,33,17);key.target.position.set(0,1,0);scene.add(key,key.target);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:1,far:80});key.shadow.camera.updateProjectionMatrix();key.shadow.normalBias=.023;key.shadow.bias=-.00032;key.shadow.radius=3;
}
function streamX(z){return -14+Math.sin(z*.092+.3)*3.3+Math.max(0,-z-15)*.265+Math.sin(z*.20)*1.35;}
function landY(x,z){
  const base=fb(x*.083,z*.083),valley=smooth(-8,-32,z),edge=smooth(9,22,Math.abs(x+1));
  const bank=Math.abs(x-streamX(z)),bed=1-smooth(1.22,4.25,bank);
  const level=(base-.42)*(1.6+3.5*edge)+.38*Math.sin(x*.29+z*.13)+.18;
  const flat=1-smooth(0,1,Math.max((Math.abs(x)-8.8)/3,(-12-z)/4,(z-6.8)/3));
  return mix(level*(1-flat)-valley*(5.9+base*4)+edge*1.25,-2.52-valley*6.4,bed);
}
const groundPalette=[C('#788f50'),C('#95a85f'),C('#b0b86e'),C('#d4c394')],tmpC=new T.Color();
function field(map){
  const pos=[],ind=[],colors=[],nx=170,nz=149,sx=112,sz=98;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const x=-sx/2+i/nx*sx,z=-78+j/nz*sz,y=landY(x,z),n=fb(x*.21,z*.21)*.75+noise(x*.76,z*.76)*.25;
    const pathX=mix(map.boxes[0].x+1,map.cx+1,sat((3-z)/9))+Math.sin(z*.48)*.58;
    const path=(1-smooth(.32,1.38+noise(x,z)*.4,Math.abs(x-pathX)))*smooth(-9,-6,z)*(1-smooth(4,7,z));
    const landing=1-smooth(1.3,3.4,Math.hypot(x-map.boxes[0].x,(z-3.7)*1.26));
    tmpC.copy(groundPalette[0]).lerp(groundPalette[1],sat(n*1.7)).lerp(groundPalette[2],smooth(.47,.73,n)*.85).lerp(groundPalette[3],Math.max(path*.68,landing*.89));
    tmpC.multiplyScalar(.88+.21*n);pos.push(x,y,z);colors.push(tmpC.r,tmpC.g,tmpC.b);
    if(i<nx&&j<nz){const a=j*(nx+1)+i;ind.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
  }
  const g=mesh(scene,geom(pos,ind,colors),mat(0xffffff,.96,0,{vertexColors:true}));g.castShadow=false;
}
function mountains(){
  const peaks=[
    {z:-111,b:-15,base:18,c:'#889fa3',rock:'#a9b4b1',points:[[-110,24],[-71,39],[-53,26],[-30,41],[-8,30],[14,44],[41,36],[67,43],[93,27]]},
    {z:-77,b:-14,base:10,c:'#627d79',rock:'#8c9990',points:[[-72,21],[-51,17],[-33,28],[-22,17],[-10,11],[0,13],[15,23],[27,28],[46,19],[64,24]]},
    {z:-48,b:-14,base:1,c:'#697f63',rock:'#94a87a',points:[[-65,19],[-51,14],[-40,19],[-22,10],[-6,0],[9,2],[29,14],[43,20],[59,15]]}
  ];
  for(let layer=0;layer<peaks.length;layer++){
    const l=peaks[layer],pos=[],ind=[],colors=[],nx=225,ny=35,rock=C(l.rock),base=C(l.c),snow=C('#edf1e9');const ridge=x=>{
      let height=l.base-10;for(const [px,py] of l.points){height=Math.max(height,py-Math.abs(x-px)*(.66+hash(px,layer)*.55));}
      return height+(fb(x*.24,layer*5)-.49)*(layer===0?6:4)+(noise(x*1.8,layer)-.5)*1.1;};
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const x=(i/nx-.5)*228,u=j/ny,n=fb(x*.115,u*8+layer*40),crest=ridge(x),fold=Math.sin(x*.35+n*3.1)*2.1+n*4;
      const z=l.z+(1-u)*(layer===0?29:21)+fold+Math.sin(x*.13)*1.6,y=mix(l.b,crest,u)+(n-.5)*5*Math.sin(u*Math.PI);
      const stone=noise(x*.46+u*5,u*13);tmpC.copy(base).lerp(rock,n*.9+stone*.13);
      if(layer<2){const threshold=layer===0?23.5:23;const cover=smooth(threshold,threshold+1.35,y+(stone-.48)*7+Math.sin(x*.65+u*8)*1.8);tmpC.lerp(snow,cover*.98);}
      tmpC.multiplyScalar(.85+stone*.23);pos.push(x,y-[10,7,3][layer],z);colors.push(tmpC.r,tmpC.g,tmpC.b);
      if(i<nx&&j<ny){const a=j*(nx+1)+i;ind.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}
    }
    const ridgeMesh=mesh(scene,geom(pos,ind,colors),mat(0xffffff,.98,0,{vertexColors:true,side:T.DoubleSide}));ridgeMesh.castShadow=false;
  }
}
function instance(p,geo,m,entries,shadows=true){
  const o=new T.InstancedMesh(geo,m,entries.length),dummy=new T.Object3D();
  entries.forEach((e,i)=>{dummy.position.fromArray(e.p);dummy.rotation.set(...(e.r||[0,0,0]));dummy.scale.fromArray(e.s||[1,1,1]);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);if(e.c)o.setColorAt(i,C(e.c));});p.add(o);o.castShadow=shadows;o.receiveShadow=true;return o;
}
function forest(map){
  const bark=mat('#64523a'),needles=mat('#ffffff',.98,0,{vertexColors:true});
  const pos=[],idx=[],cols=[];const tiers=8,branches=12;
  for(let j=0;j<tiers;j++){
    const y=.095+j*.106,rad=.227*(1-j/(tiers+.2)),rot=j*1.73;
    for(let i=0;i<branches;i++){
      const a=i/branches*tau+rot,b=(i+1)/branches*tau+rot,r=rad*(.8+.29*hash(i,j)),o=pos.length/3;
      pos.push(Math.cos(a)*r,y+hash(i,j+3)*.046,Math.sin(a)*r,Math.cos((a+b)/2)*r*.64,y+.064,Math.sin((a+b)/2)*r*.64,Math.cos(b)*r,y+.025,Math.sin(b)*r,0,Math.min(1,y+.30-j*.012),0);
      idx.push(o,o+3,o+1,o+1,o+3,o+2,o,o+1,o+2);const v=.65+.3*hash(i+4,j);cols.push(v*.76,v*.81,v*.76,v,v,v,v*.62,v*.68,v*.64,1,1,1);
    }
  }
  const leaves=[],trunks=[],greens=['#385e4c','#476e56','#5c795b','#4e715b','#57745c','#6d8865'];
  for(let i=0;i<1900;i++){
    const x=rr(-54,55),z=rr(-66,16),y=landY(x,z);
    if(Math.abs(x-streamX(z))<2.7||Math.abs(x)<11.3&&z>-15||z>-14&&Math.abs(x)<14||z>7&&Math.abs(x)<20)continue;
    if(noise(x*.14,z*.13)<.31)continue;
    const h=rr(1.55,4.7)*(z<-23?.80:1.1);leaves.push({p:[x,y,z],r:[rr(-.035,.035),rr(0,6),0],s:[h,h,h],c:greens[Math.floor(rng()*greens.length)]});trunks.push({p:[x,y+h*.25,z],s:[h*.031,h*.52,h*.031]});
  }
  instance(scene,geom(pos,idx,cols),needles,leaves,false);instance(scene,new T.CylinderGeometry(.69,1,1,6),bark,trunks,false);
}
function river(){
  const pos=[],ind=[],colors=[],rows=154,n=6;
  for(let i=0;i<=rows;i++)for(let j=0;j<=n;j++){
    const z=19-i*.60,x=streamX(z)+(j/n-.5)*(3.4+noise(z*.3,3)*.5),y=-2.13-smooth(-8,-32,z)*6.4;
    pos.push(x,y,z);tmpC.copy(C('#528f88')).lerp(C('#93b7a6'),Math.abs(j/n-.5)*1.35+noise(x,z)*.15);colors.push(tmpC.r,tmpC.g,tmpC.b);
    if(i<rows&&j<n){const a=i*(n+1)+j;ind.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}
  }
  const g=geom(pos,ind,colors),base=new Float32Array(g.attributes.position.array);
  const water=mesh(scene,g,mat('#ffffff',.19,.33,{vertexColors:true,side:T.DoubleSide}));water.castShadow=false;
  return S=>{const a=g.attributes.position;for(let i=0;i<a.count;i++){const cell=S.breeze[(Math.floor(i/21)+i%7)%18];a.setY(i,base[i*3+1]+cell.wave*.32);}a.needsUpdate=true;g.computeVertexNormals();};
}
function meadow(map){
  const beds=Array.from({length:18},()=>[]),flowers=[],stalks=[],hearts=[],lupines=[],rocks=[];
  const shade=['#8c9e58','#98a868','#abac68','#b4b574','#738c4f','#a5b071'];
  for(let i=0;i<36000;i++){
    const x=rr(-29,29),z=rr(-34,19),y=landY(x,z);
    if(Math.abs(x-streamX(z))<2.1||Math.abs(x-map.cx)<3.25&&Math.abs(z-map.cz)<4.55)continue;
    const clearing=Math.hypot((x-map.boxes[0].x)*.78,(z-3.7)*1.17);
    const pathX=mix(map.boxes[0].x+1,map.cx+1,sat((3-z)/9))+Math.sin(z*.48)*.58;
    if((clearing<2.45||Math.abs(pathX-x)<.72&&z<4&&z>-7)&&rng()<.98)continue;
    const b=Math.min(2,Math.max(0,Math.floor((z+10)/7)))*6+Math.min(5,Math.max(0,Math.floor((x+12)/4)));
    const h=rr(.13,.48)*( .78+noise(x*.42,z*.44)*.6),c=shade[Math.floor(rng()*shade.length)];
    beds[b].push({p:[x,y-.035,z],s:[rr(.7,1.25),h,rr(.7,1.3)],r:[rr(-.1,.1),rr(0,6),rr(-.15,.15)],c});
    if(z>=-14 && (hash(Math.floor(x*1.2),Math.floor(z*1.2))>.63) && rng()<.2 && clearing>2.5){
      const tall=rr(.22,.58),choice=noise(x*.42+3,z*.48);
      stalks.push({p:[x,y+tall*.46,z],s:[.012,tall,.012],r:[0,0,.065]});
      if(choice<.39){for(let k=0;k<4;k++){const r=.08-.013*k;lupines.push({p:[x-.018,y+tall+k*.061,z],s:[r,.085,r],c:k%2?'#b6a8c3':'#938fa9'});}}
      else {const scale=rr(.068,.106),rot=rr(0,tau);for(let k=0;k<6;k++){const a=k*tau/6+rot;flowers.push({p:[x+Math.cos(a)*scale*.66,y+tall,z+Math.sin(a)*scale*.66],r:[0,-a,.18],s:[scale*.64,.018,scale*.32],c:choice>.63?'#edbb56':'#f7efd3'});}
        hearts.push({p:[x,y+tall+.018,z],s:[scale*.34,.032,scale*.34]});}
    }
  }
  const gp=[],gi=[],gc=[];for(let i=0;i<6;i++){const a=i*2.4,r=rr(.025,.12),x=Math.cos(a)*r,z=Math.sin(a)*r,w=rr(.013,.026),ht=rr(.48,1.05),o=gp.length/3;
    gp.push(x-w,0,z,x+w,0,z,x+w*.6+.035,ht*.58,z+.025,x-w*.6+.035,ht*.58,z+.025,x+.085,ht,z+.075);gi.push(o,o+1,o+2,o,o+2,o+3,o+3,o+2,o+4);gc.push(.52,.60,.48,.52,.60,.48,.92,.96,.89,.92,.96,.89,1,1,.96);}
  const blades=geom(gp,gi,gc),windUniforms=[];
  beds.forEach((entries,i)=>{const m=mat(0xffffff,.95,0,{side:T.DoubleSide,vertexColors:true}),u={value:0};windUniforms.push(u);
    m.onBeforeCompile=sh=>{sh.uniforms.bend=u;sh.vertexShader='uniform float bend;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=bend*position.y*position.y*.65;');};instance(scene,blades,m,entries,false);});
  instance(scene,littleSphere,mat(0xffffff),flowers,false);instance(scene,littleSphere,mat('#e4a633'),hearts,false);instance(scene,littleSphere,mat(0xffffff),lupines,false);instance(scene,new T.CylinderGeometry(.6,1,1,4),mat('#6e824a'),stalks,false);
  for(let i=0;i<780;i++){const z=rr(-53,17),bank=i%3!==0,x=bank?streamX(z)+(rng()<.5?-1:1)*rr(1.15,3.3):rr(-34,35);if(Math.abs(x)<9&&z>-13&&z<7 || Math.abs(x)<5.5&&z>7)continue;
    const size=rr(.18,1.15)*(bank?.8:1);rocks.push({p:[x,landY(x,z)-.10,z],s:[size*1.5,size*.73,size],r:[rr(-.3,.3),rr(0,6),rr(-.26,.26)],c:rng()<.5?'#9c9d85':'#888e7d'});}
  instance(scene,new T.IcosahedronGeometry(1,0),mat(0xffffff,.89),rocks,true);
  return S=>windUniforms.forEach((u,i)=>u.value=S.breeze[i].stem);
}
