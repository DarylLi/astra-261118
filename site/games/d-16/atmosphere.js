'use strict';
const SkyNoise=`
float fieldHash(vec3 p){
 p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
}
float siteNoise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(fieldHash(i),fieldHash(i+vec3(1,0,0)),f.x),mix(fieldHash(i+vec3(0,1,0)),fieldHash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(fieldHash(i+vec3(0,0,1)),fieldHash(i+vec3(1,0,1)),f.x),mix(fieldHash(i+vec3(0,1,1)),fieldHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float field(vec3 p){
 return siteNoise(p)*.53+siteNoise(p*2.04+5.3)*.266+siteNoise(p*4.15+11.4)*.133+siteNoise(p*8.47+18.7)*.071;
}
`;
function environmentMap(){
  const {T}=Art,w=256,h=128,data=new Uint8Array(w*h*4);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const e=(j/(h-1)-.5)*Math.PI,a=i/w*Math.PI*2,sy=Math.sin(e);
    const glint=Math.exp(-((Math.cos(a+1.27)-1)**2)*42)*Math.exp(-((sy-.09)**2)*31);
    const near=Math.exp(-Math.abs(sy)*4);
    const top=sy>0?[117,153,187]:[42,53,62];
    const rgb=top.map((v,c)=>v*(1-near)+[222,208,187][c]*near+[35,29,20][c]*glint);
    const n=(i+j*w)*4;data[n]=rgb[0];data[n+1]=rgb[1];data[n+2]=rgb[2];data[n+3]=255;
  }
  const t=new T.DataTexture(data,w,h);t.mapping=T.EquirectangularReflectionMapping;t.colorSpace=T.SRGBColorSpace;t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
}
function buildAtmosphere(scene) {
  const {T,mat,mesh,group,rand,bake}=Art, smooth=RocketFlight.smooth;
  const U={sun:{value:new T.Vector3()},space:{value:0},drift:{value:0},travel:{value:0},chop:{value:0},rise:{value:0},waveBand:{value:new Float32Array(32)}};
  const shared='uniform vec3 sun; uniform float space,drift,travel,chop,rise;\n';
  const inject=(sh)=>Object.assign(sh.uniforms,U);
  const skyMat=mat(0xffffff,1,0,{side:T.BackSide,depthWrite:false,fog:false});
  skyMat.onBeforeCompile=sh=>{
    inject(sh);sh.vertexShader='varying vec3 eyeRay;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\neyeRay=position;');
    sh.fragmentShader='varying vec3 eyeRay;\n'+shared+SkyNoise+sh.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 dir=normalize(eyeRay);
      float el=dir.y,distSun=length(dir-sun);
      vec3 horizon=mix(vec3(.68,.64,.66),vec3(.99,.72,.52),exp(-distSun*2.1));
      vec3 sky=mix(horizon,vec3(.43,.52,.64),smoothstep(-.015,.147,el));
      sky=mix(sky,vec3(.165,.235,.337),smoothstep(.072,.54,el));
      sky=mix(sky,vec3(.056,.107,.185),smoothstep(.35,.98,el));
      vec2 cloudUV=dir.xz/(max(.00,el)+.087);
      // Sheared cloud layers at two elevations; wind advects the density field.
      vec3 coord=vec3(cloudUV.x*.94+drift*.0008,cloudUV.y*3.6,3.83);
      float cloud=field(coord);
      float band=smoothstep(-.015,.043,el)*(1.-smoothstep(.20,.52,el));
      float body=smoothstep(.455,.72,cloud)*band;
      vec3 cloudColor=mix(vec3(.70,.64,.64),vec3(.37,.42,.51),smoothstep(.04,.25,el));
      cloudColor+=vec3(.155,.077,.025)*(1.-smoothstep(.05,.26,el))*exp(-distSun*.85);
      sky=mix(sky,cloudColor,body*.70);
      float wisps=field(vec3(cloudUV.x*2.1+drift*.00057,cloudUV.y*12.3,11.7));
      sky+=vec3(.113,.093,.085)*smoothstep(.57,.76,wisps)*band;
      sky=mix(sky,vec3(.018,.032,.068)+vec3(.014,.017,.022)*field(dir*7.),space);
      vec2 st=vec2(atan(dir.z,dir.x),asin(dir.y))*215.;
      vec2 id=floor(st);float star=fieldHash(vec3(id,5.2));
      vec2 off=vec2(fieldHash(vec3(id,1.)),fieldHash(vec3(id,2.)))*.6+.2;
      float spot=1.-smoothstep(.017,.168,length(fract(st)-off));
      sky+=vec3(.55,.61,.71)*spot*step(.914,star)*(.2+.8*star)*(smoothstep(.12,.46,el)*(1.-space)*.48+space*.92);
      float halo=exp(-distSun*(29.-15.*space));
      sky+=vec3(.29,.14,.054)*halo;
      outgoingLight=pow(max(sky,vec3(.001)),vec3(2.2));
      outgoingLight+=vec3(2.6,1.38,.62)*(1.-smoothstep(.010,.012,distSun));
      outgoingLight+=vec3(.43,.22,.07)*exp(-distSun*101.);
      #include <opaque_fragment>`);
  };
  const sky=mesh(scene,new T.SphereGeometry(4400,44,28),skyMat);sky.castShadow=sky.receiveShadow=false;sky.frustumCulled=false;sky.renderOrder=-100;
  const seaMat=mat(0x344b62,.24,.52,{fog:false,transparent:true});
  seaMat.onBeforeCompile=sh=>{
    inject(sh);sh.vertexShader=shared+'uniform float waveBand[32]; varying vec3 waterWorld;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float coord=mod((position.x+position.z*.41)*.14+16.,32.);
      float wave=mix(waveBand[int(floor(coord))],waveBand[(int(floor(coord))+1)%32],smoothstep(0.,1.,fract(coord)));
      transformed.y+=wave+.08*sin(position.z*.116+travel*.69)+.038*sin(position.x*.19+position.z*.05-travel*.7);
      waterWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);
    sh.fragmentShader=shared+'varying vec3 waterWorld;\n'+SkyNoise+sh.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 q=waterWorld.xz;float farSea=length(cameraPosition-waterWorld);
      float n=siteNoise(vec3(q.x*.24,q.y*.53-travel*.31,3.));
      float detail=1.-smoothstep(59.,410.,farSea);
      float dx=.073*cos(q.x*.59+q.y*.15+travel*.95)+.037*detail*sin(q.x*2.2+travel);
      float dz=.115*cos(q.y*.71+q.x*.13-travel*1.1+n*5.)+.081*detail*cos(q.y*2.5+q.x*.33+travel*2.1);
      vec3 waterN=normalize(vec3(dx+n*.024,1.,dz));
      normal=normalize(mat3(viewMatrix)*waterN);`).replace('#include <opaque_fragment>',`
      vec3 v=normalize(cameraPosition-waterWorld);
      float grazing=pow(1.-max(0.,dot(v,waterN)),3.);
      float distant=1.-exp(-farSea*.0039);
      vec3 reflected=mix(vec3(.17,.246,.32),vec3(.68,.57,.53),distant*.82);
      float line=smoothstep(.20,.81,n)*.08*detail;
      outgoingLight=mix(outgoingLight,pow(reflected+line,vec3(2.2)),grazing*.86);
      vec3 halfV=normalize(sun+v);float sparkle=pow(max(0.,dot(halfV,waterN)),235.);
      outgoingLight+=vec3(.84,.43,.20)*sparkle*max(.25,grazing);
      #include <opaque_fragment>`);
  };
  const wg=new T.PlaneGeometry(1900,1900,95,95);wg.rotateX(-Math.PI/2);
  const water=mesh(scene,wg,seaMat,0,-2.7,-120);water.castShadow=false;
  // Distant headlands are ridged meshes with a true shoreline.
  const land=group(scene);
  function island(x,z,w,h,thickness,color){
    const p=[],idx=[],n=74,rows=6;let kn=rand();
    for(let j=0;j<rows;j++)for(let i=0;i<=n;i++){
      let u=i/n,k=j/(rows-1),shape=Math.pow(Math.sin(Math.PI*u),.72);
      let crags=.49+.23*Math.sin(u*11+kn*6)+.14*Math.sin(u*27+kn)+.07*Math.sin(u*62+kn);
      p.push(x+(u-.5)*w,-4+shape*crags*Math.sin(Math.PI*k)*h+rand()*.55,z+k*thickness+Math.sin(u*13+kn)*thickness*.19);
      if(i<n&&j<rows-1){let a=i+j*(n+1);idx.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
    mesh(land,g,mat(color,.94,.02,{side:T.DoubleSide,flatShading:true}));
  }
  island(-100,-245,240,23,30,0x727e90);island(19,-291,168,15,38,0x7d8390);island(193,-224,229,14,42,0x84858b);island(-102,-147,98,10,31,0x616f7d);
  bake(land);land.traverse(o=>{o.castShadow=false;});
  const R=1260,earthMat=mat(0x42647a,.68,.14,{fog:false});
  earthMat.onBeforeCompile=sh=>{
    inject(sh);sh.vertexShader='varying vec3 ePoint;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nePoint=position;');
    sh.fragmentShader=shared+'varying vec3 ePoint;\n'+SkyNoise+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=normalize(ePoint),q=p*4.7;
      float continents=field(q+2.32*vec3(siteNoise(q+1.),siteNoise(q+5.),siteNoise(q+9.)));
      float soil=smoothstep(.481,.511,continents);
      vec3 pigment=mix(vec3(.12,.27,.39),mix(vec3(.25,.355,.32),vec3(.43,.40,.30),field(q*5.)),soil);
      float clouds=field(vec3(p.x*11.+p.z*2.4,p.y*17.,p.z*12.)+2.1*vec3(field(q*2.),field(q*2.+5.),field(q+9.)));
      pigment=mix(pigment,vec3(.80,.83,.85),smoothstep(.52,.687,clouds)*.96);
      diffuseColor.rgb=pow(pigment,vec3(2.2));`).replace('#include <opaque_fragment>',`
      float edge=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.1);
      float toward=clamp(dot(normalize(ePoint),sun)*.6+.55,0.,1.);
      outgoingLight+=mix(vec3(.055,.19,.32),vec3(1.25,.49,.12),pow(toward,3.))*edge;
      #include <opaque_fragment>`);
  };
  const earth=mesh(scene,new T.SphereGeometry(R,128,80),earthMat,0,-R-3.1,0);earth.castShadow=earth.receiveShadow=false;
  const hazeMat=mat(0xaecff2,.6,0,{side:T.BackSide,transparent:true,depthWrite:false,fog:false});
  hazeMat.onBeforeCompile=sh=>{
    inject(sh);
    sh.fragmentShader=shared+sh.fragmentShader.replace('#include <opaque_fragment>',`
      float grazing=abs(dot(normalize(normal),normalize(vViewPosition)));
      float limb=exp(-grazing*grazing*130.);
      vec3 dir=normalize(inverseTransformDirection(-vViewPosition,viewMatrix));
      float warm=exp(-length(dir-sun)*5.);
      outgoingLight=mix(vec3(.13,.38,.66),vec3(2.1,.77,.22),warm);
      diffuseColor.a=limb*.76*space;
      #include <opaque_fragment>`);
  };
  const haze=mesh(scene,new T.SphereGeometry(R+10,128,72),hazeMat,0,-R-3.1,0);haze.castShadow=haze.receiveShadow=false;haze.renderOrder=1;
  const moonMat=mat(0xb9c3cb,.93,.015,{fog:false});
  moonMat.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 moonPt;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmoonPt=position;');
    sh.fragmentShader='varying vec3 moonPt;\n'+SkyNoise+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.53+.45*field(moonPt*1.65);');};
  const moon=mesh(scene,new T.SphereGeometry(8.7,32,24),moonMat);moon.castShadow=moon.receiveShadow=false;
  function vaporMaterial(){
    const m=mat(0xd4d7da,.94,0,{transparent:true,depthWrite:false,fog:false});
    m.onBeforeCompile=sh=>{
      sh.vertexShader='attribute float density; varying float puffAlpha; varying vec3 puffLocal;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npuffAlpha=density;puffLocal=position;');
      sh.fragmentShader='varying float puffAlpha; varying vec3 puffLocal;\n'+SkyNoise+sh.fragmentShader.replace('#include <opaque_fragment>',`
        float facing=max(0.,dot(normalize(normal),normalize(vViewPosition)));
        float f=field(puffLocal*2.4+vec3(1.,3.,.4));
        diffuseColor.a=puffAlpha*pow(facing,1.65)*smoothstep(.24,.70,f);
        outgoingLight=mix(outgoingLight,vec3(.59,.65,.69),.51);
        #include <opaque_fragment>`);
    };return m;
  }
  const pg=new T.SphereGeometry(1,14,10),den=new T.InstancedBufferAttribute(new Float32Array(80),1);pg.setAttribute('density',den);
  const vapor=new T.InstancedMesh(pg,vaporMaterial(),80);scene.add(vapor);vapor.frustumCulled=false;vapor.renderOrder=3;
  const cloudGeo=new T.SphereGeometry(1,18,12),ca=new Float32Array(48);ca.fill(.79);cloudGeo.setAttribute('density',new T.InstancedBufferAttribute(ca,1));
  const bank=new T.InstancedMesh(cloudGeo,vaporMaterial(),48);bank.frustumCulled=false;scene.add(bank);bank.renderOrder=2;
  const cloudLayout=Array.from({length:48},()=>[rand()*150-75,57+rand()*31,rand()*110-65,13+rand()*23,4+rand()*5,12+rand()*15]);
  const saltGeo=new T.IcosahedronGeometry(1,0);
  const salt=new T.InstancedMesh(saltGeo,mat(0xe8e4ce,.34,.17),28);salt.frustumCulled=false;scene.add(salt);
  const dummy=new T.Object3D();
  function update(s,camera,aspect){
    const space=smooth(70,770,s.altitude);U.space.value=space;U.travel.value=s.seaTravel;U.drift.value=s.drift;U.rise.value=s.lookDown;
    const sx=aspect<.75?-.067:.12;
    const horizon=Math.sqrt(Math.max(0,1-(R/(R+Math.max(0,camera.position.y)+3.1))**2));
    const orbitalX=aspect<.75?.040:.16, sy=.029*(1-space)+(-horizon-.010+.027*s.lookDown)*space;
    const flat=Math.sqrt(1-sy*sy);U.sun.value.set((sx*(1-space)+orbitalX*space)*flat,sy,-flat).normalize();
    sky.position.copy(camera.position);earth.rotation.x=-s.orbitAngle;
    moon.position.copy(camera.position).add(new T.Vector3(aspect<.75?-.37:-.56,.34,-1).normalize().multiplyScalar(1420));moon.visible=space<.65;
    for(let i=0;i<32;i++)U.waveBand.value[i]=s.waves[i].h;
    water.visible=s.altitude<270;seaMat.opacity=1-smooth(90,270,s.altitude);
    land.visible=s.altitude<720;haze.visible=space>.005;
    salt.visible=s.altitude<55;
    if(salt.visible){s.salt.forEach((g,i)=>{
      dummy.position.set(g.x,g.y,g.z);dummy.rotation.set(0,i,g.age*.13);dummy.scale.setScalar(g.radius*g.alpha*1.8);
      dummy.updateMatrix();salt.setMatrixAt(i,dummy.matrix);
    });salt.instanceMatrix.needsUpdate=true;}
    vapor.visible=s.altitude<69;
    if(vapor.visible){
      s.vapor.forEach((p,i)=>{dummy.position.set(p.x,2.58+p.y,p.z+.4);dummy.rotation.set(.23,p.rotation,.093);dummy.scale.set(p.radius*1.95,p.radius*.78,p.radius*1.32);dummy.updateMatrix();vapor.setMatrixAt(i,dummy.matrix);den.setX(i,p.density*.98);});den.needsUpdate=true;vapor.instanceMatrix.needsUpdate=true;
    }
    bank.visible=s.altitude>15&&s.altitude<225;
    if(bank.visible){const f=smooth(15,43,s.altitude)*(1-smooth(130,225,s.altitude));
      cloudLayout.forEach(([x,y,z,rx,ry,rz],i)=>{dummy.position.set(x+s.drift*(.08+(i%5)*.008),y,z);dummy.rotation.set(.1,i,.08);dummy.scale.set(rx,ry,rz);dummy.updateMatrix();bank.setMatrixAt(i,dummy.matrix);cloudGeo.attributes.density.setX(i,.88*f);});
      bank.instanceMatrix.needsUpdate=true;cloudGeo.attributes.density.needsUpdate=true;
    }
  }
  return {update,U};
}
