(function(root) {
  'use strict';
  const {T,group,material,mesh,box,oval,onion,m,noise}=Kitchen, TAU=2*Math.PI;
  function broth(scene){
    const u={
      brothColor:{value:new T.Color()},contrast:{value:1},heatPhase:{value:0},swirl:{value:0},flow:{value:0},
      wave:{value:0},pastePos:{value:new T.Vector2()},ages:{value:new Float32Array(6)},clouds:{value:Array.from({length:6},()=>new T.Vector4())}
    };
    const common=`
      uniform float heatPhase,swirl,flow,wave,contrast;
      uniform vec3 brothColor;uniform vec2 pastePos;uniform vec4 clouds[6];uniform float ages[6];
      varying vec2 brothPoint;
      float water(vec2 p){float r=length(p);return .011*sin(4.*p.x+3.*p.y+heatPhase)+.006*sin(6.*p.y-1.7*heatPhase)
        -.055*abs(swirl)*exp(-2.9*r*r)+(.003+.007*abs(swirl))*sin(11.*r-2.*heatPhase+2.*p.x)
        +.024*wave*r*r*cos(4.*r-flow);}
    `;
    const mat=material(0xffffff,.24,.08);
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,u);
      shader.vertexShader=common+shader.vertexShader
        .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec2 bp=position.xz;objectNormal=normalize(vec3(water(bp-vec2(.012,0))-water(bp+vec2(.012,0)),.024,water(bp-vec2(0,.012))-water(bp+vec2(0,.012))));')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nbrothPoint=position.xz;transformed.y+=water(brothPoint);');
      shader.fragmentShader=common+noise+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 p=brothPoint;float r=length(p), a=atan(p.y,p.x)+.0001;
        float curl=1.65*r-sin(flow*.38)*1.7+flow*.23;
        vec2 q=mat2(cos(curl),-sin(curl),sin(curl),cos(curl))*p;
        float cloud=n3(vec3(q*2.7,.8+heatPhase*.042))+.48*n3(vec3(q*7.5,.27));
        float streak=sin(7.1*r+2.*a-flow*.55+4.3*cloud);
        float nearPaste=exp(-2.7*length(p-pastePos));
        vec3 col=brothColor*(.97+.055*cloud);
        col=mix(col,vec3(.32,.127,.033),contrast*(.22+.73*nearPaste)*smoothstep(-.5,.85,streak));
        col+=vec3(.17,.108,.038)*contrast*smoothstep(.77,.99,streak)*(.2+.8*nearPaste);
        for(int i=0;i<6;i++){vec2 d=p-clouds[i].xy;float ang=clouds[i].w;
          vec2 local=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*d;
          local.y+=.11*sin(7.*local.x+3.*cloud);vec2 spread=local/(vec2(.13,.032)+vec2(.13,.057)*ages[i]);float density=exp(-dot(spread,spread));
          col=mix(col,vec3(.66,.358,.128),density*clouds[i].z*.77);}
        float fleck=smoothstep(.78,.92,n3(vec3(q*137.,2.)));
        diffuseColor.rgb=col*(1.-(.045+.19*contrast)*fleck);`);
    };
    const vertices=[0,0,0],indices=[],rings=34,segments=112;
    for(let row=1;row<=rings;row++) for(let j=0;j<segments;j++){
      const a=j*TAU/segments,r=row/rings*1.48;
      vertices.push(r*Math.cos(a),0,r*Math.sin(a));
      const cur=1+(row-1)*segments+j,next=1+(row-1)*segments+(j+1)%segments;
      if(row===1)indices.push(0,next,cur);
      else indices.push(cur-segments,next,cur,cur-segments,next-segments,next);
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const water=mesh(scene,geo,mat,0,MisoSim.soupY,0);water.name='broth';water.castShadow=false;
    return s=>{
      u.brothColor.value.fromArray(s.broth.color);u.contrast.value=s.broth.contrast;
      u.heatPhase.value=s.heatPhase;u.swirl.value=s.whirl;u.flow.value=s.flowAngle;u.wave.value=s.wallWave;
      u.pastePos.value.set(s.lump.x,s.lump.z);
      s.plumes.forEach((p,i)=>{u.ages.value[i]=Math.min(2.8,p.age);u.clouds.value[i].set(p.x,p.z,p.strength,p.angle);});
    };
  }
  function kelp(scene,i){
    // Nonplanar, folded leaf with two ruffled lobes, a midrib and a thin edge.
    const g=group(scene), verts=[],colors=[],indices=[];
    const cols=9, rows=24;
    for(let k=0;k<=rows;k++){
      const t=k/rows, mid=Math.sin(Math.PI*t)**.57;
      for(let j=0;j<=cols;j++){
        const u=j/cols*2-1;
        const width=.092+.088*(.5+.5*Math.sin(12*t+i+u))+.045*Math.sin(t*26+u*.7+i);
        verts.push((t-.5)*.59+u*.029*Math.sin(t*8+i),.023+mid*(.08*Math.sin(8*t+i)+.049*Math.abs(u)*Math.sin(t*22+i)+.045*(1-u*u)),mid*u*width+.06*Math.sin(8*t+i));
        const shade=.62+.24*Math.abs(u)+.15*Math.sin(19*t+u+i);colors.push(shade,shade+.025,shade);
        if(k<rows&&j<cols){const a=k*(cols+1)+j;indices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geo.setIndex(indices);geo.computeVertexNormals();const mat=m.sea.clone();mat.vertexColors=true;mat.side=T.DoubleSide;
    mesh(g,geo,mat);return g;
  }
  function steam(scene){
    // Soft density through small ellipsoidal volumes; transparent at their silhouettes.
    const mat=new T.ShaderMaterial({
      uniforms:{clock:{value:0},density:{value:.1}},
      vertexShader:`varying vec3 at;varying vec3 vn;varying vec3 viewRay;
        void main(){at=position;vec4 mv=modelViewMatrix*vec4(position,1.);vn=normalMatrix*normal;viewRay=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:noise+`uniform float clock,density;varying vec3 at;varying vec3 vn;varying vec3 viewRay;
        void main(){float edge=max(0.,dot(normalize(vn),normalize(viewRay)));
        float f=n3(at*2.8+vec3(.2,clock*.20,.7))+.47*n3(at*6.-clock*.13);
        gl_FragColor=vec4(vec3(.98,.945,.86),density*pow(edge,2.2)*smoothstep(.19,1.08,f));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      transparent:true,depthWrite:false
    });
    const puffs=Array.from({length:21},(_,i)=>{
      const local=mat.clone();const ob=oval(scene,local,0,0,0,1,1,1);ob.castShadow=ob.receiveShadow=false;
      ob.name='steam-'+i;ob.renderOrder=2;return ob;
    });
    return s=>{
      puffs.forEach((ob,i)=>{
        const col=i%3,t=(s.steamPhase*(.27+col*.043)+Math.floor(i/3)/7+col*.16)%1;
        const a=col*2.22+t*3.8+s.steamPhase*.39;
        ob.position.set(-.44+col*.42+.18*Math.sin(a)+.34*t*t,MisoSim.soupY+.065+t*(1.42+s.steam*.49),-.37+Math.cos(col*3.3)*.34+.11*Math.cos(a+.7));
        ob.scale.set(.11+t*.27,.14+t*.26,.10+t*.18);
        ob.rotation.z=.38*Math.sin(a);
        ob.material.uniforms.clock.value=s.steamPhase+i*.81;
        ob.material.uniforms.density.value=s.steam*.40*Math.sin(Math.PI*t)**1.5;
      });
    };
  }
  function build(scene,state) {
    const liquid=broth(scene), vapor=steam(scene);
    const foods=state.foods.map((f,i)=>{
      if(f.kind==='tofu')return box(scene,m.rice,0,0,0,.335+.035*Math.sin(i),.232,.295+.02*Math.cos(i),.033);
      if(f.kind==='negi')return onion(scene,0,0,0,i);
      return kelp(scene,i);
    });
    foods.forEach((ob,i)=>{ob.name='floating-'+i;});
    const lump=group(scene), rough=new T.IcosahedronGeometry(1,3),p=rough.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const k=1+.052*Math.sin(17*x+11*z)*Math.sin(8*y-3*z)+.06*Math.cos(5*y+4*x);
      p.setXYZ(i,k*x,k*y*.72,k*z*.88);
    }
    lump.name='miso';rough.computeVertexNormals();mesh(lump,rough,m.paste);
    const grain=material(0xc89a60,.78);
    for(let j=0;j<37;j++){
      const y=(j+.5)/38,r=Math.sqrt(1-y*y),a=j*2.39996;
      const seed=oval(lump,j%3?grain:m.paste,r*Math.cos(a),y*.72,.88*r*Math.sin(a),.060,.034,.033);seed.rotation.y=a+1;
    }
    Kitchen.batchRigid(lump);
    const film=new T.MeshPhysicalMaterial({color:0xffdf9b,roughness:.12,metalness:.16,transparent:true,opacity:.60,clearcoat:1});
    const bubbles=state.bubbles.map((_,i)=>{const b=oval(scene,film,0,0,0,1,1,1);b.name='bubble-'+i;b.castShadow=false;return b;});
    return s=>{
      liquid(s);vapor(s);
      const l=s.lump;lump.position.set(l.x,l.y,l.z);
      lump.scale.setScalar(Math.max(.00001,l.radius));lump.rotation.y=.28*s.flowAngle;
      s.foods.forEach((f,i)=>{
        const ob=foods[i];ob.position.set(f.x,f.y+(f.kind==='tofu'?.025:.011),f.z);
        ob.rotation.set(f.rock*(f.kind==='tofu'?1:1.5),f.angle,f.rock*.76);
      });
      s.bubbles.forEach((b,i)=>{
        const ob=bubbles[i];ob.position.set(b.x,MisoSim.surface(b.x,b.z,s)-b.size*.27,b.z);
        ob.scale.set(Math.max(.0001,b.size),Math.max(.0001,b.size*.70),Math.max(.0001,b.size));
      });
    };
  }
  root.MisoSoup={build};
})(globalThis);
