'use strict';
const ArenaArt = (() => {
  const T=THREE, pi=Math.PI,V=(x,y,z)=>new T.Vector3(x,y,z);
  let seed=871; const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;};
  function texture(size, painter, color=false){
    const c=document.createElement('canvas');c.width=c.height=size; const ctx=c.getContext('2d');painter(ctx,size);
    const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;
    if(color)t.colorSpace=T.SRGBColorSpace;return t;
  }
  const micro=texture(128,(c,n)=>{const d=c.createImageData(n,n);for(let i=0;i<d.data.length;i+=4){const h=201+rand()*52;d.data[i]=d.data[i+1]=d.data[i+2]=h;d.data[i+3]=255;}c.putImageData(d,0,0);});micro.repeat.set(3,3);
  const mat=(color,roughness=.52,metalness=.08,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:micro,...extra});
  const cream=mat(0xf5f1d9,.39),white=mat(0xf4f6ed,.29,.23),blue=mat(0x407bba,.32,.33),navy=mat(0x254660,.46,.28),dark=mat(0x182f40,.42,.4),steel=mat(0x9badb2,.24,.78),brass=mat(0xd8ab63,.28,.68),gold=mat(0xf6c467,.58,.035),sky=mat(0xa6d5e3,.55),teal=mat(0x598eac,.49),stitch=mat(0xffe6a7,.68),canvas=mat(0x89b5cc,.81,.02),sole=mat(0x385063,.79,.07),ink=mat(0x2f5477,.46);
  for(const cloth of [gold,canvas,sky]){cloth.bumpMap=micro;cloth.bumpScale=.003;}
  const glass=mat(0x112b3d,.16,.50),eye=mat(0xbcf6eb,.23,.16,{emissive:0x7ae2e3,emissiveIntensity:.65}),amber=mat(0xffda83,.31,.2,{emissive:0xffad3e,emissiveIntensity:.24});
  const mesh=(p,g,m,x=0,y=0,z=0)=>{let o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
  const cache=new Map();function geo(key,f){if(!cache.has(key))cache.set(key,f());return cache.get(key);}
  const box=(p,x,y,z,w,h,d,m)=>mesh(p,geo('b'+[w,h,d],()=>new T.BoxGeometry(w,h,d)),m,x,y,z);
  function roundGeo(w,h,d,r){
    return geo('r'+[w,h,d,r],()=>{
      r=Math.min(w/2-.0001,h/2-.0001,d/2-.0001,r);const pos=[],nor=[],uv=[],idx=[],ext=[w/2,h/2,d/2];
      for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
        const a=(axis+1)%3,b=(axis+2)%3,coords=e=>[-e,-e+r*.10,-e+r*.31,-e+r*.62,-e+r,e-r,e-r*.62,e-r*.31,e-r*.10,e];
        const us=coords(ext[a]),vs=coords(ext[b]),start=pos.length/3;
        for(let j=0;j<10;j++)for(let i=0;i<10;i++){
          let p=[0,0,0]; p[axis]=sign*ext[axis];p[a]=us[i];p[b]=vs[j];const q=p.map((v,k)=>Math.max(-ext[k]+r,Math.min(ext[k]-r,v)));
          const n=new T.Vector3(p[0]-q[0],p[1]-q[1],p[2]-q[2]).normalize();pos.push(q[0]+r*n.x,q[1]+r*n.y,q[2]+r*n.z);nor.push(n.x,n.y,n.z);uv.push(us[i]/(2*ext[a])+.5,vs[j]/(2*ext[b])+.5);
          if(i && j){const k=start+j*10+i;if(sign>0)idx.push(k-11,k-10,k,k-11,k,k-1);else idx.push(k-11,k,k-10,k-11,k-1,k);}
        }
      } const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;
    });
  }
  const rb=(p,x,y,z,w,h,d,r,m)=>mesh(p,roundGeo(w,h,d,r),m,x,y,z);
  function ball(p,x,y,z,a,b,c,m){const o=mesh(p,geo('sphere',()=>new T.SphereGeometry(1,32,24)),m,x,y,z);o.scale.set(a,b,c);return o;}
  function cyl(p,x,y,z,rt,rb,h,m,n=40){return mesh(p,geo('c'+[rt,rb,h,n],()=>new T.CylinderGeometry(rt,rb,h,n)),m,x,y,z);}
  function bar(p,a,b,r,m,rt=r,n=16){const d=b.clone().sub(a),c=cyl(p,0,0,0,rt,r,d.length(),m,n);c.position.copy(a).lerp(b,.5);c.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return c;}
  function pipe(p,pts,r,m,res=28,sides=8){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts),res,r,sides,false),m);}
  function torus(p,x,y,z,r,t,m){return mesh(p,geo('t'+[r,t],()=>new T.TorusGeometry(r,t,10,48)),m,x,y,z);}
  function star(p,x,y,z,size,m,depth=.016){
    const g=geo('star'+[size,depth],()=>{const sh=new T.Shape();for(let i=0;i<10;i++){const a=pi/2+i*pi/5,r=size*(i%2?.50:1);if(i)sh.lineTo(r*Math.cos(a),r*Math.sin(a));else sh.moveTo(0,r);}sh.closePath();return new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSize:size*.055,bevelThickness:size*.04,bevelSegments:2});});
    return mesh(p,g,m,x,y,z);
  }
  function helix(p,x,y,z,r,len,turns,wire,m){
    const pts=[];for(let i=0;i<=turns*15;i++){const a=i/15*2*pi;pts.push(V(Math.cos(a)*r,i/(turns*15)*len,Math.sin(a)*r));}
    const o=pipe(p,pts,wire,m,turns*16,7);o.position.set(x,y,z);return o;
  }
  function glove(parent,type,base){
    const g=group(parent),cover=base||gold;const rim=cover===gold?stitch:cream;
    const cuff=rb(g,0,-.215,-.025,.39,.24,.39,.079,navy);
    rb(g,0,-.218,.012,.405,.107,.39,.048,cream);
    rb(g,0,-.018,-.012,.48,.34,.43,.125,cover);
    const kn=rb(g,0,.12,0,.58,.48,.52,.197,cover);kn.rotation.x=-.14;
    const th=ball(g,-.21,-.017,.153,.128,.19,.13,cover);th.rotation.z=-.46;
    pipe(g,[V(-.237,.055,.13),V(-.208,-.047,.22),V(-.139,-.095,.23)],.009,rim);
    for(let i=0;i<8;i++){const x=-.145+i*.040;bar(g,V(x,-.12,.191),V(x+.019,-.12,.192),.004,rim, .004,5);}
    const patch=ball(g,.035,.12,.246,.109,.11,.015,cover===gold?brass:teal);
    star(g,.035,.12,.262,.075,cream,.005);
    if(type===2){for(const y of [.059,.18]){const b=rb(g,0,y,.001,.588,.064,.526,.03,cream);b.rotation.x=-.14;}}
    g.scale.setScalar(type===0?1.16:type===1?.87:1);return g;
  }
  function robot(parent,isBlue){
    const root=group(parent),body=group(root),armor=isBlue?blue:white,accent=isBlue?sky:brass,lining=isBlue?ink:navy;
    const shoe=isBlue?blue:white;
    for(const side of [-1,1]){
      const foot=group(root,side*.27,0,side*.035); foot.rotation.y=side*.11;
      rb(foot,0,.085,.07,.46,.15,.65,.07,sole);rb(foot,0,.194,.059,.465,.258,.63,.103,shoe);
      rb(foot,0,.295,-.041,.354,.15,.39,.064,lining);
      for(let j=0;j<3;j++)rb(foot,j*.07-.07,.235,.371,.032,.045,.011,.005,accent);
      cyl(foot,0,.477,-.06,.138,.14,.30,dark);for(let j=0;j<3;j++)cyl(foot,0,.392+j*.07,-.06,.152,.15,.042,steel);
      ball(foot,0,.615,-.054,.198,.197,.176,armor);
    }
    rb(body,0,.712,-.03,.69,.28,.425,.115,lining);
    for(let j=0;j<3;j++)rb(body,0,.78+j*.055,0,.51,.046,.40,.02,steel);
    // Cast shell, inset breastplate and a small enamel club badge.
    rb(body,0,1.033,-.035,.97,.56,.59,.205,armor);
    rb(body,0,1.055,.239,.675,.349,.102,.049,isBlue?ink:cream);
    const badge=cyl(body,0,1.071,.301,.100,.100,.025,brass);badge.rotation.x=pi/2;
    star(body,0,1.072,.317,.063,cream,.006);
    for(const sx of [-1,1]){ball(body,sx*.41,1.01,.193,.032,.032,.017,steel);for(let j=0;j<3;j++)rb(body,sx*(.24-j*.004),.988+j*.041,.291,.074,.017,.014,.007,lining);}
    cyl(body,0,1.329,-.022,.209,.21,.16,dark);cyl(body,0,1.348,-.022,.219,.22,.051,brass);
    const head=group(body,0,1.697,-.019);
    rb(head,0,.01,0,1.165,.738,.78,.26,armor);
    rb(head,0,-.034,.295,1.026,.566,.283,.139,isBlue?navy:steel);
    rb(head,0,-.027,.329,.991,.517,.262,.129,glass);
    const eyes=[];for(const side of [-1,1]){
      const e=group(head,side*.207,-.003,.468);ball(e,0,0,0,.042,.079,.014,eye);ball(e,-.009,.041,.013,.013,.014,.005,cream);eyes.push(e);
      const ear=cyl(head,side*.567,-.015,-.028,.192,.192,.111,lining);ear.rotation.z=pi/2;
      const cap=cyl(head,side*.629,-.015,-.028,.143,.143,.028,accent);cap.rotation.z=pi/2;
      const pin=cyl(head,side*.647,-.015,-.028,.068,.068,.018,steel);pin.rotation.z=pi/2;
      rb(head,side*.322,-.09,.441,.086,.019,.016,.007,isBlue?teal:brass);
    }
    pipe(head,[V(-.064,-.084,.466),V(-.028,-.109,.469),V(.017,-.111,.469),V(.061,-.083,.466)],.010,eye,12);
    rb(head,0,.29,.22,.19,.052,.14,.02,accent);
    const antenna=group(head,isBlue?.26:-.25,.341,-.04);
    cyl(antenna,0,.004,0,.075,.093,.06,lining);bar(antenna,V(0,0,0),V(0,.181,0),.023,steel);ball(antenna,0,.207,0,.075,.078,.075,isBlue?sky:amber);
    const arms=[];
    for(const side of [-1,1]){
      const main=side===(isBlue?-1:1),shoulder=V(side*.447,1.133,0);
      ball(body,shoulder.x,shoulder.y,0,.182,.178,.185,lining);
      const hand=V(side*(main?.58:.61),main?1.29:1.1,main?.50:.45);
      const wrist=hand.clone().add(V(0,-.20,0));
      const angle=isBlue?.785:.765;
      const elbow=main?wrist.clone().sub(V(side*.36*Math.cos(angle),0,.36*Math.sin(angle))):V(side*.58,.90,.19);
      bar(body,shoulder,elbow,.131,armor,.15);ball(body,elbow.x,elbow.y,elbow.z,.144,.142,.144,steel);
      const frame=group(body,elbow.x,elbow.y,elbow.z);const v=wrist.clone().sub(elbow);
      frame.quaternion.setFromUnitVectors(V(0,1,0),v.clone().normalize());
      cyl(frame,0,v.length()*.41,0,.074,.089,v.length()*.83,steel);
      const coil=helix(frame,0,0,0,.100,v.length(),5,.019,isBlue?steel:brass);
      cyl(frame,0,v.length(),0,.113,.12,.055,lining);
      const grip=group(body,hand.x,hand.y,hand.z);grip.rotation.set(-.21,side*.13,-side*.19);
      const cover=isBlue?mat(0x74adc9,.51,.09):gold;
      const mitten=glove(grip,-1,cover);arms.push({main,hand,elbow,frame,grip,mitten,coil,cover,rest:v.length()});
    }
    return {root,body,head,eyes,antenna,main:arms.find(a=>a.main),other:arms.find(a=>!a.main)};
  }
  function woodTexture(){
    return texture(1024,(ctx,n)=>{
      ctx.fillStyle='#d5ac76';ctx.fillRect(0,0,n,n);
      for(let row=0;row<20;row++){const y=Math.floor(row*n/20),h=Math.ceil(n/20);let x=-Math.floor(rand()*260);
        while(x<n){const w=160+Math.floor(rand()*280),l=65+rand()*12;ctx.fillStyle='hsl('+ (32+rand()*4)+' 49% '+l+'%)';ctx.fillRect(x,y,w,h);
          ctx.save();ctx.beginPath();ctx.rect(x+1,y+1,w-2,h-2);ctx.clip();
          for(let i=0;i<62;i++){const yy=y+rand()*h,xx=x+rand()*w,span=28+rand()*w*.92;ctx.strokeStyle=rand()>.5?'rgba(109,69,28,.10)':'rgba(255,238,191,.21)';ctx.lineWidth=.45+rand()*.9;ctx.beginPath();ctx.moveTo(xx,yy);ctx.bezierCurveTo(xx+span*.33,yy-1.9,xx+span*.68,yy+1.7,xx+span,yy);ctx.stroke();}
          ctx.restore();ctx.fillStyle='rgba(121,82,48,.30)';ctx.fillRect(x,y,w,.9);ctx.fillRect(x,y,1,h);x+=w;
        }
      }
    },true);
  }
  function floorAndGym(scene){
    const grain=woodTexture();grain.repeat.set(4,3);
    const wood=mat(0xffedcb,.26,.13,{map:grain,envMapIntensity:.7});
    const floor=mesh(scene,new T.PlaneGeometry(32,27),wood,0,-.012,0);floor.rotation.x=-pi/2;
    const wall=mat(0xcbd8d9,.85,.015),panel=mat(0x9fb7ba,.73,.05),timber=mat(0xd7b88e,.58),trim=mat(0xe9e4cf,.54),line=mat(0xffedd0,.48);
    const wx=-7.45,bz=-6.9;
    box(scene,0,3.72,bz,27,7.5,.21,wall);box(scene,wx,3.7,0,.21,7.5,19,wall);
    box(scene,0,.72,bz+.12,25,1.44,.14,panel);box(scene,wx+.12,.72,0,.13,1.44,21,panel);
    box(scene,0,1.48,bz+.19,25,.12,.15,timber);box(scene,wx+.18,1.48,0,.15,.12,21,timber);
    for(let i=-10;i<=10;i++){box(scene,i*1.14,.72,bz+.203,.032,1.36,.012,wall);}
    // Pitched laminated roof beams and tall, divided daylight windows.
    const pane=mat(0xcce5e7,.13,.20,{emissive:0xc4e0e1,emissiveIntensity:.58});
    const paneWarm=mat(0xe4edda,.17,.19,{emissive:0xe4ead7,emissiveIntensity:.64});
    for(let i=-4;i<=4;i++){
      let x=i*3.2+.6;box(scene,x,3.95,bz+.16,.16,7.9,.31,trim);
      for(let j=0;j<2;j++)for(let k=0;k<2;k++){
        const px=x+.84+j*1.49,py=3.44+k*1.41;box(scene,px,py,bz+.156,1.44,1.35,.071,(i+j+k)%3?pane:paneWarm);
      }
      box(scene,x+1.58,2.71,bz+.25,3.01,.14,.32,trim);
      box(scene,x+1.58,4.141,bz+.22,3.05,.056,.16,trim);
      box(scene,x+1.58,5.588,bz+.22,3.05,.13,.24,trim);
      bar(scene,V(x,6.3,bz+.2),V(x,7.17,-.7),.094,timber,.094,4);
    }
    for(let i=-2;i<4;i++){
      const z=i*2.8;box(scene,wx+.16,3.8,z,.30,7.6,.15,trim);
      box(scene,wx+.16,4.21,z+1.39,.065,2.78,2.60,paneWarm);
      box(scene,wx+.23,4.19,z+1.39,.1,.056,2.65,trim);
      box(scene,wx+.24,2.76,z+1.39,.28,.12,2.78,timber);
    }
    const tape=(x,z,w,d)=>box(scene,x,.001,z,w,.009,d,line);
    tape(0,-4.82,21,.059);tape(0,4.82,21,.059);tape(-5.62,0,.067,16);tape(5.62,0,.067,16);
    const cc=torus(scene,0,-.013,0,3.91,.025,line);cc.rotation.x=pi/2;
    // The distant basketball goal is built from glass, tubing, and individual cords.
    const hoop=group(scene,.91,2.48,bz+.65);
    const backglass=mat(0xc2d1cc,.18,.13,{transparent:true,opacity:.69});
    rb(hoop,0,1.01,0,1.91,1.22,.076,.037,backglass);
    for(const y of [.408,1.613])box(hoop,0,y,.058,1.92,.046,.05,trim);
    for(const x of [-.945,.945])box(hoop,x,1.01,.058,.043,1.22,.05,trim);
    for(const x of [-.30,.30])box(hoop,x,.82,.068,.026,.41,.015,cream);
    for(const y of [.62,1.024])box(hoop,0,y,.068,.62,.026,.015,cream);
    bar(hoop,V(0,.53,.09),V(0,.53,.335),.038,brass);
    const rim=torus(hoop,0,.546,.43,.232,.024,mat(0xb96b43,.46));rim.rotation.x=pi/2;
    for(let i=0;i<12;i++){const a=i*2*pi/12;for(const dir of [-1,1]){bar(hoop,V(.226*Math.cos(a),.535,.43+.226*Math.sin(a)),V(.138*Math.cos(a+dir*.72),.184,.43+.138*Math.sin(a+dir*.72)),.0085,cream,.007,6);}}
    for(const x of [-4.2,4.9]){const bench=group(scene,x,0,bz+1.35);
      for(let j=0;j<3;j++){const y=.275+j*.295,z=.35-j*.52;rb(bench,0,y,z,3.65,.109,.47,.029,timber);for(let sx of [-1.47,1.47])box(bench,sx,y*.5,z,.11,y,.22,panel);}
    }
    const banner=(x,z,c)=>{const p=group(scene,x,2.06,z);box(p,0,0,0,.63,.97,.042,c);bar(p,V(-.39,.52,0),V(.39,.52,0),.032,brass);star(p,0,.09,.025,.147,cream);box(p,0,-.227,.025,.37,.028,.021,cream);};
    banner(-3.3,bz+.32,teal);banner(-2.46,bz+.32,ink);
    return {floor,wood};
  }
  function ring(scene){
    const base=group(scene),w=6.26,d=4.11,X=w/2,Z=d/2;
    const apron=mat(0x456f91,.68,.04),pad=mat(0x659abc,.57,.04),foam=mat(0x6f94a7,.86),yarn=mat(0xcfdecd,.73);
    // Individual shock mats, with pressed edges, make a complete soft perimeter.
    for(let i=0;i<4;i++)for(const sz of [-1,1]){const x=(i-1.5)*1.73,z=sz*(Z+.38);rb(base,x,.052,z,1.717,.103,.94,.046,foam);for(const dz of [-.404,.404])box(base,x,.105,z+dz,1.60,.003,.012,teal);}
    for(const sx of [-1,1])for(let i=0;i<3;i++)rb(base,sx*(X+.25),.05,(i-1)*1.25,.77,.10,1.24,.043,foam);
    rb(base,0,.258,0,w+.14,.45,d+.14,.11,navy);rb(base,0,.35,0,w+.07,.37,d+.07,.092,apron);
    rb(base,0,.546,0,w+.14,.185,d+.14,.079,canvas);
    const coverTrim=mat(0xc8d9d7,.59);
    for(const sz of [-1,1]){
      bar(base,V(-X,.564,sz*(Z+.066)),V(X,.564,sz*(Z+.066)),.021,coverTrim);
      for(let k=-28;k<29;k++)box(base,k*.104,.443,sz*(Z+.036),.056,.008,.012,yarn);
    }
    for(const sx of [-1,1]){bar(base,V(sx*(X+.066),.564,-Z),V(sx*(X+.066),.564,Z),.021,coverTrim);}
    for(const sz of [-1,1])box(base,0,.640,sz*(Z-.29),w-.62,.005,.031,cream);
    for(const sx of [-1,1])box(base,sx*(X-.30),.640,0,.031,.005,d-.58,cream);
    for(const r of [.705,.84]){let mark=torus(base,0,.641,0,r,r===.84?.015:.009,sky);mark.rotation.x=pi/2;mark.scale.z=.25;}
    star(base,0,.644,0,.48,sky,.002).rotation.x=-pi/2;
    const corners=[];
    for(const sx of [-1,1])for(const sz of [-1,1]){
      let x=sx*(X-.087),z=sz*(Z-.087);corners.push(V(x,0,z));const cm=sx===sz?pad:cream;
      cyl(base,x,.978,z,.122,.138,.77,steel);cyl(base,x,.669,z,.215,.23,.065,brass);
      rb(base,x,1.173,z,.33,1.04,.33,.137,cm);
      rb(base,x,1.659,z,.346,.18,.346,.08,cm);
      for(let y of [.788,1.51])rb(base,x,y,z,.34,.044,.34,.021,cm===cream?sky:ink);
      star(base,x,1.309,z+.168,.068,cm===cream?brass:cream,.006);
    }
    const cables=[mat(0x447a9e,.67),mat(0xb4d1d8,.66),mat(0xf1e9c9,.66)];
    for(const [a,b] of [[0,1],[0,2],[2,3],[1,3]]){
      const A=corners[a],B=corners[b];
      for(let l=0;l<3;l++){
        const y=.867+l*.275,mid=A.clone().lerp(B,.5);const sag=a===1 && b===3?.069:.038;
        const pts=[A.clone().setY(y),A.clone().lerp(B,.13).setY(y-.017),mid.setY(y-sag),A.clone().lerp(B,.87).setY(y-.017),B.clone().setY(y)];
        pipe(base,pts,.028+l*.004,cables[l],32,10);
        for(const [start,end] of [[A,B],[B,A]]){
          const dir=end.clone().sub(start).normalize(),sa=start.clone().addScaledVector(dir,.15).setY(y),sb=sa.clone().addScaledVector(dir,.29).setY(y-.005);
          bar(base,sa,sb,.057,l===2?cream:pad,.043);
        }
      }
    }
    const lamps=[];
    for(let i=0;i<24;i++){
      let x,z,ang;
      if(i<8){x=(i-3.5)*.707;z=Z+.055;ang=0;}else if(i<12){x=X+.055;z=Z-(i-7.5)*.99;ang=pi/2;}else if(i<20){x=(15.5-i)*.707;z=-Z-.055;ang=pi;}else{x=-X-.055;z=(i-21.5)*.99;ang=-pi/2;}
      const lamp=group(base,x,.313,z);lamp.rotation.y=ang;
      const bezel=cyl(lamp,0,0,0,.093,.091,.045,brass);bezel.rotation.x=pi/2;
      const bulb=mat(0xe4d4a3,.26,.27,{emissive:0xffc46c,emissiveIntensity:.06});ball(lamp,0,0,.026,.070,.070,.030,bulb);lamps.push(bulb);
    }
    const emblem=group(base,0,.328,Z+.081);
    rb(emblem,0,0,0,.49,.32,.051,.024,ink);star(emblem,0,.003,.028,.132,cream,.009);
    for(const sign of [-1,1])for(let j=0;j<2;j++){const wing=rb(emblem,sign*(.195+j*.018),.043-j*.061,.033,.09-j*.025,.022,.017,.008,brass);wing.rotation.z=sign*.12;}
    return {base,lamps};
  }
  function prizeBox(scene){
    const root=group(scene,2.25,.103,2.57);root.rotation.y=-.25;
    const c=mat(0x7098aa,.52,.18),velvet=mat(0x334f67,.87,.025);
    rb(root,0,.203,0,.92,.4,.66,.085,c);rb(root,0,.393,0,.932,.052,.666,.022,brass);
    rb(root,0,.422,0,.823,.031,.572,.015,velvet);
    for(const x of [-.32,.32]){
      rb(root,x,.213,.327,.097,.326,.034,.017,cream);rb(root,x,.154,-.32,.092,.28,.03,.013,cream);
      for(const y of [.078,.318])ball(root,x,y,.348,.018,.018,.009,brass);
    }
    const lid=group(root,0,.415,-.315);rb(lid,0,.083,.314,.949,.182,.687,.082,cream);
    for(const x of [-.32,.32])rb(lid,x,.103,.318,.102,.165,.687,.076,brass);
    rb(lid,0,.004,.654,.196,.163,.036,.017,brass);star(lid,0,.013,.678,.064,cream,.005);
    const prize=group(root,0,.48,0);return {root,lid,prize};
  }
  function sideline(scene){
    const bottle=group(scene,-1.86,.002,2.78);
    const enamel=mat(0x7ea8b4,.25,.38);
    cyl(bottle,0,.182,0,.077,.087,.32,enamel);cyl(bottle,0,.355,0,.052,.075,.035,steel);
    cyl(bottle,0,.393,0,.058,.059,.052,navy);
    const loop=torus(bottle,.022,.439,0,.036,.009,brass);
    loop.rotation.y=.27;rb(bottle,.189,.036,.037,.26,.064,.22,.028,cream);
    for(const x of [.113,.133])box(bottle,x,.069,.037,.008,.005,.20,sky);
    // Small menisci on the varnish share the light reflected by the water bottle.
    const wet=mat(0xd7cdaf,.075,.45,{transparent:true,opacity:.69});
    const drops=[];for(let i=0;i<4;i++){
      const d=ball(scene,-1.71+i*.071,-.005,2.97+(.028*(i%2)),.067-i*.009,.014-i*.002,.046-i*.006,wet);
      drops.push(d);
    }
    batch(bottle);return drops;
  }
  function contact(parent,x,y,z,w,d,density){
    const map=geo('ao',()=>texture(64,(ctx,n)=>{const gradient=ctx.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
      gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.36,'rgba(255,255,255,.80)');gradient.addColorStop(.76,'rgba(255,255,255,.16)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,n,n);
    }));
    const shadow=mat(0x405763,.96,0,{map,transparent:true,opacity:density,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const plane=mesh(parent,new T.PlaneGeometry(w,d),shadow,x,y,z);plane.rotation.x=-pi/2;plane.castShadow=false;return plane;
  }
  function gesture(scene){
    const g=group(scene);const pearl=mat(0xfff7d9,.45,.06);
    ball(g,0,0,0,.104,.113,.064,pearl);
    const finger=rb(g,-.067,.123,0,.066,.192,.07,.032,pearl);finger.rotation.z=.11;
    for(let i=0;i<3;i++)rb(g,-.003+i*.044,.074-i*.018,.002,.059,.097,.068,.028,pearl);
    const thumb=rb(g,-.114,.012,0,.061,.105,.077,.029,pearl);thumb.rotation.z=.64;
    rb(g,.007,-.105,0,.147,.064,.093,.031,sky);g.scale.setScalar(1.35);return g;
  }
  function fixture(scene,x,y,z,scale=1){
    const g=group(scene,x,y,z);g.scale.setScalar(scale);
    bar(g,V(0,.22,0),V(0,2.98,0),.013,navy);
    cyl(g,0,.16,0,.082,.088,.17,navy);cyl(g,0,.022,0,.095,.309,.194,teal);
    const lip=torus(g,0,-.078,0,.292,.021,cream);lip.rotation.x=pi/2;
    const bulb=mat(0xffefce,.22,.02,{emissive:0xffdfad,emissiveIntensity:1.1});ball(g,0,-.078,0,.278,.040,.278,bulb);return {g,bulb};
  }
  // Static groups use one draw per material. Moving joints stay separate.
  function batch(root, movable=[]){
    root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),bins=new Map();
    function collect(o){if(movable.includes(o))return;if(o.isMesh && !Array.isArray(o.material)){const m=o.material;if(!bins.has(m))bins.set(m,[]);bins.get(m).push(o);}for(const child of o.children)collect(child);}
    collect(root);
    for(const [m,items] of bins){if(items.length<2)continue;let total=0,indices=0;for(const o of items){total+=o.geometry.attributes.position.count;indices+=o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count;}
      const pos=new Float32Array(total*3),norm=new Float32Array(total*3),uv=new Float32Array(total*2),idx=total>65535?new Uint32Array(indices):new Uint16Array(indices);let start=0,at=0;
      for(const o of items){const geo=o.geometry.clone();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));const a=geo.attributes;pos.set(a.position.array,start*3);norm.set(a.normal.array,start*3);if(a.uv)uv.set(a.uv.array,start*2);const count=geo.index?geo.index.count:a.position.count;for(let i=0;i<count;i++)idx[at++]=start+(geo.index?geo.index.array[i]:i);start+=a.position.count;o.removeFromParent();geo.dispose();}
      const merged=new T.BufferGeometry();merged.setAttribute('position',new T.BufferAttribute(pos,3));merged.setAttribute('normal',new T.BufferAttribute(norm,3));merged.setAttribute('uv',new T.BufferAttribute(uv,2));merged.setIndex(new T.BufferAttribute(idx,1));mesh(root,merged,m);
    }
  }
  return {helix,sideline,contact,group,mesh,mat,box,rb,ball,bar,torus,star,pipe,fixture,glove,robot,ring,floorAndGym,prizeBox,gesture,batch,V,gold,cream,sky,brass,navy,eye,rand};
})();
