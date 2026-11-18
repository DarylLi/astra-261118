(function(){
  'use strict';
  const T=THREE,F=Flight,M=Models,{noise,hash,mix,terrain}=F,TAU=Math.PI*2;
  const sunDirection=(vector,angle)=>vector.set(.17,Math.tan(angle)*Math.hypot(1,.17),-1).normalize();
  const skyVertex=`
    varying vec3 skyDir;
    void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `;
  const noiseGL=`
    float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float bn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash2(i),hash2(i+vec2(1.,0.)),f.x),mix(hash2(i+vec2(0.,1.)),hash2(i+1.),f.x),f.y);}
    float fb(vec2 p){return .547*bn(p)+.266*bn(p*2.04+3.2)+.128*bn(p*4.09+9.)+.059*bn(p*8.24);}
  `;
  const skyFragment=`varying vec3 skyDir; uniform vec3 uSun;uniform float uGold;uniform float uAir;
    `+noiseGL+`
    void main(){
      vec3 d=normalize(skyDir);float h=max(d.y,0.);float nearSun=max(0.,dot(d,uSun));float angle=distance(d,uSun);
      vec3 sky=mix(vec3(1.16,.666,.454),vec3(.57,.712,.814),smoothstep(-.035,.19,h));
      sky=mix(sky,vec3(.206,.454,.636),smoothstep(.11,.49,h));
      sky=mix(sky,vec3(.087,.292,.492),smoothstep(.42,.94,h));
      sky+=vec3(.215,.083,.035)*pow(nearSun,12.)*exp(-h*3.);
      vec2 uv=d.xz/(max(.012,h)+.09);
      float wisps=fb(uv*vec2(1.25,5.)+vec2(uAir*.008,18.));
      float streak=fb(uv*vec2(2.2,11.)+vec2(-uAir*.006,7.));
      float top=smoothstep(.40,.75,wisps+.12*(streak-.5))*.39*smoothstep(.008,.13,h);
      sky=mix(sky,vec3(1.03,.839,.745),top);
      float bank=fb(uv*vec2(1.13,2.8)+vec2(17.,2.));
      float cloud=smoothstep(.505,.72,bank+.12*streak)*smoothstep(.007,.044,h)*(1.-smoothstep(.18,.31,h))*.63;
      sky=mix(sky,mix(vec3(.83,.719,.739),vec3(1.3,1.015,.79),smoothstep(.48,.74,bank)),cloud);
      sky+=vec3(1.45,.74,.29)*exp(-angle*16.)+vec3(.49,.215,.073)*exp(-angle*4.2);
      sky=mix(sky,vec3(5.2,3.51,1.88),1.-smoothstep(.0135,.0152,angle));
      gl_FragColor=vec4(sky,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function mountainRange(parent,layer){
    const segments=256,bands=15,verts=[],cols=[],idx=[];
    const back=layer===1,zBase=back?1530:1060;
    const rock=new T.Color(),base=new T.Color(back?0x99a6b6:0x778b9d),snow=new T.Color(back?0xf4dfda:0xe9d7cd);
    for(let row=0;row<=bands;row++)for(let i=0;i<=segments;i++){
      const x=(i/segments-.5)*4900, u=row/bands;
      const shifted=x+(back?121:0);
      const peak=(center,width,h)=>h*Math.max(0,1-Math.abs((shifted-center)/width))**.71;
      const jag=56*noise(x*.008,layer*71+4)+27*noise(x*.033,98+layer);
      const crest=35+jag+Math.max(peak(-600,460,290),peak(-320,267,168),peak(520,306,277),
        peak(870,473,335),peak(-1350,402,310),peak(1400,530,293),peak(16,208,back?78:22));
      const height=mix(-28,crest*(back?1:.73),u);
      const ridge=noise(x*.007+row*.096,layer+3)+.45*noise(x*.019,row*.077+11);
      const depth=zBase-(1-u)*310 + ridge*85 + 55*Math.sin(x*.003+.4);
      verts.push(x,height,-depth);
      const n=noise(x*.021+row*.11,row*.36+layer), ice=smooth((u-.68)*3.9+(n-.6)*1.9+(crest-213)*.005);
      rock.copy(base).multiplyScalar(.75+.28*n+.18*ridge).lerp(snow,ice*(back?.83:.66));
      cols.push(rock.r,rock.g,rock.b);
    }
    for(let r=0;r<bands;r++)for(let i=0;i<segments;i++){
      const a=r*(segments+1)+i;idx.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);
    }
    const g=build(verts,cols,idx);
    const m=M.mat(0xffffff,.96,0,{vertexColors:true,side:T.DoubleSide});
    const o=M.mesh(parent,g,m);o.castShadow=false;o.receiveShadow=false;
  }
  function smooth(x){x=F.clamp(x,0,1);return x*x*(3-2*x);}
  function build(v,c,idx,uv) {
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
    g.setAttribute('color',new T.Float32BufferAttribute(c,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const landMat=M.mat(0xffffff,.97,0,{vertexColors:true});
  // Grain changes scale with distance so the grass is fine near the shore and soft in the hills.
  landMat.onBeforeCompile=sh=>{
    sh.vertexShader='varying vec3 vMeadow;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvMeadow=(modelMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader='varying vec3 vMeadow;\n'+noiseGL+sh.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      float broad=fb(vMeadow.xz*.075);
      float small=bn(vMeadow.xz*1.3);
      diffuseColor.rgb*=.85+.23*broad+.085*small;
      float valleyMist=exp(-max(0.,vMeadow.y)*.028)*smoothstep(95.,780.,vViewPosition.z);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.65,.61),valleyMist*.46);
    `);
  };
  const grassGreen=new T.Color(0x94a269),dryGreen=new T.Color(0xc2b27d),forestGreen=new T.Color(0x627c69),
    hillGreen=new T.Color(0x819486),shoreColor=new T.Color(0xc6ba97),oneColor=new T.Color();
  const tileLength=256,tileColumns=138,tileRows=40;
  const xAt=i=>{const u=(i/tileColumns-.5)*2;return u*201+Math.sign(u)*Math.pow(Math.abs(u),3.5)*798;};
  function groundTile(tile) {
    const v=[],c=[],idx=[],uv=[];
    for(let j=0;j<=tileRows;j++)for(let i=0;i<=tileColumns;i++){
      const s=(tile+j/tileRows)*tileLength,x=xAt(i),y=terrain(x,s);
      v.push(x,y,-s);uv.push(x*.11,s*.11);
      const n=noise(x*.019,s*.018),h=noise(x*.007+6,s*.009);
      const shore=Math.abs(x-F.lakeAxis(s))-F.lakeWidth(s);
      oneColor.copy(grassGreen).lerp(dryGreen,smooth((n-.15)*1.15)).lerp(forestGreen,smooth((h-.43)*2.8)*.77);
      oneColor.lerp(hillGreen,smooth((Math.abs(x)-150)/350)*.89);
      oneColor.lerp(shoreColor,1-smooth((shore-2)/9)).multiplyScalar(.91+.12*noise(x*.056,s*.059));
      c.push(oneColor.r,oneColor.g,oneColor.b);
    }
    for(let j=0;j<tileRows;j++)for(let i=0;i<tileColumns;i++) {
      const a=j*(tileColumns+1)+i;idx.push(a,a+1,a+tileColumns+1,a+1,a+tileColumns+2,a+tileColumns+1);
    }
    return build(v,c,idx,uv);
  }
  function firGeometry(layers,n) {
    const v=[],c=[],idx=[],uv=[];
    for(let l=0;l<layers;l++){
      const tier=l/(layers-1),h=.13+tier*.624,wide=.255*(1-tier*.702),base=v.length/3;
      for(let r=0;r<3;r++)for(let i=0;i<n;i++){
        const a=TAU*i/n+l*2,roll=hash(i,l);
        const radius=wide*(r===0?.69:r===1?1:.038)*(.81+.37*roll);
        v.push(Math.cos(a)*radius, h+(r===0?.043:r===1?roll*.055:.237),Math.sin(a)*radius);
        const b=.70+roll*.22+r*.055;c.push(b*.92,b,b*.91);uv.push(i/n,r/2);
      }
      for(let r=0;r<2;r++)for(let i=0;i<n;i++){
        const a=base+r*n+i,b=base+r*n+(i+1)%n;idx.push(a,a+n,b,b,a+n,b+n);
      }
    }
    return build(v,c,idx,uv);
  }
  const fir=firGeometry(7,11),farFir=firGeometry(4,7),trunk=new T.CylinderGeometry(.031,.046,.4,6).translate(0,.2,0);
  const firMat=M.mat(0xffffff,.91,0,{vertexColors:true,side:T.DoubleSide}),trunkMat=M.mat(0x675c4d);
  const broadleaf=new T.IcosahedronGeometry(1,1),leafMat=M.mat(0xffffff,.95);
  const stone=new T.IcosahedronGeometry(1,0),stoneMat=M.mat(0xa8a796,.84);
  const dummy=new T.Object3D();
  function instances(parent,g,m,placements) {
    if(!placements.length)return;
    const o=new T.InstancedMesh(g,m,placements.length);
    placements.forEach(([x,y,s,sx,sy,sz,rot,color],i)=>{
      dummy.position.set(x,y,-s);dummy.rotation.set(0,rot||0,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
      o.setMatrixAt(i,dummy.matrix);if(color)o.setColorAt(i,color);
    });o.castShadow=true;o.receiveShadow=true;o.computeBoundingSphere();parent.add(o);
  }
  function flora(parent,tile){
    const r=F.random((tile*9137+42010)>>>0),trees=[],trunks=[],crowns=[],rocks=[];
    for(let j=0;j<840;j++){
      const x=(r()-.5)*1040,s=(tile+r())*tileLength,y=terrain(x,s);
      const density=noise(x*.022+1,s*.027)*.64+noise(x*.006,s*.008)*.36;
      if(Math.abs(x-(F.lakeAxis(s)-F.lakeWidth(s)-46))<15 || y<2 || density<.42 || (Math.abs(x+13)<27 && density<.69))continue;
      const h=(4+r()*6.5)*(.88+.56*density),col=new T.Color().setHSL(.34+r()*.08,.12+r()*.12,.21+r()*.122);
      const item=[x,y-.15,s,h,h,h,r()*TAU,col];
      if(r()<.14 && Math.abs(x)<210) {
        const w=h*.29;
        crowns.push([x,y+h*.58,s,w,h*.37,w,r()*TAU,new T.Color().setHSL(.19+r()*.065,.19+r()*.07,.35+r()*.08)]);
        trunks.push([x,y,s,h,h*1.6,h,0]);
      } else {trees.push(item);trunks.push(item.slice(0,7));}
    }
    for(let j=0;j<130;j++){
      const s=(tile+r())*tileLength,x=F.lakeAxis(s)+(F.lakeWidth(s)+(r()-.45)*8)*(r()>.5?1:-1),y=terrain(x,s),sz=.23+r()**2*1.8;
      rocks.push([x,y-.11,s,sz,sz*.43,sz*.74,r()*TAU]);
    }
    instances(parent,fir,firMat,trees);instances(parent,trunk,trunkMat,trunks);instances(parent,broadleaf,leafMat,crowns);instances(parent,stone,stoneMat,rocks);
  }
  const timber=M.mat(0x8b7459),plaster=M.mat(0xe5d6b1),slate=M.mat(0x857368),windowGlass=M.mat(0x466473,.19,.43);
  function chalet(parent,x,s,size,angle){
    const home=new T.Group();parent.add(home);home.position.set(x,terrain(x,s)-.17,-s);home.scale.setScalar(size);home.rotation.y=angle;
    M.mesh(home,new T.BoxGeometry(4.7,2.8,3.8),plaster,0,1.35);
    for(const side of [-1,1]){
      const roof=M.mesh(home,new T.BoxGeometry(5.3,.19,2.58),slate,0,3.30,side*1.03);roof.rotation.x=side*.49;
      M.mesh(home,new T.BoxGeometry(.74,.78,.07),windowGlass,side*1.38,1.55,1.93);
    }
    M.mesh(home,new T.BoxGeometry(.8,1.8,.1),timber,.07,.91,1.93);
    M.mesh(home,new T.BoxGeometry(.48,1.1,.53),plaster,1.34,3.82,-.25);
    const gable=new T.CylinderGeometry(1,1,4.69,3,1,false,Math.PI*.5);const g=M.mesh(home,gable,plaster,0,2.83,0);
    g.rotation.z=Math.PI*.5;g.scale.set(1.19,1,2.12);M.join(home);
  }
  const pathMaterial=M.mat(0xc6b38c,.98),dockMaterial=M.mat(0x9b8365,.86);
  function settlement(parent,tile) {
    const center=tile*tileLength+118;
    if(((tile%3)+3)%3===0){
      for(const [ds,dx,size,a] of [[0,0,1.1,.18],[13,-8,.78,-.1],[20,3,.81,.23],[41,-19,.64,-.41]]){
        const s=center+ds,x=F.lakeAxis(s)-F.lakeWidth(s)-21+dx;chalet(parent,x,s,size,a);
      }
      const s=center-6,x=F.lakeAxis(s)-F.lakeWidth(s);
      for(let i=0;i<15;i++)M.mesh(parent,new T.BoxGeometry(.44,.14,1.56),dockMaterial,x+i*.47,1.18,-s);
      for(const a of [1.1,5.8])for(const b of [-.66,.66])M.mesh(parent,new T.CylinderGeometry(.074,.105,2,7),timber,x+a,.4,-s+b);
    }
    const verts=[],indices=[];
    for(let i=0;i<=60;i++) {
      const s=(tile+i/60)*tileLength,x=F.lakeAxis(s)-F.lakeWidth(s)-19-3*Math.sin(s*.038);
      for(const w of [-.71,.71])verts.push(x+w,terrain(x+w,s)+.16,-s);
      if(i<60){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
    const o=M.mesh(parent,g,pathMaterial);o.castShadow=false;
  }
  function makeWater(){
    const data=new Uint8Array(F.waveCols*F.waveRows*4);
    const field=new T.DataTexture(data,F.waveCols,F.waveRows);field.wrapS=field.wrapT=T.RepeatWrapping;
    field.minFilter=field.magFilter=T.LinearFilter;field.needsUpdate=true;
    const water=M.mat(0x649ca0,.185,.37,{envMapIntensity:.93});
    const uniforms={waveField:{value:field},advection:{value:0},goldLight:{value:.05},solar:{value:new T.Vector3(.17,.076,-1).normalize()}};
    water.onBeforeCompile=sh=>{
      Object.assign(sh.uniforms,uniforms);
      sh.vertexShader='varying vec3 waterPt;\n'+sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nwaterPt=(modelMatrix*vec4(position,1.)).xyz;');
      sh.fragmentShader='varying vec3 waterPt;uniform sampler2D waveField;uniform float advection,goldLight;uniform vec3 solar;\n'+sh.fragmentShader;
      sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>',`
        #include <normal_fragment_maps>
        vec2 wp=waterPt.xz; vec2 wuv=wp*vec2(.011,.016);
        vec3 field=texture2D(waveField,wuv).rgb-.5;
        float p=advection;
        float fine=sin(wp.y*2.5+wp.x*.27+field.r*10.+p*1.72)+.44*sin(wp.y*4.51-wp.x*.22+p*1.11);
        vec3 waterNormal=normalize(vec3(field.g*.26+.017*sin(wp.x*.84+wp.y*.38+p),1.,field.b*.34+fine*.058));
        normal=normalize(mat3(viewMatrix)*waterNormal);
      `).replace('#include <opaque_fragment>',`
        vec3 eye=normalize(cameraPosition-waterPt);
        vec3 H=normalize(eye+solar);
        float spark=pow(max(0.,dot(H,waterNormal)),950.);
        float path=exp(-pow((eye.x+solar.x)*4.6,2.));
        outgoingLight+=vec3(1.5,.83,.32)*(spark*(.43+2.65*goldLight)+path*goldLight*.37);
        #include <opaque_fragment>
      `);
    };
    const geometry=new T.PlaneGeometry(540,1980);geometry.rotateX(-Math.PI*.5);
    const plane=new T.Mesh(geometry,water);plane.position.set(68,.22,-670);plane.receiveShadow=true;
    function update(st){
      for(let j=0;j<F.waveRows;j++)for(let i=0;i<F.waveCols;i++){
        const k=i+j*F.waveCols,h=st.waves[k],dx=st.waves[(i+1)%F.waveCols+j*F.waveCols]-h,dy=st.waves[i+((j+1)%F.waveRows)*F.waveCols]-h;
        data.set([F.clamp(128+h*2600,0,255),F.clamp(128+dx*4200,0,255),F.clamp(128+dy*4200,0,255),255],k*4);
      }
      field.needsUpdate=true;uniforms.advection.value=st.air.gust;uniforms.goldLight.value=st.light.gold;
      sunDirection(uniforms.solar.value,st.light.elevation);plane.position.z=-st.plane.s-670;
    }
    return {plane,update};
  }
  function create(scene,renderer){
    const skyUni={uSun:{value:new T.Vector3(.17,.076,-1).normalize()},uAir:{value:0},uGold:{value:0}};
    const sky=new T.Mesh(new T.SphereGeometry(2390,32,20),new T.ShaderMaterial({uniforms:skyUni,vertexShader:skyVertex,
      fragmentShader:skyFragment,side:T.BackSide,depthWrite:false}));sky.renderOrder=-20;scene.add(sky);
    const distant=new T.Group();scene.add(distant);mountainRange(distant,0);mountainRange(distant,1);
    const water=makeWater();
    const tiles=new Map();let previousTile=NaN;
    function stream(s){
      const k=Math.floor(s/tileLength);if(k===previousTile)return;previousTile=k;
      for(let n=k-1;n<=k+4;n++)if(!tiles.has(n)){
        const group=new T.Group();scene.add(group);const g=groundTile(n);
        const ground=M.mesh(group,g,landMat);ground.castShadow=false;
        flora(group,n);settlement(group,n);tiles.set(n,group);
      }
      for(const [n,group] of tiles)for(const o of group.children){
        if(o.geometry===fir||o.geometry===farFir)o.geometry=n>=k+2?farFir:fir;
      }
      for(const [n,g] of tiles)if(n<k-1||n>k+4){
        scene.remove(g);g.traverse(o=>{if(o.isInstancedMesh)o.dispose();
          else if(o.geometry)o.geometry.dispose();});tiles.delete(n);
      }
    }
    stream(0);
    // Capture the actual valley and sky once for the canopy, painted wings and lake.
    const capture=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
    const cam=new T.CubeCamera(.4,2800,capture);cam.position.set(55,24,-35);
    const shadows=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;cam.update(renderer,scene);renderer.shadowMap.enabled=shadows;
    const pmrem=new T.PMREMGenerator(renderer),reflection=pmrem.fromCubemap(capture.texture);
    scene.environment=reflection.texture;scene.environmentIntensity=.46;capture.dispose();pmrem.dispose();
    scene.add(water.plane);
    return function(st,camera){
      stream(st.plane.s);sky.position.copy(camera.position);distant.position.z=-st.plane.s;distant.position.x=st.plane.x*.65;
      sunDirection(skyUni.uSun.value,st.light.elevation);skyUni.uAir.value=st.air.gust;skyUni.uGold.value=st.light.gold;
      water.update(st);
    };
  }
  window.Valley={create,sunDirection};
})();
