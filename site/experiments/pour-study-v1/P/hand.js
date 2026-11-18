'use strict';
// A continuous skin surface around palm pads, metacarpals and bent phalanges.
function childGrip(parent) {
  const {T,mat,mesh,group,lathe,ball}=Kitchen;
  const g=group(parent);g.position.set(1.83,0.335,0);g.rotation.z=0.15;
  const pads=[
    [0.012,0.174,0.052,0.397,0.175,0.278,-0.27],
    [0.262,0.164,0.121,0.255,0.157,0.210,-0.36],
    [-0.172,0.148,0.156,0.200,0.137,0.177,0.24],
    [0.55,0.19,0.214,0.368,0.155,0.178,-0.26],
    [0.82,0.20,0.287,0.270,0.162,0.176,-0.26]
  ].map(([x,y,z,a,b,c,angle])=>({x,y,z,a,b,c,cs:Math.cos(angle),sn:Math.sin(angle)}));
  const paths=[],nails=[];
  function digit(points) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p.slice(0,3))),false,'catmullrom',0.42);
    for(let i=0;i<points.length-1;i++)for(let s=0;s<3;s++){
      const a=curve.getPoint((i+s/3)/(points.length-1)),b=curve.getPoint((i+(s+1)/3)/(points.length-1));
      const r=points[i][3],dr=points[i+1][3]-r,d=b.sub(a);
      paths.push({a,d,l:d.lengthSq(),r:r+dr*s/3,dr:dr/3});
    }
  }
  // The little finger sits higher on the narrow shaft than the index finger.
  for(let i=0;i<4;i++){
    const x=[-0.268,-0.100,0.067,0.211][i],r=[0.089,0.092,0.084,0.070][i];
    const short=[0,0,0.013,0.039][i];
    digit([[x+0.07,0.19,0.017,r*1.27],[x,0.159,-0.138+short,r*1.12],
      [x-0.035,0.034,-0.195+short,r],[x-0.055,-0.085+short,-0.132,r*0.92],
      [x-0.077,-0.119+short,-0.023,r*0.89],[x-0.077,-0.087+short,0.067,r*0.78]]);
    nails.push([x-0.077,-0.129+short,0.086,r*0.55,0.019,r*0.59,0.57]);
  }
  digit([[0.096,0.202,0.17,0.14],[-0.042,0.161,0.256,0.125],
    [-0.169,0.082,0.243,0.103],[-0.285,0.046,0.185,0.094],[-0.354,0.029,0.120,0.083]]);
  function blend(a,b,k){const h=Math.max(k-Math.abs(a-b),0);return Math.min(a,b)-h*h/(4*k);}
  function field(x,y,z) {
    let f=10;
    for(const p of pads){
      const dx=x-p.x,dz=z-p.z,u=(dx*p.cs-dz*p.sn)/p.a,v=(y-p.y)/p.b,w=(dz*p.cs+dx*p.sn)/p.c;
      const k=Math.hypot(u,v,w);
      const d=k*(k-1)/(Math.hypot(u/p.a,v/p.b,w/p.c)||1);
      f=blend(f,d,0.052);
    }
    let finger=10;
    for(const s of paths){
      const dx=x-s.a.x,dy=y-s.a.y,dz=z-s.a.z;
      if(Math.abs(dx)>0.29||Math.abs(dy)>0.28||Math.abs(dz)>0.30) continue;
      const t=Math.max(0,Math.min(1,(dx*s.d.x+dy*s.d.y+dz*s.d.z)/s.l));
      finger=Math.min(finger,Math.hypot(dx-t*s.d.x,dy-t*s.d.y,dz-t*s.d.z)-s.r-s.dr*t);
    }
    return blend(f,finger,0.056);
  }
  const d=0.024,nx=68,ny=35,nz=43,ys=nx,zs=nx*ny,count=nx*ny*nz;
  const values=new Float32Array(count),points=[],normals=[],cols=[],tris=[],cache=new Map();
  const px=id=>(id%nx)*d-0.503,py=id=>(Math.floor(id/nx)%ny)*d-0.319,pz=id=>Math.floor(id/zs)*d-0.424;
  for(let id=0;id<count;id++)values[id]=field(px(id),py(id),pz(id));
  const base=new T.Color(0xe6ad8c),pink=new T.Color(0xd69a83);
  function crossing(a,b) {
    const key=Math.min(a,b)*count+Math.max(a,b);
    if(cache.has(key))return cache.get(key);
    const t=values[a]/(values[a]-values[b]),x=px(a)+(px(b)-px(a))*t,y=py(a)+(py(b)-py(a))*t,z=pz(a)+(pz(b)-pz(a))*t;
    const e=0.0015,n=new T.Vector3(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();
    const blush=Math.min(0.8,Math.max(0,0.21-y)*1.2+Math.max(0,-x)*0.65+Math.max(0,-z)*0.9);
    const id=points.length/3;points.push(x,y,z);normals.push(n.x,n.y,n.z);
    cols.push(base.r+(pink.r-base.r)*blush,base.g+(pink.g-base.g)*blush,base.b+(pink.b-base.b)*blush);
    cache.set(key,id);return id;
  }
  function face(a,b,c){
    const i=a*3,j=b*3,k=c*3;
    const ax=points[j]-points[i],ay=points[j+1]-points[i+1],az=points[j+2]-points[i+2],
      bx=points[k]-points[i],by=points[k+1]-points[i+1],bz=points[k+2]-points[i+2];
    if((ay*bz-az*by)*normals[i]+(az*bx-ax*bz)*normals[i+1]+(ax*by-ay*bx)*normals[i+2]>0)tris.push(a,b,c);
    else tris.push(a,c,b);
  }
  const offsets=[0,1,ys,ys+1,zs,zs+1,zs+ys,zs+ys+1];
  const tetra=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
  for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
    const start=i+j*ys+k*zs,sgn=values[start]<0;
    if(offsets.every(o=>(values[start+o]<0)===sgn))continue;
    for(const tet of tetra){
      const neg=[],pos=[];for(const corner of tet){const id=start+offsets[corner];(values[id]<0?neg:pos).push(id);}
      if(!neg.length||!pos.length)continue;
      if(neg.length===2){
        const a=crossing(neg[0],pos[0]),b=crossing(neg[0],pos[1]),c=crossing(neg[1],pos[0]),e=crossing(neg[1],pos[1]);
        face(a,b,c);face(b,e,c);
      }else{
        const solo=neg.length===1?neg:pos,other=neg.length===1?pos:neg;
        face(...other.map(v=>crossing(solo[0],v)));
      }
    }
  }
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(points,3));geom.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geom.setAttribute('color',new T.Float32BufferAttribute(cols,3));geom.setIndex(tris);
  mesh(g,geom,new T.MeshPhysicalMaterial({roughness:0.57,vertexColors:true,clearcoat:0.05,clearcoatRoughness:0.52}));
  const nail=mat(0xeabaaa,0.41);
  for(const [x,y,z,a,b,c,r] of nails){const n=ball(g,nail,x,y,z,a,b,c);n.rotation.x=r;}
  const thumb=ball(g,nail,-0.347,0.064,0.175,0.060,0.020,0.049);thumb.rotation.set(0.74,0.21,-0.2);
  const cuff=group(g);cuff.position.set(0.51,0.188,0.205);
  cuff.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,0.05,0.29).normalize());
  const knit=mat(0x879a92,0.96),rib=mat(0x758d83,0.94),cream=mat(0xc7c3a5,0.93);
  const sleeve=lathe(cuff,[[0.163,0],[0.187,0.004],[0.201,0.035],[0.199,0.12],[0.213,0.17],[0.218,0.255],[0.238,0.29],[0.265,0.344],[0.26,0.44],[0.248,0.52],[0.292,0.64],[0.279,0.76],[0.301,0.86],[0.34,1.38],[0.39,2.0],[0.45,4.2]],knit);
  const v=sleeve.geometry.attributes.position;
  for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i),y=v.getY(i),ang=Math.atan2(z,x),s=1+0.036*Math.cos(ang*8+y*2)+0.023*Math.sin(3*ang-y);v.setXYZ(i,x*s,y,z*s);}
  sleeve.geometry.computeVertexNormals();
  for(let i=0;i<44;i++){
    const a=i*Math.PI/22;Kitchen.rod(cuff,rib,[0.193*Math.cos(a),0.026,0.193*Math.sin(a)],[0.211*Math.cos(a),0.239,0.211*Math.sin(a)],0.0065);
  }
  Kitchen.ring(cuff,cream,0,0.196,0,0.212,0.010);
  return g;
}
