(function(root){
  'use strict';
  function sound(){
    let ctx,water,filter;
    function start(touch=performance.now()){
      const Audio=root.AudioContext||root.webkitAudioContext;
      if(!Audio)return;
      try{
        if(!ctx){
          ctx=new Audio({latencyHint:'interactive'});
          const samples=ctx.createBuffer(1,ctx.sampleRate*1.5,ctx.sampleRate), data=samples.getChannelData(0);
          let value=0;
          for(let i=0;i<data.length;i++){value=.80*value+.20*(Math.random()*2-1);data[i]=value;}
          const noise=ctx.createBufferSource();noise.buffer=samples;noise.loop=true;
          filter=ctx.createBiquadFilter();filter.type='bandpass';filter.Q.value=.68;
          water=ctx.createGain();water.gain.value=0;
          noise.connect(filter).connect(water).connect(ctx.destination);noise.start();
        }
        const knock=()=>{
          const latency=1000*(ctx.outputLatency||ctx.baseLatency||0);
          if(ctx.state!=='running' || performance.now()-touch+latency+4>60)return;
          const now=ctx.currentTime, gain=ctx.createGain(), note=ctx.createOscillator();
          note.type='sine';note.frequency.setValueAtTime(740,now);note.frequency.exponentialRampToValueAtTime(492,now+.09);
          gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.048,now+.004);
          gain.gain.exponentialRampToValueAtTime(.0001,now+.13);
          note.connect(gain).connect(ctx.destination);note.start(now);note.stop(now+.14);
          note.onended=()=>{note.disconnect();gain.disconnect();};
        };
        if(ctx.state==='running')knock();else ctx.resume().then(knock).catch(()=>{});
      }catch{ /* The complete interaction is also visible in silence. */ }
    }
    function update(s){
      if(!water || ctx.state!=='running')return;
      const speed=Math.abs(s.whirl);
      filter.frequency.setTargetAtTime(450+speed*315+150*s.simmer,ctx.currentTime,.08);
      water.gain.setTargetAtTime(.007+.033*speed+.015*s.joy,ctx.currentTime,.09);
    }
    function quiet(){
      if(!water)return;
      water.gain.cancelScheduledValues(ctx.currentTime);
      water.gain.setTargetAtTime(0,ctx.currentTime,.015);
    }
    return {start,update,quiet};
  }
  root.MisoAudio={sound};
})(globalThis);
