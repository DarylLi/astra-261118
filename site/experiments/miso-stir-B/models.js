// Solid, locally constructed kitchenware. The turned profiles are (radius, height).
(function (root) {
  'use strict';
  const T = THREE, PI=Math.PI, TAU=2*PI;
  const v=(x,y,z)=>new T.Vector3(x,y,z);
  function group(parent,x=0,y=0,z=0) {
    const g=new T.Group(); parent.add(g); g.position.set(x,y,z); return g;
  }
  function material(color,roughness=.5,metalness=0) {
    return new T.MeshStandardMaterial({color,roughness,metalness});
  }
  const noise=`
    float h3(vec3 p){p=fract(p*.3183099+vec3(.11,.27,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
    float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `;
  const patterns={
    wood:`float wander=n3(vec3(P.x*.55,P.y*2.,P.z*2.4));float g=P.z*30.+2.8*wander+.38*sin(P.x*1.7);
      float growth=.5+.5*sin(g);float fibres=n3(vec3(P.x*2.,P.y*22.,P.z*83.));
      diffuseColor.rgb*=.80+.16*growth+.14*fibres+.09*wander;`,
    ceramic:`float dots=smoothstep(.74,.92,n3(P*115.));diffuseColor.rgb*=(.965+.07*n3(P*16.)-.24*dots);`,
    cloth:`vec3 wave=cos(P*340.);float weave=(wave.x*wave.z+wave.y)*.02;
      diffuseColor.rgb*=.95+weave+.08*n3(P*85.);`,
    towel:`vec2 uv=P.xz;float stripe=step(.76,fract((uv.y+.34)*2.1));
      float fine=step(.86,fract((uv.y+.34)*8.4));diffuseColor.rgb*=mix(vec3(1.),vec3(.27,.44,.54),stripe*.8+fine*.17);
      diffuseColor.rgb*=.94+.10*n3(P*148.);`,
    grain:`diffuseColor.rgb*=.86+.15*n3(P*15.)+.12*n3(P*87.);`,
    tofu:`float pores=smoothstep(.72,.93,n3(P*94.));diffuseColor.rgb*=1.-.27*pores-.065*n3(P*29.);`
  };
  function patterned(color,kind,rough=.55,metal=0) {
    const m=material(color,rough,metal);
    m.userData.patterned=true;
    m.onBeforeCompile=shader=>{
      shader.vertexShader='attribute vec3 surfaceCoord; varying vec3 misoLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmisoLocal=surfaceCoord;');
      shader.fragmentShader='varying vec3 misoLocal;\n'+noise+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{vec3 P=misoLocal;'+patterns[kind]+'}');
    };
    m.customProgramCacheKey=()=>kind;
    return m;
  }
  function mesh(parent,geo,mat,x=0,y=0,z=0) {
    if(mat.userData.patterned && !geo.hasAttribute('surfaceCoord'))geo.setAttribute('surfaceCoord',geo.attributes.position);
    const m=new T.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  }
  // Bake rigid parts in their parent's coordinates to share draw calls and shadows.
  function batchRigid(parent){
    parent.updateWorldMatrix(true,true);
    const inverse=parent.matrixWorld.clone().invert(),byMaterial=new Map();
    parent.traverse(ob=>{
      if(!ob.isMesh)return;
      if(!byMaterial.has(ob.material))byMaterial.set(ob.material,[]);
      byMaterial.get(ob.material).push(ob);
    });
    for(const [mat,parts] of byMaterial){
      if(parts.length<2)continue;
      const pos=[],norm=[],local=[],indices=[],pt=v(),matrix=new T.Matrix4(),normal=new T.Matrix3();
      for(const ob of parts){
        matrix.multiplyMatrices(inverse,ob.matrixWorld);normal.getNormalMatrix(matrix);
        const g=ob.geometry,src=g.attributes.position,n=g.attributes.normal,base=pos.length/3;
        for(let i=0;i<src.count;i++){
          pt.fromBufferAttribute(src,i);
          if(mat.userData.patterned)local.push(pt.x,pt.y,pt.z);
          pt.applyMatrix4(matrix);pos.push(pt.x,pt.y,pt.z);
          pt.fromBufferAttribute(n,i).applyNormalMatrix(normal);norm.push(pt.x,pt.y,pt.z);
        }
        for(let i=0;i<(g.index?.count??src.count);i++)indices.push(base+(g.index?g.index.getX(i):i));
        ob.removeFromParent();
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
      if(local.length)g.setAttribute('surfaceCoord',new T.Float32BufferAttribute(local,3));
      g.setIndex(indices);mesh(parent,g,mat);
    }
  }
  const ball=new T.SphereGeometry(1,24,16);
  function oval(parent,mat,x,y,z,sx,sy,sz) {
    const m=mesh(parent,ball,mat,x,y,z); m.scale.set(sx,sy,sz); return m;
  }
  function roundedGeo(w,h,d,r) {
    const g=new T.BoxGeometry(w,h,d,5,5,5), p=g.attributes.position, n=g.attributes.normal;
    r=Math.min(r,w*.495,h*.495,d*.495);
    const half=v(w/2-r,h/2-r,d/2-r), low=half.clone().negate();
    const a=v(), core=v(), normal=v();
    function edge(coord,size){
      const j=Math.round((coord/size+.5)*5), b=size*.5;
      return j<3?-b+j*r*.5:b-(5-j)*r*.5;
    }
    for(let i=0;i<p.count;i++){
      a.set(edge(p.getX(i),w),edge(p.getY(i),h),edge(p.getZ(i),d)); core.copy(a).clamp(low,half); normal.copy(a).sub(core).normalize();
      a.copy(core).addScaledVector(normal,r);p.setXYZ(i,a.x,a.y,a.z);n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    return g;
  }
  function box(parent,mat,x,y,z,w,h,d,r=0) {
    return mesh(parent,r?roundedGeo(w,h,d,r):new T.BoxGeometry(w,h,d),mat,x,y,z);
  }
  function turn(parent,mat,x,y,z,profile,n=64) {
    return mesh(parent,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),n),mat,x,y,z);
  }
  function hoop(parent,mat,x,y,z,r,tube,n=80) {
    const m=mesh(parent,new T.TorusGeometry(r,tube,10,n),mat,x,y,z);m.rotation.x=PI/2;return m;
  }
  function rod(parent,mat,a,b,r1,r2=r1) {
    const axis=b.clone().sub(a), m=mesh(parent,new T.CylinderGeometry(r2,r1,axis.length(),20),mat);
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(v(0,1,0),axis.normalize());return m;
  }
  function bent(parent,mat,points,r) {
    return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),28,r,12,false),mat);
  }
  const m={
    wood:patterned(0xbe8758,'wood'), board:patterned(0xca9c6a,'wood'), walnut:patterned(0x75472a,'wood',.31),
    enamel:patterned(0x175e5b,'ceramic',.22,.24), inside:material(0x434943,.31,.67),
    steel:material(0xb5c2bf,.21,.95), brass:material(0xc49a59,.29,.82), iron:patterned(0x292d30,'grain',.59,.47),
    stove:material(0x3d4946,.28,.54), black:material(0x282825,.38,.16),
    cream:patterned(0xeadfc4,'ceramic',.26), stripe:material(0x597b7a,.27), brown:material(0x843d2b,.29),
    rice:patterned(0xffecc9,'tofu',.44), onion:material(0x8fba59,.38), pale:material(0xe0e6ac,.43),
    sea:patterned(0x203e2b,'grain',.29), paste:patterned(0x9a5b29,'grain',.82),
    cloth:patterned(0xe6d9bf,'towel',.93)
  };
  function bowl(parent,x,y,z,r,glaze,lining) {
    const g=group(parent,x,y,z);g.scale.setScalar(r);
    turn(g,glaze,0,0,0,[[.01,.03],[.36,.03],[.37,.13],[.5,.16],[.68,.28],[.88,.49],[.98,.70],[1,.78],[.985,.80]]);
    turn(g,lining,0,0,0,[[.985,.80],[.948,.78],[.926,.68],[.83,.48],[.63,.28],[.40,.18],[.001,.17]]);
    hoop(g,m.brass,0,.79,0,.981,.014);return g;
  }
  function onion(parent,x,y,z,i) {
    const g=group(parent,x,y,z);g.rotation.set(.13*Math.sin(i),i*1.7,.16*Math.cos(i));
    const n=30, profile=[[.079,-.024],[.089,-.011],[.089,.026],[.084,.032],[.057,.032],[.054,.024],[.054,-.02],[.079,-.024]];
    const ring=turn(g,m.onion,0,0,0,profile,n);
    ring.scale.x=1.22+.14*Math.sin(i);hoop(g,m.pale,0,.031,0,.071,.009,30).scale.x=ring.scale.x;
    return g;
  }
  function kitchen(parent) {
    const scene=group(parent);
    box(scene,m.wood,0,-.19,.52,18,.38,7.7,.06);
    box(scene,m.wood,0,-1.95,.46,17.8,3.52,7.59,.05);
    for(let i=-3;i<=3;i++){
      box(scene,m.board,i*2.38,-1.86,4.29,2.34,2.89,.11,.043);
      rod(scene,m.brass,v(i*2.38-.32,-.65,4.40),v(i*2.38+.32,-.65,4.40),.036);
    }
    box(scene,m.inside,0,-3.82,0,24,.16,26);
    const wall=material(0xb8ad8e), tile=patterned(0xb1c5b8,'ceramic',.36);
    box(scene,wall,0,2.4,-5.35,20,7,.16);
    for(let j=0;j<8;j++) for(let i=-7;i<8;i++) {
      box(scene,tile,(i+.5*(j%2))*1.28,j*.54-.28,-5.22,1.266,.527,.075,.018);
    }
    const shelf=group(scene,-.7,3.32,-4.91);
    box(shelf,m.board,0,0,0,6.0,.13,.76,.047);
    for(let i=0;i<5;i++){
      const cup=group(shelf,-2.18+i*.53,.072,.02);
      turn(cup,i%2?m.cream:m.stripe,0,0,0,[[.001,.014],[.155,.014],[.18,.06],[.21,.38],[.201,.395],[.184,.385],[.15,.07],[.001,.064]]);
    }
    // A utensil crock at the far end of the preparation board.
    const crock=group(scene,-3.56,0,-1.79);
    turn(crock,m.stripe,0,0,0,[[.01,0],[.30,.006],[.36,.065],[.38,.66],[.35,.72],[.316,.72],[.32,.11],[.01,.08]]);
    for(let j=0;j<3;j++){
      const tool=group(crock,(j-1)*.094,.2,0);tool.rotation.z=(j-1)*.24+.075;tool.rotation.x=.10*(j-1);
      rod(tool,m.walnut,v(0,0,0),v(0,1.0+j*.09,0),.03,.045);
      oval(tool,m.board,0,1.04+j*.09,0,.113,.217,.042);
    }
    // Chopstick rests at the family settings.
    for(const [x,z] of [[-2.43,-2.38],[3.36,-2.47]]) {
      box(scene,m.cream,x,.038,z+.57,.25,.075,.13,.028);
      for(let j=0;j<2;j++) rod(scene,m.walnut,v(x-.61,.061,z+.48+j*.09),v(x+.66,.096,z+.68+j*.09),.014,.025);
    }
    const stove=group(scene,0,.01,.08);
    box(stove,m.black,0,.052,0,3.63,.09,3.16,.045);
    box(stove,m.stove,0,.172,0,3.88,.28,3.43,.13);
    box(stove,m.iron,0,.31,-.03,3.68,.048,3.15,.065);
    hoop(stove,m.black,0,.35,-.08,1.16,.065);
    hoop(stove,m.brass,0,.364,-.08,.98,.052);
    for(let i=0;i<8;i++){
      const a=i*PI/4;const bar=box(stove,m.iron,1.23*Math.sin(a),.38,1.23*Math.cos(a)-.08,.10,.14,.53,.026);bar.rotation.y=a;
    }
    // Knurled metal control on the front fascia.
    const knob=group(stove,1.26,.165,1.72);knob.rotation.x=PI/2;
    turn(knob,m.brass,0,0,0,[[.001,0],[.143,0],[.14,.065],[.126,.09],[.001,.09]]);
    box(knob,m.black,0,.097,0,.045,.018,.15,.008);
    for(const x of [-1.65,1.65])for(const z of [-1.37,1.37]) {
      oval(stove,m.steel,x,.339,z,.031,.012,.031);box(stove,m.black,x,.35,z,.035,.003,.008);
    }
    const pot=group(scene,0,0,0);
    turn(pot,m.enamel,0,0,0,[[.01,.417],[1.12,.417],[1.25,.443],[1.34,.52],[1.419,.73],[1.495,1.23],[1.516,1.322],[1.52,1.35]],100);
    turn(pot,m.inside,0,0,0,[[1.52,1.35],[1.48,1.35],[1.458,1.30],[1.419,.97],[1.28,.64],[1.12,.49],[.01,.49]],100);
    hoop(pot,m.steel,0,1.351,0,1.5,.034,100);
    hoop(pot,m.enamel,0,1.292,0,1.502,.016,100);
    for(const sign of [-1,1]){
      const h=group(pot);h.rotation.y=sign<0?PI:0;
      for(const z of [-.28,.28]){
        oval(h,m.brass,1.434,.99,z,.072,.115,.115);
        oval(h,m.steel,1.40,1.075,z,.032,.047,.047);
      }
      bent(h,m.enamel,[v(1.43,.98,-.28),v(1.68,1.03,-.34),v(1.96,1.07,-.29),v(2.03,1.08,0),v(1.96,1.07,.29),v(1.68,1.03,.34),v(1.43,.98,.28)],.082);
    }
    const prep=group(scene,-2.79,.015,.46);prep.rotation.y=-.25;
    box(prep,m.board,0,.094,.04,1.61,.18,2.42,.085);
    box(prep,m.board,0,.095,-1.30,.55,.17,.50,.081);
    // Small stack of tofu on a celadon side plate with a painted foot and rim.
    const plate=group(prep,-.05,.186,-.29);
    turn(plate,m.cream,0,0,0,[[.005,.014],[.38,.014],[.48,.036],[.68,.061],[.76,.127],[.745,.145],[.69,.127],[.56,.082],[.37,.065],[.005,.065]]);
    hoop(plate,m.stripe,0,.125,0,.692,.010);
    for(let i=0;i<5;i++) {
      const t=box(plate,m.rice,-.21+.32*(i%2),.19+Math.floor(i/4)*.19,(Math.floor(i/2)%2)*.32-.18,.305,.235,.31,.03);t.rotation.y=.09*i;
    }
    for(let i=0;i<8;i++) onion(prep,-.33+(i%4)*.15+.06*Math.sin(i),.22,.64+(i%3)*.12,i);
    // Folded striped linen with a softened hem and loose threads.
    const towel=group(scene,2.99,.015,.98);towel.rotation.y=-.36;
    for(let i=0;i<3;i++) box(towel,m.cloth,.05*i,.046+.055*i,-.027*i,1.55-.05*i,.073,2.32,.036);
    for(let i=0;i<31;i++){
      const x=-.68+i*.046;
      rod(towel,m.cloth,v(x,.119,1.08),v(x+.018*Math.sin(i),.07,1.23+.026*Math.cos(i)),.009);
    }
    // A lidded earthenware miso crock and a little wooden tasting spoon.
    const jar=group(scene,2.91,.017,-.52);
    turn(jar,m.cream,0,0,0,[[.01,.012],[.37,.012],[.44,.09],[.46,.42],[.429,.61],[.366,.66],[.368,.70],[.01,.70]]);
    hoop(jar,m.stripe,0,.53,0,.445,.017);hoop(jar,m.stripe,0,.48,0,.453,.009);
    turn(jar,m.walnut,0,0,0,[[.001,.70],[.385,.70],[.408,.726],[.41,.77],[.372,.798],[.01,.801]]);
    oval(jar,m.walnut,0,.834,0,.102,.064,.102);
    const spoon=group(towel,.14,.198,.12);spoon.rotation.y=-.24;
    oval(spoon,m.walnut,0,.046,-.43,.18,.057,.27);
    rod(spoon,m.walnut,v(0,.049,-.26),v(0,.094,.76),.043,.059);
    batchRigid(scene);
  }
  root.Kitchen={T,v,batchRigid,group,material,patterned,mesh,oval,box,turn,hoop,rod,bent,m,bowl,onion,kitchen,noise};
})(globalThis);
