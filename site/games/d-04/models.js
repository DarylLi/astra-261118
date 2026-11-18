/* All scenery is constructed in metres. Colour and roughness textures are generated locally. */
window.HarborModels = function (T) {
  'use strict';
  let rand=Harbor.random(6812);
  const tau=2*Math.PI,V=(x,y,z)=>new T.Vector3(x,y,z);
  const group=()=>new T.Group(),cache=new Map(),white=0xffffff;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function noise(x,y){
    const hash=(i,j)=>{const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n);};
    const ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);
    return (1-b)*((1-a)*hash(ix,iy)+a*hash(ix+1,iy))+b*((1-a)*hash(ix,iy+1)+a*hash(ix+1,iy+1));
  }
  function texture(w,h,fn,color){
    const data=new Uint8Array(w*h*4);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const v=fn(i/w,j/h,i,j),k=(j*w+i)*4;
      for(let n=0;n<3;n++)data[k+n]=clamp(Array.isArray(v)?v[n]:v,0,255);
      data[k+3]=255;
    }
    const tex=new T.DataTexture(data,w,h);tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=4;
    if(color)tex.colorSpace=T.SRGBColorSpace;tex.needsUpdate=true;return tex;
  }
  const grain=texture(512,256,(u,v)=>{
    const warp=.016*Math.sin(6.28*u+4*v)+.012*Math.sin(u*13+v*24)+.03*noise(u*3,v*4);
    const knot=Math.exp(-((u-.34)**2*120+(v-.59)**2*50));
    const y=v+warp+knot*.057*Math.sin((v-.59)*26);
    const g=noise(u*5,y*136), broad=noise(u*2.8,y*20);
    const vein=Math.pow(.5+.5*Math.sin(y*394+broad*8+g*1.7),9);
    const a=173+49*broad+28*g-vein*40-(knot**7)*76+13*rand();
    return [a,a*.963,a*.89];
  },true);
  const grit=texture(128,128,(u,v)=>198+36*noise(u*10,v*10)+20*rand());
  const plaster=texture(128,128,(u,v)=>220+15*noise(u*14,v*12)+19*rand(),true);
  const mat=(opts={})=>new T.MeshStandardMaterial({vertexColors:true,roughnessMap:grit,roughness:.82,metalness:0,...opts});
  const M={wood:mat({map:grain,bumpMap:grain,bumpScale:.016}), wet:mat({map:grain,roughness:.37,bumpMap:grain,bumpScale:.008}),
    paint:mat({map:plaster,roughness:.51}),stone:mat({map:plaster,bumpMap:grit,bumpScale:.055,roughness:.98}),
    rope:mat({map:plaster,bumpMap:grit,bumpScale:.012,roughness:.95}), brass:mat({metalness:.58,roughness:.34}),
    metal:mat({metalness:.45,roughness:.43}),glass:mat({metalness:.36,roughness:.13,envMapIntensity:1.5}),
    leaf:mat({roughness:1}),light:mat({emissive:0xffe0aa,emissiveIntensity:.65,roughness:.32})};
  function mesh(parent,geom,material,color,x=0,y=0,z=0){
    const ob=new T.Mesh(geom,material);ob.userData.tint=new T.Color(color);ob.position.set(x,y,z);
    ob.castShadow=ob.receiveShadow=true;parent.add(ob);return ob;
  }
  function cached(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
  function boxGeo(w,h,d,r){
    if(!r)return cached('cube',()=>new T.BoxGeometry());
    return cached([w,h,d,r].join('/'),()=>{
      r=Math.min(r,w/3,h/3,d/3);
      const g=new T.BoxGeometry(1,1,1,4,4,4),p=g.attributes.position,n=g.attributes.normal,temp=V(0,0,0);
      for(let k=0;k<p.count;k++){
        const q=[p.getX(k),p.getY(k),p.getZ(k)],dims=[w,h,d];
        const base=q.map((a,i)=>Math.sign(a)*(a===0?0:dims[i]/2-r));
        temp.set(...q.map(a=>Math.abs(a)>.45?Math.sign(a):0)).normalize();
        p.setXYZ(k,base[0]+temp.x*r,base[1]+temp.y*r,base[2]+temp.z*r);n.setXYZ(k,temp.x,temp.y,temp.z);
      }
      return g;
    });
  }
  function box(p,w,h,d,x,y,z,c,m=M.wood,r=0){
    const o=mesh(p,boxGeo(w,h,d,r),m,c,x,y,z);if(!r)o.scale.set(w,h,d);return o;
  }
  function cyl(p,top,bot,h,n,x,y,z,c,m=M.paint){
    const g=cached(['cy',top,bot,h,n].join(),()=>new T.CylinderGeometry(top,bot,h,n));
    return mesh(p,g,m,c,x,y,z);
  }
  function ball(p,rx,ry,rz,x,y,z,c,m=M.paint,n=16){
    const o=mesh(p,cached('ball'+n,()=>new T.SphereGeometry(1,n,Math.max(7,n/2))),m,c,x,y,z);
    o.scale.set(rx,ry,rz);return o;
  }
  function rod(p,a,b,r,c,m=M.metal,r2=r,n=8){
    const A=V(...a),B=V(...b),D=B.clone().sub(A),o=cyl(p,r2,r,D.length(),n,...A.clone().add(B).multiplyScalar(.5).toArray(),c,m);
    o.quaternion.setFromUnitVectors(V(0,1,0),D.normalize());return o;
  }
  function cord(p,points,r,c,m=M.rope,n=4,smooth=true,closed=false){
    const pts=points.map(v=>V(...v));
    const curve=new T.CatmullRomCurve3(pts,closed,'centripetal');
    const g=new T.TubeGeometry(curve,smooth?Math.max(14,pts.length*2):pts.length,r,n,closed);
    return mesh(p,g,m,c);
  }
  function loop(p,fn,r,c,m=M.rope,steps=48){
    return cord(p,Array.from({length:steps},(_,i)=>fn(i/steps*tau)),r,c,m,5,false,true);
  }
  // Bake each rigid model by material, preserving normals, texture coordinates and board colours.
  function pack(parent){
    parent.updateWorldMatrix(true,true);const inv=parent.matrixWorld.clone().invert(),sets=new Map();
    for(const child of [...parent.children]){
      child.traverse(ob=>{
        if(!ob.isMesh)return;
        const m=ob.material,g=ob.geometry,idx=g.index,pos=g.attributes.position,norm=g.attributes.normal,uv=g.attributes.uv,col=g.attributes.color;
        if(!sets.has(m))sets.set(m,{p:[],n:[],uv:[],c:[],ix:[]});
        const out=sets.get(m),off=out.p.length/3,xf=new T.Matrix4().multiplyMatrices(inv,ob.matrixWorld),nr=new T.Matrix3().getNormalMatrix(xf);
        const v=V(0,0,0),tint=ob.userData.tint||new T.Color(white);
        const timber=m===M.wood||m===M.wet;
        const grainStart=timber?Math.sin(ob.position.z*23.1+ob.position.x*41.9+ob.position.y*7.1)*4.2:0;
        for(let k=0;k<pos.count;k++){
          v.fromBufferAttribute(pos,k).applyMatrix4(xf);out.p.push(v.x,v.y,v.z);
          v.fromBufferAttribute(norm,k).applyNormalMatrix(nr);out.n.push(v.x,v.y,v.z);
          out.uv.push(uv?uv.getX(k)+grainStart:0,uv?uv.getY(k)+grainStart*.61:0);
          out.c.push(tint.r*(col?col.getX(k):1),tint.g*(col?col.getY(k):1),tint.b*(col?col.getZ(k):1));
        }
        for(let k=0;k<(idx?idx.count:pos.count);k++)out.ix.push(off+(idx?idx.getX(k):k));
      });parent.remove(child);
    }
    for(const [m,arr] of sets){
      const g=new T.BufferGeometry();
      for(const [name,a,size] of [['position',arr.p,3],['normal',arr.n,3],['color',arr.c,3],['uv',arr.uv,2]])
        g.setAttribute(name,new T.Float32BufferAttribute(a,size));
      g.setIndex(arr.ix);const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);
    }
    return parent;
  }
  const woodtones=[0xaf8054,0xc09565,0xcba174,0xb18b64,0xbd946a,0xd2a676];
  const plank=()=>woodtones[Math.floor(rand()*woodtones.length)];
  function crate(id){
    const p=group(),w=.80,h=.63,d=.72;
    box(p,w-.035,h-.03,d-.035,0,0,0,0x6f513d);
    for(let i=0;i<4;i++){
      const x=(i-1.5)*w/4;
      box(p,w/4-.009,.035,d,x,h/2,0,plank(),M.wood,.009);
      for(const side of [-1,1])box(p,w/4-.009,h-.025,.032,x,0,side*d/2,plank(),M.wood,.007);
    }
    for(const side of [-1,1]){
      for(let j=0;j<3;j++)box(p,.034,h/3-.009,d,side*w/2,(j-1)*h/3,0,plank(),M.wood,.008);
      for(const x of [-.335,.335])box(p,.080,h+.028,.049,x,0,side*(d/2+.027),0x9e7953,M.wood,.009);
      for(const y of [-.26,.26])box(p,w,.083,.044,0,y,side*(d/2+.019),0xd0ac7c,M.wood,.008);
      const brace=box(p,.78,.072,.043,0,0,side*(d/2+.033),0xc6a375,M.wood,.009);brace.rotation.z=.59;
      for(const x of [-.335,.335])for(const y of [-.25,.25])ball(p,.014,.014,.009,x,y,side*.418,0x544e43,M.metal,8);
    }
    for(const x of [-.29,.29])box(p,.083,.041,d+.048,x,.345,0,0xb5956f,M.wood,.008);
    if(id%2===0){
      for(const z of [-.20,.21])loop(p,a=>[.426*Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.14),.351*Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.14),z],.013,0x685b45,M.rope,40);
    }
    return pack(p);
  }
  function fishingFloat(kind,id){
    const p=group(),glass=kind==='glass',r=glass?.34:.315;
    const color=glass?(id%2?0x589897:0x7aa6a0):0xd89566;
    ball(p,r,r,r,0,0,0,color,glass?M.glass:M.paint,28);
    if(!glass){
      const band=new T.SphereGeometry(r+.0025,32,10,0,tau,Math.PI*.36,Math.PI*.26);
      mesh(p,band,M.paint,0xf2e6c9);cyl(p,.065,.085,.078,12,0,r+.023,0,0x936742,M.wet);
    }
    const strands=glass?9:6,rows=glass?5:3;
    for(let i=0;i<strands;i++)for(const dir of [-1,1]){
      const path=[];
      for(let j=0;j<=rows;j++){
        const lat=.21+(Math.PI-.42)*j/rows,lon=tau*(i+dir*.5*j)/strands;
        path.push([Math.sin(lat)*Math.cos(lon)*(r+.012),Math.cos(lat)*(r+.012),Math.sin(lat)*Math.sin(lon)*(r+.012)]);
      }
      // Follow the glass curvature between knots.
      const pts=[];
      for(let j=0;j<path.length-1;j++)for(let k=0;k<5;k++)pts.push(V(...path[j]).lerp(V(...path[j+1]),k/5).normalize().multiplyScalar(r+.012).toArray());
      pts.push(path[path.length-1]);cord(p,pts,glass?.011:.009,glass?0xb3a384:0xc1b396,M.rope,4,false);
    }
    for(const y of [-1,1])loop(p,a=>[.078*Math.cos(a),y*(r-.002),.078*Math.sin(a)],.023,0x9b896b);
    cord(p,[[-.044,r,0],[-.052,r+.11,0],[.012,r+.156,.012],[.075,r+.107,0],[.046,r,0]],.020,0xa59777);
    return pack(p);
  }
  // Open hull loft: the interior, keel, strakes, sheer and gunwales have independent geometry.
  function hull(p,length,width,height,colors){
    const stations=[[-1,.37,.94],[-.86,.70,.90],[-.52,.94,.85],[-.12,1,.86],[.29,.90,.88],[.61,.68,.96],[.84,.37,1.08],[1,.025,1.21]];
    const pts=[],uv=[],ids=[],cols=[];
    const contour=[[-1,1],[-.99,.85],[-.93,.69],[-.72,.32],[-.26,.045],[.26,.045],[.72,.32],[.93,.69],[.99,.85],[1,1],[.90,1],[.83,.70],[.60,.39],[-.60,.39],[-.83,.70],[-.90,1],[-1,1]];
    const section=(s,n)=>[s[1]*width*.5*n[0],height*(s[2]*n[1]-.52),s[0]*length*.5];
    for(let j=0;j<stations.length-1;j++)for(let k=0;k<contour.length-1;k++){
      const quad=[section(stations[j],contour[k]),section(stations[j+1],contour[k]),section(stations[j+1],contour[k+1]),section(stations[j],contour[k+1])];
      const color=new T.Color(k===0||k===8?colors[2]:k===1||k===7?colors[1]:k<=8?colors[0]:k===9||k===15?colors[2]:colors[3]);
      const o=pts.length/3;for(let n=0;n<4;n++){pts.push(...quad[n]);cols.push(color.r,color.g,color.b);uv.push(j/4+(n===1||n===2?.25:0),n>=2?1:0);}
      ids.push(o,o+1,o+2,o,o+2,o+3);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();
    const double=cached('hullMat',()=>{const m=M.wet.clone();m.side=T.DoubleSide;return m;});
    mesh(p,g,double,white);
    for(const side of [-1,1]){
      for(const [level,frac,r,c] of [[1,1,.022,colors[2]],[.75,.965,.011,colors[1]],[.47,.81,.009,colors[0]]])
        cord(p,stations.map(s=>section(s,[side*frac,level])),r*width,c,M.wet);
    }
    const stern=stations[0];box(p,width*stern[1]*.95,height*.54,.046,0,-height*.06,-length*.499,colors[0],M.wet,.02);
    return section;
  }
  function dinghy(id){
    const p=group(),color=id===0?0x467876:id===5?0x775e47:0x577d86;
    hull(p,2.55,1.01,.56,[color,0xf0dfbd,0xba8957,0xad825a]);
    for(let i=-2;i<=2;i++)box(p,.116,.025,1.56-Math.abs(i)*.18,i*.12,-.052,-.10,plank(),M.wood,.009);
    for(const z of [-.72,-.09,.55]){
      const w=z>.5?.63:z<-.5?.72:.92;
      for(let i=0;i<2;i++)box(p,w,.052,.089,0,.145,z+i*.096,0xc19265,M.wood,.012);
    }
    for(const side of [-1,1]){
      rod(p,[side*.26,.20,-.91],[side*.33,.25,.67],.021,0x977449,M.wood,.027);
      const o=ball(p,.071,.029,.245,side*.335,.25,.73,0xbc9360,M.wood);o.rotation.y=side*.08;
    }
    for(let i=0;i<3;i++)loop(p,a=>[.08+(.135-i*.025)*Math.cos(a),.171+i*.012,-.61+.088*Math.sin(a)],.012,0xb3a283);
    cord(p,[[0,.39,1.28],[.05,.32,1.05],[.16,.08,.82],[.12,.015,.58]],.014,0xbbab89);
    return pack(p);
  }
  function anchor(p,x,y,z,s){
    const a=group();p.add(a);a.position.set(x,y,z);a.scale.setScalar(s);
    loop(a,t=>[.044*Math.cos(t),.14+.044*Math.sin(t),0],.014,0xf4e9cb,M.paint,20);
    rod(a,[0,-.13,0],[0,.095,0],.016,0xf5e8c9,M.paint);
    rod(a,[-.08,.055,0],[.08,.055,0],.015,0xf5e8c9,M.paint);
    cord(a,[[-.13,-.045,0],[-.09,-.125,0],[0,-.164,0],[.09,-.125,0],[.13,-.045,0]],.018,0xf5e8c9,M.paint);
  }
  function basket(){
    const p=group();const radius=t=>.64+.27*t+.07*Math.sin(t*Math.PI),H=1.00;
    cyl(p,.659,.62,.085,56,0,.065,0,0x826344,M.wood);
    const ridges=[0xc69b64,0xcfab76,0xb58c5c,0xd1a875,0xc6a174];
    for(let j=0;j<23;j++){
      const t=(j+.6)/23;
      const pos=[],uv=[],idx=[];
      for(let i=0;i<=240;i++){
        const a=tau*i/240;
        for(const [yy,dr] of [[-.017,-.010],[-.018,.004],[-.011,.013],[.013,.013],[.019,.006],[.017,-.010]]){
          const r=radius(t)+.018*Math.cos(a*24+j*Math.PI)+dr;
          pos.push(r*Math.cos(a),.09+t*H+yy,r*Math.sin(a));uv.push(i/70,(yy+.02)*24);
        }
        if(i)for(let k=0;k<5;k++){const o=i*6+k;idx.push(o-6,o-5,o,o,o-5,o+1);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(p,g,M.rope,ridges[j%5]);
    }
    for(let i=0;i<48;i++){
      const a=i*tau/48;cord(p,Array.from({length:12},(_,j)=>{
        const t=j/11,r=radius(t)-.001;
        return [r*Math.cos(a),.07+t*1.04,r*Math.sin(a)];
      }),.018,0xaf8758,M.wood,5,false);
    }
    for(let i=0;i<3;i++){
      loop(p,a=>{const r=.91+.021*Math.cos(68*a+i*tau/3);return [Math.cos(a)*r,1.106+.022*Math.sin(68*a+i*tau/3),Math.sin(a)*r];},.028, i===1?0xd8bd90:0xb7996c,M.rope,540);
    }
    for(const side of [-1,1]){
      const path=t=>[side*(.81+.06*Math.sin(t)),1.01+.42*Math.sin(t),.34*Math.cos(t)];
      const pts=Array.from({length:30},(_,i)=>path(i*Math.PI/29));cord(p,pts,.044,0xad8855,M.rope,8);
      for(let j=0;j<8;j++){const t=.33+j*.35;const [x,y,z]=path(t);ball(p,.046,.036,.046,x,y,z,0xc4a77b,M.rope,10);}
    }
    const plate=cyl(p,.20,.20,.027,40,0,.72,.877,0x3c7474,M.metal);plate.rotation.x=Math.PI/2-.13;
    loop(p,a=>[.205*Math.cos(a),.722+.205*Math.sin(a),.895+.025*Math.sin(a)],.012,0xcdb68a,M.brass,48);
    anchor(p,0,.718,.904,.85);
    for(const x of [-.149,.149])ball(p,.013,.013,.01,x,.721,.919,0xe0bf7d,M.brass);
    return pack(p);
  }
  function dock(){
    const p=group(),width=2.83;
    for(const x of [-1.12,1.12])box(p,.18,.31,9.4,x,.40,4.23,0x766e5c,M.wet,.025);
    const shades=[0xa79c84,0xb0a38d,0x999480,0xc2b49a,0xa79d8b,0xb8a893];
    for(let j=0;j<29;j++){
      const z=-.66+j*.323,y=.641+rand()*.013;
      box(p,width+.045*rand(),.142,.307,(rand()-.5)*.026,y,z,shades[j%6],M.wood,.016);
      for(const x of [-1.13,1.13]){
        cyl(p,.013,.013,.009,8,x,y+.073,z+.095,0x615d52,M.metal);
        cyl(p,.013,.013,.009,8,x,y+.073,z-.093,0x686458,M.metal);
      }
    }
    for(const [x,z,height] of [[-1.35,-.46,1.07],[1.37,1.95,1.27],[-1.36,3.2,1.26],[1.37,5.4,1.34]]){
      const r=.185+rand()*.026;
      cyl(p,r,r*1.09,height+.69,20,x,(height-.69)/2,z,0x908775,M.wood);
      cyl(p,r*1.09,r*1.1,.46,20,x,.04,z,0x5b6254,M.wet);
      for(let j=0;j<4;j++)loop(p,t=>[x+(r+.010)*Math.cos(t),height-.26+j*.041,z+(r+.010)*Math.sin(t)],.024,0xb7ac90,M.rope,32);
      for(let j=1;j<=5;j++)loop(p,t=>[x+(r*j/6+.003*Math.sin(3*t))*Math.cos(t),height+.001,z+(r*j/6)*Math.sin(t)],.0028,0x7c7565,M.wood,28);
    }
    cord(p,[[1.38,1.15,1.94],[1.41,.88,2.8],[1.40,.79,3.72],[1.37,.90,4.6],[1.36,1.19,5.41]],.039,0xaa9e80,M.rope,7);
    const pts=[];
    for(let i=0;i<175;i++){const a=i*.16,r=.43-i*.0017;pts.push([.6+r*Math.cos(a),.738+i*.00011,2.45+r*.78*Math.sin(a)]);}
    cord(p,pts,.019,0xa5926d,M.rope,5,false);
    cord(p,[[1.40,.97,1.96],[1.31,.75,2.22],[1.13,.738,2.4],[1.02,.74,2.48]],.021,0xa5926d);
    return pack(p);
  }
  function fishingBoat(){
    const p=group();hull(p,5.0,1.70,1.02,[0x355f63,0xc77857,0xe1dfc9,0xa39679]);
    for(let j=0;j<6;j++)box(p,.73,.085,.31,0,.315,-1.75+j*.31,0xac9170,M.wood,.015);
    box(p,1.31,.87,1.32,0,.909,.36,0xe3ddc9,M.paint,.045);
    for(const x of [-.665,.665]){
      for(const z of [-.022,.529])box(p,.035,.367,.465,x,1.101,z,0x466775,M.glass,.018);
      box(p,.045,.065,1.41,x,.827,.36,0x7eaaa4,M.paint);
    }
    for(const x of [-.316,.316])box(p,.556,.36,.035,x,1.10,1.027,0x466b78,M.glass,.024);
    box(p,1.50,.111,1.57,0,1.401,.35,0x567e7e,M.paint,.036);
    box(p,1.54,.042,1.60,0,1.452,.35,0xe7e3d1,M.paint,.015);
    box(p,.49,.63,.032,.26,.87,-.312,0xa58a65,M.wood,.014);
    box(p,.42,.32,.038,-.3,1.087,-.318,0x3f5d66,M.glass,.02);
    cyl(p,.062,.079,2.06,12,-.18,1.57,-.42,0xbb9b66,M.wood);
    rod(p,[-.75,2.24,-.42],[.57,2.24,-.42],.033,0x998970,M.wood);
    for(const side of [-1,1]){
      cord(p,[[side*.68,.46,-1.46],[side*.30,1.49,-.98],[-.18,2.55,-.42]],.010,0x716f63,M.rope);
      cord(p,[[side*.59,.50,1.64],[side*.18,1.52,.55],[-.18,2.55,-.42]],.010,0x858276,M.rope);
      for(let j=0;j<3;j++){
        const z=.63+j*.38;
        rod(p,[side*(.72-j*.095),.40,z],[side*(.72-j*.095),.70,z],.019,0xbfc4b8,M.metal);
      }
      cord(p,[[side*.72,.71,.63],[side*.63,.71,1.01],[side*.52,.71,1.39],[0,.76,2.28]],.019,0xc8cabc,M.metal);
      for(const z of [-1.1,-.61]){
        ball(p,.095,.24,.09,side*.83,.20,z,0xded9be,M.paint);
        cord(p,[[side*.77,.48,z],[side*.83,.42,z],[side*.83,.37,z]],.017,0x887d65);
      }
    }
    loop(p,a=>[.684, .828+.167*Math.sin(a),.40+.167*Math.cos(a)],.048,0xc27352,M.paint);
    for(let i=0;i<4;i++){
      const a=i*tau/4;ball(p,.052,.054,.058,.686,.828+.167*Math.sin(a),.40+.167*Math.cos(a),0xf1e6ca,M.paint);
    }
    cyl(p,.097,.097,.36,16,.42,1.65,-.19,0x777a71,M.metal);
    cyl(p,.11,.11,.055,16,.42,1.829,-.19,0x4d5550,M.metal);
    for(let j=0;j<3;j++)box(p,1.05,.078,.17,0,.403,-1.51+j*.32,0xb39b77,M.wood,.012);
    box(p,.48,.20,.50,.30,.54,-1.37,0x839c8e,M.paint,.023);
    cyl(p,.09,.075,.123,14,-.18,2.64,-.42,0xdfc497,M.light);
    const flag=new T.BufferGeometry();flag.setAttribute('position',new T.Float32BufferAttribute([-.18,2.55,-.42,-.18,2.27,-.42,-.75,2.42,-.47],3));flag.computeVertexNormals();
    const flagM=M.paint.clone();flagM.side=T.DoubleSide;mesh(p,flag,flagM,0xbc7057);
    return pack(p);
  }
  function ridge(p,x,z,width,depth,height,color,seed){
    const pos=[],cols=[],ix=[],uv=[],steps=86,rows=11;
    for(let j=0;j<=rows;j++)for(let i=0;i<=steps;i++){
      const u=i/steps,v=j/rows,a=u*Math.PI;
      const dome=Math.pow(Math.max(0,Math.sin(a)),.72)*Math.pow(Math.sin(v*Math.PI),.62);
      const silhouette=.40+.33*noise(u*6,seed)+.28*noise(u*15,v*2+seed)+.12*Math.sin(u*20+seed);
      const h=dome*height*silhouette;
      pos.push(x+(u-.5)*width,h-.52,z+(v-.5)*depth+1.8*Math.sin(5*a+seed));
      const tone=new T.Color(color).multiplyScalar(.73+.22*noise(u*47,v*8+seed)+.15*(1-v)+.10*noise(u*13,v*4));
      cols.push(tone.r,tone.g,tone.b);uv.push(u,v);
      if(j&&i){const k=j*(steps+1)+i;ix.push(k-steps-2,k-1,k,k-steps-2,k,k-steps-1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();mesh(p,g,M.leaf,white);
  }
  function house(p,x,z,w,d,h,color,roof,yaw){
    const b=group();b.position.set(x,.84,z);b.rotation.y=yaw;p.add(b);
    box(b,w,h,d,0,h/2,0,color,M.stone);
    const slope=.43,hh=slope*d/2;
    for(const side of [-1,1]){
      const panel=box(b,w+.42,.13,(d*.5+.24)*Math.sqrt(1+slope*slope),0,h+hh*.46,side*d*.255,roof,M.paint);
      panel.rotation.x=side*Math.atan(slope);
      for(let j=0;j<7;j++){
        const seam=box(b,.038,.066,(d*.5+.25)*Math.sqrt(1+slope*slope),(j/6-.5)*(w+.25),h+hh*.46+.073,side*d*.255,roof,M.metal);
        seam.rotation.x=panel.rotation.x;
      }
    }
    rod(b,[-w*.55,h+hh+.05,0],[w*.55,h+hh+.05,0],.082,roof,M.paint);
    const tri=new T.BufferGeometry(),arr=[];
    for(const s of [-1,1])arr.push(s*w/2,h,-d/2,s*w/2,h+hh,0,s*w/2,h,d/2);
    tri.setAttribute('position',new T.Float32BufferAttribute(arr,3));tri.computeVertexNormals();mesh(b,tri,M.stone,color);
    const facade=0x546b6b;
    for(let i=0;i<3;i++){
      const xx=(i-1)*w*.29,ww=w*.197;
      box(b,ww+.095,h*.43,.065,xx,h*.58,d/2+.022,0xada995,M.wood);
      box(b,ww,h*.38,.074,xx,h*.58,d/2+.058,facade,M.glass);
      box(b,.048,h*.4,.09,xx,h*.58,d/2+.065,0xaaa694,M.wood);
    }
    box(b,w*1.04,.09,.65,0,h*.87,d/2+.26,roof,M.metal).rotation.x=.16;
  }
  function lighthouse(p){
    const l=group();p.add(l);
    cyl(l,1.12,1.28,.39,24,0,1.0,0,0xb2b3a7,M.stone);
    cyl(l,.57,.849,3.45,32,0,2.91,0,0xe5dfc9,M.stone);
    cyl(l,.57,.62,.54,32,0,4.33,0,0xb96048,M.paint);
    cyl(l,.90,.64,.22,28,0,4.70,0,0xddcfb6,M.paint);
    cyl(l,.45,.49,.81,12,0,5.17,0,0x9eb4b3,M.glass);
    for(let i=0;i<8;i++){
      const a=tau*i/8;rod(l,[.46*Math.cos(a),4.76,.46*Math.sin(a)],[.45*Math.cos(a),5.58,.45*Math.sin(a)],.029,0xa2624c,M.metal);
      rod(l,[.80*Math.cos(a),4.75,.80*Math.sin(a)],[.80*Math.cos(a),5.12,.80*Math.sin(a)],.022,0xb9ac91,M.metal);
    }
    loop(l,a=>[.80*Math.cos(a),5.12,.80*Math.sin(a)],.025,0xbcaa8b,M.metal,30);
    cyl(l,.08,.66,.359,24,0,5.73,0,0xa55844,M.metal);
    ball(l,.075,.11,.075,0,5.96,0,0xb2a181,M.brass);
    for(const y of [2.04,3.55])box(l,.22,.35,.09,0,y,.75-(y-2)*.08,0x647573,M.glass);
    return l;
  }
  function world(frame){
    const previousRandom=rand;rand=Harbor.random(4729);
    const p=group(),n=frame.narrow;
    ridge(p,-31,-197,184,29,21,0x819caa,5);
    ridge(p,84,-201,167,35,27,0x8fa7b1,14);
    ridge(p,-62,-143,108,26,22,0x687f83,11);
    ridge(p,52,-130,111,25,17,0x718b89,32);
    ridge(p,-29,-100,88,15,10.2,0x71857a,18);
    ridge(p,6,-86,21,8,3.9,0x768c83,22);
    // Harbour buildings follow the waterfront, with the channel kept open in the middle.
    const left=frame.waterAt(.22,.324+.022*n),town=group();p.add(town);town.position.set(left.x,0,left.z);
    box(town,62,1.62,9,-28,.08,-4.5,0x919488,M.stone);
    box(town,63,.27,2,-28,.91,-.75,0xb5b3a3,M.stone);
    for(let i=0;i<18;i++)box(town,3.3,.038,.053,-56+3.35*i,.66,.02,0x888f84,M.stone);
    const roofs=[0x617076,0x586466,0x83887d,0x586f73,0x9b7f69];
    for(let i=0;i<13;i++){
      const wid=3+rand()*2.9;
      house(town,-i*4.37,-3.8-rand()*2,wid,3+rand()*1.8,1.7+rand()*1.9,
        [0xc7bda3,0xddcfb2,0xb5b5a3,0xc0c2b2][i%4],roofs[i%5],(rand()-.5)*.23);
    }
    for(let i=0;i<8;i++)house(town,-4-i*6,-10-rand()*2,4.3,4,3.8+rand()*1.2,0xc3c0ad,roofs[(i+2)%5],.06);
    const poles=[];
    for(let i=0;i<8;i++){
      const x=2-i*8.3,z=-1.65-i*.13,h=4.4+rand()*.55;
      rod(town,[x,.8,z],[x+.10,h,z],.058,0x8d8571,M.wood,.039);
      box(town,.8,.077,.10,x+.1,h-.36,z,0x827d70,M.wood);
      poles.push([x+.1,h-.13,z]);
    }
    for(let i=1;i<poles.length;i++){
      const a=poles[i-1],b=poles[i];cord(town,[a,[(a[0]+b[0])/2,(a[1]+b[1])/2-.56,(a[2]+b[2])/2],b],.014,0x7c8277,M.metal,3);
    }
    for(let i=0;i<6;i++){
      const b=group();town.add(b);b.position.set(-1-i*7,.12,1.9+(i%2)*.7);b.rotation.y=1.0+i*.22;
      hull(b,3.36,.96,.48,[i%2?0x587e83:0x8e9285,0xf1e5cd,0xc1b299,0x95846b]);
      box(b,.76,.48,.89,0,.40,.28,0xe1ddca,M.paint);
      box(b,.778,.18,.58,0,.51,.26,0x526e77,M.glass);box(b,.89,.08,.99,0,.66,.27,0x6d8582,M.paint);
    }
    const beacon=frame.waterAt(.845,.329+.019*n),wall=group();p.add(wall);wall.position.set(beacon.x,0,beacon.z);wall.rotation.y=-.19;
    box(wall,68,1.19,2.7,33.4,.18,-.4,0xa4a59a,M.stone);box(wall,68.1,.16,2.9,33.4,.85,-.4,0xc5c1ad,M.stone);
    box(wall,68,.29,.10,33.4,-.005,1.00,0x717e70,M.stone);
    for(let i=0;i<20;i++)box(wall,.043,.78,.045,1.3+i*3.3,.38,.96,0x858b7d,M.stone);
    lighthouse(wall);
    // Low, irregular wind-shaped foliage behind the fishing houses.
    for(let i=0;i<55;i++){
      const x=left.x-4-rand()*56,z=left.z-11-rand()*10,sz=1+rand()*1.6;
      ball(p,sz*1.4,sz*.85,sz,x,2.7+rand()*1.8,z,[0x788773,0x7c8b76,0x718775][i%3],M.leaf,9);
    }
    rand=previousRandom;return pack(p);
  }
  function hand(){
    const p=group(),c=0xffefcf,m=M.paint;
    // A small open fingertip silhouette hovering over the point of contact.
    const shape=new T.Shape();shape.moveTo(-.045,.02);
    shape.lineTo(-.045,.56);shape.quadraticCurveTo(-.045,.65,.042,.65);shape.quadraticCurveTo(.12,.65,.12,.565);
    shape.lineTo(.12,.323);shape.quadraticCurveTo(.171,.392,.235,.313);
    shape.quadraticCurveTo(.30,.352,.353,.264);shape.quadraticCurveTo(.462,.282,.462,.171);
    shape.lineTo(.451,-.010);shape.quadraticCurveTo(.44,-.18,.312,-.237);
    shape.lineTo(.113,-.237);shape.quadraticCurveTo(.052,-.23,.004,-.165);
    shape.lineTo(-.178,.054);shape.quadraticCurveTo(-.210,.135,-.139,.161);shape.quadraticCurveTo(-.103,.177,-.045,.103);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.024,bevelEnabled:true,bevelSize:.014,bevelThickness:.014,bevelSegments:2,curveSegments:8});
    const ob=mesh(p,g,m,c);ob.rotation.z=2.65;ob.position.set(.337,.547,0);return pack(p);
  }
  return {crate,fishingFloat,dinghy,basket,dock,world,fishingBoat,hand,texture,M,group,ball,rod,cord,cyl,box,pack};
};
