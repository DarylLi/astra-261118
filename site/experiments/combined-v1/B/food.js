'use strict';
const Food = (() => {
  const {T,V,scene,M,mat,texture,noise,rnd,obj,mesh,ball,box,rounded,lathe,tube,rod,ring,vessel,plate}=Studio;
  const tau=Math.PI*2, U=.096, bowlPos=V(-1.64,.083,.18),panPos=V(.59,.236,.19),platePos=V(4.75,.076,.14);
  const rackSpots=[V(1.97,.155,.62),V(3.36,.155,.65),V(2.70,.155,-.57)];
  const rack=obj(scene,2.65,.13,.02);
  for(let i=0;i<20;i++) rod(rack,[-1.04+i*.109,0,-1.09],[-1.04+i*.109,0,1.09],.012,M.steel);
  for(const z of [-1.08,0,1.08])rod(rack,[-1.09,-.018,z],[1.09,-.018,z],.018,M.metal);
  for(const x of [-.89,.89])for(const z of [-.91,.91])ball(rack,x,-.078,z,.039,.057,.039,M.dark);
  const bowl=obj(scene,...bowlPos.toArray());vessel(bowl,0,0,0,.765,.695,M.china);
  ring(bowl,0,.651,0,.748,.012,M.trim);ring(bowl,0,.629,0,.741,.005,M.trim);
  ring(bowl,0,.086,0,.384,.012,M.china);
  // Fine scallops pressed into the outer foot of the mixing bowl.
  for(let i=0;i<52;i++){const a=i*tau/52;
    tube(bowl,[[.394*Math.sin(a),.09,.394*Math.cos(a)],[.49*Math.sin(a),.151,.49*Math.cos(a)],[.574*Math.sin(a),.24,.574*Math.cos(a)]],.005,M.ivory,8,4);}
  Studio.batch(rack);
  const flour=mat(0xe7ddc5,.90),raw=mat(0xe9cb93,.78);
  const flourMap=texture((x,y)=>219+30*noise(x,y)+5*Math.sin(x*.31)*Math.cos(y*.39),128);
  raw.bumpMap=flourMap;raw.bumpScale=.007;
  Studio.batch(bowl);
  // Use a polar grid to keep the free surface circular inside the stoneware.
  function polar(n,m){
    const p=[],uv=[],idx=[];
    for(let j=0;j<=n;j++)for(let i=0;i<=m;i++){const a=tau*i/m,r=j/n;
      p.push(r*Math.cos(a),0,r*Math.sin(a));uv.push(.5+.5*r*Math.cos(a),.5+.5*r*Math.sin(a));
      if(j&&i){const b=j*(m+1)+i;idx.push(b-1,b,b-m-2,b,b-m-1,b-m-2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const mixMesh=mesh(bowl,polar(22,80),raw);raw.side=T.DoubleSide;
  const flourBase=mixMesh.geometry.attributes.position.array.slice(),clumps=[];
  for(let i=0;i<30;i++){
    const a=rnd()*tau,r=Math.sqrt(rnd())*.49,s=.021+rnd()*.062;
    const o=ball(bowl,r*Math.cos(a),.43,r*Math.sin(a),s,s*.48,s*.9,flour);clumps.push({o,s,r});
  }
  const looseFlour=obj(scene,bowlPos.x+.71,.075,bowlPos.z+.49);
  for(let i=0;i<35;i++){
    const a=rnd()*tau,r=rnd()*.22,w=.003+rnd()*.007;
    ball(looseFlour,Math.cos(a)*r,.002+rnd()*.004,Math.sin(a)*r*.44,w,w*.46,w*.8,flour);
  }
  Studio.batch(looseFlour);
  // Pitcher with a pulled pouring lip, solid belly, rolled foot and ceramic handle.
  function jug(p,r,h,m,liquid){
    const g=obj(p);
    const v=lathe(g,0,0,0,[[.001,0],[.54*r,0],[.66*r,.035*h],[.68*r,.09*h],[.9*r,.18*h],[r,.42*h],[.98*r,.57*h],[.76*r,.81*h],[.71*r,.98*h],[.74*r,h],[.68*r,h*1.015],[.64*r,.98*h],[.67*r,.83*h],[.84*r,.53*h],[.001,.16*h]],m);
    const pos=v.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){const xx=pos.getX(i),yy=pos.getY(i),zz=pos.getZ(i);
      const lip=Math.max(0,xx/r)*Math.exp(-zz*zz/(r*r*.10))*Math.max(0,(yy/h-.79)*5);
      pos.setXYZ(i,xx+.33*r*lip,yy+.075*h*lip,zz);}
    v.geometry.computeVertexNormals();
    tube(g,[[-r*.69,h*.85,0],[-r*1.25,h*.88,0],[-r*1.38,h*.65,0],[-r*1.29,h*.45,0],[-r*.91,h*.28,0]],r*.115,m);
    ball(g,0,h*.83,0,r*.68,.018,r*.68,liquid);return g;
  }
  const milk=mat(0xfff5dd,.23),jugHome=V(-2.64,.04,-.10),pitcher=jug(scene,.267,.666,M.ivory,milk);pitcher.position.copy(jugHome);
  const syrupMat=new T.MeshPhysicalMaterial({color:0x9f4d12,roughness:.095,metalness:0,clearcoat:1,clearcoatRoughness:.07,roughnessMap:Studio.rough});
  const syrupHome=V(5.62,.04,-.72),syrupJug=jug(scene,.207,.43,mat(0xb78750,.19,.13),syrupMat);syrupJug.position.copy(syrupHome);
  // Beech handled balloon whisk. Each wire is a separate closed steel loop.
  const whisk=obj(scene);
  lathe(whisk,0,0,0,[[.006,.29],[.038,.31],[.050,.35],[.055,.70],[.047,.77],[.025,.80],[.001,.805]],M.walnut,32);
  lathe(whisk,0,0,0,[[.002,.265],[.044,.27],[.044,.37],[.002,.37]],M.steel,32);
  for(let i=0;i<8;i++){
    const a=Math.PI*i/8,pts=[];
    for(let j=0;j<=28;j++){
      const t=j/28*tau,w=.139*Math.sin(t)*(.88-.26*Math.cos(t));
      pts.push([Math.cos(a)*w,-.007+.292*Math.cos(t),Math.sin(a)*w]);
    }
    tube(whisk,pts,.0065,M.metal,32,5);
  }
  // A few ingredients remain on the back of the preparation counter.
  Studio.batch(whisk);
  const eggCup=obj(scene,-2.55,.045,-.72);vessel(eggCup,0,0,0,.317,.157,M.sage);
  for(let i=0;i<3;i++){const egg=ball(eggCup,(i-1)*.14,.189+(i===1?.067:0),(i%2)*.063,.103,.147,.105,mat([0xccad8a,0xe1c3a0,0xe6d8bb][i],.64));egg.rotation.z=(i-1)*.46;}
  const flourJar=obj(scene,-.79,.015,-.78);
  lathe(flourJar,0,0,0,[[.001,0],[.18,0],[.221,.04],[.222,.43],[.202,.48],[.20,.52],[.005,.52]],M.ivory);
  lathe(flourJar,0,.51,0,[[.001,0],[.214,0],[.218,.036],[.203,.053],[.001,.053]],M.wood);
  // Enamel tabletop cooker with an adjustable unmarked metal dial.
  const hob=obj(scene,panPos.x,0,panPos.z);
  rounded(hob,0,.081,0,1.71,.16,1.53,.068,M.ivory);
  const darkMetal=mat(0x383a34,.38,.65), iron=mat(0x3d403e,.74,.54,{bumpMap:flourMap,bumpScale:.006});
  lathe(hob,0,.16,0,[[.001,0],[.52,0],[.54,.026],[.49,.065],[.001,.065]],darkMetal);
  const dial=lathe(hob,.571,.10,.782,[[.001,0],[.088,0],[.091,.07],[.077,.086],[.001,.086]],M.metal,32);dial.rotation.x=Math.PI/2;
  const pointer=rod(dial,[0,.087,0],[0,.087,.06],.009,M.dark);
  const pan=obj(scene,...panPos.toArray());
  lathe(pan,0,-.04,0,[[.001,0],[.59,0],[.65,.007],[.73,.049],[.783,.137],[.803,.203],[.796,.219],[.771,.218],[.750,.161],[.712,.10],[.648,.058],[.58,.039],[.001,.036]],iron,96);
  ring(pan,0,.172,0,.794,.009,M.steel);
  const handle=obj(pan,-.60,.06,.36);handle.rotation.y=-.58;
  tube(handle,[[0,0,0],[-.15,.06,.012],[-.28,.096,.024],[-.49,.11,.032]],.060,darkMetal);
  rod(handle,[-.37,.105,.028],[-1.05,.167,.03],.071,M.walnut,.091);
  ball(handle,-1.05,.167,.03,.087,.09,.09,M.walnut);
  Studio.batch(pan);
  const ladle=obj(scene),spat=obj(scene);
  vessel(ladle,0,-.119,0,.166,.152,M.metal);
  tube(ladle,[[0,0,-.124],[.01,.19,-.171],[.02,.51,-.189],[.02,.79,-.206]],.025,M.steel);
  rod(ladle,[.02,.55,-.19],[.02,.91,-.21],.044,M.wood,.052);
  const ladleFill=ball(ladle,0,.003,0,.151,.02,.151,raw);
  // Thin slotted turner built from a single perforated, bevelled metal shape.
  const blade=new T.Shape();blade.moveTo(-.155,-.19);blade.quadraticCurveTo(-.183,-.17,-.174,-.10);blade.lineTo(-.139,.141);blade.quadraticCurveTo(-.13,.21,-.043,.216);blade.lineTo(.066,.216);blade.quadraticCurveTo(.132,.207,.14,.14);blade.lineTo(.177,-.139);blade.quadraticCurveTo(.181,-.19,.14,-.19);blade.closePath();
  for(let i=-1;i<=1;i++){const x=i*.077,h=new T.Path();h.moveTo(x-.012,-.113);h.lineTo(x-.012,.120);h.quadraticCurveTo(x,.146,x+.012,.120);h.lineTo(x+.012,-.113);h.quadraticCurveTo(x,-.139,x-.012,-.113);blade.holes.push(h);}
  const bg=new T.ExtrudeGeometry(blade,{depth:.012,bevelEnabled:true,bevelSegments:2,bevelSize:.006,bevelThickness:.004});bg.rotateX(-Math.PI*.5);mesh(spat,bg,M.steel);
  tube(spat,[[.01,.006,-.18],[.015,.011,-.29],[.025,.18,-.43],[.025,.23,-.74]],.024,M.metal);
  rod(spat,[.025,.20,-.55],[.025,.28,-1.03],.048,M.walnut,.060);
  for(const z of [-.66,-.87])ball(spat,.025,.23+(-z-.55)*.15+.035,z,.014,.005,.015,M.brass);
  Studio.batch(spat);
  const serving=plate(scene,...platePos.toArray(),.91);
  const butterMat=new T.MeshPhysicalMaterial({color:0xf5ce6f,roughness:.28,clearcoat:.2,roughnessMap:Studio.rough});
  const butterPlate=V(3.91,.014,-1.04);plate(scene,...butterPlate.toArray(),.34);
  const knife=obj(scene);
  const knifeBlade=rounded(knife,0,0,0,.31,.019,.14,.009,M.metal);knifeBlade.rotation.y=.12;
  rod(knife,[-.12,0,-.018],[-.30,.028,-.07],.019,M.steel);
  rod(knife,[-.26,.024,-.06],[-.61,.080,-.17],.036,M.wood,.047);
  const butter=rounded(scene,0,0,0,.294,.119,.231,.023,butterMat);
  const butterPool=ball(scene,0,0,0,.01,.008,.01,mat(0xe9b959,.15));
  // A strawberry surface displaced inward at each achene, with seated seeds.
  const berry=obj(scene),seeds=[];
  for(let row=0;row<10;row++){
    const v=(row+.65)/11,ct=Math.max(5,Math.round(18*Math.sin(Math.PI*v)**.48*(.72+.42*v)));
    for(let k=0;k<ct;k++)seeds.push({v:v+(rnd()-.5)*.026,a:(k+(row%2)*.47+(rnd()-.5)*.27)*tau/ct, size:.87+rnd()*.25});
  }
  function berryRadius(v){return .233*Math.sin(Math.PI*v)**.57*(.54+.78*v);}
  function berryPoint(v,a,d=0){const rad=(berryRadius(v)+d)*(1+.033*Math.cos(3*a+v*3)+.018*Math.sin(5*a-v));
    return [Math.cos(a)*rad+.017*(1-v),.448*v,Math.sin(a)*rad*.96];}
  {
    const nx=112,ny=75,pts=[],cols=[],idx=[];const c=new T.Color();
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const a=tau*i/nx,v=j/ny,r=berryRadius(v);let dent=0;
      for(const s of seeds){if(Math.abs(s.v-v)>.096)continue;
        const da=Math.atan2(Math.sin(a-s.a),Math.cos(a-s.a))*r/.017,dv=(v-s.v)*.448/.023,dd=da*da+dv*dv;
        if(dd<8)dent+=(-.012*Math.exp(-dd*1.3)+.0016*Math.exp(-((Math.sqrt(dd)-1.38)**2)/.14))*s.size;
      }
      pts.push(...berryPoint(v,a,dent));
      c.setHSL(.009+.008*v,.70+.15*v,.315+.065*v+.024*Math.sin(a*3+.6)+.025*noise(i,j)+dent*1.3,T.SRGBColorSpace);
      cols.push(c.r,c.g,c.b);if(i&&j){const q=j*(nx+1)+i;idx.push(q-1,q,q-nx-2,q,q-nx-1,q-nx-2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(idx);g.computeVertexNormals();
    const fruit=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.32,clearcoat:.32,clearcoatRoughness:.18,side:T.DoubleSide,roughnessMap:Studio.rough});
    mesh(berry,g,fruit);
    const ins=new T.InstancedMesh(new T.SphereGeometry(1,8,7),mat(0xe6bf74,.48),seeds.length),dummy=new T.Object3D();
    seeds.forEach((s,i)=>{dummy.position.set(...berryPoint(s.v,s.a,-.006));dummy.rotation.set(0,-s.a,.13*Math.sin(s.a));dummy.scale.set(.0046,.0091*s.size,.0046);dummy.updateMatrix();ins.setMatrixAt(i,dummy.matrix);});berry.add(ins);
    const green=mat(0x627242,.57,0,{side:T.DoubleSide});
    for(let j=0;j<8;j++){
      const a=j*tau/8,points=[[0,.448,0],[.046,.457,-.029],[.102,.434,-.025],[.151,.385,.011],[.111,.434,.020],[.053,.460,.026],[.065,.466,0]];
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6]);g.computeVertexNormals();mesh(berry,g,green).rotation.y=a;
    }
    tube(berry,[[0,.441,0],[.005,.481,0],[.033,.504,-.01]],.012,green);
  }
  const berryHome=V(5.53,.105,.91);plate(scene,berryHome.x,.025,berryHome.z,.34);
  const batterStream=ball(scene,0,0,0,1,1,1,raw),milkStream=ball(scene,0,0,0,1,1,1,milk),syrupStream=ball(scene,0,0,0,1,1,1,syrupMat);
  function stream(o,from,to,r){const delta=to.clone().sub(from);o.visible=r>.002;
    if(o.visible){o.position.copy(from).lerp(to,.5);o.scale.set(r,delta.length()*.515,r);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());}}
  const cakes=[];
  const rind=mat(0xf3d2a0,.82);const baked=mat(0xffffff,.78,0,{vertexColors:true,roughnessMap:flourMap,bumpMap:flourMap,bumpScale:.0036});
  baked.onBeforeCompile=sh=>{
    sh.vertexShader='attribute float localRoughness; varying float surfaceRough;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsurfaceRough=localRoughness;');
    sh.fragmentShader='varying float surfaceRough;\n'+sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=surfaceRough;');
  };
  function makeCake(c){
    const root=obj(scene),N=20,S=90,parts=[[],[],[]],uv=[],vertices=[],samples=[];
    for(let face=0;face<2;face++)for(let j=0;j<=N;j++)for(let k=0;k<=S;k++){
      const r=j/N,a=k*tau/S,xx=r*Math.cos(a),zz=r*Math.sin(a),ix=Math.round(xx*500),iz=Math.round(zz*500);
      vertices.push(xx,face-.5,zz);uv.push(xx*.5+.5,zz*.5+.5);
      samples.push({r,a,xx,zz,face,cell:Math.min(4,Math.floor(r*5))*16+Math.round(k/S*16)%16,
        mottle:noise(ix,iz)*.12+Math.sin(xx*17+Math.sin(zz*9))*Math.cos(zz*16)*.066+Math.sin(zz*38+xx*16)*.032,
        grain:noise(ix+34,iz+21),rim:1+.024*Math.sin(3*a+.8*c.id)+.012*Math.cos(7*a+c.id*1.7)+.008*Math.sin(13*a+.9)});
      if(k&&j){const b=samples.length-1;const tri=[b-1,b,b-S-2,b,b-S-1,b-S-2];parts[Math.floor((k-1)/30)].push(...(face?tri.reverse():tri));}
    }
    const stride=(N+1)*(S+1);
    for(let k=0;k<S;k++){const i=N*(S+1)+k,b=i+stride;parts[Math.floor(k/30)].push(i,b,i+1,i+1,b,b+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(vertices.length),3));g.setAttribute('localRoughness',new T.Float32BufferAttribute(new Float32Array(samples.length),1));g.setIndex(parts.flat());
    const loaf=mesh(root,g,baked);baked.side=T.DoubleSide;
    const bubbles=new T.InstancedMesh(new T.SphereGeometry(1,10,8),mat(0xe8c28b,.44),160);bubbles.frustumCulled=false;root.add(bubbles);
    root.position.set(panPos.x+c.x*U,panPos.y+.03,panPos.z+c.z*U);
    // Radial crumb faces become visible when a serving is lifted from the stack.
    const cuts=[];
    for(let k=0;k<3;k++){
      const idx=[];
      for(let j=0;j<N;j++){const i=j*(S+1)+k*30,b=i+stride,d=i+S+1;
        idx.push(i,b,d,b,d+stride,d);}
      const cutGeo=new T.BufferGeometry();cutGeo.setAttribute('position',g.attributes.position);cutGeo.setIndex(idx);cutGeo.computeVertexNormals();
      const cut=mesh(root,cutGeo,rind);cut.visible=false;cuts.push(cut);
    }
    rind.side=T.DoubleSide;
    const entry={root,g,samples,cuts,partCount:parts[0].length,bubbles,loaf,tilt:0,updated:-10,from:root.position.clone(),to:root.position.clone(),travel:1,place:'pan',bite:0};
    cakes.push(entry);return entry;
  }
  const dummy=new T.Object3D(),color=new T.Color(),wetColor=new T.Color(0xe7c994),dryColor=new T.Color(0xf0ce92),gold=new T.Color(0xba7536),toast=new T.Color(0x633820);
  function skin(entry,c,s){
    const {g,samples}=entry,verts=g.attributes.position,cols=g.attributes.color,roughness=g.attributes.localRoughness;
    const radius=c.radius*U,h=Math.min(.27,c.thickness*U);
    for(let i=0;i<samples.length;i++){
      const p=samples[i],cell=c.cells[p.cell],f=cell.faces[p.face],sign=p.face?1:-1,edge=Math.pow(p.r,12);
      const rim=p.rim*(1-.024*edge),heat=Math.max(0,Math.min(1,(.80-f.water)*1.4)),d=f.brown;
      const scorch=Math.max(0,Math.min(1,d*(1.31+p.mottle*3.6)-.08*edge));
      let pit=0,shadow=0;
      for(const hole of f.pits){
        const d2=((p.xx-hole.x)**2+(p.zz-hole.z)**2)*c.radius**2/hole.radius**2;
        if(d2<3){const profile=Math.exp(-2*d2);pit+=hole.radius*.43*profile;shadow+=profile*.34;}
      }
      const y=sign*(h*(.49-.24*edge)+.030*cell.lift*(1-edge)+.004*p.mottle+heat*.003*(p.grain-.5)-pit*U);
      verts.setXYZ(i,p.xx*radius*rim,y,p.zz*radius*rim);
      color.copy(wetColor).lerp(dryColor,heat).lerp(gold,Math.min(1,scorch*1.85)).lerp(toast,Math.max(0,(scorch-.41)*1.65));
      color.multiplyScalar(1+(p.grain-.5)*(.024+.12*heat)+p.mottle*heat*.22-Math.min(.48,shadow));
      cols.setXYZ(i,color.r,color.g,color.b);roughness.setX(i,.79+heat*.24+p.mottle*.18);
    }
    verts.needsUpdate=cols.needsUpdate=roughness.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
    let n=0;
    for(const cell of c.cells)for(const b of cell.bubbles){
      const a=cell.angle+b.da,r=(cell.r+b.dr)*radius,sg=b.face?1:-1;
      dummy.position.set(r*Math.cos(a),sg*(h*(.49-.24*Math.pow(cell.r,12))+.030*cell.lift),r*Math.sin(a));
      const sz=b.size*U;dummy.scale.set(sz,sz*.74,sz);dummy.updateMatrix();entry.bubbles.setMatrixAt(n++,dummy.matrix);
    }
    entry.bubbles.count=n;entry.bubbles.instanceMatrix.needsUpdate=true;entry.updated=s.elapsed;
  }
  // Ribbons have a domed transverse profile and follow the side of each layer.
  const sauce=[],saucePool=ball(scene,0,0,0,.001,.001,.001,syrupMat);
  for(let i=0;i<7;i++){
    const rows=38,idx=[],pts=new Float32Array((rows+1)*5*3);
    for(let j=1;j<=rows;j++)for(let k=1;k<=4;k++){const b=j*5+k;idx.push(b-1,b-6,b,b,b-6,b-5);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pts,3));g.setIndex(idx);
    const o=mesh(scene,g,syrupMat);o.frustumCulled=false;sauce.push(o);
  }
  syrupMat.side=T.DoubleSide;
  function updateSauce(s,top,stackTop){
    const vol=s.eaten===3?0:s.syrup.volume,base=top?cakes[top.id].root.position:platePos;
    saucePool.visible=vol>.02&&s.eaten===0;saucePool.position.set(base.x,stackTop+.012,base.z);
    const rad=Math.min((top?.radius??0)*U*.88,Math.sqrt(vol)*.102);
    saucePool.scale.set(Math.max(.001,rad),.014+vol*.00035,Math.max(.001,rad*.90));
    for(let i=0;i<sauce.length;i++){
      const o=sauce[i],tr=s.syrup.trails[i];const sector=tr?Math.floor(((Math.atan2(Math.sin(tr.angle),-Math.cos(tr.angle))+tau)%tau)/(tau/3)):0;
      o.visible=!!tr&&vol>.02&&sector>=s.eaten;if(!o.visible)continue;
      const g=o.geometry,a=g.attributes.position,outer=top.radius*U,dist=tr.length*U;
      for(let j=0;j<=38;j++)for(let k=0;k<5;k++){
        const f=j/38,along=dist*f,across=(k-2)/2,down=Math.max(0,along-outer*.98);
        const theta=tr.angle+.10*Math.sin(f*4+i)*Math.min(f*3,1),width=(.016+rad*.235)*(.97-.32*f)*Math.sqrt(Math.max(.001,1-f**10));
        let rr=Math.min(along,outer*.98),y=stackTop+.014-.026*(rr/outer)**10;
        if(down>0){
          y-=down;
          // Find the radius and offset of the actual pancake beside this drip.
          let level=stackTop;
          for(let l=s.stack.length-1;l>=0;l--){
            const c=s.cakes[s.stack[l]],th=c.thickness*U;
            if(y>=level-th||l===0){rr+=(c.radius*U+Math.cos(theta)*(cakes[c.id].root.position.x-base.x)-rr)*Math.min(1,down/.09);break;}
            level-=th;
          }
          rr+=.008*(1-across*across);y=Math.max(platePos.y+.08,y);
        } else y+=.008*(1-across*across);
        a.setXYZ(j*5+k,base.x+rr*Math.cos(theta)-across*width*Math.sin(theta),y,base.z+rr*Math.sin(theta)+across*width*Math.cos(theta));
      }
      a.needsUpdate=true;g.computeVertexNormals();
    }
  }
  const sponge=rounded(scene,-4.93,.07,.64,.27,.105,.18,.032,mat(0xc5af77,.89,0,{bumpMap:flourMap,bumpScale:.015}));
  const stains=[];
  for(let i=0;i<20;i++){const o=ball(serving,0,.075,0,.01,.003,.01,mat(i%3===0?0xcaa66c:0xb68f5e,.35));o.visible=false;stains.push(o);}

  const water=ball(scene,-4.33,.25,-.58,.02,.53,.02,mat(0xb8d7d5,.11,.24,{transparent:true,opacity:.62}));
  const foamMat=mat(0xf8f6e9,.19,.08,{transparent:true,opacity:.65}),suds=[];
  for(let i=0;i<32;i++){const a=i*2.4,r=.45*Math.sqrt(i/32);const o=ball(scene,-4.34+Math.cos(a)*r,-.14,-.11+Math.sin(a)*r,.035,.03,.035,foamMat);suds.push(o);}
  return {U,bowlPos,panPos,platePos,rackSpots,bowl,pitcher,jugHome,syrupJug,syrupHome,whisk,ladle,spat,ladleFill,dial,serving,knife,butter,butterPlate,butterPool,berry,berryHome,batterStream,milkStream,syrupStream,stream,raw,flour,flourBase,clumps,mixMesh,cakes,makeCake,skin,updateSauce,sponge,stains,water,suds};
})();
