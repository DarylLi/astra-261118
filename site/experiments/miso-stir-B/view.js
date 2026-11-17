(function(root){
  'use strict';
  const {T,v}=Kitchen;
  function cameraFor(width,height,camera=new T.PerspectiveCamera(28,1,.12,44)){
    camera.aspect=width/height;
    camera.position.set(.22,6.94,8.00);
    const aim=v(0,1.00,-.13);
    camera.lookAt(aim);
    const dist=camera.position.distanceTo(aim);
    const sceneHeight=Math.max(4.79,4.90/camera.aspect);
    camera.fov=2*Math.atan(sceneHeight/(2*dist))*180/Math.PI;
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    return camera;
  }
  function screen(camera,rect,point) {
    const p=point.clone().project(camera);
    return {x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};
  }
  function onSoup(camera,rect,x,y) {
    const point=v((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2,.1).unproject(camera);
    const d=point.sub(camera.position).normalize();
    if(d.y>=-.0001) return null;
    return camera.position.clone().addScaledVector(d,(MisoSim.soupY-camera.position.y)/d.y);
  }
  function hit(camera,rect,x,y,ladle) {
    const p=onSoup(camera,rect,x,y), a=screen(camera,rect,ladle.start), b=screen(camera,rect,ladle.grip);
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.min(1,Math.max(0,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
    return (p && Math.hypot(p.x,p.z)<1.56) || Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<=48;
  }
  // An analytic room reflection for curved metal and glazed pottery.
  // All radiance is generated here, including the tall mullioned kitchen window.
  function studio(){
    const w=256,h=128,data=new Uint16Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const lat=((y+.5)/h-.5)*Math.PI, lon=((x+.5)/w-.5)*2*Math.PI;
      const dx=Math.cos(lat)*Math.cos(lon), dy=Math.sin(lat), dz=Math.cos(lat)*Math.sin(lon);
      let c=dy<0?[.21,.142,.086]:[.58,.51,.39];
      if(dy>.72)c=[1.12,1.05,.93];
      if(dx<-.52 && dy>-.08 && dy<.82 && dz>-.82 && dz<.41){
        const jamb=Math.abs(dz+.18)<.026 || Math.abs(dy-.39)<.022;
        c=jamb?[.35,.33,.26]:[4.75,4.52,3.94];
      }
      if(dz>.74 && dy>.06 && dy<.55)c=[1.28,1.11,.87];
      if(dx>.56 && dy<.31 && dy>-.28)c=[.14,.19,.16];
      const off=(y*w+x)*4;
      for(let k=0;k<4;k++)data[off+k]=T.DataUtils.toHalfFloat(k===3?1:c[k]);
    }
    const tex=new T.DataTexture(data,w,h,T.RGBAFormat,T.HalfFloatType);
    tex.mapping=T.EquirectangularReflectionMapping;tex.needsUpdate=true;return tex;
  }
  function lights(scene){
    scene.background=new T.Color(0xbcb9a3);
    scene.environment=studio();scene.environmentIntensity=.66;
    scene.add(new T.HemisphereLight(0xfff1db,0xbe9671,.75));
    const sun=new T.DirectionalLight(0xffead0,2.25);sun.position.set(-3.8,7.6,-3.1);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-6.4,right:6.4,top:6,bottom:-6,near:.5,far:20});
    sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00038;sun.shadow.normalBias=.012;
    scene.add(sun);
    const fill=new T.DirectionalLight(0xd2e7ea,1.06);fill.position.set(2.9,4.0,5.5);scene.add(fill);
  }
  root.MisoView={cameraFor,screen,onSoup,hit,lights};
})(globalThis);
