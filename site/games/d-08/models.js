/* All objects are modelled at metre scale. Static pieces sharing a finish are batched. */
window.PortModels = (() => {
  'use strict';
  const T=THREE, P=PortPhysics, v=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=28473; const random=()=>((seed=1664525*seed+1013904223>>>0)/4294967296);
  const cube=new T.BoxGeometry(), up=v(0,1,0), geo=new Map(), materials=new Map();
  function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
  const roughData=new Uint8Array(128*128*4);
  for(let i=0;i<roughData.length;i+=4){
    const n=209+Math.floor(random()*40);roughData.set([n,n,n,255],i);
  }
  const rough=new T.DataTexture(roughData,128,128);rough.wrapS=rough.wrapT=T.RepeatWrapping;rough.magFilter=T.LinearFilter;rough.minFilter=T.LinearMipmapLinearFilter;rough.generateMipmaps=true;rough.needsUpdate=true;
  function mat(color,r=.68,m=.16,extra={}){
    const key=[color,r,m,JSON.stringify(extra)].join('/');
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:r,metalness:m,roughnessMap:rough,...extra}));
    return materials.get(key);
  }
  const steel=mat(0x505d5e,.47,.67),dark=mat(0x333e42,.58,.54),rubber=mat(0x263237,.92,.035),iron=mat(0x838b88,.47,.65),
    white=mat(0xe0e1d4,.6,.24),teal=mat(0x497877,.55,.45),black=mat(0x344447,.6,.4),
    ochre=mat(0xdba144,.52,.44),ochreLight=mat(0xeeb85a,.47,.38),ochreDark=mat(0x9a692f,.67,.41),
    glass=mat(0x355a62,.17,.56),navy=mat(0x254651,.48,.48),stripe=mat(0xe1bc78,.49,.34),
    deck=mat(0x747d78,.65,.34),red=mat(0xa04c3a,.6,.36),lamp=mat(0xffe6ac,.18,.2,{emissive:0xffbd58,emissiveIntensity:1.7});
  function mesh(g,geometry,material,x=0,y=0,z=0){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
  function box(g,x,y,z,w,h,d,m){const o=mesh(g,cube,m,x,y,z);o.scale.set(w,h,d);return o;}
  function cylinderGeo(top,bottom,n){const k=[top,bottom,n].join(',');if(!geo.has(k))geo.set(k,new T.CylinderGeometry(top,bottom,1,n));return geo.get(k);}
  function cyl(g,x,y,z,rt,rb,h,m,n=12){const o=mesh(g,cylinderGeo(rt,rb,n),m,x,y,z);o.scale.y=h;return o;}
  function rod(g,a,b,r,m,n=6){
    const diff=v(b[0]-a[0],b[1]-a[1],b[2]-a[2]),len=diff.length();
    const o=cyl(g,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,r,len,m,n);
    o.quaternion.setFromUnitVectors(up,diff.normalize());return o;
  }
  function beam(g,a,b,w,d,m){
    const diff=v(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const o=box(g,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,diff.length(),d,m);
    o.quaternion.setFromUnitVectors(up,diff.normalize());return o;
  }
  function torus(g,x,y,z,r,t,m){const k='ring'+r+','+t;if(!geo.has(k))geo.set(k,new T.TorusGeometry(r,t,8,24));return mesh(g,geo.get(k),m,x,y,z);}
  function batch(g){
    g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(), bins=new Map(),del=[];
    g.traverse(o=>{
      if(!o.isMesh)return;
      const b=bins.get(o.material)||{p:[],n:[],uv:[],idx:[]};bins.set(o.material,b);
      const matrix=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),norm=new T.Matrix3().getNormalMatrix(matrix);
      const a=o.geometry.attributes,base=b.p.length/3,pt=new T.Vector3(),nv=new T.Vector3();
      for(let i=0;i<a.position.count;i++){
        pt.fromBufferAttribute(a.position,i).applyMatrix4(matrix);b.p.push(pt.x,pt.y,pt.z);
        nv.fromBufferAttribute(a.normal,i).applyMatrix3(norm).normalize();b.n.push(nv.x,nv.y,nv.z);
        b.uv.push(a.uv?.getX(i)||0,a.uv?.getY(i)||0);
      }
      const idx=o.geometry.index;for(let i=0;i<(idx?idx.count:a.position.count);i++)b.idx.push(base+(idx?idx.getX(i):i));
      del.push(o);
    });
    del.forEach(o=>o.removeFromParent());
    bins.forEach((b,m)=>{const a=new T.BufferGeometry();a.setAttribute('position',new T.Float32BufferAttribute(b.p,3));a.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));a.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));a.setIndex(b.idx);mesh(g,a,m);});
    return g;
  }
  function ladder(g,x,y,z,h,w=.36,m=iron){
    for(const s of [-1,1])rod(g,[x+s*w/2,y,z],[x+s*w/2,y+h,z],.024,m);
    for(let k=.17;k<h;k+=.29)rod(g,[x-w/2,y+k,z],[x+w/2,y+k,z],.021,m);
  }
  const paints=[0xb84c36,0x376d91,0xdfaa40], cargoTemplates=[];
  function container(root,k){
    if(cargoTemplates[k]){const g=cargoTemplates[k].clone();root.add(g);return g;}
    const g=group(root),body=mat(paints[k],.6,.42),light=mat(new T.Color(paints[k]).offsetHSL(0,-.02,.035).getHex(),.55,.42);
    const w=4.33,h=P.boxH,d=1.79;
    box(g,0,h/2,0,w-.10,h-.08,d-.1,body);
    // Folded trapezoidal steel sheeting on each face catches the skylight.
    const points=[],uv=[];
    function quad(a,b,c,e){for(const p of [a,b,e,b,c,e]){points.push(...p);uv.push(p[0],p[1]+p[2]);}}
    for(const side of [-1,1]){
      for(let i=0;i<25;i++){
        const x=-2.08+i*4.16/25,pitch=4.16/25;
        const edges=[[0,0],[.18,.039],[.54,.039],[.73,0],[1,0]];
        for(let j=0;j<4;j++){
          const a=x+edges[j][0]*pitch,b=x+edges[j+1][0]*pitch,za=side*(d*.5-.04+edges[j][1]),zb=side*(d*.5-.04+edges[j+1][1]);
          if(side>0)quad([a,.09,za],[b,.09,zb],[b,h-.09,zb],[a,h-.09,za]);
          else quad([b,.09,zb],[a,.09,za],[a,h-.09,za],[b,h-.09,zb]);
        }
      }
      for(const y of [.055,h-.055])box(g,0,y,side*d/2,w,.095,.065,light);
    }
    const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(points,3));cg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));cg.computeVertexNormals();mesh(g,cg,body);
    for(let i=0;i<24;i++)box(g,-2+i*.171,h-.018,0,.08,.06,d-.18,light);
    for(const end of [-1,1]){
      const x=end*w/2;
      for(const s of [-1,1]){
        box(g,x,h/2,s*d*.25,.054,h-.14,d*.48,body);
        for(let j=0;j<4;j++)box(g,x+end*.022,.29+j*.39,s*d*.25,.052,.06,.69,light);
        for(const z of [.19,.67]){rod(g,[x+end*.075,.13,z*s],[x+end*.075,h-.13,z*s],.024,iron);box(g,x+end*.088,.7,s*z-.038,.04,.035,.14,steel);}
        box(g,x,h/2,s*(d/2-.026),.10,h,.09,light);
        for(const y of [.075,h-.075]){
          box(g,x-.015*end,y,s*d/2,.17,.15,.12,iron);
          box(g,x-.021*end,y,s*(d/2+.062),.075,.045,.009,dark);
        }
      }
    }
    // Small paired diagonal paint marks, without lettering.
    for(let i=0;i<2;i++){const mark=box(g,-1.52+i*.19,1.28,d*.5+.012,.105,.34,.012,white);mark.rotation.z=-.52;}
    cargoTemplates[k]=batch(g);return g;
  }
  function quay(root){
    const g=group(root),cement=mat(0xa7a59a,.83,.08),seawall=mat(0x878d85,.85,.14),stain=mat(0x697875,.85,.12),joint=mat(0x777d77,.87,.08),yellow=mat(0xd8b458,.81,.12),chalk=mat(0xcac8b9,.83,.06);
    box(g,0,-.11,-30.4,160,3.7,60.7,seawall);
    // Concrete aggregates, damp patches and small seams are generated locally.
    const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),im=ctx.createImageData(512,512);
    for(let i=0;i<512*512;i++){const x=i%512,y=i>>9;let f=random()*12+4*Math.cos(x*.024)*Math.sin(y*.037)+3*Math.sin(x*.012+y*.025);im.data.set([205+f,201+f,189+f,255],i*4);}
    ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(13,6);tex.anisotropy=4;
    const floor=cement.clone();floor.map=tex;floor.color.setHex(0xd6d2c5);
    box(g,0,1.745,-30.4,160,.06,60.7,floor);
    for(let x=-40;x<42;x+=5.2)box(g,x,1.78,-12,.021,.008,24,joint);
    for(let z=-2.1;z>-30;z-=5.05)box(g,0,1.78,z,80,.008,.022,joint);
    for(let x=-32;x<33;x+=2.7){
      box(g,x,1.77,-.23,2.64,.19,.49,cement);
      box(g,x,1.872,-.23,2.07,.015,.22,yellow);
      box(g,x+.75,.68,-.035,.10,1.55,.022,stain);
      if(Math.round(x*10)%3===0){cyl(g,x,1.96,-.64,.11,.13,.34,dark);box(g,x,2.11,-.64,.45,.11,.22,dark);}
    }
    for(const x of P.homes){
      for(const sign of [-1,1]){
        box(g,x+sign*1.78,1.792,-12.5,.066,.035,22.0,steel);
        const xx=x+sign*2.28;box(g,xx,1.79,P.yardZ,.078,.012,2.22,chalk);
        for(const dz of [-1,1])box(g,xx-sign*.25,1.792,P.yardZ+dz*1.08,.55,.012,.076,chalk);
      }
    }
    for(let x=-32;x<35;x+=3.6)box(g,x,1.789,-7.75,1.6,.012,.09,chalk);
    for(const x of [-9.4,9.8,20])ladder(g,x,-.04,.16,1.93,.43,ochre);
    batch(g);
  }
  function fender(root){
    const g=group(root);
    for(const s of [-1,1])rod(g,[s*.34,.27,0],[s*.23,-.36,.13],.027,steel);
    torus(g,0,-.54,.09,.31,.145,rubber);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;const o=box(g,.41*Math.sin(a),-.54+.41*Math.cos(a),.13,.069,.062,.16,rubber);o.rotation.z=-a;
    }
    return batch(g);
  }
  function crane(root){
    const base=group(root,-7.3,1.79,-2.05),fixed=group(base);
    const y=17.85-1.79;
    // Rail bogies and splayed portal feet.
    for(const s of [-1,1]){
      box(fixed,0,-.018,s*1.10,16,.072,.095,steel);
      for(const e of [-1,1]){
        const x=s*1.35,z=e*1.05;box(fixed,x,.35,z,1.12,.44,.55,ochreDark);box(fixed,x,.58,z,1.27,.13,.65,ochreLight);
        for(const q of [-.32,.32]){const wheel=cyl(fixed,x+q,.23,z,.23,.23,.42,dark);wheel.rotation.x=Math.PI/2;}
        beam(fixed,[x,.58,z],[s*.69,4.16,e*.62],.32,.34,ochre);
      }
      beam(fixed,[-1.29,.88,s*1.05],[1.29,.88,s*1.05],.17,.22,ochreDark);
    }
    box(fixed,0,4.13,0,1.92,.49,1.83,ochreDark);
    for(const x of [-.65,.65])for(const z of [-.58,.58])box(fixed,x,9.32,z,.205,10.1,.205,ochre);
    for(let i=0;i<6;i++){
      const y1=4.42+i*1.61,y2=y1+1.61;
      for(const s of [-1,1]){
        beam(fixed,[-.65,y1,s*.58],[.65,y2,s*.58],.108,.106,ochreLight);
        beam(fixed,[s*.65,y1,-.58],[s*.65,y2,.58],.11,.11,ochre);
        box(fixed,0,y1,s*.58,1.4,.12,.16,ochre);
      }
    }
    ladder(fixed,-.13,3.85,.74,10.60,.38,steel);
    cyl(fixed,0,14.40,0,1.17,1.03,.58,ochreDark,28);
    batch(fixed);
    const head=group(base,0,y,0), structure=group(head);
    box(structure,-1.52,-.7,0,3.53,1.02,1.72,ochre);
    box(structure,-2.2,-.15,0,2.10,.13,1.79,ochreLight);
    for(let i=0;i<6;i++)box(structure,-2.89+i*.20,-.63,.875,.085,.49,.045,black);
    for(let i=0;i<3;i++)box(structure,-3.44-i*.29,-.53,0,.27,1.03,1.90,steel);
    // Operator's cabin, the figure is contained behind the glazing.
    const cab=group(structure,.55,-1.12,.95);
    box(cab,0,-.34,0,1.38,.65,1.26,ochre);box(cab,0,.75,0,1.48,.14,1.35,ochreLight);
    const smoked=mat(0x65878b,.13,.4,{transparent:true,opacity:.56});
    box(cab,0,.28,.58,1.25,.81,.045,smoked);box(cab,.64,.28,0,.04,.81,1.16,smoked);
    box(cab,0,.28,-.60,1.26,.80,.06,glass);box(cab,-.64,.28,0,.06,.84,1.2,glass);
    for(const x of [-.66,.0,.66])box(cab,x,.28,.621,.056,.91,.06,ochre);
    for(const z of [-.57,.57])box(cab,.68,.28,z,.06,.92,.07,ochre);
    cyl(cab,-.11,.17,.12,.105,.18,.38,black);mesh(cab,new T.SphereGeometry(.105,10,8),black,-.11,.47,.12);
    // Twin lattice chords, service walkway, kingpost and tension stays.
    const reach=15.7;
    for(const s of [-1,1]){
      box(structure,reach/2-.15,.12,s*.53,reach+.7,.2,.18,ochreDark);
      beam(structure,[-.5,1.35,s*.47],[reach,.79,s*.35],.14,.15,ochreLight);
      for(let i=0;i<12;i++){
        const a=-.15+i*1.30,b=a+1.30,peak=(a+b)/2,top=1.32-.036*peak;
        beam(structure,[a,.17,s*.53],[peak,top,s*(.47-.007*peak)],.103,.11,ochre);
        beam(structure,[peak,top,s*(.47-.007*peak)],[b,.17,s*.53],.105,.11,ochre);
        if(s===1)beam(structure,[a,.14,-.5],[b,.14,.5],.086,.09,ochre);
      }
      beam(structure,[-1.9,-.04,s*.62],[-.59,3.00,s*.31],.16,.16,ochre);
      beam(structure,[1.05,.11,s*.50],[-.59,3.00,s*.31],.16,.16,ochreLight);
      rod(structure,[-.59,2.97,s*.31],[12.77,1.02,s*.36],.034,steel);
      rod(structure,[-.59,2.97,s*.31],[-3.91,.07,s*.6],.038,steel);
    }
    box(structure,reach,.43,0,.19,.75,1.18,ochre);
    box(structure,-.59,3.04,0,.32,.20,.87,ochreDark);
    cyl(structure,-.58,3.24,0,.099,.10,.21,lamp);
    batch(structure);
    const cart=group(head),m=group(cart);
    box(m,0,-.035,0,.98,.28,1.45,ochre);
    for(const s of [-1,1]){const wheel=cyl(m,s*.31,.12,.57,.13,.13,.15,black);wheel.rotation.x=Math.PI/2;}
    batch(m);const drum=cyl(cart,0,-.23,0,.23,.23,1.02,dark,16);drum.rotation.x=Math.PI/2;
    const spreader=group(root),skel=group(spreader);
    box(skel,0,.22,0,3.77,.29,.60,ochre);
    for(const s of [-1,1]){
      box(skel,s*1.77,.17,0,.36,.29,1.62,ochreLight);
      for(let i=0;i<6;i++){const q=box(skel,s*1.77,.18,-.68+i*.26,.37,.24,.1,dark);q.rotation.x=-.31;}
    }
    for(const z of [-.33,.33])for(const x of [-1.55,1.55])rod(skel,[x,.31,z],[Math.sign(x)*.42,1.1,Math.sign(z)*.18],.034,steel);
    box(skel,0,1.08,0,1.09,.22,.58,dark);batch(skel);
    const pins=[];for(const x of [-1.81,1.81])for(const z of [-.66,.66])pins.push(box(spreader,x,.02,z,.12,.19,.12,steel));
    const lines=[];for(let i=0;i<4;i++)lines.push(cyl(root,0,0,0,.031,.031,1,dark,6));
    return {base,head,cart,drum,spreader,lines,pins};
  }
  let hullPaint;
  function hullFinish(){
    if(hullPaint)return hullPaint;
    // Plate seams and narrow rain marks stay in the hull's own UV coordinates.
    const size=256,bytes=new Uint8Array(size*size*4);
    const stains=Array.from({length:9},()=>[random()*size,random()*size,1+random()*1.6,8+random()*24]);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      let rust=0;
      for(const [cx,cy,width,run] of stains){
        const dy=(y-cy+size)%size,dx=Math.min(Math.abs(x-cx),size-Math.abs(x-cx));
        if(dy<run&&dx<width)rust+=(1-dy/run)*(1-dx/width)*.85;
      }
      const panel=(x===0||x===124||y===77)?.085:0,grain=random()*.031;
      const k=4*(x+size*y);bytes[k]=247*(1-panel-grain);bytes[k+1]=248*(1-panel-grain-rust*.35);bytes[k+2]=251*(1-panel-grain-rust*.54);bytes[k+3]=255;
    }
    const map=new T.DataTexture(bytes,size,size);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
    hullPaint=navy.clone();hullPaint.map=map;return hullPaint;
  }
  function vessel(root){
    const g=group(root),s=group(g);
    const stations=[[-11.9,.82,2.37],[-11.5,1.88,2.32],[-10.5,2.25,2.28],[-8,2.32,2.12],[-5.7,2.34,1.96],[6.9,2.34,1.96],[8.65,2.20,1.96],[9.8,1.76,2.41],[11.15,1.07,2.62],[12.05,.39,2.83],[12.38,.035,2.91]];
    const bottom=mat(0x914d3f,.57,.5),boot=mat(0xb59273,.55,.44),rim=mat(0x546162,.59,.52);
    function surface(rows,m){
      const p=[],uv=[];
      for(let j=0;j<rows.length-1;j++)for(let i=0;i<stations.length-1;i++){
        for(const a of [rows[j][i],rows[j][i+1],rows[j+1][i],rows[j+1][i],rows[j][i+1],rows[j+1][i+1]]){p.push(...a);uv.push(a[0]*.2,(a[1]+a[2])*.2);}
      }
      const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(p,3));b.setAttribute('uv',new T.Float32BufferAttribute(uv,2));b.computeVertexNormals();mesh(s,b,m);
    }
    for(const sign of [-1,1]){
      const r=(height,width,shrink=1)=>stations.map(([x,w,h])=>[x*shrink,height(h,x),sign*width*w]);
      const rows=[r(()=>-1.45,.7,.94),r(()=>.25,.94,.975),r(()=>.34,.95,.978),r(h=>h-.12,1),r(h=>h-.06,1.002),r(h=>h,1)];
      const hullM=[bottom,boot,hullFinish(),stripe,rim];for(let j=0;j<hullM.length;j++)surface(sign>0?[rows[j],rows[j+1]]:[rows[j+1],rows[j]],hullM[j]);
      const middle=r(h=>h,0);
      surface(sign>0?[rows[5],middle]:[middle,rows[5]],deck);
      // Gunwale, guardrail stanchions and fairleads follow the sheer of the hull.
      for(let i=1;i<stations.length;i++){
        const [xa,wa,ha]=stations[i-1],[xb,wb,hb]=stations[i],count=Math.ceil((xb-xa)/1.35);
        rod(s,[xa,ha+.01,sign*wa],[xb,hb+.01,sign*wb],.057,rim);
        for(let k=0;k<count;k++){
          const t=k/count,x=xa+(xb-xa)*t,y=ha+(hb-ha)*t,z=sign*(wa+(wb-wa)*t)*.98;
          if(x>-5.9 && x<8.25)continue;
          rod(s,[x,y,z],[x,y+.48,z],.025,white);
        }
        if(xa< -5.6 || xb>8){
          for(const dh of [.25,.49])rod(s,[xa,ha+dh,sign*wa*.98],[xb,hb+dh,sign*wb*.98],.022,white);
        }
      }
      for(let i=0;i<7;i++){
        const x=-10.2+i*.53,z=sign*2.315;
        let o=cyl(s,x,1.55,z,.112,.112,.045,iron,12);o.rotation.x=Math.PI/2;
        o=cyl(s,x,1.55,z+sign*.028,.082,.082,.022,glass,12);o.rotation.x=Math.PI/2;
      }
      const eye=torus(s,10.05,1.60,sign*1.6,.145,.048,iron);eye.rotation.y=sign*.46;
      rod(s,[9.98,1.56,sign*1.65],[9.90,.99,sign*1.70],.048,dark);
      for(const d of [-1,1])rod(s,[9.90,.99,sign*1.70],[9.90+d*.24,1.16,sign*1.7],.054,dark);
      for(let k=0;k<2;k++){const o=box(s,5.75+.29*k,1.37,sign*2.346,.15,.52,.013,white);o.rotation.z=-.54;}
    }
    box(s,-11.72,.54,0,.27,3.49,1.75,navy);
    // Hatch covers and steel guides. Containers rest on their corner castings.
    for(let i=0;i<3;i++){
      const x=P.slots[i];box(s,x,1.97,0,4.56,.09,2.36,dark);
      box(s,x,2.005,0,4.38,.054,2.18,deck);
      for(let j=0;j<9;j++)box(s,x-1.92+j*.48,2.04,0,.026,.014,2.04,steel);
      for(const a of [-1,1])for(const b of [-1,1]){
        box(s,x+a*2.06,2.07,b*1.02,.47,.062,.09,stripe);
        box(s,x+a*2.25,2.07,b*.85,.08,.062,.40,stripe);
      }
    }
    // Accommodation block, wraparound wheelhouse and bridge wings.
    box(s,-8.31,3.10,0,3.2,1.95,3.45,white);
    box(s,-8.42,4.11,0,3.67,.16,3.97,white);
    box(s,-8.54,4.57,0,2.85,.83,3.04,white);
    box(s,-8.47,5.04,0,3.38,.14,3.50,white);
    box(s,-8.20,5.45,0,2.94,.72,3.45,white);
    const win=mat(0x385860,.19,.52);
    for(const sign of [-1,1]){
      for(let k=0;k<6;k++){
        box(s,-9.38+k*.465,5.49,sign*1.734,.38,.43,.025,win);
        if(k<5)box(s,-9.45+k*.51,3.46,sign*1.737,.32,.38,.04,win);
      }
      for(let k=0;k<5;k++)box(s,-6.717,5.49,-1.37+k*.69,.036,.43,.57,win);
      box(s,-8.24,5.87,sign*.03,3.34,.13,3.82,white);
      for(let i=0;i<6;i++)rod(s,[-9.94+i*.60,4.18,sign*1.92],[-9.94+i*.6,4.62,sign*1.92],.023,white);
      rod(s,[-10,4.62,sign*1.92],[-6.77,4.62,sign*1.92],.02,white);
      box(s,-8.1,4.43,sign*1.54,.61,.58,.033,teal);
      let ring=torus(s,-7.20,3.17,sign*1.77,.187,.052,red);
      for(const a of [-1,1])box(s,-7.2+a*.17,3.17,sign*1.79,.07,.10,.065,white);
      const raft=cyl(s,-9.46,4.37,sign*1.77,.145,.145,.63,white);raft.rotation.z=Math.PI/2;
    }
    box(s,-10.3,3.63,0,1.2,2.55,1.6,ochreDark);
    box(s,-10.32,4.71,0,1.11,.92,1.45,ochre);
    box(s,-10.35,5.25,0,1.14,.34,1.48,black);
    for(const z of [-.31,.31])cyl(s,-10.23,5.52,z,.22,.24,.35,dark,16);
    ladder(s,-9.74,2.45,1.82,2.45,.30);
    for(const z of [-.98,1]){const o=mesh(s,new T.SphereGeometry(.255,16,12),white,-8.92,6.19,z);cyl(s,-8.92,6.01,z,.11,.12,.23,iron);}
    rod(s,[-8.1,5.94,0],[-8.1,7.87,0],.054,white);
    rod(s,[-8.1,6.89,-.94],[-8.1,6.89,.94],.036,white);
    box(s,-8.1,7.48,0,.19,.125,1.37,white);
    for(const z of [-.88,.88]){rod(s,[-8.1,6.87,z],[-8.1,7.18,z],.027,iron);cyl(s,-8.1,7.22,z,.063,.063,.14,lamp);}
    // Forecastle winch and paired bollards.
    box(s,9.35,2.31,0,1.52,.18,1.24,teal);
    for(const z of [-.40,.40]){const o=cyl(s,9.4,2.57,z,.26,.26,.34,dark);o.rotation.x=Math.PI/2;const flange=cyl(s,9.4,2.57,z+.16,.3,.3,.06,iron);flange.rotation.x=Math.PI/2;}
    for(const x of [8.1,10.2])for(const z of [-.83,.83]){
      cyl(s,x,2.64,z,.12,.12,.40,dark);cyl(s,x,2.85,z,.15,.15,.06,dark);
    }
    rod(s,[11.43,2.74,0],[11.61,4.15,0],.035,white);cyl(s,11.6,4.15,0,.065,.065,.11,lamp);
    batch(s);return g;
  }
  function warehouse(s,x,z,w,d,h,color){
    const y=1.79,wall=mat(color,.78,.23),roof=mat(0x788887,.66,.35),seam=mat(0x889591,.76,.30);
    box(s,x,y+h/2,z,w,h,d,wall);
    for(const side of [-1,1]){
      const r=box(s,x,y+h+.39,z+side*d*.245,w+.36,.16,d*.52,roof);r.rotation.x=side*.145;
    }
    for(let k=-w/2+.5;k<w/2;k+=.67)box(s,x+k,y+h/2,z+d/2,.05,h,.048,seam);
    for(let i=-w/2+2;i<w/2-1;i+=4.1){
      box(s,x+i,y+1.51,z+d/2+.032,2.9,2.93,.09,black);
      for(let j=0;j<7;j++)box(s,x+i,y+.3+j*.4,z+d/2+.095,2.72,.35,.07,steel);
      box(s,x+i,y+3.08,z+d/2+.22,3.3,.14,.60,roof);
    }
    box(s,x,y+h-.46,z+d/2+.037,w-.6,.46,.07,glass);
    for(let i=-w/2+.55;i<w/2;i+=1.18)box(s,x+i,y+h-.46,z+d/2+.08,.055,.48,.08,white);
  }
  function distance(root){
    const s=group(root);
    const siding=mat(0xa9afa6,.78,.24),roof=mat(0x7f8e8b,.64,.37);
    box(s,1.45,4.04,-24.6,17.6,4.50,.16,siding);
    for(const x of [-7.3,10.2])box(s,x,4.04,-21.0,.14,4.5,7.3,siding);
    box(s,1.45,6.29,-20.98,18.1,.23,8.10,roof);
    box(s,1.45,5.78,-17.22,17.65,1.07,.16,siding);
    for(const x of [-7.25,-1.03,3.92,10.15]){
      box(s,x,3.63,-17.22,.21,3.75,.26,steel);
      box(s,x,2.39,-17.22,.26,1.2,.29,ochreDark);
    }
    for(let x=-7.12;x<10.26;x+=.45)box(s,x,5.82,-17.11,.035,.91,.04,iron);
    warehouse(s,24,-29,24,10,5.3,0x9ca9a7);
    const muted=[0x94776b,0x718889,0x9b8f72,0x68818b,0xa18b73].map(c=>mat(c,.73,.28));
    for(let side=0;side<2;side++)for(let lane=0;lane<2;lane++)for(let i=0;i<4;i++){
      const x=(side?13.8:-27.8)+i*4.55,z=-13.6-lane*2.03;
      const levels=1+Number((i+lane+side)%3===0);
      for(let level=0;level<levels;level++){
        const y=1.8+level*1.60,finish=muted[(i+2*lane+3*side+level)%5];
        box(s,x,y+.8,z,4.42,1.60,1.83,finish);
        for(let k=0;k<16;k++)box(s,x-2.03+k*.27,y+.8,z+.918,.055,1.43,.05,finish);
      }
    }
    for(const x of [-25,16,39]){
      cyl(s,x,5.6,-12,.11,.17,7.75,iron);box(s,x,9.53,-12,1.17,.14,.27,black);
      for(const q of [-.36,.36])box(s,x+q,9.46,-11.94,.47,.10,.38,white);
    }
    // Distant gantries, silos and coastal hills establish scale through atmospheric perspective.
    const far=mat(0x839697,.72,.30);
    for(const [x,z,scale] of [[-28,-35,1],[31,-45,1.25],[48,-50,.95],[-44,-43,1.18]]){
      const o=group(s,x,1.8,z);o.scale.setScalar(scale);
      for(const sx of [-1,1])for(const sz of [-1,1]){
        beam(o,[sx*2.35,0,sz*1.48],[sx*1.61,8.8,sz*.93],.26,.28,far);
        beam(o,[sx*2.1,1.1,sz*1.32],[-sx*1.65,6.5,sz],.13,.13,far);
      }
      box(o,0,8.88,2.5,4.0,.59,12.7,far);beam(o,[0,8.7,-2],[0,13.6,-.7],.24,.24,far);
      rod(o,[0,13.6,-.7],[0,9,8.6],.07,far);box(o,0,8.0,-1.6,3.2,1.1,2.7,far);
      rod(o,[0,8.55,6.2],[0,3.8,6.2],.044,steel);
    }
    for(let i=0;i<5;i++){const x=-33+i*2.6;cyl(s,x,5.2,-28,1.23,1.23,6.7,white,16);cyl(s,x,8.92,-28,.20,1.27,.76,iron,16);}
    box(s,0,0,-75,240,3.5,76,mat(0x929e91,.97,.03));
    for(let i=0;i<17;i++){const o=mesh(s,new T.IcosahedronGeometry(1,1),mat(0x879a95,.98,.025),-143+i*18,-3,-95-random()*20);o.scale.set(17+random()*18,5+random()*9,14);}
    batch(s);
  }
  // Segmented guides are low-profile lamps built into the pavement and hatch coamings.
  function guides(root,w,d){
    const g=group(root),finish=new T.MeshStandardMaterial({color:0xffdea0,emissive:0xffc773,emissiveIntensity:.8,roughness:.42,roughnessMap:rough,metalness:.22});
    for(const x of [-1,1])for(const z of [-1,1]){
      box(g,x*(w*.5-.27),0,z*d*.5,.57,.038,.085,finish);
      box(g,x*w*.5,0,z*(d*.5-.16),.085,.038,.38,finish);
    }
    batch(g);return {g,finish};
  }
  return {group,mesh,box,cyl,rod,mat,batch,quay,crane,vessel,container,distance,fender,guides};
})();
