/* Common physically based materials and solid modelling primitives. */
const Art = (() => {
  const T=THREE, rand=SnowRoad.rng(43231);
  const noiseCanvas=document.createElement('canvas');noiseCanvas.width=noiseCanvas.height=128;
  const ctx=noiseCanvas.getContext('2d'),pixels=ctx.createImageData(128,128);
  for(let i=0;i<pixels.data.length;i+=4){const n=227+Math.floor(rand()*29);pixels.data.set([n,n,n,255],i);}
  ctx.putImageData(pixels,0,0);
  const grain=new T.CanvasTexture(noiseCanvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(3,3);
  const crustCanvas=document.createElement('canvas');crustCanvas.width=crustCanvas.height=256;
  const crustCtx=crustCanvas.getContext('2d'),crustImage=crustCtx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=x*Math.PI/128,v=y*Math.PI/128;
    const ridge=Math.sin(3*u+2*v+.62*Math.sin(2*v))+.43*Math.sin(7*u+5*v+.86*Math.sin(u-v));
    const val=132+ridge*25+(rand()-.5)*39;
    crustImage.data.set([val,val,val,255],(y*256+x)*4);
  }
  crustCtx.putImageData(crustImage,0,0);
  const crust=new T.CanvasTexture(crustCanvas);crust.wrapS=crust.wrapT=T.RepeatWrapping;
  function mat(color,rough=.78,metal=0,extras={}){
    return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,roughnessMap:grain,...extras});
  }
  const C={
    snow:mat(0xe0ebee,.88), snowLight:mat(0xf4f1e5,.86), icy:mat(0xa9c4d1,.6),
    orange:mat(0xcb652a,.39,.35),gold:mat(0xf1a042,.36,.32),cab:mat(0xd77e34,.36,.35),
    black:mat(0x263236,.46,.40),seal:mat(0x182629,.79),rubber:mat(0x242c30,.89),tread:mat(0x323c3e,.83),
    iron:mat(0x647477,.32,.73),steel:mat(0xbfc9c6,.26,.78),cream:mat(0xe2d8b9,.54,.2),
    red:mat(0xb9573e,.42,.27), lamp:mat(0xffeac4,.2,.12,{emissive:0xffc776,emissiveIntensity:.72}),
    tail:mat(0xb43820,.24,.18,{emissive:0x9e260c,emissiveIntensity:.35}),
    beacon:mat(0xffa02b,.20,.18,{emissive:0xff8d13,emissiveIntensity:.60}),
    glass:mat(0x88a6af,.14,.24,{transparent:true,opacity:.57,depthWrite:false,side:T.DoubleSide}),
    deepGlass:mat(0x536d79,.18,.38),wood:mat(0x766253,.90),freshWood:mat(0xa88c6f,.87),
    darkWood:mat(0x534e48,.89), teal:mat(0x567372,.68,.18), roof:mat(0x536771,.55,.32),
    bus:mat(0xe9b447,.40,.28), busTrim:mat(0xf5cb71,.41,.24), wall:mat(0xc5b6a0,.94),
    needle:mat(0x3d5959,.97), branchSnow:mat(0xd4e1e5,.94),bark:mat(0x595650,.96)
  };
  for(const m of [C.snow,C.snowLight,C.branchSnow]){m.bumpMap=crust;m.bumpScale=.012;}
  const unitBox=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,16,10);
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function mesh(parent,geo,m,x=0,y=0,z=0){const a=new T.Mesh(geo,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
  function box(g,m,x,y,z,w,h,d){const a=mesh(g,unitBox,m,x,y,z);a.scale.set(w,h,d);return a;}
  function rounded(g,m,x,y,z,w,h,d,r=.06){
    const sh=new T.Shape(),a=-w/2,b=-h/2;r=Math.min(r,w*.24,h*.24,d*.26);
    sh.moveTo(a+r,b+r);sh.lineTo(-a-r,b+r);sh.lineTo(-a-r,-b-r);sh.lineTo(a+r,-b-r);sh.closePath();
    const geo=new T.ExtrudeGeometry(sh,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,steps:1});
    geo.translate(0,0,-d/2+r);return mesh(g,geo,m,x,y,z);
  }
  function orb(g,m,x,y,z,rx,ry,rz){const a=mesh(g,sphere,m,x,y,z);a.scale.set(rx,ry,rz);return a;}
  function cyl(g,m,x,y,z,rt,rb,h,n=16){return mesh(g,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);}
  function rod(g,m,a,b,r,r2=r,n=8){const start=V(...a),end=V(...b),mid=start.clone().lerp(end,.5);
    const o=cyl(g,m,mid.x,mid.y,mid.z,r2,r,start.distanceTo(end),n);
    o.quaternion.setFromUnitVectors(V(0,1,0),end.sub(start).normalize());return o;}
  function surface(g,m,points,triangles,colors){
    const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(points,3));
    if(colors)geom.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const uv=[];for(let i=0;i<points.length;i+=3)uv.push(points[i]*.38+points[i+1]*.12,points[i+2]*.38+points[i+1]*.22);
    geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geom.setIndex(triangles);geom.computeVertexNormals();return mesh(g,geom,m);
  }
  // Bake rigid assemblies by material. Hinges, wheels and other moving groups stay independent.
  function bake(g){
    const batches=new Map();
    for(const n of [...g.children]){
      if(!n.isMesh||n.isInstancedMesh)continue;
      const key=n.material;
      if(!batches.has(key))batches.set(key,[]);
      batches.get(key).push(n);
    }
    for(const [m,items] of batches){
      if(items.length<2)continue;
      let count=0,ic=0;
      for(const o of items){const k=o.geometry;count+=k.attributes.position.count;ic+=k.index?k.index.count:k.attributes.position.count;}
      const pos=new Float32Array(count*3),nor=new Float32Array(count*3),uv=new Float32Array(count*2);
      const idx=count>65535?new Uint32Array(ic):new Uint16Array(ic);
      let off=0,io=0;
      for(const o of items){o.updateMatrix();const k=o.geometry.clone().applyMatrix4(o.matrix);
        pos.set(k.attributes.position.array,off*3);nor.set(k.attributes.normal.array,off*3);
        if(k.attributes.uv)uv.set(k.attributes.uv.array,off*2);
        const len=k.index?k.index.count:k.attributes.position.count;
        for(let j=0;j<len;j++)idx[io++]=off+(k.index?k.index.array[j]:j);
        off+=k.attributes.position.count;g.remove(o);k.dispose();
      }
      const k=new T.BufferGeometry();k.setAttribute('position',new T.BufferAttribute(pos,3));k.setAttribute('normal',new T.BufferAttribute(nor,3));k.setAttribute('uv',new T.BufferAttribute(uv,2));k.setIndex(new T.BufferAttribute(idx,1));
      const result=mesh(g,k,m);result.castShadow=items.some(o=>o.castShadow);
    }return g;
  }
  return {T,C,mat,group,mesh,box,rounded,orb,cyl,rod,surface,bake,V,rand,crust};
})();
