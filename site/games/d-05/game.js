'use strict';
(()=>{
  const {T,canvas,renderer,scene,camera,V,m,mat,group,mesh,ell,ring,rand,sun}=Studio;
  const {K,CX,CZ,Y,R,A,B,boat,ball,buckets,rotor,wheelAnchor,plugAnchor,plugPoint,stopper,pull,chain,drain,jetOrigin}=Bathroom;
  const game=BathPhysics.createGame(),s=game.state,{NX,NZ,H}=BathPhysics;
  window.__GAME__={step:game.step,getState:game.getState};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),tau=Math.PI*2,mix=(a,b,v)=>a+(b-a)*v;
  function grid(cols,rows,ma){
    const g=new T.BufferGeometry(),p=new T.BufferAttribute(new Float32Array(cols*rows*3),3),uv=[],idx=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      uv.push(i/(cols-1),j/(rows-1));
      if(i&&j){const k=j*cols+i;idx.push(k-cols-1,k-1,k,k-cols-1,k,k-cols);}
    }
    g.setAttribute('position',p.setUsage(T.DynamicDrawUsage));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
    const o=mesh(g,ma);o.castShadow=false;o.frustumCulled=false;
    return {o,update(fn){for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const pos=fn(i,j);p.setXYZ(j*cols+i,...pos);}p.needsUpdate=true;g.computeVertexNormals();}};
  }
  function liquid(color,alpha){
    return new T.MeshPhysicalMaterial({color,roughness:.12,roughnessMap:m.glass.roughnessMap,metalness:.11,
      transparent:true,opacity:alpha,clearcoat:.93,clearcoatRoughness:.08,ior:1.333,envMapIntensity:1.18,side:T.DoubleSide,depthWrite:false});
  }
  const water=liquid(0x81ccc6,.64);
  water.onBeforeCompile=sh=>{
    sh.vertexShader='varying vec3 bathCoord;\n'+sh.vertexShader;
    sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbathCoord=position;');
    sh.fragmentShader='varying vec3 bathCoord;\n'+sh.fragmentShader;
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ca=sin(bathCoord.x*12.+bathCoord.y*10.+sin(bathCoord.z*9.1))+sin(bathCoord.z*16.-bathCoord.x*2.2+bathCoord.y*17.);
      diffuseColor.rgb+=vec3(.045,.065,.044)*smoothstep(1.52,1.92,ca);`);
  };
  const surface=grid(NX,NZ,water);surface.o.renderOrder=3;
  const inside=liquid(0xafdcd4,.67),front=liquid(0x8dcccb,.71),wetMat=liquid(0x8fc9be,.55);
  const jet=grid(13,s.jet.length+1,inside);jet.o.renderOrder=4;
  const curtains=s.rim.map(()=>grid(5,17,front)),runoff=grid(7,s.floor.length+1,wetMat);
  runoff.o.renderOrder=2;
  const swirlMa=liquid(0xd4f1db,.8),swirls=Array.from({length:3},()=>grid(2,32,swirlMa));
  const wetCells=s.floor.map((c,i)=>{const ma=liquid(0x91bfb1,.1),o=ell(0,0,0,.1,.003,.1,ma);o.castShadow=false;o.renderOrder=1;return o;});
  const tinyDrop=liquid(0xb5e8de,.86),dropGeo=new T.SphereGeometry(1,9,7);
  const drops=new T.InstancedMesh(dropGeo,tinyDrop,s.drops.length);drops.frustumCulled=false;drops.renderOrder=6;scene.add(drops);
  const pearl=ell(jetOrigin.x,jetOrigin.y-.054,jetOrigin.z,.047,.078,.047,tinyDrop);pearl.castShadow=false;
  const glance=mat(0xffe5a0,.26,.12,{transparent:true,opacity:.7,emissive:0xffc46b,emissiveIntensity:.36,depthWrite:false});
  const halo=group();const haloRing=mesh(new T.TorusGeometry(.293,.011,8,64),glance,halo);haloRing.castShadow=false;
  for(let i=0;i<3;i++){const a=.62+i*.21,o=ell(.294*Math.cos(a),.294*Math.sin(a),.002,.027-i*.005,.027-i*.005,.015,glance,halo);o.castShadow=false;}
  // Cast resin pointer figurine. Its raised index meets only the current control.
  const hand=group(),handMa=mat(0xfff4d5,.39,0,{transparent:true,opacity:0,depthWrite:false,emissive:0xffe7b4,emissiveIntensity:.14});
  const sh=new T.Shape();sh.moveTo(-.045,.214);sh.bezierCurveTo(-.044,.282,.042,.286,.049,.218);
  sh.lineTo(.055,.065);sh.bezierCurveTo(.070,.107,.123,.102,.14,.056);sh.bezierCurveTo(.16,.086,.203,.067,.209,.023);sh.bezierCurveTo(.249,.049,.279,.01,.269,-.046);
  sh.lineTo(.246,-.18);sh.quadraticCurveTo(.24,-.218,.213,-.239);sh.lineTo(.187,-.287);sh.lineTo(.044,-.287);sh.lineTo(.02,-.228);
  sh.lineTo(-.113,-.11);sh.bezierCurveTo(-.164,-.05,-.116,-.015,-.071,-.05);sh.lineTo(-.036,-.078);sh.closePath();
  const fingertip=mesh(new T.ExtrudeGeometry(sh,{depth:.029,bevelEnabled:true,bevelSize:.012,bevelThickness:.014,bevelSegments:3,curveSegments:10}),handMa,hand);
  fingertip.rotation.z=.62;fingertip.scale.setScalar(1.24);fingertip.castShadow=false;fingertip.renderOrder=9;
  const mist=s.motes.map((p,i)=>{
    const ma=mat(p.steam?0xfff7e3:0xfff1ce,.85,0,{transparent:true,depthWrite:false,opacity:0,
      emissive:p.steam?0xfff2da:0xffdfa1,emissiveIntensity:.30});
    if(p.steam)ma.onBeforeCompile=sh=>{
      sh.fragmentShader=sh.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=pow(abs(dot(normalize(vNormal),normalize(vViewPosition))),2.5);');
    };
    const o=ell(0,0,0,1,1,1,ma);o.castShadow=false;o.receiveShadow=false;o.renderOrder=7;return o;
  });
  const splashPath=new T.CatmullRomCurve3([V(.71,.058,1.35),V(.77,.061,1.46),V(1.1,.06,1.59),V(1.45,.061,1.65),V(1.78,.065,1.75),V(1.96,.083,1.83),V(1.96,.083,1.97),V(drain.x,.084,drain.z)]);
  const tmp=new T.Object3D(),points=[];
  for(let i=0;i<=s.floor.length;i++){
    const u=i/s.floor.length,p=splashPath.getPointAt(u),v=splashPath.getTangentAt(u);points.push([p.x,p.z,-v.z,v.x,p.y]);
  }
  function fluid(){
    surface.o.visible=s.level>.00015;
    if(surface.o.visible){
      const frac=Math.min(1,s.level/H),broad=clamp((s.level-H)/.0021,0,1),a=mix((.243+.044*frac)*K,A+.02,broad),b=mix((.122+.026*frac)*K,B+.024,broad);
      water.opacity=clamp(.21+s.level*3.9,.21,.67);
      surface.update((i,j)=>{
        const u=i/(NX-1)*2-1,v=j/(NZ-1)*2-1,edge=Math.max(Math.abs(u),Math.abs(v));
        const k=edge?edge/(Math.abs(u)**3.6+Math.abs(v)**3.6)**(1/3.6):1;
        const cell=s.surface[j*NX+i],crest=s.rim[clamp(i-7,0,6)].crest*(v>0?1:.65)*edge**9;
        return [CX+u*k*a,Y+Math.max(.0006,s.level+cell.h+crest+(.0005+.0026*broad)*edge**8)*K,CZ+v*k*b];
      });
    }
    jet.o.visible=s.jet.some(q=>q>.000018);
    const jetBase=Y+s.level*K+.006,fall=jetOrigin.y-jetBase;
    if(jet.o.visible)jet.update((i,j)=>{
      const u=j/s.jet.length,angle=i/12*tau,q=j?s.jet[j-1]*(31+(j-1)*2.5):s.discharge;
      const rad=.077*Math.sqrt(Math.max(0,q/.8))/(1+u*.75);
      return [jetOrigin.x+rad*Math.cos(angle),jetOrigin.y-fall*(.45*u+.55*u*u),jetOrigin.z+rad*Math.sin(angle)];
    });
    pearl.position.x=jetOrigin.x+s.beadSway*K;
    pearl.scale.y=.059+s.beadStretch*K;pearl.position.y=jetOrigin.y-pearl.scale.y*.7;
    curtains.forEach((o,i)=>{
      const r=s.rim[i];o.o.visible=r.film>.00004;
      if(!o.o.visible)return;
      const x=.16+i*.191,edgez=CZ+B*(1-(x/A)**3.6)**(1/3.6);
      o.update((col,j)=>{
        const u=j/16,l=col/4-.5,bin=Math.min(6,Math.floor(u*7));
        const width=Math.min(.27,.31*Math.sqrt(r.slices[bin]*(25+bin*6)));
        const floorEnd=clamp((u-.79)/.21,0,1);
        const lateral=CX+x+l*width*(1+u*.5);
        const z=u<.12?mix(edgez-.17,edgez+.045,u/.12):edgez+.045+.18*Math.sqrt((u-.12)/.88);
        return [mix(lateral,points[0][0]+l*width,floorEnd),Math.max(.059,R+.037-Math.max(0,(u-.09)/.70)**1.7*(R-.02))+.012*(1-4*l*l),mix(z,points[0][1],floorEnd)];
      });
    });
    runoff.o.visible=s.floor.some(c=>c.wet>.008);
    if(runoff.o.visible)runoff.update((i,j)=>{
      const [x,z,nx,nz,h]=points[j],c=s.floor[Math.min(s.floor.length-1,j)],l=i/6-.5;
      const w=Math.min(.5,.58*Math.sqrt(c.litres)+.10*c.wet);
      return [x+nx*l*w,h+.018*Math.min(1,c.litres*12)*(1-4*l*l),z+nz*l*w];
    });
    wetCells.forEach((o,i)=>{
      const c=s.floor[i],p=points[i];o.visible=c.wet>.012;if(!o.visible)return;
      o.position.set(p[0],p[4]-.009,p[1]);o.scale.set((.11+.035*(i%3))*c.wet,.004,(.13+.06*(i%4))*c.wet);o.material.opacity=.24*c.wet;
    });
    swirls.forEach((o,k)=>{
      o.o.visible=s.vortex>.009;if(!o.o.visible)return;
      const strength=clamp(s.vortex/3,0,1);o.update((i,j)=>{
        const u=j/31,a=s.vortexAngle*.58+u*3.9+k*tau/3,rad=(.285-.21*u)*(.64+strength*.36)+(i-.5)*.020*strength*Math.sin(Math.PI*u);
        return [drain.x+rad*Math.cos(a),.091+.006*(1-u),drain.z+rad*Math.sin(a)];
      });
    });
    let count=0;s.drops.forEach(d=>{if(!d.active)return;tmp.position.set(CX+d.x*K,Y+d.y*K,CZ+d.z*K);tmp.scale.set(d.r*K,d.r*K*(1+Math.abs(d.vy)*1.4),d.r*K);tmp.updateMatrix();drops.setMatrixAt(count++,tmp.matrix);});drops.count=count;drops.instanceMatrix.needsUpdate=true;
  }
  function toys(){
    s.bodies.forEach((b,i)=>{
      const o=i===0?boat:i===1?ball:buckets[Number(s.big)].g;
      o.position.set(CX+b.x*K,Y+b.y*K+.012,CZ+b.z*K);
      o.rotation.set(b.roll*.55,i===0?.16:i===1?-.23:-.42,b.roll+(i===1?.41:0));
      if(i===2){
        buckets[Number(!s.big)].g.visible=false;o.visible=true;
        const e=clamp(s.exchange,0,1);
        o.position.z-=e*3.42;o.position.y+=1.74*Math.sin(e*Math.PI)+.18*e;o.position.x+=e*.65;
        o.visible=e<.985;buckets[Number(s.big)].handle.rotation.x=-.47+s.hinge+e*.4;
      }
    });
    rotor.rotation.z=-s.valve*1.08+s.air[1].v*.045;
    stopper.position.copy(plugPoint);stopper.position.y+=s.outlet*.36;stopper.rotation.z=-s.outlet*.6;
    pull.position.y=plugAnchor.y+s.outlet*.15;pull.rotation.z=s.outlet*.16;
    chain.children.forEach((o,i)=>{const u=i/16;o.position.y=plugPoint.y+.08+(plugAnchor.y-plugPoint.y-.08)*u**1.75+s.outlet*(.36-.21*u);});
  }
  function controlPoint(name){
    if(name==='tap')return wheelAnchor.clone().add(V(0,0,.09));
    if(name==='plug')return plugAnchor.clone().add(V(0,.13,.02));
    if(name==='bucket')return buckets[Number(s.big)].g.position.clone().add(V(0,s.bodies[2].height*K+.035,0));
    return drain.clone().add(V(0,.06,0));
  }
  function cues(){
    const target=s.next||'drain',p=controlPoint(target);
    halo.visible=!!s.next && s.next!==s.press;halo.position.copy(p);halo.quaternion.copy(camera.quaternion);
    const scale=target==='bucket'?1.55:target==='plug'?.68:1;
    halo.scale.setScalar(scale*(1+s.guide*.048));glance.opacity=.55+.24*s.guide;
    hand.visible=s.guideOpacity>.02&&!!s.next;
    if(hand.visible){
      const right=V(1,0,0).applyQuaternion(camera.quaternion),up=V(0,1,0).applyQuaternion(camera.quaternion),f=V(0,0,1).applyQuaternion(camera.quaternion);
      hand.position.copy(p).addScaledVector(right,.38-.19*s.guide).addScaledVector(up,-.09-.19*s.guide).addScaledVector(f,.34);
      hand.quaternion.copy(camera.quaternion);handMa.opacity=s.guideOpacity*.92;
    }
    mist.forEach((o,i)=>{
      const p=s.motes[i];
      if(p.steam){
        const heat=.33+.67*Math.min(1,s.level/.05);
        o.position.set(CX+(p.x-.5)*3.25,Y+.16+s.level*K+p.y*.94,CZ+(p.z-.5)*1.05);
        o.scale.set(.031+.085*p.y,.079+.14*p.y,.043+.056*p.y);o.rotation.z=p.vx*7;
        o.material.opacity=.078*p.fade*heat;
      }else{
        o.position.set(-2.6+p.x*3.75,1.23+p.y*2.24,-2.08+p.z*2.62);o.scale.setScalar(.005+.004*(i%3));o.material.opacity=p.fade*.56;
      }
    });
    sun.intensity=2.85*s.light;
  }
  const ray=new T.Raycaster(),ndc=new T.Vector2();
  function hit(e){
    const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(ndc,camera);
    const taps=[['tap',controlPoint('tap'),.36],['tap',jetOrigin.clone().add(V(0,.14,0)),.23],['tap',wheelAnchor.clone().add(V(0,.26,-.26)),.28],
      ['plug',controlPoint('plug'),.21],['plug',stopper.position.clone(),.14],['bucket',controlPoint('bucket').add(V(0,-.19,0)),s.big?.55:.46],
      ['boat',boat.position.clone().add(V(0,.24,0)),.40],['ball',ball.position.clone().add(V(0,.22,0)),.25]];
    const px=2*Math.tan(camera.fov*Math.PI/360)/rect.height;
    let nearest=Infinity,target=null;
    for(const [name,center,r] of taps){
      const radius=Math.max(r,Math.min(.46,20*px*camera.position.distanceTo(center)));
      const dist=ray.ray.distanceToPoint(center);
      if(dist>radius)continue;
      const rank=dist/radius-(name===s.next?.33:0);if(rank<nearest){nearest=rank;target=name;}
    }
    return target;
  }
  let pointer=null;
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;const t=hit(e);if(!t)return;
    audio.start();pointer=e.pointerId;canvas.setPointerCapture(pointer);const acted=game.touch(t);
    if(acted)audio.note(t==='plug'?494:659,.12,.044);
  });
  const end=e=>{if(e.pointerId===pointer){pointer=null;game.release();}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  canvas.addEventListener('pointermove',e=>{if(pointer===null&&e.pointerType==='mouse'){canvas.style.cursor=hit(e)?'pointer':'default';}});
  window.addEventListener('blur',()=>{pointer=null;game.release();});
  const audio=(()=>{
    let ctx,master,waterGain,waterFilter,drainGain,acc=0,lastStage='fill',enabled=true;
    function start(){
      if(!ctx){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
        ctx=new AC();master=ctx.createGain();master.gain.value=enabled?.6:0;master.connect(ctx.destination);
        const buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buf.getChannelData(0);let smooth=0;
        for(let i=0;i<data.length;i++){smooth=(smooth+(rand()*2-1)*.22)/1.08;data[i]=smooth;}
        const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;waterFilter=ctx.createBiquadFilter();waterFilter.type='bandpass';waterFilter.Q.value=.67;
        waterGain=ctx.createGain();waterGain.gain.value=0;src.connect(waterFilter).connect(waterGain).connect(master);
        const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=430;drainGain=ctx.createGain();drainGain.gain.value=0;src.connect(low).connect(drainGain).connect(master);src.start();
      }
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    }
    function note(freq,len,amp,delay=0){
      if(!ctx||!enabled)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.setValueAtTime(freq*.986,t);o.frequency.exponentialRampToValueAtTime(freq,t+.025);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+len);
      o.connect(g).connect(master);o.start(t);o.stop(t+len+.03);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    function update(dt){
      if(!ctx)return;const now=ctx.currentTime,flow=s.rim.reduce((a,r)=>a+r.q,0);
      waterGain.gain.setTargetAtTime(Math.min(.64,s.discharge*.46+flow*.27),now,.05);
      waterFilter.frequency.setTargetAtTime(1250+s.level*5100+flow*180,now,.12);
      drainGain.gain.setTargetAtTime(.21*s.drainFlow+.028*s.vortex,now,.1);
      acc+=dt*(s.discharge*2.2+flow*3+s.drainFlow*.68);
      if(acc>1){acc%=1;note(570+rand()*440,.07+rand()*.12,.015);}
      if(lastStage!==s.stage){
        if(s.stage==='reward')[659.25,830.61,987.77,1318.51].forEach((f,i)=>note(f,.71,.075,i*.155));
        if(s.stage==='exchange')[783.99,987.77,1174.66].forEach((f,i)=>note(f,.64,.05,i*.18));lastStage=s.stage;
      }
    }
    document.getElementById('sound').addEventListener('click',e=>{enabled=!enabled;start();if(master)master.gain.setTargetAtTime(enabled?.6:0,ctx.currentTime,.08);e.currentTarget.setAttribute('aria-pressed',String(enabled));});
    return {start,note,update};
  })();
  Studio.resize();window.addEventListener('resize',Studio.resize);
  let previous=performance.now();
  function frame(now){
    const dt=Math.min(.09,(now-previous)/1000);previous=now;game.step(Math.max(0,dt));
    toys();fluid();cues();audio.update(dt);Studio.draw();requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden){pointer=null;game.release();}});
  requestAnimationFrame(frame);
})();
