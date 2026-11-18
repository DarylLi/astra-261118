window.HarborAudio = function () {
  let ctx,master,enabled=true,sea;
  function unlock(){
    if(!ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      ctx=new Audio();master=ctx.createGain();master.gain.value=enabled?.52:0;master.connect(ctx.destination);
      const size=ctx.sampleRate*4,buffer=ctx.createBuffer(1,size,ctx.sampleRate),arr=buffer.getChannelData(0);
      let prev=0;for(let i=0;i<size;i++){prev=(prev+.13*(Math.random()*2-1))/.995;prev=Math.max(-1,Math.min(1,prev))*.94;arr[i]=prev;}
      const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
      const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=680;
      sea=ctx.createGain();sea.gain.value=.028;noise.connect(low).connect(sea).connect(master);noise.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function note(freq,end,start,len,vol,type,attack){
    const osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;
    osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(end,start+len);
    g.gain.setValueAtTime(.00001,start);g.gain.exponentialRampToValueAtTime(vol,start+attack);g.gain.exponentialRampToValueAtTime(.00001,start+len);
    osc.connect(g).connect(master);osc.start(start);osc.stop(start+len+.02);
    osc.onended=()=>{osc.disconnect();g.disconnect();};
  }
  function play(e){
    if(!ctx||!enabled)return;
    const t=ctx.currentTime+.006;
    if(e.type==='bell'){
      const f=[659.25,739.99,880,783.99,987.77][e.id%5];
      [[1,.19,1.8],[2.01,.046,1.02],[2.74,.032,.63],[4.12,.013,.36]].forEach(([a,v,l])=>note(f*a,f*a*.997,t,l,v,'sine',.009));
      note(380,140,t,.16,.026,'sine',.016);
    }else if(e.type==='horn'||e.type==='outbound'){
      const f=e.type==='horn'?220:196;
      [1,1.50,2,3].forEach((a,i)=>note(f*a*.957,f*a,t,1.48,[.134,.065,.028,.012][i],'sine',.19));
    }else if(e.type==='water')note(440,236,t,.15,.024,'sine',.017);
  }
  return {unlock,play,toggle(){enabled=!enabled;unlock();if(master)master.gain.setTargetAtTime(enabled?.52:0,ctx.currentTime,.055);return enabled;},
    breeze(w){if(sea)sea.gain.setTargetAtTime(.018+.015*w,ctx.currentTime,.7);}};
};
