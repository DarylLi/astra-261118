window.HarborWater = function (T,scene,renderer,camera,models) {
  'use strict';
  const {texture}=models;
  // A procedurally lit sky doubles as the reflection environment for glass and fittings.
  function softNoise(x,y){
    const h=(i,j)=>{let s=Math.imul(i,374761393)+Math.imul(j,668265263);s=Math.imul(s^(s>>>13),1274126177);return ((s^(s>>>16))>>>0)/4294967295;};
    const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);
    return (h(i,j)*(1-a)+h(i+1,j)*a)*(1-b)+(h(i,j+1)*(1-a)+h(i+1,j+1)*a)*b;
  }
  function clouds(x,y){return .52*softNoise(x,y)+.268*softNoise(x*2.07+4,y*2.07)+.135*softNoise(x*4.19-3,y*4.19)+.068*softNoise(x*8.47,y*8.47+2);}
  const env=texture(1024,512,(u,v)=>{
    const lat=(v-.5)*Math.PI,lon=(u-.5)*Math.PI*2,y=Math.sin(lat),x=Math.cos(lat)*Math.cos(lon),z=Math.cos(lat)*Math.sin(lon);
    const high=1-Math.exp(-Math.max(0,y)*4.8),sunward=Math.max(0,-.72*x-.6*z);
    let r=221-91*high+sunward*7,g=226-52*high+sunward*3,b=218-22*high;
    if(y>0){
      const cx=x/(y+.13)*1.5+10,cz=z/(y+.13)*2.05+31,n=clouds(cx,cz);
      const layer=Math.min(.88,Math.max(0,(n-.49)*3.8))*Math.min(1,y*25)*Math.exp(-.3*y);
      const light=clouds(cx-.10,cz-.07)-n;
      r+=(247+light*45-r)*layer;g+=(241+light*50-g)*layer;b+=(222+light*53-b)*layer;
      const sun=Math.pow(Math.max(0,(-.57*x+.49*y-.66*z)),92);
      r+=sun*69;g+=sun*59;b+=sun*40;
    }else{const depth=Math.min(1,-y*5);r-=143*depth;g-=108*depth;b-=108*depth;}
    return [r,g,b];
  },true);env.mapping=T.EquirectangularReflectionMapping;
  scene.background=env;scene.environment=env;scene.environmentIntensity=.59;
  const mirror=new T.WebGLRenderTarget(640,480,{type:T.HalfFloatType,depthBuffer:true});
  const reflected=new T.PerspectiveCamera(),reflectMatrix=new T.Matrix4(),vec=new T.Vector3();
  const cols=21,rows=26,data=new Uint8Array(cols*rows*4),field=new T.DataTexture(data,cols,rows);
  field.magFilter=field.minFilter=T.LinearFilter;field.needsUpdate=true;
  const surfUniforms={seaField:{value:field},seaMirror:{value:mirror.texture},mirrorMatrix:{value:reflectMatrix},
    packetCount:{value:0},packets:{value:Array.from({length:52},()=>new T.Vector4())},packetR:{value:new Float32Array(52)}};
  const common=`
    uniform sampler2D seaField;
    varying vec3 seaPoint;
    varying vec4 mirrorPoint;
    varying float packetCrest;
    vec4 getField(vec2 p){return texture2D(seaField,(clamp((p-vec2(-32.,-59.))/vec2(3.2,3.),vec2(0.),vec2(20.,25.))+.5)/vec2(21.,26.));}
    float harborBase(vec2 p,vec4 f){
      float a=f.b*6.2831, b=f.a*6.2831;
      return (f.r-.5)*.52+.018*sin(dot(p,vec2(1.71,.76))+a)+.012*sin(dot(p,vec2(-.71,2.19))+b)
       +.006*sin(dot(p,vec2(3.8,2.55))+2.*a+b);
    }`;
  const material=new T.MeshPhysicalMaterial({color:0x438e8c,metalness:.16,roughness:.226,ior:1.333,envMapIntensity:.57,roughnessMap:models.M.stone.roughnessMap});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,surfUniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      ${common}
      uniform mat4 mirrorMatrix;
      uniform int packetCount;
      uniform vec4 packets[52];uniform float packetR[52];
    `).replace('#include <begin_vertex>',`
      vec3 transformed=position;
      vec2 p=transformed.xz;
      vec4 f=getField(p);
      float H=harborBase(p,f);float crest=0.;
      for(int i=0;i<52;i++){
        if(i>=packetCount)break;
        vec4 w=packets[i];float d=length(p-w.xy),delta=d-packetR[i],width=.30+w.z*.48;
        float shape=exp(-.5*delta*delta/(width*width));
        float peak=cos(6.2831853*delta/w.z);
        H+=w.w*shape*peak/sqrt(1.+.45*d);crest+=w.w*shape*pow(max(0.,peak),3.);
      }
      packetCrest=crest;transformed.y=H;seaPoint=transformed;mirrorPoint=mirrorMatrix*vec4(transformed,1.);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      ${common}
      uniform sampler2D seaMirror;
      float hwHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.5453);}
      float hwNoise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hwHash(i),hwHash(i+vec2(1,0)),f.x),mix(hwHash(i+vec2(0,1)),hwHash(i+vec2(1,1)),f.x),f.y);
      }
      vec2 rippleSlope(vec2 p,vec2 k,float amp,float offset,float aa){
        float bandLimit=1.-smoothstep(.20,2.4,aa*length(k));
        return k*amp*cos(dot(k,p)+offset)*bandLimit;
      }
    `).replace('#include <color_fragment>',`#include <color_fragment>
      vec2 wp=seaPoint.xz;
      vec4 fld=getField(wp);float adv=fld.b*6.2831,adv2=fld.a*6.2831;
      float large=hwNoise(wp*.116+vec2(2.4,-3.8));
      float nearshore=clamp((wp.y+34.)/43.,0.,1.);
      float shoal=hwNoise(wp*.34+large*2.1);
      diffuseColor.rgb*=mix(vec3(.67,.79,.84),vec3(1.08,1.13,1.02),.16+nearshore*.58+large*.26);
      float caustic=1.-smoothstep(.025,.095,abs(shoal+.08*sin(wp.y*4.+adv)-.53));
      diffuseColor.rgb+=vec3(.013,.028,.021)*caustic*nearshore*nearshore;
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float aa=max(length(dFdx(wp)),length(dFdy(wp)));
      float bend=(large-.5)*5.9+.48*sin(wp.y*.63+adv2);
      vec2 slope=rippleSlope(wp,vec2(1.86,4.88),.0145,adv*1.1+bend,aa)
        +rippleSlope(wp,vec2(-2.66,8.2),.0088,adv2-bend*1.25,aa)
        +rippleSlope(wp,vec2(3.6,13.3),.0052,adv*2.4+bend*1.33,aa)
        +rippleSlope(wp,vec2(-6.1,21.5),.0024,-adv2*2.8+shoal*6.,aa)
        +rippleSlope(wp,vec2(7.8,32.),.0018,adv*3.7+shoal*8.,aa);
      vec3 geoN=normalize(cross(dFdx(seaPoint),dFdy(seaPoint)));
      if(geoN.y<0.)geoN=-geoN;
      vec3 seaNormal=normalize(geoN+vec3(-slope.x,0.,-slope.y));
      normal=normalize(mat3(viewMatrix)*seaNormal);
    `).replace('#include <opaque_fragment>',`
      vec2 uvMirror=mirrorPoint.xy/mirrorPoint.w*.5+.5;
      float dist=length(cameraPosition-seaPoint);
      uvMirror+=vec2(seaNormal.x,seaNormal.z)*(.016+.012*clamp(16./dist,0.,1.));
      vec3 reflection=texture2D(seaMirror,clamp(uvMirror,vec2(.001),vec2(.999))).rgb;
      float ndv=clamp(dot(seaNormal,normalize(cameraPosition-seaPoint)),0.,1.);
      float fres=.10+.64*pow(1.-ndv,4.3);
      outgoingLight=mix(outgoingLight,reflection,fres);
      outgoingLight+=vec3(.61,.85,.76)*clamp(packetCrest*2.1,0.,.42);
      #include <opaque_fragment>
    `);
  };
  // Exponentially spaced rows concentrate geometry around hands, cargo and the dock.
  const nx=175,nz=213,positions=[],uv=[],indices=[];
  for(let j=0;j<=nz;j++){
    const v=j/nz,z=13-12*(Math.exp(v*3.04)-1);
    const width=Math.max(22,(15-z)*.95);
    for(let i=0;i<=nx;i++){
      const x=(i/nx-.5)*2*width;positions.push(x,0,z);uv.push(x*.11,z*.11);
      if(j&&i){const k=j*(nx+1)+i;indices.push(k-nx-2,k-nx-1,k,k-nx-2,k,k-1);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();
  const water=new T.Mesh(g,material);water.receiveShadow=true;scene.add(water);
  function update(s){
    const f=s.field;
    for(let i=0;i<data.length/4;i++){
      data[4*i]=Math.min(255,Math.max(0,Math.round((.5+f.h[i]/.52)*255)));
      data[4*i+1]=Math.round((.5+f.v[i])*255);
      // Bounded continuous components keep neighbouring currents smooth across phase wrap.
      data[4*i+2]=Math.round((.5+.49*Math.sin(f.flow[i]))*255);
      data[4*i+3]=Math.round((.5+.49*Math.cos(f.flow[i]*.81+i*.37))*255);
    }
    field.needsUpdate=true;surfUniforms.packetCount.value=s.waves.length;
    s.waves.forEach((w,i)=>{surfUniforms.packets.value[i].set(w.x,w.z,w.lambda,w.amp);surfUniforms.packetR.value[i]=w.radius;});
  }
  function reflect(hidden){
    reflected.copy(camera,false);
    reflected.position.y=-camera.position.y;
    camera.getWorldDirection(vec);vec.y=-vec.y;
    // Project each surface sample into the view from below the waterline.
    reflected.up.set(0,1,0);reflected.lookAt(vec.add(reflected.position));reflected.updateMatrixWorld();
    reflectMatrix.multiplyMatrices(reflected.projectionMatrix,reflected.matrixWorldInverse);
    const old=renderer.getRenderTarget();water.visible=false;
    hidden.forEach(o=>{o.userData.beforeReflection=o.visible;o.visible=false;});
    renderer.shadowMap.autoUpdate=false;
    renderer.setRenderTarget(mirror);renderer.render(scene,reflected);renderer.setRenderTarget(old);
    renderer.shadowMap.autoUpdate=true;water.visible=true;hidden.forEach(o=>o.visible=o.userData.beforeReflection);
  }
  return {update,reflect,resize:(w,h)=>mirror.setSize(Math.ceil(w*.55),Math.ceil(h*.55))};
};
