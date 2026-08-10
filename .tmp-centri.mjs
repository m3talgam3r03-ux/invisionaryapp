const m = await import('@svg-maps/italy');
const d = m.default?.default ?? m.default ?? m;
const IT={Abruzzo:'Abruzzo','Aosta Valley':"Valle d'Aosta",Apulia:'Puglia',Basilicata:'Basilicata',Calabria:'Calabria',Campania:'Campania','Emilia-Romagna':'Emilia-Romagna','Friuli-Venezia Giulia':'Friuli-Venezia Giulia',Lazio:'Lazio',Liguria:'Liguria',Lombardy:'Lombardia',Marche:'Marche',Molise:'Molise',Piedmont:'Piemonte',Sardinia:'Sardegna',Sicily:'Sicilia','Trentino-South Tyrol':'Trentino-Alto Adige',Tuscany:'Toscana',Umbria:'Umbria',Veneto:'Veneto'};

function spezza(dd){
  const parti=[]; let cur=[]; let x=0,y=0,ix=0,iy=0,nuovo=true;
  const g=dd.match(/[mMzZ]|-?\d*\.?\d+(?:e-?\d+)?/g)||[];
  let i=0;
  while(i<g.length){
    const t=g[i];
    if(t==='m'||t==='M'){ if(cur.length>1)parti.push(cur); cur=[]; nuovo=true; i++; continue; }
    if(t==='z'||t==='Z'){ x=ix; y=iy; i++; continue; }
    const dx=Number(g[i]), dy=Number(g[i+1]); i+=2;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)) continue;
    x+=dx; y+=dy;
    if(nuovo){ ix=x; iy=y; nuovo=false; }
    cur.push({x,y});
  }
  if(cur.length>1)parti.push(cur);
  return parti;
}
function area(p){const xs=p.map(q=>q.x),ys=p.map(q=>q.y);return (Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));}
function bari(p){let a=0,cx=0,cy=0;for(let i=0;i<p.length;i++){const u=p[i],v=p[(i+1)%p.length];const c=u.x*v.y-v.x*u.y;a+=c;cx+=(u.x+v.x)*c;cy+=(u.y+v.y)*c;}
  if(Math.abs(a)<1e-9)return{x:p.reduce((s,q)=>s+q.x,0)/p.length,y:p.reduce((s,q)=>s+q.y,0)/p.length};
  return {x:cx/(3*a),y:cy/(3*a)};}

console.log('viewBox:', d.viewBox);
const out={};
for(const l of d.locations){
  const parti=spezza(l.path);
  const big=parti.reduce((a,b)=>area(b)>area(a)?b:a);
  const c=bari(big);
  out[IT[l.name]]=c;
  console.log((IT[l.name]||l.name).padEnd(24), 'x='+c.x.toFixed(1).padStart(7), 'y='+c.y.toFixed(1).padStart(7), '| sottopercorsi:'+parti.length);
}
