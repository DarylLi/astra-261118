// Soup-space coordinates use the radius of the surface as one unit.
(() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const tau = Math.PI * 2;
  const start = [[-.56,.07,.31],[.33,-.47,.36],[.46,.42,.33]];
  class Soup {
    constructor() {
      this.time = this.idle = this.omega = this.circulation = this.speed = 0;
      this.x = this.tx = -.22; this.z = this.tz = .13;
      this.down = false; this.cycle = this.age = this.joy = this.mix = 0;
      this.phase = 'stir'; this.invite=0; this.ripple = this.scoop = 0; this.carried = null; this.wakeLeaf=null;
      this.turns = this.brakes = this.lifts = this.washes = 0;
      this.food = Array.from({length:42}, (_,i) => {
        const kind = i < 11 ? 0 : i < 23 ? 1 : 2;
        const a = i*2.39996 + .38, r = .2 + .66 * Math.sqrt(((i*19+7)%43)/43);
        return {kind,x:r*Math.cos(a),z:r*Math.sin(a),vx:0,vz:0,spin:i*.84,seed:i*.89,up:0,unfold:0};
      });
      this.lumps = start.map(([x,z,m]) => ({x,z,m,initial:m, dye:0, angle:0}));
    }
    grab() { this.down = true; this.idle = 0; this.ripple = 1; this.tx=this.x; this.tz=this.z; }
    move(x,z) {
      if (!this.down || !Number.isFinite(x+z)) return;
      const k=Math.min(1,.87/(Math.hypot(x,z)||1));
      this.tx=x*k; this.tz=z*k; this.idle=0;
    }
    release() { this.down=false; this.tx=this.x; this.tz=this.z; this.idle=0; }
    step(dt) {
      this.time+=dt; this.idle+=dt; this.age+=dt;
      const ease=1-Math.exp(-dt*16);
      const dx=(this.tx-this.x)*ease, dz=(this.tz-this.z)*ease;
      this.x+=dx; this.z+=dz;
      const vx=dx/dt, vz=dz/dt, speed=Math.hypot(vx,vz);
      this.speed+=(speed-this.speed)*(1-Math.exp(-dt*10));
      const torque=this.x*vz-this.z*vx, old=this.omega;
      if (old*torque < -.28) this.brakes+=dt;
      this.omega=clamp(old*Math.exp(-dt*(.28+(old*torque<0?.68:0)))+torque*dt*2.5,-4.4,4.4);
      this.circulation+=this.omega*dt; this.turns+=Math.abs(this.omega)*dt/tau;
      this.invite*=Math.exp(-dt*2.7);
      this.ripple*=Math.exp(-dt*3.4);
      const radius=Math.hypot(this.x,this.z);
      const lift=this.down && radius>.67 && this.speed<.70 ? clamp((radius-.67)*7,0,1) : 0;
      this.scoop+=(lift-this.scoop)*(1-Math.exp(-dt*5));
      if (this.carried && (!this.down || radius<.55 || speed>2.8)) {
        this.carried.vx=vx*.36; this.carried.vz=vz*.36;
        this.carried=null; this.ripple=1;
      }
      // A straight inward stroke draws the broadest leaf into the wake behind the cup.
      const radialSpeed=(vx*this.x+vz*this.z)/Math.max(.05,radius);
      if(!this.down || speed<.09 || radialSpeed>.15 || Math.abs(torque)>1.1)this.wakeLeaf=null;
      for (const f of this.food) {
        const ex=f.x-this.x, ez=f.z-this.z, d=Math.hypot(ex,ez), proximity=Math.max(0,1-d/.42);
        if (!this.carried && this.down && f.kind===0 && d<.15 && speed<1.6 && this.scoop<.7) this.carried=f;
        if(!this.wakeLeaf && f.kind===1 && this.down && radius>.43 && radialSpeed<-.22 && d<.36 && Math.abs(torque)<.6)this.wakeLeaf=f;
        const inWake=this.wakeLeaf===f,raised=this.carried===f;
        f.unfold+=((inWake?1:0)-f.unfold)*(1-Math.exp(-dt*4));
        if (raised) {
          if (f.up<.48 && this.scoop>.5) this.lifts+=dt;
          f.x+=(this.x-f.x)*ease; f.z+=(this.z-f.z)*ease; f.vx=f.vz=0;
        } else if(inWake){
          const k=1-Math.exp(-dt*11),tail=.18/Math.max(.09,speed);
          const targetX=this.x-vx*tail,targetZ=this.z-vz*tail;
          f.vx=(targetX-f.x)*8; f.vz=(targetZ-f.z)*8;
          f.x+=(targetX-f.x)*k; f.z+=(targetZ-f.z)*k;
          const angle=Math.atan2(vx,vz)-f.spin;
          f.spin+=Math.atan2(Math.sin(angle),Math.cos(angle))*k;
        } else {
          const response=[2.4,4.4,6.2][f.kind], drag=1-Math.exp(-dt*response);
          const w=this.omega*(.57+.14*f.kind),r0=Math.max(.09,Math.hypot(f.x,f.z));
          const restingRadius=.26+.44*(.5+.5*Math.sin(f.seed+.12*this.time));
          const outward=Math.abs(w)*.033+.32*(restingRadius-r0)/(r0*(1+3*Math.abs(w)));
          const targetX=-f.z*w+f.x*outward+.024*Math.cos(this.time*.8+f.seed)+vx*proximity*.76;
          const targetZ=f.x*w+f.z*outward+.024*Math.sin(this.time*.66+f.seed)+vz*proximity*.76;
          f.vx+=(targetX-f.vx)*drag; f.vz+=(targetZ-f.vz)*drag;
          f.x+=f.vx*dt; f.z+=f.vz*dt;
          const r=Math.hypot(f.x,f.z), limit=.87+.035*f.kind;
          if (r>limit) {f.x*=limit/r; f.z*=limit/r;}
        }
        if(inWake){const r=Math.hypot(f.x,f.z);if(r>.92){f.x*=.92/r;f.z*=.92/r;}}
        f.up+=((raised?this.scoop:0)-f.up)*ease;
        f.spin+=dt*(this.omega*(.48+.22*f.kind)+.13*Math.sin(f.seed+this.time));
      }
      // Broad tofu faces displace neighbouring floating pieces at the surface.
      // A lifted piece passes above them and can be set down elsewhere.
      for(let i=0;i<11;i++){
        const a=this.food[i];
        if(a.up>.24)continue;
        for(let j=i+1;j<this.food.length;j++){
          const b=this.food[j],dx=b.x-a.x,dz=b.z-a.z,space=b.kind===0?.17:b.kind===1?.134:.114;
          const d2=dx*dx+dz*dz;
          if(d2>=space*space||b.up>.24)continue;
          const d=Math.sqrt(d2)||.001,force=(space-d)*Math.min(.49,dt*7)/d;
          const share=a===this.carried?0:b===this.carried?1:b.kind===0?.5:.19;
          a.x-=dx*force*share;a.z-=dz*force*share;b.x+=dx*force*(1-share);b.z+=dz*force*(1-share);
        }
      }
      for(const f of this.food){
        const r=Math.hypot(f.x,f.z),limit=.875+.034*f.kind;
        if(r>limit){f.x*=limit/r;f.z*=limit/r;}
      }
      let mass=0;
      for (const l of this.lumps) {
        let a=Math.atan2(l.z,l.x)+this.omega*.19*dt;
        const r=Math.hypot(l.x,l.z); l.x=r*Math.cos(a); l.z=r*Math.sin(a);
        const near=Math.max(0,1-Math.hypot(this.x-l.x,this.z-l.z)/.45);
        const wash=this.down ? Math.min(speed,4)*near : 0;
        if (wash>.3 && l.m>0) this.washes+=dt;
        const dissolved=this.phase==='stir' ? Math.min(l.m, dt*(.047*wash+.0018*Math.min(speed,3)+.0025*Math.abs(this.omega)**1.45)) : 0;
        l.m-=dissolved; l.dye=l.dye*Math.exp(-dt*(.35+Math.abs(this.omega)*.24))+dissolved*18;
        l.angle+=dt*(this.omega*.4+.033); mass+=l.m;
      }
      if(this.phase==='stir') {
        this.mix=1-mass;
        if(mass<.003) {this.phase='ready'; this.age=0; this.mix=1; for(const l of this.lumps) l.m=0;}
      } else if(this.phase==='ready' && this.age>=5.5) {this.phase='refill'; this.age=0;}
      if(this.phase==='refill') {
        const u=clamp(this.age/4.5,0,1), k=u*u*(3-2*u);
        this.mix=1-k;
        for(const l of this.lumps) l.m=l.initial*k;
        if(u>=1) {this.phase='stir'; this.age=0; this.cycle++;}
      }
      this.joy+=((this.phase==='ready'?1:0)-this.joy)*(1-Math.exp(-dt*1.7));
    }
  }
  globalThis.SoupFlow=Soup;
})();
