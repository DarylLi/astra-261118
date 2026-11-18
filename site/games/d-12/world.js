'use strict';
const canvas=document.getElementById('view');
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
const scene=new T.Scene(), camera=new T.PerspectiveCamera(34,1,.08,130), look=V();
scene.fog=new T.FogExp2(0xc8d9d6,.023);
const ambient=new T.HemisphereLight(0xe4f3ff,0xa3a193,1.35);scene.add(ambient);
const sun=new T.DirectionalLight(0xffebc9,3.0);sun.position.set(-6,10,6);sun.target.position.set(0,0,-1);scene.add(sun,sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:29});sun.shadow.normalBias=.018;sun.shadow.bias=-.00028;
function sky(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,512);
 for(const [off,color] of [[0,'#6fa8c2'],[.29,'#9dc9db'],[.46,'#d5e7e5'],[.51,'#ffefcb'],[.57,'#9eb4ac'],[.64,'#81958c'],[1,'#9eaaa8']])g.addColorStop(off,color);
 ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
 for(let i=0;i<78;i++){
  const x=rng()*1024,y=142+rng()*108,rad=12+rng()*39;ctx.save();ctx.translate(x,y);ctx.scale(2.5,.25+rng()*.33);
  const cloud=ctx.createRadialGradient(0,0,0,0,0,rad);cloud.addColorStop(0,'rgba(255,251,230,.46)');cloud.addColorStop(.6,'rgba(255,252,239,.29)');cloud.addColorStop(1,'rgba(255,255,246,0)');
  ctx.fillStyle=cloud;ctx.fillRect(-rad,-rad,rad*2,rad*2);ctx.restore();
 }
 // Bright sky openings and shaded roof panels give chrome and glass directional reflections.
 const tex=new T.CanvasTexture(c);tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;scene.background=tex;
 const env=c.cloneNode(false);const ec=env.getContext('2d');ec.drawImage(c,0,0);ec.fillStyle='#48575b';ec.fillRect(20,162,173,45);ec.fillRect(760,159,98,50);ec.fillStyle='#e9f4ee';for(let i=0;i<6;i++)ec.fillRect(32+i*24,171,18,25);
 const en=new T.CanvasTexture(env);en.mapping=T.EquirectangularReflectionMapping;en.colorSpace=T.SRGBColorSpace;const pm=new T.PMREMGenerator(renderer);const rt=pm.fromEquirectangular(en);scene.environment=rt.texture;scene.environmentIntensity=.87;pm.dispose();en.dispose();
}
sky();
const reflectCam=new T.PerspectiveCamera(),reflection=new T.WebGLRenderTarget(512,320,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
const reflectionMatrix=new T.Matrix4();
const groundUniforms={floorImage:{value:reflection.texture},floorMtx:{value:reflectionMatrix},floorWet:{value:.72},carContactZ:{value:0},stirs:{value:Array.from({length:12},()=>new T.Vector4())}};
const floorMat=mat(0x97a49f,.33,.25);
floorMat.onBeforeCompile=s=>{
 Object.assign(s.uniforms,groundUniforms);s.vertexShader='varying vec3 floorP;\n'+s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n floorP=(modelMatrix*vec4(transformed,1.)).xyz;');
 s.fragmentShader='varying vec3 floorP; uniform sampler2D floorImage; uniform mat4 floorMtx; uniform float floorWet; uniform float carContactZ; uniform vec4 stirs[12];\n'+shaderNoise+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 fp=floorP.xz;vec2 tile=fp/vec2(2.70,1.55);tile.x+=.5*mod(floor(tile.y),2.);
 float grit=softNoise(fp*155.);float mott=fb(fp*.84);float pool=smoothstep(.48,.60,mott+floorWet*.10);
 vec2 edge=min(fract(tile),1.-fract(tile))*vec2(2.70,1.55);
 float seam=1.-smoothstep(.002,.012,min(edge.x,edge.y));
 diffuseColor.rgb*= (.86+.20*mott+.06*grit+.064*hash21(floor(tile)))* (1.-seam*.44);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.76,.88,.94),pool*.73);
 float contact=exp(-pow(abs(fp.x)/1.03,4.)-pow(abs(fp.y-carContactZ)/1.68,4.))*.36;diffuseColor.rgb*=1.-contact;
 `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.55,.12,pool);').replace('#include <opaque_fragment>',`
 vec4 coord=floorMtx*vec4(floorP,1.);vec2 suv=coord.xy/coord.w*.5+.5;
 vec2 disturb=(vec2(fb(fp*4.),fb(fp.yx*3.7))-.5)*.008;
 for(int i=0;i<12;i++){vec2 delta=fp-stirs[i].xy;float dist=length(delta);float age=1.-stirs[i].z;disturb+=.0016*delta/(.001+dist)*sin((dist-age*.63)*87.)*exp(-abs(dist-age*.63)*45.)*stirs[i].z;}
 vec3 refl=texture2D(floorImage,clamp(suv+disturb,.001,.999)).rgb;
 float fres=pow(1.-max(.0,dot(normalize(cameraPosition-floorP),vec3(0.,1.,0.))),2.);
 outgoingLight=mix(outgoingLight,refl,clamp((.09+.43*pool+.19*fres)*(1.-.55*seam),0.,.75));
 #include <opaque_fragment>`);
};
const ground=mesh(new T.PlaneGeometry(155,155),floorMat,scene);ground.rotation.x=-PI/2;ground.castShadow=false;ground.receiveShadow=true;
const architecture=group(scene), outside=group(scene);
const cream=mat(0xdee5d9,.37,.36), fascia=mat(0x527f8a,.32,.60), enamel=mat(0x8ab9ba,.31,.46);
const amberStripe=mat(0xd9ad60,.45,.21),concrete=mat(0xc4cdc1,.84,.03),floorPaint=mat(0xe7dec3,.6,.12);
const darkTile=mat(0x647e81,.43,.53);
function drainage(p,x,z,w,d){
 box(p,x,.013,z,w,.025,d,M.deep,.01);
 const n=Math.floor(w/.088);for(let i=0;i<n;i++)box(p,x-w/2+(i+.5)*w/n,.033,z,.036,.018,d*.90,M.steel);
 box(p,x,.034,z-d/2,w,.022,.022,M.steel);box(p,x,.034,z+d/2,w,.022,.022,M.steel);
}
drainage(architecture,0,-.79,5.55,.20);drainage(architecture,0,3.66,5.55,.24);
for(const x of [-1.55,1.55]){
 box(architecture,x,.013,.15,.046,.017,6.51,floorPaint);
 box(architecture,x+Math.sign(x)*.08,.012,2.10,.024,.015,2.61,amberStripe);
}
// Free-standing enamelled canopy with rolled lips, inset cream fascia and a recessed ceiling.
box(architecture,0,3.85,-2.76,6.86,.62,4.08,cream,.23);
box(architecture,0,3.646,-2.71,6.79,.22,4.05,fascia,.097);
box(architecture,0,4.17,-2.77,6.89,.115,4.08,enamel,.055);
box(architecture,0,4.224,-2.77,6.73,.053,3.95,M.ivory,.026);
box(architecture,0,3.867,-.718,6.36,.058,.025,enamel,.012);
box(architecture,0,3.56,-2.7,6.32,.069,3.65,M.deep,.032);
for(const x of [-2.22,2.22]){
 box(architecture,x,3.505,-2.71,.126,.055,3.23,M.chrome,.022);box(architecture,x,3.476,-2.71,.086,.02,3.10,M.lit,.009);
}
for(const x of [-2.88,2.88])for(const z of [-1.12,-4.18]){
 box(architecture,x,.10,z,.70,.20,.73,concrete,.055);
 box(architecture,x,1.85,z,.48,3.53,.53,cream,.091);
 box(architecture,x,.26,z,.52,.32,.57,fascia,.045);
 box(architecture,x,1.11,z,.505,.079,.55,enamel,.029);
 if(z>-2){
  box(architecture,x,2.31,z+.271,.22,1.70,.025,M.teal,.012);
  box(architecture,x,2.31,z+.288,.065,1.53,.02,M.lit,.009);
  box(architecture,x,3.42,z,.73,.27,.60,fascia,.105);
  for(const xx of [-.156,.156])for(const yy of [.68,3.18])oval(architecture,x+xx,yy,z+.264,.019,.019,.010,M.chrome,true);
 }
}
// Raised pressed-metal waterdrop roundel on the ribbon over the machinery.
const crest=group(architecture,0,3.92,-.659);
box(crest,0,0,.035,1.13,.465,.091,M.chrome,.045);
box(crest,0,0,.090,1.092,.428,.068,M.teal,.033);
const carIcon=new T.Shape();carIcon.moveTo(-.31,-.055);carIcon.quadraticCurveTo(-.32,.008,-.27,.025);carIcon.lineTo(-.18,.04);carIcon.quadraticCurveTo(-.113,.153,-.045,.153);carIcon.lineTo(.089,.153);carIcon.quadraticCurveTo(.143,.15,.211,.04);carIcon.lineTo(.29,.014);carIcon.quadraticCurveTo(.336,0,.324,-.083);carIcon.lineTo(-.293,-.083);carIcon.closePath();
mesh(new T.ExtrudeGeometry(carIcon,{depth:.014,bevelEnabled:true,bevelSegments:3,bevelSize:.009,bevelThickness:.008}),M.ivory,crest,-.034,-.003,.142);
for(const x of [-.20,.16]){oval(crest,x,-.083,.168,.059,.059,.015,M.deep);oval(crest,x,-.083,.184,.038,.038,.010,M.ivory);}
const sparkle=new T.Shape();[[0,.092],[.021,.022],[.077,0],[.022,-.018],[0,-.092],[-.018,-.021],[-.079,0],[-.019,.022]].forEach(([x,y],i)=>i?sparkle.lineTo(x,y):sparkle.moveTo(x,y));
mesh(new T.ExtrudeGeometry(sparkle,{depth:.016,bevelEnabled:false}),M.lit,crest,.376,.085,.142);
for(const side of [-1,1])for(let i=0;i<3;i++)box(crest,side*(.83-i*.038),.052-i*.054,.036,.34-i*.075,.017,.023,M.steel,.008);
for(let i=0;i<3;i++){let x=2.14+i*.19;oval(architecture,x,3.93,-.70,.063,.063,.024,M.chrome);oval(architecture,x,3.93,-.68,.043,.043,.023,[M.mint,M.amber,M.teal][i]);}
for(const s of [-1,1]){
 const wall=group(architecture,s*2.89,0,-2.81);
 box(wall,0,.62,0,.14,1.17,2.66,enamel,.051);
 box(wall,0,1.26,0,.18,.10,2.69,M.ivory,.044);
 for(let j=0;j<7;j++)box(wall,-s*.079,.67,-1.10+j*.36,.035,.81,.044,M.mint,.016);
 rod(wall,[0,2.95,-1.29],[0,2.95,1.36],.037,M.chrome);
 rod(wall,[0,3.29,-1.28],[0,3.29,1.32],.057,M.teal);
 for(let j=0;j<3;j++){
  let z=-1.11+j*.98;rod(wall,[0,3.30,z],[-s*.25,3.16,z],.055,M.chrome);
  const tip=cyl(wall,-s*.25,3.13,z,.071,.042,.10,M.blue);tip.rotation.z=-s*.39;
 }
}
// Rear fan cowling with real blades, guarded by concentric wire rings.
const fanHub=group(scene,0,3.0,-4.52),fanGuard=group(architecture,0,3,-4.55);
box(fanGuard,0,0,-.14,1.98,.75,.33,enamel,.14);
const fans=[];
for(const x of [-.54,.54]){
 const f=group(fanHub,x,0,.005);fans.push(f);
 const c=cyl(fanGuard,x,0,.025,.316,.316,.06,M.deep);c.rotation.x=PI/2;
 for(let i=0;i<5;i++){const a=i*TAU/5, blade=oval(f,.135*Math.cos(a),.135*Math.sin(a),.07,.146,.065,.024,M.steel);blade.rotation.z=a+.39;}
 oval(f,0,0,.088,.075,.075,.042,M.chrome);bake(f);
 for(const r of [.125,.207,.292])torus(fanGuard,x,0,.14,r,.009,M.chrome);
}
// Overhead track and rolling head.
for(const x of [-1.63,1.63]){box(architecture,x,3.36,-1.71,.115,.13,4.28,M.steel,.032);box(architecture,x,3.29,-1.71,.057,.055,4.21,M.deep);}
const carriage=group(scene), drum=group(carriage,0,2.37,0),brushTargets=[], ringMeshes=[];
const brushPalette=[mat(0x3d8495,.61,.05),mat(0x5ba5b0,.64,.035),mat(0x8bc4bf,.63,.02),mat(0xb1d6ca,.71,.015),mat(0x427b91,.58,.04)];
// Individual rounded cloth paddles are offset in helical rows. A wavy cut end gives the pile its nap.
function bristleGeometry(seed,count,radius,width) {
 const rand=WashPhysics.random(seed),p=[],n=[],ix=[],uv=[];
 for(let i=0;i<count;i++){
  const a=i*TAU/count+rand()*.055,tipR=radius*(.88+rand()*.12),length=width*(.75+rand()*.30),kink=(rand()-.37)*.23,offset=(rand()-.5)*.045;
  const base=p.length/3;
  for(let j=0;j<5;j++)for(let k=0;k<3;k++){
   const h=j/4, side=k-1,rad=mixR(.13,tipR,h)*(1-.023*Math.abs(side)*h),theta=a+kink*h*h+side*(.065-.023*h);
   p.push(side*length*.54+offset+h*h*.032*Math.sin(a*3),Math.cos(theta)*rad,Math.sin(theta)*rad);
   n.push(.25*side,Math.cos(theta+.35),Math.sin(theta+.35));uv.push(k/2,h);
   if(j&&k){let v=base+j*3+k;ix.push(v-4,v-3,v,v-4,v,v-1);}
  }
 }
 return geometry(p,ix,uv,n);
}
function mixR(a,b,f){return a+(b-a)*f;}
for(const m of brushPalette)m.side=T.DoubleSide;
const supports=group(carriage);
const brushPilot=mat(0xe0dcc4,.26,.18,{emissive:0xffce78,emissiveIntensity:.03});
for(const x of [-1.63,1.63])oval(supports,x,3.358,.232,.083,.058,.018,brushPilot);

for(const s of [-1,1]){
 box(supports,s*1.63,3.36,0,.30,.24,.46,M.teal,.075);
 box(supports,s*1.63,2.88,0,.105,.90,.16,M.chrome,.045);
 let c=cyl(supports,s*1.61,2.39,0,.196,.196,.19,enamel);c.rotation.z=PI/2;
}
let axle=cyl(supports,0,2.37,0,.12,.12,3.24,M.deep);axle.rotation.z=PI/2;bake(supports);
for(let i=0;i<15;i++){
 let r=group(drum,(i-7)*.194,0,0);let c=[0,4,0,1,2,3,2,1,0,4,0,1,2,1,0][i];
 mesh(bristleGeometry(1230+i,76,.62,.223),brushPalette[c],r);
 mesh(bristleGeometry(9385+i,45,.57,.19),brushPalette[Math.min(c+1,4)],r);ringMeshes.push(r);brushTargets.push(r);
}
const pillars=[];
for(const side of [-1,1]){
 const base=group(scene,side*2.28,0,-1.62);
 cyl(base,0,.16,0,.31,.36,.26,fascia);cyl(base,0,1.71,0,.095,.095,3.04,M.chrome);
 cyl(base,0,2.93,0,.286,.257,.22,M.teal);cyl(base,0,3.083,0,.218,.235,.095,M.chrome);bake(base);
 const segs=[];
 for(let i=0;i<13;i++){
  const q=group(scene,side*2.28,.45+i*.193,-1.62);q.rotation.z=PI/2;
  mesh(bristleGeometry(513+i*11+(side+1)*17,56,.488,.237),brushPalette[[4,0,1,2,2,1,0,4,0,1,2,1,0][i]],q);segs.push(q);brushTargets.push(q);
 }pillars.push(segs);
}
// Air/water service islands. The foam bottle has a ceramic bubble emblem, ferrules and a flexible hose.
const equipment=[],toolTargets={foam:[],brush:brushTargets,rinse:[]},toolOrigins={};
function station(type,x,z){
 const foam=type==='foam', shellColor=foam?mat(0xe2b978,.26,.35):enamel, grip=foam?mat(0xf6bc66,.32,.26):mat(0x79c4cd,.29,.33);
 const root=group(scene,x,0,z),fixed=group(root),mast=group(root),nozzle=group(root,0,1.28,.05);
 const radius=foam?.365:.265;
 box(fixed,0,.082,0,radius*2+.21,.146,radius*2+.17,M.teal,.070);
 cyl(fixed,0,.238,0,radius*.97,radius*.99,.21,M.chrome);
 cyl(fixed,0,.65,0,radius,radius,.74,shellColor,48);oval(fixed,0,.995,0,radius,.145,radius,shellColor);
 cyl(fixed,0,.36,0,radius+.009,radius+.009,.043,M.ivory);cyl(fixed,0,.92,0,radius+.009,radius+.009,.034,M.chrome);
 cyl(fixed,0,1.13,0,.125,.151,.16,M.chrome);cyl(fixed,0,1.202,0,.15,.15,.060,M.teal);
 const logo=group(fixed,0,.657,radius-.003);logo.rotation.y=.18;
 if(foam){
  const plate=cyl(logo,0,0,0,.174,.174,.035,M.ivory);plate.rotation.x=PI/2;
  for(const [xx,yy,r] of [[-.035,-.019,.067],[.047,.068,.041],[.074,-.058,.031]]){torus(logo,xx,yy,.026,r,.013,M.teal);}
 }else badgeDrop(logo,0,0,.012,.23,M.ivory);
 // Level sight glass and real, captive air bubbles.
 rod(fixed,[-radius*.64,.43,radius*.78],[-radius*.64,.85,radius*.78],.034,M.chrome);
 rod(fixed,[-radius*.64,.46,radius*.78+.014],[-radius*.64,.81,radius*.78+.014],.021,foam?M.lit:M.mint);
 for(let i=0;i<4;i++)box(fixed,-radius*.64+.046,.48+i*.08,radius*.8,.045,.011,.02,M.ivory);
 tube(mast,[[-.04,.40,.09],[-.27,.29,.19],[-.45,.12,.18],[-.56,.10,.035],[-.51,.51,-.04],[-.33,1.07,-.035],[-.13,1.22,.035]],.043,M.deep);
 // Display a solid pistol grip in its dock; local +X is the delivery direction.
 const wand=group(nozzle);wand.rotation.z=.21;
 box(wand,-.03,.012,0,.51,.19,.18,grip,.079);
 const handle=box(wand,-.114,-.129,0,.139,.34,.143,M.deep,.047);handle.rotation.z=-.34;
 tube(wand,[[-.10,-.212,0],[.057,-.204,0],[.121,-.126,0],[.118,-.019,0]],.023,M.chrome);
 rod(wand,[.15,.014,0],[.33,.014,0],.078,M.chrome);
 rod(wand,[.30,.014,0],[.409,.014,0],.083,foam?M.ivory:M.blue,.10);
 rod(wand,[.395,.014,0],[.433,.014,0],.072,M.deep);
 for(const xx of [-.200,-.154,-.107])box(wand,xx,.103,0,.020,.012,.109,M.ivory,.005);
 const tip=group(wand,.434,.014,0);bake(wand);bake(fixed);bake(mast);
 if(!foam){nozzle.rotation.y=PI;}
 const lamp=mat(foam?0xf4cc83:0x8cdae0,.29,.22,{emissive:foam?0xffb341:0x85e1ee,emissiveIntensity:.40});
 cyl(root,0,1.067,0,radius*.73,radius*.77,.045,lamp);
 toolTargets[type].push(fixed,mast,nozzle);
 equipment.push({type,root,nozzle,wand,tip,mast,lamp,base:nozzle.position.clone()});toolOrigins[type]=V(x,1.35,z);
 return root;
}
const foamStation=station('foam',-2.07,1.86),waterStation=station('rinse',2.69,-.63);
// Family with their backs toward the entrance. Three differently tailored raincoats under one umbrella.
const skin=mat(0xd7a381,.7,.015),hair=mat(0x55453a,.77,.01),boots=mat(0x4c6260,.43,.14),coatA=mat(0xb3bba3,.78,.01),coatB=mat(0xc88b72,.73,.02),coatC=mat(0xdba955,.67,.05);
function person(scale,coat,hairStyle){
 const root=group(scene),body=group(root),coatMesh=mesh(new T.LatheGeometry([[.15,.35],[.183,.37],[.16,.54],[.148,.74],[.137,.773],[.08,.80]].map(a=>new T.Vector2(...a)),28),coat,body);
 coatMesh.scale.z=.78;oval(body,0,.78,0,.125,.065,.105,coat);
 oval(body,0,.905,0,.125,.151,.114,skin);oval(body,0,.949,.017,.13,.12,.116,hair);
 if(hairStyle)oval(body,0,.921,.086,.09,.065,.063,hair);
 for(const s of [-1,1]){rod(body,[s*.128,.735,.005],[s*.176,.538,-.014],.065,coat,.045);oval(body,s*.178,.509,-.014,.04,.06,.04,skin,true);}
 tube(body,[[-.09,.75,.088],[0,.665,.128],[.09,.75,.088]],.009,M.ivory);
 bake(body);const legs=[];
 for(const s of [-1,1]){let q=group(root,s*.08,.405,0);rod(q,[0,0,0],[0,-.265,0],.057,M.deep,.047);cyl(q,0,-.290,0,.061,.059,.151,boots);oval(q,0,-.356,-.027,.069,.044,.101,boots,true);bake(q);legs.push(q);}
 root.scale.setScalar(scale);return {root,body,legs};
}
const people=[person(1.51,coatA,false),person(1.35,coatB,true),person(.96,coatC,true)];
const umbrella=group(scene),uFixed=group(umbrella);
const umMats=[mat(0xe5b763,.47,.10),mat(0xf7cd83,.51,.06)];
for(let j=0;j<10;j++){
 let rows=[],a=j*TAU/10;for(let h=0;h<=9;h++){
  const r=.89*h/9,row=[];
  for(let i=0;i<=6;i++){const f=i/6,theta=a+f*TAU/10;row.push([r*Math.cos(theta),.39*(1-(h/9)**1.75)-.064*(h/9)**3*Math.sin(PI*f),r*Math.sin(theta)]);}rows.push(row);
 }patch(uFixed,rows,umMats[j%2]);
 const line=[];for(let k=0;k<=8;k++){const f=k/8;line.push([.89*f*Math.cos(a),.394*(1-f**1.75),.89*f*Math.sin(a)]);}tube(uFixed,line,.0065,M.amber);
}
rod(uFixed,[0,-.73,0],[0,.446,0],.015,M.steel);oval(uFixed,0,.446,0,.025,.032,.025,M.deep,true);bake(uFixed);
// Seaside planting and layered hills soften the open exit in the early daylight.
const leaves=[0x769582,0x8ca895,0xa4b599,0x72938b,0x9bb69b].map(c=>mat(c,.88,.025)),bark=mat(0x827a65,.85,.01);
// Leaf clusters retain their volume in shade, while fine-scale variation breaks up the sunlit edges.
for(const m of leaves)m.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 leafP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nleafP=(modelMatrix*vec4(position,1.)).xyz;');
 shader.fragmentShader='varying vec3 leafP;\n'+shaderNoise+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 leafUV=leafP.xz+vec2(.37,.69)*leafP.y;float canopy=fb(leafUV*3.1);float smallLeaf=softNoise(leafUV*42.);
 diffuseColor.rgb*=.74+.39*canopy+smallLeaf*.13;diffuseColor.rgb+=vec3(.042,.039,.010)*smoothstep(.58,.84,smallLeaf)*canopy;`);
};
function tree(x,z,scale,kind=0){
 const q=group(outside,x,0,z);q.scale.setScalar(scale);
 rod(q,[0,0,0],[.035,1.78,0],.095,bark,.058);
 for(let i=0;i<8;i++){
 const a=i*2.399+rng()*.3,r=.31+rng()*.40,y=1.75+rng()*.70;
 rod(q,[0,.82,0],[Math.cos(a)*r,y,Math.sin(a)*r],.039,bark,.017);
 const o=oval(q,Math.cos(a)*r,y,Math.sin(a)*r,.56+rng()*.26,.63+rng()*.34,.62+rng()*.24,leaves[(kind+i)%5],true);o.rotation.z=rng()*.53;
 }
 oval(q,.012,2.48,0,.68,.68,.66,leaves[(kind+1)%5],true);
}
for(const [x,z,sc,k] of [[-7,-3.4,1.62,2],[-5.9,-9,1.10,1],[-10,-13,1.9,0],[6.5,-6.9,1.63,3],[9,-8,1.4,0],[4.95,-12,1.17,0],[.9,-16,.8,1],[-2.5,-18,1.0,2]])tree(x,z,sc,k);
for(let i=0;i<14;i++){const x=-43+i*6;oval(outside,x,-1.62,-31-rng()*9,6+rng()*6,2+rng()*3,4+rng()*4,leaves[(i+2)%5],true);}
for(const x of [-8.2,8.2]){
 box(outside,x,.29,-7.9,9.2,.60,.43,concrete,.085);
 box(outside,x,.60,-7.9,9.25,.095,.56,cream,.046);
 for(let i=0;i<8;i++)oval(outside,x-3.8+i*1.03,.54,-8.41,.75,.43+rng()*.43,.70,leaves[i%5],true);
}
for(const x of [-4.49,4.87]){
 box(outside,x,.14,-1.85,.67,.27,3.90,concrete,.086);
 for(let i=0;i<7;i++)oval(outside,x+(rng()-.5)*.19,.34,-3.42+i*.51,.32,.24+rng()*.23,.44,leaves[i%5],true);
}
// Slender border grasses catch the low light around the rain-darkened planting beds.
const grassM=mat(0x9eac7b,.73,.02);grassM.side=T.DoubleSide;
const grassPos=[],grassUV=[],grassIx=[];
for(const x of [-4.49,4.87])for(let i=0;i<270;i++){
 const bx=x+(rng()-.5)*.56,bz=-3.73+rng()*3.73,by=.276,h=.14+rng()*.23,w=.009+rng()*.011,a=rng()*TAU,dx=Math.cos(a)*w,dz=Math.sin(a)*w;
 const tip=.06+rng()*.16,v=grassPos.length/3;
 grassPos.push(bx-dx,by,bz-dz,bx+dx,by,bz+dz,bx+Math.sin(a)*tip,by+h,bz+Math.cos(a)*tip);
 grassUV.push(0,0,1,0,.5,1);grassIx.push(v,v+1,v+2);
}
mesh(geometry(grassPos,grassIx,grassUV),grassM,outside);
bake(architecture);bake(outside);
const cars=[vehicle(scene),vehicle(scene,true)];cars[1].p.visible=false;
