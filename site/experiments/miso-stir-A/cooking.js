'use strict';
const R=1.17,level=1.105;
function pot(scene){
 const p=group(scene),blue=mat(0x294f51,.25,.46),rim=mat(0xc9c1a3,.25,.8),inside=mat(0x434a43,.34,.45);
 lathe(p,blue,0,0,0,[[.001,.302],[.83,.302],[1.01,.321],[1.109,.39],[1.166,.501],[1.192,.67],[1.216,1.088],[1.23,1.13],[1.253,1.145],[1.255,1.181],[1.224,1.197],[1.189,1.174],[1.17,1.14]],96);
 lathe(p,inside,0,0,0,[[1.212,1.18],[1.173,1.161],[1.161,1.077],[1.139,.62],[1.078,.488],[.92,.409],[0,.409]],96);
 ring(p,rim,0,1.175,0,1.232,.026,96);
 ring(p,blue,0,1.11,0,1.226,.014,96);
 ring(p,blue,0,.423,0,1.132,.019,96);
 for(const sign of [-1,1]){
   const g=group(p,0,0,0);g.rotation.y=sign<0?Math.PI:0;
   for(const z of [-.224,.224]){
      const flange=oval(g,brass,1.186,.918,z,.048,.105,.097);flange.rotation.y=-z;
      oval(g,rim,1.229,.917,z,.018,.038,.038);
   }
   line(g,brass,[[1.178,.933,-.246],[1.334,.968,-.285],[1.57,1.00,-.25],[1.63,1.021,-.145],[1.63,1.021,.145],[1.57,1.00,.25],[1.334,.968,.285],[1.178,.933,.246]],.066,36,12);
   rod(g,walnut,[1.63,1.021,-.16],[1.63,1.021,.16],.078,.078,24);
 }
 batch(p);
}
// Transport the freshly dissolved paste in a small fixed grid. Once diluted, the
// same paste belongs to the uniform broth colour and its local contrast fades.
function dyeField(){
 const width=40,count=width*width,bytes=new Uint8Array(count);
 const field=new T.DataTexture(bytes,width,width,T.RedFormat);
 field.magFilter=field.minFilter=T.LinearFilter;field.needsUpdate=true;
 let front=new Float32Array(count),back=new Float32Array(count),clock=0,lastTime=0;
 const lastMass=[.31,.36,.33],amount=[0,0,0];
 return {field,update(s){
   for(let i=0;i<3;i++){const m=s.lumps[i].m;amount[i]+=Math.max(0,lastMass[i]-m);lastMass[i]=m;}
   clock+=s.time-lastTime;lastTime=s.time;
   if(clock<1/15)return;
   const dt=Math.min(clock,.12),turn=-s.omega*dt*.68,co=Math.cos(turn),si=Math.sin(turn);
   clock=0;
   const loss=Math.exp(-dt*(.23+.09*Math.abs(s.omega))),blend=1-Math.exp(-dt*1.25);
   const half=(width-1)*.5;
   for(let j=0;j<width;j++)for(let i=0;i<width;i++){
     const x=i-half,z=j-half;
     const px=Math.min(width-1.001,Math.max(0,half+x*co-z*si));
     const pz=Math.min(width-1.001,Math.max(0,half+x*si+z*co));
     const ix=Math.floor(px),iz=Math.floor(pz),u=px-ix,v=pz-iz,k=iz*width+ix;
     const a=front[k],b=front[k+1],c=front[k+width],d=front[k+width+1];
     const sample=(a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
     back[j*width+i]=(sample*(1-blend)+(a+b+c+d)*.25*blend)*loss;
   }
   for(let j=0;j<3;j++){
     const cx=(s.lumps[j].x+1)*half,cz=(s.lumps[j].z+1)*half;
     for(let z=Math.max(0,Math.floor(cz)-5);z<=Math.min(width-1,Math.ceil(cz)+5);z++){
       for(let x=Math.max(0,Math.floor(cx)-5);x<=Math.min(width-1,Math.ceil(cx)+5);x++){
         const d=(x-cx)**2+(z-cz)**2;
         back[z*width+x]+=amount[j]*42*Math.exp(-d*.13);
       }
     }
     amount[j]=0;
   }
   const old=front;front=back;back=old;
   for(let i=0;i<count;i++)bytes[i]=Math.round(255*(1-Math.exp(-front[i])));
   field.needsUpdate=true;
 }};
}
function soupSurface(scene){
 const pigment=dyeField();
 const uni={pigmentMap:{value:pigment.field},clock:{value:0},flow:{value:0},turn:{value:0},mixed:{value:0},dip:{value:0},locus:{value:new T.Vector2()},clumps:{value:[new T.Vector4(),new T.Vector4(),new T.Vector4()]}};
 const m=new T.ShaderMaterial({uniforms:uni,
 vertexShader:`
 uniform float clock,flow,turn,dip;
 uniform vec2 locus;
 varying vec2 q;varying float height;
 void main(){
 q=position.xz;float r=length(q),a=atan(q.y+.00001,q.x+.00001);
 float w=abs(flow)*.25;
 height=-.076*w*exp(-r*r*7.)+.005*sin(17.*r-2.*a+turn*1.4)*w;
 height+=.0038*sin(q.x*11.+clock*1.65)*cos(q.y*9.-clock*1.2);
 height+=.017*dip*sin(24.*length(q-locus)-clock*11.)*exp(-3.8*length(q-locus));
 vec3 pos=vec3(position.x*1.17,height,position.z*1.17);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);
 }`,
 fragmentShader:`
 uniform float clock,flow,turn,mixed,dip;uniform vec2 locus;uniform vec4 clumps[3];uniform sampler2D pigmentMap;
 varying vec2 q;varying float height;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),u.x),u.y);}
 mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
 void main(){
 float r=length(q),a=atan(q.y+.00001,q.x+.00001);
 float swirl=flow*.22;
 vec2 adv=rot(turn*.38+swirl*(1.-r)*2.)*q;
 vec2 field=adv*3.6+vec2(clock*.016,-clock*.013);
 float n=noise(field),fine=noise(adv*16.+n*2.);
 float cloud=.095*n+.027*fine;
 for(int i=0;i<3;i++){
   vec2 d=q-clumps[i].xy;
   vec2 e=rot(swirl*(.5+length(d)))*d;
   float distanceToGrain=length(e*vec2(.96,1.34))+.064*(noise(field*2.)-.5);
   cloud+=(.45*clumps[i].z+clumps[i].w)*exp(-distanceToGrain*4.8)*(.63+.47*n);
 }
 float plume=texture2D(pigmentMap,q*.5+.5+.016*vec2(n-.5,fine-.5)).r;
 cloud+=plume*(.77+.46*fine);
 vec3 clear=mix(vec3(.218,.102,.035),vec3(.52,.284,.090),.37+.53*n);
 vec3 broth=mix(clear,vec3(.70,.414,.164),clamp(cloud*1.65,0.,1.));
 broth=mix(broth,vec3(.66,.43,.219)*(1.+.045*(fine-.5)),mixed*.94);
 float grain=noise(adv*194.);broth+=vec3(.049,.028,.012)*smoothstep(.68,.93,grain)*(1.-mixed*.57);
 broth*=1.-.32*smoothstep(.87,1.,r);
 float wave=sin(r*71.-a*2.3+turn*1.5+fine*3.);
 float rip=sin(length(q-locus)*63.-clock*9.4);
 float shimmer=smoothstep(.81,1.,wave)*(.055+.14*abs(swirl))*smoothstep(-.4,.85,-q.x-q.y*.5);
 float streak=smoothstep(.82,.99,noise(vec2(q.x*3.2+fine*.18,q.y*56.+sin(q.x*6.+clock*.8)*1.85)));
 float windowLight=.16*streak*exp(-3.*length(q-vec2(-.44,-.33)));
 broth+=vec3(1.,.90,.69)*(shimmer+windowLight+dip*.075*smoothstep(.92,1.,rip)*exp(-4.*length(q-locus)));
 broth+=vec3(.32,.24,.14)*smoothstep(.98,.996,r);
 gl_FragColor=vec4(broth,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const pos=[],idx=[],n=80,k=22;
 for(let j=0;j<=k;j++)for(let i=0;i<=n;i++){
   let a=i*TAU/n;pos.push(j/k*Math.sin(a),0,j/k*Math.cos(a));
   if(i<n&&j<k){const t=j*(n+1)+i;idx.push(t,t+n+2,t+1,t,t+n+1,t+n+2);}
 }
 // The top normal points up (increasing radius crossed with increasing azimuth).
 const o=mesh(scene,geometry(pos,idx),m,0,level,0);o.castShadow=false;
 return (s)=>{pigment.update(s);uni.clock.value=s.time%1000;uni.flow.value=s.omega;uni.turn.value=s.circulation%12566.370614;uni.mixed.value=s.mix;
   uni.locus.value.set(s.x,s.z);uni.dip.value=Math.min(1,s.ripple+s.speed*.18);
   for(let j=0;j<3;j++){const l=s.lumps[j];uni.clumps.value[j].set(l.x,l.z,l.m/l.initial,Math.min(1.8,l.dye));}
 };
}
function instanced(scene,g,m,n){
 const o=new T.InstancedMesh(g,m,n);o.instanceMatrix.setUsage(T.DynamicDrawUsage);o.frustumCulled=false;scene.add(o);return o;
}
function seaweed(){
 const pos=[],idx=[],uv=[],n=17,k=6;
 for(let j=0;j<=n;j++)for(let i=0;i<=k;i++){
   const t=j/n,v=i/k*2-1,edge=.66+.34*Math.sin(t*Math.PI);
   const x=v*.113*edge*(.85+.15*Math.sin(t*31+v*.8))+.029*Math.sin(t*8);
   const y=.073*Math.sin(t*9+v*2.1)+.045*Math.cos(v*4+t*6)+.013*Math.sin(t*26)*Math.abs(v);
   pos.push(x,y,(t-.5)*.353);uv.push(i/k,j/n);
   if(j<n&&i<k){const a=j*(k+1)+i;idx.push(a,a+k+2,a+1,a,a+k+1,a+k+2);}
 }
 return geometry(pos,idx,uv);
}
function steam(scene){
 // Each wisp is a tapered, translucent folded tube with a soft view-dependent edge.
 const count=8,steps=18,edges=7,pos=[],ids=[],uv=[],idx=[];
 for(let i=0;i<count;i++)for(let j=0;j<=steps;j++)for(let k=0;k<=edges;k++){
   const t=j/steps,a=k/edges*TAU;pos.push(Math.cos(a),t,Math.sin(a));ids.push(i);uv.push(k/edges,t);
   const u=pos.length/3-1;if(j<steps&&k<edges)idx.push(u,u+1,u+edges+2,u,u+edges+2,u+edges+1);
 }
 const g=geometry(pos,idx,uv);g.setAttribute('strand',new T.Float32BufferAttribute(ids,1));
 const uni={clock:{value:0},warm:{value:.15},flow:{value:0}};
 const m=new T.ShaderMaterial({uniforms:uni,transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`
 attribute float strand;uniform float clock,warm,flow;varying vec2 st;varying float alpha;
 void main(){st=uv;float t=uv.y,seed=strand*2.39996;
 float lift=.40+warm*.92;
 float phase=clock*.86+seed;float spread=.48+.25*sin(seed);
 vec3 p=vec3(sin(seed)*spread,1.12,cos(seed)*spread);
 p.x+=t*(.12+.14*sin(t*6.-phase)+flow*.035);
 p.z+=t*.13*cos(t*5.-phase+seed);p.y+=t*lift;
 float rr=.009+(.035+warm*.076)*t+.013*sin(t*7.-phase);
 p.xz+=vec2(position.x*.76,position.z)*rr;
 alpha=(.036+.11*warm)*(.52+.48*sin(phase-t*7.))*(.7+.3*cos(seed));
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`,fragmentShader:`
 varying vec2 st;varying float alpha;
 void main(){float fade=sin(3.14159*st.y);gl_FragColor=vec4(.94,.91,.82,alpha*fade*fade);
 #include <colorspace_fragment>
 }`});
 const o=mesh(scene,g,m);o.castShadow=false;o.frustumCulled=false;o.renderOrder=5;
 return s=>{uni.clock.value=s.time;uni.warm.value=.12+.18*s.mix+.75*s.joy;uni.flow.value=s.omega;};
}
function cooking(scene,s){
 pot(scene);const surfaceTick=soupSurface(scene),steamTick=steam(scene);
 const grains=texture(64,64,()=>{const n=rand();let v=235+rand()*17-(n>.98?44:0);return [v,v,v];});
 const tofu=instanced(scene,boxGeo(.214,.166,.192,.018),mat(0xfff0c9,.59,0,{map:grains,bumpMap:grains,bumpScale:.006}),11);
 const weed=instanced(scene,seaweed(),mat(0x344b2c,.31,0,{side:T.DoubleSide}),12);
 const scall=instanced(scene,new T.LatheGeometry([[.054,0],[.059,.007],[.058,.035],[.052,.041],[.038,.041],[.035,.035],[.036,.003],[.054,0]].map(v=>new T.Vector2(...v)),20),mat(0x87a147,.51),19);
 const food=[tofu,weed,scall];for(let i=0;i<s.food.length;i++){
   const f=s.food[i],g=food[f.kind],j=i-[0,11,23][f.kind];
   g.setColorAt(j,new T.Color().setRGB(...([[.83+rand()*.17,.91+rand()*.09,.92],[.51+rand()*.48,.60+rand()*.39,.43+rand()*.4],[.59+rand()*.39,.81+rand()*.18,.49+rand()*.45]][f.kind])));
 }
 const shadowMat=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 v;void main(){v=position.xz;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 v;void main(){gl_FragColor=vec4(.19,.107,.036,.22*(1.-smoothstep(.0,1.,length(v))));}`});
 const disc=new T.CircleGeometry(1,18);disc.rotateX(-Math.PI/2);
 const shadows=instanced(scene,disc,shadowMat,42);shadows.renderOrder=1;
 const miso=mat(0xbc8752,.81,0,{map:grains,bumpMap:grains,bumpScale:.046});
 const cluster=s.lumps.map((l,j)=>{
   const g=group(scene);
   // One rough paste mass, built from a deformed core with adhering soy grains.
   const core=new T.IcosahedronGeometry(1,3);let a=core.attributes.position;
   for(let i=0;i<a.count;i++){let x=a.getX(i),y=a.getY(i),z=a.getZ(i);let r=1+.07*Math.sin(x*16+y*8)*Math.cos(z*15)+.074*Math.cos(y*6+x*9);
     a.setXYZ(i,x*r*.164,y*r*.113,z*r*.136);}
   core.computeVertexNormals();mesh(g,core,miso);
   for(let i=0;i<41;i++){let aa=rand()*TAU,h=rand(),rr=Math.sqrt(1-h*h);oval(g,miso,.16*rr*Math.cos(aa),.11*h,.13*rr*Math.sin(aa),.012+rand()*.017,.012+rand()*.014,.016);}
   batch(g);return g;
 });
 const waveMat=new T.MeshBasicMaterial({color:0xffde9f,transparent:true,opacity:0,depthWrite:false});
 const touchWave=ring(scene,waveMat,0,level+.016,0,1,.018,64);
 touchWave.castShadow=false;touchWave.renderOrder=2;
 const bubbles=instanced(scene,beadGeo,mat(0xddb67e,.17,.24),28);
 const foam=instanced(scene,new T.TorusGeometry(1,.12,6,16),mat(0xe0c396,.36),25);
 const tmp=new T.Object3D();
 function stamp(object,j,x,y,z,sx,sy,sz,rx,ry,rz){
   tmp.position.set(x,y,z);tmp.scale.set(sx,sy,sz);tmp.rotation.set(rx,ry,rz);tmp.updateMatrix();object.setMatrixAt(j,tmp.matrix);
 }
 // The ladle is a hollow, pressed metal shell. The shank and ferrule share a rigid axis.
 const spoon=group(scene),bowlPart=group(spoon),tool=group(spoon);
 const spoonMetal=mat(0xc2c6b9,.19,.91);
 const cup=lathe(bowlPart,spoonMetal,0,0,0,[[0,-.12],[.101,-.107],[.175,-.067],[.223,.002],[.234,.051],[.231,.064],[.218,.061],[.209,.018],[.163,-.052],[.096,-.092],[0,-.102]],48);cup.scale.z=1.12;
 ring(bowlPart,spoonMetal,0,.058,0,.226,.008,48).scale.y=1.12;
 batch(bowlPart);
 lathe(tool,spoonMetal,0,0,0,[[.036,0],[.043,.04],[.034,.34],[.029,.59],[.041,.65],[.04,.69]],24);
 lathe(tool,brass,0,0,0,[[.043,.60],[.056,.618],[.058,.693],[.052,.706]],28);
 const gripMat=oak(0xa46835);
 lathe(tool,gripMat,0,0,0,[[.050,.67],[.063,.704],[.063,.78],[.056,1.05],[.066,1.27],[.071,1.38],[.061,1.416],[.032,1.431],[0,1.432]],32);
 for(let j=0;j<2;j++)ring(tool,brass,0,1.29+j*.04,0,.067,.005,24);
 batch(tool);
 const gripPoint=V(),spoonTip=V(),direction=V(),up=V(0,1,0);
 return {spoon,tool,bowlPart,gripPoint,spoonTip,update(){
  surfaceTick(s);steamTick(s);
  const t=s.time,w=s.omega,energy=Math.abs(w)/4.4;
  const waveRadius=.125+.48*(1-s.ripple);
  touchWave.visible=s.ripple>.055;
  touchWave.position.set(s.x*R,level+.016,s.z*R);touchWave.scale.setScalar(Math.min(waveRadius,R*(1-Math.hypot(s.x,s.z))));
  waveMat.opacity=.61*s.ripple;
  s.food.forEach((f,i)=>{
    const j=i-[0,11,23][f.kind],size=.83+.27*(.5+.5*Math.sin(f.seed*9));
    const sink=-.077*energy*Math.exp(-7*(f.x*f.x+f.z*f.z));
    const bob=level+sink+.008*Math.sin(t*2.25+f.seed)+f.up*.253;
    const rx=.077*Math.sin(t*1.2+f.seed)+energy*.105*Math.sin(f.spin);
    stamp(food[f.kind],j,f.x*R,bob+[.036,.019,.005][f.kind],f.z*R,size,size*(1-.59*f.unfold),size*(1+.65*f.unfold),rx,f.spin,.11*Math.sin(f.seed+t*.85));
    const r=[.18,.207,.073][f.kind];stamp(shadows,i,f.x*R+.015,level+.009+sink,f.z*R+.019,r*(1+f.up*.3),1,r,0,0,0);
  });
  for(const o of [...food,shadows])o.instanceMatrix.needsUpdate=true;
  cluster.forEach((g,j)=>{const l=s.lumps[j],k=Math.cbrt(l.m/l.initial);g.visible=k>.015;g.scale.setScalar(k*1.09);g.rotation.y=l.angle+j;g.position.set(l.x*R,level+.021-.075*energy*Math.exp(-7*(l.x*l.x+l.z*l.z)),l.z*R);});
  for(let i=0;i<28;i++){
    const cycle=t*(.34+(i%5)*.063)+i*.378,u=cycle%1,a=i*2.399+s.circulation*.18+Math.floor(cycle)*.19;
    const radius=(i%4===0?.44:.88)+.08*Math.sin(i*13.4),r=.013+.022*(.5+.5*Math.sin(i*3.1));
    const size=r*Math.sin(Math.PI*u)**.55;
    stamp(bubbles,i,Math.cos(a)*radius*R,level+.002,Math.sin(a)*radius*R,size,size*(.38+u*.51),size,0,0,0);
    if(i<25){const rr=.018+.037*(.5+.5*Math.sin(i*1.93));const ang=i*2.4+s.circulation*.13;
      stamp(foam,i,Math.cos(ang)*R*.981,level+.004,Math.sin(ang)*R*.981,rr,rr,rr,-Math.PI/2,0,0);}
  }
  bubbles.instanceMatrix.needsUpdate=foam.instanceMatrix.needsUpdate=true;
  const idle=s.down?0:.5+.5*Math.cos(t*2.27);
  const lift=s.scoop*.243;
  spoon.position.set(s.x*R,level+.034+lift+.009*idle-.061*s.ripple+.065*s.invite,s.z*R);
  direction.set(-.3-s.x*R,.76-lift*.48,-1.66-s.z*R).normalize();
  bowlPart.rotation.y=Math.atan2(direction.x,direction.z);
  bowlPart.rotation.x=-.10-.11*s.scoop-.067*s.ripple;
  tool.position.set(direction.x*.18,.046,direction.z*.18);
  tool.quaternion.setFromUnitVectors(up,direction);
  gripPoint.copy(spoon.position).add(tool.position).addScaledVector(direction,1.22);gripPoint.y+=.049;
  spoonTip.copy(spoon.position);gripMat.emissive.setHex(0xf6b863);gripMat.emissiveIntensity=(s.down?.018:.05+.125*idle)+.44*s.invite;
 }};
}
