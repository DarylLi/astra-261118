/* Procedural joinery, metalwork and timber. All scene surfaces share PBR lighting. */
const Craft=(()=>{
  const T=THREE, mats=new Map(), geometries=new Map();
  let seed=72518;
  const noise=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const texture=(canvas,color=false)=>{
    const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;
    if(color)t.colorSpace=T.SRGBColorSpace;return t;
  };
  function surface(grain){
    const cv=document.createElement('canvas');cv.width=512;cv.height=256;
    const ctx=cv.getContext('2d'),im=ctx.createImageData(512,256);
    const rows=Array.from({length:256},()=>noise()*.075);
    for(let y=0;y<256;y++)for(let x=0;x<512;x++){
      const u=x/512*Math.PI*2,v=y/256*Math.PI*2;
      const phase=v*20+.92*Math.sin(u+v*2)+.58*Math.sin(u*2-v*3)+.24*Math.sin(4*u+v);
      const ridge=Math.pow(.5+.5*Math.cos(phase),5);
      const dark=grain?.10*ridge+.038*Math.sin(phase*3)+rows[y]+.025*Math.sin(v*6):.025*Math.sin(v*7+u)*Math.cos(u*9)+.038;
      const a=255*(.985-dark-noise()*(grain?.035:.057)),i=(y*512+x)*4;
      im.data.set([a,a-(grain?3:0),a-(grain?7:0),255],i);
    }
    ctx.putImageData(im,0,0);return cv;
  }
  const timber=texture(surface(true),true),fineCanvas=surface(false),fine=texture(fineCanvas,true),rough=texture(fineCanvas);
  function mat(color,type='paint'){
    const key=color+type;if(mats.has(key))return mats.get(key);
    const data={wood:[.61,.02],paint:[.53,.05],brass:[.31,.62],iron:[.43,.65],rock:[.9,0],leaf:[.82,0],glass:[.19,.28],water:[.17,.26],soil:[.94,0]};
    const [roughness,metalness]=data[type]||data.paint;
    const m=new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,map:type==='wood'?timber:fine,envMapIntensity:type==='water'?1.1:.63});
    mats.set(key,m);return m;
  }
  const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);if(parent)parent.add(g);return g;};
  function geom(key,fn){if(!geometries.has(key))geometries.set(key,fn());return geometries.get(key);}
  function rounded(w,h,d,r){
    r=Math.min(r,w*.46,h*.46,d*.46);
    if(!r)return geom('b'+[w,h,d],()=>new T.BoxGeometry(w,h,d));
    return geom('r'+[w,h,d,r],()=>{
      // Six face grids have segments only inside the bevels, leaving each broad face flat.
      const pos=[],norm=[],uv=[],index=[];
      const dims=[w,h,d],segments=5;
      for(let face=0;face<6;face++){
        const k=Math.floor(face/2),a=(k+1)%3,b=(k+2)%3,sign=face%2?-1:1;
        const coords=n=>[-dims[n]/2,-dims[n]/2+r*.34,-dims[n]/2+r,dims[n]/2-r,dims[n]/2-r*.34,dims[n]/2];
        const A=coords(a),B=coords(b),start=pos.length/3;
        for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
          const q=[0,0,0];q[k]=dims[k]*.5*sign;q[a]=A[i];q[b]=B[j];
          const c=q.map((v,n)=>Math.max(-dims[n]/2+r,Math.min(dims[n]/2-r,v)));
          const n=q.map((v,i)=>v-c[i]),len=Math.hypot(...n);
          for(let t=0;t<3;t++){n[t]/=len;pos.push(c[t]+n[t]*r);norm.push(n[t]);}
          // Grain follows long face axis, with distinct end grain on the narrow edges.
          const U=k===0?2:0,V=k===1?2:1;uv.push(q[U]/Math.max(1.1,dims[U])+.52,q[V]/Math.max(.82,dims[V])+.47);
          if(i<segments&&j<segments){const n=start+j*(segments+1)+i,v=n+segments+1;
            if(sign>0)index.push(n,n+1,v,n+1,v+1,v);else index.push(n,v,n+1,n+1,v,v+1);}
        }
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);return g;
    });
  }
  function mesh(g,geo,m,x=0,y=0,z=0){
    const o=new T.Mesh(geo,typeof m==='string'?mat(m):m);o.castShadow=o.receiveShadow=true;
    o.position.set(x,y,z);g.add(o);return o;
  }
  function box(g,w,h,d,x,y,z,m,r=.018){return mesh(g,rounded(w,h,d,r),m,x,y,z);}
  function cyl(g,rt,rb,h,x,y,z,m,n=16){
    return mesh(g,geom('c'+[rt,rb,h,n],()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);
  }
  function orb(g,x,y,z,sx,sy,sz,m){
    const o=mesh(g,geom('ball',()=>new T.SphereGeometry(1,12,9)),m,x,y,z);o.scale.set(sx,sy,sz);return o;
  }
  function rod(g,a,b,r,m,sides=9){
    const A=new T.Vector3(...a),B=new T.Vector3(...b),v=B.sub(A);
    const o=cyl(g,r,r,1,...a,m,sides);o.position.addScaledVector(v,.5);o.scale.y=v.length();o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
  }
  function arch(g,points,z1,z2,m){
    const sh=new T.Shape();points.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();
    const geo=geom('a'+JSON.stringify([points,z1,z2]),()=>new T.ExtrudeGeometry(sh,{depth:z2-z1,bevelEnabled:false}));
    return mesh(g,geo,m,0,0,z1);
  }
  // Collapse stationary hardware into material batches. World transforms stay local to the board.
  function batch(root){
    root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),parts=new Map();
    root.traverse(o=>{
      if(!o.isMesh)return;
      const key=o.geometry.uuid+o.material.uuid,rec=parts.get(key)||{geo:o.geometry,m:o.material,ms:[]};
      rec.ms.push(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));parts.set(key,rec);
    });
    root.clear();
    const packed=new Map();
    for(const rec of parts.values()){
      const list=packed.get(rec.m)||[];list.push(rec);packed.set(rec.m,list);
    }
    // Merge small shapes once per material, including the terrain's many different dimensions.
    for(const [m,list] of packed) {
      const pos=[],nor=[],uv=[],ix=[],v=new T.Vector3(),n=new T.Vector3(),nm=new T.Matrix3();
      for(const {geo,ms} of list)for(const M of ms){
        const p=geo.attributes.position,k=geo.attributes.normal,t=geo.attributes.uv,base=pos.length/3;
        nm.getNormalMatrix(M);
        for(let j=0;j<p.count;j++){
          v.fromBufferAttribute(p,j).applyMatrix4(M);n.fromBufferAttribute(k,j).applyMatrix3(nm).normalize();
          pos.push(v.x,v.y,v.z);nor.push(n.x,n.y,n.z);uv.push(t?t.getX(j):0,t?t.getY(j):0);
        }
        if(geo.index){for(let j=0;j<geo.index.count;j++)ix.push(base+geo.index.getX(j));}
        else for(let j=0;j<p.count;j++)ix.push(base+j);
      }
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ix);
      mesh(root,geo,m);
    }
    return root;
  }
  return {T,mat,group,geom,mesh,box,cyl,orb,rod,arch,batch,noise,rough,timber};
})();
