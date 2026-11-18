/* Procedural geometry and surface finishes for the morning kitchen. */
const Studio = (() => {
  const T=THREE, PI=Math.PI, TAU=PI*2;
  let seed=82173;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function group(parent,x=0,y=0,z=0){const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;}
  function texture(w,h,draw,color=true) {
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    draw(canvas.getContext('2d'),w,h);
    const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;
    if(color)tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
  }
  const grain=texture(192,192,(ctx,w,h)=>{
    const d=ctx.createImageData(w,h);
    for(let i=0;i<w*h;i++){const n=225+28*rand();d.data.set([n,n,n,255],i*4);}
    ctx.putImageData(d,0,0);
  },false);
  function mat(col,rough=.55,metal=0,opt={}){
    return new T.MeshStandardMaterial({color:col,roughness:rough,metalness:metal,roughnessMap:grain,...opt});
  }
  function glaze(col,rough=.17,coat=.45,opt={}) {
    return new T.MeshPhysicalMaterial({color:col,roughness:rough,roughnessMap:grain,clearcoat:coat,clearcoatRoughness:.13,...opt});
  }
  function mesh(parent,geo,m,x=0,y=0,z=0){
    const o=new T.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);o.castShadow=true;o.receiveShadow=true;return o;
  }
  const sphereG=new T.SphereGeometry(1,28,20);
  const smallSphere=new T.SphereGeometry(1,14,10);
  const boxG=new T.BoxGeometry(1,1,1);
  function ball(g,x,y,z,a,b,c,m){const o=mesh(g,Math.max(a,b,c)<.145?smallSphere:sphereG,m,x,y,z);o.scale.set(a,b,c);return o;}
  function box(g,x,y,z,a,b,c,m){const o=mesh(g,boxG,m,x,y,z);o.scale.set(a,b,c);return o;}
  function rounded(g,x,y,z,w,h,d,r,m){
    const s=new T.Shape(),a=w/2-r,b=h/2-r;
    s.moveTo(-a,-h/2);s.lineTo(a,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-b);
    s.lineTo(w/2,b);s.quadraticCurveTo(w/2,h/2,a,h/2);s.lineTo(-a,h/2);
    s.quadraticCurveTo(-w/2,h/2,-w/2,b);s.lineTo(-w/2,-b);s.quadraticCurveTo(-w/2,-h/2,-a,-h/2);
    const bevel=Math.min(r*0.45,d*0.21);
    const geo=new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:5});
    geo.translate(0,0,-d/2+bevel);
    return mesh(g,geo,m,x,y,z);
  }
  function lathe(g,x,y,z,profile,m,n=80){
    return mesh(g,new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(Math.max(.0001,r),h)),n),m,x,y,z);
  }
  function tube(g,points,r,m,n=20,sides=8){
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return mesh(g,new T.TubeGeometry(path,n,r,sides,false),m);
  }
  function ring(g,x,y,z,r,t,m){
    const o=mesh(g,new T.TorusGeometry(r,t,9,80),m,x,y,z);o.rotation.x=PI/2;return o;
  }
  function rod(g,a,b,r,m,r2=r){
    const v=new T.Vector3(...a),w=new T.Vector3(...b),delta=w.clone().sub(v);
    const o=mesh(g,new T.CylinderGeometry(r2,r,delta.length(),16),m);
    o.position.copy(v.add(w).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
  }
  const woodMap=texture(768,384,(c,w,h)=>{
    c.fillStyle='#d6b58e';c.fillRect(0,0,w,h);
    for(let plank=0;plank<6;plank++){
      const v=Math.floor(rand()*13);
      c.fillStyle='rgb('+[214+v,181+v,143+v].join(',')+')';c.fillRect(0,plank*64,w,64);
      c.fillStyle='rgba(83,54,28,.23)';c.fillRect(0,plank*64,w,1.5);
    }
    for(let i=0;i<1500;i++){
      const y=rand()*h, x=rand()*w, len=5+rand()*w, wave=2+rand()*5;
      c.beginPath(); c.moveTo(x,y);
      for(let j=1;j<=12;j++)c.lineTo(x+len*j/12,y+Math.sin(j*.46+y*.08)*wave*j/14);
      c.strokeStyle=rand()>.38?'rgba(109,72,43,.105)':'rgba(255,239,197,.32)';
      c.lineWidth=.3+rand()*1.8;c.stroke();
    }
  });
  function cloth(base,stripe,style='stripe'){
    const map=texture(256,256,(c,w,h)=>{
      c.fillStyle=base;c.fillRect(0,0,w,h);
      c.fillStyle=stripe;
      for(const x of [18,30,204,216])c.fillRect(x,0,4,h);
      c.fillRect(36,0,8,h);c.fillRect(190,0,8,h);
      if(style==='check'){c.globalAlpha=.25;for(let i=0;i<256;i+=32){c.fillRect(i,0,14,h);c.fillRect(0,i,w,14);}c.globalAlpha=1;}
      for(let i=0;i<256;i+=2){c.strokeStyle=i%4?'rgba(53,42,36,.07)':'rgba(255,253,239,.16)';c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.moveTo(0,i);c.lineTo(w,i);c.stroke();}
    });
    return mat(0xffffff,.89,0,{map,bumpMap:grain,bumpScale:.0015});
  }
  const M={
    porcelain:mat(0xfff2d5,.2), white:mat(0xfff8e8,.2), blue:mat(0x354d76,.28),
    wood:mat(0xffffff,.55,0,{map:woodMap,bumpMap:woodMap,bumpScale:.007}),
    oak:mat(0xb88755,.55,0,{map:woodMap}), walnut:mat(0x815133,.55,0,{map:woodMap}),
    steel:mat(0xc3ced3,.23,.91),brass:mat(0xb19251,.31,.78),iron:mat(0x373b3a,.46,.74),
    sage:mat(0x91a891,.52), trim:mat(0xf2dfba,.43),wall:mat(0xe1cfb4,.88), leaf:mat(0x697d42,.69),
    linen:cloth('#d2dcde','#426c89'), ochre:mat(0xbe793e,.54)
  };
  function env(scene,renderer){
    const w=192,h=96,data=new Float32Array(w*h*4);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const y=Math.sin((j/h-.5)*PI),a=(i/w-.5)*TAU;
      const sky=Math.max(0,y);
      let rgb=[.40+.29*sky,.37+.40*sky,.32+.55*sky];
      const wall=Math.cos(a+1.8), u=Math.sin(a+1.8)/Math.max(.05,wall),v=y/Math.max(.05,wall);
      if(wall>0&&Math.abs(u)<1.16&&v>-.09&&v<.95){
        const bar=Math.abs(u)<.035||Math.abs(v-.43)<.028;
        rgb=bar?[.7,.64,.52]:[3.3+v,3.8+v,4.25+v];
      }
      if(y<-.22)rgb=[.51,.36,.24];data.set([...rgb,1],4*(j*w+i));
    }
    const e=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);
    e.mapping=T.EquirectangularReflectionMapping;e.needsUpdate=true;
    const pm=new T.PMREMGenerator(renderer); const target=pm.fromEquirectangular(e);scene.environment=target.texture;
    e.dispose();pm.dispose();scene.environmentIntensity=.69;
  }
  function bunch(g,x,y,z,scale=1){
    const p=group(g,x,y,z);p.scale.setScalar(scale);
    const pot=mat(0xb37653,.64);
    lathe(p,0,0,0,[[.12,0],[.145,.025],[.17,.23],[.19,.238],[.19,.277],[.16,.277],[.155,.24]],pot,40);
    ball(p,0,.248,0,.16,.018,.16,mat(0x604637,.95));
    const leaves=[mat(0x769247,.71),mat(0x526f37,.64),mat(0x879b52,.68)];
    for(let i=0;i<16;i++){
      const a=i*2.399,hi=.43+rand()*.24,r=.1+rand()*.16;
      const end=[Math.cos(a)*r,hi,Math.sin(a)*r];
      rod(p,[0,.24,0],end,.0055,leaves[1]);
      for(let k=1;k<4;k++){
        const f=.32+k*.2;
        const l=ball(p,end[0]*f+.026*Math.cos(a+k),.24+(hi-.24)*f,end[2]*f+.035*Math.sin(a+k),.045,.013,.081,leaves[(i+k)%3]);
        l.rotation.set(.38,a+k*2,.35);
      }
    }
  }
  function room(scene){
    box(scene,0,2,-4.7,18,9,.16,M.wall);
    box(scene,0,-.18,-3.81,13,.13,1.0,M.wood);
    box(scene,0,-1,-4.04,13,1.67,.7,M.sage);
    // Individual glazed tiles, with narrow ivory grout joints.
    const tiles=Array.from({length:6},()=>mat(new T.Color().setHSL(.12+rand()*.02,.14+rand()*.09,.78+rand()*.055),.28));
    for(let row=0;row<5;row++){
      for(let i=-10;i<11;i++){
        box(scene,i*.67+(row%2)*.335,-.06+row*.251,-4.56,.663,.245,.035,tiles[Math.floor(rand()*tiles.length)]);
      }
    }
    const win=group(scene,.47,.79,-4.48),ww=3.45,hh=2.65;
    box(win,0,hh/2,-.12,ww,hh,.055,mat(0xc6ded9,.88,0,{emissive:0xb9d9da,emissiveIntensity:.35}));
    const treeColors=[0x90a477,0xa4b483,0x729377,0xc7c89a,0x829f79].map(c=>mat(c,.85));
    for(let i=0;i<52;i++){
      const x=(rand()-.5)*(ww-.26),y=.12+rand()*.8+Math.abs(x)*.22;
      ball(win,x,y,-.07,.14+rand()*.18,.14+rand()*.25,.04,treeColors[i%5]);
    }
    for(let i=0;i<4;i++)box(win,-ww/2+i*ww/3,hh/2,.018,i===0||i===3?.096:.055,hh,.11,M.trim);
    for(const y of [0,hh*.53,hh])box(win,0,y,.028,ww+.09,.072,.13,M.trim);
    box(win,0,-.028,.085,ww+.28,.105,.33,M.wood);
    const curtain=cloth('#e6ddc7','#bc9a79');
    for(let side of [-1,1]){
      const geo=new T.PlaneGeometry(.43,hh+.12,24,12),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,x*(.67+.24*Math.cos(y*2))+side*.04*Math.cos(y*2),y+.015*Math.cos(x*45),.06*Math.cos(x*54));}
      geo.computeVertexNormals();curtain.side=T.DoubleSide;mesh(win,geo,curtain,side*ww*.49,hh*.5,.15);
    }
    bunch(win,-1.26,.036,.12,.82);
    // Small open china hutch, rail and cutting boards.
    const shelf=group(scene,-2.77,1.3,-4.38);
    box(shelf,0,.62,-.12,1.7,1.55,.12,M.sage);
    for(const y of [0,.68,1.42])box(shelf,0,y,.04,1.8,.075,.49,M.oak);
    for(const x of [-.85,.85])box(shelf,x,.70,.045,.075,1.47,.48,M.oak);
    for(let i=0;i<5;i++)lathe(shelf,-.51+i*.24,.72,0,[[.07,0],[.087,.014],[.103,.199],[.102,.208],[.087,.206],[.081,.025]],i%2?M.white:M.blue,32);
    for(let i=0;i<5;i++)lathe(shelf,-.24,.055+i*.064,.04,[[.13,0],[.21,.038],[.28,.13],[.267,.136],[.13,.047]],M.porcelain,48);
    for(let i=0;i<2;i++){
      const board=rounded(scene,2.64+i*.36,.4,-4.21+i*.08,.47,.87,.07,.085,i?M.oak:M.wood);
      board.rotation.z=i?.13:-.14;
    }
    bunch(scene,2.35,-.10,-3.62,1.3);
    // Broad uninterrupted oak island top and rebated edge.
    rounded(scene,0,-.115,.83,11,.195,3.47,.045,M.wood);
    box(scene,0,-.32,.83,10.95,.29,3.40,M.oak);
    box(scene,0,-1,.77,10.75,1.23,3.32,M.sage);
    const runner=group(scene,0,.001,1.05);runner.rotation.y=-.075;
    const g=new T.PlaneGeometry(1.95,2.92,40,54),pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=-pos.getY(i),edge=Math.max(0,z-1.30);
      pos.setXYZ(i,x,.013+.007*Math.sin(x*14+z*3)+.005*Math.sin(z*9+x*12)-edge*.94,z-edge*.69);
    }
    g.computeVertexNormals();M.linen.side=T.DoubleSide;mesh(runner,g,M.linen);
    return runner;
  }
  return {T,PI,TAU,rand,group,texture,mat,glaze,mesh,ball,box,rounded,lathe,tube,ring,rod,cloth,M,env,room,bunch,grain};
})();
