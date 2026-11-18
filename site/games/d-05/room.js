'use strict';
const Bathroom=(()=>{
  const {T,V,m,mat,group,mesh,box,ell,cyl,rod,tube,ring,profile,batch,rand}=Studio;
  const fixed=group(),K=7.4,CX=-.15,CZ=.02,Y=.51,H=BathPhysics.H,R=Y+K*H,TAU=Math.PI*2;
  const at=(g,x,y,z)=>{g.position.set(x,y,z);return g;};
  const fb=(w,h,d,x,y,z,ma,r=0)=>box(w,h,d,x,y,z,ma,r,fixed);
  // Rounded, layered edge of the architectural model. Individual tiles have real bevels and joints.
  fb(7.02,.24,5.14,0,-.395,0,m.oak,.115);
  fb(7.07,.055,5.19,0,-.29,0,m.honey,.025);
  fb(7.12,.22,5.24,0,-.163,0,m.cream,.095);
  fb(7.04,.08,5.17,0,-.042,0,m.grout,.035);
  const tiles=[0xf1ebd6,0xe9e5d0,0xe1e1ce,0xeee9d8,0xe5e5d5].map(c=>mat(c,.46));
  for(let i=0;i<10;i++)for(let j=0;j<8;j++){
    fb(.691,.072,.632,(i-4.5)*.701,.001,(j-3.5)*.643,tiles[Math.floor(rand()*tiles.length)],.019);
  }
  const back=-2.42,left=-3.4,unit=.536;
  const wTile=[0xf3f2df,0xe6eddf,0xeaf0e4,0xe1e8df,0xf7f3e4].map(c=>mat(c,.23));
  const blueTile=[0xaaccc1,0xabc9bf,0xb6d5c7,0xb3cfc4].map(c=>mat(c,.28));
  const pick=a=>a[Math.floor(rand()*a.length)];
  const winX=-.96,winR=1.05,sill=1.44,archY=2.62,top=3.92;
  // Back wall is built around a through-opening, with a curved spandrel above the arch.
  const l=winX-winR,r=winX+winR;
  const panels=[[-3.48,l,0,top],[r,2.16,0,top],[2.16,3.48,0,2.22],[l,r,0,sill]];
  function tiledBack(x0,x1,y0,y1){
    fb(x1-x0,y1-y0,.19,(x0+x1)/2,(y0+y1)/2,back,m.grout,.012);
    for(let j=Math.floor(y0/unit);j<Math.ceil(y1/unit);j++)for(let i=-8;i<8;i++){
      const a=Math.max(x0,i*unit),b=Math.min(x1,(i+1)*unit),c=Math.max(y0,j*unit),d=Math.min(y1,(j+1)*unit);
      if(b-a<.018||d-c<.018)continue;
      fb(b-a-.014,d-c-.015,.068,(a+b)/2,(d+c)/2,back+.103,pick(j<2?blueTile:wTile),.021);
    }
  }
  panels.forEach(p=>tiledBack(...p));
  const sp=new T.Shape();sp.moveTo(l,archY);sp.absarc(winX,archY,winR,Math.PI,0,true);
  sp.lineTo(r,top);sp.lineTo(l,top);sp.closePath();
  const spandrel=mesh(new T.ExtrudeGeometry(sp,{depth:.18,bevelEnabled:false,curveSegments:48}),wTile[0],fixed);spandrel.position.z=back-.06;
  const frame=mat(0xf7ebd4,.36),greenFrame=mat(0x80aaa1,.34);
  function archPath(rad,low,offset){const p=[[winX-rad,low,offset],[winX-rad,archY,offset]];
    for(let i=1;i<=48;i++){const a=Math.PI-Math.PI*i/48;p.push([winX+rad*Math.cos(a),archY+rad*Math.sin(a),offset]);}
    p.push([winX+rad,low,offset]);return p;
  }
  tube(archPath(winR+.012,sill,back+.13),.094,greenFrame,fixed,92,12);
  tube(archPath(winR,sill,back+.205),.061,frame,fixed,92,12);
  tube(archPath(winR-.071,sill+.04,back+.145),.024,m.brass,fixed,92,10);
  fb(2.36,.14,.44,winX,sill,back+.15,frame,.055);
  fb(2.25,.055,.37,winX,sill-.08,back+.13,m.honey,.021);
  // Morning sky is a recessed pane with separate landscape, cloud and muntin geometry.
  const paneShape=new T.Shape();paneShape.moveTo(l,sill);paneShape.lineTo(r,sill);paneShape.lineTo(r,archY);
  paneShape.absarc(winX,archY,winR,0,Math.PI,false);paneShape.closePath();
  const skyMat=mat(0x9dd7d7,.23,.04,{emissive:0x8bc4c6,emissiveIntensity:.44});
  const pane=mesh(new T.ShapeGeometry(paneShape,48),skyMat,fixed);pane.position.z=back-.17;pane.castShadow=false;
  function vista(shape,c,z){
    const ma=mat(c,.55,0,{emissive:c,emissiveIntensity:.16});
    const o=mesh(new T.ShapeGeometry(shape,28),ma,fixed);o.position.z=z;o.castShadow=false;
  }
  for(let k=0;k<2;k++){
    const p=new T.Shape();p.moveTo(l,sill);p.lineTo(l,1.84-k*.1);
    p.bezierCurveTo(l+.36,2.13-k*.42,winX-.12,2.24-k*.55,winX+.33,2.01-k*.2);
    p.quadraticCurveTo(r-.2,1.91+k*.08,r,2.03-k*.15);p.lineTo(r,sill);p.closePath();vista(p,k?0x9ebca7:0xb6cebb,back-.13+k*.02);
  }
  const cloud=mat(0xf9f3dd,.65,0,{emissive:0xffefca,emissiveIntensity:.20});
  [[-.63,3.01,.19],[-.46,3.03,.17],[-.34,3,.13],[-1.67,2.55,.16],[-1.50,2.56,.18]].forEach(([x,y,a])=>{const o=ell(x,y,back-.10,a,.053,.024,cloud,fixed);o.castShadow=false;});
  const windowGlass=mat(0xd7efea,.075,.22,{transparent:true,opacity:.11,depthWrite:false});
  const glazing=mesh(new T.ShapeGeometry(paneShape,48),windowGlass,fixed);
  glazing.position.z=back+.074;glazing.castShadow=false;
  const wz=back+.12;
  fb(.069,archY-sill,.10,winX,(archY+sill)/2,wz,frame,.016);
  fb(winR*2,.071,.1,winX,archY,wz,frame,.014);
  for(const a of [Math.PI/4,Math.PI/2,3*Math.PI/4])rod([winX,archY,wz],[winX+Math.cos(a)*(winR-.056),archY+Math.sin(a)*(winR-.056),wz],.024,frame,fixed);
  fb(2.14,.066,.10,winX,2.04,wz,frame,.015);
  // Capped, stepped cutaway wall on the far side of the room.
  const side=[[-2.48,-.88,3.92],[-.88,.55,2.70],[.55,1.47,1.66],[1.47,2.50,1.12]];
  side.forEach(([z0,z1,h])=>{
    fb(.20,h,z1-z0,left,h/2,(z0+z1)/2,m.grout,.014);
    const count=Math.ceil((z1-z0)/unit),width=(z1-z0)/count;
    for(let j=0;j<Math.ceil(h/unit);j++)for(let i=0;i<count;i++){
      const low=j*unit,hi=Math.min((j+1)*unit,h);
      fb(.067,hi-low-.015,width-.015,left+.106,(hi+low)/2,z0+(i+.5)*width,pick(j<2?blueTile:wTile),.02);
    }
    fb(.25,.083,z1-z0+.035,left,h+.018,(z1+z0)/2,frame,.033);
  });
  [[-3.48,2.16,top],[2.16,3.48,2.22]].forEach(([a,b,h])=>fb(b-a+.055,.085,.26,(a+b)/2,h+.015,back,frame,.034));
  fb(6.80,.095,.099,0,1.072,back+.162,m.porcelain,.025);
  fb(.097,.09,4.91,left+.16,1.069,0,m.porcelain,.02);
  // A draped linen towel, folded over a brass rail; its creases determine the surface normals.
  const towel=mat(0xe8bc86,.9,0,{side:T.DoubleSide,map:Studio.linenMap,bumpMap:Studio.linenMap,bumpScale:.012}),band=mat(0xa46e4e,.84,0,{side:T.DoubleSide});
  for(const z of [-.71,.36]){rod([left+.15,2.16,z],[left+.39,2.16,z],.046,m.brass,fixed);ell(left+.14,2.16,z,.038,.089,.089,m.rimGold,fixed);}
  rod([left+.39,2.16,-.77],[left+.39,2.16,.42],.037,m.brass,fixed);
  function fabric(uu,vv,coords,ma,parent){
    const p=[],idx=[],uv=[];
    for(let j=0;j<=vv;j++)for(let i=0;i<=uu;i++){p.push(...coords(i/uu,j/vv));uv.push(i/uu,j/vv);if(i&&j){const q=j*(uu+1)+i;idx.push(q-uu-2,q-1,q,q-uu-2,q,q-uu-1);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(g,ma,parent);
  }
  function drape(u,v){return [left+.415+.048*Math.sin(u*28+v*.76)*(.36+.64*v)+.04*v*v,2.20-v*.79+.017*Math.cos(u*17)*v,-.62+u*.86];}
  fabric(38,20,drape,towel,fixed);
  [.79,.85].forEach(v0=>fabric(38,2,(u,v)=>{const p=drape(u,v0+v*.026);p[0]+=.002;return p;},band,fixed));
  // Small amber soap on a ribbed ceramic dish, beside the window.
  fb(.46,.047,.24,-1.46,sill+.098,back+.20,m.teal,.022);fb(.32,.102,.17,-1.46,sill+.159,back+.20,m.yellow,.045);
  // Woven hamper and two folded towels in the dressing corner.
  const basket=at(group(fixed),2.18,.06,-1.55);basket.rotation.y=-.10;
  const wicker=[0xc7a16e,0xc39a66,0xd0aa75,0xb38a5b].map(c=>mat(c,.74));
  const bp=(a,y,rx,rz)=>[rx*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.56,y,rz*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.56];
  profile([[.43,.31,.035],[.51,.37,.71]],64,mat(0xaf8857,.8),basket);
  for(let j=0;j<11;j++){
    const y=.07+j*.059,rx=.434+.072*y/.72,rz=.318+.057*y/.72;
    const path=Array.from({length:80},(_,i)=>{const a=TAU*i/80,k=.009*Math.cos(i*Math.PI*.5+j*Math.PI);return bp(a,y,rx+k,rz+k);});
    tube(path,j===10?.033:.024,wicker[j%3],basket,108,6,true);
  }
  for(let i=0;i<27;i++){const a=i*TAU/27;rod(bp(a,.05,.44,.324),bp(a,.692,.518,.379),.012,wicker[3],basket,6);}
  const linen=mat(0xffe8c7,.94,0,{map:Studio.linenMap,bumpMap:Studio.linenMap,bumpScale:.009}),stripe=mat(0xc69b76,.81);
  for(let j=0;j<2;j++){
    const g=at(group(basket),j*.04,.69+j*.116,-j*.045);g.rotation.y=j*.14-.09;
    box(.82,.145,.51,0,0,0,j?linen:m.mint,.069,g);
    for(let k=0;k<2;k++)box(.027,.013,.441,-.28+k*.055,.072,0,j?stripe:m.cream,.005,g);
    box(.66,.015,.025,0,.003,.25,j?stripe:m.teal,.006,g);
  }
  // A compact wall-mounted oak shelf with two old-fashioned bath bottles.
  fb(1.26,.087,.41,1.18,2.31,back+.24,m.honey,.034);
  [ .73,1.62 ].forEach(x=>{fb(.08,.28,.16,x,2.16,back+.18,m.brass,.016);});
  function bottle(x,h,rad,body,cap){
    const g=at(group(fixed),x,2.35,back+.23);
    profile([[.002,.002,0],[rad*.88,rad*.88,.01],[rad,rad,.045],[rad,rad,h*.69],[rad*.92,rad*.92,h*.77],[rad*.45,rad*.45,h*.86],[rad*.45,rad*.45,h*.91]],40,body,g,2);
    cyl(0,h*.956,0,rad*.54,rad*.54,h*.115,cap,g);ring(0,h*.20,0,rad*.998,.005,body,g);
  }
  bottle(.95,.46,.117,mat(0x78a99b,.17,.18),m.brass);bottle(1.30,.31,.11,m.porcelain,m.honey);
  // Tub shell includes the rolled rim and a continuous concave enamel liner.
  const tub=at(group(fixed),CX,0,CZ);
  const a=.287*K,b=.148*K,A=a+.168,B=b+.154;
  const feet=mat(0xb79c70,.32,.47);
  for(const x of [-1.43,1.43])for(const z of [-.68,.68]){
    ell(x,.192,z,.18,.19,.14,feet,tub);ell(x,.089,z+.025,.192,.065,.16,m.brass,tub);
  }
  profile([[.05,.05,.24],[1.51,.71,.24],[1.77,.85,.31],[1.91,.94,.45],[2.09,1.037,.80],[A-.044,B-.048,R-.108],[A-.028,B-.028,R-.057]],112,m.enamel,tub);
  profile([[A-.03,B-.03,R-.102],[A-.006,B-.008,R-.097],[A+.002,B+.002,R-.076],[A-.002,B-.002,R-.063]],112,m.mint,tub);
  profile([[A-.035,B-.035,R-.077],[A+.008,B+.01,R-.073],[A+.029,B+.028,R-.044],[A+.033,B+.032,R-.012],[A+.02,B+.021,R+.014],[A-.017,B-.016,R+.030],[a+.049,b+.041,R+.029],[a+.009,b+.008,R+.016],[a,b,R],[.243*K,.122*K,Y+.026],[.243*K-.025,.122*K-.022,Y+.006],[.243*K-.095,.122*K-.084,Y],[.002,.002,Y]],112,m.porcelain,tub);
  // Ceramic maker's shell is sculpted from radial flutes, with a brass bezel.
  const badge=at(group(tub),.03,.811,1.066);badge.rotation.x=.18;
  ell(0,0,0,.249,.192,.033,m.rimGold,badge);ell(0,.001,.022,.224,.167,.032,m.cream,badge);
  for(let i=-3;i<=3;i++){const a=i*.245;const o=ell(Math.sin(a)*.07,-.016+Math.cos(a)*.033,.053,.025,.097,.018,m.honey,badge);o.rotation.z=-a;}
  ell(0,-.082,.059,.078,.022,.017,m.brass,badge);
  // Foreground bridge tap, flanged sockets, separate bonnet, wheel, arched spout and aerator.
  const faucet=at(group(fixed),CX-1.30,0,CZ+.94);
  const fx=0,fz=.20;
  cyl(fx,R+.024,fz,.143,.166,.085,m.chrome,faucet);
  ring(fx,R+.066,fz,.125,.019,m.brass,faucet);
  cyl(fx,R+.242,fz,.092,.108,.36,m.chrome,faucet);
  ell(fx,R+.441,fz,.116,.114,.124,m.chrome,faucet);
  tube([[0,R+.4,.2],[0,R+.59,.19],[0,R+.72,.065],[0,R+.741,-.14],[0,R+.68,-.33],[0,R+.56,-.41]],.078,m.chrome,faucet,48,16);
  cyl(0,R+.532,-.41,.087,.079,.095,m.brass,faucet);
  cyl(0,R+.478,-.41,.071,.071,.016,m.deep,faucet);
  rod([0,R+.413,.23],[0,R+.44,.42],.074,m.brass,faucet);
  const wheelAnchor=V(CX-1.3,R+.445,CZ+1.382);
  const wheel=at(group(),wheelAnchor.x,wheelAnchor.y,wheelAnchor.z);wheel.rotation.x=-.32;
  const rotor=group(wheel);
  ell(0,0,0,.174,.174,.072,m.sunny,rotor);
  for(let i=0;i<5;i++){const a=i*TAU/5+Math.PI/2;ell(Math.cos(a)*.128,Math.sin(a)*.128,0,.102,.101,.079,m.yellow,rotor);}
  ell(0,0,.053,.138,.138,.055,m.yellow,rotor);ell(0,0,.103,.069,.069,.018,m.brass,rotor);ell(0,0,.117,.044,.044,.012,m.porcelain,rotor);
  batch(rotor);
  // Floor drain and the in-tub plug have independent, modelled perforations.
  const drain=V(1.85,.044,1.91);
  cyl(drain.x,.048,drain.z,.305,.308,.018,m.brass,fixed,64);
  cyl(drain.x,.060,drain.z,.265,.266,.017,m.deep,fixed,64);
  ring(drain.x,.070,drain.z,.274,.018,m.rimGold,fixed);
  for(const rr of [.092,.157,.223])ring(drain.x,.073,drain.z,rr,.012,m.chrome,fixed);
  for(let i=0;i<8;i++){
    const a=i*TAU/8;rod([drain.x+Math.cos(a)*.049,.073,drain.z+Math.sin(a)*.049],[drain.x+Math.cos(a+.25)*.252,.073,drain.z+Math.sin(a+.25)*.252],.009,m.chrome,fixed,8);
  }
  cyl(drain.x,.074,drain.z,.044,.044,.016,m.brass,fixed);
  const plugPoint=V(CX+1.45,Y+.02,CZ+.43);
  cyl(plugPoint.x,Y+.014,plugPoint.z,.13,.13,.018,m.chrome,fixed);cyl(plugPoint.x,Y+.026,plugPoint.z,.095,.095,.01,m.deep,fixed);
  const stopper=group();cyl(0,.028,0,.107,.086,.053,m.teal,stopper);ell(0,.065,0,.052,.042,.052,m.brass,stopper);batch(stopper);
  const plugAnchor=V(CX+1.83,R+.07,CZ+.89);
  const pull=at(group(),plugAnchor.x,plugAnchor.y,plugAnchor.z);
  ell(0,0,0,.13,.051,.115,m.brass,pull);const loop=mesh(new T.TorusGeometry(.103,.025,10,40),m.rimGold,pull);loop.position.y=.094;loop.rotation.y=.28;
  batch(pull);
  const chain=group();
  for(let i=0;i<17;i++){
    const u=i/16,o=mesh(new T.TorusGeometry(.028,.007,6,12),m.brass,chain);
    o.position.set(plugPoint.x+(plugAnchor.x-plugPoint.x)*u,plugPoint.y+.080+(plugAnchor.y-plugPoint.y-.08)*u**1.75,plugPoint.z+(plugAnchor.z-plugPoint.z)*u);o.rotation.y=i%2?1.15:.14;o.rotation.z=-.38;
  }
  batch(fixed);
  function makeBoat(){
    const g=group();
    // Hull sections taper independently at bow and stern.
    const hull=(rows,ma)=>{
      const p=[],uv=[],ix=[],n=72;
      rows.forEach(([len,width,y],j)=>{for(let i=0;i<=n;i++){
        const t=i/n*TAU,co=Math.cos(t),si=Math.sin(t);
        p.push(len*co,y+.045*Math.abs(co)**5,width*si*(1-.36*co));uv.push(i/n,j/(rows.length-1));
        if(j&&i){const q=j*(n+1)+i;ix.push(q-n-2,q,q-n-1,q-n-2,q-1,q);}
      }});
      const ge=new T.BufferGeometry();ge.setAttribute('position',new T.Float32BufferAttribute(p,3));ge.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ge.setIndex(ix);ge.computeVertexNormals();mesh(ge,ma,g);
    };
    hull([[.30,.112,0],[.45,.182,.054],[.49,.212,.104]],m.teal);
    hull([[.49,.212,.104],[.533,.245,.228],[.538,.25,.247]],m.yellow);
    hull([[.538,.25,.247],[.54,.251,.265],[.517,.230,.277],[.001,.001,.277]],m.cream);
    box(.37,.212,.278,-.052,.374,0,m.porcelain,.044,g);
    box(.433,.041,.33,-.052,.496,0,m.teal,.018,g);
    for(const z of [-.142,.142])for(const x of [-.15,.02]){ell(x,.389,z,.063,.058,.009,m.brass,g);ell(x,.389,z*1.046,.045,.04,.008,m.deep,g);}
    cyl(-.112,.577,0,.055,.065,.134,m.coral,g);cyl(-.112,.654,0,.071,.071,.033,m.cream,g);cyl(-.112,.672,0,.044,.044,.009,m.dark,g);
    rod([.265,.279,0],[.265,.613,0],.013,m.brass,g);
    const flag=new T.Shape();flag.moveTo(.26,.616);flag.lineTo(.073,.572);flag.lineTo(.26,.518);flag.closePath();
    const f=mesh(new T.ExtrudeGeometry(flag,{depth:.011,bevelEnabled:false}),m.coral,g);f.position.z=-.006;
    batch(g);return g;
  }
  const boat=makeBoat(),ball=group(),ballR=.0325*K;
  const stripes=[m.yellow,m.cream,m.coral,m.cream,m.yellow];
  const edges=[0,1.08,1.32,1.62,1.86,Math.PI];
  stripes.forEach((ma,i)=>{const o=mesh(new T.SphereGeometry(ballR,44,11,0,TAU,edges[i],edges[i+1]-edges[i]),ma,ball);o.position.y=ballR;});
  batch(ball);
  function makeBucket(big){
    const g=group(),body=group(g),handle=group(g),r=big?.50:.397,h=(big?.098:.079)*K;
    const color=big?mat(0x8cb0ba,.23):mat(0xeeb641,.25);
    const highlight=big?m.cream:mat(0xffd275,.27);
    profile([[.005,.005,.007],[r*.76,r*.76,.007],[r*.816,r*.816,.038],[r,r,h-.032],[r+.015,r+.015,h],[r+.01,r+.01,h+.023],[r-.026,r-.026,h+.027],[r-.042,r-.042,h-.005],[r*.746,r*.746,.064],[.002,.002,.064]],72,color,body,2);
    ring(0,h+.005,0,r,.025,highlight,body);ring(0,.047,0,r*.805,.016,highlight,body);
    // Raised embossed droplet in the moulded plastic.
    const tear=new T.Shape();tear.moveTo(0,.09);tear.bezierCurveTo(.016,.045,.075,.012,.061,-.036);tear.bezierCurveTo(.044,-.098,-.058,-.094,-.062,-.037);tear.bezierCurveTo(-.069,.009,-.020,.051,0,.09);
    const d=mesh(new T.ExtrudeGeometry(tear,{depth:.012,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2}),highlight,body);
    d.position.set(0,h*.49,r*.91);d.rotation.x=.16;
    handle.position.y=h*.82;
    const pts=[];for(let i=0;i<=32;i++){const a=i*Math.PI/32;pts.push([Math.cos(a)*(r+.027),Math.sin(a)*(r+.09),0]);}
    tube(pts,.024,m.teal,handle,46,10);
    tube(pts.slice(11,22),.039,m.cream,handle,18,12);
    for(const sign of [-1,1]){ell(sign*(r+.008),h*.82,0,.038,.055,.055,m.rimGold,body);ell(sign*(r+.032),h*.82,0,.024,.032,.032,m.cream,body);}
    batch(body);batch(handle);return {g,handle};
  }
  const buckets=[makeBucket(false),makeBucket(true)];
  return {K,CX,CZ,Y,R,A,B,boat,ball,buckets,rotor,wheelAnchor,plugAnchor,plugPoint,stopper,pull,chain,drain,
    jetOrigin:V(CX-1.3,R+.469,CZ+.53),fabric};
})();
