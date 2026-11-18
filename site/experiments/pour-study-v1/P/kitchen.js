'use strict';
const Kitchen = (() => {
  const T=THREE, TAU=Math.PI*2;
  let seed=52019;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const mat=(color,roughness,metalness=0,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
  function group(parent){const g=new T.Group();parent.add(g);return g;}
  function mesh(parent,geometry,material,x=0,y=0,z=0){
    const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function lathe(parent,profile,material,x=0,y=0,z=0,n=96){
    return mesh(parent,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),n),material,x,y,z);
  }
  function ball(parent,m,x,y,z,a,b,c){
    const v=mesh(parent,new T.SphereGeometry(1,36,22),m,x,y,z);v.scale.set(a,b,c);return v;
  }
  function ring(parent,mat,x,y,z,r,tube){
    const m=mesh(parent,new T.TorusGeometry(r,tube,10,112),mat,x,y,z);m.rotation.x=Math.PI/2;return m;
  }
  function rod(parent,m,p,q,r1,r2=r1){
    const a=new T.Vector3(...p),b=new T.Vector3(...q),d=b.clone().sub(a);
    const o=mesh(parent,new T.CylinderGeometry(r2,r1,d.length(),24),m);
    o.position.copy(a).add(b).multiplyScalar(0.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;
  }
  function rounded(parent,w,h,d,r,m,x=0,y=0,z=0){
    const s=new T.Shape(),a=w/2,b=d/2;
    s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);
    s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);
    s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);
    const bevel=Math.min(h*0.35,r*0.45,0.075);
    const g=new T.ExtrudeGeometry(s,{depth:Math.max(0.001,h-2*bevel),bevelEnabled:true,bevelSegments:4,bevelThickness:bevel,bevelSize:bevel,curveSegments:9});
    g.rotateX(-Math.PI/2);return mesh(parent,g,m,x,y-h/2+bevel,z);
  }
  function tex(w,h,paint,repeatX=1,repeatY=1) {
    const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=4;return t;
  }
  function timber(){
    const texture=tex(1024,512,(c,w,h)=>{
      const pix=c.createImageData(w,h);
      for(let j=0;j<h;j++)for(let i=0;i<w;i++){
        const x=i/w*TAU,y=j/h*TAU;
        const rings=j+3.1*Math.sin(x+2*Math.sin(y))+1.5*Math.sin(2*x+3*y)+1.4*Math.sin(x*3-y);
        const stripe=Math.pow(0.5+0.5*Math.cos(rings*0.61),9);
        const tone=7*Math.sin(rings*0.088)+3*Math.cos(rings*0.21)+3*Math.sin(y*3)-9*stripe+(rand()-0.5)*6;
        const k=4*(i+j*w);
        pix.data[k]=201+tone;pix.data[k+1]=170+tone;pix.data[k+2]=132+tone;pix.data[k+3]=255;
      }
      c.putImageData(pix,0,0);
      for(let n=0;n<2200;n++){
        const x=rand()*w,y=rand()*h;c.strokeStyle='rgba(88,57,32,'+(0.02+rand()*0.10)+')';
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+6,y-0.3,x+8+rand()*22,y+rand()-0.5);c.stroke();
      }
    });return mat(0xffffff,0.49,0,{map:texture,bumpMap:texture,bumpScale:0.009});
  }
  function enamel(color){return new T.MeshPhysicalMaterial({color,roughness:0.26,clearcoat:0.42,clearcoatRoughness:0.23});}
  function noise(){
    return tex(256,256,(c,w,h)=>{
      const p=c.createImageData(w,h);
      for(let k=0;k<p.data.length;k+=4){
        const v=190+50*rand();p.data[k]=p.data[k+1]=p.data[k+2]=v;p.data[k+3]=255;
      }c.putImageData(p,0,0);
    },7,7);
  }
  function environment(renderer,scene){
    const room=new T.Scene();room.background=new T.Color(0x998d7a);
    function panel(c,intensity,w,h,pos,target){
      const s=mesh(room,new T.PlaneGeometry(w,h),mat(c,1,0,{emissive:c,emissiveIntensity:intensity,side:T.DoubleSide}),...pos);
      s.lookAt(...target);return s;
    }
    // A real window frame in the reflection capture preserves the mullions on wet batter.
    panel(0x51453b,0.55,16,9,[0,-3,0],[0,0,0]);panel(0xeae4d6,1.2,12,14,[0,6,0],[0,0,0]);
    panel(0x657975,0.8,10,7,[1,1,-5],[0,1,0]);
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){
      panel(0xfff5df,7.5,1.23,1.7,[-4.8,1.35+j*1.83,(i-1)*1.40-1],[0,1.35+j*1.83,(i-1)*1.40-1]);
    }
    panel(0xf8e9da,1.65,4,5,[5,2.4,2],[0,1,0]);
    const gen=new T.PMREMGenerator(renderer), env=gen.fromScene(room,0.015,0.1,30);
    scene.environment=env.texture;scene.environmentIntensity=0.74;
    gen.dispose();room.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
    return env;
  }
  function linen(parent,x,z){
    const textile=tex(512,512,(c,w,h)=>{
      c.fillStyle='#718f91';c.fillRect(0,0,w,h);
      for(const [u,v] of [[40,4],[49,13],[67,3],[441,3],[450,13],[470,4]]){
        c.fillStyle='#d6cfad';c.fillRect(0,u,w,v);
      }
      for(let i=0;i<w;i+=2){c.fillStyle='rgba(238,229,200,0.10)';c.fillRect(i,0,1,h);}
      for(let j=1;j<h;j+=3){c.fillStyle='rgba(39,54,54,0.12)';c.fillRect(0,j,w,1);}
    });
    const fabric=mat(0xffffff,0.97,0,{map:textile,bumpMap:textile,bumpScale:0.014,side:T.DoubleSide});
    const stack=group(parent);stack.position.set(x,0,z);stack.rotation.y=0.29;
    for(let layer=0;layer<3;layer++){
      const g=new T.PlaneGeometry(3.35,2.65,64,44);g.rotateX(-Math.PI/2);
      const p=g.attributes.position;
      for(let k=0;k<p.count;k++){
        const u=p.getX(k),v=p.getZ(k),edge=Math.pow(Math.abs(u)/1.675,4);
        p.setXYZ(k,u+0.034*Math.sin(6*v+1.7*u+layer),0.043+layer*0.055+
          0.032*Math.sin(5*u+2.2*v)+0.025*Math.cos(7*v-u)+edge*0.06*Math.sin(5*v),v+0.036*Math.cos(3*u+v+layer));
      }
      g.computeVertexNormals();mesh(stack,g,fabric,layer*0.044,0,layer*0.027);
    }
  }
  function eggs(parent){
    const g=group(parent);g.position.set(-2.73,0.20,-2.64);g.rotation.y=-0.25;
    const porcelain=enamel(0xd5ccba);
    lathe(g,[[0.008,0],[0.46,0],[0.51,0.045],[0.54,0.11],[0.70,0.17],[0.84,0.30],[0.94,0.49],[0.98,0.66],[0.975,0.70],[0.955,0.718],[0.925,0.69],[0.90,0.53],[0.81,0.34],[0.65,0.23],[0.39,0.16],[0.008,0.16]],porcelain);
    ring(g,enamel(0x71817b),0,0.644,0,0.966,0.014);
    for(let i=0;i<3;i++)ring(g,porcelain,0,0.36+i*0.076,0,0.875+i*0.032,0.012);
    for(const [x,y,z,s,a,c] of [[-0.38,0.64,0.17,0.95,-0.48,0xcf9767],[0.21,0.67,0.23,1,0.55,0xe5bd8b],[-0.06,0.83,-0.28,0.95,0.24,0xd8a777]]){
      const pts=[];
      for(let n=0;n<=40;n++){const t=Math.PI*n/40;pts.push([Math.max(0.0001,0.33*Math.sin(t)*(1-0.13*Math.cos(t))*s),0.45*Math.cos(t)*s]);}
      const egg=lathe(g,pts.reverse(),mat(c,0.61,0,{bumpMap:noise(),bumpScale:0.003}),x,y,z,48);egg.rotation.z=a;
    }
  }
  function pitcher(parent){
    const g=group(parent);g.position.set(0.15,0.02,-4.45);g.rotation.y=-0.45;
    const glaze=enamel(0xe5dec8),profile=[[0.001,0],[0.46,0],[0.53,0.045],[0.55,0.12],[0.57,0.24],[0.63,0.63],[0.59,0.98],[0.46,1.30],[0.43,1.51],[0.45,1.58],[0.44,1.62],[0.405,1.615],[0.396,1.55],[0.403,1.31],[0.54,0.98],[0.56,0.65],[0.49,0.18],[0.01,0.14]];
    const jug=lathe(g,profile,glaze);const p=jug.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),spout=Math.pow(Math.max(0,-x/Math.hypot(x,z)),9)*Math.max(0,(y-1.29)/0.33);
      p.setXYZ(i,x-0.24*spout,y+0.066*spout,z);
    }
    jug.geometry.computeVertexNormals();
    const curve=new T.CatmullRomCurve3([[0.45,1.35,0],[0.73,1.38,0],[0.93,1.21,0],[0.93,0.93,0],[0.80,0.68,0],[0.57,0.55,0]].map(a=>new T.Vector3(...a)));
    mesh(g,new T.TubeGeometry(curve,48,0.073,16,false),glaze);ring(g,glaze,0,0.083,0,0.525,0.023);
    lathe(g,[[0.001,1.14],[0.49,1.14],[0.505,1.149]],mat(0xf5eacb,0.17,0,{side:T.DoubleSide}));
  }
  function jar(parent){
    const g=group(parent);g.position.set(2.30,0.015,-3.73);
    const amber=new T.MeshPhysicalMaterial({color:0xad6629,metalness:0.18,roughness:0.19,clearcoat:1,clearcoatRoughness:0.09});
    lathe(g,[[0.001,0],[0.37,0],[0.418,0.059],[0.43,0.13],[0.43,0.92],[0.417,1.02],[0.347,1.085],[0.343,1.19],[0.366,1.22],[0.36,1.26],[0.01,1.26]],amber);
    const lid=mat(0xac8252,0.42,0.68);
    lathe(g,[[0.01,1.20],[0.38,1.20],[0.4,1.225],[0.398,1.35],[0.37,1.38],[0.01,1.38]],lid);
    for(let i=0;i<3;i++)ring(g,lid,0,1.23+i*0.041,0,0.397,0.007);
  }
  function countertop(scene){
    const wood=timber(),table=group(scene);table.position.y=-0.92;
    for(let i=-6;i<=7;i++){
      const plank=mesh(table,new T.BoxGeometry(28,0.24,1.63),wood,0,-0.123,1.636*i);
      const uv=plank.geometry.attributes.uv;
      for(let k=0;k<uv.count;k++)uv.setXY(k,uv.getX(k)*3.3+i*0.27,uv.getY(k)*0.81+i*0.13);
    }
    linen(table,-2.95,-2.47);eggs(table);pitcher(table);jar(table);
    const wall=mat(0xb6b9ac,0.76);
    mesh(table,new T.BoxGeometry(26,10,0.12),wall,0,4,-6.6);
    const glazes=[0xc8cec2,0xd1d3c6,0xc6cbbf,0xc1c9be].map(c=>enamel(c));
    for(let i=-7;i<=7;i++)for(let j=0;j<3;j++){
      const tile=rounded(table,1.64,0.12,0.80,0.038,glazes[Math.floor(rand()*4)]);
      tile.rotation.x=Math.PI/2;tile.position.set((i+(j%2)*0.5)*1.73,0.44+j*0.884,-6.48);
    }
    return wood;
  }
  function cookware(scene,wood){
    const silver=mat(0xcbd0cd,0.235,0.94), satin=mat(0xb6b9b4,0.35,0.87);
    const black=mat(0x303331,0.53,0.32),cream=enamel(0xe3d9bf),base=group(scene);
    base.rotation.y=-0.09;
    for(const x of [-1.34,1.34]) for(const z of [-1.18,1.18]) rounded(base,0.35,0.17,0.36,0.09,black,x,-0.835,z);
    rounded(base,3.40,0.48,3.25,0.28,cream,0,-0.59,0);
    rounded(base,3.27,0.044,3.12,0.29,satin,0,-0.337,0);
    lathe(base,[[0.001,-0.31],[1.39,-0.31],[1.40,-0.27],[1.31,-0.24],[1.22,-0.21],[0.94,-0.21],[0.88,-0.17],[0.001,-0.17]],satin);
    ring(base,black,0,-0.18,0,1.03,0.062);
    for(let i=0;i<4;i++){
      const lug=group(base);lug.rotation.y=TAU*(i+0.5)/4;rounded(lug,0.13,0.18,0.66,0.032,black,0,-0.152,1.21);
    }
    const dial=group(base);dial.position.set(1.02,-0.595,1.65);dial.rotation.x=Math.PI/2;
    lathe(dial,[[0.01,0],[0.285,0],[0.286,0.038],[0.255,0.058],[0.222,0.064],[0.214,0.18],[0.184,0.21],[0.001,0.21]],satin);
    const knob=rounded(dial,0.103,0.1,0.33,0.047,black,0,0.219,0);knob.rotation.y=-0.42;
    for(let i=0;i<5;i++)rounded(base,0.28,0.021,0.012,0.006,black,-1.13+i*0.36,-0.65,1.685);
    const pan=group(scene);
    const shell=lathe(pan,[[0.001,-0.076],[1.55,-0.076],[1.72,-0.058],[1.84,-0.009],[1.93,0.082],[2.034,0.254],[2.109,0.398],[2.126,0.449],[2.118,0.468],[2.089,0.466]],silver);
    const panNoise=noise(),coating=mat(0x393c3b,0.52,0.37,{bumpMap:panNoise,bumpScale:0.008});
    lathe(pan,[[2.099,0.467],[2.072,0.447],[2.05,0.409],[1.975,0.26],[1.885,0.13],[1.81,0.058],[1.73,0.019],[1.62,0.004],[1.51,0],[0.0001,0]],coating);
    ring(pan,silver,0,0.461,0,2.106,0.024);ring(pan,satin,0,0.321,0,2.072,0.008);
    const handle=group(pan);handle.rotation.y=-2.64;
    rod(handle,satin,[1.88,0.20,0],[2.42,0.43,0],0.17,0.124);
    rod(handle,silver,[2.23,0.36,0],[2.48,0.46,0],0.167,0.169);
    const grip=lathe(handle,[[0.001,0],[0.15,0],[0.18,0.09],[0.176,0.30],[0.151,0.64],[0.174,1.0],[0.193,1.38],[0.174,1.55],[0.125,1.62],[0.001,1.65]],wood,2.42,0.43,0,64);
    grip.rotation.z=-1.38;grip.scale.z=0.91;
    for(const z of [-0.13,0.13])ball(handle,satin,1.98,0.283,z,0.028,0.052,0.048);
    return pan;
  }
  return {T,TAU,mat,group,mesh,lathe,ball,ring,rod,rounded,tex,timber,enamel,environment,countertop,cookware};
})();
