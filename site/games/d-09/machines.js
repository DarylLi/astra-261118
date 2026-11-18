'use strict';
const Machines = (() => {
  const {T,group,mesh,box,poly,cyl,rod,pipe,ell,bake,mat,iron,black,steel,bolt,gold,yellow,amber,cream,rubber,red,redEdge,darkRed,glass,darkGlass,lamp,backLight,soil}=Art;
  const track=mat(0x464b46,.84,.52),edge=mat(0x68685a,.72,.49),buff=mat(0xc9a779,.86,.33);
  const lens=mat(0xecaa40,.22,.18,{emissive:0xc97822,emissiveIntensity:.18});
  function pin(p,x,y,z,r=.12,d=.08){
    cyl(p,r,r,d,x,y,z,iron,'z',24);cyl(p,r*.67,r*.67,d+.023,x,y,z,bolt,'z',12);
    cyl(p,r*.26,r*.26,d+.029,x,y,z,steel,'z',6);
  }
  function tread(p,z){
    const y=.47, span=1.12,r=.385,dep=.48;
    const outline=[];
    for(let i=0;i<=12;i++){let a=-Math.PI/2+i*Math.PI/12;outline.push([span+r*Math.cos(a),y+r*Math.sin(a)]);}
    for(let i=0;i<=12;i++){let a=Math.PI/2+i*Math.PI/12;outline.push([-span+r*Math.cos(a),y+r*Math.sin(a)]);}
    poly(p,outline,dep,0,0,z,black,.034);
    const face=z+Math.sign(z)*.255;
    for(let i=0;i<8;i++){
      const x=-1.11+i*.318,rr=i===0||i===7?.29:.205;
      cyl(p,rr,rr,.056,x,y-.025,face,track,'z',24);
      cyl(p,rr*.64,rr*.64,.071,x,y-.025,face,iron,'z',20);
      cyl(p,rr*.25,rr*.25,.09,x,y-.025,face,edge,'z',8);
    }
    box(p,2.29,.095,.06,0,y+.085,face,track);
    const run=4*span+2*Math.PI*r,N=48;
    for(let i=0;i<N;i++){
      const t=i*run/N;let x,yy,rot;
      if(t<2*span){x=-span+t;yy=y+r;rot=0;}
      else if(t<2*span+Math.PI*r){const a=Math.PI/2-(t-2*span)/r;x=span+r*Math.cos(a);yy=y+r*Math.sin(a);rot=a-Math.PI/2;}
      else if(t<4*span+Math.PI*r){x=span-(t-2*span-Math.PI*r);yy=y-r;rot=Math.PI;}
      else{const a=-Math.PI/2-(t-4*span-Math.PI*r)/r;x=-span+r*Math.cos(a);yy=y+r*Math.sin(a);rot=a-Math.PI/2;}
      const shoe=group(p);shoe.position.set(x,yy,z);shoe.rotation.z=rot;
      box(shoe,.132,.085,.56,0,0,0,i%5===1?edge:track,.012);
      box(shoe,.042,.028,.53,-.032,.054,0,edge,.006);
    }
  }
  function excavator(scene){
    const base=group(scene);base.position.set(-2.72,.008,.04);
    const chassis=group(base);tread(chassis,.71);tread(chassis,-.71);
    box(chassis,2.68,.34,1.44,0,.57,0,iron,.08);
    cyl(chassis,.77,.83,.21,0,.93,0,black,'y',36);
    bake(chassis);
    const swivel=group(base),cabinet=group(swivel);
    poly(cabinet,[[-1.67,1.10],[-1.62,1.49],[-1.36,1.63],[1.34,1.57],[1.47,1.37],[1.39,1.09]],1.97,0,0,0,iron,.065);
    // Cast counterweight with a stepped waist, inset cooling grille and side access panels.
    poly(cabinet,[[-1.61,1.40],[-1.72,1.62],[-1.62,2.15],[-1.42,2.38],[-.30,2.40],[-.15,2.15],[-.13,1.43]],1.87,0,0,0,gold,.105);
    box(cabinet,1.62,.74,.94,.19,1.88,-.44,yellow,.09);
    box(cabinet,1.18,.027,.73,-.80,2.485,-.06,amber,.01);
    for(let i=0;i<9;i++)box(cabinet,.045,.027,.54,-1.23+i*.109,2.51,-.06,black,.007);
    box(cabinet,.84,.48,.025,-1.03,1.98,1.02,amber,.013);
    box(cabinet,.805,.448,.029,-1.03,1.98,1.039,yellow,.013);
    for(let i=0;i<7;i++)box(cabinet,.048,.276,.026,-1.31+i*.091,2.005,1.067,black,.012).rotation.z=-.08;
    box(cabinet,1.40,.050,.035,-.91,1.58,1.016,cream,.009);
    box(cabinet,.18,.07,.03,-1.48,1.71,1.024,backLight,.012);
    // No lettering. A factory pinstripe crosses the raised side panel.
    for(let i=0;i<3;i++)poly(cabinet,[[0,0],[.063,0],[.18,.17],[.117,.17]],.018,-.63+i*.117,1.73,1.035,cream,.002);
    for(const x of [-1.37,-.69])for(const y of [1.79,2.18])cyl(cabinet,.022,.022,.016,x,y,1.066,bolt,'z',6);
    cyl(cabinet,.071,.1,.47,-1.07,2.63,-.52,iron);
    pipe(cabinet,[[-1.07,2.83,-.52],[-1.07,2.96,-.52],[-1.17,3.01,-.52]],.065,iron);
    // Near-side cab, with shaped safety glazing and distinct rubber window seals.
    const cab=group(cabinet);cab.position.z=.51;
    const glazing=mat(0x669298,.105,.32,{transparent:true,opacity:.54,depthWrite:false,envMapIntensity:1.26});
    poly(cab,[[-.27,1.51],[-.29,2.17],[1.18,2.17],[1.21,1.54]],.85,0,0,0,black,.045);
    box(cab,.95,.081,.83,.29,3.195,0,black);
    const side=[[-.202,1.63],[-.228,3.03],[-.15,3.174],[.71,3.22],[.862,3.10],[1.12,2.39],[1.11,1.65]];
    const windows=[
      [[-.135,2.22],[-.15,3.025],[-.085,3.105],[.54,3.143],[.59,3.09],[.59,2.23]],
      [[.69,2.22],[.66,3.14],[.79,3.10],[1.052,2.44],[1.053,2.23]]
    ];
    for(const sign of [-1,1]){
      const frame=new T.Shape(side.map(v=>new T.Vector2(...v)));
      for(const coords of windows)frame.holes.push(new T.Path(coords.map(v=>new T.Vector2(...v))));
      mesh(cab,new T.ExtrudeGeometry(frame,{depth:.035,bevelEnabled:false}),gold,0,0,sign*.453-.018);
      for(const coords of windows){
        poly(cab,coords,.012,0,0,sign*.466,glazing,.002);
        for(let i=0;i<coords.length;i++)rod(cab,[...coords[i],sign*.471],[...coords[(i+1)%coords.length],sign*.471],.021,black,.021,8);
      }
    }
    poly(cab,[[.73,1.82],[.72,2.12],[1.052,2.12],[1.048,1.82]],.024,0,0,.476,darkGlass,.012);
    // Upholstered seat, backrest and two joysticks behind the tinted panes.
    box(cab,.42,.11,.44,.17,2.26,-.015,iron,.043);
    box(cab,.11,.51,.43,-.025,2.49,-.015,black,.045).rotation.z=.10;
    box(cab,.115,.145,.27,-.058,2.807,-.015,iron,.032);
    for(const z of [-.266,.266]){
      box(cab,.34,.076,.092,.22,2.423,z,black,.026);
      rod(cab,[.422,2.243,z],[.47,2.478,z],.017,steel);ell(cab,.47,2.484,z,.032,.052,.029,rubber);
    }
    box(cab,.25,.16,.71,.928,2.224,0,iron,.04);
    box(cab,.19,.045,.04,-.012,2.123,.51,black,.008);
    box(cab,.14,.037,.06,.032,2.132,.536,steel,.007);
    const front=box(cab,.034,.956,.731,1.045,2.745,0,glazing,.015);front.rotation.z=.339;
    const lower=box(cab,.031,.48,.731,1.244,2.115,0,darkGlass,.013);
    rod(cab,[1.209,2.39,-.27],[1.063,2.81,.20],.014,black);
    rod(cab,[1.13,2.63,.20],[.99,3.02,.20],.016,black);
    poly(cab,[[-.27,3.237],[-.18,3.34],[.73,3.39],[.905,3.284]],.96,0,0,0,gold,.033);
    box(cab,.61,.04,.55,.23,3.394,-.04,black,.019);
    box(cab,.55,.031,.48,.24,3.422,-.04,darkGlass,.013);
    for(const z of [-.32,.32]){box(cab,.14,.135,.18,.885,3.27,z,iron);
      box(cab,.02,.086,.123,.965,3.273,z,lamp,.01);}
    box(cab,.99,.101,.28,.49,1.37,.52,black,.018);
    for(let i=0;i<9;i++)box(cab,.035,.019,.17,.10+i*.097,1.431,.53,edge,.006);
    pipe(cab,[[.95,1.50,.52],[1.12,1.52,.62],[1.16,1.70,.63],[1.14,2.23,.63],[1.07,2.27,.52]],.029,steel);
    pipe(cab,[[.64,3.24,.43],[.72,3.29,.70],[.96,3.21,.75]],.022,iron);
    box(cab,.14,.207,.06,.985,3.18,.75,black,.024);
    box(cab,.104,.159,.014,.985,3.18,.788,darkGlass,.008);
    cyl(cab,.09,.105,.04,-.15,3.39,-.27,black);
    cyl(cab,.053,.075,.104,-.15,3.463,-.27,lens);
    // Utility step and hand rail on the engine deck.
    pipe(cabinet,[[-1.44,2.36,-.82],[-1.42,2.67,-.82],[-1.28,2.73,-.82],[-.54,2.73,-.82],[-.47,2.38,-.82]],.024,steel);
    bake(cabinet);
    const pivot=[.42,1.73,-.24],L1=2.84,L2=2.45;
    const boom=group(swivel);boom.position.set(...pivot);
    const boomStatic=group(boom);
    const boomShape=[[-.12,-.18],[-.16,.11],[.07,.28],[1.16,.57],[1.57,.58],[2.69,.15],[2.84,.12],[2.88,-.10],[2.69,-.14],[1.43,.20],[1.27,.18],[.14,-.22]];
    poly(boomStatic,boomShape,.345,0,0,0,gold,.047);
    poly(boomStatic,[[.38,.16],[1.25,.444],[1.48,.447],[2.49,.096],[2.45,.056],[1.44,.368],[1.26,.371],[.36,.107]],.012,0,0,.224,cream,.002);
    for(const z of [-.12,-.027,.073])pipe(boomStatic,[[.05,.33,z],[.75,.55,z],[1.29,.69,z],[1.57,.68,z],[2.44,.36,z],[2.80,.20,z]],.022,black);
    for(const x of [.33,1.03,1.76,2.40]){
      const y=x<1.3?.32+x*.28:.63-(x-1.56)*.33;
      box(boomStatic,.054,.045,.30,x,y+.064,0,steel,.008);
    }
    pin(boomStatic,0,0,0,.172,.51);pin(boomStatic,1.26,.18,0,.12,.51);
    pin(boomStatic,L1,0,0,.155,.48);bake(boomStatic);
    const stick=group(boom);stick.position.x=L1;
    const stickStatic=group(stick);
    poly(stickStatic,[[-.29,-.105],[-.36,.19],[-.075,.35],[.38,.30],[1.57,.14],[2.43,.092],[2.49,-.082],[1.62,-.11],[.42,-.20]],.267,0,0,0,yellow,.039);
    poly(stickStatic,[[.48,.179],[1.70,.087],[2.10,.05],[2.06,.017],[.48,.114]],.012,0,0,.177,cream,.003);
    pin(stickStatic,0,0,0,.134,.43);pin(stickStatic,L2,0,0,.10,.42);
    pipe(stickStatic,[[-.22,.29,-.105],[.09,.45,-.105],[.61,.30,-.105],[1.74,.18,-.105],[2.15,.16,-.105]],.029,black);
    bake(stickStatic);
    const bucket=group(stick);bucket.position.x=L2;
    const scoop=group(bucket);
    const profile=[[-.18,.14],[-.35,-.11],[-.36,-.32],[-.225,-.48],[.085,-.51],[.44,-.38],[.49,-.293],[.07,-.38],[-.16,-.333],[-.219,-.19],[-.07,.065]];
    poly(scoop,profile,.68,0,0,0,iron,.018);
    for(const z of [-.347,.347]){
      poly(scoop,[[-.22,.075],[-.317,-.16],[-.25,-.363],[.024,-.448],[.435,-.321],[.055,-.134],[-.096,.083]],.034,0,0,z,edge,.012);
      pin(scoop,-.041,.025,z,.087,.071);
    }
    for(let i=0;i<5;i++)poly(scoop,[[.34,-.304],[.59,-.315],[.62,-.346],[.40,-.414]],.077,0,0,-.292+i*.146,buff,.009);
    box(scoop,.16,.093,.60,-.258,-.343,0,edge);
    bake(scoop);scoop.scale.x=-1;
    const earth=ell(bucket,.024,-.23,0,.341,.25,.33,soil);
    // Each hydraulic ram has its own moving barrel and exposed piston.
    function ram(host,a,other,b,barrel,r){
      const body=cyl(host,r,r,1,0,0,0,yellow), chrome=cyl(host,r*.53,r*.53,1,0,0,0,bolt),
        collar=cyl(host,r*1.13,r*1.13,.094,0,0,0,iron);
      return ()=>{const u=new T.Vector3(...a),v=host.worldToLocal(other.localToWorld(new T.Vector3(...b)));
        const d=v.clone().sub(u),length=d.length();d.normalize();const l=Math.min(barrel,length*.84);
        for(const [o,mid,len] of [[body,l/2,l],[chrome,(length+l)/2,length-l],[collar,l-.038,1]]){
          o.position.copy(u).addScaledVector(d,mid);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d);o.scale.y=len;
        }};
    }
    const rams=[ram(swivel,[.91,1.40,.075],boom,[1.29,.10,.25],.91,.091),
      ram(boom,[1.35,.70,.01],stick,[-.285,.20,.014],.88,.078),
      ram(stick,[.49,.36,.05],bucket,[-.15,.11,.07],1.11,.068)];
    function update(s){
      const t=s.tip,xx=t.x-base.position.x,zz=t.z-base.position.z;
      const yaw=-Math.atan2(zz,xx)+Math.asin(pivot[2]/Math.max(1,Math.hypot(xx,zz)));
      swivel.rotation.y=yaw;
      const h=Math.sqrt(Math.max(0,xx*xx+zz*zz-pivot[2]**2))-pivot[0],v=t.y+.39-base.position.y-pivot[1];
      const reach=Math.min(L1+L2-.001,Math.max(.42,Math.hypot(h,v)));
      const shoulder=Math.atan2(v,h)+Math.acos(Math.max(-1,Math.min(1,(L1*L1+reach*reach-L2*L2)/(2*L1*reach))));
      const elbow=-Math.acos(Math.max(-1,Math.min(1,(reach*reach-L1*L1-L2*L2)/(2*L1*L2))));
      boom.rotation.z=shoulder;stick.rotation.z=elbow;bucket.rotation.z=-shoulder-elbow-t.curl+.12;
      cabinet.position.y=s.engine.p*.65;cabinet.rotation.z=s.wobble*.16;
      base.updateWorldMatrix(true,true);rams.forEach(fn=>fn());
      earth.visible=s.scoop>.003;earth.scale.y=.28*Math.min(1,s.scoop/s.bucketCapacity);
    }
    return {base,update};
  }
  function truck(scene){
    const base=group(scene);base.position.set(3.035,.007,-1.72);
    const spring=group(base),body=group(spring),wheels=[];
    const bedX=-.49;
    box(body,3.75,.235,1.15,-.02,.77,0,iron,.04);
    for(const x of [-1.44,-.61,1.35]){
      cyl(body,.12,.12,1.38,x,.50,0,iron,'z');
      for(const z of [-.77,.77]){
        const w=group(base);w.position.set(x,.47,z);wheels.push(w);
        cyl(w,.447,.447,.275,0,0,0,rubber,'z',40);
        for(const side of [-1,1]){const face=side*.144;
          cyl(w,.368,.398,.023,0,0,face,black,'z',36);
          cyl(w,.272,.272,.032,0,0,face*1.12,steel,'z',32);
          cyl(w,.214,.214,.037,0,0,face*1.23,iron,'z',28);
          cyl(w,.095,.091,.054,0,0,face*1.39,steel,'z',16);
          for(let i=0;i<7;i++){const a=i/7*Math.PI*2;
            cyl(w,.024,.024,.025,.151*Math.cos(a),.151*Math.sin(a),face*1.40,bolt,'z',6);}
        }
        for(let i=0;i<27;i++){const a=i*Math.PI*2/27;
          box(w,.080,.024,.237,Math.cos(a)*.444,Math.sin(a)*.444,0,track,.006).rotation.z=a+Math.PI/2;}
        bake(w);
      }
    }
    // Open steel tipper, with folded ribs, top rails, hinges and a visible soil load.
    box(body,2.56,.135,1.47,bedX,1.20,0,darkRed,.02);
    for(const z of [-.78,.78]){
      poly(body,[[-1.30,1.24],[-1.49,2.06],[-1.43,2.12],[1.08,2.12],[1.17,1.28]],
        .071,bedX,0,z,red,.023);
      box(body,2.66,.087,.107,bedX-.16,2.143,z,redEdge,.017);
      box(body,2.49,.087,.093,bedX-.06,1.283,z,darkRed,.018);
      for(let i=0;i<5;i++){
        const x=bedX-1.28+i*.557;
        poly(body,[[0,0],[.080,0],[.181,.747],[.065,.747]],.051,x,1.342,z+Math.sign(z)*.063,redEdge,.011);
      }
      box(body,.44,.053,.034,bedX-.86,1.425,z+Math.sign(z)*.08,cream,.005);
      box(body,.44,.053,.034,bedX+.60,1.425,z+Math.sign(z)*.08,cream,.005);
    }
    box(body,.09,.85,1.55,bedX-1.37,1.70,0,red,.018).rotation.z=.18;
    box(body,.09,1.04,1.60,bedX+1.10,1.78,0,redEdge);
    box(body,.39,.075,1.65,bedX+1.26,2.305,0,redEdge);
    const P=DigPhysics, surface=new T.PlaneGeometry(P.binX*P.binW,P.binZ*P.binD,P.binX-1,P.binZ-1);
    surface.rotateX(-Math.PI/2);
    const dirt=mesh(spring,surface,soil,bedX,P.bedFloor,0);
    box(body,2.48,.047,1.49,bedX,P.bedFloor-.03,0,darkRed);
    const dirtPoints=surface.attributes.position;
    const cab=group(body);cab.position.x=1.30;
    poly(cab,[[-.605,.87],[-.659,2.21],[-.55,2.48],[-.38,2.55],[.327,2.54],[.494,2.38],[.71,1.59],[.70,1.03],[.57,.89]],1.54,0,0,0,redEdge,.07);
    poly(cab,[[-.61,2.485],[-.47,2.59],[.339,2.576],[.48,2.469]],1.58,0,0,0,red,.031);
    for(const z of [-.81,.81]){
      poly(cab,[[-.493,1.79],[-.5,2.33],[-.405,2.421],[.285,2.414],[.434,2.269],[.53,1.80]],.03,0,0,z,black,.018);
      poly(cab,[[-.433,1.84],[-.441,2.302],[-.37,2.37],[.270,2.365],[.377,2.243],[.46,1.845]],.029,0,0,z+Math.sign(z)*.029,glass,.009);
      box(cab,.042,.50,.021,-.27,2.109,z+Math.sign(z)*.052,iron,.006);
      box(cab,.17,.048,.037,-.36,1.70,z+Math.sign(z)*.025,black,.008);
      box(cab,1.13,.043,.027,.04,1.52,z+Math.sign(z)*.002,cream,.005);
      box(cab,.89,.093,.25,.028,.848,z,iron);
      pipe(cab,[[.385,2.293,z],[.510,2.289,z*1.26],[.61,2.17,z*1.27]],.022,iron);
      box(cab,.114,.219,.064,.622,2.103,z*1.27,black);
      box(cab,.17,.071,.03,.54,1.33,z,lens);
      box(cab,1.11,.095,.34,.02,1.006,z,black,.037);
    }
    const wind=box(cab,.041,.799,1.404,.585,1.999,0,darkGlass,.02);wind.rotation.z=.242;
    for(const z of [-.36,.36])rod(cab,[.68,1.69,z-.23],[.638,1.84,z+.22],.013,black);
    box(cab,.09,.31,.97,.739,1.382,0,black);
    for(let i=0;i<4;i++)box(cab,.028,.018,.89,.794,1.28+i*.071,0,steel,.004);
    for(const z of [-.605,.605])box(cab,.083,.17,.282,.746,1.365,z,lamp,.026);
    box(cab,.172,.20,1.67,.734,1.082,0,iron,.041);
    box(body,2.10,.083,1.94,-1.03,1.03,0,black,.03);
    for(const z of [-.81,.81]){
      box(body,.084,.399,.34,-1.94,.76,z,rubber,.012);
      box(body,.105,.11,.24,-1.98,.98,z,backLight);
    }
    bake(body);
    return {base,update(s){const b=s.truck;base.position.x=3.035+b.x;
      spring.position.y=-(b.front+b.rear)*.5;spring.rotation.z=(b.rear-b.front)/2.8;
      wheels.forEach(w=>w.rotation.z=-b.wheel);dirt.visible=b.load>.004;
      if(dirt.visible){
        for(let i=0;i<b.bins.length;i++)dirtPoints.setY(i,b.bins[i]/(P.binW*P.binD)+.008*Art.hash(i,28));
        dirtPoints.needsUpdate=true;surface.computeVertexNormals();
      }
    }};
  }
  function treasure(scene){
    const base=group(scene),fixed=group(base),lid=group(base),horn=group(base);
    const woodTex=Art.texture(128,(x,y)=>{const v=Art.noise(x/49,y/2.4)*.60+Art.noise(x/18,y/7)*.40;
      return [164+v*48,132+v*56,97+v*49];},true);
    const wood=mat(0xae7545,.82,.02,{map:woodTex}),wood2=mat(0xc08b53,.78,.03,{map:woodTex}),
      band=mat(0xb69961,.45,.65),brass=mat(0xefc04d,.24,.79),brt=mat(0xffde7f,.19,.76);
    box(fixed,.96,.46,.62,0,.01,0,wood,.038);
    for(let i=0;i<3;i++)box(fixed,.952,.122,.045,0,-.13+i*.139,.316,i%2?wood2:wood,.012);
    box(fixed,.889,.026,.539,0,.25,0,black,.012);
    for(const x of [-.33,.33]){
      box(fixed,.091,.466,.68,x,.007,0,band,.014);
      for(const y of [-.14,.13])pin(fixed,x,y,.348,.02,.015);
    }
    lid.position.set(0,.233,-.317);
    const shape=[[-.014,0],[.647,0],[.627,.11],[.55,.193],[.40,.252],[.24,.252],[.095,.205],[.005,.112]];
    function arch(parent,x,w,m){
      const o=poly(parent,shape,w,x,0,0,m,.012);o.rotation.y=-Math.PI/2;
    }
    arch(lid,0,.947,wood2);arch(lid,-.333,.091,band);arch(lid,.333,.091,band);
    box(lid,.12,.157,.041,0,.038,.653,band);
    cyl(lid,.024,.024,.025,0,.019,.682,black,'z');
    // Continuous brass tubing, bell, valve block and pearl buttons.
    pipe(horn,[[-.46,.14,0],[-.29,.14,0],[-.15,.12,0],[.21,.12,0],[.29,.06,0],[.26,-.107,0],
      [.12,-.157,0],[-.21,-.15,0],[-.30,-.095,0],[-.285,.01,0],[-.16,.044,0],[.29,.044,0]],.037,brass);
    const bellProfile=[[.035,.0],[.052,.13],[.076,.25],[.105,.32],[.166,.39],[.235,.431],[.243,.445],[.230,.457],[.154,.414],[.091,.342],[.052,.243],[.032,.116]];
    const bell=mesh(horn,new T.LatheGeometry(bellProfile.map(a=>new T.Vector2(...a)),40),brass,.22,.045,0);bell.rotation.z=-Math.PI/2;
    const rim=mesh(horn,new T.TorusGeometry(.237,.014,8,44),brt,.669,.044,0);rim.rotation.y=Math.PI/2;
    for(let i=0;i<3;i++){const x=-.13+i*.113;cyl(horn,.044,.044,.214,x,.018,.04,brt);
      cyl(horn,.014,.015,.097,x,.166,.04,brass);cyl(horn,.044,.039,.023,x,.223,.04,cream);}
    cyl(horn,.063,.037,.089,-.487,.14,0,brt,'x');
    bake(fixed);bake(lid);bake(horn);
    return {base,horn,update(s){
      base.visible=s.phase!=='soil'&&s.phase!=='spring';base.position.set(s.chest.x,s.chest.y,s.chest.z);
      base.rotation.y=-.20;base.rotation.z=-.12*(1-s.chest.exposed);
      lid.rotation.x=-s.chest.lid;horn.visible=s.horn.height>.06;
      horn.position.set(0,.15+s.horn.height,.055);horn.rotation.z=.12+s.horn.ring;
      horn.rotation.y=-.38+s.horn.ring*.55;
    }};
  }
  return {excavator,truck,treasure};
})();
