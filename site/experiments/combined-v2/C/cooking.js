const Cooking=(()=>{
  const {T,PI,TAU,rand,group,mat,glaze,mesh,ball,box,rounded,lathe,tube,ring,rod,texture,cloth,M,grain}=Studio;
  const P=PancakePhysics;
  const transfer=texture(1024,320,(c,w,h)=>{
    c.fillStyle='#f6ecd6';c.fillRect(0,0,w,h);
    for(const [y,th] of [[13,3],[22,12],[42,3],[55,2],[230,3],[242,7],[261,2],[303,6]]){
      c.fillStyle='#46618a';c.fillRect(0,y,w,th);
    }
    const pen='#4b6487';
    function leaf(x,y,a,l,w){
      c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(0,0);
      c.quadraticCurveTo(l*.35,-w,l,0);c.quadraticCurveTo(l*.47,w*.72,0,0);c.fillStyle=pen;c.fill();
      c.strokeStyle='#e5dfc9';c.lineWidth=1;c.beginPath();c.moveTo(3,0);c.lineTo(l*.8,-1);c.stroke();c.restore();
    }
    for(let i=0;i<8;i++){
      c.save();c.translate(i*128,0);
      c.strokeStyle=pen;c.lineWidth=2.4;c.beginPath();c.moveTo(0,182);c.bezierCurveTo(39,201,74,140,128,182);c.stroke();
      for(const [x,y,a] of [[14,183,-1.8],[31,182,-.88],[49,174,1.74],[69,168,-1.25],[89,169,.85],[109,173,-.74]])leaf(x,y,a,20,5);
      c.beginPath();c.moveTo(53,174);c.quadraticCurveTo(49,151,58,132);c.stroke();
      for(let j=0;j<7;j++){
        const a=j*TAU/7;leaf(59+Math.cos(a)*3,122+Math.sin(a)*3,a,16,6);
      }
      c.fillStyle=pen;c.beginPath();c.arc(59,122,4,0,TAU);c.fill();
      for(const [x,y] of [[19,110],[90,137],[102,99]]){c.fillStyle='#79869b';c.beginPath();c.arc(x,y,2.3,0,TAU);c.fill();}
      c.restore();
    }
  });
  const china=mat(0xffffff,.2,0,{map:transfer});
  const dough=mat(0xf2d69a,.78), flourMat=mat(0xf2e5c7,.94,0,{bumpMap:grain,bumpScale:.006});
  const milk=glaze(0xfaf0d4,.2,.13), honey=glaze(0x96501d,.12,.75), butterMat=mat(0xf0cb65,.52);
  function bowl(g){
    const root=group(g);
    const contour=[[.24,.015],[.287,.02],[.294,.044],[.278,.066],[.319,.085],[.388,.123],[.464,.185],[.539,.272],[.591,.351],[.623,.427],[.647,.46],[.652,.477]];
    const outer=lathe(root,0,0,0,contour,china,104);
    const uv=outer.geometry.attributes.uv,pos=outer.geometry.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setY(i,pos.getY(i)/.49);
    lathe(root,0,0,0,[[.652,.477],[.645,.487],[.628,.488],[.616,.478],[.605,.44],[.568,.354],[.517,.279],[.442,.196],[.368,.138],[.265,.101],[.14,.09],[0,.089]],M.porcelain,104);
    ring(root,0,.48,0,.641,.0065,M.blue);ring(root,0,.052,0,.284,.004,M.blue);
    const food=group(root,0,.30,0);
    const rp=[],ruv=[],ri=[],rc=[];
    for(let ring=0;ring<=10;ring++)for(let sector=0;sector<=72;sector++){
      const a=sector*TAU/72,r=.532*ring/10,x=r*Math.cos(a),z=r*Math.sin(a);
      rp.push(x,0,z);ruv.push(.5+x*.9,.5+z*.9);rc.push(1,1,1);
      if(ring<10&&sector<72){const i=ring*73+sector;ri.push(i,i+1,i+73,i+1,i+74,i+73);}
    }
    const liquidGeo=new T.BufferGeometry();
    liquidGeo.setAttribute('position',new T.Float32BufferAttribute(rp,3));liquidGeo.setAttribute('uv',new T.Float32BufferAttribute(ruv,2));
    liquidGeo.setAttribute('color',new T.Float32BufferAttribute(rc,3));liquidGeo.setIndex(ri);liquidGeo.computeVertexNormals();
    const liquid=mesh(food,liquidGeo,mat(0xffffff,.30,0,{vertexColors:true}));
    const heapGeo=new T.SphereGeometry(1,72,42),p=heapGeo.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const n=.05*Math.sin(15*x+9*z)*Math.cos(11*z-3*y)+.027*Math.sin(x*25+y*17)+.018*rand();
      p.setXYZ(i,x*(1+n),y+n*.6,z*(1+n));
    }
    heapGeo.computeVertexNormals();
    const heap=mesh(food,heapGeo,flourMat,-.077,.024,-.015);heap.scale.set(.39,.161,.336);
    const clumps=[];
    for(let i=0;i<28;i++){
      const a=rand()*TAU,r=.30+rand()*.19;
      const sz=.009+rand()*.028;
      clumps.push(ball(food,r*Math.cos(a),.005,r*Math.sin(a),sz,.005+sz*.31,sz*.73,flourMat));
    }
    const swirls=[];
    for(let i=0;i<3;i++){
      const ps=[];
      for(let j=0;j<24;j++){const a=j*.19+i*2.1,r=.13+j*.011;ps.push([Math.cos(a)*r,.003,Math.sin(a)*r]);}
      swirls.push(tube(food,ps,.0045,mat(0xe3c995,.57),36,6));
    }
    const whisk=group(root,.085,.45,.016);
    for(let i=0;i<9;i++){
      const a=i*PI/9,r=.127,ps=[];
      for(let k=0;k<=24;k++){const f=k/24,ang=f*TAU,rr=r*Math.sin(ang)*(.56+.44*Math.sin(f*PI));ps.push([Math.cos(a)*rr,-.29*Math.sin(f*PI)**1.32,Math.sin(a)*rr]);}
      tube(whisk,ps,.0062,M.steel,32,8);
    }
    lathe(whisk,0,0,0,[[.021,-.024],[.032,-.008],[.034,.113],[.03,.129]],M.steel,32);
    lathe(whisk,0,.095,0,[[.029,0],[.036,.018],[.042,.06],[.049,.26],[.052,.37],[.047,.417],[.036,.431],[.015,.438]],M.walnut,48);
    for(const y of [.118,.137,.484])ring(whisk,0,y,0,y>.4?.05:.037,.003,M.brass);
    whisk.rotation.z=-.71;whisk.rotation.x=.12;
    return {root,food,liquid,heap,clumps,swirls,whisk};
  }
  const flourColor=new T.Color(0xfaf0d4),batterColor=new T.Color(0xe9ca91),wetColor=new T.Color();
  function mixSurface(bowl,b) {
    const geo=bowl.liquid.geometry,pos=geo.attributes.position,colors=geo.attributes.color;
    let dry=0;
    for(let i=0;i<pos.count;i++){
      const r=Math.floor(i/73)/10,u=(i%73)/6,zone=Math.floor(u)%12,v=u-Math.floor(u);
      const a=b.zones[zone],next=b.zones[(zone+1)%12],localDry=a.dry*(1-v)+next.dry*v;
      const h=a.surface*(1-v)+next.surface*v,radial=Math.sin(r*PI);
      pos.setY(i,h*radial+.0023*r**9+.00032*b.swirl*b.swirl*(r*r-.6));
      wetColor.copy(batterColor).lerp(flourColor,localDry);
      colors.setXYZ(i,wetColor.r,wetColor.g,wetColor.b);dry+=localDry;
    }
    pos.needsUpdate=colors.needsUpdate=true;geo.computeVertexNormals();
    bowl.liquid.material.roughness=.78-.51*dry/pos.count;
  }
  function jug(g,small=false){
    const root=group(g), p=small?.72:1;root.scale.setScalar(p);
    const glazeMat=small?glaze(0xb57c42,.24,.18):M.white;
    const form=lathe(root,0,0,0,[[.13,.006],[.167,.011],[.19,.044],[.208,.156],[.198,.25],[.157,.34],[.143,.388],[.151,.439],[.146,.45],[.135,.443],[.127,.389],[.142,.342],[.178,.25],[.186,.162],[.17,.048],[.06,.033]],glazeMat,72);
    const v=form.geometry.attributes.position;
    for(let i=0;i<v.count;i++){
      const y=v.getY(i),x=v.getX(i),z=v.getZ(i),f=Math.max(0,(y-.33)/.12)*Math.max(0,-x/.15)**3;
      v.setXYZ(i,x-f*.09,y+f*.026,z);
    }
    form.geometry.computeVertexNormals();
    tube(root,[[.147,.371,0],[.263,.389,0],[.306,.330,0],[.288,.229,0],[.187,.15,0]],.025,glazeMat,30,12);
    ring(root,0,.043,0,.185,.004,small?M.brass:M.blue);
    ball(root,0,.365,0,.133,.012,.133,small?honey:milk);
    return root;
  }
  function plate(g,r=.81,trim=true){
    const p=group(g);const shell=lathe(p,0,0,0,[[.37,.009],[.412,.009],[.43,.024],[.54,.026],[.69,.057],[.787,.084],[.802,.094],[.797,.105],[.782,.108],[.69,.088],[.53,.048],[.38,.041],[0,.040]],M.white,104);
    const v=shell.geometry.attributes.position;
    for(let i=0;i<v.count;i++){
      const x=v.getX(i),z=v.getZ(i),rr=Math.hypot(x,z),a=Math.atan2(z,x),d=Math.max(0,rr-.56)*.046*Math.cos(a*24);
      v.setXYZ(i,x*(1+d),v.getY(i)+d*.34,z*(1+d));
    }
    shell.geometry.computeVertexNormals();
    if(trim){ring(p,0,.095,0,.737,.003,M.blue);ring(p,0,.091,0,.718,.0027,M.blue);}
    p.scale.setScalar(r/.81);return p;
  }
  function pan(g){
    const root=group(g);
    const cooktop=rounded(root,0,.089,-.014,1.48,.134,1.38,.08,mat(0x778f85,.36));
    for(const x of [-.51,.51])for(const z of [-.46,.46])ball(root,x,.024,z,.076,.033,.073,M.iron);
    const knob=group(root,.43,.082,.71);
    rod(knob,[0,0,0],[0,0,.067],.070,M.brass);
    const notch=box(knob,0,.035,.071,.008,.026,.003,M.iron);
    ring(root,0,.166,0,.52,.025,M.iron);
    const panG=group(root,0,.17,0);
    lathe(panG,0,0,0,[[.46,0],[.534,.008],[.625,.029],[.70,.081],[.744,.135],[.738,.146],[.724,.15],[.713,.141],[.682,.095],[.62,.05],[.54,.032],[0,.031]],M.iron,100);
    ring(panG,0,.140,0,.738,.006,M.steel);
    const handle=group(panG,.635,.074,.08);handle.rotation.y=-.47;handle.rotation.z=.085;
    rod(handle,[0,0,0],[.29,.02,0],.043,M.steel,.038);
    const grip=lathe(handle,.24,.02,0,[[.042,0],[.062,.027],[.058,.13],[.053,.36],[.063,.44],[.058,.48],[.042,.5]],M.walnut,40);grip.rotation.z=-PI/2;
    return {root,knob,notch};
  }
  function spoon(g,isSpatula){
    const root=group(g);
    if(isSpatula){
      const blade=rounded(root,0,0,0,.28,.32,.014,.039,M.steel);
      blade.rotation.x=PI*.43;
      rod(root,[0,.03,-.11],[.012,.22,-.29],.017,M.steel);
      rod(root,[.012,.22,-.29],[.014,.51,-.54],.034,M.walnut,.047);
      for(let i=-1;i<2;i++){
        const slot=rounded(root,i*.059,.023,-.02,.012,.166,.002,.005,M.iron);
        slot.rotation.x=PI*.43;
      }
    }else{
      lathe(root,0,0,0,[[0,-.117],[.065,-.102],[.118,-.061],[.138,-.007],[.133,.002],[.127,-.008],[.112,-.054],[.061,-.09],[0,-.103]],M.steel,64);
      tube(root,[[.112,-.021,0],[.17,.053,0],[.23,.184,0],[.29,.304,0]],.015,M.steel);
      rod(root,[.265,.255,0],[.414,.566,0],.034,M.walnut,.039);
      ring(root,0,-.002,0,.135,.004,M.steel);
    }
    return root;
  }
  function berry(g){
    const root=group(g),ns=88,nt=52,verts=[],ix=[],seeds=[];
    const red=mat(0xcc3524,.40,0,{vertexColors:true}),colors=[];
    function shape(t,a){
      const r=.162*Math.sin(PI*t)**.65*(.49+.9*t)*(1+.027*Math.cos(3*a));
      return [r*Math.cos(a),t*.36,r*Math.sin(a)];
    }
    for(let row=0;row<9;row++){const t=.10+row*.094,n=Math.round(5+Math.sin(t*PI)*10);
      for(let j=0;j<n;j++)seeds.push({t:t+(rand()-.5)*.016,a:(j+.5*(row%2))*TAU/n+(rand()-.5)*.05});
    }
    for(let k=0;k<=nt;k++)for(let j=0;j<=ns;j++){
      const t=k/nt,a=j*TAU/ns;
      let pit=0;
      for(const sd of seeds){if(Math.abs(sd.t-t)>.095)continue;
        const da=Math.atan2(Math.sin(a-sd.a),Math.cos(a-sd.a));
        pit=Math.max(pit,Math.exp(-((t-sd.t)**2/.00067+da*da/.008)));
      }
      const [x,y,z]=shape(t,a),f=1-.079*pit;
      verts.push(x*f,y,z*f);colors.push(.80+.19*t-.12*pit,.62+.31*t,.56+.35*t);
      if(j<ns&&k<nt){const i=k*(ns+1)+j;ix.push(i,i+ns+1,i+1,i+1,i+ns+1,i+ns+2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(ix);geo.computeVertexNormals();mesh(root,geo,red);
    const seedMesh=new T.InstancedMesh(new T.SphereGeometry(1,6,5),mat(0xd99c50,.48),seeds.length),dummy=new T.Object3D();
    seeds.forEach((s,i)=>{const [x,y,z]=shape(s.t,s.a);dummy.position.set(x*.955,y,z*.955);dummy.scale.set(.003,.0061,.003);dummy.updateMatrix();seedMesh.setMatrixAt(i,dummy.matrix);});root.add(seedMesh);
    const green=mat(0x517b35,.60);
    for(let i=0;i<7;i++){
      const a=i*TAU/7;
      const leaf=ball(root,Math.cos(a)*.053,.339,Math.sin(a)*.053,.079,.011,.027,green);
      leaf.rotation.y=-a;leaf.rotation.z=-.29;
    }
    tube(root,[[0,.343,0],[.013,.38,.005],[.032,.398,-.001]],.009,green);
    return root;
  }
  const breadTex=texture(256,256,(c,w,h)=>{
    c.fillStyle='#fffaf1';c.fillRect(0,0,w,h);
    for(let i=0;i<4900;i++){const x=rand()*w,y=rand()*h,r=rand()**3*3+.20;
      c.fillStyle='rgba(104,64,30,'+(.025+rand()*.18)+')';c.beginPath();c.ellipse(x,y,r,r*.74,rand()*PI,0,TAU);c.fill();}
  });
  function cakeModel(g){
    const root=group(g),n=72,nr=11,verts=[],uv=[],colors=[],indices=[];
    // Two gridded faces with an independent strip of baked crumb at the rim.
    for(let a=0;a<=n;a++){
      const angle=TAU*a/n;
      for(let j=0;j<2*(nr+1);j++){
        const r=j<=nr?j/nr:(2*nr+1-j)/nr, x=r*Math.cos(angle),z=r*Math.sin(angle);
        verts.push(x,0,z);uv.push(.5+x*.48,.5+z*.48);colors.push(1,1,1);
      }
    }
    const stride=2*(nr+1);
    for(let a=0;a<n;a++)for(let j=0;j<stride-1;j++){
      const k=a*stride+j;indices.push(k,k+stride,k+1,k+1,k+stride,k+stride+1);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);
    const surface=mat(0xffffff,.78,0,{map:breadTex,vertexColors:true,side:T.DoubleSide,bumpMap:breadTex,bumpScale:.003});
    const disk=mesh(root,geo,surface);geo.boundingSphere=new T.Sphere(new T.Vector3(),2);
    const bubG=new T.SphereGeometry(1,12,8),bubbles=new T.InstancedMesh(bubG,glaze(0xf2d390,.46,.12),24);
    const holes=new T.InstancedMesh(bubG,mat(0xbe985f,.85),24);
    root.add(bubbles,holes);bubbles.frustumCulled=holes.frustumCulled=false;
    const cutGeometry=new T.BufferGeometry(),cutCount=2*nr*6;
    cutGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(cutCount*3),3));
    cutGeometry.setAttribute('uv',new T.BufferAttribute(new Float32Array(cutCount*2),2));
    const cut=mesh(root,cutGeometry,mat(0xe9c690,.86,0,{map:breadTex,bumpMap:breadTex,bumpScale:.004,side:T.DoubleSide}));
    cut.frustumCulled=false;cut.visible=false;
    return {root,disk,geo,bubbles,holes,cut,n,nr,stride,height:.09};
  }
  const palette=[0xf2d79b,0xf2d79b,0xe6ba73,0xbd8547,0x865027,0x52301f].map(v=>new T.Color(v));
  const stops=[0,.018,.15,.39,.72,1];
  function toastColor(out,b) {
    const k=b<=stops[1]?0:b<=stops[2]?1:b<=stops[3]?2:b<=stops[4]?3:4;
    return out.copy(palette[k]).lerp(palette[k+1],P.clamp((b-stops[k])/(stops[k+1]-stops[k]),0,1));
  }
  const dummy=new T.Object3D(),col=new T.Color();
  function sampleCake(c,r,a,field,f){
    const ring=r<=.22?0:r<.62?0:r<.9?1:2,next=Math.min(2,ring+1);
    const mix=ring===0?P.clamp((r-.22)/.4,0,1):P.clamp((r-.62)/.28,0,1);
    const u=(a/TAU*8+8)%8,i=Math.floor(u),v=u-i,j=(i+1)%8;
    function val(k){const q=c.cells[k][field];return f===undefined?q:q[f];}
    const a1=val(ring*8+i)*(1-v)+val(ring*8+j)*v,a2=val(next*8+i)*(1-v)+val(next*8+j)*v;
    return a1*(1-mix)+a2*mix;
  }
  function surfaceHeight(c,r,a){
    return .115*(sampleCake(c,r,a,'thickness')+sampleCake(c,r,a,'rise'))*(1-.32*r**6);
  }
  function updateCake(m,c,missing=0){
    const {geo,n,nr,stride}=m,pos=geo.attributes.position,colors=geo.attributes.color;
    const top=1-c.contact,radius=c.radius*.115;
    let mx=0;
    for(let k=0;k<=n;k++){
      const a=k/n*TAU,cs=Math.cos(a),sn=Math.sin(a),shape=1+.012*Math.cos(3*a+c.id)+.009*Math.sin(7*a+c.id);
      for(let j=0;j<stride;j++){
        const upper=j<=nr,r=upper?j/nr:(2*nr+1-j)/nr,f=upper?top:c.contact;
        const rr=r*radius*shape, h=surfaceHeight(c,r,a);
        const mottling=.045*Math.sin(13*r+5*cs)*Math.cos(17*r*sn)+.036*Math.cos(rr*24-r*sn*6);
        const b=sampleCake(c,r,a,'brown',f);
        const cooked=P.clamp(b*(1+mottling*3.6)*(1-.48*r**9),0,1);
        toastColor(col,cooked);
        col.multiplyScalar(.994+.025*mottling+.017*Math.sin(cs*22*r)*Math.cos(sn*r*18));
        colors.setXYZ(k*stride+j,col.r,col.g,col.b);
        pos.setXYZ(k*stride+j,rr*cs,upper?h+(.0013+b*.0008)*mottling*6:.002+r**5*.006,rr*sn);
        mx=Math.max(mx,h);
      }
    }
    pos.needsUpdate=colors.needsUpdate=true;geo.computeVertexNormals();geo.setDrawRange(missing*(n/3)*(stride-1)*6,(n-missing*n/3)*(stride-1)*6);m.height=mx;
    m.cut.visible=missing>0&&missing<3;
    if(m.cut.visible){
      const cut=m.cut.geometry,cp=cut.attributes.position,uv=cut.attributes.uv;
      let k=0;
      for(const sector of [0,missing*n/3])for(let j=0;j<nr;j++){
        for(const [ring,upper] of [[j,0],[j,1],[j+1,1],[j,0],[j+1,1],[j+1,0]]){
          const idx=sector*stride+(upper?ring:stride-1-ring);
          cp.setXYZ(k,pos.getX(idx),pos.getY(idx),pos.getZ(idx));uv.setXY(k,ring/nr,upper*.11);k++;
        }
      }
      cp.needsUpdate=uv.needsUpdate=true;cut.computeVertexNormals();
    }
    c.cells.forEach((q,i)=>{
      const a=q.theta+(q.ring%2)*.19+.075*Math.sin(q.births*2.13+i),r=q.r,rr=r*radius;
      const b=q.bubble*.16;
      dummy.position.set(rr*Math.cos(a),surfaceHeight(c,r,a)+.001,rr*Math.sin(a));
      const visible=c.flips===0&&c.volume>2&&missing===0;
      dummy.scale.setScalar(visible?b:.000001);dummy.scale.y*=.49;dummy.updateMatrix();m.bubbles.setMatrixAt(i,dummy.matrix);
      dummy.scale.setScalar(visible&&q.pops>0&&!q.bubble?.011:.000001);dummy.scale.y*=.09;dummy.updateMatrix();m.holes.setMatrixAt(i,dummy.matrix);
    });
    m.bubbles.instanceMatrix.needsUpdate=m.holes.instanceMatrix.needsUpdate=true;
  }
  function butter(g){
    const o=rounded(g,0,0,0,.254,.072,.202,.017,butterMat);o.rotation.y=-.29;
    return o;
  }
  function basin(g){
    const root=group(g);lathe(root,0,0,0,[[.49,0],[.61,.009],[.68,.047],[.767,.218],[.77,.238],[.75,.245],[.724,.23],[.654,.08],[.57,.044],[0,.04]],mat(0xb2c4b8,.29,.22));
    ring(root,0,.24,0,.758,.012,M.white);return root;
  }
  return {bowl,mixSurface,jug,pan,plate,spoon,berry,cakeModel,updateCake,surfaceHeight,butter,basin,flourMat,dough,milk,honey};
})();
