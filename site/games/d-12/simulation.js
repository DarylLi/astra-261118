(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WashPhysics = api;
})(globalThis, () => {
  'use strict';
  const W = 17, H = 23, clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
  const mix = (a,b,f) => a+(b-a)*f;
  const random = seed => () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  // Sections run from the rear bumper over the deck to the front valance.
  const sections = [[-1.78,.78,.59,.36],[-1.77,.88,.92,.36],[-1.62,.95,1.12,.37],[-1.28,.98,1.18,.37],[-.42,1.0,1.18,.37],[.42,1,1.16,.37],[.92,.99,1.10,.37],[1.36,.96,1.03,.37],[1.62,.92,.97,.37],[1.76,.86,.82,.37],[1.79,.80,.60,.36],[1.76,.74,.43,.36]];
  const cross = [[-0.94,0],[-1,.17],[-1,.58],[-.987,.83],[-.94,.956],[-.79,.993],[-.50,1.007],[0,1.023],[.50,1.007],[.79,.993],[.94,.956],[.987,.83],[1,.58],[1,.17],[.94,0]];
  function section(list,t) {
    const v=clamp(t)*(list.length-1), i=Math.min(list.length-2,Math.floor(v));
    return list[i].map((a,k)=>mix(a,list[i+1][k],v-i));
  }
  function surface(u,v,truck=false) {
    const [z,w,top,bottom]=section(sections,v), [x,h]=section(cross,u);
    return {x:x*w*(truck?1.10:1), y:mix(bottom,top,h)*(truck?1.17:1), z:z*(truck?1.18:1)};
  }
  function exposed(u,v,truck=false){
    const p=surface(u,v,truck),sx=truck?1.1:1,sy=truck?1.17:1,sz=truck?1.18:1;
    const z=(p.z/sz-(truck?.52:0))/(truck?.65:1);
    const cab=[[-1.46,.80,1.14],[-1.32,.776,1.54],[-1.04,.724,1.80],[-.8,.716,1.93],[-.22,.714,1.94],[.075,.73,1.865],[.23,.749,1.748],[.76,.84,1.20]];
    for(let i=1;i<cab.length;i++)if(z>=cab[i-1][0]&&z<=cab[i][0]){
      const a=cab[i-1],b=cab[i],f=(z-a[0])/(b[0]-a[0]);
      if(Math.abs(p.x)<=mix(a[1],b[1],f)*sx)p.y=Math.max(p.y,mix(a[2],b[2],f)*sy*(truck?1.07:1));
    }
    if(truck&&z< -1.46&&Math.abs(p.x)<1.04)p.y=Math.max(p.y,1.49*sy);
    return p;
  }
  function make(options={}) {
    const rng=random(options.seed??87105);
    let paths=[],cells=[], phase='foam', vehicle=0, age=0, elapsed=0, sinceTouch=0, press=false, armed=false;
    let aim={u:.48,v:.72}, target={...aim}, wand={u:.48,v:.72,du:0,dv:0,lift:0,vlift:0};
    let dose=0, rinseDose=0, spin=0, angle=0, track=-1.6, trackV=0, direction=1, passes=0, fan=0, washAngle=0;
    let wind=.16, gust=.26, nextGust=1.25, carZ=0, carV=0, wheelAngle=0, door=0, doorV=0;
    let glints=[], dropClock=.3, runoff=0, floorWet=.72, rippleEnergy=.05;
    const flecks=[], mistRng=random(8080), bubbles=Array.from({length:8},(_,i)=>({x:(mistRng()-.5)*.40,y:.07+i*.115,z:(mistRng()-.5)*.36,r:.037+mistRng()*.068,vy:.10+i*.008,vx:0}));
    let docks=[{x:-1.65,y:1.384,z:1.91},{x:2.27,y:1.384,z:-.58}];
    const moteRng=random(12597),motes=Array.from({length:27},()=>({x:-3.6+moteRng()*6.9,y:.45+moteRng()*3.05,z:-3.2+moteRng()*5.5,vx:0,vy:0,r:.003+moteRng()*.004,drag:.50+moteRng()}));
    let sprayRemainder=0,fanAngle=0,umbrellaTilt=0,umbrellaV=0;
    const rings=Array.from({length:15},(_,i)=>({deflection:0,velocity:0,angle:rng()*.12,omega:0,stiffness:19+rng()*8,index:i}));
    const hoses=[0,1].map(()=>({x:0,v:0,kick:0}));
    const family=[0,1,2].map((_,i)=>({walk:0,v:0,gait:i*1.2,seat:0}));
    const drops=Array.from({length:12},(_,i)=>({x:-2.65+rng()*5.3,z:-.62-rng()*2.2,y:.6+rng()*2.6,vy:-rng(),wait:rng()*2,impact:0,ring:0}));
    function resetBody() {
      cells=Array.from({length:W*H},(_,i)=>{
        const u=(i%W)/(W-1), v=Math.floor(i/W)/(H-1), p=surface(u,v,!!(vehicle%2));
        const grains=rng(), adhesion=.68+grains*.54;
        const splash=clamp(.18+.46*Math.pow(Math.abs(2*u-1),.9)+.20*Math.sin(v*12+u*7)+.21*Math.cos(u*15-v*6)+.20*grains);
        return {u,v,...p,mud:clamp(splash*(options.mudScale??1)),foam:0,water:.11+.12*rng(),adhesion,run:0};
      });
      // Pick the two steepest downhill neighbours from the exposed sheet metal and glazing.
      // The lip of either sill is an open boundary. Fluid crossing it joins the floor reservoir.
      const points=cells.map(c=>exposed(c.u,c.v,!!(vehicle%2)));
      paths=cells.map((c,i)=>{
        const x=i%W,z=Math.floor(i/W),p=points[i];
        if(x===0||x===W-1)return {a:-1,b:-1,f:1,slope:1};
        const ids=[i-1,i+1];if(z>0)ids.push(i-W);if(z<H-1)ids.push(i+W);
        const grades=ids.map(id=>{
          const q=points[id],fall=p.y-q.y;
          return {id,grade:Math.max(0,fall)/Math.max(.018,Math.hypot(q.x-p.x,q.z-p.z,fall))};
        }).sort((a,b)=>b.grade-a.grade);
        const outward=x<W/2?i-1:i+1;
        if(grades[0].grade<.009)return {a:outward,b:outward,f:1,slope:.055};
        return {a:grades[0].id,b:grades[1].id,f:grades[0].grade/(grades[0].grade+grades[1].grade),slope:grades[0].grade};
      });
    }
    resetBody();
    const phaseTo=name=>{phase=name;age=0;press=false;armed=false;};
    function touch(tool,u,v) {
      sinceTouch=0;
      if(tool!==phase || !['foam','brush','rinse'].includes(tool)){
        if(tool==='foam'||tool==='rinse') hoses[tool==='foam'?0:1].kick+=.18;
        else if(tool==='brush') rings[7].velocity+=.13;
        return false;
      }
      press=true; armed=true;
      if(Number.isFinite(u)) move(u,v);
      return true;
    }
    function move(u,v){if(!press)return; target={u:clamp(u),v:clamp(v)};sinceTouch=0;}
    function release(){press=false;}
    function spring(obj,prop,vel,target,k,c,h){
      obj[vel]+=((target-obj[prop])*k-obj[vel]*c)*h;
      obj[prop]+=obj[vel]*h;
    }
    function step(h) {
      if(!Number.isFinite(h)||h<=0)return;
      const n=Math.ceil(h/(1/60));
      for(let s=0;s<n;s++) integrate(h/n);
    }
    function integrate(h) {
      elapsed+=h;age+=h;sinceTouch=press?0:sinceTouch+h;
      nextGust-=h;
      if(nextGust<=0){gust=.08+rng()*.48;nextGust=.65+rng()*2.1;}
      wind+=(gust-wind)*h*.92;
      const spraying=press&&(phase==='foam'||phase==='rinse');
      if(spraying){washAngle+=h*(phase==='rinse'?2.7:1.5);if(phase==='foam')dose+=h;else rinseDose+=h;}
      aim={u:clamp(target.u+.068*Math.sin(washAngle*1.33)),v:clamp(target.v+.075*Math.sin(washAngle))};
      spring(wand,'u','du',aim.u,37,10,h);spring(wand,'v','dv',aim.v,37,10,h);
      spring(wand,'lift','vlift',spraying?1:0,35,9.4,h);
      const powered=phase==='brush'&&armed;
      spin+=((powered?9.2:phase==='brush'?1.25:.16+wind*.12)-spin)*h*(powered?2.1:1.6);
      angle+=spin*h;
      if(powered){
        trackV+=((direction*1.18)-trackV)*h*4.2;
        if((direction===1&&track>1.59)||(direction===-1&&track< -1.64)){direction*=-1;passes++;}
      }else trackV+=((-1.6-track)*4-trackV*4.5)*h;
      track+=trackV*h;
      for(const r of rings){
        const x=(r.index-7)*.15, contact=powered?Math.exp(-Math.pow((track+.42)/1.42,4))*(.22+.47*(1-Math.abs(x)/1.3)):0;
        spring(r,'deflection','velocity',contact*(.83+.17*Math.sin(r.angle*2+r.index)),r.stiffness,4.6,h);
        r.omega+=(spin*(1-contact*.14)-r.omega)*h*(2.6+r.index*.07);
        r.angle+=r.omega*h;
      }
      for(const hose of hoses){hose.v+=(wind*.09+hose.kick-hose.x*15-hose.v*3.1)*h;hose.x+=hose.v*h;hose.kick*=Math.exp(-6*h);}
      if(spraying)hoses[phase==='foam'?0:1].kick+=h*.85*(wand.du+wand.dv);
      let foamTotal=0,wetTotal=0,peakMud=0,peakFoam=0,drained=0;
      const foamFlow=new Float32Array(cells.length), waterFlow=new Float32Array(cells.length);
      for(let i=0;i<cells.length;i++){
        const p=cells[i],dx=p.u-wand.u,dz=p.v-wand.v, near=Math.exp(-dx*dx*15-dz*dz*23);
        const ring=rings[Math.min(14,Math.floor(p.u*15))];
        const contact=powered?Math.exp(-Math.pow((p.z-track)/.58,2))*(.70+.3*Math.abs(2*p.u-1))*(1+.22*ring.deflection):0;
        const jet=spraying&&phase==='rinse'?near:0;
        // Fixed overhead jets follow the wet pass, with staggered fan patterns.
        const shower=spraying&&phase==='rinse' ? (.12+.88*Math.pow(Math.cos(p.v*4.8-washAngle*.72+p.u*.23),4))*(.67+.33*Math.cos(p.u*5.7+washAngle)**2):0;
        if(spraying&&phase==='foam')p.foam+=h*near*(.75+.19*p.mud)*(1-p.foam/2.3);
        if(contact>0){
          const stripped=Math.min(p.mud,h*contact*(.38+.34*p.foam+.21*p.water)/p.adhesion);
          p.mud-=stripped;
          const j=i%W<W-1?i+1:i-1, spread=Math.max(0,p.foam-cells[j].foam)*contact*h*.52;
          foamFlow[i]-=spread;foamFlow[j]+=spread;
        }
        p.water=Math.min(1.6,p.water+h*(jet*.98+shower*.72));
        p.foam=Math.max(0,p.foam-h*(jet+shower)*(.46+p.foam*.97));
        p.mud=Math.max(0,p.mud-h*(jet+shower)*(.14+.15*p.water)/p.adhesion);
        const path=paths[i],slope=.08+path.slope;
        const speed=Math.max(0,p.foam-.10*p.adhesion)*slope*.36;
        p.run+=(speed-p.run)*h*3.0;
        const flow=Math.min(p.foam,p.run*h);
        const waterOut=Math.min(p.water,Math.max(0,p.water-.025*p.adhesion)*slope*.34*h);
        foamFlow[i]-=flow;waterFlow[i]-=waterOut;
        if(path.a>=0){
          foamFlow[path.a]+=flow*path.f;foamFlow[path.b]+=flow*(1-path.f);
          waterFlow[path.a]+=waterOut*path.f;waterFlow[path.b]+=waterOut*(1-path.f);
        }else drained+=waterOut+flow;
        p.water=Math.max(0,p.water-h*(.003+wind*.004+fan*.27)*(1.32-.35*p.adhesion));
        foamTotal+=p.foam;wetTotal+=p.water;peakMud=Math.max(peakMud,p.mud);peakFoam=Math.max(peakFoam,p.foam);
      }
      for(let i=0;i<cells.length;i++){cells[i].foam=Math.max(0,cells[i].foam+foamFlow[i]);cells[i].water=Math.max(0,cells[i].water+waterFlow[i]);}
      runoff+=drained;
      floorWet=clamp(floorWet+h*(drained*1.3-.0025*(wind+.15)),.18,1);
      rippleEnergy*=Math.exp(-h*2.6);
      for(const d of drops){
        d.ring=Math.max(0,d.ring-h*.86);
        if(d.wait>0){d.wait-=h;continue;}
        d.vy-=9.81*h;d.y+=d.vy*h;
        if(d.y<=.035){d.impact++;d.ring=1;d.y=3.24;d.vy=0;d.wait=1+rng()*5;rippleEnergy=Math.min(1,rippleEnergy+.12);}
      }
      for(const b of bubbles){
        b.vy+=(.11+b.r*1.2-b.vy)*h*1.3;b.vx+=((wind-.17)*.19-b.vx)*h*1.5;
        b.y+=b.vy*h;b.x+=b.vx*h;
        if(b.y>1.15+b.r){b.y=.015;b.x=(mistRng()-.5)*.22;b.z=(mistRng()-.5)*.24;b.vy=.052;b.vx=0;}
      }
      // Airborne dust follows local drag until it settles or leaves the open bay.
      for(const m of motes){
        m.vx+=((wind*(.52+.21*Math.sin(m.z*1.8))-m.vx)*m.drag)*h;
        m.vy+=((wind*.037*Math.cos(m.x*2.6+m.z)-.019-m.vy)*m.drag)*h;
        m.x+=m.vx*h;m.y+=m.vy*h;
        if(m.x>3.9||m.y<.09){m.x=-3.75;m.y=.54+moteRng()*2.8;m.z=-3+moteRng()*4;m.vx=0;}
      }
      umbrellaV+=((wind*.13-umbrellaTilt)*13-umbrellaV*3.0)*h;umbrellaTilt+=umbrellaV*h;
      fanAngle+=(.42+fan*18+wind*.2)*h;
      sprayRemainder+=spraying?h*(phase==='foam'?53:100):0;
      while(sprayRemainder>=1){
        sprayRemainder--;const u=clamp(wand.u+(mistRng()-.5)*.26),v=clamp(wand.v+(mistRng()-.5)*.27);
        const hit=exposed(u,v,!!(vehicle%2)),from=exposed(wand.u,wand.v,!!(vehicle%2)),foam=phase==='foam';
        const dock=docks[foam?0:1],lift=clamp(wand.lift);
        from.x=mix(dock.x,from.x+(foam?-.62:.64),lift);from.y=mix(dock.y,from.y+.76,lift);from.z=mix(dock.z,from.z+.62,lift);
        const duration=.17+mistRng()*.11;
        flecks.push({x:from.x,y:from.y,z:from.z,vx:(hit.x-from.x)/duration,vy:(hit.y-from.y)/duration+4.905*duration,vz:(hit.z-from.z)/duration,r:(foam?.025:.010)+mistRng()*(foam?.046:.019),life:duration,foam});
        if(!foam&&mistRng()<.66){
          const side=mistRng()<.5?-1:1,zz=-3.9+mistRng()*2.4;
          flecks.push({x:side*2.62,y:3.15,z:zz,vx:-side*(2.3+mistRng()),vy:-2.9,vz:1.5+mistRng()*1.7,r:.013,life:.51,foam:false});
        }
      }
      for(let i=flecks.length-1;i>=0;i--){const d=flecks[i];d.vy-=9.81*h;d.x+=d.vx*h;d.y+=d.vy*h;d.z+=d.vz*h;d.life-=h;if(d.life<=0)flecks.splice(i,1);}
      fan+=((phase==='dry'?1:0)-fan)*h*(phase==='dry'?1.8:.95);
      if(phase==='dry'||phase==='board'){
        dropClock-=h;
        if(dropClock<=0){glints.push({u:.07+rng()*.86,v:.38+rng()*.60,life:.62});dropClock=.28+rng()*.50;}
      }
      glints.forEach(g=>g.life-=h);glints=glints.filter(g=>g.life>0);
      if(phase==='foam'&&dose>1.85&&foamTotal/cells.length>.095)phaseTo('brush');
      if(powered&&passes>=2&&track< -1.4){phaseTo('rinse');}
      if(phase==='rinse'&&rinseDose>2&&peakMud<.012&&peakFoam<.021){phaseTo('dry');}
      if(phase==='dry'&&wetTotal/cells.length<.014&&age>2.2)phaseTo('board');
      const doorGoal=phase==='board'&&family.some(p=>p.seat<.98)?1:0;
      doorV+=((doorGoal-door)*22-doorV*8)*h;door=clamp(door+doorV*h);
      if(phase==='board'){
        for(let i=0;i<family.length;i++){
          const p=family[i],goal=age>.25+i*.36&&p.walk<1?.55:0;
          p.v+=(goal-p.v)*h*4;p.walk=clamp(p.walk+p.v*h);p.gait+=p.v*h*15;
          if(p.walk>=.995)p.seat=clamp(p.seat+h*1.4);
        }
        if(family.every(p=>p.seat===1)&&door<.035)phaseTo('depart');
      }
      if(phase==='depart'){
        carV+=(3.9-carV)*h*.88;carZ+=carV*h;wheelAngle+=carV*h/.40;
        if(carZ>12){
          vehicle++;resetBody();carZ=-10;carV=.65;phaseTo('arrive');glints=[];
        }
      }else if(phase==='arrive'){
        carV+=(Math.min(3.9,Math.max(.06,-carZ*1.7))-carV)*h*3.8;
        carZ=Math.min(0,carZ+carV*h);wheelAngle+=carV*h/.40;
        for(const f of family){f.seat=Math.max(0,f.seat-h*.7);f.walk=Math.max(0,f.walk-h*.6);f.gait+=h*6;}
        if(carZ>-.014){
          carZ=0;carV=0;dose=0;rinseDose=0;passes=0;direction=1;sinceTouch=0;
          for(const p of family){p.v=0;p.walk=0;p.seat=0;}
          phaseTo('foam');
        }
      }
    }
    function state(){return {motes:motes.map(b=>({...b})),bubbles:bubbles.map(b=>({...b})),flecks:flecks.map(b=>({...b})),fanAngle,umbrellaTilt,phase,vehicle,age,elapsed,sinceTouch,press,armed,dose,rinseDose,spin,angle,track,trackV,passes,fan,wind,carZ,carV,wheelAngle,door,runoff,floorWet,rippleEnergy,wand:{...wand},family:family.map(p=>({...p})),rings:rings.map(p=>({...p})),hoses:hoses.map(p=>({...p})),drops:drops.map(p=>({...p})),glints:glints.map(p=>({...p})),cells:cells.map(p=>({...p}))};}
    return {step,getState:state,touch,move,release,setDocks:(foam,rinse)=>{docks=[{...foam},{...rinse}];}};
  }
  return {make,surface,exposed,clamp,W,H,random};
});
