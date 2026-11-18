const RoadView=(()=>{
  const {T,C,mat,group,mesh,rounded,rod,orb,bake}=Art;
  const {NX,NS,DX,DS,S0,roadX,clamp,smooth}=SnowRoad;
  function build(scene,sim){
    const random=SnowRoad.rng(712);
    const dummy=new T.Object3D(),colors=new T.Color(),indices=[];
    const pos=new Float32Array(NX*NS*3), tint=new Float32Array(pos.length);
    for(let r=0;r<NS;r++)for(let j=0;j<NX;j++){
      const i=r*NX+j,c=sim.cells[i];pos[i*3]=roadX(c.s)+c.x;pos[i*3+2]=-c.s;
      const n=.96+c.grain*.035; tint.set([n*.927,n*.973,n],i*3);
      if(r<NS-1&&j<NX-1)indices.push(i,i+1,i+NX,i+1,i+1+NX,i+NX);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));
    geo.setAttribute('color',new T.BufferAttribute(tint,3));geo.setIndex(indices);
    const snowUV=new Float32Array(NX*NS*2);
    for(let i=0;i<sim.cells.length;i++){snowUV[i*2]=pos[i*3]*.43;snowUV[i*2+1]=pos[i*3+2]*.43;}
    geo.setAttribute('uv',new T.BufferAttribute(snowUV,2));
    const snow=mesh(scene,geo,mat(0xf1f5f6,.87,0,{vertexColors:true,bumpMap:Art.crust,bumpScale:.023}));snow.frustumCulled=false;
    // Angular mineral aggregate and darker binder have independent roughness and albedo.
    const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=256;
    const ct=texCanvas.getContext('2d'),im=ct.createImageData(256,256);
    for(let i=0;i<im.data.length;i+=4){const n=67+random()*35+(random()<.044?random()*53:0);im.data.set([n*.84,n*.94,n,255],i);}ct.putImageData(im,0,0);
    const tex=new T.CanvasTexture(texCanvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
    const asphalt=mat(0xabb7bd,.45,.16,{map:tex,bumpMap:tex,bumpScale:.016});
    const rp=[],ri=[],uv=[];
    for(let r=0;r<NS;r++){
      const s=S0+r*DS;for(const a of [-1,1]){rp.push(roadX(s)+2.43*a,.002,-s);uv.push(a*1.62,s*.65);}
      if(r<NS-1){const i=r*2;ri.push(i,i+1,i+2,i+1,i+3,i+2);}
    }
    const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(rp,3));rg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));rg.setIndex(ri);rg.computeVertexNormals();
    mesh(scene,rg,asphalt).castShadow=false;
    const pileGeo=new T.BufferGeometry(),pp=new Float32Array(NS*2*9*3),pc=new Float32Array(pp.length),pi=[];
    for(let k=0;k<2;k++)for(let r=0;r<NS;r++)for(let j=0;j<9;j++){
      const i=(k*NS+r)*9+j,n=.97+random()*.03;
      pc.set([n*.925,n*.965,n],3*i);
      if(j<8&&r<NS-1)pi.push(i,i+1,i+9,i+1,i+10,i+9);
    }
    pileGeo.setAttribute('position',new T.BufferAttribute(pp,3).setUsage(T.DynamicDrawUsage));pileGeo.setAttribute('color',new T.BufferAttribute(pc,3));pileGeo.setIndex(pi);
    const bankUV=[];for(let k=0;k<2;k++)for(let r=0;r<NS;r++)for(let j=0;j<9;j++)bankUV.push(j*.095,r*DS*.41);
    pileGeo.setAttribute('uv',new T.Float32BufferAttribute(bankUV,2));
    const banks=mesh(scene,pileGeo,mat(0xe2ecef,.91,0,{vertexColors:true,side:T.DoubleSide,bumpMap:Art.crust,bumpScale:.022}));banks.frustumCulled=false;
    const chunks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),C.snow,100);chunks.castShadow=true;chunks.receiveShadow=true;chunks.frustumCulled=false;scene.add(chunks);
    const iceMat=mat(0xc5dfed,.105,.32,{emissive:0x8a9f9e,emissiveIntensity:.11,flatShading:true});
    const crystalGeo=new T.OctahedronGeometry(1,0),crystals=new T.InstancedMesh(crystalGeo,iceMat,1800);
    const seeds=Array.from({length:1800},()=>({s:S0+random()*(NS-1)*DS,x:(random()-.5)*4.73,az:random()*6.28,r:.008+.026*Math.pow(random(),2)}));
    scene.add(crystals);crystals.frustumCulled=false;
    // A thin local meltwater film occupies only cells exposed by the blade.
    const filmMat=mat(0x8c9fa9,.12,.32,{transparent:true,opacity:.37,depthWrite:false});
    const films=new T.InstancedMesh(new T.CylinderGeometry(1,1,.003,13),filmMat,465);films.frustumCulled=false;scene.add(films);
    const drops=Array.from({length:465},()=>({s:S0+random()*(NS-1)*DS,x:(random()-.5)*4.5,w:.043+random()*.15,l:.08+random()*.22,a:random()*2}));
    const flakes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xf3efdf,.79,0,{emissive:0xd0d4cc,emissiveIntensity:.15}),sim.flakes.length);
    flakes.frustumCulled=false;scene.add(flakes);
    function surface(){
      for(let i=0;i<sim.cells.length;i++)pos[i*3+1]=sim.cells[i].h-.0074;
      geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
      for(let k=0;k<2;k++)for(let r=0;r<NS;r++){
        const p=sim.piles[r*2+k],s=p.s,sgn=k?1:-1;
        const wave=.035*Math.sin(s*2.1+sgn)+.04*Math.sin(s*.73-sgn),width=.76+wave+p.height*.63;
        const mid=roadX(s)+sgn*(2.40+.065*Math.cos(s*1.8)+.06*Math.sin(s*.62));
        for(let j=0;j<9;j++){
          const u=(j-4)/4,cap=Math.pow(Math.max(0,1-u*u),1.63);
          const i=((k*NS+r)*9+j)*3;
          pp[i]=mid+u*width;pp[i+1]=-.085+cap*(.35+wave+p.height)*(.99+.055*Math.sin(s*4+j*.78));pp[i+2]=-s;
        }
      }
      pileGeo.attributes.position.needsUpdate=true;pileGeo.computeVertexNormals();
      let n=0;
      for(const a of seeds){const c=sim.at(a.s,a.x);const visible=1-smooth((c.h-.002)/.027);if(visible<=.01)continue;
        const r=a.r*visible*(.83+c.water*.7);dummy.position.set(roadX(a.s)+a.x,.008,-a.s);
        dummy.rotation.set(.13*Math.sin(a.az)+c.water*.21,a.az,.13*Math.cos(a.az));dummy.scale.set(r*1.6,r*.36,r);dummy.updateMatrix();crystals.setMatrixAt(n++,dummy.matrix);
      }crystals.count=n;crystals.instanceMatrix.needsUpdate=true;
      n=0;for(const a of drops){const c=sim.at(a.s,a.x);
        if(c.water<.013||c.h>.012)continue;const r=Math.sqrt(c.water);
        dummy.position.set(roadX(a.s)+a.x,.0045,-a.s);dummy.rotation.set(0,a.a,0);dummy.scale.set(a.w*r*2,1,a.l*r*2);dummy.updateMatrix();films.setMatrixAt(n++,dummy.matrix);
      }films.count=n;films.instanceMatrix.needsUpdate=true;
    }
    function particles(){
      chunks.count=Math.min(100,sim.clods.length);
      for(let i=0;i<chunks.count;i++){const c=sim.clods[i];dummy.position.set(roadX(c.s)+c.x,c.y,-c.s);dummy.rotation.set(c.angle,c.spin,c.angle*.38);dummy.scale.set(c.r*1.1,c.r*.71,c.r);dummy.updateMatrix();chunks.setMatrixAt(i,dummy.matrix);}
      chunks.instanceMatrix.needsUpdate=true;
      for(let i=0;i<sim.flakes.length;i++){const f=sim.flakes[i],r=.009+.017*(f.fall-.12)/.34;
        dummy.position.set(f.x,f.y,-f.s);dummy.rotation.set(f.y+i,f.x,0);dummy.scale.set(r,r*.67,r*.75);dummy.updateMatrix();flakes.setMatrixAt(i,dummy.matrix);}
      flakes.instanceMatrix.needsUpdate=true;
    }
    surface();particles();return {surface,particles};
  }
  function makeHand(scene){
    const g=group(scene),m=mat(0xffedd1,.46,.08,{transparent:true,opacity:0,depthWrite:false}),cuff=mat(0xccab7b,.62,0,{transparent:true,opacity:0,depthWrite:false});
    orb(g,m,0,0,0,.160,.121,.102);
    rod(g,m,[-.085,-.035,0],[-.100,-.270,-.018],.051,.045,12);
    orb(g,m,-.1,-.267,-.018,.045,.05,.046);
    for(let i=0;i<3;i++)orb(g,m,-.004+i*.065,-.10+i*.018,.012,.048,.083,.064);
    rod(g,m,[-.115,.022,.014],[-.193,-.049,.044],.058,.046,12);orb(g,m,-.19,-.05,.044,.047,.048,.049);
    rounded(g,cuff,.023,.116,0,.21,.086,.164,.025);bake(g);
    g.traverse(o=>{o.castShadow=false;});return {g,m,cuff};
  }
  return {build,makeHand};
})();
