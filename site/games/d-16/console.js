'use strict';
function buildConsole(env) {
  const {T,M,mat,group,box,cyl,ell,rod,lathe,plate,bake}=Art;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(28,1,.1,60);cam.position.z=13.6;
  scene.environment=env;scene.environmentIntensity=.82;
  scene.add(new T.HemisphereLight(0xe4efff,0xa49581,1.68));
  const light=new T.DirectionalLight(0xffe4bd,2.75);light.position.set(-3,6,5);scene.add(light);
  const root=group(scene),body=group(root);
  root.rotation.set(-.24,-.27,.049);
  const shell=mat(0x39434b,.35,.64),face=mat(0x37434c,.48,.53),edge=mat(0x859099,.31,.74),grip=mat(0xd9422f,.264,.30),gripRing=mat(0x9e291f,.36,.36);
  plate(body,4.68,3.79,.65,.34,M.black,0,0,-.43);
  plate(body,4.66,3.77,.25,.33,edge,0,0,-.115);
  plate(body,4.55,3.65,.24,.29,shell,0,0,.032);
  plate(body,4.16,3.27,.059,.20,M.rubber,0,0,.170);
  plate(body,4.09,3.20,.075,.17,face,0,0,.188);
  function screw(x,y){
    const screw=cyl(body,x,y,.268,.095,.11,.047,M.metal,16);screw.rotation.x=Math.PI/2;
    const slot=box(body,x,y,.298,.115,.021,.010,M.graphite);slot.rotation.z=x+y;
  }
  for(const x of [-2.02,2.02])for(const y of [-1.55,1.55])screw(x,y);
  plate(body,1.91,2.53,.07,.32,edge,.30,-.06,.243);
  plate(body,1.77,2.41,.09,.26,M.black,.30,-.06,.281);
  plate(body,1.37,2.15,.067,.21,M.rubber,.30,-.06,.321);
  for(let j=0;j<13;j++){const y=-1.03+j*.154;
    box(body,.3,y,.363,1.21,.064,.029,M.graphite);
  }
  for(const x of [-.74,1.34]){
    plate(body,.09,2.13,.038,.04,M.metal,x,-.06,.28);
    for(let j=0;j<7;j++){box(body,x+(x<0?-.17:.17),-.97+j*.305,.271,j%3===0?.21:.115,.026,.015,M.seam);}
  }
  // Inlaid diagonal hazard marks are cut into a narrow bottom lip.
  for(let i=0;i<12;i++){const h=box(body,-1.03+i*.181,-1.52,.245,.098,.158,.025,i%3?M.ochre:M.gold);h.rotation.z=-.55;}
  plate(body,.48,1.63,.048,.11,M.graphite,-1.54,.02,.244);
  const indicators=[];
  for(let j=0;j<5;j++){
    const m=mat(j===0?0xffbf68:0x957245,.32,.4,{emissive:0xe08736,emissiveIntensity:j===0?.7:.05});
    plate(body,.24,.105,.02,.033,m,-1.54,-.50+j*.24,.291);indicators.push(m);
  }
  const warm=mat(0xffce81,.20,.33,{emissive:0xffa546,emissiveIntensity:.9});
  const lamp=cyl(body,-1.54,1.16,.258,.178,.178,.07,M.black,28);lamp.rotation.x=Math.PI/2;
  ell(body,-1.54,1.16,.302,.112,.112,.054,warm);
  for(const x of [-1.76,-1.31])box(body,x,-1.05,.26,.078,.018,.012,M.metal);
  // Pivot cheeks, cross-pin and two rigid fork arms.
  const pivot=group(root,.30,-.75,.40);
  for(const x of [-.59,.59]){
    plate(body,.30,.67,.44,.12,M.steelDark,.30+x,-.79,.41);
    rod(body,[.30+x-.19,-.76,.49],[.30+x+.19,-.76,.49],.17,M.metal,24);
    rod(pivot,[x,-.02,0],[x,1.26,.60],.135,M.metal,24);
    rod(pivot,[x,.02,.012],[x,.32,.163],.162,M.graphite,24);
  }
  const handle=group(pivot,0,1.28,.64),length=2.90;
  const profile=[[0,-length/2],[.21,-length/2],[.274,-1.40],[.315,-1.33],[.34,-1.18],[.345,-.9],[.327,-.76],[.320,.76],[.345,.90],[.34,1.18],[.315,1.33],[.274,1.40],[.21,length/2],[0,length/2]];
  const gripMesh=lathe(handle,profile,grip,56);gripMesh.rotation.z=-Math.PI/2;
  for(const sign of [-1,1]){
    for(let j=0;j<3;j++){const b=cyl(handle,sign*(.95+j*.102),0,0,.346,.346,.019,gripRing,48);b.rotation.z=Math.PI/2;}
    const end=cyl(handle,sign*1.455,0,0,.202,.202,.016,M.graphite,36);end.rotation.z=Math.PI/2;
    const screw=cyl(handle,sign*1.470,0,0,.109,.109,.019,M.metal,6);screw.rotation.z=Math.PI/2;
  }
  bake(body);bake(handle);
  const hit=document.getElementById('control'),finger=document.getElementById('finger');
  const corners=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>new T.Vector3(x*1.5,y*.36,z*.31))));
  const v=new T.Vector3(),box2=new T.Box2(),pt=new T.Vector2();
  function draw(renderer,s,W,H,pixelRatio){
    const portrait=W/H<.8,unit=portrait?Math.min(W*.47,196):Math.min(286,Math.max(184,H*.326));
    const width=Math.round(unit*1.22),height=Math.round(unit*1.0);
    // Isolated viewport for the near-field control, with the same sky reflection.
    const right=portrait?1:14,bottom=portrait?9:12;
    const x=W-width-right,y=bottom;
    cam.aspect=width/height;cam.updateProjectionMatrix();
    pivot.rotation.x=.20+s.lever*1.18;
    root.position.y=-.34-4.75*RocketFlight.smooth(4,71,s.altitude);
    root.rotation.z=.051-s.lever*.015;
    warm.emissiveIntensity=.44+s.lamp*.51+s.hint*.20;
    indicators.forEach((m,j)=>m.emissiveIntensity=(j/5<s.chamber||j===0)?.65+s.lamp*.33:.035);
    const visible=s.altitude<72;
    hit.setAttribute('aria-disabled',String(s.phase!=='pad'||s.opening));
    if(!visible){hit.style.display='none';finger.style.opacity='0';return;}
    renderer.setViewport(x*pixelRatio,y*pixelRatio,width*pixelRatio,height*pixelRatio);renderer.setScissor(x*pixelRatio,y*pixelRatio,width*pixelRatio,height*pixelRatio);renderer.setScissorTest(true);renderer.clearDepth();renderer.render(scene,cam);renderer.setScissorTest(false);
    handle.updateWorldMatrix(true,false);box2.makeEmpty();
    for(const p of corners){
      v.copy(p).applyMatrix4(handle.matrixWorld).project(cam);
      pt.set(x+(v.x+1)*width/2,H-y-(v.y+1)*height/2);box2.expandByPoint(pt);
    }
    const size=box2.getSize(pt),pad=Math.max(7,(46-size.y)/2);
    hit.style.display='block';hit.style.left=(box2.min.x-6)+'px';hit.style.top=(box2.min.y-pad)+'px';hit.style.width=(size.x+12)+'px';hit.style.height=(size.y+pad*2)+'px';
    finger.style.left=(box2.min.x+size.x*.70+9*(1-s.hint))+'px';
    finger.style.top=(box2.max.y+14-19*s.hint)+'px';
    finger.style.opacity=String(Math.max(0,(s.hint-.16)*.74));
    finger.style.transform='rotate('+(-19+s.hint*9)+'deg) scale('+(1-s.hint*.09)+')';
  }
  return {draw};
}
function instruments(){
  const canvas=document.getElementById('telemetry'),ctx=canvas.getContext('2d');
  const nodes=[...document.querySelectorAll('.chapter')],shutter=document.getElementById('shutter');
  function line(x,y,X,Y,color,width=1){
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function draw(s){
    const d=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(144*d)){canvas.width=Math.round(144*d);canvas.height=Math.round(65*d);}
    ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,144,65);
    const g=ctx.createLinearGradient(0,0,110,65);g.addColorStop(0,'rgba(46,60,70,.88)');g.addColorStop(1,'rgba(24,38,48,.82)');
    ctx.beginPath();ctx.roundRect(1,3,141,59,14);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(206,219,225,.36)';ctx.lineWidth=1;ctx.stroke();
    const cx=34,cy=33,angle=(a,r)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r];
    ctx.beginPath();ctx.arc(cx,cy,22.3,0,Math.PI*2);ctx.strokeStyle='#9ca5a64f';ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,19,Math.PI*.78,Math.PI*2.22);ctx.lineWidth=1.3;ctx.strokeStyle='#93a3af';ctx.stroke();
    for(let j=0;j<15;j++){const a=(.78+1.44*j/14)*Math.PI;line(...angle(a,19),...angle(a,j%2?16:14.5),j>11?'#e3b480':'#b7c6cf',1.1);}
    let a=(.79+1.38*Math.min(1,s.thrust/(1100*9.81*1.4)))*Math.PI;
    line(...angle(a,-3),...angle(a,14),'#ffbb76',1.8);
    ctx.beginPath();ctx.arc(cx,cy,2.7,0,Math.PI*2);ctx.fillStyle='#bec9cd';ctx.fill();
    line(63,15,63,49,'#72808b55');
    // A tank pictogram and six amber glass segments indicate remaining propellant.
    line(76,20,86,20,'#c0cbd0',1.4);ctx.strokeStyle='#c0cbd0';ctx.lineWidth=1.3;ctx.strokeRect(76,22,10,9);
    line(90,28,129,28,'#a3b4be63',1);
    const remaining=(s.upperFuel+(s.detached?0:s.fuel))/910;
    for(let i=0;i<7;i++){ctx.fillStyle=i/7<remaining?'#e4bd83':'#60717c';ctx.beginPath();ctx.roundRect(76+i*7.6,37,5.1,7.8,1);ctx.fill();}
    const active=s.released?2:s.cloudPassed?1:0;
    nodes.forEach((n,i)=>{n.classList.toggle('active',i===active);n.classList.toggle('done',i<active);});
    shutter.style.opacity=s.shutter.toFixed(4);
  }
  return {draw};
}
