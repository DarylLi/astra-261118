/* The solver uses metres, kilograms, seconds and radians. It has no renderer. */
(function (scope) {
  'use strict';
  const K = 300, MASS = 0.3, LIMIT = 0.2, H = 1 / 240;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  function createGame(seed = 30911) {
    function random() { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }
    const spring = (x = 0, v = 0) => ({x, v});
    function drive(p, target, stiffness, drag) { p.v += ((target - p.x) * stiffness - drag * p.v) * H; p.x += p.v * H; }
    const s = {
      phase: 'ready', age: 0, idle: 0, rounds: 0, compression: 0, compressionV: 0,
      fist: spring(), cushion: spring(), catcher: spring(), playerTilt: spring(), rivalTilt: spring(), head: [spring(), spring()],
      aerial: {y: 0, v: 0, spin: 0, omega: 0, detached: false, rebounds: 0},
      lid: spring(), prize: spring(), fitting: spring(), equipped: -1, offered: 0,
      lamps: Array.from({length: 24}, () => spring()), pendulum: spring(.018),
      water: [spring(.0006), spring(-.0002), spring(.0001), spring()], tracking: spring(), wind: spring(.055), pressure: .10, draftLife: .64, dust: [],
      eyes: [0, 1].map(() => ({blink: spring(), until: 2 + random() * 3, shut: 0})),
      hint: spring(), hintStage: 0, hintWait: 0, ripple: {player:spring(), rival:spring(), box:spring()}, light: spring(.45),
      impact: 0, contactSpeed: 0, launchSpeed: 0, lastCompression: 0, hit: false, noise: 0, soundEvent: 0, soundKind: '',
    };
    for(let i = 0; i < 40; i++) s.dust.push({x: random()*9-4.5, y:.72+random()*4.8, z: random()*6-3, v:random()*.03, fall:.009+random()*.023});
    let remainder = 0, resetDelay = 0;
    const change = phase => { s.phase = phase; s.age = 0; s.idle = 0; s.hintStage = 0; s.hintWait = 0; };
    const tone = name => {s.soundKind = name; s.soundEvent++;};
    function press(what) {
      if (what === 'glove' && s.phase === 'ready') {
        change('charging'); s.compressionV = 0; s.impact = 0; s.contactSpeed=0; s.hit = false; tone('hold'); return true;
      }
      if (what === 'prize' && s.phase === 'reward' && s.prize.x > .42) {change('fitting'); tone('equip'); return true;}
      return false;
    }
    function release() {
      if (s.phase !== 'charging') return false;
      s.lastCompression = s.compression; s.launchSpeed = Math.sqrt(K/MASS)*s.compression;
      s.fist.x = 0; s.fist.v = s.launchSpeed; s.compression = 0; s.compressionV = 0;
      change('punch'); tone('swish'); return true;
    }
    function cancel() {if(s.phase === 'charging'){change('ready'); s.compressionV = 0;}}
    function launch(momentum) {
      const a = s.aerial; a.detached = true; a.y = 0; a.rebounds = 0;
      // The catch releases a second, preloaded spring inside the blue cuff.
      a.v = Math.sqrt(160/.3)*(.245+momentum*.027); a.spin = 0; a.omega = 2.6+momentum*.5;
      change('flight'); tone('pop');
    }
    function ambient() {
      s.draftLife -= H;
      if(s.draftLife <= 0){s.pressure = .018 + random()*.13; s.draftLife = .5+random()*2;}
      drive(s.wind, s.pressure, 2.9, 2.1); drive(s.pendulum, (s.wind.x-.07)*.41, 5, .64);
      for(let i=0;i<s.water.length;i++){
        const neighbor=s.water[(i+1)%s.water.length];
        const pressure=(s.wind.x-.065)*.008*(1-i*.16) + .15*neighbor.x;
        drive(s.water[i],pressure,62+i*16,2.9+i*.55);
      }
      drive(s.tracking,s.phase==='flight'?s.aerial.y*.34:0,13,6.1);
      drive(s.light, .36+s.wind.x*1.6 + Math.abs(s.pendulum.v)*2, 6, 3.2);
      for (const d of s.dust) {
        d.v += (s.wind.x * (.6 + .062*d.y) - d.v) * .75 * H;
        d.x += d.v*H; d.y -= d.fall*H; if(d.x > 5) d.x=-5; if(d.y<.6) d.y=5.5;
      }
      for(let i=0;i<2;i++){
        const e=s.eyes[i]; e.until -= H; e.shut -= H;
        if(e.until<0){e.shut=.13; e.until=2.4+random()*3.2;}
        drive(e.blink, e.shut>0?.95:0, 670, 38);
        drive(s.head[i], (i?-1:1)*s.wind.x*.15 - (i?s.rivalTilt.v:s.playerTilt.v)*.12, 29+i*7, 3.2);
      }
      drive(s.cushion,0,320,18);
      drive(s.catcher,s.aerial.detached && s.phase!=='reset'?1.10:0,69,15);
      for(const p of Object.values(s.ripple)) drive(p,0,65,4.5);
      const waiting = s.phase === 'ready' || s.phase === 'reward';
      if (waiting && s.idle >= 4) {
        s.hintWait -= H;
        if(s.hintWait<=0){s.hintStage = (s.hintStage % 3)+1; s.hintWait=[0,.78,.52,.6][s.hintStage]+.25*s.wind.x;}
      }
      drive(s.hint, waiting && s.hintStage===2?1:0, 37, 9);
    }
    function tick() {
      s.age += H; s.idle += H; ambient();
      drive(s.playerTilt, s.phase==='charging'?-s.compression*.46:s.wind.x*.014, 23, 4.7);
      drive(s.rivalTilt, -s.wind.x*.025, 26, 4.1);
      if(s.phase === 'charging') {
        // Finger pressure approaches 60 N, opposed by the arm spring and damper.
        s.compressionV += (60 - K*s.compression - 42*s.compressionV)/2.3*H;
        s.compression = clamp(s.compression + s.compressionV*H,0,LIMIT);
        if(s.compression>=LIMIT) s.compressionV=0;
      } else if (s.phase !== 'punch') {
        drive(s.fist, 0, 70, 10); s.compression *= Math.exp(-16*H);
      }
      if (s.phase==='punch') {
        s.fist.v += (-26*s.fist.x-1.1*s.fist.v)*H; s.fist.x+=s.fist.v*H;
        const gap=.39 + s.rivalTilt.x*.6-s.playerTilt.x*.4;
        if(s.fist.x>=gap && s.fist.v>0){
          s.hit=true; s.contactSpeed=s.fist.v; s.impact=MASS*s.contactSpeed; s.rivalTilt.v+=s.impact*.68;
          s.cushion.v+=.95*s.impact; s.fist.v*=-.22; s.playerTilt.v-=s.impact*.13; launch(s.impact);
        } else if(s.fist.v<=0 || s.age>.48) {
          s.playerTilt.v+=.91+.22*s.fist.x; change('stumble'); tone('step');
        }
      } else if(s.phase==='stumble' && s.age>.46){launch(0);}
      const a=s.aerial;
      if(a.detached && !['fitting','reset'].includes(s.phase)){
        const catchHeight=s.catcher.x;
        const elastic = a.y<catchHeight && (a.rebounds>0 || a.v<0) ? (catchHeight-a.y)*134-a.v*2.3 : 0;
        const before=a.v; a.v += (-9.81+elastic-.07*a.v*Math.abs(a.v))*H; a.y+=a.v*H;
        if(before<0 && a.v>=0){a.rebounds++; if(a.rebounds===1)tone('bounce');}
        a.omega += (s.wind.x-a.omega)*.66*H; a.spin+=a.omega*H;
        if(s.phase==='flight' && a.rebounds>=2) {change('lights'); tone('lights');}
      }
      const celebrate=['lights','reward','fitting'].includes(s.phase);
      s.lamps.forEach((p,i)=>{
        const on=celebrate && (s.phase!=='lights' || s.age>=i*.047);
        drive(p,on?1:0,130,21);
      });
      if(s.phase==='lights' && s.age>1.27){change('reward'); s.offered=s.rounds%3; tone('box');}
      const open=s.phase==='reward'||s.phase==='fitting';
      drive(s.lid,open?1.35:0,45,8.5);
      drive(s.prize,open && s.lid.x>.63?.82+s.wind.x*.13:0,62,4.4);
      drive(s.fitting,s.phase==='fitting'?1:0,34,11.6);
      if(s.phase==='fitting' && s.age>1.45){s.equipped=s.offered; s.rounds++; resetDelay=.95; change('reset');}
      if(s.phase==='reset'){
        a.v+=(-40*a.y-11*a.v)*H; a.y+=a.v*H; a.spin*=Math.exp(-8*H);
        resetDelay-=H; if(resetDelay<=0){a.detached=false; a.y=0; change('ready');}
      }
    }
    function step(dt) {
      if(!Number.isFinite(dt)||dt<0) return;
      remainder+=dt; const n=Math.floor((remainder+1e-10)/H); remainder-=n*H;
      for(let i=0;i<n;i++)tick();
    }
    return { step, press, release, cancel, nudge(target){const p=s.ripple[target];if(p)p.v=Math.min(.25,p.v+.15);},
      getState:()=>JSON.parse(JSON.stringify(s)), state:s };
  }
  if(typeof module!=='undefined' && module.exports)module.exports={createGame};
  else scope.createBoxingGame=createGame;
})(globalThis);
