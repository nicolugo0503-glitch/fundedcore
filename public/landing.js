(function boot(){
 if(typeof window!=='undefined' && typeof window.THREE==='undefined'){return setTimeout(boot,50);}
try{
/* ── CURSOR ── */
const $c=document.getElementById('cur'),$d=document.getElementById('curD');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
(function l(){
if(!document.hidden){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;
$c.style.left=mx+'px';$c.style.top=my+'px';
$d.style.left=rx+'px';$d.style.top=ry+'px';}
requestAnimationFrame(l)})();

/* ── THREE.JS GLOBE HERO — ULTRA ── */
(function(){
  const cv=document.getElementById('heroCanvas');
  const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  ren.setPixelRatio(1);
  ren.setSize(cv.offsetWidth,cv.offsetHeight);
  ren.setClearColor(0x000000,0);
  const sc=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(48,cv.offsetWidth/cv.offsetHeight,.1,200);
  cam.position.set(0,0,6.5);

  // ── DOT GLOBE — original electric cyan/blue palette ──
  const N=2800; const pts=[],cols=[];
  const col=new THREE.Color();
  for(let i=0;i<N;i++){
    const phi=Math.acos(-1+(2*i)/N);
    const theta=Math.sqrt(N*Math.PI)*phi;
    const R=2.4;
    pts.push(Math.sin(phi)*Math.cos(theta)*R, Math.sin(phi)*Math.sin(theta)*R, Math.cos(phi)*R);
    const t=0.5+0.5*Math.cos(phi);
    col.setHSL(0.55+t*.07, 1.0, 0.45+t*.3);
    cols.push(col.r,col.g,col.b);
  }
  const dg=new THREE.BufferGeometry();
  dg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  dg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  const globe=new THREE.Points(dg,new THREE.PointsMaterial({size:.03,vertexColors:true,transparent:true,opacity:.85,sizeAttenuation:true}));
  sc.add(globe);

  // ── INNER WIREFRAME SHELL (icosahedron) ──
  const icoGeo=new THREE.IcosahedronGeometry(2.42,2);
  const icoEdges=new THREE.EdgesGeometry(icoGeo);
  const ico=new THREE.LineSegments(icoEdges,new THREE.LineBasicMaterial({color:0x2A4A5A,transparent:true,opacity:.04}));
  sc.add(ico);

  // ── OUTER GLOW RING ──
  const ringGeo=new THREE.TorusGeometry(2.7,0.003,8,120);
  const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0x8BBFCE,transparent:true,opacity:.08}));
  ring.rotation.x=Math.PI*.35; ring.rotation.y=Math.PI*.1;
  sc.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.9,0.002,8,120),new THREE.MeshBasicMaterial({color:0x4A7A99,transparent:true,opacity:.05}));
  ring2.rotation.x=Math.PI*.45; ring2.rotation.z=Math.PI*.2;
  sc.add(ring2);

  // ── CONNECTION ARCS (40) ──
  const arcLines=[];
  for(let i=0;i<40;i++){
    const i1=Math.floor(Math.random()*N)*3, i2=Math.floor(Math.random()*N)*3;
    const p1=new THREE.Vector3(pts[i1],pts[i1+1],pts[i1+2]);
    const p2=new THREE.Vector3(pts[i2],pts[i2+1],pts[i2+2]);
    const mid=p1.clone().add(p2).multiplyScalar(.5).normalize().multiplyScalar(3.1+Math.random()*.5);
    const curv=new THREE.QuadraticBezierCurve3(p1,mid,p2);
    const seg=48;
    const ag=new THREE.BufferGeometry().setFromPoints(curv.getPoints(seg));
    const op=.08+Math.random()*.22;
    const ln=new THREE.Line(ag,new THREE.LineBasicMaterial({color:i<20?0x00C8FF:0x1A5FFF,transparent:true,opacity:op}));
    sc.add(ln);
    arcLines.push({ln,baseOp:op,ph:Math.random()*Math.PI*2});
  }

  // ── PULSE DOTS — simple gold spheres ──
  const pulses=[];
  for(let i=0;i<8;i++){
    const idx=Math.floor(Math.random()*arcLines.length);
    const pg=new THREE.Mesh(new THREE.SphereGeometry(.04,12,12),new THREE.MeshBasicMaterial({color:0x8899AA,transparent:true,opacity:.9}));
    sc.add(pg);
    pulses.push({mesh:pg,arcIdx:idx,t:Math.random()});
  }
  // precompute curves for pulse travel
  const curves=[];
  for(let i=0;i<arcLines.length;i++){
    const i1=Math.floor(Math.random()*N)*3, i2=Math.floor(Math.random()*N)*3;
    const p1=new THREE.Vector3(pts[i1],pts[i1+1],pts[i1+2]);
    const p2=new THREE.Vector3(pts[i2],pts[i2+1],pts[i2+2]);
    const mid=p1.clone().add(p2).multiplyScalar(.5).normalize().multiplyScalar(3.1+Math.random()*.5);
    curves.push(new THREE.QuadraticBezierCurve3(p1,mid,p2));
  }

  // ── ORBITING NODES ──
  const orbs=[];
  [
    {r:3.15,sp:.018,el:.18,ph:0.0,c:0x7AACBE},
    {r:3.30,sp:.012,el:-.25,ph:2.1,c:0x5A8EA0},
    {r:2.95,sp:.022,el:.38,ph:0.8,c:0x8ABECC},
    {r:3.45,sp:.009,el:.10,ph:4.5,c:0x4A7A90},
    {r:3.05,sp:.016,el:-.18,ph:1.5,c:0x6A9DAE},
    {r:3.20,sp:.014,el:.28,ph:3.2,c:0x7AADBE},
    {r:3.60,sp:.007,el:-.08,ph:5.1,c:0x5090A0},
    {r:2.88,sp:.020,el:.42,ph:2.7,c:0x6AAABB},
  ].forEach(o=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(.045,10,10),new THREE.MeshBasicMaterial({color:o.c,transparent:true,opacity:.85}));
    // glow halo
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.1,10,10),new THREE.MeshBasicMaterial({color:o.c,transparent:true,opacity:.12,side:THREE.BackSide}));
    m.add(halo);
    sc.add(m);
    orbs.push({m,...o});
  });

  // ── STAR FIELD ──
  const starPos=new Float32Array(3500*3);
  for(let i=0;i<3500;i++){starPos[i*3]=(Math.random()-.5)*50;starPos[i*3+1]=(Math.random()-.5)*50;starPos[i*3+2]=(Math.random()-.5)*30-12;}
  const sg=new THREE.BufferGeometry();
  sg.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
  sc.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x1A3040,size:.009,transparent:true,opacity:.4})));

  // ── MOUSE PARALLAX ──
  let ox=0,oy=0,txOx=0,txOy=0;
  document.addEventListener('mousemove',e=>{txOx=(e.clientX/innerWidth-.5)*2;txOy=(e.clientY/innerHeight-.5)*2});

  // ── RESIZE ──
  function resize(){
    const w=cv.parentElement.offsetWidth||innerWidth;
    const h=cv.parentElement.offsetHeight||innerHeight;
    ren.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize);resize();

  let T=0,_hVis=true;
  new IntersectionObserver(e=>{_hVis=e[0].isIntersecting},{threshold:0}).observe(cv.parentElement||cv);
  (function loop(){
    requestAnimationFrame(loop);
    if(document.hidden||!_hVis)return;
    T+=.004;
    // smooth parallax
    ox+=(txOx-ox)*.04; oy+=(txOy-oy)*.04;

    globe.rotation.y=T*.14+ox*.08;
    globe.rotation.x=Math.sin(T*.06)*.04+oy*.04;
    ico.rotation.y=T*.08-ox*.03;
    ico.rotation.x=Math.sin(T*.05)*.03;
    ring.rotation.z=T*.05;
    ring2.rotation.z=-T*.03;

    // arc pulse breathing
    arcLines.forEach(({ln,baseOp,ph},i)=>{
      ln.material.opacity=baseOp*(0.7+0.3*Math.sin(T*1.2+ph));
    });

    // pulse dots travel
    pulses.forEach(p=>{
      p.t+=.00008+p.arcIdx*.000003;
      if(p.t>1)p.t=0;
      const cv2=curves[p.arcIdx%curves.length];
      const pos=cv2.getPoint(p.t);
      p.mesh.position.copy(pos);
      p.mesh.material.opacity=0.6+0.4*Math.sin(p.t*Math.PI);
    });

    // orbital nodes
    orbs.forEach(o=>{
      const a=T*o.sp+o.ph;
      o.m.position.set(Math.cos(a)*o.r, Math.sin(o.el*4+T*.008)*.85, Math.sin(a)*o.r);
      o.m.material.opacity=.5+.45*Math.sin(T*1.8+o.ph);
    });

    cam.position.z=6.5+Math.sin(T*.2)*.12;
    ren.render(sc,cam);
  })();
})();

/* ── TICKER ── */
const MODS=['pre_trade_check','daily_loss_guard','trailing_drawdown','max_drawdown','consistency_rule','news_window_block','restricted_instruments','contract_caps','payout_protector','account_routing','survival_monitor','breach_alerts','rule_engine','min_trading_days','worst_case_loss','firm_rule_packs','discipline_record','reduce_to_safe','block_on_breach','position_sizing','buffer_tracking','revenge_trade_guard','account_state_sync','verdict_engine'];
const tk=document.getElementById('ticker');
const ts=MODS.map(m=>`<span class="tki"><b>⬡</b>${m}</span>`).join('');
tk.innerHTML=ts+ts+ts;

/* ── ARCH STORY CANVASES ── */
/* story-canvas shared visibility — pause all 3 when #pillars not in view */
let _pVis=false,_pLF=0;
{const sec=document.getElementById('pillars');if(sec)new IntersectionObserver(e=>{_pVis=e[0].isIntersecting},{threshold:0}).observe(sec);}

/* C1 — ORDER PIPELINE (plain English: your order travels through 4 steps) */
{
  const c=document.getElementById('cvs-exec');
  if(c){
    const ctx=c.getContext('2d');
    let W=0,H=0;
    const rsz=()=>{W=c.width=c.offsetWidth;H=c.height=c.offsetHeight};
    rsz();try{new ResizeObserver(rsz).observe(c)}catch(e){}

    // Stage labels — plain English steps
    const ST=['INTENT','CHECK','VERDICT','SAFE ✓'];
    let si=0,phase='dwell',pt=0,checks=[false,false,false];
    let oCount=Math.floor(Math.random()*350+180);
    const DW=0.78,TR=0.52;
    let last=performance.now();

    const loop=now=>{
      requestAnimationFrame(loop);
      if(document.hidden||!_pVis)return;
      const dt=Math.min(.05,(now-last)/1000);last=now;
      pt+=dt;
      if(phase==='dwell'&&pt>=DW){
        if(si===ST.length-1){checks=[false,false,false];si=0;oCount++;const el=document.getElementById('exec-count');if(el)el.textContent=oCount.toLocaleString()}
        phase='travel';pt=0;
      } else if(phase==='travel'&&pt>=TR){
        if(si<ST.length-1)checks[si]=true;
        si=Math.min(si+1,ST.length-1);phase='dwell';pt=0;
      }
      const pPos=phase==='dwell'?si:si+(pt/TR);
      if(!W||!H){requestAnimationFrame(loop);return}
      ctx.clearRect(0,0,W,H);
      const mgL=24,mgR=24,cy=H/2-12;
      const sw=(W-mgL-mgR)/(ST.length-1);
      // Lines between stages
      for(let i=0;i<ST.length-1;i++){
        const x1=mgL+i*sw+16,x2=mgL+(i+1)*sw-16;
        const passed=pPos>i+0.5;
        ctx.strokeStyle=passed?'rgba(122,184,212,.38)':'rgba(100,155,185,.09)';
        ctx.lineWidth=1.5;ctx.setLineDash([5,9]);
        ctx.beginPath();ctx.moveTo(x1,cy);ctx.lineTo(x2-5,cy);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=passed?'rgba(122,184,212,.45)':'rgba(100,155,185,.1)';
        ctx.beginPath();ctx.moveTo(x2-8,cy-4);ctx.lineTo(x2-2,cy);ctx.lineTo(x2-8,cy+4);ctx.closePath();ctx.fill();
      }
      // Stage circles
      ST.forEach((lbl,i)=>{
        const sx=mgL+i*sw;
        const isActive=Math.abs(pPos-i)<0.25;
        const isPassed=checks[i]||(i===ST.length-1&&si===ST.length-1&&phase==='dwell');
        // Glow pulse
        if(isActive){ctx.beginPath();ctx.arc(sx,cy,22,0,Math.PI*2);ctx.fillStyle='rgba(122,184,212,.055)';ctx.fill()}
        // Circle
        ctx.beginPath();ctx.arc(sx,cy,13,0,Math.PI*2);
        ctx.fillStyle='rgba(2,8,22,.92)';
        ctx.shadowColor=isActive?'rgba(122,184,212,.7)':isPassed?'rgba(74,187,160,.45)':'transparent';
        ctx.shadowBlur=isActive?18:isPassed?8:0;ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle=isActive?'rgba(122,184,212,.88)':isPassed?'rgba(74,187,160,.72)':'rgba(100,155,185,.14)';
        ctx.lineWidth=1.5;ctx.stroke();
        // Checkmark if done
        if(isPassed){
          ctx.strokeStyle=i===ST.length-1?'rgba(42,219,138,.95)':'rgba(74,187,160,.9)';
          ctx.lineWidth=2;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(sx-5,cy+1);ctx.lineTo(sx-1,cy+5);ctx.lineTo(sx+7,cy-5);ctx.stroke();
          ctx.lineCap='butt';
        }
        // Step label below — larger, readable
        ctx.fillStyle=isActive?'rgba(220,240,255,.9)':isPassed?'rgba(160,205,225,.65)':'rgba(100,145,170,.3)';
        ctx.font=`${isActive?'700':'600'} 10px 'JetBrains Mono',monospace`;
        ctx.textAlign='center';ctx.fillText(lbl,sx,cy+30);
      });
      // Moving packet (glowing dot)
      const pkX=mgL+Math.min(pPos,ST.length-1)*sw;
      ctx.beginPath();ctx.arc(pkX,cy,5,0,Math.PI*2);
      ctx.fillStyle='rgba(215,240,255,.95)';ctx.shadowColor='rgba(160,215,245,.8)';ctx.shadowBlur=16;ctx.fill();ctx.shadowBlur=0;
      // Status line at bottom
      const done=si===ST.length-1&&phase==='dwell';
      ctx.fillStyle=done?'rgba(42,219,138,.5)':'rgba(122,184,212,.22)';
      ctx.font="500 9px 'JetBrains Mono',monospace";ctx.textAlign='center';
      ctx.fillText(done?'● TRADE APPROVED':'● CHECKING TRADE...',W/2,H-12);
    };
    requestAnimationFrame(loop);
  }
}

/* C2 — RISK METERS (plain English: progress bars showing limits) */
{
  const c=document.getElementById('cvs-risk');
  if(c){
    const ctx=c.getContext('2d');
    let W=0,H=0;
    const rsz=()=>{W=c.width=c.offsetWidth;H=c.height=c.offsetHeight};
    rsz();try{new ResizeObserver(rsz).observe(c)}catch(e){}
    const M=[
      {lbl:'Daily Loss Used',v:47,tv:47},
      {lbl:'Max Drawdown Used',v:62,tv:62},
      {lbl:'Position Size',v:21,tv:21},
      {lbl:'Payout Consistency',v:69,tv:69},
    ];
    let rCount=0;
    setInterval(()=>{
      M.forEach(m=>m.tv=Math.max(4,Math.min(97,m.tv+(Math.random()-.5)*9)));
      rCount+=Math.floor(Math.random()*5+2);
      const el=document.getElementById('risk-count');if(el)el.textContent=rCount.toLocaleString();
    },1600);
    const draw=now=>{
      requestAnimationFrame(draw);
      if(document.hidden||!_pVis)return;
      if(now-_pLF<32)return;_pLF=now; // ~30fps throttle shared
      if(!W||!H)return;
      ctx.clearRect(0,0,W,H);
      M.forEach(m=>m.v+=(m.tv-m.v)*.04);
      const mX=20,bW=W-mX*2-56,bH=8,rowH=H/(M.length+0.7);
      // Status banner
      const anyWarn=M.some(m=>m.v>80);
      ctx.fillStyle=anyWarn?'rgba(232,184,75,.55)':'rgba(42,219,138,.5)';
      ctx.font="700 10px 'JetBrains Mono',monospace";ctx.textAlign='center';
      ctx.fillText(anyWarn?'⚠  RISK ELEVATED':'●  ALL LIMITS SAFE',W/2,20);
      M.forEach((m,i)=>{
        const y=34+i*rowH;const pct=m.v/100;
        // Label
        ctx.fillStyle='rgba(165,205,228,.55)';ctx.font="400 11px 'Inter',sans-serif";
        ctx.textAlign='left';ctx.fillText(m.lbl,mX,y+13);
        // % value
        ctx.fillStyle=m.v>85?'rgba(232,80,80,.8)':m.v>75?'rgba(232,184,75,.8)':'rgba(120,175,210,.58)';
        ctx.font="500 11px 'JetBrains Mono',monospace";ctx.textAlign='right';
        ctx.fillText(m.v.toFixed(0)+'%',mX+bW-2,y+13);
        // Bar bg
        const by=y+18;ctx.fillStyle='rgba(100,150,175,.08)';ctx.fillRect(mX,by,bW,bH);
        // 80% limit marker
        const limX=mX+bW*.8;
        ctx.strokeStyle='rgba(232,184,75,.2)';ctx.lineWidth=1;ctx.setLineDash([2,2]);
        ctx.beginPath();ctx.moveTo(limX,by-2);ctx.lineTo(limX,by+bH+2);ctx.stroke();ctx.setLineDash([]);
        // Fill
        const fc=m.v>85?'rgba(232,80,80,.8)':m.v>75?'rgba(232,184,75,.8)':m.v>60?'rgba(122,184,212,.75)':'rgba(74,187,160,.7)';
        ctx.shadowColor=fc;ctx.shadowBlur=5;ctx.fillStyle=fc;ctx.fillRect(mX,by,bW*pct,bH);ctx.shadowBlur=0;
        // Status badge
        const st=m.v>85?'BLOCKED':m.v>75?'ALERT':'SAFE';
        const sc=m.v>85?'rgba(232,80,80,.8)':m.v>75?'rgba(232,184,75,.8)':'rgba(42,219,138,.6)';
        ctx.fillStyle=sc;ctx.font="600 8px 'JetBrains Mono',monospace";ctx.textAlign='left';
        ctx.fillText(st,mX+bW+10,by+bH);
      });
    };
    requestAnimationFrame(draw);
  }
}

/* C3 — SEALED EVENTS (plain English: readable list with SEALED stamps) */
{
  const c=document.getElementById('cvs-gov');
  if(c){
    const ctx=c.getContext('2d');
    let W=0,H=0;
    const rsz=()=>{W=c.width=c.offsetWidth;H=c.height=c.offsetHeight};
    rsz();try{new ResizeObserver(rsz).observe(c)}catch(e){}
    const EVTS=[
      'Pre-trade check · APPROVED',
      'Daily loss room · OK',
      'Trailing drawdown · safe',
      'Size reduced to safe',
      'News window · WAIT',
      'Payout consistency · OK',
      'Account survival · logged',
      'Trade journaled',
      'Rule pack · up to date',
      'Min trading days · tracked',
    ];
    const evts=[];let gCount=0;
    const addEvt=()=>{
      const d=new Date();
      const ts=d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')+':'+d.getSeconds().toString().padStart(2,'0');
      evts.unshift({ts,text:EVTS[Math.floor(Math.random()*EVTS.length)],age:0});
      gCount++;const el=document.getElementById('gov-count');if(el)el.textContent=gCount.toLocaleString();
      if(evts.length>9)evts.pop();
    };
    setInterval(addEvt,1500);for(let i=0;i<5;i++)addEvt();
    const draw=now=>{
      requestAnimationFrame(draw);
      if(document.hidden||!_pVis)return;
      if(now-_pLF<32)return;_pLF=now;
      if(!W||!H)return;
      ctx.clearRect(0,0,W,H);
      const RH=H/(evts.length+0.4);
      evts.forEach((ev,i)=>{
        ev.age+=0.016;
        const alpha=Math.min(1,ev.age*4)*Math.max(0.18,1-i*0.1);
        const isNew=i===0&&ev.age<1;
        const y=10+i*RH;
        if(isNew){ctx.fillStyle=`rgba(74,187,160,${Math.max(0,.05*(1-ev.age))})`;ctx.fillRect(0,y-7,W,RH)}
        // Timestamp
        ctx.fillStyle=`rgba(80,125,155,${alpha*.4})`;ctx.font="400 10px 'JetBrains Mono',monospace";
        ctx.textAlign='left';ctx.fillText(ev.ts,14,y+5);
        // Event — readable font, readable size
        ctx.fillStyle=`rgba(185,220,238,${alpha*(isNew?.92:.72)})`;
        ctx.font=isNew?"500 11px 'Inter',sans-serif":"400 11px 'Inter',sans-serif";
        ctx.fillText(ev.text,82,y+5);
        // SEALED badge
        ctx.fillStyle=isNew?`rgba(42,219,138,${alpha})`:`rgba(42,219,138,${alpha*.38})`;
        ctx.font="700 8px 'JetBrains Mono',monospace";ctx.textAlign='right';
        ctx.fillText('● SEALED',W-12,y+5);
      });
    };
    requestAnimationFrame(draw);
  }
}

/* ── PATH STAGES ── */
const STAGES=[
  {n:'01',aum:'Evaluation',title:'Pass',desc:'Pre-trade checks keep you inside the eval rules so you actually pass — no careless breach resets.'},
  {n:'02',aum:'Funded',title:'Protect',desc:'The account-survival monitor guards your funded account day to day, trade by trade.'},
  {n:'03',aum:'First Payout',title:'Bank it',desc:'Payout guard makes sure consistency and minimum-day rules don\u2019t void what you earned.'},
  {n:'04',aum:'Multi-Account',title:'Route',desc:'Run several accounts at once; routing sends each trade to the right one automatically.'},
  {n:'05',aum:'Scaling',title:'Grow',desc:'A verified discipline record backs you as you scale size and add more funded accounts.'},
  {n:'06',aum:'Portfolio',title:'Operate',desc:'Run a portfolio of funded accounts like a desk — every single trade governed first.'},
];
const ps=document.getElementById('pathStages');
STAGES.forEach((s,i)=>{
  const d=document.createElement('div');
  d.className='stage';
  d.style.transitionDelay=i*.08+'s';
  d.innerHTML=`<div class="stage-n">${s.n}</div><div class="stage-tier">${s.aum}</div><div class="stage-title">${s.title}</div><div class="stage-desc">${s.desc}</div><div class="stage-bar"></div>`;
  ps.appendChild(d);
});

/* ── PRICING ── */
const TIERS=[
  {tier:'STARTER',name:'FundedCore Starter',audience:'New & evaluation traders',price:'$0',period:'free forever',features:['1 funded account','Pre-trade check (Approve/Reduce/Wait/Block)','Account-survival monitor','Major-firm rule packs','Trade journal (basic)'],nope:['Multi-account routing','Payout protector','Priority rule updates'],btn:'Get Started',featured:false},
  {tier:'PRO',name:'FundedCore Pro',audience:'Active funded traders',price:'$39',period:'/month',features:['Multiple accounts','Payout protector','Account routing','Full journal & history','Real-time breach alerts','All firm rule packs'],nope:['Team dashboards'],btn:'Get Early Access',featured:true},
  {tier:'DESK',name:'FundedCore Desk',audience:'Heavy multi-account traders',price:'$99',period:'/month',features:['Everything in Pro','Unlimited accounts','Priority rule-pack updates','Advanced routing logic','Scaling guidance','Export & reporting'],nope:[],btn:'Get Started',featured:false},
  {tier:'COACH',name:'FundedCore Coach',audience:'Coaches & trading groups',price:'Per seat',period:'pricing',features:['Everything in Pro','Student dashboards','Group risk alerts','Cohort reporting','Operator / coach roles'],nope:[],btn:'Contact Sales',featured:false},
  {tier:'FIRM',name:'FundedCore Firm',audience:'Prop firms & platforms',price:'Custom',period:'pricing',features:['Rule-engine licensing','Clearance API access','White-label pre-trade checks','Dedicated onboarding','SLA & priority support'],nope:[],btn:'Talk to Us',featured:false},
];
const pg=document.getElementById('priceGrid');
TIERS.forEach((t,i)=>{
  const d=document.createElement('div');
  d.className='pc'+(t.featured?' featured':'');
  d.style.transitionDelay=i*.07+'s';
  const feats=t.features.map(f=>`<li>${f}</li>`).join('');
  const nopes=t.nope.map(f=>`<li class="no">${f}</li>`).join('');
  d.innerHTML=`
    ${t.featured?'<div class="pc-badge">Most Deployed</div>':''}
    <div class="pc-tier">${t.tier}</div>
    <div class="pc-name">${t.name}</div>
    <div class="pc-audience">${t.audience.replace('\n','<br>')}</div>
    <div class="pc-price">
      <div class="pc-amount">${t.price==='Custom'?'Custom':`<em>$</em>${t.price.replace('$','')}`}</div>
      <div class="pc-period">${t.period}</div>
    </div>
    <div class="pc-divider"></div>
    <ul class="pc-list">${feats}${nopes}</ul>
    <a href="mailto:nicolugo0503@gmail.com" class="pc-cta ${t.featured?'primary':'outline'}">${t.btn}</a>`;
  pg.appendChild(d);
});

/* ── CANVAS CHARTS ── */
function drawTermChart(canvas,color,fillColor){
  if(!canvas)return;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const pts=[];const n=60;
  let y=h*.5;
  for(let i=0;i<n;i++){
    y+=((Math.random()-.5)*h*.18);
    y=Math.max(h*.1,Math.min(h*.9,y));
    pts.push({x:(i/(n-1))*w,y});
  }
  // fill
  const grad=ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,fillColor);grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath();ctx.moveTo(pts[0].x,h);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x,h);ctx.closePath();
  ctx.fillStyle=grad;ctx.fill();
  // line
  ctx.beginPath();
  pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
  ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke();
  // last dot
  const lp=pts[pts.length-1];
  ctx.beginPath();ctx.arc(lp.x,lp.y,3,0,Math.PI*2);
  ctx.fillStyle=color;ctx.fill();
}

function drawArchViz(canvas,type){
  if(!canvas)return;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(type==='exec'){
    const bars=22,bw=Math.floor((w-bars*2)/bars);
    for(let i=0;i<bars;i++){
      const bh=(0.25+Math.abs(Math.sin(i*.7+Math.random()*.3))*.65)*h;
      const x=i*(bw+2);
      const g=ctx.createLinearGradient(0,h-bh,0,h);
      g.addColorStop(0,'rgba(122,184,212,.45)');g.addColorStop(1,'rgba(122,184,212,.05)');
      ctx.fillStyle=g;ctx.fillRect(x,h-bh,bw,bh);
    }
  } else if(type==='risk'){
    const pts=[];const n=50;
    for(let i=0;i<n;i++){
      pts.push({x:(i/(n-1))*w,y:h*.5+Math.sin(i*.35)*h*.28+Math.sin(i*.09)*h*.14});
    }
    ctx.beginPath();ctx.moveTo(pts[0].x,h);
    pts.forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.lineTo(pts[pts.length-1].x,h);ctx.closePath();
    const g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'rgba(74,187,160,.14)');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle='rgba(74,187,160,.55)';ctx.lineWidth=1.5;ctx.stroke();
  } else {
    const bars=[96,100,88,100,94];const bh=10,gap=(h-bars.length*(bh+4))/(bars.length+1);
    bars.forEach((pct,i)=>{
      const y=gap*(i+1)+i*(bh+4);
      ctx.fillStyle='rgba(100,155,185,.1)';ctx.fillRect(0,y,w,bh);
      const gx=ctx.createLinearGradient(0,0,w*pct/100,0);
      gx.addColorStop(0,'rgba(122,184,212,.45)');gx.addColorStop(1,'rgba(122,184,212,.2)');
      ctx.fillStyle=gx;ctx.fillRect(0,y,w*pct/100,bh);
    });
  }
}

/* ── CTA: GLSL FBM FLUID SHADER ── */
(function(){
  const cv=document.getElementById('cta-canvas');
  if(!cv)return;
  const gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');
  if(!gl){/* fallback: basic canvas */return;}
  function resize(){cv.width=cv.offsetWidth;cv.height=cv.offsetHeight;gl.viewport(0,0,cv.width,cv.height)}
  resize();window.addEventListener('resize',resize);
  const vSrc=`attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const fSrc=`precision highp float;
uniform float T;uniform vec2 R;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);
  for(int i=0;i<7;i++){v+=a*n(p);p=m*p*2.1;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;
  vec2 p=(uv-.5)*3.;float t=T*.15;
  vec2 q=vec2(fbm(p+t),fbm(p+vec2(0,t)));
  vec2 r=vec2(fbm(p+4.*q+vec2(1.7,9.2)+.15*t),fbm(p+4.*q+vec2(8.3,2.8)+.126*t));
  float f=fbm(p+4.*r);
  vec3 c=mix(vec3(.005,.015,.06),vec3(.02,.06,.18),clamp(f*f*4.,0.,1.));
  c=mix(c,vec3(.04,.10,.26),clamp(length(q),0.,1.));
  c=mix(c,vec3(.03,.08,.22),clamp(length(r.x),0.,1.));
  float a=(f*f*f+.6*f*f+.5*f)*.32;
  gl_FragColor=vec4(c,a);}`;
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  const prog=gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,vSrc));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fSrc));
  gl.linkProgram(prog);gl.useProgram(prog);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const uT=gl.getUniformLocation(prog,'T'),uR=gl.getUniformLocation(prog,'R');
  const t0=performance.now();
  let _ctaVis=false;
  new IntersectionObserver(e=>{_ctaVis=e[0].isIntersecting},{threshold:0}).observe(cv);
  (function draw(){
    requestAnimationFrame(draw);
    if(document.hidden||!_ctaVis)return;
    gl.uniform1f(uT,(performance.now()-t0)*.001);
    gl.uniform2f(uR,cv.width,cv.height);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  })();
})();

// Draw charts after DOM ready
setTimeout(()=>{
  drawTermChart(document.getElementById('execChart'),'rgba(122,184,212,.85)','rgba(122,184,212,.07)');
  drawTermChart(document.getElementById('riskChart'),'rgba(74,187,160,.85)','rgba(74,187,160,.07)');
  drawArchViz(document.getElementById('arch-cvs-0'),'exec');
  drawArchViz(document.getElementById('arch-cvs-1'),'risk');
  drawArchViz(document.getElementById('arch-cvs-2'),'gov');
},120);

/* ── THREE.JS 3D ARCHITECTURE NETWORK ── */
(function(){
  const cv=document.getElementById('arch3d');
  if(!cv||typeof THREE==='undefined')return;
  const W=cv.offsetWidth||1200,H=360;
  cv.width=W;cv.height=H;
  const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  ren.setPixelRatio(1);ren.setSize(W,H);ren.setClearColor(0x000000,0);
  const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(45,W/H,.1,100);
  cam.position.set(0,1.5,11);cam.lookAt(0,0,0);

  // Layer definitions
  const LAYERS=[
    {pos:[-4.5,1.5,0],col:0x7AB8D4,r:.32,subs:[[-5.4,2.6,1.2],[-3.6,2.6,-1],[-5.2,.3,.8],[-3.8,.3,-1.2],[-5.8,1.5,-.5]]},
    {pos:[0,0,0],      col:0x4ABBA0,r:.36,subs:[[.9,1.4,1.1],[-.9,1.4,-1],[1,-1.2,.6],[-1,-1.2,.8],[0,1.8,-.8]]},
    {pos:[4.5,-1.5,0], col:0x6A9AB0,r:.32,subs:[[5.4,-.3,1],[3.6,-.3,-1.2],[5.2,-2.8,.6],[3.8,-2.8,-.8],[5.8,-1.5,-.4]]},
  ];

  const nodeMeshes=[];

  LAYERS.forEach((L,li)=>{
    // Main node sphere
    const g=new THREE.SphereGeometry(L.r,24,24);
    const m=new THREE.MeshBasicMaterial({color:L.col,transparent:true,opacity:.85});
    const mesh=new THREE.Mesh(g,m);mesh.position.set(...L.pos);sc.add(mesh);
    nodeMeshes.push({mesh,base:[...L.pos],phase:li*Math.PI*.65,amp:.12});

    // Outer glow shell
    const glow=new THREE.Mesh(new THREE.SphereGeometry(L.r*2.8,16,16),
      new THREE.MeshBasicMaterial({color:L.col,transparent:true,opacity:.035,side:THREE.BackSide}));
    glow.position.set(...L.pos);sc.add(glow);

    // Sub-nodes
    L.subs.forEach(sp=>{
      const sm=new THREE.Mesh(new THREE.SphereGeometry(.065,8,8),
        new THREE.MeshBasicMaterial({color:L.col,transparent:true,opacity:.45}));
      sm.position.set(...sp);sc.add(sm);
      nodeMeshes.push({mesh:sm,base:[...sp],phase:Math.random()*Math.PI*2,amp:.07});
      // Edge sub→main
      const pts=[new THREE.Vector3(...sp),new THREE.Vector3(...L.pos)];
      sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color:L.col,transparent:true,opacity:.1})));
    });
  });

  // Inter-layer curved connections with data packets
  const packets=[];
  [[0,1],[1,2]].forEach(([a,b])=>{
    const p1=new THREE.Vector3(...LAYERS[a].pos),p2=new THREE.Vector3(...LAYERS[b].pos);
    const mid=new THREE.Vector3().addVectors(p1,p2).multiplyScalar(.5);mid.y+=1.4;
    const curve=new THREE.QuadraticBezierCurve3(p1,mid,p2);
    const pts=curve.getPoints(60);
    sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0x7AB8D4,transparent:true,opacity:.18})));
    // 4 data packets per edge
    for(let i=0;i<4;i++){
      const pm=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),
        new THREE.MeshBasicMaterial({color:0xCCEEFF,transparent:true,opacity:.9}));
      sc.add(pm);packets.push({mesh:pm,curve,t:(i/4),speed:.0018+Math.random()*.001});
    }
  });

  // Grid floor
  const grid=new THREE.GridHelper(24,24,0x0A1828,0x050E18);grid.position.y=-3.5;sc.add(grid);

  // Mouse drag rotation
  let mx=0,my=0,targetX=0,targetY=.15,dragging=false,lastX=0,lastY=0;
  cv.addEventListener('mousedown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY});
  window.addEventListener('mouseup',()=>dragging=false);
  window.addEventListener('mousemove',e=>{
    if(dragging){targetX+=(e.clientX-lastX)*.008;targetY+=(e.clientY-lastY)*.005;lastX=e.clientX;lastY=e.clientY;}
  });

  let T=0,_aVis=false;
  new IntersectionObserver(e=>{_aVis=e[0].isIntersecting},{threshold:0}).observe(cv);
  (function animate(){
    requestAnimationFrame(animate);
    if(document.hidden||!_aVis)return;
    T+=.007;
    sc.rotation.y+=(targetX-sc.rotation.y)*.04;
    sc.rotation.x+=(targetY-sc.rotation.x)*.04;
    nodeMeshes.forEach(n=>{n.mesh.position.y=n.base[1]+Math.sin(T+n.phase)*n.amp;});
    packets.forEach(p=>{
      p.t+=p.speed;if(p.t>1)p.t=0;
      const pos=p.curve.getPoint(p.t);p.mesh.position.copy(pos);
      p.mesh.material.opacity=.5+.5*Math.sin(p.t*Math.PI);
    });
    ren.render(sc,cam);
  })();

  window.addEventListener('resize',()=>{
    const W2=cv.offsetWidth;cam.aspect=W2/H;cam.updateProjectionMatrix();ren.setSize(W2,H);
  });
})();

/* TradingView removed — self-contained build */

/* ── THREE.JS FINANCIAL EARTH GLOBE ── */
(function(){
  const cv=document.getElementById('globe-canvas');
  if(!cv||typeof THREE==='undefined')return;
  const W=cv.offsetWidth||500,H=520;
  cv.width=W;cv.height=H;
  const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  ren.setPixelRatio(1);
  ren.setSize(W,H);ren.setClearColor(0x000000,0);
  const sc=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(38,W/H,.1,100);
  cam.position.set(0,0,3.6);
  const globeGroup=new THREE.Group();sc.add(globeGroup);

  // lat/lon → 3D
  function ll(lat,lon,r){
    r=r||1.0;
    const phi=(90-lat)*(Math.PI/180),theta=(lon+180)*(Math.PI/180);
    return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
  }

  // Dot surface
  const N=2400,dpts=[];
  for(let i=0;i<N;i++){
    const phi=Math.acos(-1+(2*i)/N),theta=Math.sqrt(N*Math.PI)*phi;
    dpts.push(Math.sin(phi)*Math.cos(theta),Math.sin(phi)*Math.sin(theta),Math.cos(phi));
  }
  const dg=new THREE.BufferGeometry();
  dg.setAttribute('position',new THREE.Float32BufferAttribute(dpts,3));
  globeGroup.add(new THREE.Points(dg,new THREE.PointsMaterial({color:0x1E4A60,size:.013,transparent:true,opacity:.7,sizeAttenuation:true})));

  // Wireframe shell
  const wfEdges=new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.003,3));
  globeGroup.add(new THREE.LineSegments(wfEdges,new THREE.LineBasicMaterial({color:0x0E2535,transparent:true,opacity:.07})));

  // Equator ring
  const eqRing=new THREE.Mesh(new THREE.TorusGeometry(1.012,.0018,8,120),new THREE.MeshBasicMaterial({color:0x3A7A9A,transparent:true,opacity:.18}));
  eqRing.rotation.x=Math.PI/2;globeGroup.add(eqRing);

  // Atmospheric glow (stays fixed, not in group)
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1.14,32,32),new THREE.MeshBasicMaterial({color:0x0E3A55,transparent:true,opacity:.07,side:THREE.BackSide})));
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1.26,32,32),new THREE.MeshBasicMaterial({color:0x081C2A,transparent:true,opacity:.04,side:THREE.BackSide})));

  // Financial centers
  const CITIES=[
    {lat:40.71,lon:-74.01},{lat:51.51,lon:-.13},{lat:35.68,lon:139.69},
    {lat:22.33,lon:114.17},{lat:1.35,lon:103.82},{lat:50.11,lon:8.68},
    {lat:41.88,lon:-87.63},{lat:-33.87,lon:151.21},{lat:25.20,lon:55.27},{lat:48.85,lon:2.35}
  ];
  const cityObjs=[];
  CITIES.forEach((c,i)=>{
    const pos=ll(c.lat,c.lon,1.016);
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.019,8,8),new THREE.MeshBasicMaterial({color:0x7AB8D4,transparent:true,opacity:.95}));
    dot.position.copy(pos);globeGroup.add(dot);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),new THREE.MeshBasicMaterial({color:0x3A8AAA,transparent:true,opacity:.12,side:THREE.BackSide}));
    halo.position.copy(pos);globeGroup.add(halo);
    // Spike outward
    const spike=new THREE.Mesh(new THREE.SphereGeometry(.007,6,6),new THREE.MeshBasicMaterial({color:0xCCEEFF,transparent:true,opacity:.6}));
    const spikePos=pos.clone().multiplyScalar(1.04);spike.position.copy(spikePos);globeGroup.add(spike);
    cityObjs.push({dot,halo,spike,phase:i*.62});
  });

  // Connection arcs
  const CONNS=[[0,1],[0,6],[1,5],[1,9],[1,2],[2,3],[2,7],[3,4],[4,7],[5,9],[0,5],[3,8],[4,8],[6,0],[1,3]];
  const arcData=[];
  CONNS.forEach(([a,b])=>{
    const p1=ll(CITIES[a].lat,CITIES[a].lon,1.022),p2=ll(CITIES[b].lat,CITIES[b].lon,1.022);
    const mid=p1.clone().add(p2).multiplyScalar(.5);
    mid.normalize().multiplyScalar(mid.length()+.28+Math.random()*.18);
    const curve=new THREE.QuadraticBezierCurve3(p1,mid,p2);
    const arcLine=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(52)),
      new THREE.LineBasicMaterial({color:0x2E6A8A,transparent:true,opacity:.22})
    );
    globeGroup.add(arcLine);
    arcData.push({curve,line:arcLine});
  });

  // Data packets
  const packets=[];
  arcData.forEach((arc,i)=>{
    for(let j=0;j<2;j++){
      const pm=new THREE.Mesh(new THREE.SphereGeometry(.014,6,6),new THREE.MeshBasicMaterial({color:0xBBEEFF,transparent:true,opacity:.9}));
      globeGroup.add(pm);
      packets.push({mesh:pm,arc,t:(j*.5+i*.07)%1,speed:.0022+Math.random()*.0012});
    }
  });

  // Starfield
  const sf=new Float32Array(1200*3);
  for(let i=0;i<1200;i++){sf[i*3]=(Math.random()-.5)*18;sf[i*3+1]=(Math.random()-.5)*18;sf[i*3+2]=(Math.random()-.5)*18-6;}
  const sfg=new THREE.BufferGeometry();sfg.setAttribute('position',new THREE.Float32BufferAttribute(sf,3));
  sc.add(new THREE.Points(sfg,new THREE.PointsMaterial({color:0x0E2030,size:.009,transparent:true,opacity:.55})));

  // Mouse
  let gMx=0;
  cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();gMx=((e.clientX-r.left)/r.width-.5)*2;});

  window.addEventListener('resize',()=>{const W2=cv.offsetWidth;cam.aspect=W2/H;cam.updateProjectionMatrix();ren.setSize(W2,H);});

  let gT=0,_gVis=false;
  new IntersectionObserver(e=>{_gVis=e[0].isIntersecting},{threshold:0}).observe(cv);
  (function ag(){
    requestAnimationFrame(ag);
    if(document.hidden||!_gVis)return;
    gT+=.004;
    globeGroup.rotation.y+=.0018+gMx*.0012;
    globeGroup.rotation.x=Math.sin(gT*.12)*.065;
    // city pulses
    cityObjs.forEach(c=>{c.halo.material.opacity=.06+.14*Math.abs(Math.sin(gT*1.1+c.phase));c.dot.material.opacity=.7+.3*Math.abs(Math.sin(gT*.9+c.phase));});
    // packets
    packets.forEach(p=>{p.t+=p.speed;if(p.t>1)p.t=0;p.mesh.position.copy(p.arc.curve.getPoint(p.t));p.mesh.material.opacity=.3+.7*Math.sin(p.t*Math.PI);});
    // arc breathing
    arcData.forEach((a,i)=>{a.line.material.opacity=.1+.14*Math.abs(Math.sin(gT*.7+i*.45));});
    ren.render(sc,cam);
  })();
})();

/* ── WEBGL RAYMARCHING TORUS ── */
(function(){
  const cv=document.getElementById('bignums-canvas');
  if(!cv)return;
  const gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');
  if(!gl)return;
  function rsz(){
    cv.width=Math.floor(cv.offsetWidth*.5); // half-res for perf
    cv.height=Math.floor(cv.offsetHeight*.5);
    gl.viewport(0,0,cv.width,cv.height);
  }
  rsz();window.addEventListener('resize',rsz);

  const vSrc=`attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const fSrc=`precision mediump float;
uniform float T;uniform vec2 R;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float sdSphere(vec3 p,float r){return length(p)-r;}
float map(vec3 p){
  p.xz*=rot(T*.32);p.yx*=rot(T*.14);
  float d1=sdTorus(p,vec2(1.1,.28));
  p.xz*=rot(T*.55);p.yz*=rot(T*.22);
  float d2=sdTorus(p,vec2(.6,.14));
  return min(d1,d2*.9);
}
vec3 nrm(vec3 p){float e=.002;return normalize(vec3(map(p+vec3(e,0,0))-map(p-vec3(e,0,0)),map(p+vec3(0,e,0))-map(p-vec3(0,e,0)),map(p+vec3(0,0,e))-map(p-vec3(0,0,e))));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);
  vec3 ro=vec3(0,0,3.5),rd=normalize(vec3(uv,-1.6));
  float t=0.;bool hit=false;
  for(int i=0;i<56;i++){vec3 p=ro+rd*t;float d=map(p);if(abs(d)<.003){hit=true;break;}t+=d*.9;if(t>8.)break;}
  if(hit){
    vec3 p=ro+rd*t,n=nrm(p);
    vec3 lp=normalize(vec3(2.,3.,2.));
    float diff=max(dot(n,lp),0.);
    float spec=pow(max(dot(reflect(-lp,n),-rd),0.),18.);
    float rim=pow(1.-max(dot(n,-rd),0.),.8);
    vec3 col=vec3(.015,.05,.14)*(diff*2.+.12)+vec3(.08,.32,.55)*spec*.8;
    col+=vec3(.04,.18,.38)*rim*.5;
    float a=clamp((1.-t/7.)*.55+spec*.2+rim*.15,.0,1.);
    gl_FragColor=vec4(col,a);
  }else{gl_FragColor=vec4(0);}
}`;
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  const prog=gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,vSrc));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fSrc));
  gl.linkProgram(prog);gl.useProgram(prog);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const uT=gl.getUniformLocation(prog,'T'),uR=gl.getUniformLocation(prog,'R');
  const t0=performance.now();
  let _bnVis=false;
  new IntersectionObserver(e=>{_bnVis=e[0].isIntersecting},{threshold:0}).observe(cv);
  (function draw(){
    requestAnimationFrame(draw);
    if(document.hidden||!_bnVis)return;
    gl.uniform1f(uT,(performance.now()-t0)*.001);
    gl.uniform2f(uR,cv.width,cv.height);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  })();
})();

/* ── 3D CARD TILT ── */
document.querySelectorAll('.pc').forEach(card=>{
  let raf=null;
  card.addEventListener('mousemove',e=>{
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      const r=card.getBoundingClientRect();
      const cx=r.left+r.width/2,cy=r.top+r.height/2;
      const dx=(e.clientX-cx)/(r.width/2),dy=(e.clientY-cy)/(r.height/2);
      card.style.transform=`perspective(900px) rotateX(${-dy*7}deg) rotateY(${dx*7}deg) translateY(-6px) scale(1.01)`;
      card.style.boxShadow=`${-dx*18}px ${-dy*18}px 56px rgba(122,184,212,.14),0 0 0 1px rgba(122,184,212,.12)`;
    });
  });
  card.addEventListener('mouseleave',()=>{
    card.style.transform='';card.style.boxShadow='';
  });
});

/* ── CURSOR PARTICLE TRAIL ── */
(function(){
  const cv=document.getElementById('particle-trail');
  if(!cv)return;
  const ctx=cv.getContext('2d');
  let W,H;
  function rsz(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
  rsz();window.addEventListener('resize',rsz);
  const ptcls=[];
  document.addEventListener('mousemove',e=>{
    for(let i=0;i<1;i++){
      ptcls.push({
        x:e.clientX+(Math.random()-.5)*6,
        y:e.clientY+(Math.random()-.5)*6,
        vx:(Math.random()-.5)*1.2,
        vy:(Math.random()-.5)*1.2-.6,
        life:1,
        size:Math.random()*2.5+.8,
        hue:Math.random()>.6?185:210,
      });
    }
    if(ptcls.length>60)ptcls.splice(0,ptcls.length-60);
  });
  (function loop(){
    requestAnimationFrame(loop);
    if(document.hidden)return;
    ctx.clearRect(0,0,W,H);
    for(let i=ptcls.length-1;i>=0;i--){
      const p=ptcls[i];
      p.x+=p.vx;p.y+=p.vy;p.life-=.028;p.vy+=.02;
      if(p.life<=0){ptcls.splice(i,1);continue;}
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);
      ctx.fillStyle=`hsla(${p.hue},80%,65%,${p.life*.45})`;
      ctx.fill();
    }
  })();
})();

/* ── GPU INTERACTIVE FLUID SIMULATION (ping-pong FBO, curl noise, real-time dye advection) ── */
(function(){
  const cv=document.getElementById('fluid-canvas');
  if(!cv)return;
  const gl=cv.getContext('webgl',{alpha:false,preserveDrawingBuffer:false,antialias:false});
  if(!gl)return;
  const SIM=256;

  function mkFBO(){
    const t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SIM,SIM,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    const fb=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return{t,fb};
  }
  let fA=mkFBO(),fB=mkFBO();

  const qb=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,qb);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);

  function compile(vS,fS){
    const v=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(v,vS);gl.compileShader(v);
    const f=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(f,fS);gl.compileShader(f);
    const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
    return p;
  }

  const VS=`attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;

  // SIM SHADER: curl noise velocity + mouse force + advection + dye injection
  const SS=`precision highp float;
uniform sampler2D S;uniform float T,A,HM;uniform vec2 M,PM;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float sn(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return sn(p)*.5+sn(p*2.+vec2(5.3,1.7))*.25+sn(p*4.+vec2(2.1,8.4))*.125+sn(p*8.+vec2(6.2,3.8))*.0625;}
void main(){
  vec2 uv=gl_FragCoord.xy/${SIM}.;
  float e=.004,t=T;
  // Curl of FBM → guaranteed divergence-free velocity
  float f0=fbm(uv*2.6+vec2(t*.08)),fx=fbm((uv+vec2(e,0.))*2.6+vec2(t*.08)),fy=fbm((uv+vec2(0.,e))*2.6+vec2(t*.08));
  vec2 vel=vec2((fy-f0)/e,-(fx-f0)/e)*1.35;
  // Mouse force: gaussian impulse
  if(HM>.5){vec2 dif=uv-M;dif.x*=A;vel+=(M-PM)*26.*exp(-dot(dif,dif)*380.);}
  // Semi-Lagrangian advection (back-trace)
  vec4 c=texture2D(S,clamp(uv-vel*.018,0.,1.))*.984;
  // Multi-color dye injection at mouse position
  if(HM>.5){
    vec2 dif=uv-M;dif.x*=A;
    float sp=exp(-dot(dif,dif)*560.)*1.15;
    // Hue shifts with mouse position: left→cyan, right→violet, top→green
    vec3 ic=mix(mix(vec3(0.,.62,1.),vec3(.62,0.,1.),M.x),vec3(0.,.92,.48),M.y*.5);
    c.rgb+=ic*sp;
  }
  gl_FragColor=vec4(clamp(c.rgb,0.,1.),1.);}`;

  // DISPLAY SHADER: map dye channels to rich screen colors with pseudo-bloom
  const DS=`precision highp float;
uniform sampler2D S;uniform vec2 R;
void main(){
  vec2 uv=gl_FragCoord.xy/R;
  vec4 c=texture2D(S,uv);
  // Each dye channel → different visible hue (additive)
  vec3 col=vec3(.004,.007,.02);
  col+=vec3(.0,.46,.88)*c.r+vec3(.46,.0,.82)*c.g+vec3(.0,.78,.4)*c.b;
  // Intensity-based bloom
  float tot=c.r+c.g+c.b;
  col+=pow(max(tot-.92,0.),1.35)*vec3(.88,1.,1.)*.42;
  // Subtle vignette
  vec2 vg=uv*2.-1.;col*=1.-dot(vg,vg)*.25;
  gl_FragColor=vec4(col,1.);}`;

  const sP=compile(VS,SS),dP=compile(VS,DS);
  const sA=gl.getAttribLocation(sP,'a'),dA=gl.getAttribLocation(dP,'a');
  const sU={S:gl.getUniformLocation(sP,'S'),T:gl.getUniformLocation(sP,'T'),
    A:gl.getUniformLocation(sP,'A'),HM:gl.getUniformLocation(sP,'HM'),
    M:gl.getUniformLocation(sP,'M'),PM:gl.getUniformLocation(sP,'PM')};
  const dU={S:gl.getUniformLocation(dP,'S'),R:gl.getUniformLocation(dP,'R')};

  let mx=.5,my=.5,pmx=.5,pmy=.5,mAct=false,mTmr;
  cv.addEventListener('mousemove',e=>{
    const r=cv.getBoundingClientRect();
    pmx=mx;pmy=my;
    mx=(e.clientX-r.left)/r.width;
    my=1.-(e.clientY-r.top)/r.height;
    mAct=true;clearTimeout(mTmr);mTmr=setTimeout(()=>mAct=false,140);
  });
  // Touch support
  cv.addEventListener('touchmove',e=>{
    e.preventDefault();
    const r=cv.getBoundingClientRect(),t=e.touches[0];
    pmx=mx;pmy=my;
    mx=(t.clientX-r.left)/r.width;my=1.-(t.clientY-r.top)/r.height;
    mAct=true;clearTimeout(mTmr);mTmr=setTimeout(()=>mAct=false,200);
  },{passive:false});

  // Auto-splat system (keeps sim alive and beautiful when no mouse)
  let aT=0,aMx=.5,aMy=.5,aPmx=.5,aPmy=.5,aAct=false;

  function resize(){cv.width=cv.offsetWidth;cv.height=cv.offsetHeight;}
  resize();window.addEventListener('resize',resize);

  const ft=performance.now();
  let _fsVis=false;
  new IntersectionObserver(e=>{_fsVis=e[0].isIntersecting},{threshold:0}).observe(cv);
  (function loop(){
    requestAnimationFrame(loop);
    if(document.hidden||!_fsVis)return;
    const T=(performance.now()-ft)*.001,asp=cv.width/cv.height;

    // Auto-splat every ~3.5s with gentle wandering paths
    aT+=.016;
    if(aT>3.5){
      aT=0;aPmx=aMx;aPmy=aMy;
      aMx=.15+Math.random()*.7;aMy=.15+Math.random()*.7;
      aAct=true;setTimeout(()=>aAct=false,350);
    }

    const uHM=mAct||aAct;
    const [cm,cpm]=mAct?[[mx,my],[pmx,pmy]]:[[aMx,aMy],[aPmx,aPmy]];

    // Pass 1: Simulate into fB
    gl.bindFramebuffer(gl.FRAMEBUFFER,fB.fb);
    gl.viewport(0,0,SIM,SIM);
    gl.useProgram(sP);
    gl.bindBuffer(gl.ARRAY_BUFFER,qb);
    gl.enableVertexAttribArray(sA);gl.vertexAttribPointer(sA,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fA.t);
    gl.uniform1i(sU.S,0);gl.uniform1f(sU.T,T);gl.uniform1f(sU.A,asp);
    gl.uniform1f(sU.HM,uHM?1.:0.);
    gl.uniform2f(sU.M,cm[0],cm[1]);gl.uniform2f(sU.PM,cpm[0],cpm[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    let tmp=fA;fA=fB;fB=tmp; // swap

    // Pass 2: Display to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,cv.width,cv.height);
    gl.useProgram(dP);
    gl.bindBuffer(gl.ARRAY_BUFFER,qb);
    gl.enableVertexAttribArray(dA);gl.vertexAttribPointer(dA,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fA.t);
    gl.uniform1i(dU.S,0);gl.uniform2f(dU.R,cv.width,cv.height);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  })();
})();

/* ── FIRM RULES TICKER (self-contained) ── */
(function(){
  const track=document.getElementById('mi-track');
  const tsEl=document.getElementById('mi-ts');
  if(!track)return;
  const ITEMS=[
    {src:'DAILY LOSS',cls:'mi-src-reuters',hl:'Daily loss limit \u2014 blocks any trade that would exceed today\u2019s max loss'},
    {src:'DRAWDOWN',cls:'mi-src-cnbc',hl:'Trailing drawdown \u2014 warns as the threshold creeps toward your balance'},
    {src:'PAYOUT',cls:'mi-src-mw',hl:'Consistency rule \u2014 flags days too large to keep a payout eligible'},
    {src:'NEWS',cls:'mi-src-ft',hl:'News window \u2014 holds trades during restricted high-impact events'},
    {src:'SIZE',cls:'mi-src-bi',hl:'Contract cap \u2014 reduces oversized orders to the largest safe size'},
    {src:'MIN DAYS',cls:'mi-src-cnbc',hl:'Minimum trading days \u2014 tracks progress before a payout request'},
    {src:'REVENGE',cls:'mi-src-reuters',hl:'Post-loss cool-down \u2014 waits out the spiral that blows accounts'},
    {src:'ROUTING',cls:'mi-src-mw',hl:'Account routing \u2014 sends each trade to the safest eligible account'},
  ];
  const fmt=()=>new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const all=[...ITEMS,...ITEMS];
  track.innerHTML='';
  all.forEach(it=>{
    const d=document.createElement('div');d.className='mi-item';
    d.innerHTML='<span class="mi-item-src '+it.cls+'">'+it.src+'</span><span class="mi-item-ts">'+fmt()+'</span><span class="mi-item-hl">'+it.hl+'</span>';
    track.appendChild(d);
  });
  track.style.animation='mi-scroll 60s linear infinite';
  if(tsEl)tsEl.textContent=fmt();
})();

/* ── ACCOUNT COCKPIT CLOCK (self-contained) ── */
(function(){
  const ts=document.getElementById('px-ts');
  if(!ts)return;
  const t=()=>ts.textContent=new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  t();setInterval(t,1000);
})();

/* ── PROCEDURAL AMBIENT AUDIO (Web Audio API — unprecedented on a landing page) ── */
(function(){
  const btn=document.getElementById('audio-btn');
  if(!btn)return;
  let actx=null,running=false,masterGain=null;

  function buildAudio(){
    actx=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=actx.createGain();
    masterGain.gain.setValueAtTime(0,actx.currentTime);
    masterGain.gain.linearRampToValueAtTime(.14,actx.currentTime+2);
    masterGain.connect(actx.destination);

    // Deep drone layer: A modal tuning (A2=110Hz and its harmonics)
    [55,82.41,110,164.81,220,329.63,440].forEach((freq,i)=>{
      const osc=actx.createOscillator(),g=actx.createGain(),filt=actx.createBiquadFilter();
      osc.type=i<3?'sine':i<5?'triangle':'sine';
      osc.frequency.value=freq;
      g.gain.value=Math.max(.001,.07-i*.009);
      filt.type='lowpass';filt.frequency.value=700+i*80;filt.Q.value=1.2;
      // Slow LFO vibrato (makes it feel alive)
      const lfo=actx.createOscillator(),lg=actx.createGain();
      lfo.type='sine';lfo.frequency.value=.035+i*.018;
      lg.gain.value=freq*.0025;
      lfo.connect(lg);lg.connect(osc.frequency);lfo.start();
      osc.connect(filt);filt.connect(g);g.connect(masterGain);osc.start();
    });

    // Shimmer layer: random harmonic pings (like distant trading signals)
    const PINGS=[440,550,659,880,1100,1320,1760];
    function ping(){
      if(!running)return;
      const osc=actx.createOscillator(),g=actx.createGain(),rev=actx.createConvolver();
      // Simple reverb via delay network
      const dly=actx.createDelay(.5),fbk=actx.createGain();
      dly.delayTime.value=.12+Math.random()*.08;fbk.gain.value=.35;
      dly.connect(fbk);fbk.connect(dly);
      osc.type='sine';
      osc.frequency.value=PINGS[Math.floor(Math.random()*PINGS.length)]*(1+Math.random()*.015-.007);
      const now=actx.currentTime;
      g.gain.setValueAtTime(0,now);
      g.gain.linearRampToValueAtTime(.06,now+.04);
      g.gain.exponentialRampToValueAtTime(.0001,now+3.5);
      osc.connect(g);g.connect(dly);g.connect(masterGain);dly.connect(masterGain);
      osc.start(now);osc.stop(now+4);
      setTimeout(ping,2500+Math.random()*7000);
    }
    setTimeout(ping,800);

    // Sub-bass pulse: slow heartbeat at A1 (55Hz)
    const sub=actx.createOscillator(),subG=actx.createGain(),subF=actx.createBiquadFilter();
    sub.type='sine';sub.frequency.value=27.5;
    subF.type='lowpass';subF.frequency.value=80;subF.Q.value=2;
    subG.gain.value=.05;
    sub.connect(subF);subF.connect(subG);subG.connect(masterGain);sub.start();
  }

  btn.addEventListener('click',()=>{
    if(!running){
      running=true;buildAudio();
      btn.textContent='⏹ AMBIENT ON';btn.classList.add('on');
    } else {
      running=false;
      if(masterGain&&actx){
        masterGain.gain.setValueAtTime(masterGain.gain.value,actx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0,actx.currentTime+1.5);
        setTimeout(()=>{if(actx)actx.close();actx=null;},1600);
      }
      btn.textContent='▷ AMBIENT';btn.classList.remove('on');
    }
  });
})();

/* ── MAGNETIC CTA BUTTONS ── */
document.querySelectorAll('.btn-hero,.btn-ghost2,.pc-cta').forEach(btn=>{
  btn.addEventListener('mousemove',e=>{
    const r=btn.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const dx=(e.clientX-cx)/(r.width/2),dy=(e.clientY-cy)/(r.height/2);
    btn.style.transform=`translate(${dx*6}px,${dy*4}px)`;
  });
  btn.addEventListener('mouseleave',()=>{btn.style.transform='';});
});

/* ── 80K GPU PARTICLE FLOW FIELD ── */
(function(){
  const cv=document.getElementById('field-canvas');
  if(!cv||typeof THREE==='undefined')return;
  function rsz(){cv.width=cv.offsetWidth||innerWidth;cv.height=cv.offsetHeight||innerHeight;}
  rsz();
  const ren=new THREE.WebGLRenderer({canvas:cv,antialias:false,alpha:false,powerPreference:'high-performance'});
  ren.setPixelRatio(1);
  ren.setSize(cv.width,cv.height);
  ren.setClearColor(0x00020A,1);
  const sc=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(55,cv.width/cv.height,.1,500);
  cam.position.set(0,0,14);

  const N=18000;
  const ids=new Float32Array(N);
  for(let i=0;i<N;i++)ids[i]=i/N;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('pId',new THREE.BufferAttribute(ids,1));

  const vSrc=`
attribute float pId;
uniform float T;
varying vec3 vCol;
varying float vA;
float h(float n){return fract(sin(n)*43758.5453);}
float noise(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float n=i.x+i.y*57.+i.z*113.;
  return mix(mix(mix(h(n),h(n+1.),f.x),mix(h(n+57.),h(n+58.),f.x),f.y),
             mix(mix(h(n+113.),h(n+114.),f.x),mix(h(n+170.),h(n+171.),f.x),f.y),f.z);
}
void main(){
  float t=T*0.12;
  float sx=h(pId*3.714),sy=h(pId*5.915+.3),sz=h(pId*7.123+.6);
  vec3 p=(vec3(sx,sy,sz)-.5)*vec3(15.,10.,15.);
  p.x+=(noise(p*.5+vec3(t,0.,0.))-.5)*6.;
  p.y+=(noise(p*.5+vec3(0.,t,0.))-.5)*4.;
  p.z+=(noise(p*.5+vec3(0.,0.,t))-.5)*6.;
  float ang=atan(p.z,p.x)+t*.09+length(p.xz)*.035;
  float r=length(p.xz);
  p.x=cos(ang)*r;p.z=sin(ang)*r;
  p.y+=sin(pId*31.4159+t*.65)*1.2;
  float dist=length(p);
  vA=smoothstep(9.,3.,dist)*.82;
  float cp=noise(p*.15+vec3(t*.025));
  vCol=mix(vec3(.015,.055,.18),vec3(.18,.64,.92),cp);
  if(pId<.0025)vCol=vec3(.75,.93,1.)*2.2;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_PointSize=clamp(3.*(8./-mv.z),.4,5.);
  gl_Position=projectionMatrix*mv;
}`;
  const fSrc=`
varying vec3 vCol;varying float vA;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  float a=(1.-smoothstep(.35,1.,d))*vA;
  if(a<.008)discard;
  gl_FragColor=vec4(vCol,a);
}`;
  const mat=new THREE.ShaderMaterial({
    vertexShader:vSrc,fragmentShader:fSrc,
    uniforms:{T:{value:0}},
    transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,
  });
  sc.add(new THREE.Points(geo,mat));
  window.addEventListener('resize',()=>{
    const W=cv.offsetWidth,H=cv.offsetHeight;
    cam.aspect=W/H;cam.updateProjectionMatrix();ren.setSize(W,H);
  });
  const ft0=performance.now();
  let _gpVis=false;
  new IntersectionObserver(e=>{_gpVis=e[0].isIntersecting},{threshold:0}).observe(cv);
  (function floop(){
    requestAnimationFrame(floop);
    if(document.hidden||!_gpVis)return;
    mat.uniforms.T.value=(performance.now()-ft0)*.001;
    ren.render(sc,cam);
  })();
})();

/* ── DEMO CHECK COUNTER ── */
(function(){
  const sessEl=document.getElementById('lm-sess');
  const excEl=document.getElementById('lm-exc');
  let checks=0;
  setInterval(()=>{
    checks+=Math.floor(Math.random()*3+1);
    if(sessEl)sessEl.textContent=checks.toLocaleString();
    if(excEl)excEl.textContent='0';
  },1400);
})();

/* ── TEXT SCRAMBLE ON SCROLL ── */
(function(){
  const CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$·/\\#%@!';
  function scramble(el){
    const orig=el.textContent;
    let frame=0,total=24;
    const iv=setInterval(()=>{
      el.textContent=orig.split('').map((c,i)=>{
        if(c===' ')return ' ';
        if(frame>=total-i*.35)return c;
        return CHARS[Math.floor(Math.random()*CHARS.length)];
      }).join('');
      frame++;
      if(frame>total+orig.length*.5){clearInterval(iv);el.textContent=orig;}
    },42);
  }
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){scramble(e.target);obs.unobserve(e.target);}
    });
  },{threshold:.6});
  // Only target section kickers outside hero
  document.querySelectorAll('#pillars .sec-kicker,#features .sec-kicker,#intelligence .sec-kicker,#capital-field .sec-kicker,#path .sec-kicker,#pricing .sec-kicker').forEach(el=>obs.observe(el));
  // Also scramble .feat-kicker
  const obs2=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){scramble(e.target);obs2.unobserve(e.target);}});
  },{threshold:.7});
  document.querySelectorAll('.feat-kicker').forEach(el=>obs2.observe(el));
})();

/* ── COUNTERS + SCROLL ── */
function countUp(el,to,suf){
  let st=performance.now();
  (function f(n){const p=Math.min((n-st)/1600,1),e=1-Math.pow(1-p,3);
  el.textContent=Math.round(e*to)+(suf||'');if(p<1)requestAnimationFrame(f)})(st);
}
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(!e.isIntersecting)return;
    e.target.classList.add('vis','in');
    e.target.querySelectorAll('[data-count]').forEach(el=>{
      if(el.dataset.done)return;el.dataset.done=1;
      countUp(el,+el.dataset.count,el.dataset.s||'');
    });
  });
},{threshold:.1,rootMargin:'-30px'});
document.querySelectorAll('.appear,.appear-l,.appear-r,.arch-layer,.stage,.pc').forEach(el=>io.observe(el));
setTimeout(()=>document.querySelectorAll('[data-count]').forEach(el=>{
  if(el.dataset.done)return;el.dataset.done=1;countUp(el,+el.dataset.count,el.dataset.s||'');
}),600);

}catch(e){console.error('landing',e);}
})();
