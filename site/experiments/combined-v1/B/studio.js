'use strict';
const Studio = (() => {
  const T = THREE, V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(35,1,.07,44);
  const renderer = new T.WebGLRenderer({canvas:document.querySelector('canvas'), antialias:false, alpha:false, powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace; renderer.toneMapping=T.NoToneMapping;
  scene.background = new T.Color(0xcbd8d6);
  let seed=72339;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const noise=(x,y)=>{const n=Math.sin(x*91.32+y*47.35)*42758.62;return n-Math.floor(n)};
  function texture(fn,n=128,srgb=false) {
    const data=new Uint8Array(n*n*4);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const c=fn(x,y,n);const i=(y*n+x)*4;
      for(let j=0;j<3;j++)data[i+j]=Math.max(0,Math.min(255,Math.round(typeof c==='number'?c:c[j])));
      data[i+3]=255;
    }
    const tex=new T.DataTexture(data,n,n);tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;
    if(srgb)tex.colorSpace=T.SRGBColorSpace;tex.needsUpdate=true;return tex;
  }
  const rough=texture((x,y)=>245+10*noise(x,y),64);
  const mat=(color,roughness=.55,metalness=0,opts={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:rough,...opts});
  const woodMap=texture((x,y,n)=>{
    const a=x/n*2*Math.PI,b=y/n*2*Math.PI,w=Math.sin(a)*1.1+Math.sin(a*2+b)*.75;
    return 235+8*Math.sin(b*12+w*2)+4*Math.sin(b*34+w*3)+4*Math.sin(b*57+w*2)+5*noise(x,y);
  },256,true);
  const linenMap=texture((x,y)=>207+11*Math.cos(x*Math.PI*.5)+10*Math.cos(y*Math.PI*.5)+7*noise(x,y),128);
  linenMap.repeat.set(5,5);
  const M={
    china:mat(0xf5eddf,.20), ivory:mat(0xe7ddc9,.20), trim:mat(0x667569,.32),
    wood:mat(0xd1b28c,.55,0,{map:woodMap,bumpMap:woodMap,bumpScale:.007}),
    walnut:mat(0x99734d,.55,0,{map:woodMap}), metal:mat(0xd2d4d0,.24,.91), steel:mat(0x9a9d98,.32,.89),
    brass:mat(0xb19a6c,.31,.78), sage:mat(0x9caba1,.46), wall:mat(0xe5decd,.83),
    dark:mat(0x343932,.46), linen:mat(0xe7deca,.94,0,{bumpMap:linenMap,bumpScale:.009}),
    glass:new T.MeshPhysicalMaterial({color:0xe8f5f4,roughness:.09,metalness:.12,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide})
  };
  const ballGeo=new T.SphereGeometry(1,22,16), cube=new T.BoxGeometry(1,1,1);
  function obj(p=scene,x=0,y=0,z=0){const o=new T.Group();p.add(o);o.position.set(x,y,z);return o}
  function mesh(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o}
  function ball(p,x,y,z,a,b,c,m){const o=mesh(p,ballGeo,m,x,y,z);o.scale.set(a,b,c);return o}
  function box(p,x,y,z,w,h,d,m){const o=mesh(p,cube,m,x,y,z);o.scale.set(w,h,d);return o}
  function rounded(p,x,y,z,w,h,d,r,m){
    r=Math.min(r,w*.45,h*.45,d*.45);
    const s=new T.Shape();const a=w/2-r,b=d/2-r;
    s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,b);s.lineTo(-a,b);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:h-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:4,steps:1});
    g.rotateX(-Math.PI*.5);g.translate(0,-h/2+r,0);return mesh(p,g,m,x,y,z);
  }
  function lathe(p,x,y,z,profile,m,n=64){
    return mesh(p,new T.LatheGeometry(profile.map(q=>new T.Vector2(q[0],q[1])),n),m,x,y,z);
  }
  function tube(p,points,r,m,segments=20,sides=8){
    return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(q=>q.isVector3?q:V(...q))),segments,r,sides,false),m);
  }
  function rod(p,a,b,r,m,tip=r){
    a=V(...a);b=V(...b);const v=b.clone().sub(a),c=a.clone().lerp(b,.5);
    const o=mesh(p,new T.CylinderGeometry(tip,r,v.length(),16),m,c.x,c.y,c.z);
    o.quaternion.setFromUnitVectors(V(0,1,0),v.normalize());return o;
  }
  function ring(p,x,y,z,rad,wire,m){
    const o=mesh(p,new T.TorusGeometry(rad,wire,10,80),m,x,y,z);o.rotation.x=Math.PI/2;return o;
  }
  function vessel(p,x,y,z,r,h,m=M.china) {
    const profile=[[.01,0],[.45,0],[.48,.06],[.48,.1],[.64,.18],[.82,.4],[.96,.74],[1,.96],[.994,1],[.959,1.012],[.944,.975],[.92,.77],[.78,.46],[.57,.23],[.30,.156],[.001,.14]];
    return lathe(p,x,y,z,profile.map(([a,b])=>[a*r,b*h]),m);
  }
  function plate(p,x,y,z,r){
    return lathe(p,x,y,z,[[.002,.018],[r*.49,.018],[r*.54,.004],[r*.58,.004],[r*.60,.036],[r*.83,.071],[r,.126],[r*1.004,.143],[r*.985,.155],[r*.93,.143],[r*.79,.095],[r*.60,.066],[.001,.066]],M.china,96);
  }
  // A radiance panorama supplies sky fill and actual mullioned window reflections.
  const ew=256,eh=128,envData=new Float32Array(ew*eh*4);
  for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){
    const u=x/ew,v=y/eh,win=u>.46&&u<.86&&v>.47&&v<.84;
    const bar=Math.abs((u-.46)% .133)<.008||Math.abs((v-.47)% .185)<.009;
    const k=win&&!bar?2.6: v>.65?.54:.31, i=(y*ew+x)*4;
    envData.set([k*(win?.91:1.03),k,k*(win?1.14:.90),1],i);
  }
  const envTex=new T.DataTexture(envData,ew,eh,T.RGBAFormat,T.FloatType);
  envTex.mapping=T.EquirectangularReflectionMapping;envTex.needsUpdate=true;
  const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(envTex);scene.environment=env.texture;scene.environmentIntensity=.72;envTex.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xe4f0ff,0xb7a28a,.38));
  const sun=new T.DirectionalLight(0xffecd5,2.55);sun.position.set(-5.2,6.4,-7);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:6,bottom:-6,far:28});
  sun.shadow.normalBias=.009;sun.shadow.bias=-.00016;scene.add(sun);
  // Joinery and a deep, glazed, divided-light kitchen window.
  box(scene,0,-2.03,0,26,.2,18,M.wood);
  const wz=-4.45;
  box(scene,-1,0,wz,20,1.85,.26,M.wall);
  box(scene,4.56,3.6,wz,5.12,6,.26,M.wall);box(scene,-8,3.6,wz,6,6,.26,M.wall);
  box(scene,-1.5,6,wz,8,1.4,.26,M.wall);
  const frame=mat(0xe1d9bf,.43),sky=mat(0xc9dbe0,.94,0,{emissive:0xcfdfdf,emissiveIntensity:.45});
  box(scene,-1.5,3.3,-8.75,15,8,.14,sky);
  // Soft masses of distant garden foliage, behind the glazing.
  const leafM=[0x8e9a71,0xa1ab7b,0xc4c69b,0xb4ba8c].map(c=>mat(c,.9));
  for(let n=0;n<29;n++)ball(scene,-6+rnd()*10,.38+rnd()*1.45,-7.2-rnd(),.38+rnd()*.82,.55+rnd()*.65,.44,leafM[n%4]);
  box(scene,-1.5,.97,wz+.04,7.28,.22,.55,frame);
  for(let i=0;i<5;i++){
    const x=-5+i*1.75;box(scene,x,3.09,wz,.095,4.22,.17,frame);
  }
  for(const y of [1.10,2.68,4.12,5.15])box(scene,-1.5,y,wz,7.06,.085,.18,frame);
  // Gathered linen panels put soft folds and narrow hems in front of the glass.
  rod(scene,[-5.14,5.27,wz+.15],[2.16,5.27,wz+.15],.028,M.brass);
  const curtainMat=mat(0xeee8d7,.98,0,{side:T.DoubleSide,bumpMap:linenMap,bumpScale:.004});
  for(const side of [-1,1]){
    const ox=side<0?-5.08:2.08,clothGeo=new T.PlaneGeometry(1,1,52,34);
    const points=clothGeo.attributes.position;
    for(let i=0;i<points.count;i++){
      const u=points.getX(i)+.5,v=points.getY(i)+.5;
      const gathered=Math.exp(-((v-.34)**2)/.021);
      const breadth=.86-.50*gathered+.10*(1-v);
      points.setXYZ(i,ox-side*u*breadth,1.25+v*3.91+.036*Math.cos(u*33)*(1-v),
        wz+.23+.084*Math.cos(u*33+.72*Math.sin(5*v))*(1-.51*gathered));
    }
    clothGeo.computeVertexNormals();mesh(scene,clothGeo,curtainMat);
    const band=mat(0xc2b6a0,.84);
    tube(scene,[[ox,2.54,wz+.23],[ox-side*.13,2.52,wz+.32],[ox-side*.29,2.58,wz+.30],[ox-side*.39,2.61,wz+.23]],.025,band);
    for(let i=0;i<7;i++){
      const loop=mesh(scene,new T.TorusGeometry(.055,.008,6,16),M.brass,ox-side*i*.14,5.22,wz+.15);loop.rotation.y=Math.PI*.5;
    }
  }
  for(const x of [-3.25,.25]){
    rounded(scene,x,2.62,wz+.102,.070,.125,.020,.008,M.brass);
    rod(scene,[x,2.64,wz+.11],[x+.13,2.68,wz+.16],.014,M.brass);
  }
  // Counter split around the recessed sink.
  const sy=-.12, front=1.52, back=-1.65;
  box(scene,1.65,sy,.282,10.6,.24,2.476,M.wood);
  box(scene,-5.64,sy,-.065,1.28,.24,front-back,M.wood);
  for(const [z,d] of [[1.03,.98],[-1.29,.72]])box(scene,-4.325,sy,z,1.35,.24,d,M.wood);
  for(let i=-3;i<4;i++){
    const x=i*1.93;box(scene,x,-1.07,.284,1.90,1.63,2.39,M.sage);
    rounded(scene,x,-.96,1.487,1.77,1.35,.055,.014,M.sage);
    box(scene,x,-.49,1.53,.24,.034,.075,M.brass);
  }
  box(scene,4.85,sy,-1.22,4.2,.24,.54,M.wood);
  const sink=obj(scene,-4.32,-.39,-.20);
  rounded(sink,0,0,0,1.37,.13,1.62,.06,M.china);
  for(const side of [-1,1]){
    box(sink,side*.648,.19,0,.08,.4,1.65,M.china);box(sink,0,.19,side*.79,1.35,.4,.08,M.china);
  }
  lathe(sink,0,.078,0,[[.001,0],[.13,0],[.12,.009],[.001,.009]],M.steel);
  tube(scene,[[-4.33,0,-1.22],[-4.33,.75,-1.22],[-4.33,1,-1.01],[-4.33,.96,-.65],[-4.33,.83,-.58]],.055,M.metal);
  rod(scene,[-4.72,.02,-1.17],[-4.72,.24,-1.17],.08,M.china);
  rod(scene,[-4.86,.24,-1.17],[-4.58,.24,-1.17],.028,M.metal);
  rod(scene,[-6.23,-.075,1.50],[6.90,-.075,1.50],.045,M.wood);
  // Open shelving, stacked pottery, small spice canisters.
  for(const y of [2.12,3.52]){
    box(scene,4.92,y,-4.04,5.7,.115,.67,M.wood);
    for(let j=0;j<8;j++){const x=2.55+j*.58;
      if(j%3===1) for(let k=0;k<3;k++)vessel(scene,x,y+.06+k*.084,-4.04,.30,.22,M.ivory);
      else {const hh=.30+.21*rnd();lathe(scene,x,y+.06,-4.04,[[.01,0],[.19,0],[.21,.05],[.21,hh],[.175,hh+.04],[.15,hh+.055],[.01,hh+.055]],j%2?M.ivory:M.sage);lathe(scene,x,y+hh+.115,-4.04,[[.01,0],[.17,0],[.17,.045],[.01,.055]],M.walnut);}
    }
  }
  // Ribbed terracotta pot and a branching culinary herb on the sill.
  const plant=obj(scene,-3.82,1.09,-4.04),pot=mat(0xb38d72,.72);
  lathe(plant,0,0,0,[[.01,0],[.19,0],[.265,.36],[.28,.38],[.28,.43],[.235,.43],[.22,.39],[.01,.38]],pot);
  for(let i=0;i<13;i++){
    const a=rnd()*6.28,dx=Math.cos(a)*rnd()*.32,dz=Math.sin(a)*rnd()*.22,h=.73+rnd()*.40;
    rod(plant,[0,.38,0],[dx,h,dz],.009,leafM[0],.005);
    for(let j=1;j<5;j++){const f=j/4,le=ball(plant,dx*f+Math.cos(a+j)*.052,.38+(h-.38)*f,dz*f+Math.sin(a+j)*.046,.045,.087,.018,leafM[(i+j)%4]);le.rotation.set(.5,a+j,.7);}
  }
  function cloth(p,x,y,z,w,d,fold=true){
    const g=new T.PlaneGeometry(w,d,60,42);g.rotateX(-Math.PI/2);
    const a=g.attributes.position,col=[],base=new T.Color(0xe9e2cc),stripe=new T.Color(0x85938a);
    for(let i=0;i<a.count;i++){
      const xx=a.getX(i),zz=a.getZ(i),u=(xx/w+.5),v=zz/d+.5;
      a.setY(i,.011*Math.sin(xx*26+zz*3)+.008*Math.sin(zz*29+xx*4)+(fold?.031*Math.cos(xx*11+zz*1.8):0));
      const line=(u>.073&&u<.095)||(u>.117&&u<.13)||(u>.87&&u<.883)||(u>.905&&u<.927);
      const c=line?stripe:base;col.push(c.r,c.g,c.b);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();
    const m=mat(0xffffff,.92,0,{side:T.DoubleSide,vertexColors:true,bumpMap:linenMap,bumpScale:.008});
    return mesh(p,g,m,x,y,z);
  }
  const towel=cloth(scene,-1.83,.045,.33,2.24,1.62);towel.rotation.y=-.18;
  const servingCloth=cloth(scene,4.45,.049,.18,2.07,1.93);servingCloth.rotation.y=.16;
  // Accurate depth in both directions of the current focus plane.
  const rt=new T.WebGLRenderTarget(2,2,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true});
  rt.depthTexture=new T.DepthTexture(2,2,T.UnsignedIntType);
  const fxScene=new T.Scene(),fxCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const fx=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{
    beauty:{value:rt.texture},depthTex:{value:rt.depthTexture},pixel:{value:new T.Vector2()},focus:{value:4},nearZ:{value:camera.near},farZ:{value:camera.far}
  },vertexShader:'varying vec2 coord; void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
    varying vec2 coord;
    uniform sampler2D beauty,depthTex;uniform vec2 pixel;uniform float focus,nearZ,farZ;
    float depthAt(vec2 uv){return nearZ*farZ/(farZ-texture2D(depthTex,uv).r*(farZ-nearZ));}
    void main(){
      float d=depthAt(coord),coc=min(7.0,abs(d-focus)/d*11.0);
      vec3 center=texture2D(beauty,coord).rgb,col=center*2.,glow=max(center-1.04,0.); float weight=2.;
      for(int i=0;i<16;i++){float a=float(i)*2.399963,r=sqrt((float(i)+.5)/16.);
        vec2 dir=vec2(cos(a),sin(a))*r*pixel;
        vec2 uv=coord+dir*(.48+coc);
        float sampleD=depthAt(uv),w=1.-.90*smoothstep(.16,.95,d-sampleD);
        col+=texture2D(beauty,uv).rgb*w;weight+=w;
        if(i<8)glow+=max(texture2D(beauty,coord+dir*13.).rgb-1.04,0.);
      }
      col=col/weight+glow*.0033;
      col*=1.-.095*dot((coord-.5)*1.46,(coord-.5)*1.46);
      col=col*(2.51*col+.03)/(col*(2.43*col+.59)+.14);
      col=clamp(col,0.,1.);col=mix(1.055*pow(col,vec3(1./2.4))-.055,col*12.92,lessThanEqual(col,vec3(.0031308)));
      col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.54)-.5)*.005;
      gl_FragColor=vec4(col,1.);
    }`});
  fxScene.add(new T.Mesh(new T.PlaneGeometry(2,2),fx));
  function resize(){
    const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.65,Math.sqrt(1600000/(w*h)));
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    rt.setSize(Math.floor(w*dpr),Math.floor(h*dpr));fx.uniforms.pixel.value.set(1/rt.width,1/rt.height);
  }
  resize();addEventListener('resize',resize);
  function draw(focus){fx.uniforms.focus.value=-focus.clone().applyMatrix4(camera.matrixWorldInverse).z;
    renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(fxScene,fxCam);}
  function batch(parent) {
    parent.updateWorldMatrix(true,true);
    const groups=new Map(),inverse=parent.matrixWorld.clone().invert();
    parent.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||o.children.length||Array.isArray(o.material))return;
      const m=o.material;
      if(!groups.has(m))groups.set(m,[]);
      groups.get(m).push(o);
    });
    for(const [m,list] of groups){
      if(list.length<2)continue;
      const points=[],normals=[],uv=[],colors=[],indices=[];
      for(const o of list){
        const g=o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
        const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,c=g.attributes.color,base=points.length/3;
        for(let i=0;i<p.count;i++){
          points.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));
          uv.push(u?u.getX(i):0,u?u.getY(i):0);if(m.vertexColors)colors.push(c?c.getX(i):1,c?c.getY(i):1,c?c.getZ(i):1);
        }
        for(let i=0;i<(g.index?g.index.count:p.count);i++)indices.push(base+(g.index?g.index.getX(i):i));
        g.dispose();o.removeFromParent();
      }
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      if(colors.length)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      g.setIndex(indices);mesh(parent,g,m);
    }
  }
  batch(scene);
  return {T,V,scene,camera,M,batch,mat,texture,rough,rnd,noise,obj,mesh,ball,box,rounded,lathe,tube,rod,ring,vessel,plate,cloth,draw};
})();
