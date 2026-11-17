'use strict';
const crock=mat(0xf4e7cb,.3), indigo=mat(0x254c59,.28), iron=mat(0x262a27,.68,.43);
const brass=mat(0xc29353,.32,.76), steel=mat(0xc4c9c5,.24,.91), walnut=oak(0x965c37);
const leaf=mat(0x558449), sage=mat(0xa8b77c), jade=mat(0x335e4f), dark=mat(0x323c31);
function bowl(p,x,y,z,r,m=crock){
  const o=group(p,x,y,z);o.scale.setScalar(r);
  lathe(o,m,0,0,0,[[0,0],[.38,0],[.40,.07],[.51,.13],[.71,.26],[.9,.49],[.99,.67],[1,.71],[.96,.73],[.92,.66],[.79,.45],[.63,.29],[.35,.16],[0,.15]]);
  ring(o,m===indigo?crock:indigo,0,.62,0,.954,.012);return o;
}
function board(p,x,z,w,d,rot){
  const g=group(p,x,.075,z);g.rotation.y=rot;
  box(g,walnut,0,0,0,w,.13,d,.057);
  for(let i=0;i<5;i++)box(g,oak([0xd4a16a,0xd8aa77,0xcfa06f,0xdbb280,0xc99a64][i]),0,.069,(-2+i)*d/5,w-.025,.019,d/5,.008);
  return g;
}
function scallion(p,x,y,z,len,rot){
  const g=group(p,x,y,z);g.rotation.y=rot;
  rod(g,crock,[0,0,0],[.26*len,.004,.008],.034,.043);
  rod(g,sage,[.26*len,.004,.008],[.51*len,.014,0],.043,.039);
  for(let j=0;j<3;j++)line(g,j%2?leaf:jade,[[.46*len,0,0],[len*.66,.026,j*.025-.03],[len*(.94+j*.065),.025,j*.057-.05]],.018+j*.002,8);
}
function jar(p,x,y,z,r,h,m,cap){
 const g=group(p,x,y,z);lathe(g,m,0,0,0,[[0,0],[r*.82,0],[r,.06],[r,h*.7],[r*.9,h*.82],[r*.64,h*.85],[r*.64,h],[0,h]]);
 lathe(g,cap,0,h,0,[[0,0],[r*.72,0],[r*.76,.027],[r*.73,.078],[0,.08]]);
 return g;
}
function kitchen(scene){
 const g=group(scene), cabinetry=mat(0x526c62,.58),recess=mat(0x425d54),wall=mat(0xe9dcc2),trim=oak(0xc39a69);
 box(g,wall,-8.62,2.9,-6.02,7.9,10,.22);
 box(g,wall,5.78,2.9,-6.02,13.8,10,.22);
 box(g,wall,-2.88,-.35,-6.02,3.70,3.59,.22);
 box(g,wall,-2.88,6.44,-6.02,3.70,3.64,.22);box(g,wall,-7.3,2,0,.18,11,14);
 box(g,mat(0xb6a58c),0,-2.32,0,24,.15,20);
 // The back counter, shaker fronts, inset panels and shell pulls.
 box(g,recess,0,-.75,-4.84,16,2.7,1.9);
 for(let i=-5;i<=5;i++){
   const x=i*1.40;
   box(g,cabinetry,x,-.76,-3.87,1.37,2.48,.13,.026);
   box(g,recess,x,-.95,-3.793,1.12,1.70,.024);
   box(g,cabinetry,x,-.95,-3.77,1.04,1.62,.025);
   line(g,brass,[[x-.18,.22,-3.77],[x-.17,.22,-3.68],[x+.17,.22,-3.68],[x+.18,.22,-3.77]],.025,12);
 }
 box(g,oak(0xcaac86),0,.63,-4.93,16,.17,2.13,.045);
 // Warm off-white handmade tile below the shelf.
 const tileM=[0xdcd7c5,0xe4dfcf,0xdddcca,0xd8d9c9].map(c=>mat(c,.31));
 for(let j=0;j<5;j++)for(let i=-9;i<10;i++){
   const x=(i+(j%2)*.5)*.82;
   if(j>=1&&x> -5.03&&x<-.75)continue;
   box(g,tileM[Math.floor(rand()*4)],x,.90+j*.375,-5.854,.806,.362,.076,.022);
 }
 // Deep wood window frame with glazed panes and a garden beyond.
 const windowG=group(g,-2.88,3.06,-5.73);
 for(const i of [-1,1]){
   box(windowG,trim,i*1.84,0,0,.13,3.43,.32);
   box(windowG,trim,0,i*1.64,0,3.77,.13,.32);
 }
 const garden=[0xb2bc8c,0x93ac89,0x72957b,0x829b73].map(c=>mat(c,.98));
 for(let j=0;j<8;j++){
   const x=-10.2+1.48*j,z=-11-rand()*2,h=2.5+rand()*2.8;
   rod(g,walnut,[x,-2.2,z],[x+.28,h,z+.11],.13,.06,8);
   for(let i=0;i<8;i++){let a=i*2.4,ex=x+Math.cos(a)*(.6+rand()*.7),ez=z+.7*Math.sin(a),ey=h+i*.14-.8;
      oval(g,garden[(i+j)%4],ex,ey,ez,1.12+rand()*.40,.72+rand()*.61,.81+rand()*.5);
   }
 }
 for(const i of [-1,0,1])box(windowG,trim,i*1.79,0,.22,.081,3.2,.11,.014);
 for(const i of [-1,0,1])box(windowG,trim,0,i*1.59,.23,3.65,.087,.11,.014);
 box(windowG,trim,0,-1.65,.22,3.98,.12,.48);
 // Open shelving, stacks of stoneware, preserving jars and a cast iron kettle.
 for(let j=0;j<2;j++){
  const sy=2.36+j*1.02;
  box(g,trim,2.8,sy,-5.59,6.45,.115,.75);
  for(const x of [.1,4.75]){
    box(g,brass,x,sy-.15,-5.73,.052,.3,.052);
    rod(g,brass,[x,sy-.30,-5.74],[x,sy-.06,-5.36],.023);
  }
  for(let i=0;i<3;i++)bowl(g,.75+j*2.5,sy+.057+i*.087,-5.52,.34-i*.013,i%2?indigo:crock);
  for(let i=0;i<3;i++)jar(g,2.43-j*1.1+i*.53,sy+.057,-5.61,.175+.02*i,.38+.065*((i+1)%3),[crock,mat(0xa87c4e,.35),mat(0x8c9a81,.3)][i],walnut);
 }
 const kettle=group(g,3.55,.725,-4.73),km=mat(0x56675c,.47,.42);
 lathe(kettle,km,0,0,0,[[0,0],[.36,0],[.52,.12],[.55,.35],[.48,.61],[.32,.70],[.31,.75],[0,.76]]);
 line(kettle,dark,[[-.39,.55,0],[-.42,.94,0],[0,1.13,0],[.42,.95,0],[.39,.55,0]],.047);
 rod(kettle,km,[-.43,.24,0],[-.80,.60,0],.18,.085);
 oval(kettle,walnut,0,.80,0,.085,.065,.085);
 // Herbs grown on the window sill.
 for(let j=0;j<2;j++){
   const plant=group(g,-4.34+j*.65,1.46,-5.24);
   const rr=.19+j*.05;lathe(plant,mat(j?0x9b6751:0xc7aa7b),0,0,0,[[0,0],[rr*.68,0],[rr,.37],[rr*1.08,.38],[rr*1.05,.44],[rr*.9,.44],[rr*.87,.39],[0,.39]]);
   for(let i=0;i<12;i++){const a=i*2.4,ex=Math.sin(a)*.29,ez=Math.cos(a)*.23,h=.65+rand()*.38;
     line(plant,leaf,[[0,.39,0],[ex*.35,h*.76,ez*.65],[ex,h,ez]],.008,6);
     for(let k=0;k<3;k++){const l=oval(plant,k%2?leaf:jade,ex+k*.025,h-k*.07,ez,.064,.109,.025);l.rotation.set(.32,a,.75*(k%2?1:-1));}
   }
 }
 // Freestanding worktop with continuous long-grain boards.
 box(g,cabinetry,0,-1.29,1.24,12,2.26,4.98);
 const planks=[0xdcb78b,0xd6ae81,0xe0bd92,0xdcb588,0xd5af84,0xe0ba90].map(oak);
 for(let i=0;i<12;i++)box(g,planks[i%6],0,-.116,-1.35+i*.46,12.6,.23,.461,.011);
 // Compact dark porcelain enamel hob and cast grate.
 const hob=mat(0x32443e,.32,.45);
 box(g,hob,0,.083,.08,3.07,.165,2.79,.078);
 box(g,iron,0,.158,.08,2.99,.064,2.70,.047);
 ring(g,iron,0,.245,.06,.88,.077);
 for(let i=0;i<4;i++){
   const a=i*Math.PI*.5+.78,x=Math.cos(a),z=Math.sin(a);
   rod(g,iron,[x*.66,.247,z*.66+.06],[x*1.22,.247,z*1.22+.06],.061);
 }
 const knob=group(g,.99,.104,1.493);knob.rotation.x=Math.PI/2;
 lathe(knob,dark,0,0,0,[[0,0],[.12,0],[.135,.03],[.124,.13],[.08,.14],[0,.14]]);
 box(knob,brass,0,.14,0,.026,.014,.15,.006);
 // Indigo woven towel with stitched selvedges and short threads.
 const towel=group(g,-2.33,.042,.78);towel.rotation.y=.19;
 const flax=cloth(0xe7dbc0),blue=cloth(0x465d66);
 for(let j=0;j<3;j++)box(towel,flax,.016*j,j*.034,0,.99,.063,1.67,.028);
 for(const x of [-.404,-.345,.30,.357])box(towel,blue,x,.100,0,.024,.008,1.65,.003);
 for(let i=0;i<33;i++)line(towel,i%9===0?blue:flax,[[-.46+i*.029,.068,.811],[-.46+i*.029,.052,.858],[-.47+i*.029,.035,.89+rand()*.04]],.007,3,4);
 const saucer=bowl(towel,0,.113,-.26,.38,indigo);saucer.scale.y*=.68;
 for(let i=0;i<2;i++)rod(towel,walnut,[-.36+i*.09,.146,.66],[.15+i*.09,.273,-.53],.017,.028);
 const b=board(g,2.24,.25,1.33,1.64,-.13);
 for(let j=0;j<3;j++)scallion(b,-.53,.123,-.39+j*.099,1.08,-.12+j*.05);
 const tofu=mat(0xffefcb,.81);
 for(let i=0;i<7;i++)box(b,tofu,-.37+(i%3)*.22,.186,.18+Math.floor(i/3)*.20,.2,.19,.18,.024);
 const herbs=bowl(g,1.99,.012,1.44,.42,crock);
 for(let i=0;i<51;i++){let a=i*2.4,r=.77*Math.sqrt(rand());const s=ring(herbs,i%4?leaf:sage,r*Math.cos(a),.55+rand()*.10,r*Math.sin(a),.065+rand()*.026,.02,12);s.rotation.x+=rand()*.85;}
 // A ceramic condiment pot and its turned wooden spoon.
 const condiment=jar(g,-2.32,.005,-.88,.26,.51,mat(0xad784a,.36),walnut);
 bowl(g,2.48,.008,-1.04,.40,indigo);
 scene.attach(herbs);scene.attach(condiment);batch(herbs);batch(condiment);batch(g,true);return [herbs,condiment];
}
