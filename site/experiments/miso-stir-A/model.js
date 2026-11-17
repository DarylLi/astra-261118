'use strict';
const T=THREE, V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z), TAU=2*Math.PI;
const sat=x=>Math.max(0,Math.min(1,x));
let seed=19731;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
function mat(color,roughness=.72,metalness=0,props={}){
  return new T.MeshStandardMaterial({color,roughness,metalness,...props});
}
function mesh(p,geom,m,x=0,y=0,z=0){
  const a=new T.Mesh(geom,m);a.position.set(x,y,z);a.castShadow=a.receiveShadow=true;p.add(a);return a;
}
const ballGeo=new T.SphereGeometry(1,18,12), beadGeo=new T.SphereGeometry(1,10,7), boxCache=new Map();
function oval(p,m,x,y,z,w,h,d){const a=mesh(p,Math.max(w,h,d)<.17?beadGeo:ballGeo,m,x,y,z);a.scale.set(w,h,d);return a;}
function boxGeo(w,h,d,r){
  r=Math.min(w/2,h/2,d/2,r);const key=[w,h,d,r].join('|');
  if(boxCache.has(key))return boxCache.get(key);
  const dims=[w/2,h/2,d/2],pos=[],norm=[],uv=[],idx=[];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const b=(axis+1)%3,c=(axis+2)%3;
    const samples=k=>r<.03?[-dims[k],-dims[k]+r,dims[k]-r,dims[k]]:[-dims[k],-dims[k]+r*.34,-dims[k]+r,dims[k]-r,dims[k]-r*.34,dims[k]];
    const bs=samples(b), cs=samples(c),base=pos.length/3;
    for(const v of cs)for(const u of bs){
      const q=[0,0,0];q[axis]=dims[axis]*sign;q[b]=u;q[c]=v;
      const cl=q.map((s,i)=>Math.max(-dims[i]+r,Math.min(dims[i]-r,s)));
      const n=V(q[0]-cl[0],q[1]-cl[1],q[2]-cl[2]).normalize();
      pos.push(cl[0]+n.x*r,cl[1]+n.y*r,cl[2]+n.z*r);norm.push(n.x,n.y,n.z);
      const U=dims[b]>=dims[c]?u/(dims[b]*2):v/(dims[c]*2);
      const W=dims[b]>=dims[c]?v/(dims[c]*2):u/(dims[b]*2);
      uv.push(.5+U,.5+W);
    }
    for(let j=0;j<cs.length-1;j++)for(let i=0;i<bs.length-1;i++){
      const a=base+j*bs.length+i,b=a+bs.length;
      idx.push(...(sign===1?[a,a+1,b+1,a,b+1,b]:[a,b+1,a+1,a,b,b+1]));
    }
  }
  const g=geometry(pos,idx,uv);g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));boxCache.set(key,g);return g;
}
function geometry(pos,index,uv){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(index);
  if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function box(p,m,x,y,z,w,h,d,r=.025){
  return mesh(p,boxGeo(w,h,d,r),m,x,y,z);
}
function lathe(p,m,x,y,z,profile,n=48){
  return mesh(p,new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(Math.max(.0001,r),h)),n),m,x,y,z);
}
function ring(p,m,x,y,z,r,t,n=64){
  const o=mesh(p,new T.TorusGeometry(r,t,8,n),m,x,y,z);o.rotation.x=Math.PI/2;return o;
}
function line(p,m,points,r,segments=16,sides=7){
  return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>Array.isArray(a)?V(...a):a)),segments,r,sides,false),m);
}
function rod(p,m,a,b,r1,r2=r1,n=16){
  const A=V(...a),B=V(...b),o=mesh(p,new T.CylinderGeometry(r2,r1,A.distanceTo(B),n),m);
  o.position.copy(A).lerp(B,.5);o.quaternion.setFromUnitVectors(V(0,1,0),B.sub(A).normalize());return o;
}
// Combine fixed surfaces in each moving part. Nothing is rasterized into scenery.
function batch(root,combineTints=false){
  root.updateWorldMatrix(true,true);
  const inv=root.matrixWorld.clone().invert(), sets=new Map(), remove=[];
  root.traverse(o=>{
    if(!o.isMesh || o.isInstancedMesh)return;
    const m=o.material;if(m.transparent)return;
    const key=combineTints?[m.type,m.roughness,m.metalness,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.side,m.emissive.getHex(),m.emissiveIntensity].join('|'):m;
    if(!sets.has(key))sets.set(key,{material:m,p:[],n:[],u:[],i:[],c:[]});
    const pack=sets.get(key),g=o.geometry,pos=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv;
    const world=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),normalM=new T.Matrix3().getNormalMatrix(world),v=V(),base=pack.p.length/3;
    for(let j=0;j<pos.count;j++){
      v.fromBufferAttribute(pos,j).applyMatrix4(world);pack.p.push(v.x,v.y,v.z);
      v.fromBufferAttribute(normal,j).applyMatrix3(normalM).normalize();pack.n.push(v.x,v.y,v.z);
      pack.u.push(uv?uv.getX(j):0,uv?uv.getY(j):0);
      if(combineTints){
        const c=g.attributes.color;
        pack.c.push(m.color.r*(c?c.getX(j):1),m.color.g*(c?c.getY(j):1),m.color.b*(c?c.getZ(j):1));
      }
    }
    const count=g.index?g.index.count:pos.count;
    for(let j=0;j<count;j++)pack.i.push(base+(g.index?g.index.getX(j):j));
    remove.push(o);
  });
  for(const o of remove)o.removeFromParent();
  const groups=[];
  root.traverse(o=>{if(o!==root&&o.isGroup)groups.push(o);});
  for(let i=groups.length-1;i>=0;i--)if(!groups[i].children.length)groups[i].removeFromParent();
  for(const a of sets.values()){
    let m=a.material;const g=new T.BufferGeometry();
    if(combineTints){m=m.clone();m.color.setHex(0xffffff);m.vertexColors=true;g.setAttribute('color',new T.Float32BufferAttribute(a.c,3));}
    g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.u,2));g.setIndex(a.i);mesh(root,g,m);}
}
function texture(w,h,fn,srgb=true){
  const data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const c=fn(x,y);let i=(y*w+x)*4;for(let k=0;k<3;k++)data[i+k]=Math.min(255,Math.max(0,c[k]));data[i+3]=c[3]??255;
  }
  const t=new T.DataTexture(data,w,h);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.needsUpdate=true;return t;
}
const grain=texture(384,192,(x,y)=>{
  const f=x/384*TAU,g=y/192*TAU;
  const warp=Math.sin(f+.9*Math.sin(g*3))*2.6+Math.cos(f*2+g)*1.6;
  const stripe=Math.sin(g*14+warp)+.42*Math.sin(g*36+2*warp)+.18*Math.sin(g*71+warp);
  const v=220+11*stripe-10*Math.pow(Math.max(0,stripe-.2),3)+rand()*8;
  return [v+12,v+4,v-6];
});
const weave=texture(128,128,(x,y)=>{
  const n=217+10*Math.sin(x*Math.PI/2)+8*Math.cos(y*Math.PI/2)+rand()*14;return [n,n,n];
});
const plaid=texture(128,128,(x,y)=>{
  const a=(x%32<8?1:0)+(y%32<8?1:0);
  const c=[[236,202,126],[201,151,74],[168,112,50]][a],v=rand()*8+3*Math.sin((x+y)*2);
  return c.map(i=>i+v);
});
function oak(c){return mat(c,.54,0,{map:grain,bumpMap:grain,bumpScale:.014});}
function cloth(c){return mat(c,.92,0,{bumpMap:weave,bumpScale:.006});}
function environment(){
 const t=texture(256,128,(x,y)=>{
   const u=x/256,v=y/128; let c;
   if(v<.47)c=[113+v*40,91+v*39,70+v*30];
   else if(v>.78)c=[216,207,188];
   else c=[148,144,126];
   if(u>.53&&u<.79&&v>.51&&v<.79&&Math.abs(u-.66)>.004&&Math.abs(v-.67)>.006)c=[255,253,236];
   if(u>.09&&u<.24&&v>.51&&v<.65)c=[69,81,74];
   return c;
 });t.mapping=T.EquirectangularReflectionMapping;return t;
}
