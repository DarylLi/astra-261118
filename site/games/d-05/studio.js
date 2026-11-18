'use strict';
const Studio=(()=>{
  const T=THREE,canvas=document.getElementById('bath');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.11;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.08,110);
  const world=new T.Group();scene.add(world);
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=50281;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  // Procedural studio reflections: an arched warm window, sky and floor, generated locally.
  const ew=256,eh=128,ed=new Uint8Array(ew*eh*4);
  for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){
    const v=y/eh,u=x/ew,k=(y*ew+x)*4;
    const sky=v>.53, pane=(u>.12&&u<.39&&v>.49&&v<.84 && Math.abs((u-.12)%.09-.045)>.003);
    const shade=sky?Math.min(1,(v-.5)*2):.35+.55*v;
    const c=pane?[255,253,234]:sky?[156+shade*63,193+shade*41,197+shade*41]:[116+shade*48,138+shade*48,126+shade*45];
    ed[k]=c[0];ed[k+1]=c[1];ed[k+2]=c[2];ed[k+3]=255;
  }
  const env=new T.DataTexture(ed,ew,eh,T.RGBAFormat);
  env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;
  const pm=new T.PMREMGenerator(renderer);const envTarget=pm.fromEquirectangular(env);
  scene.environment=envTarget.texture;pm.dispose();env.dispose();
  const noiseSize=64,noise=new Uint8Array(noiseSize**2*4);
  for(let i=0;i<noise.length;i+=4){const v=214+rand()*40;noise[i]=noise[i+1]=noise[i+2]=v;noise[i+3]=255;}
  const grain=new T.DataTexture(noise,noiseSize,noiseSize);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearFilter;grain.needsUpdate=true;
  function mat(color,roughness=.4,metalness=0,options={}){
    return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:grain,...options});
  }
  const m={
    cream:mat(0xffedc7,.33), porcelain:mat(0xfff6e1,.21), enamel:mat(0x8bc2b8,.26,.08),
    seam:mat(0x9fb5aa,.72), grout:mat(0xb2c5bd,.74),mint:mat(0x80b6a9),
    dark:mat(0x395c59,.55),oak:mat(0xbe915e,.51),honey:mat(0xd7ad73,.44),
    brass:mat(0xc29a57,.25,.72),rimGold:mat(0xe0bd7e,.24,.65),chrome:mat(0xbbcfca,.16,.88),
    yellow:mat(0xffc645,.28),sunny:mat(0xe8a62d,.31),teal:mat(0x4d9f9b,.32),
    coral:mat(0xd67d59,.4),glass:mat(0xb2dcd6,.11,.22),deep:mat(0x304e4b,.6)
  };
  function finishTexture(kind){
    const size=128,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const thread=kind==='linen'?(Math.cos(x*Math.PI/2)*.5+Math.cos(y*Math.PI/2)*.5):
        Math.sin(y*.76+1.1*Math.sin(x*.049)+.42*Math.sin(y*.17+x*.025));
      const tone=Math.round(242+thread*9+rand()*4),i=4*(y*size+x);
      data[i]=data[i+1]=data[i+2]=tone;data[i+3]=255;
    }
    const t=new T.DataTexture(data,size,size);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
    t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
  }
  m.oak.map=m.honey.map=finishTexture('oak');
  const linenMap=finishTexture('linen');
  function group(parent=world){const g=new T.Group();parent.add(g);return g;}
  function mesh(geo,material,parent=world){
    const o=new T.Mesh(geo,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function roundedGeo(w,h,d,r){
    if(r<=0)return new T.BoxGeometry(w,h,d);
    r=Math.min(w/2,h/2,d/2,r);
    const n=5,g=new T.BoxGeometry(1,1,1,n,n,n),p=g.attributes.position,norm=g.attributes.normal;
    const v=V(),a=V();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);a.copy(v);
      for(const c of ['x','y','z'])a[c]=Math.sign(v[c])*Math.max(0,Math.abs(v[c])-.5/n);
      a.normalize();p.setXYZ(i,Math.sign(v.x)*(w/2-r)+a.x*r,Math.sign(v.y)*(h/2-r)+a.y*r,Math.sign(v.z)*(d/2-r)+a.z*r);norm.setXYZ(i,a.x,a.y,a.z);
    }
    return g;
  }
  function box(w,h,d,x,y,z,ma,r=0,parent=world){const o=mesh(roundedGeo(w,h,d,r),ma,parent);o.position.set(x,y,z);return o;}
  const sphere=new T.SphereGeometry(1,32,20);
  function ell(x,y,z,a,b,c,ma,parent=world){const o=mesh(sphere,ma,parent);o.position.set(x,y,z);o.scale.set(a,b,c);return o;}
  function cyl(x,y,z,a,b,h,ma,parent=world,n=40){
    const o=mesh(new T.CylinderGeometry(a,b,h,n),ma,parent);o.position.set(x,y,z);return o;
  }
  function rod(p,q,r,ma,parent=world,n=12){const a=V(...p),b=V(...q),axis=b.clone().sub(a);
    const o=mesh(new T.CylinderGeometry(r,r,axis.length(),n),ma,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),axis.normalize());return o;
  }
  function tube(pts,r,ma,parent=world,n=32,sides=10,closed=false){
    const path=new T.CatmullRomCurve3(pts.map(p=>V(...p)),closed,'centripetal');
    return mesh(new T.TubeGeometry(path,n,r,sides,closed),ma,parent);
  }
  function ring(x,y,z,rad,thick,ma,parent=world){const o=mesh(new T.TorusGeometry(rad,thick,10,56),ma,parent);o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
  function profile(rows,n,ma,parent=world,power=3.6){
    const p=[],idx=[],uv=[];
    rows.forEach(([a,b,y,shift=0],j)=>{
      for(let i=0;i<=n;i++){const angle=2*Math.PI*i/n,co=Math.cos(angle),si=Math.sin(angle);
        p.push(shift+a*Math.sign(co)*Math.abs(co)**(2/power),y,b*Math.sign(si)*Math.abs(si)**(2/power));
        uv.push(i/n,j/(rows.length-1));
        if(j && i){const q=j*(n+1)+i;idx.push(q-n-2,q,q-n-1,q-n-2,q-1,q);}
      }
    });
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    // Match normals at the shared longitude of closed profiles.
    const normal=g.attributes.normal,v=V(),b=V();
    for(let j=0;j<rows.length;j++){const a=j*(n+1);v.fromBufferAttribute(normal,a).add(b.fromBufferAttribute(normal,a+n)).normalize();normal.setXYZ(a,v.x,v.y,v.z);normal.setXYZ(a+n,v.x,v.y,v.z);}
    return mesh(g,ma,parent);
  }
  // Collapse fixed pieces into material batches, preserving independent mechanical assemblies.
  function batch(parent){
    parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),batches=new Map();
    parent.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+o.castShadow+o.receiveShadow;
      if(!batches.has(key))batches.set(key,{mat:o.material,cast:o.castShadow,receive:o.receiveShadow,p:[],n:[],uv:[],idx:[],old:[]});
      const b=batches.get(key),g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
      const matrix=inverse.clone().multiply(o.matrixWorld),normal=new T.Matrix3().getNormalMatrix(matrix),v=V(),base=b.p.length/3;
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(matrix);b.p.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(normal).normalize();b.n.push(v.x,v.y,v.z);b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}
      for(let i=0;i<(g.index?g.index.count:p.count);i++)b.idx.push(base+(g.index?g.index.getX(i):i));b.old.push(o);
    });
    for(const b of batches.values()){
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.idx);
      b.old.forEach(o=>o.removeFromParent());const o=mesh(g,b.mat,parent);o.castShadow=b.cast;o.receiveShadow=b.receive;
    }
  }
  const sky=new T.HemisphereLight(0xe1f4ff,0xf5dec1,1.25);scene.add(sky);
  const sun=new T.DirectionalLight(0xffefd5,2.85);
  sun.position.set(-3.3,7,-4.6);sun.target.position.set(.6,0,1);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.2,far:19});sun.shadow.normalBias=.012;sun.shadow.bias=-.00022;sun.shadow.radius=3;
  const ground=box(150,.16,150,0,-.62,0,mat(0x81ad9a,.88));ground.castShadow=false;
  scene.background=new T.Color(0xc3d9cd);
  // A single final display pass uses neighbouring HDR highlights for a restrained bloom.
  const target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true});
  target.samples=Math.min(2,renderer.capabilities.maxSamples||0);
  const screen=new T.Scene(),ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({uniforms:{pic:{value:target.texture},pixel:{value:new T.Vector2()}},depthWrite:false,depthTest:false,
    vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D pic;uniform vec2 pixel;varying vec2 v;
    void main(){vec3 c=texture2D(pic,v).rgb;vec3 bloom=vec3(0.);
    for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 h=texture2D(pic,v+vec2(cos(a),sin(a))*pixel*4.).rgb;bloom+=max(h-vec3(1.65),0.);}
    c+=bloom*.009;c*=1.-.12*dot(v-.5,v-.5)*2.;gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.54)-.5)*.005;
    }`});
  screen.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  function draw(){renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(screen,ortho);}
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,1.8);
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
    target.setSize(Math.round(w*dpr),Math.round(h*dpr));finish.uniforms.pixel.value.set(1/(w*dpr),1/(h*dpr));
    camera.aspect=w/h;camera.updateProjectionMatrix();
    const portrait=w<h,dir=(portrait?V(6.4,8.2,7.5):V(4.1,7.5,9.6)).normalize();
    const at=portrait?V(-.08,1.15,-.07):V(-.05,1.25,-.06);
    camera.position.copy(at).addScaledVector(dir,13);camera.lookAt(at);camera.updateMatrixWorld();
    const pts=portrait?[[-2.45,1.3,.63],[-2.19,1.3,1.1],[-2.35,1.3,-.8],[2.10,1.3,-.77],[2.12,1.3,.83],[1.85,.04,2.23],[-1.02,3.94,-2.44],[2.18,.90,-1.54]]:[[-3.48,-.45,2.63],[3.48,-.45,2.63],[3.48,-.45,-2.36],[-3.48,2.72,2.3],[-3.48,3.85,-2.35],[2.3,3.65,-2.35],[3.35,2,-2.35],[-3.4,1.4,2.4]];
    // Fit the architectural silhouette, including the nearest open corner of the floor.
    const right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion),f=Math.tan(16*Math.PI/180);
    let dist=0;
    pts.forEach(p=>{const v=V(...p).sub(at),z=v.dot(dir);dist=Math.max(dist,z+Math.abs(v.dot(up))/(f*(portrait?.87:.9)),z+Math.abs(v.dot(right))/(f*camera.aspect*(portrait?.96:.92)));});
    camera.position.copy(at).addScaledVector(dir,dist);camera.lookAt(at);camera.updateMatrixWorld();
  }
  return {T,canvas,renderer,scene,camera,world,V,rand,mat,m,linenMap,group,mesh,box,ell,cyl,rod,tube,ring,profile,batch,resize,draw,sun};
})();
