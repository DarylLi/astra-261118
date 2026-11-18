(function(root) {
  'use strict';
  const P = root.PancakePhysics || require('./physics.js');
  function kitchen() {
    let s, id=0, held=false, stroke=0, px=0, pz=0, angle=0, turnSign=1, pulse=0, aim=0, milkHeld=false;
    function reset() {
      s={phase:'mix', stageTime:0, bowl:P.bowl(), cake:null, ladle:null, power:1,
        stack:[], butter:null, syrup:P.syrup(), berry:false, servings:0, biteTime:0,
        dirt:1, scrub:0, splash:0, tapAngle:0, placeAt:0, transfer:0, flight:0, stream:0};
      held=false; stroke=0; pulse=0; turnSign=1; milkHeld=false;
    }
    reset();
    function enter(phase) { s.phase=phase; s.stageTime=0; held=false; stroke=0; pulse=0; milkHeld=false; }
    function load() {
      s.cake=P.cake(s.bowl.viscosity); s.cake.id=++id; s.ladle=P.ladle();
      enter('pour');
    }
    function readyToFlip() {
      return s.cake && s.cake.cells.reduce((v,q)=>v+q.births,0)>=5;
    }
    function down(x=0,z=0,object='',layer) {
      held=true; stroke=0; px=x; pz=z;
      if (object==='dial' && ['pour','cook','second'].includes(s.phase)) {
        s.power=s.power===1?1.18:s.power>1?0.78:1; held=false; return;
      }
      switch(s.phase) {
        case 'mix':
          if(object==='milk'){s.bowl.milkPending=Math.min(200-s.bowl.milk,s.bowl.milkPending+12); milkHeld=true; break;}
          if(object==='ladle' && s.bowl.work>4) load();
          else { pulse=0.62; angle=Math.atan2(z,x); }
          break;
        case 'pour': pulse=0.96; break;
        case 'cook':
          if(readyToFlip()) { enter('flip'); s.flight=0; } break;
        case 'second':
          if(s.stageTime>0.9) {
            s.placeAt=Number.isInteger(layer)?P.clamp(layer,0,s.stack.length):s.stack.length;
            enter('stack'); s.transfer=0;
          }
          break;
        case 'butter': s.butter=P.butter(); enter('syrup'); break;
        case 'syrup': pulse=0.85; break;
        case 'berry': s.berry=true; enter('eat'); s.biteTime=0; break;
        case 'eat': if(s.biteTime===0) s.biteTime=0.001; break;
        case 'wash': s.scrub+=0.09; break;
      }
    }
    function move(x,z) {
      if(!held)return;
      const dx=x-px,dz=z-pz;
      stroke=Math.min(20,stroke+Math.hypot(dx,dz)*16);
      const torque=px*dz-pz*dx;
      if(Math.abs(torque)>.003)turnSign=Math.sign(torque);
      px=x;pz=z;
      if(Math.hypot(x,z)>0.05)angle=Math.atan2(z,x);
    }
    function up(){held=false;milkHeld=false;}
    function tick(dt) {
      s.stageTime+=dt; pulse=Math.max(0,pulse-dt);
      const active=held||pulse>0;
      stroke*=Math.exp(-dt*5);
      s.tapAngle=angle;
      if(s.phase==='mix') {
        P.mix(s.bowl,dt,active&&!milkHeld?turnSign*(3.3+stroke):0,angle+s.bowl.angle*0.5);
        if(s.bowl.work>=14.5)load();
      }
      if(s.phase==='pour') {
        P.pour(s.cake,s.ladle,dt,active,px*2.2,pz*2.2);
        P.spread(s.cake,dt);
        s.stream=s.ladle.left>0?s.ladle.flow:0;
        if(s.ladle.left<0.02 || (!active && s.ladle.flow<1.0 && s.cake.volume>12)) {
          s.stream=0; enter('cook');
        }
      }
      if(s.phase==='cook'||s.phase==='second'){
        P.spread(s.cake,dt); P.heat(s.cake,dt,s.power);
      }
      if(s.phase==='flip'){
        const old=s.flight;
        s.flight=Math.min(1,s.stageTime/0.64);
        P.heat(s.cake,dt,0,false);
        if(old<0.5 && s.flight>=0.5) P.flip(s.cake);
        if(s.flight===1)enter('second');
      }
      if(s.phase==='stack'){
        s.transfer=Math.min(1,s.stageTime/0.85);
        P.heat(s.cake,dt,0,false);
        if(s.transfer===1){
          s.stack.splice(s.placeAt,0,s.cake); s.cake=null;
          if(s.stack.length<3)load(); else enter('butter');
        }
      }
      s.stack.forEach((c,i)=>{
        const under=s.stack[i-1];
        const over=s.stack[i+1];
        P.heat(c,dt,0,false,under?P.meanFace(under,'temp',1-under.contact):27);
        if(over) {
          const contactT=P.meanFace(over,'temp',over.contact);
          c.cells.forEach(q=>{const f=1-c.contact;q.temp[f]=P.relax(q.temp[f],contactT,0.075,dt);});
        }
      });
      const top=s.stack[s.stack.length-1];
      if(s.butter && top)P.melt(s.butter,top,dt);
      if(s.phase==='syrup'||s.syrup.flow>0.003) {
        aim=((Math.round(angle*4/Math.PI)%8)+8)%8;
        P.drizzle(s.syrup,dt,s.phase==='syrup'&&active,aim,top);
        if(s.phase==='syrup' && (s.syrup.volume>13||(!active&&s.syrup.volume>2.6)))enter('berry');
      }
      if(s.phase==='eat' && (s.biteTime>0||s.stageTime>2.4)) {
        s.biteTime+=dt;
        if(s.biteTime>1.65) {
          s.servings++; s.biteTime=0;
          if(s.servings===3)enter('wash');
        }
      }
      if(s.phase==='wash') {
        s.scrub+=held?dt*(0.24+stroke*0.24):0;
        const used=Math.min(s.scrub,dt*1.25);
        s.scrub-=used; s.dirt=Math.max(0,s.dirt-used);
        s.splash=P.relax(s.splash,held?0.9:0,4,dt);
        if(s.dirt<=0)reset();
      }
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<=0)return;
      const n=Math.ceil(dt*120);
      for(let i=0;i<n;i++)tick(dt/n);
    }
    return {step,getState:()=>JSON.parse(JSON.stringify(s)),read:()=>s,down,move,up,readyToFlip};
  }
  root.createKitchen=kitchen;
  if(typeof module!=='undefined')module.exports=kitchen;
})(globalThis);
