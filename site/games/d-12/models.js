'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), PI=Math.PI, TAU=2*PI;
const rng=WashPhysics.random(29461), geoCache=new Map();
function cache(key,f){if(!geoCache.has(key))geoCache.set(key,f());return geoCache.get(key);}
function group(parent,x=0,y=0,z=0){const g=new T.Group();if(parent)parent.add(g);g.position.set(x,y,z);return g;}
function noiseMap(){
 const n=128,a=new Uint8Array(n*n*4);
 for(let i=0;i<n*n;i++){const q=224+rng()*31;a.set([q,q,q,255],i*4);}
 const t=new T.DataTexture(a,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
}
const roughNoise=noiseMap();
function mat(color,r=.45,m=.04,extra={}){return new T.MeshStandardMaterial({color,roughness:r,metalness:m,roughnessMap:roughNoise,...extra});}
const M={ivory:mat(0xeaece0,.31,.27),white:mat(0xf5f2e4,.22,.36),mint:mat(0x95c9c1,.37,.35),teal:mat(0x477d86,.35,.49),blue:mat(0x42778a,.31,.52),deep:mat(0x274755,.41,.47),chrome:mat(0xc4d6d8,.18,.89),steel:mat(0x84999f,.30,.8),rubber:mat(0x28373c,.77,.035),tire:mat(0x263035,.82,0),black:mat(0x17262b,.5,.13),amber:mat(0xf6bd62,.26,.31),lit:mat(0xffeed0,.22,.16,{emissive:0xffe2a0,emissiveIntensity:.65}),glass:mat(0x5d8992,.12,.57),red:mat(0xc06548,.29,.36)};
function mesh(g,m,p,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function geometry(pos,idx,uv,normals){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
 if(normals)g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));else g.computeVertexNormals();return g;
}
// Round each prism edge around a true quarter cylinder. Flat panels keep their planar normals.
function rounded(w,h,d,r){
 return cache([w,h,d,r].join('/'),()=>{
  const p=[],n=[],uv=[],ix=[],half=[w/2,h/2,d/2];r=Math.min(...half,r);
  const axisPoints=a=>[-a,-a+r*.13,-a+r*.42,-a+r*.74,-a+r,a-r,a-r*.74,a-r*.42,a-r*.13,a];
  for(let k=0;k<3;k++)for(const sign of [-1,1]){
   const a=(k+1)%3,b=(k+2)%3,A=axisPoints(half[a]),B=axisPoints(half[b]),base=p.length/3;
   for(let j=0;j<B.length;j++)for(let i=0;i<A.length;i++){
    const v=[0,0,0];v[k]=half[k]*sign;v[a]=A[i];v[b]=B[j];
    const center=v.map((s,k)=>Math.max(-half[k]+r,Math.min(half[k]-r,s)));
    const dir=V(...v).sub(V(...center)).normalize();p.push(...V(...center).addScaledVector(dir,r).toArray());n.push(...dir.toArray());uv.push(i/9,j/9);
    if(i&&j){const q=base+j*A.length+i;const f=[q-11,q-10,q,q-11,q,q-1];ix.push(...(sign===1?f:f.reverse()));}
   }
  }return geometry(p,ix,uv,n);
 });
}
function box(p,x,y,z,w,h,d,m,r=0){return mesh(r?rounded(w,h,d,r):cache('b'+[w,h,d],()=>new T.BoxGeometry(w,h,d)),m,p,x,y,z);}
const sph= new T.SphereGeometry(1,24,16),smallSph=new T.SphereGeometry(1,14,10);
function oval(p,x,y,z,a,b,c,m,low=false){const o=mesh(low?smallSph:sph,m,p,x,y,z);o.scale.set(a,b,c);return o;}
function cyl(p,x,y,z,rt,rb,h,m,segments=32){return mesh(cache('c'+[rt,rb,h,segments],()=>new T.CylinderGeometry(rt,rb,h,segments)),m,p,x,y,z);}
function rod(p,a,b,r,m,r2=r){const A=V(...a),B=V(...b),d=B.clone().sub(A);const o=cyl(p,0,0,0,r2,r,d.length(),m,12);o.position.copy(A).lerp(B,.5);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;}
function tube(p,points,r,m){const path=new T.CatmullRomCurve3(points.map(a=>V(...a)));return mesh(new T.TubeGeometry(path,Math.max(10,points.length*6),r,10,false),m,p);}
function torus(p,x,y,z,r,t,m){return mesh(cache('t'+[r,t],()=>new T.TorusGeometry(r,t,10,48)),m,p,x,y,z);}
function badgeDrop(p,x,y,z,size,m){
 const s=new T.Shape();s.moveTo(0,.65);s.bezierCurveTo(-.15,.33,-.47,.02,-.47,-.20);s.bezierCurveTo(-.47,-.76,.47,-.76,.47,-.2);s.bezierCurveTo(.47,.03,.13,.37,0,.65);
 const g=cache('drop',()=>new T.ExtrudeGeometry(s,{depth:.075,bevelThickness:.035,bevelSize:.035,bevelSegments:3,steps:1,curveSegments:16}));
 const o=mesh(g,m,p,x,y,z);o.scale.setScalar(size);return o;
}
// Batch rigid pieces with the same finish. Hinges, wheels and brush sections keep separate transforms.
function bake(parent){
 parent.updateWorldMatrix(true,true);
 const inv=new T.Matrix4().copy(parent.matrixWorld).invert(),batches=new Map();
 parent.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
 const key=o.material.uuid+o.castShadow+o.receiveShadow;
 let b=batches.get(key);if(!b){b={p:[],n:[],u:[],i:[],mat:o.material,cs:o.castShadow,rs:o.receiveShadow,items:[]};batches.set(key,b);}
 const g=o.geometry,m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),normal=new T.Matrix3().getNormalMatrix(m);
 const pos=g.getAttribute('position'),norm=g.getAttribute('normal'),uv=g.getAttribute('uv'),offset=b.p.length/3,v=V();
 for(let j=0;j<pos.count;j++){v.fromBufferAttribute(pos,j).applyMatrix4(m);b.p.push(v.x,v.y,v.z);v.fromBufferAttribute(norm,j).applyMatrix3(normal).normalize();b.n.push(v.x,v.y,v.z);b.u.push(uv?uv.getX(j):0,uv?uv.getY(j):0);}
 if(g.index)for(let j=0;j<g.index.count;j++)b.i.push(offset+g.index.getX(j));else for(let j=0;j<pos.count;j++)b.i.push(offset+j);
 b.items.push(o);
 });
 for(const b of batches.values()){for(const o of b.items)o.removeFromParent();const o=mesh(geometry(b.p,b.i,b.u,b.n),b.mat,parent);o.castShadow=b.cs;o.receiveShadow=b.rs;}
}
const shaderNoise=`
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float softNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
float fb(vec2 p){return softNoise(p)*.54+softNoise(p*2.13+4.2)*.27+softNoise(p*4.27)*.13+softNoise(p*9.22)*.06;}
`;
const fieldData=new Uint8Array(WashPhysics.W*WashPhysics.H*4);
const field=new T.DataTexture(fieldData,WashPhysics.W,WashPhysics.H);field.minFilter=field.magFilter=T.LinearFilter;field.needsUpdate=true;
function bodyMaterial(color,glass=false){
 const m=mat(color,glass?.115:.25,glass?.63:.32);m.side=T.DoubleSide;
 m.onBeforeCompile=s=>{
  s.uniforms.coatField={value:field};
  s.vertexShader='varying vec2 carUV;\n'+s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n carUV=uv;');
  s.fragmentShader='varying vec2 carUV;uniform sampler2D coatField;\n'+shaderNoise+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 load=texture2D(coatField,(carUV*vec2(16.,22.)+.5)/vec2(17.,23.)).rgb;
   vec2 coord=carUV*vec2(17.,22.);float n=fb(coord*1.45), grain=softNoise(coord*18.);
   float mud=smoothstep(.67,.78,load.r*.86+n*.82+.11*grain);
   mud*=smoothstep(.002,.08,load.r)*${glass?'0.12':'1.'};
   vec3 earth=mix(vec3(.145,.085,.047),vec3(.38,.255,.155),n*.82+.18*grain);
   diffuseColor.rgb=mix(diffuseColor.rgb,earth,mud*.94);
   float suds=smoothstep(.035,.21,load.g*2.+n*.105-.085);
   diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.72,.85,.84),vec3(1.,1.,.965),grain*.67),suds);
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,.84,mud);roughnessFactor=mix(roughnessFactor,.39,suds);roughnessFactor=max(.1,roughnessFactor-load.b*.23);').replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float relief=mud*(.0026*n+.00065*grain)+suds*.0016*grain;
   vec3 px=dFdx(-vViewPosition),py=dFdy(-vViewPosition),tx=cross(py,normal),ty=cross(normal,px);
   float determinant=dot(px,tx);
   normal=normalize(max(.00000001,abs(determinant))*normal-sign(determinant)*(dFdx(relief)*tx+dFdy(relief)*ty));
  `);
 };m.customProgramCacheKey=()=>glass?'glazed':'painted';return m;
}
function shell(p,truck){
 const coords=[],inds=[],uv=[],nu=56,nv=66;
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
  const u=i/nu,v=j/nv,pos=WashPhysics.surface(u,v,truck);coords.push(pos.x,pos.y,pos.z);uv.push(u,v);
  if(i&&j){const a=j*(nu+1)+i;inds.push(a-nu-2,a-1,a,a-nu-2,a,a-nu-1);}
 }
 return mesh(geometry(coords,inds,uv),bodyMaterial(truck?0x79a775:0xfff9e9),p);
}
function patch(p,rows,m){
 const pos=[],uv=[],idx=[];const w=rows[0].length;
 rows.forEach((row,j)=>row.forEach((a,i)=>{pos.push(...a);uv.push(i/(w-1),j/(rows.length-1));if(i&&j){const s=j*w+i;idx.push(s-w-1,s-w,s,s-w-1,s,s-1);}}));
 const g=geometry(pos,idx,uv);m.side=T.DoubleSide;return mesh(g,m,p);
}
function wheel(p,x,z,truck){
 const o=group(p,x,truck?.477:.397,z),w=group(o);w.rotation.y=PI/2;
 const r=truck?.457:.38;
 const lathe=[[0,-.12],[r*.68,-.124],[r*.88,-.116],[r*.99,-.078],[r,.063],[r*.97,.111],[r*.86,.136],[r*.63,.132],[r*.59,.102],[0,.10]];
 const tire=mesh(cache('wheel'+r,()=>new T.LatheGeometry(lathe.map(a=>new T.Vector2(...a)),48)),M.tire,w);tire.rotation.x=PI/2;
 for(let i=0;i<42;i++){
  const a=i*TAU/42,tread=box(w,Math.cos(a)*(r-.005),Math.sin(a)*(r-.005),0,.012,.016,.14,M.rubber);
  tread.rotation.z=a;tread.rotateX((i%2?1:-1)*.24);
 }
 for(const sign of [-1,1]){
  const hub=group(w,0,0,sign*.128);hub.rotation.y=sign===1?0:PI;
  const rim=cyl(hub,0,0,0,r*.64,r*.64,.025,M.chrome);rim.rotation.x=PI/2;
  torus(hub,0,0,.019,r*.60,.014,M.ivory);oval(hub,0,0,.024,r*.53,r*.53,.036,M.ivory);
  for(let j=0;j<8;j++){let a=j*TAU/8;const h=oval(hub,Math.sin(a)*r*.414,Math.cos(a)*r*.414,.057,r*.092,r*.131,.011,M.deep,true);h.rotation.z=-a;}
  oval(hub,0,0,.066,r*.267,r*.267,.042,M.chrome);torus(hub,0,0,.104,r*.137,.008,M.teal);
  torus(hub,0,0,.0,r*.82,.007,M.rubber);
 }
 bake(w);return o;
}
// Move the original outer sheet and glazing onto the hinge, retaining their UVs and normals.
function hingedPanel(source,leaf,select){
 source.updateWorldMatrix(true,false);leaf.updateWorldMatrix(true,false);
 const g=source.geometry,index=g.index.array,p=g.attributes.position,keep=[],door=[],center=V(),a=V();
 for(let i=0;i<index.length;i+=3){
  center.set(0,0,0);for(let k=0;k<3;k++)center.add(a.fromBufferAttribute(p,index[i+k]));center.multiplyScalar(1/3);
  const to=select(center)?door:keep;to.push(index[i],index[i+1],index[i+2]);
 }
 const panel=g.clone();panel.setIndex(door);panel.applyMatrix4(new T.Matrix4().copy(leaf.matrixWorld).invert().multiply(source.matrixWorld));
 g.setIndex(keep);mesh(panel,source.material,leaf);
}
function vehicle(scene,truck=false){
 const p=group(scene), fixed=group(p), body=shell(p,truck),wheelRoots=[],hinge=group(p);
 const leaf=group(hinge);
 const trim=truck?mat(0x7fae82,.3,.35):M.white;
 const sx=truck?1.10:1,sy=truck?1.17:1,sz=truck?1.18:1;
 fixed.scale.set(sx,sy,sz);hinge.scale.copy(fixed.scale);
 hinge.position.set(1.003*sx,0,.59*sz);
 hingedPanel(body,leaf,q=>q.x>.925*sx&&q.y>.49*sy&&q.z>-.56*sz&&q.z<.59*sz);
 box(fixed,.875,.78,.01,.044,.58,1.17,M.deep,.018);
 box(leaf,-.048,.794,-.594,.045,.48,1.06,M.deep,.02);

 box(fixed,0,.41,-.02,1.72,.27,3.23,M.black,.12);
 const cab=group(fixed);if(truck){cab.position.z=.52;cab.scale.set(.99,1.07,.65);}
 const stations=[[-1.46,.80,1.14],[-1.32,.776,1.54],[-1.04,.724,1.80],[-.8,.716,1.875],[-.22,.714,1.89],[.075,.73,1.82],[.23,.749,1.70],[.76,.84,1.18]];
 const topRows=stations.map(([z,w,y])=>[[-w,1.145,z],[-w*.999,y-.048,z],[-w*.92,y,z],[0,y+.048,z],[w*.92,y,z],[w*.999,y-.048,z],[w,1.145,z]]);
 const windowCoat=bodyMaterial(0x668c98,true);
 const pane=patch(cab,topRows,windowCoat);
 const panePos=pane.geometry.attributes.position,paneUV=pane.geometry.attributes.uv;
 for(let i=0;i<panePos.count;i++){
  const px=panePos.getX(i),pz=panePos.getZ(i)*(truck?.65:1)+(truck?.52:0);
  let best=1e5,su=.5,sv=.5;
  for(let j=4;j<62;j++){let v=j/66;for(let k=10;k<=46;k++){
   let u=k/56,a=WashPhysics.surface(u,v),dist=(a.x-px)**2+(a.z-pz)**2;if(dist<best){best=dist;su=u;sv=v;}
  }}
  paneUV.setXY(i,su,sv);
 }
 const cabCap=(s)=>{const [z,w,y]=s;patch(cab,[[[-w,1.14,z],[w,1.14,z]],[[-w*.99,y,z],[w*.99,y,z]]],M.glass);};
 cabCap(stations[0]);cabCap(stations[7]);
 hingedPanel(pane,leaf,q=>q.x>.711&&q.y>1.14&&q.y<1.76&&q.z*(truck?.65:1)+(truck?.52:0)>-.57&&q.z*(truck?.65:1)+(truck?.52:0)<.59);

 // Body-colored A/B/C pillars bound the sloping windshield and each side window.
 for(const side of [-1,1]){
  const q=side;
  tube(cab,[[q*.85,1.16,.76],[q*.805,1.37,.56],[q*.75,1.70,.23],[q*.72,1.825,.075],[q*.7,1.88,-.17]],.044,trim);
  tube(cab,[[q*.805,1.14,-1.43],[q*.78,1.53,-1.32],[q*.73,1.80,-1.04],[q*.70,1.87,-.83]],.065,trim);
  tube(cab,[[q*.80,1.16,-.53],[q*.76,1.48,-.52],[q*.716,1.86,-.48]],.035,M.deep);
  tube(cab,[[q*.81,1.15,-1.44],[q*.91,1.16,-.8],[q*.92,1.16,-.23],[q*.85,1.16,.75]],.020,M.chrome);
  tube(fixed,[[q*.95,1.128,-.56],[q*.99,.94,-.57],[q*1.0,.68,-.57],[q*.997,.54,-.48],[q*.995,.52,.46],[q*1.0,.66,.61],[q*.99,1.09,.59]],.009,M.teal);
  if(q>0)box(leaf,-.004,1.017,-.97,.044,.044,.175,M.chrome,.020);
  else box(fixed,q*.999,1.017,-.38,.044,.044,.175,M.chrome,.020);
  rod(cab,[q*.82,1.21,.48],[q*.99,1.26,.43],.026,M.black);oval(cab,q*1.02,1.285,.43,.115,.078,.089,trim);
  box(fixed,q*.992,.51,-.03,.043,.07,1.43,M.chrome,.023);
 }
 box(cab,0,1.881,-.50,1.45,.105,1.25,trim,.05);
 // Glass highlights follow the curvature of the windshield; rubber seals, wipers and rain channels sit above it.
 tube(cab,[[-.79,1.183,.764],[-.44,1.216,.776],[0,1.227,.78],[.45,1.216,.776],[.79,1.183,.764]],.022,M.rubber);
 for(const x of [-.42,.29]){rod(cab,[x-.15,1.213,.764],[x+.06,1.27,.691],.013,M.black);rod(cab,[x-.17,1.273,.69],[x+.23,1.29,.671],.014,M.rubber);}
 const bonnet=[];
 for(let i=0;i<=8;i++){const f=i/8;const q=WashPhysics.surface(.31-.028*f,.52+.236*f);bonnet.push([q.x,q.y+.005,q.z]);}
 for(let i=1;i<=20;i++){const f=i/20;const q=WashPhysics.surface(.282+f*.436,.756+.030*Math.sin(PI*f));bonnet.push([q.x,q.y+.005,q.z]);}
 for(let i=7;i>=0;i--){const f=i/8;const q=WashPhysics.surface(.69+.028*f,.52+.236*f);bonnet.push([q.x,q.y+.005,q.z]);}
 tube(fixed,bonnet,.0055,M.steel);
 // Capsule-shaped headlamps have concentric machined bezels, convex glass and fine internal flutes.
 for(const s of [-1,1]){
  const head=group(fixed,s*.65,.836,1.740);head.rotation.y=s*.28;head.rotation.x=-.23;
  oval(head,0,0,0,.218,.207,.081,M.chrome);oval(head,0,0,.051,.177,.172,.072,mat(0xe4eddd,.13,.44,{emissive:0xffe4b9,emissiveIntensity:.24}));
  torus(head,0,0,.076,.167,.012,M.chrome);
  for(let j=-3;j<=3;j++){const h=Math.sqrt(.14**2-(j*.036)**2);rod(head,[j*.036,-h,.114],[j*.036,h,.114],.0035,M.ivory);}
  oval(fixed,s*.82,.635,1.673,.07,.036,.033,M.amber);
  oval(fixed,s*.797,.84,-1.68,.102,.13,.042,M.red);
 }
 box(fixed,0,.497,1.764,1.59,.14,.15,M.chrome,.066);
 box(fixed,0,.605,1.797,.81,.166,.066,M.deep,.066);
 for(let i=0;i<3;i++)box(fixed,0,.55+i*.048,1.84,.69,.012,.012,M.steel,.005);
 box(fixed,0,.467,1.85,.415,.142,.035,M.mint,.024);badgeDrop(fixed,0,.47,1.872,.073,M.ivory);
 oval(fixed,0,.861,1.67,.072,.026,.022,M.chrome);
 for(const s of [-1,1])for(const z of [-1.13,1.09]){
  const a=[];for(let j=0;j<=20;j++){let t=PI*j/20;a.push([s*.987,.401+.418*Math.sin(t),z+.415*Math.cos(t)]);}
  tube(fixed,a,.038,M.rubber);
  wheelRoots.push(wheel(p,s*.985*sx,z*sz,truck));
 }
 if(truck){
  const green=mat(0x699777,.43,.25);box(fixed,0,1.26,-1.09,1.9,.38,1.34,green,.045);
  box(fixed,0,1.464,-1.09,1.71,.04,1.17,M.deep,.015);
  for(const s of [-1,1]){box(fixed,s*.916,1.49,-1.1,.09,.13,1.32,green,.029);for(let i=0;i<6;i++)box(fixed,s*.954,1.28,-1.64+i*.22,.028,.25,.038,M.mint,.009);}
 }
 // The near door pivots around its front hinge during boarding.
 bake(leaf);bake(fixed);return {p,body,wheels:wheelRoots,hinge,leaf,truck};
}
