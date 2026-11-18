'use strict';
const Craft = (() => {
  const T = THREE, PI = Math.PI, TAU = 2 * PI;
  let seed = 258119;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const gCache = new Map(), matCache = new Map();
  function geometry(key, build) {
    if (!gCache.has(key)) gCache.set(key, build());
    return gCache.get(key);
  }
  function surface(width, height, paint, color = true) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    paint(c.getContext('2d'), width, height);
    const t = new T.CanvasTexture(c);
    if (color) t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    return t;
  }
  const rough = surface(128,128,(ctx,w,h) => {
    const im = ctx.createImageData(w,h);
    for (let j=0; j<h; ++j) for (let i=0; i<w; ++i) {
      const k=(j*w+i)*4, value=224+random()*23+5*Math.sin(i*.15+j*.04);
      im.data[k]=im.data[k+1]=im.data[k+2]=value; im.data[k+3]=255;
    }
    ctx.putImageData(im,0,0);
  }, false);
  const patina = surface(256,256,(ctx,w,h) => {
    ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,w,h);
    for(let i=0;i<1700;i++) {
      ctx.fillStyle='rgba(61,50,38,'+(0.03+random()*.13)+')';
      ctx.fillRect(random()*w,random()*h,random()*1.7,random()*1.5);
    }
    for(let i=0;i<18;i++) {
      const x=random()*w,y=random()*h;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*11,y+random()*5-2);
      ctx.strokeStyle='rgba(75,72,64,0.13)';ctx.lineWidth=0.5;ctx.stroke();
    }
  });
  function mat(color, metalness=.38, roughness=.43, opts={}) {
    const cache = !Object.keys(opts).length, key=[color,metalness,roughness].join();
    if(cache && matCache.has(key)) return matCache.get(key);
    const m = new T.MeshStandardMaterial({color,metalness,roughness,roughnessMap:rough,map:patina,...opts});
    if(cache) matCache.set(key,m); return m;
  }
  function group(parent,x=0,y=0,z=0) {
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;
  }
  function mesh(parent,geo,material,x=0,y=0,z=0) {
    const o=new T.Mesh(geo,material);o.position.set(x,y,z);
    o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function rounded(w,h,d,r) {
    r=Math.min(r,w*.495,h*.495,d*.495);
    return geometry('b'+[w,h,d,r],()=>{
      if(!r) return new T.BoxGeometry(w,h,d);
      const n=7,geo=new T.BoxGeometry(2,2,2,n,n,n);
      const p=geo.attributes.position, normal=geo.attributes.normal;
      const v=new T.Vector3();
      for(let i=0;i<p.count;i++){
        const a=[p.getX(i),p.getY(i),p.getZ(i)];
        const f=t=>Math.sign(t)*Math.max(0,(Math.abs(t)-1/n)/(1-1/n));
        v.set(f(a[0]),f(a[1]),f(a[2])).normalize();
        normal.setXYZ(i,v.x,v.y,v.z);
        p.setXYZ(i, Math.sign(a[0])*(w/2-r)+v.x*r,Math.sign(a[1])*(h/2-r)+v.y*r,Math.sign(a[2])*(d/2-r)+v.z*r);
      }
      geo.computeBoundingSphere();return geo;
    });
  }
  function box(p,w,h,d,m,x=0,y=0,z=0,r=0){return mesh(p,rounded(w,h,d,r),m,x,y,z);}
  function cyl(p,rt,rb,h,m,x=0,y=0,z=0,n=40){
    return mesh(p,geometry('c'+[rt,rb,h,n],()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);
  }
  function sphere(p,rx,ry,rz,m,x=0,y=0,z=0){
    const o=mesh(p,geometry('sphere',()=>new T.SphereGeometry(1,32,20)),m,x,y,z);
    o.scale.set(rx,ry,rz);return o;
  }
  function torus(p,r,t,m,x=0,y=0,z=0){
    return mesh(p,geometry('t'+[r,t],()=>new T.TorusGeometry(r,t,8,72)),m,x,y,z);
  }
  function ring(p,r,t,m,x=0,y=0,z=0) {const o=torus(p,r,t,m,x,y,z);o.rotation.x=PI/2;return o;}
  function rod(p,a,b,r,m,n=16,r2=r){
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);
    const c=cyl(p,r2,r,v.length(),m,...av.addScaledVector(v,.5).toArray(),n);
    c.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return c;
  }
  function tube(p,points,r,m,segments=24){
    return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),segments,r,8,false),m);
  }
  function shape(p,outline,thick,m,bevel=.018){
    return mesh(p,new T.ExtrudeGeometry(outline,{depth:thick,bevelEnabled:!!bevel,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:18}),m);
  }
  const M={
    steel:mat(0x9a9e9d,.82,.31),bright:mat(0xd8d7c9,.88,.23),iron:mat(0x373d3d,.74,.48),
    dark:mat(0x272c2b,.63,.4),black:mat(0x212622,.09,.76),
    brass:mat(0xb99a57,.78,.29),gold:mat(0xe1ad51,.72,.24),cream:mat(0xe5d5ad,.37,.34),
    green:mat(0x667770,.38,.54),bronze:mat(0x80634b,.72,.43)
  };
  function bolt(p,x,y,z,size=.04,material=M.bright,axis='z') {
    const base=group(p,x,y,z);
    if(axis==='y')base.rotation.x=-PI/2;
    if(axis==='x')base.rotation.y=PI/2;
    const h=cyl(base,size,size*.95,size*.30,material,0,0,0,16);h.rotation.x=PI/2;
    const slot=box(base,size*1.19,size*.18,size*.07,M.dark,0,0,size*.156);
    slot.rotation.z=.36+random()*.65;return base;
  }
  // Batch fixed fittings by material in the parent coordinate system.
  function batch(root) {
    root.updateWorldMatrix(true,true);
    const inv=root.matrixWorld.clone().invert(), sets=new Map(), remove=[];
    root.traverse(o=>{
      if(!o.isMesh || Array.isArray(o.material)) return;
      const key=o.material.uuid+o.castShadow+o.receiveShadow;
      if(!sets.has(key))sets.set(key,[]);
      sets.get(key).push(o);
    });
    for(const objects of sets.values()){
      if(objects.length<2)continue;
      const pos=[],nor=[],uv=[],indices=[];
      for(const o of objects){
        const g=o.geometry, p=g.attributes.position,n=g.attributes.normal,t=g.attributes.uv,offset=pos.length/3;
        const matrix=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld), nm=new T.Matrix3().getNormalMatrix(matrix),v=new T.Vector3();
        for(let i=0;i<p.count;i++){
          v.fromBufferAttribute(p,i).applyMatrix4(matrix);pos.push(v.x,v.y,v.z);
          v.fromBufferAttribute(n,i).applyNormalMatrix(nm);nor.push(v.x,v.y,v.z);
          uv.push(t?t.getX(i):0,t?t.getY(i):0);
        }
        if(g.index)for(let i=0;i<g.index.count;i++)indices.push(offset+g.index.getX(i));
        else for(let i=0;i<p.count;i++)indices.push(offset+i);
        remove.push(o);
      }
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);
      const m=mesh(root,g,objects[0].material);m.castShadow=objects[0].castShadow;m.receiveShadow=objects[0].receiveShadow;
    }
    for(const o of remove)o.removeFromParent();
  }
  return {T,PI,TAU,random,surface,mat,group,mesh,box,cyl,sphere,torus,ring,rod,tube,shape,M,bolt,batch};
})();
