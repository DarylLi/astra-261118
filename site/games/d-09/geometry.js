'use strict';
// Shared construction tools. All solid surfaces use physically based materials.
const Art = (() => {
  const T=THREE, group=(p)=>{const g=new T.Group();if(p)p.add(g);return g;};
  let seed=81927;
  const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  const hash=(x,y)=>{let n=Math.imul(x,198491317)^Math.imul(y,6542989);n=Math.imul(n^(n>>>15),2246822519);return ((n^(n>>>13))>>>0)/4294967296;};
  function noise(x,y){
    const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);
    return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+(hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b;
  }
  function texture(n,fn,srgb=false){
    const data=new Uint8Array(n*n*4);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=fn(x,y);const i=4*(y*n+x);
      data[i]=v[0];data[i+1]=v[1];data[i+2]=v[2];data[i+3]=255;}
    const t=new T.DataTexture(data,n,n,T.RGBAFormat);
    t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;
    t.generateMipmaps=true;t.anisotropy=4;if(srgb)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;
  }
  const rough=texture(128,(x,y)=>{const l=191+32*noise(x/13,y/31)+24*hash(x,y);return [l,l,l];});
  function mat(c,r=.73,m=.03,extra={}){
    return new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,roughnessMap:rough,...extra});
  }
  const iron=mat(0x374047,.60,.55),black=mat(0x242c2a,.89,.13),steel=mat(0x8c9996,.32,.77),
    bolt=mat(0xbcc4bd,.33,.76),gold=mat(0xf3b829,.43,.32),yellow=mat(0xe6a420,.53,.35),
    amber=mat(0xb77a1c,.61,.34),cream=mat(0xfbe7ac,.49,.26),rubber=mat(0x2b302e,.94,.04),
    red=mat(0xb94934,.48,.34),redEdge=mat(0xcd5940,.46,.36),darkRed=mat(0x863b2d,.63,.35),
    glass=mat(0x5c8589,.13,.48,{envMapIntensity:1.65}), darkGlass=mat(0x3a5b60,.18,.48),
    lamp=mat(0xffedc2,.22,.28,{emissive:0xf0bf68,emissiveIntensity:.16}),
    backLight=mat(0x9c3020,.27,.2), soil=mat(0x846246,.98,.015);
  function mesh(p,geo,material,x=0,y=0,z=0){
    const m=new T.Mesh(geo,material);m.position.set(x,y,z);p.add(m);m.castShadow=!material.transparent;m.receiveShadow=true;return m;
  }
  const cache=new Map();
  function rounded(w,h,d,r){
    r=Math.min(r,w*.45,h*.45,d*.45);
    const key=[w,h,d,r].join('|');if(cache.has(key))return cache.get(key);
    const g=new T.BoxGeometry(2,2,2,4,4,4), pos=g.attributes.position, nor=g.attributes.normal;
    const sizes=[w/2,h/2,d/2];
    for(let i=0;i<pos.count;i++){
      const q=[pos.getX(i),pos.getY(i),pos.getZ(i)], n=q.map(a=>Math.abs(a)>.99?Math.sign(a):0);
      const l=Math.hypot(...n);
      const p=q.map((a,k)=>(Math.abs(a)>.4?Math.sign(a)*(sizes[k]-r):0)+n[k]*r/l);
      pos.setXYZ(i,...p);nor.setXYZ(i,...n.map(a=>a/l));
    }
    cache.set(key,g);return g;
  }
  function box(p,w,h,d,x,y,z,material,r=.022){return mesh(p,rounded(w,h,d,r),material,x,y,z);}
  function poly(p,coords,depth,x,y,z,m,b=.025){
    const shape=new T.Shape();coords.forEach(([a,c],i)=>i?shape.lineTo(a,c):shape.moveTo(a,c));shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:Math.max(.002,depth-2*b),bevelEnabled:b>0,bevelSize:b,
      bevelThickness:b,bevelSegments:2,steps:1,curveSegments:8});g.translate(0,0,-depth/2+b);
    return mesh(p,g,m,x,y,z);
  }
  function cyl(p,rt,rb,len,x,y,z,m,axis='y',segments=16){
    const key=['c',rt,rb,len,segments].join('|');
    if(!cache.has(key))cache.set(key,new T.CylinderGeometry(rt,rb,len,segments));
    const o=mesh(p,cache.get(key),m,x,y,z);
    if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=-Math.PI/2;return o;
  }
  const v=(a)=>new T.Vector3(...a);
  function rod(p,a,b,r,m,r2=r,n=10){
    const av=v(a),bv=v(b),d=bv.clone().sub(av),o=cyl(p,r2,r,d.length(),...(av.add(bv).multiplyScalar(.5).toArray()),m,'y',n);
    o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;
  }
  function pipe(p,points,r,m){
    return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v)),Math.max(12,points.length*4),r,7,false),m);
  }
  function ell(p,x,y,z,sx,sy,sz,m,n=14){
    const key='s'+n;if(!cache.has(key))cache.set(key,new T.SphereGeometry(1,n,Math.ceil(n*.64)));
    const o=mesh(p,cache.get(key),m,x,y,z);o.scale.set(sx,sy,sz);return o;
  }
  // Bake rigid assemblies together; joints remain separate scene nodes.
  function bake(p){
    p.updateWorldMatrix(true,true);const inv=p.matrixWorld.clone().invert(),sets=new Map();
    const objs=[];p.traverse(o=>{if(o.isMesh && !o.isInstancedMesh)objs.push(o);});
    for(const o of objs){
      const m=o.material, key=m.uuid;
      if(!sets.has(key))sets.set(key,{m,p:[],n:[],uv:[],color:[]});
      const a=sets.get(key),g=o.geometry,idx=g.index,at=g.attributes,mt=inv.clone().multiply(o.matrixWorld),
        nt=new T.Matrix3().getNormalMatrix(mt),v3=new T.Vector3();
      for(let k=0;k<(idx?idx.count:at.position.count);k++){
        const i=idx?idx.getX(k):k;
        v3.fromBufferAttribute(at.position,i).applyMatrix4(mt);a.p.push(v3.x,v3.y,v3.z);
        v3.fromBufferAttribute(at.normal,i).applyMatrix3(nt).normalize();a.n.push(v3.x,v3.y,v3.z);
        a.uv.push(at.uv?at.uv.getX(i):0,at.uv?at.uv.getY(i):0);
        if(at.color)a.color.push(at.color.getX(i),at.color.getY(i),at.color.getZ(i));
      }
      o.removeFromParent();
    }
    for(const a of sets.values()){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.p,3));
      g.setAttribute('normal',new T.Float32BufferAttribute(a.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(a.uv,2));
      if(a.color.length)g.setAttribute('color',new T.Float32BufferAttribute(a.color,3));mesh(p,g,a.m);
    }
    return p;
  }
  function env(){
    const w=512,h=256, data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const el=(y/h-.5)*Math.PI,az=(x/w-.5)*Math.PI*2,yy=Math.sin(el);
      const cloud=.54*noise(x/61,y/24)+.3*noise(x/26,y/13)+.16*noise(x/11,y/6);
      const sky=yy>0,k=Math.min(1,Math.abs(yy)*1.75),brite=sky?17*(cloud-.5):0;
      const sun=sky?30*Math.exp(-((az-1.95)**2/.23+(el-.56)**2/.11)):0;
      const lo=sky?[219,224,214]:[168,177,155],hi=sky?[153,179,186]:[104,98,76];
      for(let j=0;j<3;j++)data[(y*w+x)*4+j]=Math.min(255,lo[j]*(1-k)+hi[j]*k+brite+sun);
      data[(y*w+x)*4+3]=255;
    }
    const t=new T.DataTexture(data,w,h);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;
    t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
  }
  return {T,group,rand,noise,hash,texture,mat,rough,mesh,box,poly,cyl,rod,pipe,ell,bake,env,
    iron,black,steel,bolt,gold,yellow,amber,cream,rubber,red,redEdge,darkRed,glass,darkGlass,lamp,backLight,soil};
})();
