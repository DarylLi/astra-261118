function snowSound(sim){
  let ctx,master,motor,rumble,brush,filter,last=-1,muted=false;
  function start(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=muted?0:.25;master.connect(ctx.destination);
      motor=ctx.createOscillator();motor.type='triangle';motor.frequency.value=47;
      rumble=ctx.createGain();rumble.gain.value=.073;motor.connect(rumble).connect(master);motor.start();
      const buff=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),arr=buff.getChannelData(0);
      const random=SnowRoad.rng(78);let p=0;
      for(let i=0;i<arr.length;i++){p=.75*p+.25*(random()*2-1);arr[i]=p;}
      const wind=ctx.createBufferSource();wind.buffer=buff;wind.loop=true;
      filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
      brush=ctx.createGain();brush.gain.value=.025;wind.connect(filter).connect(brush).connect(master);wind.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function bell(hz){
    const osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;osc.frequency.value=hz;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14,t+.028);g.gain.exponentialRampToValueAtTime(.0001,t+1.12);
    osc.connect(g).connect(master);osc.start();osc.stop(t+1.15);osc.onended=()=>{osc.disconnect();g.disconnect();};
  }
  function sync(){if(!ctx)return;const v=Math.abs(sim.car.v),b=Math.abs(sim.bus.v),t=ctx.currentTime;
    motor.frequency.setTargetAtTime(45+v*12+b*2.1+sim.car.load*v*.023,t,.11);
    rumble.gain.setTargetAtTime(.038+.036*v+.007*b,t,.15);
    brush.gain.setTargetAtTime(.025+Math.abs(sim.weather.wind)*.026+Math.min(.33,sim.car.load*v*.002),t,.12);
    filter.frequency.setTargetAtTime(610+v*370,t,.2);
    const k=sim.lamps.filter(q=>q.heat>.35).length;
    if(k>last&&k>0&&sim.phase==='bus'&&Math.floor((k-1)/4)>Math.floor((last-1)/4))bell([523.25,659.25,783.99][Math.floor((k-1)/4)]);
    last=k;
  }
  function toggle(){muted=!muted;start();if(ctx)master.gain.setTargetAtTime(muted?0:.25,ctx.currentTime,.07);return muted;}
  return {start,sync,toggle};
}
