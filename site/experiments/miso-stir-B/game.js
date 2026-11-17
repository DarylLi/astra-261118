(function(){
  'use strict';
  const canvas=document.querySelector('canvas'),scene=new THREE.Scene();
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  const sim=MisoSim.createSim(), audio=MisoAudio.sound(), initial=sim.getState();
  MisoView.lights(scene);Kitchen.kitchen(scene);
  const family=MisoFamily.build(scene,initial), soup=MisoSoup.build(scene,initial);
  let camera,pose=family.update(initial), active=null, origin=null, anchor=null, last=null;
  function resize(){
    const bounds=canvas.getBoundingClientRect();
    renderer.setSize(bounds.width,bounds.height,false);
    camera=MisoView.cameraFor(bounds.width,bounds.height,camera);
  }
  resize();window.addEventListener('resize',resize);
  function paint(s){
    pose=family.update(s);soup(s);audio.update(s);
    renderer.render(scene,camera);
  }
  canvas.addEventListener('pointerdown',e=>{
    const r=canvas.getBoundingClientRect();
    if(active!==null || e.button!==0 || !MisoView.hit(camera,r,e.clientX,e.clientY,pose))return;
    const p=MisoView.onSoup(camera,r,e.clientX,e.clientY);
    if(!p)return;
    active=e.pointerId;canvas.setPointerCapture(active);origin=p;
    const touch=performance.now();
    anchor=sim.getState().ladle;sim.press();paint(sim.getState());audio.start(touch);
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==active)return;
    const p=MisoView.onSoup(camera,canvas.getBoundingClientRect(),e.clientX,e.clientY);
    if(p)sim.move(anchor.x+p.x-origin.x,anchor.z+p.z-origin.z);
  });
  function end(e,cancelled){
    if(e.pointerId!==active)return;
    const id=active;active=null;sim.release(cancelled);
    if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  canvas.addEventListener('pointerup',e=>end(e,false));
  canvas.addEventListener('pointercancel',e=>end(e,true));
  canvas.addEventListener('lostpointercapture',e=>end(e,true));
  function pause(){if(active!==null)end({pointerId:active},true);last=null;audio.quiet();}
  window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  function frame(now){
    sim.step(last===null?0:(now-last)/1000);last=now;
    paint(sim.getState());requestAnimationFrame(frame);
  }
  paint(initial);requestAnimationFrame(frame);
})();
