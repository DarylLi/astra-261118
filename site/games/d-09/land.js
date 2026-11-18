'use strict';
const Landscape=(()=>{
  const {T,group,mat,mesh,ell,box,cyl,rod,poly,bake,noise,rand,hash,texture}=Art;
  const P=DigPhysics, grassTones=[0x8e9e5c,0x9ba76f,0x798b54,0xb3af70,0x80965e,0x697d4b];
  const color=h=>new T.Color(h);
  const earthTexture=texture(384,(x,y)=>{
    const f=(noise(x/13,y/13)-.5)*26+(noise(x/3,y/3)-.5)*34+(hash(x,y)-.5)*47;
    const pebble=hash(x>>1,y>>1)>.986?24:0;
    return [211+f+pebble,204+f+pebble,193+f+pebble];},true);
  const gravel=mat(0xffffff,.94,.025,{map:earthTexture,bumpMap:earthTexture,bumpScale:.047,vertexColors:true});
  const dampMat=mat(0xffffff,.80,.037,{map:earthTexture,bumpMap:earthTexture,bumpScale:.057,vertexColors:true});
  const soilColor=color(0x947253),fieldColor=color(0x989b6e),roadColor=color(0xc1aa87),grassColor=color(0x95a26e);
  function landColor(x,z) {
    const dist=Math.sqrt(((x-P.cx)/P.rx)**2+((z-P.cz)/P.rz)**2);
    const n=noise(x*.47,z*.52),small=noise(x*2.5,z*2.5);
    const path= Math.min(1,Math.max(0,(Math.abs(z-.50+.105*x)-2.6+(n-.5)*2.40)*.75));
    const c=roadColor.clone().lerp(fieldColor,path).lerp(grassColor,path*n);
    c.lerp(soilColor,Math.max(0,Math.min(1,(1.43-dist)*2.5)));
    return c.multiplyScalar(.84+.25*n+.08*small);
  }
  function surface(x,z) {
    const edge=Math.max(0,Math.min(1,(Math.abs(z)-3.1)/9));
    return -.023+edge*((noise(x*.19,z*.22)-.4)*.52+Math.max(0,-z-8)*.032);
  }
  function makeGeo(pos,cols,uv,ind){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    if(cols)g.setAttribute('color',new T.Float32BufferAttribute(cols,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(ind)g.setIndex(ind);g.computeVertexNormals();return g;
  }
  function field(scene) {
    function axis(lo,hi,cutLo,cutHi){
      const vals=[cutLo,cutHi];for(let i=lo;i<=hi;i+=.53)if(Math.abs(i-cutLo)>.08&&Math.abs(i-cutHi)>.08)vals.push(i);
      return vals.sort((a,b)=>a-b);
    }
    const xs=axis(-49,49,P.cx-P.rx,P.cx+P.rx),zs=axis(-43,36,P.cz-P.rz,P.cz+P.rz),w=xs.length;
    const pos=[],co=[],uv=[],ind=[];
    for(let j=0;j<zs.length;j++)for(let i=0;i<w;i++){
      const x=xs[i],z=zs[j];
      pos.push(x,surface(x,z),z);uv.push(x*.61,z*.61);landColor(x,z).toArray(co,co.length);
      if(i+1===w||j+1===zs.length)continue;
      if(x>=P.cx-P.rx-1e-5&&xs[i+1]<=P.cx+P.rx+1e-5&&z>=P.cz-P.rz-1e-5&&zs[j+1]<=P.cz+P.rz+1e-5)continue;
      const a=j*w+i;ind.push(a,a+w,a+1,a+1,a+w,a+w+1);
    }
    const ground=mesh(scene,makeGeo(pos,co,uv,ind),gravel);ground.castShadow=false;
  }
  function patch(scene,sim){
    const s=sim.state, pos=[],co=[],uv=[],idx=[],base=[];
    s.cells.forEach((c,i)=>{
      pos.push(c.x,c.rest,c.z);uv.push(c.x*.93,c.z*.93);
      const col=landColor(c.x,c.z).lerp(color(0xa17a54),Math.min(1,c.bank*5)).multiplyScalar(.76+c.grain*.27);
      col.toArray(co,co.length);base.push(col);
      if(i%P.NX!==P.NX-1 && i+P.NX<s.cells.length)idx.push(i,i+P.NX,i+1,i+1,i+P.NX,i+P.NX+1);
    });
    const g=makeGeo(pos,co,uv,idx),pit=mesh(scene,g,dampMat);
    pit.frustumCulled=false;
    const wg=makeGeo(pos,null,uv,idx),wm=mat(0x83b8b6,.17,.37,{transparent:true,opacity:.86,envMapIntensity:1.70});
    wm.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float wet; varying float vWet;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWet=wet;');
      shader.fragmentShader='varying float vWet;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\nif(vWet<0.0019)discard; diffuseColor.a*=smoothstep(.0019,.025,vWet);');
    };
    wg.setAttribute('wet',new T.Float32BufferAttribute(new Float32Array(s.cells.length),1));
    const water=mesh(scene,wg,wm);water.castShadow=false;water.frustumCulled=false;
    // Embedded granules move down with the grid instead of floating above a cut.
    const chips=instances(scene,new T.DodecahedronGeometry(1,0),mat(0xffffff,.9,.06),260);
    const specs=Array.from({length:260},()=>({i:Math.floor(rand()*s.cells.length),ox:(rand()-.5)*.11,
      oz:(rand()-.5)*.10,r:.012+rand()**2*.042,a:rand()*6,c:color(rand()>.52?0x9d7956:0x735942).multiplyScalar(.8+rand()*.40)}));
    let dirty=-1;
    function update(){
      const target=s.phase!=='soil'||s.action==='cut';
      if(!target && dirty===s.cycle)return;
      dirty=s.cycle;
      const pa=g.attributes.position,ca=g.attributes.color,wa=wg.attributes.position,wet=wg.attributes.wet;
      s.cells.forEach((c,i)=>{
        const y=c.rest-c.depth, shade=(1-Math.min(.27,c.depth*.19))*(1-Math.max(0,c.moisture-.4)*.38),b=base[i];
        pa.setY(i,y);ca.setXYZ(i,b.r*shade,b.g*shade,b.b*shade);
        wa.setY(i,y+c.water+.007);wet.setX(i,c.water);
      });
      pa.needsUpdate=ca.needsUpdate=wa.needsUpdate=wet.needsUpdate=true;g.computeVertexNormals();wg.computeVertexNormals();
      water.visible=s.phase!=='soil';
      specs.forEach((o,i)=>{const c=s.cells[o.i];put(chips,i,c.x+o.ox,c.rest-c.depth+.003,c.z+o.oz,
        o.r,o.r*.66,o.r*.85,o.a,o.c);});chips.instanceMatrix.needsUpdate=true;
    }
    update();return {pit,update};
  }
  const dummy=new T.Object3D();
  function instances(scene,g,m,n){
    const obj=new T.InstancedMesh(g,m,n);scene.add(obj);obj.castShadow=obj.receiveShadow=true;obj.frustumCulled=false;return obj;
  }
  function put(obj,i,x,y,z,sx,sy,sz,a,col,tilt=0){
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,a,tilt);dummy.updateMatrix();
    obj.setMatrixAt(i,dummy.matrix);if(col)obj.setColorAt(i,col);
  }
  function mound(scene,x,z,rx,rz,height,col,seed){
    const rows=13,n=50,pos=[],co=[],uv=[],ind=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<n;i++){
      const a=i*2*Math.PI/n,r=j/rows, xx=Math.cos(a)*r,zz=Math.sin(a)*r;
      const n1=noise(xx*3+seed,zz*3), n2=noise(xx*15+seed,zz*16);
      const k=1+.28*(noise(Math.cos(a)*3+seed,Math.sin(a)*3)-.5);
      const wx=x+xx*rx*k,wz=z+zz*rz*k;
      const h=height*Math.max(0,1-r**1.62)**1.66*(.83+n1*.34)+(n2-.5)*height*.13*Math.sin(Math.PI*r);
      pos.push(wx,surface(wx,wz)+h-.014,wz);uv.push(wx*.86,wz*.86);
      color(col).multiplyScalar(.74+.28*n1+.23*n2).toArray(co,co.length);
      if(j<rows){const u=j*n+i,v=j*n+(i+1)%n;ind.push(u,v+n,u+n,u,v,v+n);}
    }
    mesh(scene,makeGeo(pos,co,uv,ind),gravel);
  }
  function grass(scene){
    const blades=[],colors=[],indices=[],windIndex=[];
    const flowers=[],leaves=[];
    function tuft(x,z,n,scale,zone){
      let y=surface(x,z);
      for(let i=0;i<n;i++){
        const a=rand()*6.283, l=(.085+rand()*.25)*scale,r=.020+rand()*.12*scale,
          w=(.009+rand()*.024)*scale,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;
        const ux=Math.cos(a)*w,uz=Math.sin(a)*w,lean=.25+rand()*.45;
        const j=blades.length/3, ahead=l*lean;
        blades.push(xx-ux,y,zz+uz,xx+ux,y,zz-uz,xx+ux*.48+Math.sin(a)*ahead*.43,y+l*.65,zz+Math.cos(a)*ahead*.43,
          xx-ux*.48+Math.sin(a)*ahead*.43,y+l*.65,zz+Math.cos(a)*ahead*.43,xx+Math.sin(a)*ahead,y+l,zz+Math.cos(a)*ahead);
        const c=color(grassTones[Math.floor(rand()*grassTones.length)]).multiplyScalar(.76+rand()*.40);
        for(const f of [.65,.70,1,1,1.18])colors.push(c.r*f,c.g*f,c.b*f);
        indices.push(j,j+1,j+2,j,j+2,j+3,j+3,j+2,j+4);
        windIndex.push(zone,zone,zone,zone,zone);
      }
    }
    for(let i=0;i<6100;i++){
      const x=rand()*43-21,z=rand()*34-21,road=Math.abs(z-.4+.105*x);
      if(road<3.4+noise(x*.43,z*.50)*1.9)continue;
      if(Math.abs(x)<2.55 && Math.abs(z+2.86)<1.7)continue;
      const zone=(Math.floor((x+25)/3)+Math.floor((z+25)/3)*3)%16;
      tuft(x,z,4+Math.floor(rand()*6),.78+rand()*.5,zone);
    }
    for(const [ax,az] of [[-4.92,1.5],[-4.89,-2.4],[3.18,2.45],[3.81,2.93],[-2.20,3.24],[-4.96,3.55],[4.89,.46],[2.35,-3.80],[-.73,-1.53]]){
      for(let i=0;i<19;i++){
        const x=ax+(rand()-.5)*.93,z=az+(rand()-.5)*.64;
        tuft(x,z,6,.66+rand()*.8,i%16);
        if(rand()>.45){const size=.028+rand()*.031;flowers.push({x,y:surface(x,z)+.16+rand()*.18,z,size,white:rand()>.38});}
      }
    }
    const g=makeGeo(blades,colors,null,indices),gm=mat(0xffffff,.88,0,{vertexColors:true,side:T.DoubleSide});
    const winds={value:new Float32Array(16)};
    g.setAttribute('zone',new T.Float32BufferAttribute(windIndex,1));
    const weights=new Float32Array(windIndex.length);
    for(let i=0;i<weights.length;i++)weights[i]=[0,0,.47,.47,1][i%5];
    g.setAttribute('bladeTip',new T.Float32BufferAttribute(weights,1));
    gm.onBeforeCompile=sh=>{sh.uniforms.bends=winds;sh.vertexShader='uniform float bends[16]; attribute float zone; attribute float bladeTip;\n'+sh.vertexShader;
      sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=bends[int(zone)]*bladeTip*.62;');};
    const grassMesh=mesh(scene,g,gm);grassMesh.castShadow=false;
    const stems=group(scene),petalMat=mat(0xffffff,.7,.01),stem=mat(0x687b47,.89,.01);
    const petals=instances(scene,new T.SphereGeometry(1,6,4),petalMat,flowers.length*8);
    let n=0;
    for(const f of flowers){
      rod(stems,[f.x-.024,surface(f.x,f.z),f.z],[f.x,f.y,f.z],.005,stem,.004,4);
      for(let i=0;i<7;i++){const a=i*6.283/7;put(petals,n++,f.x+Math.cos(a)*f.size*.60,f.y,f.z+Math.sin(a)*f.size*.60,
        f.size*.70,.009,f.size*.32,-a,color(f.white?0xfff4d9:0xf7cc55),.14);}
      put(petals,n++,f.x,f.y+.008,f.z,.020,.014,.020,0,color(0xd7a33e));
    }
    bake(stems);return (s)=>s.winds.forEach((w,i)=>winds.value[i]=w.bend);
  }
  function trees(scene){
    const woods=group(scene),bark=mat(0x857865,.94,.01),pale=mat(0xc6c0a6,.86,.01);
    const crown=[],sprigs=[];
    function tree(x,z,h,w,light=false){
      const base=surface(x,z),lean=(rand()-.5)*.65,wood=light?pale:bark;
      rod(woods,[x,base,z],[x+lean*.5,base+h*.52,z+.09],h*.028,wood,h*.017,8);
      rod(woods,[x+lean*.5,base+h*.52,z+.09],[x+lean,base+h*.90,z-.14],h*.019,wood,h*.004,7);
      if(light)for(let i=0;i<10;i++){
        const k=.08+i*.042;
        rod(woods,[x+lean*k,base+h*k,z+.10],[x+lean*k+.09,base+h*k+.022,z+.10],.018,bark,.007,5);
      }
      const pal=light?[0x99aa77,0xb1b88a,0x91a679,0x85996b]:[0x758c6c,0x91a476,0x8a9a73,0x829870];
      for(let i=0;i<19;i++){
        const f=i/19,a=i*2.4+rand()*.6,hh=h*(.42+.57*f),spread=w*(.22+.77*Math.sin(Math.PI*(.08+.84*f)))*(.63+rand()*.37);
        const bx=x+lean*f+Math.cos(a)*spread,bz=z+Math.sin(a)*spread;
        const fork=[x+lean*f,base+hh-h*.22,z],elbow=[(x+bx)*.5,base+hh-h*.13,(z+bz)*.5];
        rod(woods,fork,elbow,h*.011,wood,h*.007,6);rod(woods,elbow,[bx,base+hh,bz],h*.007,wood,h*.002,5);
        for(let k=0;k<4;k++){
          const xx=bx+(rand()-.5)*w*.52,yy=base+hh+(rand()-.5)*h*.10,zz=bz+(rand()-.5)*w*.55;
          const r=w*(.16+rand()*.17),col=color(pal[Math.floor(rand()*4)]).multiplyScalar(.87+rand()*.24);
          crown.push([xx,yy,zz,r,r*(.66+rand()*.41),r*.9,rand()*6,col]);
          for(let l=0;l<9;l++){const angle=rand()*6.283,dy=rand()*1.7-.85,rr=r*Math.sqrt(1-dy*dy),rr2=r*(.10+rand()*.12);
            sprigs.push([xx+Math.cos(angle)*rr,yy+r*dy*.75,zz+Math.sin(angle)*rr,rr2,rr2*.65,rr2*.84,rand()*6,col]);}
        }
      }
    }
    for(let i=0;i<33;i++){const x=-40+i*2.6,z=-19-rand()*10;tree(x,z,3.8+rand()*3.6,1.8+rand()*1.53,i%6===2);}
    tree(-9.1,-6.6,6.6,2.20,true);tree(-11,-6.9,5.45,2.0,true);
    tree(9.8,-7.6,7.15,2.83);tree(12.6,-7.99,5.45,2.21);
    tree(-6.7,-12,5.04,2.3);tree(5.3,-14,5.9,1.65,true);
    bake(woods);
    const leafGeo=new T.IcosahedronGeometry(1,1),leafC=leafGeo.attributes.position, cols=[];
    for(let i=0;i<leafC.count;i++){const n=.88+.16*hash(Math.round(leafC.getX(i)*10),Math.round(leafC.getY(i)*10));cols.push(n,n,n*.986);}
    leafGeo.setAttribute('color',new T.Float32BufferAttribute(cols,3));
    const lm=mat(0xffffff,.96,0,{vertexColors:true});
    const c=instances(scene,leafGeo,lm,crown.length);
    crown.forEach((a,i)=>put(c,i,...a));c.castShadow=false;
    const l=instances(scene,new T.IcosahedronGeometry(1,0),mat(0xffffff,.96,0),sprigs.length);
    sprigs.forEach((a,i)=>put(l,i,...a));l.castShadow=false;
  }
  function horizon(scene){
    for(const [dist,level,co] of [[-56,7.7,0x859897],[-40,4.7,0x82968b]]){
      const pos=[],cols=[],uv=[],idx=[];
      for(let j=0;j<6;j++)for(let i=0;i<=80;i++){
        const x=-90+i*2.25,k=j/5,peak=level*(.41+noise(x*.061,dist)*.84)+1.2*Math.sin(x*.12+dist);
        pos.push(x,.05+peak*k+Math.sin(Math.PI*k)*1.4,dist+10*(1-k));
        color(co).multiplyScalar(.89+.20*noise(x*.14,k*6)).toArray(cols,cols.length);uv.push(i/6,j);
        if(j<5&&i<80){const a=j*81+i;idx.push(a,a+1,a+81,a+1,a+82,a+81);}
      }
      const o=mesh(scene,makeGeo(pos,cols,uv,idx),mat(0xffffff,.99,0,{vertexColors:true,side:T.DoubleSide}));o.castShadow=false;
    }
    const props=group(scene),post=mat(0x91836c,.95,.02),rail=mat(0xa49679,.93,.01);
    function fence(x,z,endX,endZ,n){
      let last;
      for(let i=0;i<=n;i++){
        const k=i/n,xx=x+(endX-x)*k,zz=z+(endZ-z)*k,yy=surface(xx,zz),h=.82+rand()*.16;
        const b=box(props,.13,h,.14,xx,yy+h/2,zz,post,.014);b.rotation.z=(rand()-.5)*.09;
        if(last)for(const h1 of [.33,.66])rod(props,[last[0],last[1]+h1,last[2]],[xx,yy+h1,zz],.048,rail,.052,5);
        last=[xx,yy,zz];
      }
    }
    fence(-22,-6.7,-3.7,-8.3,8);fence(1.1,-8.7,21,-9.9,9);
    // A quiet field shed sits back among the trees.
    const shed=group(props);shed.position.set(8.5,surface(8.5,-15.1),-15.1);shed.rotation.y=-.19;
    const wall=mat(0xb1a895,.90,.04),roof=mat(0x77837d,.77,.20);
    poly(shed,[[-2.23,0],[-2.23,1.69],[0,2.59],[2.23,1.69],[2.23,0]],2.68,0,0,0,wall,.02);
    for(const sign of [-1,1])box(shed,2.59,.095,3.04,sign*1.15,2.14,0,roof,.012).rotation.z=-sign*.38;
    for(let i=0;i<19;i++)box(shed,.035,1.55,.024,-2.07+i*.225,.79,1.35,post,.005);
    box(shed,1.12,1.39,.04,.48,.69,1.38,post);
    const roadside=mat(0xca9456,.72,.02),wh=mat(0xe7dcc2,.62,.12);
    for(const [x,z,k] of [[-4.83,-.49,.86],[4.74,.46,.83],[5.34,-3.36,.79]]){
      const y=surface(x,z);box(props,.38*k,.055,.38*k,x,y+.032,z,Art.black,.025);
      cyl(props,.048*k,.151*k,.391*k,x,y+.22*k,z,roadside,'y',24);
      cyl(props,.077*k,.101*k,.083*k,x,y+.269*k,z,wh,'y',24);
    }
    bake(props);
  }
  function scatter(scene){
    const n=2450,obj=instances(scene,new T.DodecahedronGeometry(1,0),mat(0xffffff,.92,.03),n);
    for(let i=0;i<n;i++){
      let x=rand()*36-18,z=rand()*19-8;
      if(x>P.cx-P.rx&&x<P.cx+P.rx&&z>P.cz-P.rz&&z<P.cz+P.rz)z+=3.1;
      const sz=.009+rand()**3*.060, c=color(rand()>.56?0xa59b81:0x947e65).multiplyScalar(.8+rand()*.41);
      put(obj,i,x,surface(x,z),z,sz*1.7,sz*.65,sz,rand()*6,c);
    }
    const marks=group(scene),tm=mat(0x9c886a,.96,.01);
    // Broken parallel track impressions pressed into the lane.
    for(const z of [-.68,.77])for(let i=0;i<23;i++){
      const x=-4.0-i*.19;box(marks,.068,.010,.35,x,surface(x,z)+.004,z,tm,.004).rotation.y=-.13+rand()*.10;
    }
    bake(marks);
  }
  function wetRuts(scene){
    const puddleMat=mat(0x827e64,.20,.32,{envMapIntensity:1.35}), meshes=[];
    for(const [x,z,w,d] of [[-2.85,1.69,.69,.14],[3.17,.64,.46,.115]]){
      const pts=[x,.004,z],uv=[.5,.5],inds=[];
      for(let j=0;j<2;j++)for(let i=0;i<18;i++){
        const a=i*Math.PI/9,extent=(j?.99:.57)*(.84+.25*hash(i,77));
        pts.push(x+Math.cos(a)*w*extent,.004,z+Math.sin(a)*d*extent);
        uv.push(.5+.5*Math.cos(a),.5+.5*Math.sin(a));
        const n=(i+1)%18;
        if(!j)inds.push(0,1+n,1+i);
        else inds.push(1+i,1+n,19+i,19+i,1+n,19+n);
      }
      const g=makeGeo(pts,null,uv,inds),m=mesh(scene,g,puddleMat);m.castShadow=false;meshes.push(g);
    }
    return s=>{meshes.forEach((g,k)=>{const p=g.attributes.position;
      for(let i=0;i<18;i++)p.setY(1+i,.004+s.puddles[k].h[i]);
      p.needsUpdate=true;g.computeVertexNormals();});};
  }
  function create(scene,sim){
    field(scene);const ground=patch(scene,sim);
    mound(scene,-.42,-2.84,2.29,1.32,1.48,0x98744f,82);
    mound(scene,.97,-2.66,1.02,1.04,.77,0xab8562,34);
    mound(scene,-3.80,5.15,2.23,1.04,.63,0x8c6b4c,47);
    mound(scene,4.11,6.34,2.34,1.60,.83,0x846448,35);
    mound(scene,-5.24,-3.40,1.31,.91,.57,0xab8968,27);
    horizon(scene);trees(scene);const wind=grass(scene),wet=wetRuts(scene);scatter(scene);
    return {pit:ground.pit,update(s){ground.update();wind(s);wet(s);}};
  }
  return {create,put,instances,surface};
})();
