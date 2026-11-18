'use strict';
function buildSite(scene) {
  const {T,tau,rand,mat,M,group,mesh,box,ell,cyl,ring,rod,pipe,bake,bolts}=Art;
  const site=group(scene),base=group(site);
  const concrete=mat(0x667179,.65,.22);
  concrete.onBeforeCompile=sh=>{
    sh.vertexShader='varying vec3 deckPoint;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndeckPoint=(modelMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader='varying vec3 deckPoint;\n'+SkyNoise+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float stain=siteNoise(deckPoint*.23)*.6+siteNoise(deckPoint*1.31)*.30+siteNoise(deckPoint*7.)*.1;
      diffuseColor.rgb*=.67+.48*stain;`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=mix(.20,roughnessFactor,smoothstep(.35,.65,stain));`);
  };
  box(base,-5,-1.24,12,41,2.40,51,M.steelDark);
  // Individual expansion joints remain visible in the damp apron.
  for(let i=0;i<8;i++)for(let j=0;j<10;j++)box(base,-22.94+i*5.124,-.035,-10.95+j*5.10,5.095,.12,5.074,concrete);
  for(const x of [-8.13,-7.94,5.65])box(base,x,.034,17,.08,.011,32,M.ochre);
  for(let i=0;i<18;i++){box(base,5.98,.042,1+i*1.45,.22,.018,.42,M.white);}
  for(let i=0;i<12;i++){box(base,-4.5,.035,8.4+i*2.2,.14,.015,.76,M.white);}
  // Circular flame trench, service panels, bolted steel rim and a raised gantry.
  cyl(base,0,.25,0,5.32,5.67,.52,M.graphite,64);
  cyl(base,0,1.15,0,4.89,5.18,1.52,M.steelDark,64);
  for(let i=0;i<28;i++){
    const a=i*tau/28,g=group(base,Math.sin(a)*5.05,1.15,Math.cos(a)*5.05);g.rotation.y=a;
    box(g,0,0,0,.76,1.05,.075,M.graphite);
    if(i%3!==1){box(g,0,.10,.055,.55,.58,.04,M.steelDark);box(g,0,.09,.08,.36,.048,.028,M.black);}
    box(g,0,-.47,.08,.74,.061,.05,M.steel);
  }
  cyl(base,0,2.05,0,5.25,5.10,.33,M.metal);
  cyl(base,0,2.265,0,5.22,5.24,.14,M.graphite);
  cyl(base,0,2.35,0,4.90,4.92,.06,concrete);
  ring(base,2.371,4.48,.049,M.ochre);ring(base,2.373,3.57,.027,M.white);ring(base,2.377,3.10,.08,M.steel);
  for(let i=0;i<64;i++){
    let a=i*tau/64;
    const l=box(base,Math.sin(a)*5.21,2.14,Math.cos(a)*5.21,.30,.130,.052,i%4===0?M.amber:M.ochre);l.rotation.y=a-.12;
    const rib=box(base,Math.sin(a)*4.02,2.385,Math.cos(a)*4.02,.041,.015,.34,M.black);rib.rotation.y=a;
  }
  bolts(base,2.385,4.75,44,.056,M.metal);
  cyl(base,0,2.56,0,2.69,2.97,.35,M.graphite);
  cyl(base,0,2.76,0,2.71,2.73,.09,M.steel);
  function rail(p,a,b,h=.90,finish=M.steel,n=0){
    const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);n=n||Math.ceil(len/2.55);
    for(let j=0;j<=n;j++){const u=j/n,x=a[0]+dx*u,z=a[2]+dz*u,y=a[1]+(b[1]-a[1])*u;
      rod(p,[x,y,z],[x,y+h,z],.039,finish,8);}
    for(const f of [.49,1])rod(p,[a[0],a[1]+f*h,a[2]],[b[0],b[1]+f*h,b[2]],f===1?.049:.026,finish,8);
  }
  rail(base,[15.36,.04,-13],[15.36,.04,37],.75,M.steel);
  rail(base,[-25,.02,-13.36],[15.25,.02,-13.36],.75,M.steel);
  for(let i=0;i<10;i++){
    const a=1.3+i*.32,b=a+.32;
    rail(base,[5.0*Math.sin(a),2.38,5.0*Math.cos(a)],[5.0*Math.sin(b),2.38,5.0*Math.cos(b)],.67,M.ochre,1);
  }
  const stair=group(base,2.6,0,3.84);stair.rotation.y=.57;
  for(let i=0;i<11;i++){
    const z=i*.32,y=2.24-i*.213;
    box(stair,0,y,z,1.48,.11,.37,M.steel);box(stair,0,y+.065,z+.16,1.46,.028,.052,M.ochre);
  }
  for(let sign of [-1,1]){rail(stair,[sign*.78,2.29,-.02],[sign*.78,.12,3.30],.77,M.metal,3);rod(stair,[sign*.69,2.08,-.15],[sign*.69,.04,3.42],.084,M.graphite);}
  function tower(){
    const t=group(base,-6.2,0,-2.25),w=.83,d=.68;
    for(const ix of [-1,1])for(const iz of [-1,1]){
      box(t,ix*w,7.40,iz*d,.15,14.80,.15,M.steel);
      box(t,ix*w,.32,iz*d,.39,.64,.39,M.graphite);
    }
    for(let j=0;j<7;j++){
      const y=j*2.02+.35;
      for(let z of [-d,d]){
        box(t,0,y,z,1.84,.13,.12,M.steelDark);
        rod(t,[-w,y,z],[w,y+2.02,z],.064,M.steel);
        rod(t,[w,y,z],[-w,y+2.02,z],.047,M.steelDark);
      }
      for(let x of [-w,w]){rod(t,[x,y,-d],[x,y+2.02,d],.061,M.steel);box(t,x,y,0,.12,.13,1.50,M.steelDark);}
      if(j%2===0){box(t,0,y+.13,0,1.85,.15,1.6,M.graphite);}
    }
    for(let x of [-.60,-.25,.13])rod(t,[x,.16,-.19],[x,14.7,-.19],x<-.5?.13:.08,x<-.5?M.pearl:M.metal,12);
    for(let y=1;y<14.50;y+=.31)rod(t,[-1.08,y,.13],[-1.08,y,.57],.027,M.metal,6);
    for(const z of [.10,.61])rod(t,[-1.08,0,z],[-1.08,14.83,z],.04,M.metal,8);
    for(const y of [6.5,12.55,14.63]){
      box(t,0,y,0,2.48,.23,2.20,M.steelDark);
      rail(t,[-1.16,y+.12,1.01],[1.17,y+.12,1.01],.52,M.ochre,3);
      rail(t,[-1.16,y+.12,1.01],[-1.16,y+.12,-1.01],.52,M.ochre,2);
      rail(t,[-1.16,y+.12,-1.01],[1.16,y+.12,-1.01],.52,M.ochre,3);
      box(t,-.02,y-.1,1.11,1.72,.08,.08,M.light);
    }
    // Open-web umbilical arm, with ballast and insulated hoses.
    for(const z of [-.48,.48]){rod(t,[.7,12.39,z],[4.85,12.10,z],.097,M.steel);
      rod(t,[.73,13.36,z],[4.85,12.64,z],.063,M.steel);
      for(let j=0;j<5;j++)rod(t,[.8+j*.78,12.37-j*.05,z],[1.49+j*.78,13.22-j*.13,z],.043,M.steelDark);
    }
    pipe(t,[[.20,12.67,.66],[1.78,12,.61],[3.25,11.92,.58],[4.63,12.32,.61]],.08,M.rubber);
    box(t,0,14.97,0,.93,.49,.75,M.steel);rod(t,[.10,15.1,0],[.1,17.04,0],.035,M.metal);
    ell(t,.10,17.06,0,.077,.093,.077,M.amber);
    for(let x of [-.58,.58]){box(t,x,15.32,.16,.70,.39,.31,M.graphite);box(t,x,15.32,.337,.59,.27,.044,M.light);}
  }
  tower();
  // Feed lines follow the edge of the pier to the engine service pit.
  for(let i=0;i<3;i++){let x=-8.5-i*.35;
    pipe(base,[[x,.32,24],[x,.32,4],[x+.25,.32,2.2],[-7.2,.34,.8-i*.36],[-4,.55,.8-i*.36]],.12,M.metal);
    for(let z=3;z<25;z+=2.25){const c=cyl(base,x,.32,z,.148,.148,.074,M.graphite,12);c.rotation.x=Math.PI/2;}
  }
  for(const [x,z] of [[-13.3,-5],[-18,-8],[11.7,-8.4],[14.8,13],[-12,16.5]]){
    box(base,x,.33,z,.64,.64,.63,M.steelDark);cyl(base,x,.77,z,.11,.15,.27,M.metal);
    ell(base,x,.94,z,.14,.16,.14,M.amber);
  }
  for(let i=0;i<3;i++){let x=-16-i*2.18;
    cyl(base,x,1.45,-6.2,.81,.81,2.9,M.hull,32);ell(base,x,2.89,-6.2,.81,.40,.81,M.hull);
    for(let y of [.65,2.23])ring(base,y,.817,.045,M.steel,x,-6.2);
  }
  bake(base);
  const mounts=[];
  for(let i=0;i<4;i++){
    const a=.62+i*Math.PI/2,carrier=group(site,Math.sin(a)*2.14,2.79,Math.cos(a)*2.14);carrier.rotation.y=a;
    const pivot=group(carrier);
    box(pivot,0,.52,-.17,.44,1.03,.41,M.steelDark);
    rod(pivot,[0,.69,-.1],[0,1.45,-.87],.145,M.ochre);
    box(pivot,0,1.43,-.87,.48,.19,.28,M.graphite);bake(pivot);mounts.push(pivot);
  }
  const sock=group(site,-6.85,15.96,-2.2);
  rod(site,[-6.85,14.72,-2.2],[-6.85,16.19,-2.2],.036,M.metal);
  const radial=12,sections=6,pos=new Float32Array((radial+1)*(sections+1)*3);
  const geo=new T.BufferGeometry(),index=[],uv=[];
  for(let j=0;j<=sections;j++)for(let i=0;i<=radial;i++){
    uv.push(i/radial,j/sections);
    if(j<sections&&i<radial){let k=j*(radial+1)+i;index.push(k,k+1,k+radial+1,k+1,k+radial+2,k+radial+1);}
  }
  geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(index);
  for(let j=0;j<sections;j++)geo.addGroup(j*radial*6,radial*6,j%2);
  const fabric=[mat(0xd7794b,.85,.02,{side:T.DoubleSide}),mat(0xe5e1d4,.87,.015,{side:T.DoubleSide})];
  const cloth=mesh(sock,geo,fabric);cloth.frustumCulled=false;
  function updateWind(s){
    let x=0,y=0;
    for(let j=0;j<=sections;j++){
      const angle=s.sock[Math.min(j,sections-1)].angle,r=.18*(1-.69*j/sections);
      for(let i=0;i<=radial;i++){const phi=tau*i/radial,dy=Math.cos(phi)*r;
        geo.attributes.position.setXYZ(j*(radial+1)+i,x-Math.sin(angle)*dy,y+Math.cos(angle)*dy,Math.sin(phi)*r);
      }
      x+=Math.cos(angle)*.258;y+=Math.sin(angle)*.258;
    }
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
  }
  return {site,mounts,updateWind};
}
