(function(root){
  'use strict';
  const {v,group,material,patterned,oval,box,turn,hoop,rod,bent,m}=Kitchen, PI=Math.PI;
  const up=v(0,1,0);
  const skin=[material(0xe6b18b,.59),material(0xdca57f,.62),material(0xca936f,.63)];
  const hair=[material(0x342923,.61),material(0x342722,.58),material(0x292625,.67)];
  const fabrics=[patterned(0xd59840,'cloth',.92),patterned(0x799886,'cloth',.9),patterned(0x47627a,'cloth',.91)];
  const apron=[patterned(0xd1aa79,'cloth',.91),patterned(0xdfceb1,'cloth',.94),patterned(0x566258,'cloth',.94)];
  const rib=[patterned(0xe3b86e,'cloth',.91),patterned(0x688772,'cloth',.94),patterned(0x526c7e,'cloth',.91)];
  function sleeve(parent,length,r,c,fore){
    const g=group(parent);
    const pts=fore?[[.74,0],[.97,.045],[1.02,.14],[.94,.32],[.98,.38],[.90,.43],[.88,.61],[.94,.72],[.81,.79],[.82,.87],[.74,.96],[.74,1]]:
      [[.73,0],[.99,.10],[1.05,.23],[.98,.38],[.96,.56],[.92,.74],[.97,.81],[.85,.88],[.86,.96],[.74,1]];
    turn(g,fabrics[c],0,0,0,pts.map(([rad,h])=>[rad*r,h*length]),32);
    if(fore) {
      turn(g,rib[c],0,0,0,[[.77*r,.87*length],[.80*r,.9*length],[.73*r,.99*length],[.65*r,length],[.001*r,length]],32);
      for(let i=0;i<3;i++)hoop(g,fabrics[c],0,(.90+.023*i)*length,0,(.78-.015*i)*r,.008,36);
    }
    Kitchen.batchRigid(g);return g;
  }
  function arm(parent,shoulder,c,upper,lower,pole){
    const upperSleeve=sleeve(parent,upper,c===0?.173:.203,c,false);
    const foreSleeve=sleeve(parent,lower,c===0?.149:.181,c,true);
    const joint=oval(parent,fabrics[c],0,0,0,c===0?.14:.164,c===0?.14:.16,c===0?.14:.164);
    upperSleeve.position.copy(shoulder);
    return function pose(wrist){
      const dir=wrist.clone().sub(shoulder), dist=Math.max(.001,dir.length());dir.normalize();
      const along=Math.max(-upper,Math.min(upper,(upper*upper-lower*lower+dist*dist)/(2*dist)));
      const bend=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();
      const elbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,upper*upper-along*along)));
      upperSleeve.quaternion.setFromUnitVectors(up,elbow.clone().sub(shoulder).normalize());
      foreSleeve.position.copy(elbow);joint.position.copy(elbow);
      foreSleeve.quaternion.setFromUnitVectors(up,wrist.clone().sub(elbow).normalize());
      return {elbow,wrist,shoulder,upper,lower};
    };
  }
  function hand(parent,c,grasp){
    const g=group(parent), s=skin[c];
    if(grasp){
      oval(g,s,.098,.01,0,.11,.177,.095);
      for(let i=0;i<4;i++){
        const y=.097-i*.064, tipx=-.057+.014*i;
        bent(g,s,[v(.110,y,.047),v(.069,y+.014,.098),v(-.015,y+.008,.105),v(tipx,y-.006,.060),v(tipx-.009,y-.014,.019)],.034-.002*i);
        oval(g,s,tipx-.009,y-.014,.019,.032,.030,.031);
      }
      bent(g,s,[v(.126,.11,-.026),v(.090,.15,-.085),v(.01,.152,-.096),v(-.046,.112,-.070)],.049);
      oval(g,s,-.047,.110,-.069,.048,.048,.045);
    }else{
      oval(g,s,0,-.012,.078,.113,.071,.168);
      for(let i=0;i<4;i++){
        const x=(i-1.48)*.052,len=.147-.029*Math.abs(i-1.2);
        const finger=oval(g,s,x,-.032,.188+len*.29,.031,.038,len*.68);
        finger.rotation.x=.15;finger.rotation.y=(i-1.5)*.105;
      }
      const thumb=oval(g,s,-.116,-.009,.112,.044,.046,.099);thumb.rotation.y=-.65;
    }
    Kitchen.batchRigid(g);return g;
  }
  function person(scene,p,c) {
    const g=group(scene,p.x,0,p.z), s=c===0?.82:1.01, h=c===0?2.60:3.31;
    g.name=p.id;
    const trunk=group(g,0,h-.1,0);
    const torso=turn(trunk,fabrics[c],0,0,0,[[.48*s,-2.60],[.58*s,-1.68],[.55*s,-1.05],[.62*s,-.44],[.66*s,-.16],[.58*s,.08],[.27*s,.25],[.17*s,.27]]);
    torso.scale.z=.66;
    // Bib and neck tape lie on the front of the garment.
    const bib=oval(trunk,apron[c],0,-1.03,.24*s,.50*s,1.00*s,.19*s);
    for(const sign of [-1,1]){
      bent(trunk,apron[c],[v(sign*.46*s,-.59*s,.29*s),v(sign*.39*s,-.06*s,.36*s),v(sign*.32*s,.17*s,.21*s),v(sign*.31*s,.17*s,-.12*s)],.043*s);
      oval(trunk,m.brass,sign*.37*s,-.36*s,.397*s,.034*s,.034*s,.015*s);
    }
    box(trunk,apron[c],0,-1.07*s,.417*s,.48*s,.29*s,.041*s,.018);
    const head=group(trunk,0,.69*s,.035);
    oval(trunk,skin[c],0,.30*s,.025,.185*s,.23*s,.165*s);
    oval(head,skin[c],0,0,0,.338*s,.442*s,.308*s);
    oval(head,hair[c],0,.146*s,-.048*s,.349*s,.334*s,.305*s);
    for(const sign of [-1,1]){
      oval(head,skin[c],sign*.322*s,-.015*s,0,.061*s,.095*s,.057*s);
      const lid=oval(head,hair[c],sign*.127*s,-.02*s,.288*s,.055*s,.012*s,.014*s);lid.rotation.z=sign*.08;
      const brow=oval(head,hair[c],sign*.129*s,.049*s,.294*s,.061*s,.014*s,.015*s);brow.rotation.z=-sign*.075;
    }
    oval(head,skin[c],0,-.088*s,.303*s,.051*s,.085*s,.054*s);
    bent(head,material(0xac7561),[v(-.072*s,-.196*s,.258*s),v(0,-.209*s,.269*s),v(.072*s,-.196*s,.258*s)],.009*s);
    head.rotation.x=.25;
    if(c!==2){
      oval(head,hair[c],0,.088*s,-.302*s,.216*s,.209*s,.199*s);
      if(c===0)oval(head,rib[c],0,.21*s,-.304*s,.17*s,.065*s,.14*s);
    }
    return {g,trunk,head,bib,h,s};
  }
  function build(scene,state){
    const actors=state.people.map((p,i)=>person(scene,p,i));
    const girl=state.people[0],shoulder=v(girl.x-.39,2.60,girl.z+.045);
    const stirringArm=arm(scene,shoulder,0,.96,.94,v(.83,-.55,-.18));
    const gripHand=hand(scene,0,true);
    const other=[], bowls=[];
    for(let c=1;c<3;c++){
      const p=state.people[c];
      const bowl=Kitchen.bowl(scene,p.x,1.38,p.z+1.0,.49,c===1?m.stripe:m.brown,c===1?m.cream:m.brown);
      bowl.name=p.id+'-bowl';bowls.push(bowl);
    }
    for(let c=0;c<3;c++){
      const p=state.people[c],h=actors[c].h;
      for(const sign of (c===0?[1]:[-1,1])){
        const shoulder=v(p.x+sign*(c===0?.40:.55),h-.08,p.z+.02);
        const wrist=v(p.x+sign*(c===0?.47:.42),c===0?1.20:1.53,p.z+(c===0?.72:.83));
        const pose=arm(scene,shoulder,c,c===0?.87:1.04,c===0?.85:1.02,v(sign*.65,-.25,-.5));
        const palm=hand(scene,c,false);palm.scale.setScalar(c===0?.89:1.1);
        other.push({pose,palm,wrist,c,sign});
      }
    }
    // Bowl and shaft meet at the rolled lip. The hand shares the shaft transform.
    const bowlRoot=group(scene), shaft=group(scene);
    turn(bowlRoot,m.steel,0,0,0,[[.001,-.211],[.10,-.195],[.202,-.139],[.258,-.052],[.274,.018],[.262,.022],[.243,-.047],[.19,-.126],[.09,-.18],[.001,-.19]]);
    hoop(bowlRoot,m.steel,0,.019,0,.269,.009,64);
    turn(shaft,m.steel,0,0,0,[[.056,0],[.050,.30],[.032,.65],[.038,.94],[.001,.95]]);
    turn(shaft,m.walnut,0,0,0,[[.044,.90],[.061,.944],[.067,1.08],[.069,1.44],[.090,1.78],[.096,1.96],[.084,2.008],[.04,2.031],[.001,2.032]]);
    for(const y of [.937,1.006,1.91])hoop(shaft,m.brass,0,y,0,y>1.5?.094:.063,.013,40);
    const glint=oval(shaft,m.brass,.007,1.31,.065,.024,.034,.012);
    Kitchen.batchRigid(bowlRoot);
    function update(s){
      const l=s.ladle;
      const y=MisoSim.surface(l.x,l.z,s)+.047;
      bowlRoot.position.set(l.x,y,l.z);bowlRoot.rotation.set(-.21+l.tilt,0,.12+l.tilt*.6);
      const start=v(.09,.018,-.246).applyQuaternion(bowlRoot.quaternion).add(bowlRoot.position);
      const axis=shoulder.clone().sub(start).add(v(-.16,-.13,.15)).normalize();
      shaft.position.copy(start);shaft.quaternion.setFromUnitVectors(up,axis);
      const grip=start.clone().addScaledVector(axis,1.60);
      gripHand.position.copy(grip);gripHand.quaternion.copy(shaft.quaternion);
      const wrist=v(.17,.01,-.046).applyQuaternion(gripHand.quaternion).add(grip);
      const stirring=stirringArm(wrist);
      glint.scale.x=.024*(1+.22*s.guide);
      for(const part of other){
        const {pose,palm,wrist,c,sign}=part;
        const lift=s.joy*(.29+.15*Math.sin(4.4*s.time+c));
        const pos=wrist.clone().add(v(-sign*.021*s.joy,lift+.012*Math.sin(1.3*s.time+c),.046*s.joy));
        if(c>0 && sign===1)bowls[c-1].position.set(wrist.x-.42,pos.y-.15,pos.z+.17);
        pose(pos);palm.position.copy(pos);palm.rotation.set(.36-.88*s.joy,sign*.30,sign*.20*s.joy);
      }
      for(let i=0;i<actors.length;i++){
        actors[i].head.rotation.x=.25+.014*Math.sin(s.time*1.2+i)+.155*s.joy*Math.sin(3.4*s.time+i);
      }
      return {stirring,grip,start};
    }
    return {actors,update,shaft,gripHand,bowlRoot};
  }
  root.MisoFamily={build};
})(globalThis);
