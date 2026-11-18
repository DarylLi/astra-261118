'use strict';
function makeWorkshop(scene) {
  const {T,PI,TAU,random,surface,mat,group,mesh,box,cyl,sphere,torus,ring,rod,tube,shape,M,bolt,batch}=Craft;
  const world=group(scene), furniture=group(world), back=group(world);
  const oakTexture=surface(1024,192,(c,w,h)=>{
    const im=c.createImageData(w,h), rows=Array.from({length:h+1},()=>random()), phase=random()*TAU;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const knot=Math.exp(-((x-724)**2/8400+(y-119)**2/490));
      const f=y+3.4*Math.sin(x*.008+y*.02)+19*knot;
      const a=Math.floor(f+h*2)%h, k=f-Math.floor(f);
      const grain=(rows[a]*(1-k)+rows[a+1]*k-.5)*16+Math.sin(f*2.85)*3.8+Math.sin(f*.084+phase)*3.5+(random()-.5)*8;
      const i=(y*w+x)*4;im.data.set([141+grain,100+grain*.9,69+grain*.76,255],i);
    }
    c.putImageData(im,0,0);
    for(let i=0;i<820;i++){
      const x=random()*w,y=random()*h;
      c.strokeStyle=i%3?'rgba(52,44,35,.14)':'rgba(242,213,161,.37)';c.lineWidth=.4+random()*.8;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+4+random()**2*68,y+random()*3-1.5);c.stroke();
    }
  });
  const wood=mat(0xf8ebd5,.04,.55,{map:oakTexture,bumpMap:oakTexture,bumpScale:.014});
  const cabinet=mat(0x43564e,.55,.55), lip=mat(0x6a7568,.52,.48);
  // The end of the planks is directly below the ring lip. The pad overhangs the lower shelf.
  for(let i=0;i<9;i++) {
    const p=box(furniture,14,.36,.887,wood,-3.78,-.20,-4.23+i*.894,.045);
    p.rotation.y=(i%3-1)*.0008;
  }
  box(furniture,13.95,.23,7.95,mat(0x513e31,.06,.69),-3.78,-.425,-.65,.04);
  box(furniture,13.75,2.95,7.67,cabinet,-3.82,-1.96,-.72,.09);
  const front=3.19, drawerX=.1;
  box(furniture,4.35,1.18,.095,M.dark,drawerX,-1.15,front,.06);
  for(const x of [-6.2,-3.32]) {
    box(furniture,2.69,1.1,.13,lip,x,-1.13,front,.04);
    rod(furniture,[x-.42,-1.12,front+.13],[x+.42,-1.12,front+.13],.065,M.iron);
  }
  for(const x of [-6, -2.9,.15]) {
    box(furniture,2.86,1.32,.13,cabinet,x,-2.58,front,.06);
    box(furniture,1.0,.17,.16,M.iron,x,-2.22,front+.12,.06);
  }
  const drawer=group(world,drawerX,-1.28,front);
  const liner=mat(0x3a4140,.05,.91);
  box(drawer,4.20,.16,2.25,wood,0,-.24,-1.03,.04);
  box(drawer,3.94,.12,2.04,liner,0,-.12,-1.03,.08);
  for(const x of [-2.04,2.04])box(drawer,.12,.56,2.21,wood,x,.02,-1.05,.025);
  box(drawer,4.23,1.02,.15,lip,0,.15,.05,.065);
  box(drawer,4.04,.83,.075,cabinet,0,.15,.158,.035);
  const handle=group(drawer,0,.14,.225);
  for(const x of [-.67,.67]){
    box(handle,.23,.34,.07,M.brass,x,0,0,.055);
    bolt(handle,x,.1,.05,.038);bolt(handle,x,-.1,.05,.038);
  }
  tube(handle,[[-.67,0,.02],[-.64,0,.18],[-.45,0,.24],[.45,0,.24],[.64,0,.18],[.67,0,.02]],.072,M.brass);
  for(const x of [-1.88,1.88]) for(const y of [-.17,.47])bolt(drawer,x,y,.2,.045,M.iron);
  batch(drawer);

  const discTexture=surface(768,768,(c,w,h)=>{
    const im=c.createImageData(w,h),striae=Array.from({length:550},()=>random());
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const x=i-w*.5,y=j-h*.5,r=Math.hypot(x,y),a=Math.atan2(y,x);
      const grind=(striae[Math.floor(r)]-.5)*7+2.5*Math.sin(r*2.25);
      const patch=5*Math.sin(x*.011+y*.008)+3*Math.sin(x*.038-y*.023)+2*Math.sin(r*.14+7*a)+2*Math.cos(y*.046);
      const v=grind+patch+(random()-.5)*11;
      im.data.set([145+v,147+v,141+v,255],(j*w+i)*4);
    }
    c.putImageData(im,0,0);
    for(let i=0;i<740;i++){
      const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);
      c.lineTo(x+random()**2*45,y+random()**2*16-4);
      c.strokeStyle=i%4?'rgba(238,235,213,.17)':'rgba(38,42,39,.22)';c.lineWidth=random()*.8+.25;c.stroke();
    }
  });
  const steelPlate=mat(0xd6d9d6,.68,.45,{map:discTexture,bumpMap:discTexture,bumpScale:.006});
  const lathed=mat(0x7e817b,.85,.34);
  cyl(furniture,3.52,3.47,.17,M.iron,0,.06,0,144);
  cyl(furniture,3.55,3.57,.21,lathed,0,.205,0,144);
  cyl(furniture,3.51,3.55,.044,steelPlate,0,.33,0,144);
  ring(furniture,3.545,.022,M.bright,0,.295,0);
  ring(furniture,3.55,.013,M.dark,0,.165,0);
  ring(furniture,3.45,.017,M.brass,0,.348,0);
  ring(furniture,3.235,.011,M.iron,0,.352,0);
  ring(furniture,3.195,.010,M.cream,0,.352,0);
  const rimInk=mat(0xc4b693,.37,.6);
  for(let i=0;i<72;i++){
    const a=i*TAU/72;
    const tick=box(furniture,i%6===0?.041:.022,.006,i%6===0?.091:.043,rimInk,Math.sin(a)*3.338,.354,Math.cos(a)*3.338);
    tick.rotation.y=a;
  }
  for(let i=0;i<12;i++){
    const a=(i+.5)*TAU/12;
    bolt(furniture,Math.sin(a)*3.395,.353,Math.cos(a)*3.395,.052,M.steel,'y');
  }
  for(const x of [-.52,.52])box(furniture,.055,.006,.95,rimInk,x,.354,.0,.002);
  // A die-cast riveted badge on the plate edge, with a stamped interlocking-ring device.
  const badge=group(furniture,.42,.189,3.538);badge.rotation.y=.12;
  box(badge,1.33,.184,.028,M.iron,0,0,0,.013);
  for(const x of [-.52,.52])bolt(badge,x,0,.021,.026,M.brass);
  for(const x of [-.085,.085]){const a=torus(badge,.062,.011,M.brass,x,0,.022);a.scale.y=.8;}

  // A folded, tufted canvas pad on a lower bench extension.
  box(furniture,4.73,.22,6.3,wood,4.58,-2.88,1.26,.08);
  for(const z of [-1.3,2.15]){
    rod(furniture,[2.6,-4.7,z],[5.75,-2.96,z],.11,cabinet);
    box(furniture,3.6,.15,.18,M.iron,4.2,-3,z);
  }
  const canvasTex=surface(256,256,(c,w,h)=>{
    c.fillStyle='#d9bd8e';c.fillRect(0,0,w,h);
    for(let i=0;i<w;i++){
      c.fillStyle=i%2?'rgba(80,63,39,.15)':'rgba(255,243,210,.20)';c.fillRect(i,0,.72,h);
      c.fillStyle=i%2?'rgba(88,70,42,.13)':'rgba(255,244,213,.20)';c.fillRect(0,i,w,.7);
    }
    for(const x of [23,28,34,148,153,159]){c.fillStyle='rgba(102,98,80,.52)';c.fillRect(x,0,x%2?2:4,h);}
  });
  const cloth=mat(0xe0cba8,0,.97,{map:canvasTex,bumpMap:canvasTex,bumpScale:.017});
  const welt=mat(0xab9470,.02,.88);
  const cushion=group(world,4.59,-2.74,1.38);cushion.rotation.y=-.07;cushion.scale.z=1.23;
  box(cushion,3.45,.44,4.25,cloth,0,.22,0,.21);
  // Sewn top panel. The gathered corners and button depressions are modelled in the cloth.
  const padGeometry=new T.PlaneGeometry(2,2,36,42);
  padGeometry.rotateX(-PI/2);
  const pv=padGeometry.attributes.position, baseHeights=[];
  for(let i=0;i<pv.count;i++){
    const u=pv.getX(i),v=pv.getZ(i),edge=Math.max(Math.abs(u),Math.abs(v));
    const x=u*1.76*(1-.085*Math.abs(v)**8)-.09,z=v*2.15*(1-.075*Math.abs(u)**8)+.04;
    let y=.648+.358*Math.sqrt(Math.max(0,1-edge**7));
    for(const tx of [-.83,.83])for(const tz of [-1.1,1.1])
      y-=.075*Math.exp(-((x-tx)**2+(z-tz)**2)*19);
    y+=.014*edge**4*Math.sin(18*x+z*3)*Math.sin(11*z-x);
    pv.setXYZ(i,x,y,z);baseHeights.push(y);
  }
  padGeometry.computeVertexNormals();
  box(cushion,3.48,.40,4.26,cloth,-.09,.48,.04,.19);
  // Subdivide the seam along all four radiused corners.
  for(const yy of [.29,.68]){
    const pts=[];
    for(const [cx,cz,ang] of [[1.42,1.81,0],[-1.42,1.81,PI/2],[-1.42,-1.81,PI],[1.42,-1.81,PI*1.5]])
      for(let j=0;j<=7;j++){const a=ang+j/7*PI/2;pts.push([cx+.28*Math.cos(a)-.07,yy,cz+.28*Math.sin(a)]);}
    pts.push(pts[0]);tube(cushion,pts,.026,welt,78);
  }
  for(const x of [-.83,.83])for(const z of [-1.1,1.1])sphere(cushion,.075,.025,.075,welt,x,.936,z);
  batch(cushion);
  const padTop=mesh(cushion,padGeometry,cloth);
  pv.setUsage(T.DynamicDrawUsage);
  const padPoint=new T.Vector3();
  let lastCompression=0;
  function pressPad(x,z,compression){
    if(Math.abs(compression)<.00005)compression=0;
    if(Math.abs(compression-lastCompression)<.000015)return;
    lastCompression=compression;
    padPoint.set(x,0,z);padTop.worldToLocal(padPoint);
    for(let i=0;i<pv.count;i++){
      const dx=pv.getX(i)-padPoint.x,dz=pv.getZ(i)-padPoint.z;
      pv.setY(i,baseHeights[i]-compression*Math.exp(-1.58*dx*dx-1.94*dz*dz));
    }
    pv.needsUpdate=true;padGeometry.computeVertexNormals();
  }

  // The two tools are parked on the far left end of the work surface.
  const gloveMat=mat(0xb59160,.02,.88), stitch=mat(0xd9bd86,.03,.75);
  function glove(x,z,angle){
    const g=group(furniture,x,.025,z);g.rotation.y=angle;
    sphere(g,.37,.14,.49,gloveMat,0,.12,0);
    for(let i=0;i<4;i++){
      const len=[.35,.42,.397,.315][i];
      const f=sphere(g,.102,.099,len,gloveMat,(i-1.5)*.158,.09,.38+len*.39);f.rotation.y=(i-1.5)*.09;
      tube(g,[[(i-1.5)*.158,.171,.220],[(i-1.5)*.164,.179,.43],[(i-1.5)*.179,.153,len+.39]],.009,stitch);
    }
    const th=sphere(g,.14,.13,.29,gloveMat,-.345,.1,.11);th.rotation.y=-.62;
    box(g,.68,.22,.36,mat(0x817963,.03,.84),0,.10,-.42,.075);
    box(g,.64,.016,.031,stitch,0,.215,-.48,.007);
  }
  glove(-3.69,1.26,-.83);glove(-3.88,1.68,-.48);
  const wrench=group(furniture,-2.81,.075,2.83);wrench.rotation.y=-1.04;
  const jaw=new T.Shape();jaw.moveTo(-.11,-.84);jaw.quadraticCurveTo(-.14,-.96,0,-.99);jaw.quadraticCurveTo(.13,-.96,.105,-.83);
  jaw.lineTo(.080,.45);jaw.quadraticCurveTo(.36,.58,.273,.9);jaw.lineTo(.12,.71);jaw.lineTo(-.075,.74);
  jaw.lineTo(-.141,.92);jaw.lineTo(-.049,1.045);jaw.quadraticCurveTo(-.41,.98,-.32,.68);jaw.lineTo(-.083,.45);jaw.closePath();
  const hole=new T.Path();hole.absarc(0,-.835,.052,0,TAU,true);jaw.holes.push(hole);
  const sp=shape(wrench,jaw,.054,M.steel,.017);sp.rotation.x=-PI/2;
  box(wrench,.053,.009,.96,M.iron,0,.073,0,.004);

  // Frosted workshop sash, masonry, transoms and a distant industrial roofline.
  const plasterTex=surface(256,256,(c,w,h)=>{
    const im=c.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const v=216+5*Math.sin(x*.042+y*.016)+4*Math.cos(y*.029)+random()*9;
      im.data.set([v+3,v+2,v-3,255],(y*w+x)*4);
    }c.putImageData(im,0,0);
  });
  const plaster=mat(0xb7aa91,.0,.95,{map:plasterTex}),paintWall=mat(0x77817a,.06,.82,{map:plasterTex});
  const frame=mat(0x575d52,.55,.57);
  const farZ=-6.6;
  box(back,36,3.13,.43,paintWall,0,-.45,farZ);
  box(back,36,.16,.53,mat(0x9c9681,.20,.73),0,1.11,farZ);
  box(back,20,14,.45,plaster,8.38,7.8,farZ);
  box(back,5,14,.46,plaster,-16.1,7.8,farZ);
  box(back,14,4,.5,plaster,-7.73,10.85,farZ);
  box(back,35,.26,25,mat(0x68675a,.0,.92),0,-5.1,-2);
  box(back,1,17,25,paintWall,-16.1,2,-1);
  box(back,1,17,25,plaster,16.4,2,-1);
  const skyTex=surface(128,256,(c,w,h)=>{
    const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#bec8c4');grad.addColorStop(.52,'#ead5ad');grad.addColorStop(1,'#f5c087');
    c.fillStyle=grad;c.fillRect(0,0,w,h);
  });
  const sky=mat(0xf5debb,0,1,{map:skyTex,emissive:0xffdcab,emissiveMap:skyTex,emissiveIntensity:1.22});
  box(back,20,14,.12,sky,-8,5,-10.3);
  const skyline=mat(0x908575,.04,.85,{emissive:0x907352,emissiveIntensity:.35});
  for(let i=0;i<10;i++){
    const ht=.9+random()*1.9, x=-15+i*1.7;
    box(back,1.8,ht,1.0,skyline,x,1.2+ht/2,-9.55);
    if(i%3===1){cyl(back,.18,.26,2.1,skyline,x+.2,ht+1.97,-9.6);cyl(back,.24,.24,.11,skyline,x+.2,ht+3.04,-9.6);}
  }
  const glass=mat(0xd9c6a0,.22,.19,{transparent:true,opacity:.17,depthWrite:false});
  const pane=box(back,12.08,7.70,.034,glass,-7.70,4.98,-6.79);pane.castShadow=false;
  for(const x of [-13.7,-11.71,-9.72,-7.73,-5.74,-3.75,-1.76]){
    box(back,.124,7.89,.25,frame,x,5.02,farZ+.06,.018);
    box(back,.028,7.85,.025,M.bronze,x+.06,5.02,farZ+.205);
  }
  for(const y of [1.19,3.39,5.68,8.88])box(back,12.14,.141,.26,frame,-7.73,y,farZ+.06,.014);
  box(back,12.7,.19,.75,wood,-7.74,1.12,farZ+.13,.03);
  // A few glazed cylinders and old oil tins catch the last light on the ledge.
  for(const [x,h,r] of [[-5.42,.64,.23],[-5.98,.87,.27],[-9.4,.54,.22]]) {
    cyl(back,r,r,h,mat(0x646c58,.55,.40),x,1.24+h/2,-6.29);
    cyl(back,r*.44,r*.83,.14,M.iron,x,1.30+h,-6.29);
    cyl(back,r*.48,r*.48,.09,M.brass,x,1.40+h,-6.29);
  }

  // Wall storage with cast brackets and blank label holders.
  const shelfWood=mat(0x8e7860,.10,.68,{map:oakTexture});
  for(const y of [1.56,3.62,5.77]){
    box(back,8.7,.19,1.11,shelfWood,3.75,y,-5.98,.035);
    box(back,8.73,.12,.07,M.iron,3.75,y-.075,-5.421);
    for(const x of [.02,3.6,7.35]){
      box(back,.11,.87,.12,frame,x,y-.52,-6.29);
      rod(back,[x,y-.85,-6.24],[x,y-.11,-5.54],.038,frame);
    }
  }
  const binMat=[mat(0x777c6a,.35,.60),mat(0x9d8462,.3,.58),mat(0x6b7773,.41,.51)];
  for(let i=0;i<5;i++){
    const x=-.02+i*1.45,h=.76+random()*.16;
    box(back,1.34,h,.77,binMat[i%3],x,1.69+h/2,-5.98,.035);
    box(back,1.38,.083,.8,M.iron,x,1.71+h,-5.98,.024);
    box(back,.48,.22,.03,M.brass,x,1.74+h*.48,-5.574,.025);
    box(back,.388,.143,.029,mat(0xc4b6a0,.08,.70),x,1.74+h*.48,-5.55,.012);
  }
  for(const [x,r,h] of [[.2,.24,.71],[.83,.27,.89],[4.7,.36,1.0],[5.5,.27,.70],[6.17,.3,.84]]){
    cyl(back,r,r,h,binMat[x>2?1:2],x,3.74+h/2,-5.92);
    cyl(back,r+.016,r+.016,.055,M.iron,x,3.74+h,-5.92);
    cyl(back,r+.01,r+.01,.04,M.steel,x,3.77,-5.92);
  }
  const spool=group(back,2.68,4.28,-5.88);spool.rotation.x=PI/2;
  cyl(spool,.50,.50,.51,M.bronze);
  for(const y of [-.30,.30])cyl(spool,.62,.62,.08,binMat[0],0,y,0);
  for(let i=0;i<9;i++)ring(spool,.50,.024,M.bronze,0,-.24+i*.059,0);
  cyl(spool,.14,.14,.69,M.dark);
  for(let i=0;i<3;i++){
    const x=1.02+i*1.8;box(back,1.68,.78,.84,binMat[(i+2)%3],x,6.29,-5.97,.06);
    box(back,1.7,.1,.87,M.iron,x,6.72,-5.97,.03);
  }
  for(const x of [8.47,8.76]){
    tube(back,[[x,-2.3,-6.22],[x,4.9,-6.22],[x,6.8,-6.22],[x-.4,7.1,-6.22],[x-5,7.1,-6.22]],.064,M.iron);
  }
  // An articulated enamel task lamp silhouettes the left side of the window.
  const lamp=group(back,-5.7,-.02,-2.86), lampGreen=mat(0x415c54,.57,.39);
  cyl(lamp,.62,.73,.17,lampGreen);cyl(lamp,.27,.42,.17,M.iron,0,.14,0);
  for(const z of [-.11,.11]){
    rod(lamp,[0,.20,z],[-.57,1.95,z],.077,lampGreen);
    rod(lamp,[-.57,1.95,z],[.42,3.11,z],.067,lampGreen);
  }
  for(const [x,y] of [[0,.24],[-.57,1.95],[.42,3.11]]){
    const a=cyl(lamp,.151,.151,.39,M.iron,x,y,0);a.rotation.x=PI/2;bolt(lamp,x,y,.218,.071,M.brass);
  }
  const shade=group(lamp,.6,2.99,.03);shade.rotation.z=.48;
  const profile=[[.05,.45],[.15,.43],[.18,.28],[.27,.20],[.39,.09],[.57,-.18],[.58,-.22],[.55,-.24],[.51,-.195],[.35,.055],[.18,.205],[.05,.24]];
  mesh(shade,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),64),lampGreen);
  cyl(shade,.53,.55,.025,mat(0xe4d9ba,.16,.34),0,-.205,0);
  ring(shade,.565,.027,M.bright,0,-.212);
  sphere(shade,.13,.093,.13,mat(0xf1d6a8,.08,.31),0,-.212,0);
  tube(lamp,[[.4,3.1,-.14],[-.56,1.94,-.17],[-.28,.94,-.21],[-.03,.12,-.28],[-.78,.05,-.42],[-1.4,-.02,-.1]],.026,M.black);

  // A small oil-catching cup under a slow drip on the rear corner.
  const cup=group(world,2.25,.045,-2.90);
  cyl(cup,.318,.255,.158,M.iron,0,.067,0);
  ring(cup,.306,.021,M.steel,0,.151);
  const waterMat=mat(0x697c71,.72,.12);
  const water=cyl(cup,.28,.28,.008,waterMat,0,.141,0);
  const ripple=ring(cup,.14,.007,M.steel,0,.15);
  const drop=sphere(cup,.029,.047,.029,waterMat,0,.72,0);
  const shadowTex=surface(96,96,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,3,w/2,h/2,w/2);g.addColorStop(0,'rgba(29,24,17,0.62)');g.addColorStop(.45,'rgba(31,28,21,0.37)');g.addColorStop(1,'rgba(37,32,26,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
  });
  function shadow(p,w,d,x,y,z,opacity=.65) {
    const m=mat(0x5c5042,0,1,{map:shadowTex,transparent:true,opacity,depthWrite:false});
    const o=mesh(p,new T.PlaneGeometry(w,d),m,x,y,z);o.rotation.x=-PI/2;o.castShadow=false;return o;
  }
  shadow(furniture,7.65,7.55,0,-.012,0,.75);
  batch(furniture);batch(back);
  return {world,drawer,cushion,pressPad,water,ripple,drop,shadow,front};
}
