'use strict';
const Interface=(()=>{
  const $=s=>document.querySelector(s),stages=[...document.querySelectorAll('.stage')];
  // Small pictograms model the same three objects visible in the clearing.
  function icon(can,name,light=false){
    can.width=can.height=96;const c=can.getContext('2d');c.scale(3,3);
    const ink=light?'#e5ddbb':'#4c584c', tint=light?'#c3b58a':'#8b967d',hi=light?'#e9c776':'#f8e1a5';
    c.lineWidth=1.7;c.lineJoin=c.lineCap='round';
    const path=(d,f=ink,s)=>{const p=new Path2D(d);if(f){c.fillStyle=f;c.fill(p);}if(s){c.strokeStyle=s;c.stroke(p);}};
    const dot=(x,y,r,f)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=f;c.fill();};
    if(name==='bucket'){
      path('M6 4.9 L10.7 4.1 L16.9 14.2 L13.1 18.1 Z',tint,ink);
      path('M12.6 12.4 Q14.5 10.6 16.4 12 L19.5 17.6 L24.9 19.7 L28.5 18.8 L25.3 23.3 L20.6 25.3 Q15.2 27.1 11.6 22.3 Q9 18.1 12.6 12.4Z',ink);
      path('M12 22 Q16.5 27.7 24.6 23.6 L26.8 21.9',null,tint);dot(14.3,15.2,2.15,hi);dot(14.3,15.2,.85,ink);
    }else if(name==='drop'){
      path('M16 3 C14.1 7.9 7.5 15.4 7.5 20.1 C7.5 31.1 24.6 31.1 24.6 20.1 C24.6 15.8 18.8 8.7 16 3Z',tint);
      path('M11.1 20.4 Q11.2 23.9 14.5 24.5',null,light?'#ffffde':'#f2efd4');
    }else if(name==='chest'){
      path('M4.9 15.4 Q4.8 6.7 10.5 6.7 L22 6.7 Q27 7.1 27.1 15.4 Z',tint,ink);
      path('M5.1 17.6 H27 V25.1 Q27 26.6 25.2 26.6 H7 Q5.1 26.6 5.1 25.1Z',tint,ink);
      path('M10 8V15 M22.3 8V15 M10 18V25 M22.3 18V25',null,ink);path('M13.6 14.9H18V20.6H13.6Z',hi,ink);
    }else if(name==='sound'||name==='mute'){
      path('M4.8 12.1 H10.4 L17.5 6.4 Q18.5 5.8 18.5 7.3 V25 Q18.4 26.1 17.4 25.4 L10.4 19.8 H4.8 Z',ink);
      c.lineWidth=2;if(name==='sound'){path('M22 11 Q26.1 16 22 21 M25.7 7.9 Q32 16 25.7 24.1',null,ink);}
      else path('M23 13L29 19 M29 13L23 19',null,ink);
    }else if(name==='truck'){
      path('M2.1 9 L19.4 9 L17.2 18.5 H6 Z',light?'#edcc83':tint);
      path('M2 7.3H20V9.6H2Z',hi);path('M20.1 12H25.9L30 17.2V22.6H27.7Q26.6 18.7 22.8 20.3H11.4Q8.3 18.4 6 22.6H3V19.8H19Z',ink);
      path('M22.1 13.7H25L27.5 17H22.1Z',light?'#555e50':hi);
      dot(8.3,23.2,3.1,ink);dot(24.6,23.2,3.1,ink);dot(8.3,23.2,1.1,'#666e60');dot(24.6,23.2,1.1,'#666e60');
    }else if(name==='soil'){
      path('M3 24 Q5 20 8.5 19.1 Q10.6 12.1 16.6 12.2 Q21.6 11.3 23.3 17.7 Q27.6 18.9 29.1 24.1Z',tint);
      path('M4.1 24.2H28.5',null,ink);dot(14,16.5,1,hi);dot(18.6,18.3,.8,hi);dot(10.5,21,.8,hi);
    }else if(name==='horn'){
      path('M2 14.1 H16 Q22.7 13.3 27.6 6.8 V23.1 Q21.9 17.6 16 17.3 H2Z',hi);
      path('M8.5 17.3 Q6.9 24.7 14.8 24.7 Q21.6 24.7 20 17.9 M11 11.3V19 M15.1 11.3V19',null,ink);
    }
  }
  document.querySelectorAll('[data-icon]').forEach(c=>icon(c,c.dataset.icon));
  const level=$('#level'),bars=[];
  for(let i=0;i<7;i++){const bar=document.createElement('span'),fill=document.createElement('i');bar.append(fill);level.append(bar);bars.push(fill);}
  const hand=$('#hand'),hc=hand.getContext('2d');hc.scale(2,2);hc.lineJoin='round';
  const handPath=new Path2D('M18 36L10 20Q8 16 11.6 14.2Q14.4 13 16.3 16.5L21.6 24.8L13.3 6.2Q11.7 2.4 15 1.2Q18.2 .1 19.9 4L27.4 20.5L26 16.6Q25.4 13.9 28 13.1Q31 12.4 32.2 15.6L34.3 20.4Q33.9 15.9 37 16.1Q39.7 16 40.7 19.9L42 23.2Q42.9 19.6 45.3 21.4Q47.6 22.5 48.3 26.1L50 34.8Q51.4 40.8 47.8 47.3L46.7 50.3L30.9 56.1Q27.2 52.8 24.4 50.3Q17.8 47.4 13.9 43.4L6.7 36.1Q3 32.1 6.4 29.8Q9 28 12.8 31.9Z');
  hc.fillStyle='#fff8df';hc.fill(handPath);hc.strokeStyle='#716b54';hc.lineWidth=1.35;hc.stroke(handPath);
  hc.strokeStyle='#cfbea0';hc.lineWidth=2;hc.stroke(new Path2D('M32.4 50.2L44.4 46.2'));
  let phase='',muted=false,ac,master,engine,engineGain,noiseBuf,lastAct='',lastPlays=0,lastPhase='';
  function unlock(){
    if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      ac=new C();master=ac.createGain();master.gain.value=muted?0:.55;master.connect(ac.destination);
      engine=ac.createOscillator();engine.type='triangle';engine.frequency.value=47;
      engineGain=ac.createGain();engineGain.gain.value=.012;engine.connect(engineGain);engineGain.connect(master);engine.start();
      noiseBuf=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const d=noiseBuf.getChannelData(0);let v=0;
      for(let i=0;i<d.length;i++){v=.72*v+.28*(Math.random()*2-1);d[i]=v;}
    }if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function tone(freq,dur,gain,type='sine',delay=0){
    if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.032);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function rustle(freq,gain,dur){
    if(!ac)return;const n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=noiseBuf;n.loop=true;
    f.type='bandpass';f.frequency.value=freq;f.Q.value=.82;n.connect(f);f.connect(g);g.connect(master);g.gain.value=gain;
    g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);n.start();n.stop(ac.currentTime+dur);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};
  }
  $('#sound').addEventListener('click',()=>{unlock();muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.55,ac.currentTime,.03);
    $('#sound').setAttribute('aria-pressed',String(!muted));icon($('#sound canvas'),muted?'mute':'sound');if(!muted)tone(440,.12,.07);});
  function update(s,screen){
    const p=s.phase,i=p==='soil'||p==='reset'?0:p==='spring'?1:2;
    if(p!==phase){stages.forEach((st,j)=>{st.classList.toggle('active',j===i);st.classList.toggle('past',j<i);});
      icon($('#meter-left'),i===0?'soil':i===1?'drop':'chest',true);icon($('#meter-right'),i===0?'truck':i===1?'chest':'horn',true);phase=p;}
    const f=i===0?s.truck.load/s.capacity:i===1?s.phaseAge/2.1:p==='chest'?s.chest.exposed:p==='opening'?s.horn.height:1;
    bars.forEach((b,k)=>b.style.transform='scaleX('+Math.min(1,Math.max(0,f*7-k))+')');
    const hp=s.hint.pressure,visible=hp>.012 && ['soil','chest','horn'].includes(p)&&s.action==='rest'&&!s.held;
    hand.style.opacity=visible?Math.min(.94,hp*1.12):0;
    if(visible){const q=screen;hand.style.transform='translate('+ (q.x-13+14*(1-hp))+'px,'+(q.y-4-24*(1-hp))+'px) scale('+(.86+.12*(1-hp))+')';}
    if(ac){
      engine.frequency.setTargetAtTime(43+s.engine.v*85+(s.action==='cut'?10:0),ac.currentTime,.10);
      engineGain.gain.setTargetAtTime(p==='soil'?(s.action==='rest'?.011:.027):.005,ac.currentTime,.22);
      if(s.action!==lastAct){if(s.action==='pour')rustle(710,.26,.76);if(s.action==='lift')rustle(320,.14,.30);}
      if(p!==lastPhase && p==='spring'){for(let j=0;j<6;j++)tone(460+j*77,.28,.045,'sine',j*.18);}
      if(p!==lastPhase && p==='opening'){[523.25,659.25,783.99].forEach((fr,j)=>tone(fr,.76,.065,'sine',.18+j*.16));}
      if(s.horn.plays>lastPlays){
        const fr=[392,493.88,523.25,440][(s.horn.plays-1)%4];
        [1,2,3,4].forEach((m,j)=>tone(fr*m,.67-j*.045,[.21,.105,.049,.026][j],'sine'));}
    }
    lastAct=s.action;lastPhase=p;lastPlays=s.horn.plays;
  }
  return {update,unlock,rustle};
})();
