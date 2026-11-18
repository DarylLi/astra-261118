// Run with node games/d-21/physics.test.cjs
'use strict';
const assert=require('node:assert/strict');
const {createGame}=require('./physics.js');
const H=1/240,deg=r=>r*180/Math.PI,fmt=(v,n=3)=>v.toFixed(n);
const report=(name,data)=>console.log(name+' | '+data);
const idle=createGame(),initial=idle.getState();idle.step(3.98);
assert.equal(idle.state.hintStage,0);idle.step(.05);assert.ok(idle.state.hintStage>0);
idle.step(5.97);const ten=idle.getState();
assert.equal(ten.phase,'ready');assert.ok(Math.abs(ten.dust[0].x-initial.dust[0].x)>.1);
assert.notEqual(ten.pendulum.x,initial.pendulum.x);assert.notEqual(ten.water[0].x,initial.water[0].x);
assert.notEqual(ten.water[0].x,ten.water[1].x);assert.notEqual(ten.light.x,initial.light.x);
report('idle 10s',`dust dx ${fmt(ten.dust[0].x-initial.dust[0].x)} m, water height ${fmt(initial.water[0].x*1000)} -> ${fmt(ten.water[0].x*1000)} mm, lamp tilt ${fmt(deg(initial.pendulum.x))} -> ${fmt(deg(ten.pendulum.x))} deg, light ${fmt(initial.light.x)} -> ${fmt(ten.light.x)}, hint at 4.03 s`);
function trial(compression){
  const g=createGame(217);assert.equal(g.press('prize'),false);g.press('glove');g.step(1);
  const before=g.getState();assert.equal(before.compression,.2);
  // Identical initialized mechanisms, poses, air, and random stream. Change only spring travel.
  g.state.compression=compression;g.release();
  let peak=0,player=0,rival=0,firstLamp,lastLamp,rewardAt,firstBounce,impulse,peakCushion=0;
  const stages=new Set(),lampOn=[];
  for(let i=1;i<=240*8;i++){g.step(H);const s=g.state;stages.add(s.phase);
    peak=Math.max(peak,s.aerial.y);player=Math.max(player,s.playerTilt.x);rival=Math.max(rival,s.rivalTilt.x);peakCushion=Math.max(peakCushion,s.cushion.x);
    if(s.aerial.rebounds && !firstBounce)firstBounce=i*H;
    if(s.impact && !impulse)impulse=i*H;
    s.lamps.forEach((l,n)=>{if(l.x>.5 && lampOn[n]===undefined)lampOn[n]=i*H;});
    if(s.phase==='reward'&&!rewardAt)rewardAt=i*H;
  }
  const s=g.state;firstLamp=lampOn[0];lastLamp=lampOn.at(-1);
  assert.ok(stages.has('flight')&&stages.has('lights')&&stages.has('reward'));assert.equal(s.phase,'reward');
  assert.equal(lampOn.length,24);assert.ok(lampOn.every((v,i)=>i===0||v>lampOn[i-1]));
  assert.ok(Math.abs(s.impact-.3*s.contactSpeed)<1e-9);assert.ok(Math.abs(s.launchSpeed-Math.sqrt(300/.3)*compression)<1e-9);
  assert.ok(s.aerial.rebounds>=2);assert.ok(firstBounce<firstLamp && lastLamp<rewardAt);
  assert.equal(g.press('glove'),false);assert.ok(g.press('prize'));g.step(3);assert.equal(s.phase,'ready');assert.equal(s.rounds,1);assert.equal(s.equipped,0);assert.equal(s.aerial.detached,false);
  return {before,stages,peak,player,rival,firstBounce,firstLamp,lastLamp,rewardAt,v:s.launchSpeed,p:s.impact,contact:s.contactSpeed,hit:s.hit,peakCushion};
}
const weak=trial(.02),middle=trial(.12),strong=trial(.20);
assert.deepEqual(weak.before,strong.before);assert.deepEqual(middle.before,strong.before);
assert.equal(weak.hit,false);assert.ok(weak.stages.has('stumble'));assert.ok(middle.hit&&strong.hit);
assert.ok(strong.p>middle.p&&middle.p>weak.p);assert.ok(strong.peak>middle.peak&&middle.peak>weak.peak);
assert.ok(weak.player>strong.player&&strong.rival>middle.rival);
for(const [compression,r] of [[.02,weak],[.12,middle],[.2,strong]]){
  report('spring '+compression+' m',`launch ${fmt(r.v)} m/s, contact ${fmt(r.contact)} m/s, impulse ${fmt(r.p)} kg m/s, player peak ${fmt(deg(r.player))} deg, rival peak ${fmt(deg(r.rival))} deg, height ${fmt(r.peak)} m, first bounce ${fmt(r.firstBounce)} s`);
}
report('reward',`first-to-last lamp ${fmt(strong.lastLamp-strong.firstLamp)} s, reward at ${fmt(strong.rewardAt)} s`);
const rounds=createGame();const styles=[];
for(let i=0;i<4;i++){rounds.press('glove');rounds.step(i*.18);rounds.release();rounds.step(6);assert.equal(rounds.state.phase,'reward');styles.push(rounds.state.offered);
  const lid=rounds.state.lid.x,prize=rounds.state.prize.x;assert.ok(lid>1.3&&prize>.6);
  assert.ok(rounds.press('prize'));let t=0;while(rounds.state.phase!=='ready'&&t<4){rounds.step(H);t+=H;}
  assert.equal(rounds.state.phase,'ready');assert.equal(rounds.state.equipped,styles.at(-1));
  if(i===0)report('fit',`lid ${fmt(deg(lid))} deg, prize travel ${fmt(prize*.93)} m, ready ${fmt(t)} s after selection`);
}
assert.deepEqual(styles,[0,1,2,0]);
const fixed=createGame(),partitioned=createGame();fixed.step(10);for(let i=0;i<600;i++)partitioned.step(1/60);assert.deepEqual(fixed.getState(),partitioned.getState());
const cancelled=createGame();cancelled.press('glove');cancelled.step(.4);cancelled.cancel();cancelled.step(1);assert.equal(cancelled.state.phase,'ready');assert.ok(cancelled.state.compression<1e-6);
console.log('All state checks passed.');
