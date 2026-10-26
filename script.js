"use strict";
const $ = s => document.querySelector(s), R = Math.PI/180, D = 180/Math.PI;
const sin = a => Math.sin(a*R), cos = a => Math.cos(a*R);
const fixA = a => ((a%360)+360)%360, fixH = a => ((a%24)+24)%24;
const pad = n => String(n).padStart(2,"0");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch(e){} };
const CHK  = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const CITIES = [
  ["Prishtinë",42.6629,21.1655,"Europe/Belgrade"], ["Tiranë",41.3275,19.8187,"Europe/Tirane"],
  ["Shkup",41.9981,21.4254,"Europe/Skopje"], ["Prizren",42.2139,20.7397,"Europe/Belgrade"],
  ["Pejë",42.6593,20.2887,"Europe/Belgrade"], ["Gjakovë",42.3803,20.4308,"Europe/Belgrade"],
  ["Mitrovicë",42.8914,20.866,"Europe/Belgrade"], ["Ferizaj",42.3702,21.1483,"Europe/Belgrade"],
  ["Gjilan",42.4635,21.4694,"Europe/Belgrade"], ["Preshevë",42.3086,21.6489,"Europe/Belgrade"],
  ["Bujanoc",42.4606,21.7678,"Europe/Belgrade"], ["Tetovë",42.0069,20.9715,"Europe/Skopje"],
  ["Durrës",41.3246,19.4565,"Europe/Tirane"], ["Shkodër",42.0693,19.5126,"Europe/Tirane"],
  ["Elbasan",41.1125,20.0822,"Europe/Tirane"], ["Vlorë",40.466,19.4914,"Europe/Tirane"],
  ["Ulqin",41.9294,19.2094,"Europe/Podgorica"], ["Zürich",47.3769,8.5417,"Europe/Zurich"],
  ["Mynih",48.1351,11.582,"Europe/Berlin"]
];

const NAMES = [
  ["fajr","Sabahu","الفجر", "🌅"], ["sunrise","Lindja e diellit","الشروق", "☀️"],
  ["dhuhr","Dreka","الظهر", "☀️"], ["asr","Ikindia","العصر", "🌇"],
  ["maghrib","Akshami","المغرب", "🌆"], ["isha","Jacia","العشاء", "🌙"]
];
const FIVE = ["fajr","dhuhr","asr","maghrib","isha"];
const METHODS = {
  mwl:["Liga Botërore Myslimane",18,17,0], isna:["ISNA",15,15,0], egypt:["Egjipti",19.5,17.5,0],
  karachi:["Karaçi",18,18,0], umm:["Umm al-Qura",18.5,0,90], turkey:["Turqi (Diyanet)",18,17,0]
};
const MON = ["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"];
const DAY = ["e diel","e hënë","e martë","e mërkurë","e enjte","e premte","e shtunë"];
const HIJ = ["Muharrem","Safer","Rebiul-evel","Rebiul-ahir","Xhumadel-ula","Xhumadel-ahire","Rexheb","Shaban","Ramazan","Sheval","Dhulkade","Dhulhixhe"];
const KAABA = [21.4225, 39.8262];
const DH = [["Subhanallah","سُبْحَانَ ٱللَّٰهِ"],["Elhamdulilah","ٱلْحَمْدُ لِلَّٰهِ"],["Allahu Ekber","ٱللَّٰهُ أَكْبَرُ"],["Lirë",""]];
const TG = [33,99,100,0];
const SAFETY = { fajr: 1, sunrise: 0, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 };

const devTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch(e) { return "UTC"; } };
let S = { city:0, lat:42.6629, lng:21.1655, tz:"Europe/Belgrade", label:"Prishtinë", method:"mwl", asr:2, pre:0, sound:1, theme:"", adj:0, notify:{fajr:1,dhuhr:1,asr:1,maghrib:1,isha:1}, done:{}, ts:{n:0,t:33,d:0,total:0}, ezanEnabled: false };
let FIRST = true;
try { const raw = localStorage.getItem("nsq"); if (raw) { FIRST = false; Object.assign(S, JSON.parse(raw)); } } catch(e){}
const save = () => { try { localStorage.setItem("nsq", JSON.stringify(S)); } catch(e){} };
const okTz = z => { try { new Intl.DateTimeFormat("en", {timeZone: z}); return true; } catch(e) { return false; } };
if (!okTz(S.tz)) S.tz = devTz();

/* ========================================================
   RREGULLIMI I SAKTËSISË: Aladhan API me detyrim Hanefi
   ======================================================== */
async function fetchAccurateTimes(lat, lng, tz, method) {
  const methodMap = { mwl: 3, isna: 2, egypt: 5, karachi: 1, umm: 4, turkey: 13 };
  const m = methodMap[method] || 3;
  const school = 2; // DETYROJMË HANEFI
  const date = new Date();
  const d = `${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/timings/${d}?latitude=${lat}&longitude=${lng}&method=${m}&school=${school}&timezonestring=${tz}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 200) {
      return {
        fajr: data.data.timings.Fajr, sunrise: data.data.timings.Sunrise,
        dhuhr: data.data.timings.Dhuhr, asr: data.data.timings.Asr,
        maghrib: data.data.timings.Maghrib, isha: data.data.timings.Isha
      };
    }
  } catch(e) { console.log("Gabim API, përdorim llogaritje lokale."); }
  return null;
}

function parseApiTime(timeStr, baseDate) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

let apiTimes = null;

async function updateTimesFromAPI() {
  if (!S.lat || !S.lng || !S.tz) return;
  const times = await fetchAccurateTimes(S.lat, S.lng, S.tz, S.method);
  if (times) {
    const today = new Date();
    apiTimes = {
      fajr: parseApiTime(times.fajr, today), sunrise: parseApiTime(times.sunrise, today),
      dhuhr: parseApiTime(times.dhuhr, today), asr: parseApiTime(times.asr, today),
      maghrib: parseApiTime(times.maghrib, today), isha: parseApiTime(times.isha, today)
    };
    render();
  }
}

/* ========================================================
   LLOGARITJET ASTRONOMIKE LOKALE (Fallback)
   ======================================================== */
function jul(y,m,d,h) { if(m<=2){y--;m+=12;} const a=Math.floor(y/100),b=2-a+Math.floor(a/4); return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+(h||0)/24+b-1524.5; }
function sunPos(j) { const d=j-2451545.0, g=fixA(357.529+.98560028*d), q=fixA(280.459+.98564736*d), L=fixA(q+1.915*sin(g)+.02*sin(2*g)), e=23.439-3.6e-7*d, ra=fixH(Math.atan2(cos(e)*sin(L),cos(L))*D/15); return {decl:Math.asin(sin(e)*sin(L))*D, eqt:q/15-ra}; }

const FC = {};
function fmtr(key, opt) { const k=key+S.tz; return FC[k]||(FC[k]=new Intl.DateTimeFormat("en-US",Object.assign({timeZone:S.tz},opt))); }
function parts(f, dt) { const p=f.formatToParts(dt); return t=>+p.find(x=>x.type==t).value; }
function ymdOf(dt) { const g=parts(fmtr("d",{year:"numeric",month:"numeric",day:"numeric"}),dt); return [g("year"),g("month"),g("day")]; }
function tzOff(y,m,d) { const probe=Date.UTC(y,m-1,d,12); const g=parts(fmtr("f",{hourCycle:"h23",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric"}),probe); return (Date.UTC(g("year"),g("month")-1,g("day"),g("hour"),g("minute"),g("second"))-probe)/36e5; }
const fmt = d => isNaN(d)?"–":fmtr("t",{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(d);
const sh = (y,m,d,n) => { const x=new Date(Date.UTC(y,m-1,d+n)); return [x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate()]; };
const wday = (y,m,d) => new Date(Date.UTC(y,m-1,d)).getUTCDay();

function times(y,m,d) {
  const tz=tzOff(y,m,d), jd=jul(y,m,d,12)-S.lng/360, M=METHODS[S.method]||METHODS.mwl;
  const core = lat => {
    const sp=t=>sunPos(jd+t/24), mid=t=>fixH(12-sp(t).eqt);
    const ang=(a,t,ccw)=>{const s=sp(t),cosH=(-sin(a)-sin(s.decl)*sin(lat))/(cos(s.decl)*cos(lat)); if(cosH<-1||cosH>1)return NaN; const v=Math.acos(cosH)*D/15; return mid(t)+(ccw?-v:v);};
    const asr=(f,t)=>{const s=sp(t),alt=-Math.atan(1/(2+Math.tan(Math.abs(lat-s.decl)*R)))*D; return ang(alt,t);};
    let t={fajr:5,sunrise:6,dhuhr:12,asr:13,maghrib:18,isha:18};
    for(let i=0;i<3;i++){t={fajr:ang(M[1],t.fajr,1),sunrise:ang(.833,t.sunrise,1),dhuhr:mid(t.dhuhr),asr:asr(2,t.asr),maghrib:ang(.833,t.maghrib),isha:M[3]?t.maghrib+M[3]/60:ang(M[2],t.isha)};}
    return t;
  };
  let t=core(S.lat); if(Object.values(t).some(isNaN)){const t2=core(48.6); for(const k in t) if(isNaN(t[k])) t[k]=t2[k];}
  const off=tz-S.lng/15, o={};
  for(const k in t){const extra=(SAFETY[k]||0)/60+(S.adj||0)/60, h=fixH(t[k]+off+extra); o[k]=new Date(Date.UTC(y,m-1,d)+(h-tz)*36e5);}
  return o;
}

const nm = k => NAMES.find(n => n[0] == k)[1];
function hjParts(y,m,d) { try { const g=parts(new Intl.DateTimeFormat("en-u-ca-islamic-umalqura",{timeZone:"UTC",day:"numeric",month:"numeric",year:"numeric"}),Date.UTC(y,m-1,d,12)); return [g("day"),g("month"),g("year")]; } catch(e){return null;} }

let Y,Mo,Dd,T0,TY,TT,EV,DK,fired={},mo=null;

function render() {
  [Y,Mo,Dd]=ymdOf(new Date()); DK=Y+"-"+Mo+"-"+Dd;
  
  if (apiTimes) {
    T0 = apiTimes;
    TY = times(...sh(Y,Mo,Dd,-1)); 
    TT = times(...sh(Y,Mo,Dd,1));
  } else {
    T0 = times(Y,Mo,Dd); 
    TY = times(...sh(Y,Mo,Dd,-1)); 
    TT = times(...sh(Y,Mo,Dd,1));
  }

  EV=[{k:"isha",t:TY.isha},...NAMES.map(x=>({k:x[0],t:T0[x[0]]})),{k:"fajr",t:TT.fajr}];
  if(!mo)mo={y:Y,m:Mo};
  
  $("#locBtn").textContent="📍 "+S.label;
  $("#dt").textContent="E "+DAY[wday(Y,Mo,Dd)]+", "+Dd+" "+MON[Mo-1]+" "+Y;
  const hp=hjParts(Y,Mo,Dd);
  $("#hj").textContent=hp?hp[0]+" "+HIJ[hp[1]-1]+" "+hp[2]+" H":"";
  
  const rz=$("#rmz");
  if(hp&&hp[1]==9){rz.hidden=false; rz.innerHTML=`<span>Imsaku <b>${fmt(T0.fajr)}</b></span><span>Iftari <b>${fmt(T0.maghrib)}</b></span>`;}else rz.hidden=true;
  
  const dn=S.done[DK]||{};
  $("#list").innerHTML = NAMES.map(([k,a,ar,icon])=>`
    <div class="row" data-k="${k}">
      ${k=="sunrise"?'<span class="chk sp"></span>':`<button class="chk ${dn[k]?"on":""}" data-c="${k}">${CHK}</button>`}
      <div class="n"><b>${icon} ${a}</b><i>${ar}</i></div>
      <div class="t">${fmt(T0[k])}</div>
    </div>
  `).join("");
  
  prog(); cal(); qibla(); tick();
}

function prog() {
  const cnt=k=>FIVE.filter(p=>(S.done[k]||{})[p]).length, c=cnt(DK);
  let streak=0; for(let i=c==5?0:1;i<400;i++){if(cnt(sh(Y,Mo,Dd,-i).join("-"))==5)streak++;else break;}
  let wk=""; for(let i=6;i>=0;i--){const[y,m,d]=sh(Y,Mo,Dd,-i); wk+=`<div class="wd ${i?"":"t"}">${DAY[wday(y,m,d)].slice(2,5)}<i style="--p:${cnt(y+"-"+m+"-"+d)*20}"></i></div>`;}
  $("#prog").innerHTML=`<div class="ph"><b>Namazet e sotme</b><span>${c} / 5</span></div><div class="bar"><i style="width:${c*20}%"></i></div><div class="week">${wk}</div><p class="mut">Seria: ${streak} ditë me të gjitha namazet</p>`;
}

function tick() {
  const n=new Date(); if(ymdOf(n).join("-")!=DK)return render();
  let i=0; while(i<EV.length-2&&EV[i+1].t<=n)i++;
  const p=EV[i],q=EV[i+1],s=Math.floor(Math.max(0,q.t-n)/1000);
  $("#cd").textContent=pad(Math.floor(s/3600))+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60);
  $("#nxN").textContent=nm(q.k); $("#nxT").textContent="në orën "+fmt(q.t);
  $("#ring").style.strokeDashoffset=640*(1-Math.min(1,Math.max(0,(n-p.t)/(q.t-p.t))));
  
  document.querySelectorAll(".row").forEach(r=>{const k=r.dataset.k,c=i>0&&k==p.k; r.classList.toggle("cur",c); r.classList.toggle("nxt",i<6&&k==q.k); r.classList.toggle("past",!c&&T0[k]<=n);});
  
  for(const k in S.notify){if(!S.notify[k])continue; const tr=T0[k]-S.pre*60000,id=DK+k+S.pre; if(n>=tr&&n-tr<120000&&!fired[id]){fired[id]=1; alertUser(k);}}
}

/* ---------- EZANI DHE NJOFTIMET ---------- */
let ezanAudio = new Audio("ezani.mp3");
ezanAudio.preload = "auto";

function stopEzan() {
  if (!ezanAudio.paused) {
    ezanAudio.pause();
    ezanAudio.currentTime = 0;
    toast("Ezani u ndal.");
  }
  const btnHero = $("#stopEzanHero");
  if (btnHero) btnHero.style.display = "none";
}

function alertUser(k){
  const body = S.pre>0 ? nm(k)+" fillon pas "+S.pre+" min ("+fmt(T0[k])+")" : "Hyri koha: "+nm(k)+" ("+fmt(T0[k])+")";
  toast(body); 
  vib([200,100,200]); 
  notify("NamaziShqip",body,"nsq-"+k);
  
  if (S.ezanEnabled) {
    const btnHero = $("#stopEzanHero");
    if (btnHero) btnHero.style.display = "none";
    ezanAudio.play().then(() => {
      if (btnHero) btnHero.style.display = "inline-block";
    }).catch(e => console.log("Ezan nuk u luajt: ", e));
  } else {
    beep();
  }
}

ezanAudio.onended = () => {
  const btnHero = $("#stopEzanHero");
  if (btnHero) btnHero.style.display = "none";
};

let AC;
function beep(){if(!S.sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();[0,.45,.9].forEach((o,i)=>{const x=AC.createOscillator(),g=AC.createGain();x.frequency.value=[523,659,784][i];g.gain.setValueAtTime(.0001,AC.currentTime+o);g.gain.exponentialRampToValueAtTime(.25,AC.currentTime+o+.05);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+o+.9);x.connect(g).connect(AC.destination);x.start(AC.currentTime+o);x.stop(AC.currentTime+o+1);});}catch(e){}}
let ttTimer;
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(ttTimer);ttTimer=setTimeout(()=>t.classList.remove("on"),6000);}
function askPerm(){if(!("Notification"in window)){toast("Njoftimet nuk mbështeten.");return Promise.resolve(false);} if(Notification.permission=="granted")return Promise.resolve(true); return Notification.requestPermission().then(p=>p=="granted").catch(()=>false);}

function cal() {
  $("#mt").textContent=MON[mo.m-1]+" "+mo.y;
  const days=new Date(Date.UTC(mo.y,mo.m,0)).getUTCDate();
  let h="<tr><th>Dita</th>"+NAMES.map(n=>"<th>"+n[1]+"</th>").join("")+"</tr>";
  for(let d=1;d<=days;d++){const t=times(mo.y,mo.m,d); h+=`<tr class="${mo.y+"-"+mo.m+"-"+d==DK?"today":""}"><td>${d} ${DAY[wday(mo.y,mo.m,d)].slice(2,5)}</td>`+NAMES.map(n=>"<td>"+fmt(t[n[0]])+"</td>").join("")+"</tr>";}
  $("#tb").innerHTML=h;
}

/* ========================================================
   RREGULLIMI I BOSULLËS (KIBLA)
   ======================================================== */
let head=null,QB=0;

function qibla() {
  const f1=S.lat*R, f2=KAABA[0]*R, dl=(KAABA[1]-S.lng)*R;
  QB = fixA(Math.atan2(Math.sin(dl), Math.cos(f1)*Math.tan(f2) - Math.sin(f1)*Math.cos(dl))*D);
  const a=Math.sin((f2-f1)/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2, km=Math.round(12742*Math.asin(Math.sqrt(a)));
  $("#qd").textContent = Math.round(QB) + "°";
  $("#qi").textContent = S.label + " është " + km.toLocaleString("sq") + " km nga Qaba. Kibla: " + Math.round(QB) + "°.";
  $("#qg").setAttribute("transform", "rotate(" + QB + " 100 100)"); 
  drawQ();
}

function drawQ() {
  $("#dial").style.transform = "rotate(" + (head == null ? 0 : -head) + "deg)";
  let diff = Math.abs(((QB - head + 540) % 360) - 180);
  const ok = head != null && diff < 5;
  $("#cmp").classList.toggle("ok", ok);
  $("#qs").textContent = head == null ? "Busulla nuk është aktive." : (ok ? "Je në drejtim të Kibles." : "Kthe telefonin derisa shigjeta të jetë lart.");
}

function onOri(e) {
  let h = null;
  if (e.webkitCompassHeading != null) h = e.webkitCompassHeading;
  else if (e.alpha != null) h = e.absolute ? e.alpha : (360 - e.alpha);
  if (h == null) return;
  head = h;
  drawQ();
}

function startCompass() {
  const go = () => {
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              window.addEventListener("deviceorientationabsolute", onOri, true);
              window.addEventListener("deviceorientation", onOri, true);
              toast("Busulla u aktivizua.");
            } else {
              toast("Leja për busullën u refuzua.");
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener("deviceorientationabsolute", onOri, true);
        window.addEventListener("deviceorientation", onOri, true);
        toast("Busulla u aktivizua.");
      }
    } else {
      toast("Pajisja nuk ka busull.");
    }
  };
  go();
}

(()=>{
  let s="";
  for(let a=0; a<360; a+=10){
    s += `<line x1="100" y1="${a%90?16:12}" x2="100" y2="${a%30?16:20}" transform="rotate(${a} 100 100)"/>`;
  }
  $("#ticks").innerHTML=s;
})();

/* ========================================================
   TASBIHU
   ======================================================== */
function tsb(){const t=S.ts; $("#dh").innerHTML=DH.map((x,i)=>`<button class="chip ${t.d==i?"on":""}" data-d="${i}">${x[0]}</button>`).join(""); $("#tg").innerHTML=TG.map(g=>`<button class="chip ${t.t==g?"on":""}" data-g="${g}">${g||"∞"}</button>`).join(""); $("#ar").textContent=DH[t.d][1]; $("#tc").textContent=t.n; $("#tt").textContent=t.t?"nga "+t.t:"pa kufi"; $("#tr").style.strokeDashoffset=t.t?603*(1-Math.min(1,t.n/t.t)):603; $("#tot").textContent="Gjithsej: "+t.total.toLocaleString("sq")+" herë";}
function tap(){const t=S.ts;if(t.t&&t.n>=t.t)t.n=0;t.n++;t.total++;save();tsb();if(t.t&&t.n==t.t){vib([80,50,80]);toast("U plotësua: "+t.t+" herë");}else vib(12);}

let RES=[], CC="";
const RESC=(()=>{const dn=new Intl.DisplayNames(["sq"],{type:"region"}),skip=["ZZ","EU","UN","EZ","QO","XA","XB"],a=[]; for(let i=65;i<91;i++)for(let j=65;j<91;j++){const c=String.fromCharCode(i,j);if(skip.includes(c))continue;try{const n=dn.of(c);if(n&&n!=c)a.push([c,n])}catch(e){}} if(!a.some(x=>x[0]=="XK"))a.push(["XK","Kosovë"]); return a.sort((x,y)=>x[1].localeCompare(y[1],"sq"));})();

function theme() { if(S.theme) document.documentElement.setAttribute("data-theme",S.theme); else document.documentElement.removeAttribute("data-theme"); }

function fillSettings() {
  $("#sc").innerHTML=(S.city=="custom"?`<option value="custom">${esc(S.label)}</option>`:"")+CITIES.map((c,i)=>`<option value="${i}">${c[0]}</option>`).join("");
  $("#sco").innerHTML='<option value="">Zgjidh shtetin</option>'+RESC.map(c=>`<option value="${c[0]}">${esc(c[1])}</option>`).join("");
  $("#sm").innerHTML=Object.entries(METHODS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join("");
  $("#sc").value=S.city; $("#sco").value=CC; $("#sm").value=S.method; $("#sa").value=S.asr; $("#sp").value=S.pre; $("#ss").value=S.sound; $("#st").value=S.theme;
  if($("#sadj"))$("#sadj").value=S.adj;
  
  const btnEzan = $("#ezanBtn");
  if(btnEzan) {
    if(S.ezanEnabled) {
      btnEzan.textContent = "🔴 Ndal Ezanin";
      btnEzan.style.background = "#ef4444";
      btnEzan.style.color = "#fff";
    } else {
      btnEzan.textContent = "🎵 Aktivizo Ezanin";
      btnEzan.style.background = "#eab308";
      btnEzan.style.color = "#000";
    }
  }

  const notifSwitch = $("#notifSwitch");
  if(notifSwitch) {
    const anyOn = Object.values(S.notify).some(v => v === 1);
    notifSwitch.checked = anyOn;
  }
}

document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("nav button,.view").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); $("#v"+b.dataset.v).classList.add("on"); scrollTo(0,0); vib(8);
  history.replaceState(null,"","#v"+b.dataset.v);
});
$("#locBtn").onclick = () => document.querySelector('nav button[data-v="4"]').click();
$("#list").onclick = e => {
  const c=e.target.closest("[data-c]");
  if(c){const k=c.dataset.c,d=S.done[DK]||(S.done[DK]={}); if(d[k])delete d[k]; else d[k]=1; save(); c.classList.toggle("on",!!d[k]); prog(); vib(15); return;}
};
$("#pm").onclick = () => { mo = mo.m==1?{y:mo.y-1,m:12}:{y:mo.y,m:mo.m-1}; cal(); };
$("#nm").onclick = () => { mo = mo.m==12?{y:mo.y+1,m:1}:{y:mo.y,m:mo.m+1}; cal(); };
$("#cpBtn").onclick = startCompass;
$("#tap").onclick = tap;
$("#trs").onclick = () => { S.ts.n=0; save(); tsb(); };
$("#dh").onclick = e => { const b=e.target.closest("[data-d]"); if(b){S.ts.d=+b.dataset.d; S.ts.n=0; save(); tsb();} };
$("#tg").onclick = e => { const b=e.target.closest("[data-g]"); if(b){S.ts.t=+b.dataset.g; S.ts.n=0; save(); tsb();} };
$("#sc").onchange = e => { if(e.target.value=="custom")return; const c=CITIES[+e.target.value]; S.city=+e.target.value; S.lat=c[1]; S.lng=c[2]; S.tz=c[3]; S.label=c[0]; fired={}; mo=null; save(); fillSettings(); updateTimesFromAPI(); render(); };
$("#sco").onchange = async e => { CC=e.target.value; $("#res").innerHTML=""; if(!CC)return; let cap=(RESC.find(x=>x[0]==CC)||[0,CC])[1]; try{const r=await fetch("https://restcountries.com/v3.1/alpha/"+CC+"?fields=capital"),j=await r.json(),o=Array.isArray(j)?j[0]:j; if(o&&o.capital&&o.capital[0])cap=o.capital[0];}catch(x){} try{ const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=10&format=json&language=sq&name="+encodeURIComponent(cap)+"&countryCode="+CC); RES=(await r.json()).results||[]; $("#res").innerHTML=RES.map((c,i)=>`<button class="rs" data-i="${i}">${esc(c.name)}<span>${esc([c.admin1,c.country].filter(Boolean).join(", "))}</span></button>`).join(""); }catch(x){toast("Kërkimi kërkon internet.");} };
$("#q").oninput = () => { clearTimeout(qt); const v=$("#q").value.trim(); if(v.length<2){$("#res").innerHTML="";return;} qt=setTimeout(async()=>{ try{ const r=await fetch("https://geocoding-api.open-meteo.com/v1/search?count=10&format=json&language=sq&name="+encodeURIComponent(v)+(CC?"&countryCode="+CC:"")); RES=(await r.json()).results||[]; $("#res").innerHTML=RES.map((c,i)=>`<button class="rs" data-i="${i}">${esc(c.name)}<span>${esc([c.admin1,c.country].filter(Boolean).join(", "))}</span></button>`).join(""); }catch(x){toast("Kërkimi kërkon internet.");} },350); };
let qt;
$("#res").onclick = e => { const b=e.target.closest("[data-i]"); if(b&&RES[+b.dataset.i]){ const c=RES[+b.dataset.i]; S.city="custom"; S.lat=c.latitude; S.lng=c.longitude; S.tz=c.timezone; S.label=c.name; fired={}; mo=null; save(); fillSettings(); updateTimesFromAPI(); render(); $("#res").innerHTML=""; toast("Vendndodhja: "+c.name); } };
$("#sm").onchange = e => { S.method=e.target.value; save(); updateTimesFromAPI(); render(); };
$("#sa").onchange = e => { S.asr=+e.target.value; save(); updateTimesFromAPI(); render(); };
$("#sp").onchange = e => { S.pre=+e.target.value; save(); };
$("#ss").onchange = e => { S.sound=+e.target.value; save(); beep(); };
$("#st").onchange = e => { S.theme=e.target.value; save(); theme(); };
if($("#sadj"))$("#sadj").onchange = e => { S.adj=+e.target.value; save(); render(); };

const notifSwitch = $("#notifSwitch");
if(notifSwitch) {
  notifSwitch.onchange = async (e) => {
    if(e.target.checked) {
      const ok = await askPerm();
      if(ok) {
        for (const k of FIVE) S.notify[k] = 1;
        toast("Njoftimet u aktivizuan!");
      } else {
        e.target.checked = false;
        toast("Duhet të lejoni njoftimet në shfletues.");
      }
    } else {
      for (const k of FIVE) S.notify[k] = 0;
      toast("Njoftimet u çaktivizuan.");
    }
    save();
  };
}

$("#test").onclick = () => { askPerm().then(()=>{const b="Ky është një njoftim prove."; toast(b); beep(); notify("NamaziShqip",b,"nsq-test");}); };

/* ========================================================
   FUNKSIONET E LOKACIONIT (Rregulluar për Safari/iOS)
   ======================================================== */
async function updateLocation() {
  if(!navigator.geolocation) return toast("GPS nuk mbështetet në këtë pajisje.");
  
  navigator.geolocation.getCurrentPosition(
    async p => {
      S.city = "custom";
      S.lat = p.coords.latitude;
      S.lng = p.coords.longitude;
      S.tz = devTz();
      S.label = "Vendndodhja ime";
      fired = {}; mo = null;
      
      // Përditësojmë pamjen me të dhënat fillestare
      save(); fillSettings(); updateTimesFromAPI(); render();
      
      const row = $("#locPermissionRow");
      if (row) row.style.display = "none";

      // KËRKOJMË REVERSE GEOCODING PËR TË MARRË QYTETIN DHE SHTETIN
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${S.lat}&longitude=${S.lng}&localityLanguage=sq`);
        const data = await res.json();
        
        // Nëse API kthen një qytet, e përdorim atë
        const cityName = data.city || data.locality || data.principalSubdivision;
        const countryCode = data.countryCode; // p.sh. XK, RS, AL
        
        if (cityName) {
          S.label = cityName;
          $("#q").value = cityName; // Shfaq qytetin te "Kërko qytetin"
        }
        
        if (countryCode) {
          CC = countryCode;
          $("#sco").value = CC; // Shfaq shtetin te "Shteti"
        }
        
        save(); fillSettings(); updateTimesFromAPI(); render();
        toast("Vendndodhja u përditësua: " + S.label);
      } catch (e) {
        console.log("Gabim gjatë marrjes së qytetit:", e);
        toast("Vendndodhja u përditësua.");
      }
    },
    err => {
      toast("Nuk u mor vendndodhja. Lejo lokacionin te cilësimet e telefonit.");
      console.log(err);
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

$("#geo").onclick = updateLocation;

if ($("#requestLocPerm")) {
  $("#requestLocPerm").onclick = () => {
    updateLocation();
  };
}

// Kontrollo statusin e lejes për lokacion (pa e detyruar)
if (navigator.permissions) {
  navigator.permissions.query({ name: 'geolocation' }).then(result => {
    const row = $("#locPermissionRow");
    if (result.state === 'granted') {
      if (row) row.style.display = "none";
      updateLocation();
    } else {
      if (row) row.style.display = "flex";
    }
  }).catch(() => {
    if ($("#locPermissionRow")) $("#locPermissionRow").style.display = "flex";
  });
} else {
  if ($("#locPermissionRow")) $("#locPermissionRow").style.display = "flex";
}

$("#ezanBtn").onclick = () => {
  if (!S.ezanEnabled) {
    ezanAudio.volume = 1;
    ezanAudio.play().then(() => {
      ezanAudio.pause();
      ezanAudio.currentTime = 0;
      S.ezanEnabled = true;
      save();
      fillSettings();
      toast("Ezani u aktivizua! Do të luajë kur të hyjë koha e namazit.");
    }).catch((e) => {
      toast("Gabim: Skedari ezani.mp3 nuk u gjet ose shfletuesi e bllokoi.");
      console.log(e);
    });
  } else {
    stopEzan();
    S.ezanEnabled = false;
    save();
    fillSettings();
    toast("Ezani u çaktivizua.");
  }
};

if ($("#stopEzanHero")) {
  $("#stopEzanHero").onclick = stopEzan;
}

let DP;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); DP=e; if($("#inst"))$("#inst").hidden=false; });
addEventListener("appinstalled", () => { if($("#inst"))$("#inst").hidden=true; toast("Aplikacioni u instalua"); });
if($("#inst"))$("#inst").onclick = () => { if(!DP)return; DP.prompt(); DP.userChoice.finally(()=>{ DP=null; $("#inst").hidden=true; }); };
if("serviceWorker" in navigator && /^https?:\//.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(()=>{});

// Ekzekutimi fillestar
theme(); 
fillSettings(); 
tsb(); 
render(); 
setInterval(tick, 1000);

// Nëse ekziston lokacioni, përditëso kohët me API
if (S.lat && S.lng) {
  updateTimesFromAPI();
}