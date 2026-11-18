'use strict';
(() => {
  const {T,V,scene,M,camera,draw,rnd,mat,ball,rod,obj}=Studio,F=Food;
  const sim=PancakeKitchen.createKitchen();
  window.step=dt=>sim.step(dt);window.getState=sim.getState;
  const canvas=document.querySelector('canvas'),ray=new T.Raycaster(),ground=new T.Plane(V(0,1,0),0);
  let pointer=null,last=V(),hit=V(),lastPhase='',previousPop=0;
  let hintWait=1.15,hint=0,hintSpeed=0,whiskAngle=0,mixUpdate=-1,lastFill=-1;
  let audioCtx,stoveGain,waterGain,stoveFilter,waterFilter,nextNoise=0;
  const clamp=T.MathUtils.clamp,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  function audioStart(){
    if(!audioCtx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audioCtx=new AC();
      function noiseBand(hz,q){
        const filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
        filter.type='bandpass';filter.frequency.value=hz;filter.Q.value=q;g.gain.value=.00001;
        filter.connect(g).connect(audioCtx.destination);return [filter,g];
      }
      [stoveFilter,stoveGain]=noiseBand(3600,.67);[waterFilter,waterGain]=noiseBand(1500,.48);
    }
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  }
  function freshNoise(){
    if(audioCtx.state!=='running'||nextNoise>audioCtx.currentTime+.20)return;
    const samples=audioCtx.sampleRate*.75,buf=audioCtx.createBuffer(1,samples,audioCtx.sampleRate);
    const data=buf.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.min(1,i/64,(data.length-i)/64);
    const n=audioCtx.createBufferSource();n.buffer=buf;n.connect(stoveFilter);n.connect(waterFilter);
    nextNoise=Math.max(audioCtx.currentTime,nextNoise);n.start(nextNoise);nextNoise+=buf.duration;n.onended=()=>n.disconnect();
  }
  function tone(hz,decay=.18,vol=.035,type='sine',bend=1){
    if(!audioCtx)return;const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*bend,t+decay);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+decay);
    o.connect(g).connect(audioCtx.destination);o.start(t);o.stop(t+decay+.03);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function tapSound(p){
    if(p==='mix'){tone(510+Math.random()*110,.13,.021);tone(1132,.08,.008);}
    if(p==='stack'||p==='lift'){tone(142,.14,.040,'sine',.58);tone(520,.18,.012);}
    if(['milk','pour','syrup'].includes(p))tone(305,.19,.025,'sine',.52);
    if(p==='butter'||p==='berry')tone(181,.12,.025,'sine',.7);
    if(p==='flip')tone(210,.12,.03,'triangle',.53);
    if(p==='eat')tone(730,.19,.014);
  }
  // Three small dessert forks carry a piece to each family member.
  const forks=[];
  for(let i=0;i<3;i++){
    const fork=obj(scene,F.platePos.x+(i-1)*.2,F.platePos.y+.11,F.platePos.z+.96);rod(fork,[0,0,-.21],[0,0,.20],.012,M.steel,.021);
    for(let k=-1;k<=1;k++)rod(fork,[k*.023,0,.17],[k*.024,.012,.286],.005,M.metal,.003);
    const bite=obj(fork,0,.021,.242);bite.visible=false;
    forks.push({fork,bite});
  }
  const film=F.mixMesh.geometry.attributes.position, mixDry=new T.Color(0xf0e7cf),mixWet=new T.Color(0xecd3a5);
  const target=V(),look=V(),eye=V(),focus=V(),tool=V(),goalEye=V(),goalLook=V();
  let first=true;
  function nextHint(dt,s){
    hintWait-=dt;
    if(hintWait<0){hintWait=2.6+rnd()*2.4;hintSpeed=.91+rnd()*.25;}
    hintSpeed+=(-26*hint-5.9*hintSpeed)*dt;hint+=hintSpeed*dt;
    if(pointer!==null)hint*=Math.exp(-dt*7);
  }
  function pos(o,to,dt,speed=5){o.position.lerp(to,1-Math.exp(-dt*speed));}
  function angle(o,key,val,dt,speed=6){o.rotation[key]+=(val-o.rotation[key])*(1-Math.exp(-dt*speed));}
  function nearestCake(s,world){
    let best=null,distance=Infinity;
    for(const c of s.cakes)if(c.place==='rack'){
      const d=F.rackSpots[c.id].distanceToSquared(world);if(d<distance){distance=d;best=c.id;}
    }return best;
  }
  function fingerWorld(e,y){
    const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
    ground.constant=-y;return ray.ray.intersectPlane(ground,V())||focus.clone();
  }
  function setHeat(x){sim.action('heat',{value:clamp(.32+(x+1)*.34,.32,1)});}
  let fullScreenTried=false,heatDrag=false,initialX=0,initialHeat=0;
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;e.preventDefault();audioStart();
    if(e.pointerType==='touch'&&!fullScreenTried&&document.fullscreenEnabled){
      fullScreenTried=true;document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
    }
    pointer=e.pointerId;canvas.setPointerCapture(pointer);
    const s=sim.read(),p=s.phase;
    hit=fingerWorld(e,p==='stack'?.18:p==='mix'?.48:p==='wash'?-.14:F.panPos.y+.06);last.copy(hit);
    heatDrag=false;
    if(['pour','cook','second'].includes(p)){
      const objs=ray.intersectObject(F.dial,true);if(objs.length){
        heatDrag=true;initialX=e.clientX;initialHeat=s.heat;
        sim.action('heat',{value:s.heat>.90?.38:s.heat+.26});tone(540,.06,.018);return;
      }
    }
    const what={milk:'milk',mix:'stir',pour:'pour',cook:'flip',second:'lift',stack:'stack',butter:'butter',syrup:'syrup',berry:'berry',eat:'eat',wash:'wash'}[p];
    if(!what)return;
    let args={};
    if(p==='pour')args={x:(hit.x-F.panPos.x)/F.U,z:(hit.z-F.panPos.z)/F.U};
    if(p==='stack')args={id:nearestCake(s,hit)};
    if(p==='wash')args={x:(hit.x+4.33)/.75,z:(hit.z+.12)/.75};
    sim.action(what,args);tapSound(what);
    if(p==='mix')whiskAngle+=.33;
  },{passive:false});
  let scrapeTravel=0;
  canvas.addEventListener('pointermove',e=>{
    if(pointer!==e.pointerId)return;e.preventDefault();const p=sim.read().phase;
    if(heatDrag){const x=(e.clientX-initialX)/innerWidth;if(Math.abs(x)>.015)setHeat((initialHeat-.32)/.34-1+x*4);return;}
    hit=fingerWorld(e,p==='mix'?.48:p==='wash'?-.14:F.panPos.y+.06);
    const dist=Math.min(.45,hit.distanceTo(last));
    if(p==='mix'||p==='wash'){
      sim.action(p==='mix'?'stir':'wash',{force:dist*(p==='mix'?2.7:3.3),x:(hit.x+4.33)/.75,z:(hit.z+.12)/.75});scrapeTravel+=dist;
      if(scrapeTravel>1.2){scrapeTravel=0;tapSound(p);}
      if(p==='mix')whiskAngle+=dist*2.2;
    }
    if(p==='pour')sim.action('aim',{x:(hit.x-F.panPos.x)/F.U,z:(hit.z-F.panPos.z)/F.U});
    last.copy(hit);
  },{passive:false});
  function release(e){if(pointer!==e.pointerId)return;pointer=null;heatDrag=false;sim.action('release');}
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,release);
  window.addEventListener('blur',()=>{pointer=null;sim.action('release');});
  function resetModels(){
    for(const {bite} of forks){for(const layer of [...bite.children]){layer.geometry.dispose();layer.removeFromParent();}}
    for(const e of F.cakes){e.root.removeFromParent();e.g.dispose();for(const cut of e.cuts)cut.geometry.dispose();e.bubbles.geometry.dispose();e.bubbles.dispose();}
    F.cakes.length=0;F.serving.visible=true;mixUpdate=-1;previousPop=0;
  }
  function foodMotion(dt,s){
    const p=s.phase,mixing=p==='mix',milkPhase=p==='milk',pour=p==='pour',wash=p==='wash'||p==='drain';
    nextHint(dt,s);
    const current=s.cakes[s.current],panCenter=F.panPos.clone().add(V(current?current.x*F.U:0,.09,current?current.z*F.U:0));
    let height=F.platePos.y+.077,top=null;
    if(!s.cakes.length&&F.cakes.length)resetModels();
    for(const cake of s.cakes){
      const e=F.cakes[cake.id]||F.makeCake(cake);
      const th=Math.min(.27,cake.thickness*F.U),dest=F.panPos.clone().add(V(cake.x*F.U,th*.52+.006,cake.z*F.U));
      if(cake.place==='rack')dest.copy(F.rackSpots[cake.id]).y+=th*.5;
      if(cake.place==='plate'){
        let floor=F.platePos.y+.077;
        for(const id of s.stack){if(id===cake.id)break;floor+=s.cakes[id].thickness*F.U;}
        dest.set(F.platePos.x+cake.slide*F.U,floor+th*.5,F.platePos.z+.019*Math.sin(cake.id*2));
      }
      if(e.place!==cake.place){e.from.copy(e.root.position);e.travel=0;e.place=cake.place;}
      e.travel=clamp(e.travel+dt*(cake.place==='rack'?1.12:1.45),0,1);
      e.root.position.copy(e.from).lerp(dest,smooth(e.travel));e.root.position.y+=.42*Math.sin(Math.PI*e.travel);
      e.root.rotation.z=cake.flipAngle+(cake.place==='plate'?cake.tilt:0)+Math.sin(e.travel*Math.PI)*.12;
      e.root.position.y+=cake.altitude*F.U;
      if(s.elapsed-e.updated>(cake.place==='pan'?.067:.26))F.skin(e,cake,s);
      e.g.setDrawRange(e.partCount*s.eaten,e.partCount*(3-s.eaten));
      e.root.visible=s.eaten<3;
      e.cuts.forEach((cut,k)=>{cut.visible=s.eaten>0&&s.eaten<3&&(k===0||k===s.eaten);});
      if(s.eaten)e.bubbles.count=0;
    }
    for(const id of s.stack){top=s.cakes[id];height+=Math.min(.27,top.thickness*F.U);}
    const meal=p==='eat'||p==='lastBite',showFood=!wash&&s.eaten===0;
    const cakeTop=V(F.platePos.x+(top?top.slide*F.U:0),height,F.platePos.z);
    // Milk, batter, and syrup streams originate at the live tool spout.
    const milkRate=s.milkRate/110,milkLift=Math.min(1,milkRate*2.6);
    target.copy(F.jugHome);
    if(milkPhase||milkRate>.01)target.add(V(.38*milkLift,.72*milkLift+hint*(milkPhase?.23:0),-.09*milkLift));
    pos(F.pitcher,target,dt,9);angle(F.pitcher,'z',-milkLift*1.05-(milkPhase?hint*.42:0),dt,9);
    F.pitcher.updateMatrixWorld();
    const milkTip=F.pitcher.localToWorld(V(.252,.682,0)),wetTarget=F.bowlPos.clone().add(V(-.19,.438,0));
    F.stream(F.milkStream,milkTip,wetTarget,.029*Math.sqrt(milkRate));
    const fill=(milkPhase||mixing)?1:clamp(s.batterLeft/(s.milk+s.flour/1.5),0,1);
    if(milkPhase||mixing||mixUpdate<0||Math.abs(lastFill-fill)>.002){
      if(mixUpdate<0||s.elapsed-mixUpdate>.075){
        F.raw.color.copy(mixDry).lerp(mixWet,clamp(s.milk/33,0,1)*(1-.46*s.clumps));
        const swirl=s.stir+whiskAngle*.22;
        for(let i=0;i<film.count;i++){
          const x=F.flourBase[3*i],z=F.flourBase[3*i+2],r=Math.sqrt(x*x+z*z),a=Math.atan2(z,x);
          const mound=.135*Math.exp(-((x+.08)**2+(z-.16)**2)*4.4)*s.clumps;
          const h=.349+s.milk*.00075+mound+.016*s.clumps*Math.sin(13*x+Math.sin(18*z))*Math.cos(22*z)+.010*s.shear*(1-r)*Math.sin(3*a+5*r-swirl);
          const rad=.39+(.216+.00026*s.milk)*Math.sqrt(fill);film.setXYZ(i,x*rad,.14+(h-.14)*fill,z*rad);
        }
        film.needsUpdate=true;F.mixMesh.geometry.computeVertexNormals();
        for(const c of F.clumps){c.o.position.y=.14+(.245+s.milk*.00075+.09*(1-c.r/.52)*s.clumps)*fill;
          const a=c.s*Math.max(.001,s.clumps);c.o.scale.set(a,a*.52,a*.9);}
        mixUpdate=s.elapsed;lastFill=fill;
      }
    }
    if(mixing)whiskAngle+=dt*s.shear*1.6;
    const whiskCenter=F.bowlPos.clone().add(V(-.086,.61,-.044));
    if(mixing&&pointer!==null){whiskCenter.x+=clamp(hit.x-F.bowlPos.x,-.32,.32);whiskCenter.z+=clamp(hit.z-F.bowlPos.z,-.28,.28);}
    else {whiskCenter.x+=Math.cos(whiskAngle)*.11;whiskCenter.z+=Math.sin(whiskAngle)*.11;}
    pos(F.whisk,whiskCenter,dt,10);angle(F.whisk,'z',mixing?-.42+.14*Math.cos(whiskAngle)+hint*.38:-.56,dt);
    angle(F.whisk,'x',mixing?-.46+.16*Math.sin(whiskAngle):-.46,dt);
    const lr=s.pourRate/39,ladleTarget=F.panPos.clone().add(V(-.76,.025,-.78));
    if(p==='scoop'){
      const t=clamp(s.age/1.05,0,1),f=smooth((t-.25)/.75);
      ladleTarget.copy(F.bowlPos).add(V(.13,.46+.115*(1-Math.sin(Math.min(1,t/.35)*Math.PI)),.01));
      ladleTarget.lerp(panCenter.clone().add(V(-.3,.60,-.03)),f);ladleTarget.y+=.54*Math.sin(f*Math.PI);
    }
    if(pour||lr>.025){ladleTarget.copy(panCenter).add(V(-.15,.53+hint*.57,-.035));
      if(!current&&pour){ladleTarget.x-=.18;ladleTarget.y+=.07;}}
    pos(F.ladle,ladleTarget,dt,6);angle(F.ladle,'z',-.64*lr-(pour?hint*.4:0),dt);angle(F.ladle,'x',-.52,dt);
    F.ladleFill.visible=pour||lr>.03||(p==='scoop'&&s.age>.24);F.ladle.updateMatrixWorld();
    const batterTip=F.ladle.localToWorld(V(.138,.012,0));
    F.stream(F.batterStream,batterTip,panCenter.clone().add(V(0,current?current.thickness*F.U*.48:0,0)),.053*Math.sqrt(Math.min(lr,1)));
    const cook=p==='cook'||p==='second',ready=current?Math.min(1,current.born/8):0;
    const spatDest=F.panPos.clone().add(V(.83,.01,.62));
    if(cook){const flip=current?Math.min(1,current.altitude/5.8):0;spatDest.copy(panCenter).add(V(.46-.29*flip,.09+.47*flip+hint*ready*.5,.12));}
    if(p==='transfer'){const e=F.cakes[F.cakes.length-1];spatDest.copy(e.root.position).add(V(.13,-.058,.04));}
    pos(F.spat,spatDest,dt,8);angle(F.spat,'y',cook?-1.17:-1.80,dt);angle(F.spat,'z',cook?hint*ready+.14:.04,dt);
    F.dial.rotation.y=(s.heat-.65)*1.8;
    // Butter loses mass to the glossy film on the warm top face.
    const placed=['syrup','berry','eat','lastBite','wash','drain'].includes(p),butterScale=Math.cbrt(s.butter.grams/6);
    target.copy(F.butterPlate).add(V(0,.131+(p==='butter'?hint*.49:0),0));
    if(p==='butter')target.copy(cakeTop).add(V(-.23,.29+hint*.38,-.075));
    if(placed)target.copy(cakeTop).add(V(-.078,.006+.060*butterScale,-.034));
    pos(F.butter,target,dt,6);F.butter.rotation.y=.32;F.butter.scale.setScalar(Math.max(.001,butterScale));F.butter.visible=showFood;
    const knifeHome=F.butterPlate.clone().add(V(0,.075,0));
    if(p==='butter')knifeHome.copy(F.butter.position).add(V(0,-.064,0));
    else if(p==='syrup'&&s.age<1){knifeHome.copy(F.butter.position).add(V(-.42*smooth(s.age),-.065,-.06*s.age));}
    pos(F.knife,knifeHome,dt,7);
    F.butterPool.visible=placed&&showFood;F.butterPool.position.copy(target);F.butterPool.position.y=height+.010;
    const melted=Math.sqrt(s.butter.melted/6);F.butterPool.scale.set(.13+melted*.20,.008+.009*melted,.11+melted*.13);
    const syrupFlow=s.syrup.rate/13,sl=clamp(syrupFlow*2.1,0,1);
    target.copy(p==='syrup'?cakeTop.clone().add(V(-.49,.31,-.20)):F.syrupHome).lerp(cakeTop.clone().add(V(-.35,.65,-.095)),sl);if(p==='syrup')target.y+=hint*.42;
    pos(F.syrupJug,target,dt,7);angle(F.syrupJug,'z',-1.11*sl-(p==='syrup'?hint*.52:0),dt,7);
    F.syrupJug.updateMatrixWorld();F.stream(F.syrupStream,F.syrupJug.localToWorld(V(.18,.44,0)),cakeTop.clone().add(V(0,.021,0)),.030*Math.sqrt(syrupFlow));
    F.updateSauce(s,top,height);
    target.copy(F.berryHome).add(V(0,p==='berry'?hint*.56:0,0));
    if(p==='berry')target.copy(cakeTop).add(V(.20,.28+hint*.55,-.085));
    if(meal||wash)target.copy(cakeTop).add(V(.068,.016,.053));
    pos(F.berry,target,dt,6.4);F.berry.rotation.z=meal?-.21:.15;F.berry.visible=showFood;
    const washCenter=V(-4.33,.16,-.10);
    const transit=p==='drain'?1-smooth(s.age/1.6):wash?smooth(s.age/1.24):0;
    F.serving.position.copy(F.platePos).lerp(washCenter,transit);
    F.serving.position.y+=.68*Math.sin(transit*Math.PI);
    F.serving.rotation.set(-transit*.24,0,-transit*.42);
    F.serving.updateMatrixWorld();
    F.stains.forEach((o,i)=>{
      const spot=s.stains[i];o.visible=wash&&!!spot;
      if(o.visible){const r=Math.sqrt(spot.mass)*.25;o.position.set(spot.x*.78,.072+.019*(spot.x**2+spot.z**2),spot.z*.78);o.scale.set(r*1.42,.003,r*.8);}
    });
    const rinsing=p==='wash'?1:p==='drain'?Math.max(0,1-s.age):0;
    F.water.visible=rinsing>.02;if(rinsing)F.water.scale.set(.019*rinsing,.581,.019*rinsing);
    F.water.position.y=.257;
    F.sponge.visible=true;target.set(-4.90,.073,.60);
    if(wash)target.copy(F.serving.localToWorld(V(s.spongeX*.60+hint*.20,.15,s.spongeZ*.60)));
    pos(F.sponge,target,dt,10);F.sponge.rotation.y=-.3+s.scrub*.08;
    F.suds.forEach((o,i)=>{o.visible=wash&&i/34<s.foam+.04;if(o.visible){const a=i*2.4,r=.51*Math.sqrt(i/32);o.position.copy(F.serving.localToWorld(V(Math.cos(a)*r,.107,Math.sin(a)*r)));}const r=(.023+.028*(i%4)/3)*(p==='drain'?Math.max(.002,1-s.age):1);o.scale.set(r,r*.82,r);});
    target.copy(meal?cakeTop:p==='milk'?milkTip:mixing?whiskCenter:pour?ladleTarget:cook||p==='transfer'?panCenter:p==='stack'?F.rackSpots[nearestCake(s,F.platePos)??1]:p==='butter'?F.butter.position:p==='syrup'?cakeTop:p==='berry'?F.berry.position:F.sponge.position);
    if(p==='transfer')target.copy(F.cakes.at(-1).root.position);
    if(p==='stack'){const moving=F.cakes.find(e=>e.place==='plate'&&e.travel<1);if(moving)target.copy(moving.root.position);}
    tool.copy(target);
    if(mixing||milkPhase)tool.copy(F.whisk.localToWorld(V(0,.61,0)));
    if(p==='butter')tool.copy(F.knife.localToWorld(V(-.45,.055,-.12)));
    if(p==='berry')tool.copy(F.berry.localToWorld(V(0,.38,-.055)));
    if(p==='syrup')tool.copy(F.syrupJug.localToWorld(V(-.24,.27,-.025)));
    if(pour||p==='scoop')tool.copy(F.ladle.localToWorld(V(.02,.74,-.19)));
    if(cook||p==='transfer')tool.copy(F.spat.localToWorld(V(0,.25,-.87)));
    // Eating pose has approach, lift, bite and return with the same fork.
    let eatPose=null;
    forks.forEach(({fork,bite},i)=>{
      const home=F.platePos.clone().add(V((i-1)*.20,.11,.96));
      const person=Family.people[i],mouth=person.head.localToWorld(V(0,-.12,.255));
      const eating=(meal&&s.eaten-1===i&&s.age<1.72),reach=eating?clamp(s.age/1.0,0,1):0;
      if(eating){
        if(!bite.children.length){
          let y=0;
          for(const id of s.stack){
            const cake=F.cakes[id],th=s.cakes[id].thickness*F.U;
            const geometry=new T.BufferGeometry();
            for(const [key,attr] of Object.entries(cake.g.attributes))geometry.setAttribute(key,attr);
            geometry.setIndex(cake.g.index);geometry.setDrawRange(i*cake.partCount,cake.partCount);
            const slice=new T.Mesh(geometry,cake.loaf.material);slice.rotation.z=Math.PI;
            slice.position.y=y+th*.5;slice.castShadow=true;bite.add(slice);y+=th;
          }
        }
        const f=smooth(reach);bite.scale.setScalar(.85-.55*f);
        home.copy(cakeTop).add(V(.04,.08,.04)).lerp(mouth.clone().add(V(0,-.05,-.21)),f);
        home.y+=Math.sin(reach*Math.PI)*.22;
        const returning=smooth((s.age-1.05)/.65);
        home.lerp(F.platePos.clone().add(V((i-1)*.20,.12,.91)),returning);
        const open=smooth((s.age-.55)/.31)*(1-smooth((s.age-.91)/.23));
        eatPose={person:i,pos:home.clone(),open};bite.visible=reach<.96;
      }else bite.visible=false;
      pos(fork,home,dt,10);fork.rotation.y=meal?0:2.92;fork.rotation.x=eating?-.22:.01;
      if(i===0&&eating&&reach<.94){
        F.berry.visible=true;F.berry.scale.setScalar(.74-.45*smooth(reach));
        F.berry.position.copy(fork.localToWorld(V(0,.09+(height-F.platePos.y)*(.85-.55*smooth(reach)),.25)));
      }else if(s.eaten===0)F.berry.scale.setScalar(1);
    });
    Family.update(first?1:dt,s,target,tool,eatPose);
    if(audioCtx){const n=current?.popped??0;
      if(n>previousPop&&cook&&Math.random()<.30)tone(760+Math.random()*440,.041,.009,'sine',.36);
      previousPop=n;
      const desired=current?clamp((current.cells[0].faces[current.contact].temp-40)/110,0,1)*.044:0;
      if(desired+milkRate+lr+rinsing>.001)freshNoise();
      stoveGain.gain.setTargetAtTime(desired,audioCtx.currentTime,.24);waterGain.gain.setTargetAtTime(rinsing*.041+milkRate*.014+lr*.009,audioCtx.currentTime,.16);
    }
    // Physical compositions: the distance is constrained by BOTH viewport axes.
    let hero,center,w,h,offset;
    if(milkPhase||mixing){
      hero=mixing?whiskCenter:wetTarget;
      const opening=milkPhase?1-clamp(s.milk/23,0,1):0;
      center=F.bowlPos.clone().add(V(-.015+.095*opening,.56+.48*opening,-.025));
      w=2.48+.53*opening;h=2.30+1.12*opening;offset=V(.21-.25*opening,.46-.13*opening,1);
    }else if(p==='scoop'){
      hero=F.ladle.position;center=hero.clone().add(V(0,.02,-.02));w=2.45;h=2.18;offset=V(.18,.67,1);
    }else if(pour||cook||p==='transfer'){
      hero=p==='transfer'?F.cakes[F.cakes.length-1].root.position:panCenter;center=hero.clone().add(V(0,.24,-.04));w=2.25;h=1.98;offset=V(.17,.80,1);
    }else if(p==='stack'){
      hero=F.rackSpots[nearestCake(s,F.platePos)??1];center=V(3.22,.27,.02);w=3.29;h=2.12;offset=V(.14,.95,1);
    }else if(wash){
      hero=F.sponge.position;center=p==='wash'?F.serving.position.clone().add(V(.03,.07,-.05)):V(-4.28,.16,-.23);w=2.15;h=2.05;offset=V(.26,.85,1);
    }else{
      hero=p==='berry'?F.berry.position.clone().add(V(0,.21,0)):p==='butter'?F.butter.position:p==='syrup'?cakeTop.clone().lerp(F.syrupJug.position,.28):cakeTop;
      center=cakeTop.clone().add(V(.04,meal?.55:.19,-.03));w=meal?3.35:1.98;h=meal?2.93:1.52;offset=V(.12,meal?.31:.59,1);
    }
    const dist=Math.max(h,w/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(35/2)));
    goalLook.copy(center);goalEye.copy(center).addScaledVector(offset.normalize(),dist);
    const hand=eatPose?eatPose.pos:Family.people[2].arms[1].hand.getWorldPosition(V());
    const focalPoint=hero.clone().lerp(hand,eatPose?.78:.31);
    if(first){look.copy(goalLook);eye.copy(goalEye);focus.copy(focalPoint);first=false;}
    else{posVec(look,goalLook,dt,3.1);posVec(eye,goalEye,dt,2.7);posVec(focus,focalPoint,dt,4.8);}
    camera.position.copy(eye);camera.lookAt(look);camera.updateMatrixWorld();
  }
  function posVec(v,to,dt,speed){v.lerp(to,1-Math.exp(-dt*speed));}
  // Initialize tool positions before the first frame, including all three people.
  F.whisk.position.copy(F.bowlPos).add(V(.01,.61,-.044));F.ladle.position.copy(F.panPos).add(V(-.76,.025,-.78));
  F.spat.position.copy(F.panPos).add(V(.83,.01,.62));F.knife.position.copy(F.butterPlate);F.butter.position.copy(F.butterPlate).add(V(0,.131,0));F.berry.position.copy(F.berryHome);
  let lastFrame;
  function frame(ms){
    const dt=lastFrame===undefined?1/60:Math.max(0,Math.min(.12,(ms-lastFrame)/1000));lastFrame=ms;
    sim.step(dt);const s=sim.read();
    if(s.phase!==lastPhase){hintWait=.36;lastPhase=s.phase;if(s.phase==='mix')tone(826,.21,.016);}
    foodMotion(dt,s);draw(focus);requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{lastFrame=undefined;if(document.hidden&&audioCtx)audioCtx.suspend().catch(()=>{});});
  requestAnimationFrame(frame);
})();
