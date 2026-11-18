'use strict';
const Art=(()=>{
  const T=THREE, tau=2*Math.PI;
  let seed=341728;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const roughData=new Uint8Array(96*96*4);
  for(let i=0;i<roughData.length;i+=4){let v=210+rand()*44;roughData.set([v,v,v,255],i);}
  const rough=new T.DataTexture(roughData,96,96);rough.wrapS=rough.wrapT=T.RepeatWrapping;rough.repeat.set(3,4);rough.magFilter=T.LinearFilter;rough.minFilter=T.LinearMipMapLinearFilter;rough.generateMipmaps=true;rough.needsUpdate=true;
  function mat(color,roughness=.55,metalness=0,options={}){
    return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...options});
  }
  const M={
    hull:mat(0xf1eee2,.40,.27), pearl:mat(0xfff9e8,.32,.22), seam:mat(0x96a4ae,.40,.5),
    graphite:mat(0x28313a,.42,.68), black:mat(0x151c23,.43,.55), rubber:mat(0x171d21,.8,.05),
    metal:mat(0xb1bbc0,.29,.85), steel:mat(0x607583,.38,.76), steelDark:mat(0x3a4d58,.48,.69),
    darkBlue:mat(0x354752,.35,.73), orange:mat(0xd46c37,.42,.34), rust:mat(0xa25d39,.62,.40),
    gold:mat(0xb89145,.31,.76), ochre:mat(0xd1a459,.52,.32), white:mat(0xd6d8d4,.7,.05),
    glass:mat(0x354e63,.095,.75), red:mat(0xba3926,.48,.45),
    light:mat(0xffe8bc,.27,.18,{emissive:0xffcb8c,emissiveIntensity:2.8}),
    amber:mat(0xffae50,.27,.16,{emissive:0xff9c35,emissiveIntensity:1.6})
  };
  const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();p.add(g);g.position.set(x,y,z);return g;};
  function mesh(p,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  const cube=new T.BoxGeometry(1,1,1), ball=new T.SphereGeometry(1,28,18);
  function box(p,x,y,z,w,h,d,m){const o=mesh(p,cube,m,x,y,z);o.scale.set(w,h,d);return o;}
  function ell(p,x,y,z,rx,ry,rz,m){const o=mesh(p,ball,m,x,y,z);o.scale.set(rx,ry,rz);return o;}
  function cyl(p,x,y,z,rt,rb,h,m,n=48){return mesh(p,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);}
  function ring(p,y,r,th,m,x=0,z=0){const o=mesh(p,new T.TorusGeometry(r,th,8,64),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
  function lathe(p,profile,m,n=64,start=0,span=tau){return mesh(p,new T.LatheGeometry(profile.map(a=>new T.Vector2(a[0],a[1])),n,start,span),m);}
  function rod(p,a,b,r,m,n=10){const u=new T.Vector3(...a),v=new T.Vector3(...b),d=v.clone().sub(u),c=u.clone().add(v).multiplyScalar(.5);const o=cyl(p,c.x,c.y,c.z,r,r,d.length(),m,n);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
  function pipe(p,points,r,m,n=32){const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)));return mesh(p,new T.TubeGeometry(curve,n,r,8,false),m);}
  function plate(p,w,h,d,bevel,m,x=0,y=0,z=0){
    const s=new T.Shape(),a=w/2,b=h/2,c=Math.min(bevel,a*.8,b*.8);
    s.moveTo(-a+c,-b);s.lineTo(a-c,-b);s.quadraticCurveTo(a,-b,a,-b+c);s.lineTo(a,b-c);s.quadraticCurveTo(a,b,a-c,b);s.lineTo(-a+c,b);s.quadraticCurveTo(-a,b,-a,b-c);s.lineTo(-a,-b+c);s.quadraticCurveTo(-a,-b,-a+c,-b);
    const e=Math.min(d*.22,c*.28);
    const geo=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:e,bevelThickness:e,bevelSegments:3,curveSegments:5});geo.translate(0,0,-d/2);
    return mesh(p,geo,m,x,y,z);
  }
  // Batch rigid geometry sharing a finish. All joints stay separate scene nodes.
  function bake(g){
    g.updateWorldMatrix(true,true);
    const inv=g.matrixWorld.clone().invert(), sets=new Map(), normal=new T.Matrix3();
    g.traverse(o=>{
      if(!o.isMesh)return;
      const key=o.material; if(!sets.has(key))sets.set(key,{pos:[],nor:[],uv:[],idx:[]});
      const set=sets.get(key), geo=o.geometry, t=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);
      normal.getNormalMatrix(t);const v=new T.Vector3(),p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,base=set.pos.length/3;
      for(let i=0;i<p.count;i++){
        v.fromBufferAttribute(p,i).applyMatrix4(t);set.pos.push(v.x,v.y,v.z);
        v.fromBufferAttribute(n,i).applyNormalMatrix(normal);set.nor.push(v.x,v.y,v.z);set.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
      }
      if(geo.index){for(const i of geo.index.array)set.idx.push(base+i);}else{for(let i=0;i<p.count;i++)set.idx.push(base+i);}
    });
    g.clear();
    for(const [material,s] of sets){
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(s.pos,3));geo.setAttribute('normal',new T.Float32BufferAttribute(s.nor,3));geo.setAttribute('uv',new T.Float32BufferAttribute(s.uv,2));geo.setIndex(s.idx);geo.computeBoundingSphere();mesh(g,geo,material);
    }
    return g;
  }
  function bolts(p,y,r,count,size,m){for(let i=0;i<count;i++){let a=i*tau/count;const b=cyl(p,Math.sin(a)*r,y,Math.cos(a)*r,size,size,.035,m,6);b.rotation.y=a;}}
  function skirt(p,y,h,r,count,m,width=.048){
    for(let i=0;i<count;i++){const a=i*tau/count;const o=box(p,Math.sin(a)*r,y,Math.cos(a)*r,width,h,.046,m);o.rotation.y=a;}
  }
  function stripe(p,y,h,r,m,start=0,span=tau){lathe(p,[[r,y-h/2],[r,y+h/2]],m,Math.max(4,Math.ceil(64*span/tau)),start,span);}
  function badge(p,r,y,phi){
    const surf=(x,dy,raise)=>{const a=phi+x/r;return [Math.sin(a)*(r+raise),y+dy,Math.cos(a)*(r+raise)];};
    const geo=new T.CircleGeometry(.49,64);const v=geo.attributes.position;
    for(let i=0;i<v.count;i++)v.setXYZ(i,...surf(v.getX(i),v.getY(i),.016));
    geo.computeVertexNormals();mesh(p,geo,M.orange);
    const path=[];for(let i=0;i<=56;i++){const a=i*tau/56;const u=.67*Math.cos(a),b=.15*Math.sin(a);path.push(surf(u*.87-b*.49,u*.49+b*.87,.039));}
    pipe(p,path,.025,M.pearl,64);
    const q=surf(.14,.23,.04);ell(p,...q,.048,.048,.035,M.pearl);
  }
  function rocket(scene){
    const vehicle=group(scene), lower=group(vehicle),core=group(vehicle), satellite=group(vehicle,0,17.05,0);
    lathe(lower,[[1.18,1.03],[1.38,1.72],[1.49,2.58],[1.49,10.86],[1.54,11.06],[1.54,11.58],[1.49,11.75]],M.hull);
    cyl(lower,0,1.7,0,1.39,1.11,1.26,M.graphite);
    stripe(lower,2.88,.78,1.50,M.graphite);
    for(let i=0;i<8;i++)stripe(lower,3.94,1.4,1.499,M.graphite,i*tau/8,.28);
    for(const y of [2.51,3.3,5.1,6.99,7.06,9.34,10.80,11.5])ring(lower,y,1.493,.018,M.seam);
    stripe(lower,10.94,.18,1.53,M.orange);
    skirt(lower,2.95,.76,1.514,68,M.metal,.024);
    const nozzles=[];
    function bell(g,x,y,z,r){
      const bg=group(g,x,y,z);
      lathe(bg,[[r*.86,.03],[r,.085],[r*.93,.27],[r*.59,.66],[r*.48,1.05]],M.graphite,40);
      cyl(bg,0,.12,0,r*.86,r*.89,.05,M.black,32);
      [.16,.25,.35,.48,.59].forEach((v,i)=>ring(bg,v,r*(.96-i*.073),.025,M.steel));
      return bg;
    }
    bell(lower,0,0,0,.83);nozzles.push([0,.09,0]);
    for(const side of [-1,1]){
      const pod=group(lower,side*1.79,0,.04),r=.655;
      lathe(pod,[[.46,.83],[.62,1.6],[r,2.1],[r,8.46],[.62,8.9],[.49,9.62],[.27,10.26],[.045,10.86],[.005,10.90]],M.pearl,48);
      cyl(pod,0,1.42,0,.62,.46,1.18,M.graphite);
      for(const y of [2.1,3.13,5.65,7.76,8.39])ring(pod,y,r,.017,M.seam);
      stripe(pod,7.91,.20,r+.006,M.orange);stripe(pod,7.68,.05,r+.009,M.graphite);
      skirt(pod,2.64,.91,r+.007,30,M.seam,.025);
      const fin=new T.Shape();fin.moveTo(0,0);fin.lineTo(side*.95,-.16);fin.lineTo(side*.82,.58);fin.lineTo(0,3.02);
      mesh(pod,new T.ExtrudeGeometry(fin,{depth:.13,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1}),M.graphite,side*.55,1.35,-.05);
      bell(pod,0,-.08,0,.49);nozzles.push([side*1.79,0,.04]);
      rod(lower,[side*1.28,6.8,.05],[side*1.83,7.1,.05],.135,M.steel);
    }
    for(const z of [-.83,.83]){bell(lower,0,.17,z,.36);nozzles.push([0,.21,z]);}
    // Service raceways, access covers and fasteners are raised from the shell.
    for(const a of [-.99,1.28,2.85]){
      const x=1.50*Math.sin(a),z=1.50*Math.cos(a);
      const o=box(lower,x,7.02,z,.13,6.7,.09,M.hull);o.rotation.y=a;
      for(let j=0;j<7;j++){const b=box(lower,x,4.22+j*.87,z,.17,.052,.12,M.seam);b.rotation.y=a;}
    }
    badge(lower,1.493,8.40,.20);
    stripe(lower,7.47,.06,1.497,M.seam,-.07,.55);
    lathe(core,[[1.17,11.62],[1.50,11.76],[1.50,15.48],[1.59,15.78],[1.69,16.03],[1.70,16.24]],M.pearl);
    stripe(core,12.20,.82,1.51,M.graphite);skirt(core,12.21,.76,1.526,64,M.steelDark,.040);
    for(let i=0;i<8;i++)stripe(core,12.83,.49,1.508,M.graphite,i*tau/8,.34);
    for(const y of [11.79,12.59,14.43,15.47])ring(core,y,1.507,.022,M.seam);
    stripe(core,15.32,.19,1.505,M.orange);ring(core,16.12,1.70,.055,M.steel);
    // Small access hatch with a recessed observation port.
    const hatch=group(core,0,13.94,1.50);plate(hatch,.66,.82,.045,.13,M.seam);
    plate(hatch,.57,.72,.07,.10,M.hull,0,0,.008);
    const port=cyl(hatch,0,.06,.076,.183,.183,.077,M.graphite);port.rotation.x=Math.PI/2;
    ell(hatch,0,.06,.119,.14,.14,.036,M.glass);
    bell(core,0,10.55,0,.71);
    let covers=[];
    for(let i=0;i<2;i++){
      const hinge=group(vehicle,0,16.19,0);
      const profile=[[1.69,0],[1.72,.23],[1.72,2.25],[1.66,2.86],[1.52,3.49],[1.31,4.08],[1.04,4.64],[.70,5.20],[.36,5.69],[.103,6.04],[.014,6.22]];
      lathe(hinge,profile,M.pearl,40,i*Math.PI,Math.PI);
      let inn=mat(0x87939a,.56,.65,{side:T.BackSide});lathe(hinge,profile.map(([r,y])=>[Math.max(.005,r-.052),y]),inn,36,i*Math.PI,Math.PI);
      for(const y of [.28,1.63,2.19])stripe(hinge,y,.025,1.724,M.seam,i*Math.PI,Math.PI);
      stripe(hinge,.53,.24,1.724,M.orange,i*Math.PI,Math.PI);
      for(let j=0;j<10;j++){let a=i*Math.PI+(j+.5)*Math.PI/10;ell(hinge,1.725*Math.sin(a),.97,1.725*Math.cos(a),.026,.034,.027,M.seam);}
      covers.push(bake(hinge));
    }
    box(satellite,0,.03,0,1.76,1.7,1.43,M.gold);
    const foil=mat(0xc3a65a,.37,.82,{flatShading:true});
    for(let i=0;i<12;i++){const o=mesh(satellite,new T.IcosahedronGeometry(.38),foil,(i%4-1.5)*.43,Math.floor(i/4)*.49-.49,.69);o.scale.set(.94,.87,.24);o.rotation.z=rand();}
    for(const side of [-1,1])box(satellite,side*.88,0,.72,.065,1.75,.08,M.metal);
    box(satellite,0,.91,0,1.92,.12,1.56,M.metal);
    cyl(satellite,0,1.13,0,.35,.29,.34,M.graphite);
    const dish=lathe(satellite,[[.01,1.16],[.31,1.2],[.57,1.33],[.68,1.44]],mat(0xcaccbe,.32,.76,{side:T.DoubleSide}),40);dish.rotation.z=-.16;
    rod(satellite,[0,1.17,0],[.03,1.86,.04],.027,M.metal);
    const panels=[],solar=mat(0x213a69,.22,.58),cell=mat(0x365589,.28,.6),grid=mat(0xa6aeaf,.4,.7);
    bake(satellite);
    for(let side=0;side<2;side++){
      const sign=side?1:-1,root=group(satellite,sign*.91,.14,0);
      const panel=(g)=>{
        box(g,sign*.87,0,0,1.74,.10,1.40,M.metal);
        for(let ix=0;ix<6;ix++)for(let iz=0;iz<4;iz++){const x=sign*(.045+(ix+.5)*.275),z=(iz-1.5)*.32;
          box(g,x,.062,z,.257,.024,.294,(ix+iz)%4===0?cell:solar);
          box(g,x,.079,z,.010,.008,.283,grid);
        }
        for(const z of [-.69,.69])box(g,sign*.87,.041,z,1.76,.045,.046,M.gold);
        bake(g);
      };
      panel(root);const outer=group(root,sign*1.75,0,0);panel(outer);panels[side]=root;panels[side+2]=outer;
    }
    bake(lower);bake(core);
    const upperBody=group(vehicle,0,17.05,0);
    upperBody.attach(core);for(const cover of covers)upperBody.attach(cover);
    return {vehicle,lower,core,satellite,upperBody,covers,panels,nozzles};
  }
  return {T,tau,rand,mat,M,group,mesh,box,ell,cyl,ring,lathe,rod,pipe,plate,bake,bolts,skirt,stripe,rocket};
})();
