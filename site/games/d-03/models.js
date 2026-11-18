(function(){
  'use strict';
  const T=THREE, tau=2*Math.PI, rand=Flight.random(292);
  // An immutable micro-grain map is shared by the paint, cloth, wood and water.
  const grain=new Uint8Array(64*64*4);
  for(let i=0;i<grain.length;i+=4){const v=233+Math.floor(rand()*22);grain.set([v,v,v,255],i);}
  const grainMap=new T.DataTexture(grain,64,64);grainMap.wrapS=grainMap.wrapT=T.RepeatWrapping;
  grainMap.magFilter=T.LinearFilter;grainMap.minFilter=T.LinearFilter;grainMap.needsUpdate=true;
  function mat(color,roughness=.7,metalness=0,extra={}) {
    return new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:grainMap,...extra});
  }
  function mesh(parent,geometry,material,x=0,y=0,z=0) {
    const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  const orb=new T.SphereGeometry(1,32,22);
  function ellipsoid(parent,m,x,y,z,a,b,c) {const o=mesh(parent,orb,m,x,y,z);o.scale.set(a,b,c);return o;}
  function bar(parent,m,a,b,r,ends=7) {
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),dir=bv.clone().sub(av);
    const obj=mesh(parent,new T.CylinderGeometry(r,r,dir.length(),ends),m);
    obj.position.copy(av).add(bv).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return obj;
  }
  // Join solid parts with identical finishes into a single static draw.
  function join(parent) {
    const groups=new Map();
    for(const child of [...parent.children]) {
      if(!child.isMesh || Array.isArray(child.material))continue;
      child.updateMatrix();
      const geom=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();
      geom.applyMatrix4(child.matrix);const key=child.material;
      if(!groups.has(key)) groups.set(key,[]);groups.get(key).push(geom);parent.remove(child);
    }
    for(const [m,geoms] of groups) {
      const geometry=new T.BufferGeometry();
      for(const name of ['position','normal','uv','color']) {
        if(!geoms.every(g=>g.attributes[name]))continue;
        const a=geoms[0].attributes[name],array=new Float32Array(geoms.reduce((s,g)=>s+g.attributes[name].array.length,0));
        let offset=0;
        for(const g of geoms){array.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}
        geometry.setAttribute(name,new T.BufferAttribute(array,a.itemSize));
      }
      for(const g of geoms)g.dispose();mesh(parent,geometry,m);
    }
  }
  function glider(){
    const root=new T.Group(), body=new T.Group();root.add(body);
    const ivory=mat(0xfff8df,.34,.18),red=mat(0xd84c38,.4,.16),blue=mat(0x203f4d,.44,.25),
      gold=mat(0xc99c62,.31,.53), rubber=mat(0x374148,.81),metal=mat(0x809094,.24,.74);
    const glass=new T.MeshPhysicalMaterial({color:0x356777,metalness:.34,roughness:.115,
      clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.55,roughnessMap:grainMap});
    // Closed fuselage cross sections, long tail boom and rounded cockpit nose.
    const sections=[[-3.05,.025,.04,-.07],[-2.95,.195,.19,-.06],[-2.68,.38,.34,-.04],
      [-2.15,.51,.47,0],[-1.31,.57,.55,.035],[-.60,.55,.51,0],[.14,.455,.40,-.02],
      [1.0,.30,.29,-.035],[2.08,.19,.20,-.015],[3.25,.12,.135,.06],[3.61,.025,.04,.09]];
    function hull(parts,material){
      const pts=[],idx=[],uv=[],n=32;
      for(let i=0;i<parts.length;i++) {
        const [z,w,h,cy]=parts[i];
        for(let j=0;j<=n;j++){const a=tau*j/n;pts.push(w*Math.cos(a),cy+h*Math.sin(a),z);uv.push(j/n,i/(parts.length-1));}
      }
      for(let i=0;i<parts.length-1;i++)for(let j=0;j<n;j++){
        const a=i*(n+1)+j;idx.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(body,g,material);
    }
    hull(sections,ivory);
    ellipsoid(body,blue,0,.355,-1.28,.493,.318,1.14);
    ellipsoid(body,glass,0,.385,-1.32,.473,.331,1.10);
    // Canopy bow and a narrow brass latch follow the curved glazing.
    let prev;
    for(let i=0;i<=20;i++){const a=Math.PI*i/20,pt=[.466*Math.cos(a),.388+.328*Math.sin(a),-1.53];
      if(prev)bar(body,ivory,prev,pt,.020,5);prev=pt;}
    bar(body,gold,[.47,.39,-1.3],[.47,.39,-.98],.025);
    // Airfoils use a rounded leading edge, a cambered upper surface and tapered tips.
    function foil(parent,stations,palette,vertical=false) {
      const vertices=[],colors=[],uv=[],indices=[],rings=30;
      for(let k=0;k<stations.length-1;k++) {
        const color=new T.Color(palette[k]||ivory.color);
        for(let end=0;end<2;end++) {
          const [span,front,chord,level,thickness]=stations[k+end];
          for(let j=0;j<=rings;j++){
            const a=tau*j/rings,f=(1-Math.cos(a))*.5;
            const thick=Math.sin(a)*(1-.52*f)*thickness+.026*Math.sin(Math.PI*f);
            vertices.push(...(vertical?[thick,span,front+chord*f]:[span,level+thick,front+chord*f]));
            colors.push(color.r,color.g,color.b);uv.push(f,span);
          }
        }
        const start=k*(rings+1)*2;
        for(let j=0;j<rings;j++) {
          const v=start+j; indices.push(v,v+rings+1,v+1,v+1,v+rings+1,v+rings+2);
        }
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      g.setIndex(indices);g.computeVertexNormals();
      return mesh(parent,g,mat(0xffffff,.37,.15,{vertexColors:true,side:T.DoubleSide}));
    }
    const wingColors=[0xfaf4dc,0xf8f3dd,0xd7513d,0xffedcf,0xcb4438,0xca4436];
    const flaps=[];
    for(const sign of [-1,1]) {
      let stations=[[.22,-.83,1.39,.08,.109],[2.6,-.55,.96,.18,.083],[3.88,-.30,.71,.28,.064],
        [4.01,-.27,.68,.30,.054],[4.12,-.25,.64,.31,.05],[4.84,-.04,.37,.43,.036],[5.05,.13,.07,.51,.016]];
      foil(body,stations.map(([s,...rest])=>[s*sign,...rest]),wingColors);
      const flap=new T.Group();root.add(flap);flap.position.set(sign*2.3,.193,.403);
      foil(flap,[[0,-.055,.12,0,.015],[sign*1.55,-.056,.099,.09,.013]], [0xe3e2d2]);flaps.push(flap);
      bar(body,metal,[sign*2.25,.257,.24],[sign*3.82,.318,.264],.008,5);
      foil(body,[[.04*sign,2.53,.82,.43,.069],[.99*sign,2.72,.57,.49,.041],
        [1.34*sign,2.84,.43,.5,.036],[1.56*sign,2.99,.18,.51,.019]],
        [0xf9f2d8,0xf9f2d8,0xd65741]);
      // Fuselage pinstripe.
      bar(body,red,[sign*.446,.033,.14],[sign*.112,.093,3.23],.018,6);
    }
    const rudder=new T.Group();rudder.position.z=2.55;root.add(rudder);
    foil(rudder,[[.10,-.11,1.02,0,.109],[.77,.12,.65,0,.073],[.95,.22,.55,0,.056],
      [1.03,.26,.50,0,.05],[1.36,.46,.26,0,.032],[1.42,.55,.13,0,.02]],
      [0xf3ead4,0xd64a37,0xffeed6,0xd44c3b,0xd44c3b],true);
    const wheel=mesh(body,new T.CylinderGeometry(.216,.216,.14,16),rubber,0,-.46,-.32);
    wheel.rotation.z=Math.PI/2;
    ellipsoid(body,metal,0,-.076,3.04,.082,.095,.13);
    join(body);return {root,flaps,rudder};
  }
  const palettes=[
    [0xc54a37,0xf3d497,0xab382b,0xf8deab],[0x267e88,0xf2d29b,0x235672,0xd39051],
    [0xe4a03b,0xffdf91,0xc46a33,0xf2b150],[0x738c96,0xf3ddae,0x51678c,0xc88782],
    [0xcf7767,0xf7daa7,0x9e5354,0xe6a08b],[0x4e8274,0xebcd84,0x35665d,0xdb9a56],
    [0x54789d,0xcae0d5,0x355c80,0xe9b762],[0xcb6d39,0xffdc88,0xa04332,0xefae65]];
  const profile=[[0,.75],[.055,1.4],[.18,2.85],[.32,4.65],[.49,6.16],[.62,6.65],[.73,6.52],[.84,5.73],[.92,4.29],[.975,2.38],[1,0.06]];
  function envelope(id,far=false) {
    const pos=[],norm=[],col=[],uv=[],idx=[],goreCount=20,across=far?3:6,rows=far?18:36;
    const colors=palettes[id%palettes.length].map(c=>new T.Color(c));
    function point(g,u,v) {
      const a=tau*(g+u)/goreCount;
      let k=0;while(k<profile.length-2 && v>profile[k+1][0])k++;
      const [y0,r0]=profile[k],[y1,r1]=profile[k+1],f=Flight.clamp((v-y0)/(y1-y0),0,1);
      const last=profile[Math.max(0,k-1)],next=profile[Math.min(profile.length-1,k+2)];
      const m0=(r1-last[1])/(y1-last[0])*(y1-y0),m1=(next[1]-r0)/(next[0]-y0)*(y1-y0);
      const r=((2*f**3-3*f*f+1)*r0+(f**3-2*f*f+f)*m0+(-2*f**3+3*f*f)*r1+(f**3-f*f)*m1)*
        (.953+.047*Math.sin(Math.PI*u)**.8);
      return new T.Vector3(r*Math.cos(a),2.8+v*15.5,r*Math.sin(a));
    }
    for(let g=0;g<goreCount;g++)for(let j=0;j<rows;j++){
      const base=pos.length/3,v=(j+.5)/rows;
      const pattern=id%4;
      let ci=g%2;
      if(pattern===1)ci=(g%5<3)?0:1;
      if(pattern===2)ci=g%4===0?1:0;
      if(pattern===3)ci=(g+Math.floor(v*4))%4<2?0:1;
      if(pattern===0 && v>.40 && v<.48 && g%4===0)ci=3;
      if(v<.091)ci=2;
      if(pattern===0 && v>.32 && v<.41)ci=g%2?3:2;
      if(pattern===1 && v>.35 && v<.49)ci=v<.39?3:2;
      if(pattern===2 && v>.49 && v<.61)ci=g%2?3:2;
      if(v>.95)ci=2;
      for(let row=0;row<2;row++)for(let h=0;h<=across;h++){
        const u=h/across,w=(j+row)/rows,p=point(g,u,w);
        const du=point(g,Math.min(1,u+.001),w).sub(point(g,Math.max(0,u-.001),w));
        const dv=point(g,u,Math.min(1,w+.0005)).sub(point(g,u,Math.max(0,w-.0005)));
        const n=dv.cross(du).normalize(),seam=(.91+.09*Math.sin(Math.PI*u))*(.968+.047*Flight.hash(g,id));
        pos.push(p.x,p.y,p.z);norm.push(n.x,n.y,n.z);const c=colors[ci];
        col.push(c.r*seam,c.g*seam,c.b*seam);uv.push((g+u)/2,w*4);
      }
      for(let h=0;h<across;h++){const i=base+h;idx.push(i,i+across+1,i+1,i+1,i+across+1,i+across+2);}
    }
    const geo=new T.BufferGeometry();for(const [name,data,size] of [['position',pos,3],['normal',norm,3],['color',col,3],['uv',uv,2]])
      geo.setAttribute(name,new T.Float32BufferAttribute(data,size));
    geo.setIndex(idx);return geo;
  }
  const fabrics=[],farFabrics=[], cloth=mat(0xffffff,.85,0,{vertexColors:true});
  // The luminous mouth and the swinging wicker basket are separate mechanisms.
  let rigTemplate,basketTemplate;
  function balloon(id) {
    const root=new T.Group(),suspension=new T.Group();root.add(suspension);
    const key=id%palettes.length;if(!fabrics[key]){fabrics[key]=envelope(key);farFabrics[key]=envelope(key,true);}
    const burnerLight={value:.1},silk=cloth.clone();
    silk.onBeforeCompile=sh=>{
      sh.uniforms.burnerLight=burnerLight;
      sh.vertexShader='varying vec3 panelPos;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npanelPos=position;');
      sh.fragmentShader='varying vec3 panelPos;uniform float burnerLight;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`
        #include <emissivemap_fragment>
        float inside=exp(-max(0.,panelPos.y-3.)*.28);
        totalEmissiveRadiance+=vec3(1.,.31,.047)*inside*burnerLight*(.38+.45*diffuseColor.r);
      `);
    };
    const fabric=mesh(root,fabrics[key],silk);
    const hot=mat(0xffba56,.75,0,{emissive:0xff8b30,emissiveIntensity:.3});
    const mouth=mesh(root,new T.CylinderGeometry(1.49,.75,.93,32,1,true),hot,0,3.26,0);
    const flame=ellipsoid(root,hot,0,2.33,0,.28,.68,.28);
    if(!rigTemplate) {
      rigTemplate=new T.Group();basketTemplate=new T.Group();
      const rope=mat(0x786044,.88),braid=mat(0x9e7452,.8),wicker=mat(0xb78149,.93),band=mat(0x694d37,.85),steel=mat(0x5e6465,.32,.72);
      for(let i=0;i<12;i++) {
        const a=tau*i/12;
        const dx=Math.cos(a),dz=Math.sin(a);
        bar(rigTemplate,rope,[dx*.65,1.0,dz*.51],[dx*1.58,3.85,dz*1.58],.028,5);
      }
      for(const x of [-.51,.51])for(const z of [-.41,.41])bar(basketTemplate,steel,[x,.42,z],[x*.96,1.55,z*.96],.043,6);
      mesh(basketTemplate,new T.BoxGeometry(1.12,.16,.87),steel,0,1.53,0);
      mesh(basketTemplate,new T.CylinderGeometry(.78,.64,.88,12),wicker,0,.05);
      for(let i=0;i<8;i++) {const r=.65+.126*(i/7);
        mesh(basketTemplate,new T.CylinderGeometry(r+.023,r+.02,i===7?.12:.025,12),i===7?band:braid,0,-.35+i*.115);}
      for(let i=0;i<12;i++){const a=tau*i/12;bar(basketTemplate,braid,[.645*Math.cos(a),-.37,.645*Math.sin(a)],
        [.786*Math.cos(a),.40,.786*Math.sin(a)],.026,5);}
      join(rigTemplate);join(basketTemplate);
    }
    root.add(rigTemplate.clone());suspension.add(basketTemplate.clone());
    return {root,suspension,flame,mouth,hot,fabric,burnerLight,nearCloth:fabrics[key],farCloth:farFabrics[key]};
  }
  function family(){
    const group=new T.Group(),arms=[];
    const skin=mat(0xac805f),hair=mat(0x53483f),pants=mat(0x465455),shoe=mat(0x5b5248);
    for(const [x,z,h,c] of [[-1.03,-.15,1.73,0xb36f4e],[.14,.25,1.11,0xd7a73f],[1.08,-.28,1.63,0x739580]]){
      const person=new T.Group();group.add(person);person.position.set(x,0,z);person.scale.setScalar(h/1.7);
      const coat=mat(c);
      for(const side of [-1,1]){bar(person,pants,[side*.12,.77,0],[side*.145,.13,.015],.08);
        ellipsoid(person,shoe,side*.145,.085,.055,.096,.07,.147);}
      ellipsoid(person,coat,0,1.01,0,.238,.37,.15);ellipsoid(person,skin,0,1.49,0,.142,.18,.134);
      ellipsoid(person,hair,0,1.565,-.025,.145,.125,.14);
      bar(person,coat,[-.18,1.23,0],[-.31,.86,.05],.074);
      const arm=new T.Group();person.add(arm);arm.position.set(.185,1.22,0);
      bar(arm,coat,[0,0,0],[.23,.16,.04],.077);bar(arm,skin,[.23,.16,.04],[.29,.39,.08],.053);
      ellipsoid(arm,skin,.29,.42,.08,.063,.081,.046);arms.push(arm);join(person);
    }
    return {group,arms};
  }
  window.Models={mat,mesh,ellipsoid,bar,join,glider,balloon,family,grainMap};
})();
