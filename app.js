(function(){
"use strict";

/* ─── constants ─────────────────────────────────────────── */
var CCOLORS=["#131B63","#15CAE8","#4338CA","#0891B2","#7C3AED","#2563EB"];
/* NPrep content taxonomy: platform → format → angle. */
var FORMATS=[
  {id:"Reel",label:"Reel",group:"Instagram",platforms:["Instagram"],cta:true,
   angles:["Motivational","Strategy","Academic","Testimonial","Updates"]},
  {id:"Carousel",label:"Carousel",group:"Instagram",platforms:["Instagram"],
   angles:["Academic","Testimonial","Topper — strategy"]},
  {id:"Story",label:"Story",group:"Instagram",platforms:["Instagram"],
   angles:["Updates","Carousel based story","Promotional"]},
  {id:"Long form",label:"Long form",group:"YouTube",platforms:["YouTube"],
   angles:["Vacancy","High yield","GOLD lecture — Edition 6.5","Strategy video","Testimonial video","Opinion video"]},
  {id:"Live",label:"Live",group:"YouTube",platforms:["YouTube"],
   angles:["Academic discussion","Strategy discussion","Vacancy live"]},
  {id:"Short",label:"Short",group:"YouTube",platforms:["YouTube"],cta:true,
   angles:["Motivational (nursing story)","Strategy / salary","Academic","Testimonial — user","Testimonial — topper","Promotional","Updates"]},
  {id:"Post",label:"Post",group:"Other",platforms:["Facebook"],angles:[]},
  {id:"Push notification",label:"Push notification",group:"Other",platforms:["Push"],angles:[]},
  {id:"WhatsApp broadcast",label:"WhatsApp broadcast",group:"Other",platforms:["WhatsApp"],angles:[]},
  {id:"Telegram post",label:"Telegram post",group:"Other",platforms:["Telegram"],angles:[]},
  {id:"Email",label:"Email",group:"Other",platforms:[],angles:[]},
  {id:"Thumbnail",label:"Thumbnail",group:"Other",platforms:[],angles:[]},
  {id:"Other",label:"Other",group:"Other",platforms:[],angles:[]}
];
var CTAS=["DM based","Share to friend","Comment right answers","Comment keyword","Subscribe","Link in description","Other"];
/* what a subtask IS — the thing being produced or the step being done */
var SUBKINDS=["Creative","Script","Copy","Shoot","Edit","Design","Thumbnail","Keywords","Caption",
  "Post","Story","Clip","Carousel","Slide update","Community message","Reminder",
  "Notification","Training","Test","Upload","Review","Other"];
/* A placement is where a creative actually lands. Each one is its own design,
   so each one becomes its own item with its own owner and date. */
var PLACEMENTS=[
  ["Instagram","Story"],["Instagram","Post"],["Instagram","Carousel"],["Instagram","Reel"],
  ["YouTube","Thumbnail"],["YouTube","Clip"],["YouTube","Community message"],
  ["Facebook","Post"],["WhatsApp","Post"],["Telegram","Post"],
  ["Push","Notification"],["App","Notification"]
];
var MAXDEPTH=3; /* task → group → item → sub-item. Deeper than this is a spreadsheet, not a plan. */
/* The usual breakdown per format — seeded on demand, never automatically.
   An entry is a title string, {t,k} for a titled item with a kind,
   or {t,c:[...]} for a group with children. */
var STEPS={
  "Live":[
    {t:"Pre class",c:[
      {t:"Thumbnail",k:"Thumbnail",p:"YouTube"},
      {t:"Story",k:"Story",p:"Instagram"},
      {t:"Reminder",k:"Post",p:"WhatsApp"},
      {t:"Reminder",k:"Post",p:"Telegram"},
      {t:"Reminder",k:"Story",p:"Instagram"},
      {t:"Notifications",k:"Notification",p:"Push"}
    ]},
    {t:"Content verification",c:[
      {t:"Subject-wise PYQ",k:"Review"},
      {t:"Slide update — PYQ year tagging",k:"Slide update"},
      {t:"Slides about Gold plan",k:"Slide update"},
      {t:"L band update",k:"Slide update"},
      {t:"Ticker update",k:"Slide update"},
      {t:"Teacher training about RRB pass",k:"Training"},
      {t:"Assignments and free tests",k:"Test"}
    ]},
    {t:"Post class",c:[
      {t:"Clip",k:"Clip",p:"YouTube"},
      {t:"Carousel",k:"Carousel",p:"Instagram"}
    ]}
  ],
  "Long form":[
    {t:"Pre production",c:["Script","Keywords"]},
    {t:"Production",c:["Shoot","Edit",{t:"Thumbnail",k:"Thumbnail",p:"YouTube"}]},
    {t:"Publish",c:["Caption",{t:"Upload",k:"Upload",p:"YouTube"},
      {t:"Community post",k:"Community message",p:"YouTube"}]}
  ],
  "Short":["Script","Edit","Thumbnail","Caption","Upload"],
  "Reel":["Script","Edit","Caption","Upload"],
  "Carousel":["Script","Design","Caption","Upload"],
  "Story":["Design","Upload"],
  "Post":["Design","Caption","Upload"],
  "Push notification":["Copy","Review","Upload"],
  "WhatsApp broadcast":["Copy","Review","Upload"],
  "Telegram post":["Copy","Review","Upload"],
  "Email":["Copy","Review","Upload"],
  "Thumbnail":["Design","Review"]
};
function formatById(id){for(var i=0;i<FORMATS.length;i++)if(FORMATS[i].id===id)return FORMATS[i];return null}
function formatSelect(cur,blank,cls){
  var s=el("select");if(cls)s.className=cls;
  var o0=el("option",null,blank);o0.value="";s.appendChild(o0);
  [["Instagram","Instagram"],["YouTube","YouTube"],["Other channels","Other"]].forEach(function(g){
    var og=document.createElement("optgroup");og.label=g[0];
    FORMATS.filter(function(x){return x.group===g[1]}).forEach(function(x){
      var op=el("option",null,x.label);op.value=x.id;if(x.id===cur)op.selected=true;og.appendChild(op);
    });
    s.appendChild(og);
  });
  if(cur&&!formatById(cur)){
    var og2=document.createElement("optgroup");og2.label="Previously set";
    var lo=el("option",null,cur);lo.value=cur;lo.selected=true;og2.appendChild(lo);
    s.appendChild(og2);
  }
  return s;
}
var PLATFORMS=[["YouTube","YT"],["Instagram","IG"],["Facebook","FB"],["WhatsApp","WA"],["Telegram","TG"],["Push","PN"],["App","APP"]];
var STATUSES=["Not started","In progress","Ready","Published"];
var CSTATUS=["Planning","Live","Done"];
var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
var DOW=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ─── state ─────────────────────────────────────────────── */
var S={campaigns:[],activities:[],view:"calendar",calView:"month",anchor:"",y:0,m:0,
  filters:{campaign:"",platform:"",format:"",owner:"",status:""},
  loading:true,stale:false,err:null,canWrite:null,open:null,expanded:{},focusAdd:null,lastAdd:{},
  placeFor:null,showFilters:false,me:null,team:[],
  profiles:{},dayMax:3};
var db=null,U=null,phone=false;
var $=function(id){return document.getElementById(id)};

/* ─── date helpers (string dates, no timezone math) ─────── */
function pad(n){return n<10?"0"+n:""+n}
function iso(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
var TODAY=iso(new Date());
function parseISO(s){var p=String(s||"").split("-");return new Date(+p[0],(+p[1]||1)-1,+p[2]||1)}
function fmtShort(s){if(!s)return"";var d=parseISO(s);return d.getDate()+" "+MONTHS[d.getMonth()].slice(0,3)}
function fmtLong(s){if(!s)return"";var d=parseISO(s);return d.getDate()+" "+MONTHS[d.getMonth()].slice(0,3)+" "+d.getFullYear()}
function fmtTime(t){if(!t)return"";var p=t.split(":"),h=+p[0],ap=h>=12?"pm":"am",hh=h%12||12;return hh+(p[1]!=="00"?":"+p[1]:"")+ap}
function addDays(s,n){var d=parseISO(s);d.setDate(d.getDate()+n);return iso(d)}
function weekBounds(){var d=new Date(),off=(d.getDay()+6)%7;d.setDate(d.getDate()-off);var a=iso(d);d.setDate(d.getDate()+6);return[a,iso(d)]}
function daysBetween(a,b){return Math.round((parseISO(b)-parseISO(a))/86400000)}
function weekStart(s){var d=parseISO(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)}
function dowIdx(s){return (parseISO(s).getDay()+6)%7}
function monthLast(y,m){return y+"-"+pad(m+1)+"-"+pad(new Date(y,m+1,0).getDate())}
function viewRange(){
  if(S.calView==="today")return[TODAY,TODAY];
  if(S.calView==="next7")return[TODAY,addDays(TODAY,6)];
  if(S.calView==="week"){var s=weekStart(S.anchor||TODAY);return[s,addDays(s,6)]}
  return[S.y+"-"+pad(S.m+1)+"-01",monthLast(S.y,S.m)];
}
function rangeLabel(a,b){
  if(a===b)return fmtLong(a);
  var x=parseISO(a),y=parseISO(b);
  if(x.getMonth()===y.getMonth()&&x.getFullYear()===y.getFullYear())
    return x.getDate()+"–"+y.getDate()+" "+MONTHS[y.getMonth()].slice(0,3)+" "+y.getFullYear();
  return fmtShort(a)+" – "+fmtLong(b);
}
function viewLabel(){
  var r=viewRange();
  if(S.calView==="month")return MONTHS[S.m]+" "+S.y;
  if(S.calView==="week")return "Week of "+rangeLabel(r[0],r[1]);
  if(S.calView==="today")return "Today · "+DOW[dowIdx(TODAY)]+" "+fmtLong(TODAY);
  return "Next 7 days · "+rangeLabel(r[0],r[1]);
}

/* ─── derived ───────────────────────────────────────────── */
function campById(id){for(var i=0;i<S.campaigns.length;i++)if(S.campaigns[i].id===id)return S.campaigns[i];return null}
function campColor(id){var c=campById(id);return c?c.colour:"#8A93B4"}
function isLate(a){return a.dueDate<TODAY&&a.status!=="Published"}
function statusIdx(s){var i=STATUSES.indexOf(s);return i<0?0:i}
function visible(){
  var f=S.filters;
  return S.activities.filter(function(a){
    if(f.campaign&&a.campaignId!==f.campaign)return false;
    if(f.status&&a.status!==f.status)return false;
    if(f.format&&a.type!==f.format)return false;
    if(f.owner&&a.owner!==f.owner)return false;
    if(f.platform&&(a.platforms||[]).indexOf(f.platform)<0)return false;
    return true;
  });
}
function byDay(list){
  var m={};
  list.forEach(function(a){(m[a.dueDate]=m[a.dueDate]||[]).push(a)});
  Object.keys(m).forEach(function(k){m[k].sort(function(x,y){
    return (x.dueTime||"99")<(y.dueTime||"99")?-1:(x.dueTime||"99")>(y.dueTime||"99")?1:(x.title>y.title?1:-1);
  })});
  return m;
}
function ownerIds(){
  var seen={},out=[];
  S.activities.concat(S.campaigns).forEach(function(r){if(r.owner&&!seen[r.owner]){seen[r.owner]=1;out.push(r.owner)}});
  return out;
}

/* ─── dom helpers ───────────────────────────────────────── */
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild)}
function uname(id){
  var s=el("span","uid");s.setAttribute("data-uid",id);
  s.textContent=S.profiles[id]&&S.profiles[id].name?S.profiles[id].name:"Teammate";
  return s;
}
function toast(msg){
  var t=el("div","toast",msg);$("toasts").appendChild(t);
  setTimeout(function(){t.style.transition="opacity .3s";t.style.opacity="0";setTimeout(function(){t.remove()},320)},2300);
}
function writable(){return S.canWrite!==false}
function initials(n){
  var p=String(n||"").trim().split(/\s+/).filter(Boolean);
  if(!p.length)return "?";
  return (p[0][0]+(p.length>1?p[p.length-1][0]:"")).toUpperCase();
}

/* ─── render: pulse ─────────────────────────────────────── */
/* The page says, in words, what this screen is for. One job, one title. */
function headTitle(){
  if(S.view==="campaigns")return "Campaigns";
  if(S.calView==="today")return "Today";
  if(S.calView==="next7")return "Next 7 days";
  if(S.calView==="week"){
    var r=viewRange();
    return r[0]===weekStart(TODAY)?"This week":"Week of "+fmtLong(r[0]);
  }
  return MONTHS[S.m]+" "+S.y;
}
function headSub(){
  if(S.loading)return "Loading the team's plan…";
  if(S.view==="campaigns"){
    if(!S.campaigns.length)return "Nothing planned yet.";
    var live=S.campaigns.filter(function(c){return c.status==="Live"}).length;
    return S.campaigns.length+(S.campaigns.length===1?" campaign":" campaigns")
      +(live?" · "+live+" live":"");
  }
  var r=viewRange();
  var n=visible().filter(function(a){return a.dueDate>=r[0]&&a.dueDate<=r[1]}).length;
  if(S.calView==="today")
    return n?(n===1?"One thing ships today":n+" things ship today"):"Nothing ships today.";
  if(S.calView==="next7")
    return n?(n+" scheduled over the next seven days"):"Nothing scheduled this week yet.";
  if(S.calView==="week")
    return n?(n+" scheduled this week"):"Nothing scheduled this week yet.";
  return n?(n+" scheduled in "+MONTHS[S.m]):"Nothing scheduled in "+MONTHS[S.m]+" yet.";
}
function filterLabel(k,v){
  if(k==="campaign"){var c=campById(v);return c?c.name:v}
  if(k==="owner")return (S.profiles[v]&&S.profiles[v].name)||"Teammate";
  return v;
}
function activeFilters(){
  return Object.keys(S.filters).filter(function(k){return S.filters[k]});
}
function renderHead(){
  var h=$("head");clear(h);
  var cal=S.view==="calendar";
  var box=el("div","phead");
  box.appendChild(el("h1",null,headTitle()));
  box.appendChild(el("p","psub",headSub()));
  var ctl=el("div","pctl");
  if(cal&&(S.calView==="week"||S.calView==="month")){
    var nav=el("div","nav");
    var pv=el("button",null,"‹");pv.setAttribute("aria-label","Previous");
    pv.onclick=function(){step(-1)};
    var nx=el("button",null,"›");nx.setAttribute("aria-label","Next");
    nx.onclick=function(){step(1)};
    nav.appendChild(pv);nav.appendChild(nx);ctl.appendChild(nav);
    var td=el("button","ghost","Today");
    td.onclick=function(){
      var d=new Date();S.y=d.getFullYear();S.m=d.getMonth();S.anchor=TODAY;
      clearDayExpand();render();
    };
    ctl.appendChild(td);
  }
  if(!cal&&S.campaigns.length>2){
    var ea=el("button","ghost",anyExpanded()?"Collapse all":"Expand all");
    ea.onclick=function(){
      var on=!anyExpanded();
      S.campaigns.forEach(function(c){
        if(on)S.expanded["c"+c.id]=true;else delete S.expanded["c"+c.id];
      });
      render();
    };
    ctl.appendChild(ea);
  }
  var late=S.activities.filter(isLate).length;
  if(late&&!(cal&&S.calView==="today")){
    var ob=el("button","alert-pill",late+" overdue");
    ob.title="Show them on Today";
    ob.onclick=function(){S.view="calendar";S.calView="today";clearDayExpand();render()};
    ctl.appendChild(ob);
  }
  var fb=el("button","ghost"+(S.showFilters?" on":""),"Filter");
  fb.onclick=function(){S.showFilters=!S.showFilters;render()};
  ctl.appendChild(fb);
  activeFilters().forEach(function(k){
    var ch=el("div","fchip");
    ch.appendChild(el("b",null,filterLabel(k,S.filters[k])));
    var x=el("button",null,"✕");x.title="Clear this filter";
    x.onclick=function(){S.filters[k]="";render()};
    ch.appendChild(x);ctl.appendChild(ch);
  });
  box.appendChild(ctl);
  if(S.showFilters)box.appendChild(filterBar());
  h.appendChild(box);
}

/* ─── render: filters ───────────────────────────────────── */
function sel(id,label,opts,val,onChange){
  var s=el("select");s.id=id;s.setAttribute("aria-label",label);
  var o0=el("option",null,label);o0.value="";s.appendChild(o0);
  opts.forEach(function(o){var x=el("option",null,o[1]);x.value=o[0];if(o[0]===val)x.selected=true;s.appendChild(x)});
  s.onchange=function(){onChange(s.value)};
  return s;
}
function filterBar(){
  var f=el("div","fbar");
  f.appendChild(sel("f-camp","All campaigns",S.campaigns.map(function(c){return[c.id,c.name]}),S.filters.campaign,
    function(v){S.filters.campaign=v;render()}));
  f.appendChild(sel("f-plat","All platforms",PLATFORMS.map(function(p){return[p[0],p[0]]}),S.filters.platform,
    function(v){S.filters.platform=v;render()}));
  f.appendChild(sel("f-fmt","All formats",FORMATS.map(function(x){
    return[x.id,x.group==="Other"?x.label:x.group+" · "+x.label]}),S.filters.format,
    function(v){S.filters.format=v;render()}));
  var ids=ownerIds();
  if(ids.length){
    var os=sel("f-own","Anyone",ids.map(function(i){return[i,(S.profiles[i]&&S.profiles[i].name)||"Teammate"]}),S.filters.owner,
      function(v){S.filters.owner=v;render()});
    f.appendChild(os);
  }
  f.appendChild(sel("f-stat","Any status",STATUSES.map(function(s){return[s,s]}),S.filters.status,
    function(v){S.filters.status=v;render()}));
  return f;
}

/* ─── render: chip ──────────────────────────────────────── */
function chip(a){
  var b=el("button","chip"+(a.status==="Published"?" done":"")+(isLate(a)?" late":""));
  b.style.setProperty("--c",campColor(a.campaignId));
  var c=campById(a.campaignId);
  b.title=a.title+(c?" · "+c.name:"")+(a.type?" · "+a.type:"")+(a.angle?" / "+a.angle:"")
    +(a.cta?" · CTA: "+a.cta:"")+" · "+a.status
    +(a.dueTime?" · ends "+fmtTime(a.dueTime):"");
  b.appendChild(el("span","t",a.title));
  var m=el("div","m");
  m.appendChild(el("i","dot s"+statusIdx(a.status)));
  (a.platforms||[]).slice(0,2).forEach(function(p){
    var ab=PLATFORMS.filter(function(x){return x[0]===p})[0];
    m.appendChild(el("span","pf",ab?ab[1]:p.slice(0,2).toUpperCase()));
  });
  if((a.platforms||[]).length>2)m.appendChild(el("span","pf","+"+((a.platforms||[]).length-2)));
  if(subTotal(a))m.appendChild(el("span","pf",subDone(a)+"/"+subTotal(a)));
  if(a.dueTime)m.appendChild(el("span","tm",fmtTime(a.dueTime)));
  b.appendChild(m);
  b.onclick=function(){openActivity(a)};
  return b;
}

/* ─── render: calendar ──────────────────────────────────── */
function dayGrid(startISO,count,minH){
  var frag=document.createDocumentFragment(),map=byDay(visible()),total=0;
  var dow=el("div","dow");DOW.forEach(function(d){dow.appendChild(el("div",null,d))});frag.appendChild(dow);
  var grid=el("div","grid");
  for(var i=0;i<count;i++){
    var key=addDays(startISO,i),date=parseISO(key);
    var out=S.calView==="month"&&(date.getMonth()!==S.m||date.getFullYear()!==S.y);
    var cell=el("div","cell"+(out?" out":"")+(key===TODAY?" today":""));
    if(minH)cell.style.minHeight=minH;
    var head=el("div","dnum");head.appendChild(el("span",null,String(date.getDate())));
    if(!out&&writable()){
      var ad=el("button","add","+");ad.setAttribute("aria-label","Add activity on "+fmtLong(key));
      ad.onclick=function(k){return function(e){e.stopPropagation();openActivity(null,k)}}(key);
      head.appendChild(ad);
    }
    cell.appendChild(head);
    var items=map[key]||[];if(!out)total+=items.length;
    if(!items.length&&!out)cell.classList.add("quiet");
    var lim=(S.calView==="week"||S.expanded[key])?items.length:S.dayMax;
    items.slice(0,lim).forEach(function(a,n){var c=chip(a);c.style.animationDelay=(n*40)+"ms";cell.appendChild(c)});
    if(items.length>lim){
      var mb=el("button","more","+"+(items.length-lim)+" more");
      mb.onclick=function(k){return function(e){e.stopPropagation();S.expanded[k]=true;render()}}(key);
      cell.appendChild(mb);
    }
    grid.appendChild(cell);
  }
  frag.appendChild(grid);
  return {node:frag,total:total};
}

function agendaList(startISO,endISO,showEmpty){
  var box=el("div","agenda"),map=byDay(visible()),n=daysBetween(startISO,endISO),k=0,total=0;
  for(var i=0;i<=n;i++){
    var key=addDays(startISO,i),items=map[key]||[];
    total+=items.length;
    if(!items.length&&!showEmpty)continue;
    var row=el("div","ag-day"+(key===TODAY?" is-today":""));
    row.style.animationDelay=(k++*35)+"ms";
    var dt=el("div","ag-date");
    dt.appendChild(el("b",null,String(parseISO(key).getDate())));
    dt.appendChild(el("span",null,DOW[dowIdx(key)]));
    row.appendChild(dt);
    var ii=el("div","ag-items");
    items.forEach(function(a){ii.appendChild(chip(a))});
    if(!items.length){
      var em=el("div","ag-empty");
      em.appendChild(el("span",null,"Nothing scheduled"));
      if(writable()){
        var ab=el("button","ag-add","+ Add");
        ab.onclick=function(kk){return function(){openActivity(null,kk)}}(key);
        em.appendChild(ab);
      }
      ii.appendChild(em);
    }
    row.appendChild(ii);box.appendChild(row);
  }
  return {node:box,total:total};
}

/* leaves of this task that fall in a date range, with the group path they sit under */
function dueLeaves(a,from,to){
  var out=[];
  (function walk(nodes,path){
    (nodes||[]).forEach(function(n){
      if(kids(n).length)walk(n.children,path.concat([n.title]));
      else if(n.due&&n.due>=from&&n.due<=to&&!n.done)out.push({n:n,path:path.join(" · ")});
    });
  })(a.subtasks||[],[]);
  return out;
}

/* one tile per day, so empty days stay visible even when the list is grouped by campaign */
function weekStrip(from,to){
  var map=byDay(visible()),box=el("div","wstrip"),n=daysBetween(from,to);
  for(var i=0;i<=n;i++){
    var key=addDays(from,i),items=map[key]||[];
    var t=el("button","wday"+(key===TODAY?" today":"")+(items.length?"":" empty"));
    t.title=fmtLong(key)+" — "+(items.length?items.length+" scheduled":"nothing scheduled")
      +(writable()?". Click to add.":"");
    t.appendChild(el("span","wd",DOW[dowIdx(key)]));
    t.appendChild(el("b",null,String(parseISO(key).getDate())));
    t.appendChild(el("span","wn",items.length?String(items.length):"—"));
    t.onclick=function(k){return function(){if(writable())openActivity(null,k)}}(key);
    box.appendChild(t);
  }
  return box;
}

/* Today and Next 7 days: everything in play, campaign by campaign,
   with the range's subtasks under the task they belong to */
function renderFocus(box,from,to,showDates){
  var list=visible(),groups=[];
  S.campaigns.forEach(function(c){
    var items=[];
    list.forEach(function(a){
      if(a.campaignId!==c.id)return;
      var inRange=a.dueDate>=from&&a.dueDate<=to;
      var dl=dueLeaves(a,from,to);
      if(inRange||dl.length)items.push({a:a,subs:dl,due:inRange});
    });
    if(!items.length)return;
    items.sort(function(x,y){
      if(x.a.dueDate!==y.a.dueDate)return x.a.dueDate<y.a.dueDate?-1:1;
      var xt=x.a.dueTime||"99",yt=y.a.dueTime||"99";
      return xt<yt?-1:(xt>yt?1:(x.a.title>y.a.title?1:-1));
    });
    groups.push({c:c,items:items});
  });
  groups.forEach(function(g,i){
    var sec=el("div","cgroup");
    sec.style.setProperty("--c",g.c.colour);
    sec.style.animationDelay=(i*45)+"ms";
    var h=el("button","cgroup-h");
    h.title="Open this campaign";
    h.appendChild(el("i","swatch"));
    h.appendChild(el("span","cgroup-n",g.c.name));
    h.appendChild(el("span","cgroup-c",g.items.length+(g.items.length===1?" task":" tasks")));
    h.onclick=function(){S.view="campaigns";S.expanded["c"+g.c.id]=true;render()};
    sec.appendChild(h);
    var bd=el("div","cgroup-b");
    g.items.forEach(function(it){
      if(showDates){
        var fr=el("div","frow");
        var dl=el("span","d"+(it.due?"":" out"),fmtShort(it.a.dueDate));
        if(!it.due)dl.title="Ends "+fmtLong(it.a.dueDate)+", outside this week — shown for its items below";
        fr.appendChild(dl);fr.appendChild(chip(it.a));
        bd.appendChild(fr);
      }else bd.appendChild(chip(it.a));
      if(!it.subs.length)return;
      var sl=el("div","subs nest");
      it.subs.forEach(function(x){
        var r=el("div","sub-row");
        var cb=el("button","sub-chk");cb.setAttribute("aria-pressed","false");
        cb.appendChild(el("i",null,"✓"));cb.disabled=!writable();
        cb.title="Mark done";
        cb.onclick=function(){saveSubs(it.a,patchNode(it.a.subtasks,x.n.id,{done:true}))};
        r.appendChild(cb);
        r.appendChild(el("span","sub-t",x.n.title));
        var mt=el("span","sub-meta");
        if(showDates&&x.n.due)mt.appendChild(el("span",null,fmtShort(x.n.due)));
        if(x.path)mt.appendChild(el("span","sub-kind",x.path));
        if(x.n.platform)mt.appendChild(platPill(x.n.platform));
        if(x.n.kind)mt.appendChild(el("span","sub-kind",x.n.kind));
        if(x.n.owner)mt.appendChild(uname(x.n.owner));
        r.appendChild(mt);
        sl.appendChild(r);
      });
      bd.appendChild(sl);
    });
    sec.appendChild(bd);
    box.appendChild(sec);
  });
  return groups.length;
}

function overdueBlock(){
  var late=visible().filter(isLate);
  if(!late.length)return null;
  late.sort(function(a,b){return a.dueDate<b.dueDate?-1:1});
  var box=el("div","od");
  box.appendChild(el("div","od-h","Overdue · "+late.length));
  late.forEach(function(a){
    var r=el("div","od-row");
    r.appendChild(el("span","d",fmtShort(a.dueDate)));
    r.appendChild(chip(a));
    box.appendChild(r);
  });
  return box;
}

function renderCalendar(main){
  var box=el("div","cal");
  if(S.loading){
    var dw=el("div","dow");DOW.forEach(function(d){dw.appendChild(el("div",null,d))});box.appendChild(dw);
    var g=el("div","grid");for(var i=0;i<35;i++){var sk=el("div","skel");sk.style.animationDelay=(i*18)+"ms";g.appendChild(sk)}
    box.appendChild(g);main.appendChild(box);return;
  }
  if(!S.campaigns.length){box.appendChild(emptyHero());main.appendChild(box);return;}
  var v=S.calView,r=viewRange(),res;
  if(v==="today"){
    var od=overdueBlock();if(od)box.appendChild(od);
    if(!renderFocus(box,r[0],r[1],false))
      box.appendChild(el("div","note","Nothing due today, and no subtask dated today either."));
  }else if(v==="next7"){
    box.appendChild(weekStrip(r[0],r[1]));
    var od2=overdueBlock();if(od2)box.appendChild(od2);
    if(!renderFocus(box,r[0],r[1],true))
      box.appendChild(el("div","note",
        "Nothing scheduled in the next 7 days. Click any day above to add something."));
  }else if(phone){
    res=agendaList(r[0],r[1],false);box.appendChild(res.node);
    if(!res.total)box.appendChild(el("div","note","Nothing scheduled in "
      +(v==="week"?"this week":MONTHS[S.m]+" "+S.y)+". Use + New activity to add the first one."));
  }else if(v==="week"){
    res=dayGrid(r[0],7,"232px");box.appendChild(res.node);
    if(!res.total)box.appendChild(el("div","note","Nothing scheduled this week. Hover any day and click + to add."));
  }else{
    var first=new Date(S.y,S.m,1),off=(first.getDay()+6)%7,ndays=new Date(S.y,S.m+1,0).getDate();
    res=dayGrid(addDays(iso(first),-off),Math.ceil((off+ndays)/7)*7,null);
    box.appendChild(res.node);
    if(!res.total)box.appendChild(el("div","note","Nothing scheduled in "+MONTHS[S.m]+" "+S.y+". Hover any day and click + to add."));
  }
  main.appendChild(box);
}

/* ─── render: campaigns ─────────────────────────────────── */
function renderCampaigns(main){
  if(S.loading){var g=el("div","camps");for(var i=0;i<3;i++){var s=el("div","skel");s.style.height="178px";g.appendChild(s)}main.appendChild(g);return}
  if(!S.campaigns.length){main.appendChild(emptyHero());return}
  var wrap=el("div","camps");
  S.campaigns.slice().sort(function(a,b){return a.startDate<b.startDate?1:-1}).forEach(function(c,n){
    var acts=S.activities.filter(function(a){return a.campaignId===c.id});
    var pub=acts.filter(function(a){return a.status==="Published"}).length;
    var late=acts.filter(isLate).length;
    var card=el("div","card");card.style.setProperty("--c",c.colour);card.style.animationDelay=(n*50)+"ms";
    var open=!!S.expanded["c"+c.id];
    if(open)card.classList.add("open");
    var top=el("div","top");
    var tgl=el("button","c-top");
    tgl.setAttribute("aria-expanded",open?"true":"false");
    tgl.title=open?"Collapse campaign":"Expand to see and add activities";
    tgl.appendChild(el("i","chev",open?"▾":"▸"));
    tgl.appendChild(el("i","swatch"));
    var h=el("div","c-title");h.appendChild(el("h3",null,c.name));
    tgl.appendChild(h);
    tgl.onclick=function(){S.expanded["c"+c.id]=!open;render()};
    top.appendChild(tgl);
    var ed=el("button","x","✎");ed.title="Edit campaign";ed.style.fontSize="13px";
    ed.onclick=function(){openCampaign(c)};
    if(writable())top.appendChild(ed);
    card.appendChild(top);
    if(c.goal)card.appendChild(el("p","goal",c.goal));
    var meta=el("div","meta");
    var tg=el("span","tag"+(c.status==="Live"?" live":""),c.status);meta.appendChild(tg);
    meta.appendChild(el("span",null,fmtShort(c.startDate)+" → "+fmtLong(c.endDate)));
    var left=daysBetween(TODAY,c.endDate);
    if(c.status!=="Done")meta.appendChild(el("span",null,left<0?Math.abs(left)+"d over":left===0?"ends today":left+"d left"));
    if(late)meta.appendChild(el("span","tag bad",late+" overdue"));
    if(c.owner){var ow=el("span");ow.appendChild(document.createTextNode("Owner: "));ow.appendChild(uname(c.owner));meta.appendChild(ow)}
    card.appendChild(meta);
    var pr=el("div","prog"),bar=el("i");bar.style.width=(acts.length?Math.round(pub/acts.length*100):0)+"%";pr.appendChild(bar);
    card.appendChild(pr);
    var pl=el("div","prog-l");
    pl.appendChild(el("span",null,pub+" of "+acts.length+" published"));
    pl.appendChild(el("span",null,acts.length?Math.round(pub/acts.length*100)+"%":"no activities yet"));
    card.appendChild(pl);
    if(acts.length){
      var tb=el("button","c-toggle");
      tb.appendChild(el("span",null,open?"Hide activities"
        :"Show "+acts.length+(acts.length===1?" activity":" activities")));
      tb.appendChild(el("i","chev2",open?"▴":"▾"));
      tb.onclick=function(){S.expanded["c"+c.id]=!open;render()};
      card.appendChild(tb);
    }
    if(open&&acts.length){
      var list=el("div","c-acts");
      acts.slice().sort(function(x,y){return x.dueDate<y.dueDate?-1:(x.dueDate>y.dueDate?1:0)})
      .forEach(function(a){
        var subs=a.subtasks||[],nSub=subTotal(a),pub=a.status==="Published";
        var aw=el("div","act-wrap"),r=el("div","row"+(isLate(a)?" late":"")+(pub?" done":""));
        var st=el("button","sub-tgl",S.expanded["a"+a.id]?"▾":"▸");
        st.title=nSub?"Show subtasks ("+nSub+")":"Add a subtask";
        st.setAttribute("aria-expanded",S.expanded["a"+a.id]?"true":"false");
        st.onclick=function(e){e.stopPropagation();S.expanded["a"+a.id]=!S.expanded["a"+a.id];render()};
        r.appendChild(st);
        var mk=el("button","mark s"+statusIdx(a.status));
        mk.appendChild(el("i",null,"✓"));
        mk.title=pub?"Published — click to move back to ready":"Mark published ("+a.status+")";
        mk.setAttribute("aria-label",mk.title);
        mk.disabled=!writable();
        mk.onclick=function(e){
          e.stopPropagation();
          var next=pub?"Ready":"Published";
          setField(a.id,{status:next},function(){
            a.status=next;render();
            toast(next==="Published"?"Marked published":"Moved back to ready");
          });
        };
        r.appendChild(mk);
        var rm=el("button","row-main");
        rm.appendChild(el("span","d",fmtShort(a.dueDate)));
        rm.appendChild(el("span","n",a.title));
        if(a.type||a.angle)
          rm.appendChild(el("span","row-ty",[a.type,a.angle].filter(Boolean).join(" · ")));
        if(a.script){var hs=el("span","has-script","≡");hs.title="Has a script";rm.appendChild(hs)}
        if(nSub){
          var pg=el("span","sub-count",subDone(a)+"/"+nSub);
          if(subDone(a)===nSub)pg.classList.add("ok");
          rm.appendChild(pg);
        }
        rm.onclick=function(){openActivity(a)};
        r.appendChild(rm);
        aw.appendChild(r);
        if(S.expanded["a"+a.id])aw.appendChild(subtaskTree(a));
        list.appendChild(aw);
      });
      card.appendChild(list);
    }
    if(open&&writable())card.appendChild(quickAdd(c));
    else if(!acts.length&&writable()){
      var nb=el("button","link","+ Add the first activity");
      nb.onclick=function(){S.expanded["c"+c.id]=true;S.focusAdd="c"+c.id;render()};
      card.appendChild(nb);
    }
    wrap.appendChild(card);
  });
  main.appendChild(wrap);
}

/* ─── subtasks ──────────────────────────────────────────── */
var wq=Promise.resolve();
function sid(){return "s"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function newNode(title,kind,plat){
  return {id:sid(),title:title,done:false,owner:"",due:"",kind:kind||"",platform:plat||"",children:[]};
}
function platAbbr(p){
  for(var i=0;i<PLATFORMS.length;i++)if(PLATFORMS[i][0]===p)return PLATFORMS[i][1];
  return p;
}
function platPill(p){
  var s=el("span","sub-plat",platAbbr(p));s.title=p;return s;
}
function kids(n){return (n&&n.children)||[]}
/* only leaves count — a group's state is whatever its children say */
function leaves(nodes,out){
  out=out||[];
  (nodes||[]).forEach(function(n){
    if(kids(n).length)leaves(n.children,out);else out.push(n);
  });
  return out;
}
function subDone(a){return leaves(a.subtasks).filter(function(x){return x.done}).length}
function subTotal(a){return leaves(a.subtasks).length}
function nodeCount(n){
  var l=leaves(kids(n));
  return [l.filter(function(x){return x.done}).length,l.length];
}
function nodeDone(n){
  if(!kids(n).length)return !!n.done;
  var c=nodeCount(n);
  return c[1]>0&&c[0]===c[1];
}
function patchNode(nodes,id,upd){
  return (nodes||[]).map(function(n){
    if(n.id===id)return Object.assign({},n,upd);
    if(kids(n).length)return Object.assign({},n,{children:patchNode(n.children,id,upd)});
    return n;
  });
}
function removeNode(nodes,id){
  return (nodes||[]).filter(function(n){return n.id!==id}).map(function(n){
    return kids(n).length?Object.assign({},n,{children:removeNode(n.children,id)}):n;
  });
}
function addChild(nodes,parentId,node){
  if(!parentId)return (nodes||[]).concat([node]);
  return (nodes||[]).map(function(n){
    if(n.id===parentId)return Object.assign({},n,{children:kids(n).concat([node])});
    if(kids(n).length)return Object.assign({},n,{children:addChild(n.children,parentId,node)});
    return n;
  });
}
function buildSteps(def){
  return (def||[]).map(function(x){
    if(typeof x==="string")return newNode(x,SUBKINDS.indexOf(x)>=0?x:"","");
    var n=newNode(x.t,x.k||"",x.p||"");
    if(x.c)n.children=buildSteps(x.c);
    return n;
  });
}
/* groups start open; S.expanded only records a deliberate collapse */
function nodeOpen(id){var v=S.expanded["n"+id];return v===undefined?true:!!v}
function persistSubs(a){
  var arr=(a.subtasks||[]).slice();
  wq=wq.then(function(){return db.doc("activities/"+a.id).update({subtasks:arr})})
       .catch(function(e){toast(msgFor(e))});
}
function saveSubs(a,arr){a.subtasks=arr;persistSubs(a);render()}

/* One creative, several placements. Each placement is a different design,
   so each becomes its own item with its own owner and date. */
function placementPicker(node,onAdd,onCancel){
  var box=el("div","plc"),chosen={};
  box.appendChild(el("div","plc-h","Where does "+(node.title?"“"+node.title+"”":"this creative")
    +" go? Instagram story and Instagram post are different designs, so each placement "
    +"becomes its own item with its own owner and date."));
  var grid=el("div","plc-grid");
  PLACEMENTS.forEach(function(p){
    var key=p[0]+"|"+p[1];
    var b=el("button","pill sky",platAbbr(p[0])+" · "+p[1].toLowerCase());
    b.type="button";b.setAttribute("aria-pressed","false");
    b.title=p[0]+" "+p[1].toLowerCase();
    b.onclick=function(){
      chosen[key]=!chosen[key];
      b.setAttribute("aria-pressed",chosen[key]?"true":"false");
    };
    grid.appendChild(b);
  });
  box.appendChild(grid);
  var f=el("div","plc-f");
  var go=el("button","btn btn-p","Add placements");
  go.onclick=function(){
    var list=Object.keys(chosen).filter(function(k){return chosen[k]});
    if(!list.length){toast("Pick at least one placement");return}
    onAdd(list.map(function(k){
      var p=k.split("|");
      return newNode(p[0]+" "+p[1].toLowerCase(),p[1],p[0]);
    }));
  };
  var cancel=el("button","btn btn-o","Cancel");
  cancel.onclick=function(){S.placeFor=null;onCancel()};
  f.appendChild(go);f.appendChild(cancel);
  box.appendChild(f);
  return box;
}

function subAddInput(a,parentId,ph){
  var key="n"+(parentId||("a"+a.id));
  var ai=el("input");ai.type="text";ai.className="sub-add";
  ai.placeholder=ph;ai.setAttribute("data-focus",key);
  ai.onkeydown=function(e){
    if(e.key!=="Enter")return;
    e.preventDefault();
    var v=ai.value.trim();if(!v)return;
    ai.value="";S.focusAdd=key;
    if(parentId)S.expanded["n"+parentId]=true;
    saveSubs(a,addChild(a.subtasks||[],parentId,newNode(v,"")));
  };
  return ai;
}

function subNodes(host,a,nodes,depth){
  nodes.forEach(function(s){
    var ch=kids(s),group=ch.length>0,open=nodeOpen(s.id);
    var r=el("div","sub-row"+(group?" grp":""));
    if(group){
      var cv=el("button","sub-tgl",open?"▾":"▸");
      cv.title=open?"Collapse":"Expand";
      cv.onclick=function(e){e.stopPropagation();S.expanded["n"+s.id]=!open;render()};
      r.appendChild(cv);
    }else{
      var cb=el("button","sub-chk");cb.setAttribute("aria-pressed",s.done?"true":"false");
      cb.appendChild(el("i",null,"✓"));cb.disabled=!writable();
      cb.title=s.done?"Mark not done":"Mark done";
      cb.onclick=function(){saveSubs(a,patchNode(a.subtasks,s.id,{done:!s.done}))};
      r.appendChild(cb);
    }
    r.appendChild(el("span","sub-t"+(nodeDone(s)?" done":""),s.title));
    var mt=el("span","sub-meta");
    if(group){
      var n=nodeCount(s),pg=el("span","sub-count",n[0]+"/"+n[1]);
      if(n[1]&&n[0]===n[1])pg.classList.add("ok");
      mt.appendChild(pg);
    }
    if(writable()){
      /* the two dropdowns that say what this item is: where it goes, and what it is */
      var ps=dropdown(PLATFORMS.map(function(p){return[p[0],p[0]]}),s.platform||"","＋ where");
      ps.className="inl plat"+(s.platform?"":" empty");
      ps.title=s.platform?("Platform: "+s.platform):"Set the platform";
      ps.onchange=function(){saveSubs(a,patchNode(a.subtasks,s.id,{platform:ps.value}))};
      mt.appendChild(ps);
      var ks=dropdown(SUBKINDS.map(function(k){return[k,k]}),s.kind||"","＋ type");
      ks.className="inl"+(s.kind?"":" empty");
      ks.title=s.kind?("Type: "+s.kind):"Set the type of post";
      ks.onchange=function(){saveSubs(a,patchNode(a.subtasks,s.id,{kind:ks.value}))};
      mt.appendChild(ks);
    }else{
      if(s.platform)mt.appendChild(platPill(s.platform));
      if(s.kind)mt.appendChild(el("span","sub-kind",s.kind));
    }
    if(s.due)mt.appendChild(el("span",null,fmtShort(s.due)));
    if(s.owner)mt.appendChild(uname(s.owner));
    r.appendChild(mt);
    if(writable()&&depth<MAXDEPTH-1){
      var pc=el("button","sub-x place","⊞");
      pc.title="This creative goes to several placements — add them";
      pc.onclick=function(e){
        e.stopPropagation();
        S.placeFor=(S.placeFor===s.id?null:s.id);
        S.expanded["n"+s.id]=true;render();
      };
      r.appendChild(pc);
      var pl=el("button","sub-x plus","+");pl.title="Add one item under this";
      pl.onclick=function(){S.expanded["n"+s.id]=true;S.focusAdd="n"+s.id;render()};
      r.appendChild(pl);
    }
    if(writable()){
      var x=el("button","sub-x","✕");
      x.title=group?"Remove this group and everything in it":"Remove";
      x.onclick=function(){saveSubs(a,removeNode(a.subtasks,s.id))};
      r.appendChild(x);
    }
    host.appendChild(r);
    if(S.placeFor===s.id&&writable()&&depth<MAXDEPTH-1){
      host.appendChild(placementPicker(s,function(nodes){
        S.placeFor=null;
        saveSubs(a,nodes.reduce(function(acc,n){return addChild(acc,s.id,n)},a.subtasks||[]));
        toast("Added "+nodes.length+" placement"+(nodes.length>1?"s":""));
      },function(){render()}));
    }
    if(open&&(group||S.focusAdd==="n"+s.id||S.placeFor===s.id)){
      var nest=el("div","subs nest");
      subNodes(nest,a,ch,depth+1);
      if(writable()&&depth<MAXDEPTH-1)nest.appendChild(subAddInput(a,s.id,"+ Add under "+(s.title||"this")));
      host.appendChild(nest);
    }
  });
}

function subtaskTree(a){
  var box=el("div","subs"),subs=a.subtasks||[];
  if(!subs.length&&!writable())box.appendChild(el("div","sub-empty","No subtasks."));
  subNodes(box,a,subs,0);
  if(writable())box.appendChild(subAddInput(a,null,"+ Add a subtask"));
  return box;
}

function quickAdd(c){
  var la=S.lastAdd[c.id]||{};
  var box=el("div","qadd");
  var ti=el("input");ti.type="text";ti.className="q-title";
  ti.placeholder="Add an activity to this campaign…";
  ti.setAttribute("data-focus","c"+c.id);
  var fs=formatSelect(la.type||"","Format…","q-fmt");
  var angleBox=el("span","q-angle");
  var dt=el("input");dt.type="date";dt.className="q-date";
  dt.title="End date";dt.setAttribute("aria-label","End date");
  dt.value=la.date||((TODAY>=c.startDate&&TODAY<=c.endDate)?TODAY:c.startDate);
  var tm=el("input");tm.type="time";tm.className="q-time";
  tm.title="End time (optional)";tm.setAttribute("aria-label","End time, optional");
  tm.value=la.time||"";
  var go=el("button","btn btn-p q-go","Add");
  function drawAngle(keep){
    clear(angleBox);
    var f=formatById(fs.value);
    if(!f||!f.angles.length)return;
    var s=dropdown(f.angles.map(function(x){return[x,x]}),keep?(la.angle||""):"","Topic…");
    s.setAttribute("aria-label","Topic");
    angleBox.appendChild(s);
  }
  fs.onchange=function(){drawAngle(false)};
  drawAngle(true);
  function add(){
    var t=ti.value.trim();if(!t)return;
    var f=formatById(fs.value),asel=angleBox.querySelector("select");
    var ang=asel?asel.value:"";
    S.lastAdd[c.id]={type:fs.value,angle:ang,date:dt.value,time:tm.value};
    go.disabled=true;go.textContent="…";
    db.collection("activities").add({campaignId:c.id,title:t,type:fs.value,angle:ang,cta:"",
      platforms:f?f.platforms.slice():[],
      dueDate:dt.value||TODAY,dueTime:tm.value,owner:"",status:"Not started",description:"",
      keywords:[],script:"",subtasks:[],createdAt:new Date().toISOString()})
      .then(function(){S.focusAdd="c"+c.id;toast("Added to "+c.name)})
      .catch(function(e){go.disabled=false;go.textContent="Add";toast(msgFor(e))});
  }
  go.onclick=add;
  ti.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();add()}};
  /* At rest this is one field. The rest arrives when you start typing. */
  var row2=el("div","qrow");
  box.appendChild(ti);box.appendChild(row2);
  row2.appendChild(fs);row2.appendChild(angleBox);
  row2.appendChild(dt);row2.appendChild(tm);row2.appendChild(go);
  var open=function(){box.classList.add("open")};
  ti.onfocus=open;
  var more=el("button","q-more","More options");
  more.title="Open the full form: CTA, platforms, owner, keywords, script, subtasks";
  more.onclick=function(){
    var f=formatById(fs.value),asel=angleBox.querySelector("select");
    openActivity(null,dt.value,c.id,{
      title:ti.value.trim(),
      type:fs.value,
      angle:asel?asel.value:"",
      time:tm.value,
      platforms:f?f.platforms.slice():[]
    });
  };
  row2.appendChild(more);
  return box;
}

function emptyHero(){
  var h=el("div","hero");
  h.appendChild(el("h2",null,"No campaigns yet"));
  h.appendChild(el("p",null,writable()
    ?"Create a campaign, then add what ships and when. Every activity you date shows up here on the team calendar."
    :"Nothing has been planned yet. Once the marketing team adds campaigns, they appear here."));
  if(writable()){
    var b=el("button","btn btn-s","+ New campaign");b.onclick=function(){openCampaign(null)};h.appendChild(b);
  }
  return h;
}

/* ─── render root ───────────────────────────────────────── */
/* One switcher for every place you can be, calendar views and campaigns alike. */
var VIEWS=[["today","Today"],["next7","Next 7 days"],["week","Week"],
           ["month","Month"],["campaigns","Campaigns"]];
function renderViews(){
  var w=$("vsw");clear(w);
  VIEWS.forEach(function(v){
    var isC=v[0]==="campaigns";
    var on=isC?(S.view==="campaigns"):(S.view==="calendar"&&S.calView===v[0]);
    var b=el("button",null,v[1]);
    b.setAttribute("role","tab");
    b.setAttribute("aria-selected",on?"true":"false");
    b.onclick=function(){
      if(isC)S.view="campaigns";
      else{
        S.view="calendar";S.calView=v[0];
        if(v[0]==="week"&&!S.anchor)S.anchor=TODAY;
      }
      S.showFilters=false;clearDayExpand();render();
      try{window.scrollTo({top:0,behavior:"smooth"})}catch(e){}
    };
    w.appendChild(b);
  });
}
function anyExpanded(){
  for(var i=0;i<S.campaigns.length;i++)if(S.expanded["c"+S.campaigns[i].id])return true;
  return false;
}
function clearDayExpand(){
  Object.keys(S.expanded).forEach(function(k){
    var ch=k.charAt(0);
    if(ch!=="c"&&ch!=="a"&&ch!=="n")delete S.expanded[k];
  });
}
function render(){
  renderViews();renderHead();
  /* One primary action, and it is always the one this screen is for:
     you make campaigns on Campaigns, and dated work on a calendar. */
  var nb=$("new-act"),onCamps=S.view==="campaigns";
  nb.textContent=onCamps?"New campaign":"New activity";
  nb.onclick=onCamps?function(){openCampaign(null)}:function(){openActivity(null)};
  nb.style.display=writable()?"":"none";
  var who=$("who");
  if(S.me){
    who.hidden=false;
    who.textContent=initials(S.me.name);
    who.title=S.me.name+" · sign out";
  }else who.hidden=true;
  var main=$("main");clear(main);
  if(S.err){
    var b=el("div","banner");b.appendChild(el("span",null,"⚠"));
    b.appendChild(el("span",null,"Can't reach the shared data right now. "+S.err));
    var r=el("button","btn btn-o","Retry");r.onclick=function(){location.reload()};b.appendChild(r);
    main.appendChild(b);
  }else if(S.stale&&S.loading){
    var sb=el("div","banner");sb.appendChild(el("span",null,"◷"));
    sb.appendChild(el("span",null,"Still loading the team's campaigns…"));main.appendChild(sb);
  }
  if(S.view==="calendar")renderCalendar(main);else renderCampaigns(main);
  if(S.focusAdd){
    var f=main.querySelector('[data-focus="'+S.focusAdd+'"]');
    S.focusAdd=null;
    if(f)f.focus();
  }
  paintNames();
}

/* resolve owner ids to names without re-rendering */
function paintNames(){
  if(!U)return;
  var nodes=document.querySelectorAll("[data-uid]"),ids=[],seen={};
  for(var i=0;i<nodes.length;i++){var id=nodes[i].getAttribute("data-uid");if(id&&!seen[id]){seen[id]=1;ids.push(id)}}
  ownerIds().forEach(function(id){if(!seen[id]){seen[id]=1;ids.push(id)}});
  if(!ids.length)return;
  U.profiles(ids).then(function(ps){
    var changed=false;
    ids.forEach(function(id){
      var nm=(ps[id]&&ps[id].name)||"";
      if((S.profiles[id]||{}).name!==nm){S.profiles[id]={name:nm};changed=true}
    });
    var ns=document.querySelectorAll("[data-uid]");
    for(var i=0;i<ns.length;i++){
      var id2=ns[i].getAttribute("data-uid");
      ns[i].textContent=(S.profiles[id2]&&S.profiles[id2].name)||"Teammate";
    }
    if(changed){
      var f=$("f-own");
      if(f){var cur=f.value;renderFilters();var f2=$("f-own");if(f2)f2.value=cur}
    }
  });
}

/* ─── overlay plumbing ──────────────────────────────────── */
function closeOverlay(){clear($("overlay"));document.body.style.overflow=""}
function overlay(node){
  var o=$("overlay");clear(o);
  var sc=el("div","scrim");sc.onclick=closeOverlay;
  o.appendChild(sc);o.appendChild(node);
  document.body.style.overflow="hidden";
  if(!writable()){
    var ff=node.querySelectorAll("input,select,textarea,.pill,.chk");
    for(var i=0;i<ff.length;i++)ff[i].disabled=true;
  }
  var first=node.querySelector("input,select,textarea");if(first)setTimeout(function(){first.focus()},120);
}
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeOverlay()});

function field(label,control,hintText,hintCls){
  var w=el("div");w.appendChild(el("label",null,label));w.appendChild(control);
  if(hintText)w.appendChild(el("div","hint"+(hintCls?" "+hintCls:""),hintText));
  return w;
}
function input(type,val,ph){var i=el("input");i.type=type;i.value=val||"";if(ph)i.placeholder=ph;return i}
function dropdown(opts,val,blank){
  var s=el("select");
  if(blank!=null){var o=el("option",null,blank);o.value="";s.appendChild(o)}
  opts.forEach(function(o){var x=el("option",null,o[1]);x.value=o[0];if(o[0]===val)x.selected=true;s.appendChild(x)});
  return s;
}

/* owner typeahead over the workspace */
function ownerPicker(current,onPick){
  var box=el("div","ac"),inp=input("text","","Search your team…"),menu=null;
  if(current&&S.profiles[current]&&S.profiles[current].name)inp.value=S.profiles[current].name;
  else if(current)inp.value="Teammate";
  box.appendChild(inp);
  function shut(){if(menu){menu.remove();menu=null}}
  function show(list){
    shut();
    if(!list.length)return;
    menu=el("div","ac-menu");
    list.forEach(function(p){
      var b=el("button",null,p.name||"Someone");b.type="button";
      b.onclick=function(){inp.value=p.name||"Someone";S.profiles[p.id]={name:p.name||""};onPick(p.id);shut()};
      menu.appendChild(b);
    });
    var cb=el("button",null,"— Unassigned —");cb.type="button";
    cb.onclick=function(){inp.value="";onPick("");shut()};
    menu.appendChild(cb);
    box.appendChild(menu);
  }
  function query(q){
    if(!U||!U.search){shut();return}
    U.search(q).then(function(r){show(r||[])});
  }
  inp.onfocus=function(){query("")};
  inp.oninput=function(){query(inp.value)};
  inp.onblur=function(){setTimeout(shut,180)};
  if(!U||!U.search){inp.disabled=true;inp.placeholder="Team directory unavailable"}
  return box;
}

/* ─── activity panel ────────────────────────────────────── */
function openActivity(a,presetDate,presetCampaign,preset){
  if(!a&&!writable())return;
  if(!a&&!S.campaigns.length){openCampaign(null);return}
  var isNew=!a,pf=preset||{};
  var live=S.campaigns.filter(function(c){return c.status==="Live"});
  var d={
    title:a?a.title:(pf.title||""),
    campaignId:a?a.campaignId:(presetCampaign||(live.length===1?live[0].id:(S.campaigns.length===1?S.campaigns[0].id:""))),
    type:a?(a.type||""):(pf.type||""),
    angle:a?(a.angle||""):(pf.angle||""),
    cta:a?(a.cta||""):"",
    platforms:a?(a.platforms||[]).slice():((pf.platforms||[]).slice()),
    dueDate:a?a.dueDate:(presetDate||TODAY),
    dueTime:a?(a.dueTime||""):(pf.time||""),
    owner:a?(a.owner||""):"",
    description:a?(a.description||""):"",
    keywords:a?(a.keywords||[]).slice():[],
    script:a?(a.script||""):""
  };
  /* true while the platforms were filled in by the format, not by the user */
  var autoPlat=isNew&&!!(pf.platforms&&pf.platforms.length);
  var p=el("div","panel");p.setAttribute("role","dialog");p.setAttribute("aria-label",isNew?"New activity":"Activity");
  var head=el("div","p-head");
  head.appendChild(el("h2",null,isNew?"New activity":"Activity"));
  var xb=el("button","x","✕");xb.onclick=closeOverlay;head.appendChild(xb);
  p.appendChild(head);
  var body=el("div","p-body");p.appendChild(body);

  var titleIn=input("text",d.title,"e.g. Topper interview — Akriti, AIR 12");
  titleIn.id="act-title";
  titleIn.oninput=function(){d.title=titleIn.value;validate()};
  body.appendChild(field("Title",titleIn));

  var campSel=dropdown(S.campaigns.map(function(c){return[c.id,c.name]}),d.campaignId,"Choose a campaign");
  campSel.id="act-camp";
  campSel.onchange=function(){d.campaignId=campSel.value;validate()};
  body.appendChild(field("Campaign",campSel));

  var fmtSel=formatSelect(d.type,"Not set");fmtSel.id="act-format";
  body.appendChild(field("Format",fmtSel));
  var angleWrap=el("div"),ctaWrap=el("div");
  body.appendChild(angleWrap);body.appendChild(ctaWrap);
  function drawAngle(){
    clear(angleWrap);
    var f=formatById(d.type);
    angleWrap.hidden=!(f&&f.angles.length);
    if(!f||!f.angles.length)return;
    var s=dropdown(f.angles.map(function(x){return[x,x]}),d.angle,"Not set");
    s.id="act-angle";
    s.onchange=function(){d.angle=s.value};
    angleWrap.appendChild(field("Topic",s,"What this one is about, within "+f.label.toLowerCase()+"."));
  }
  function drawCta(){
    clear(ctaWrap);
    var f=formatById(d.type);
    ctaWrap.hidden=!(f&&f.cta);
    if(!f||!f.cta)return;
    var s=dropdown(CTAS.map(function(x){return[x,x]}),d.cta,"Not set");
    s.id="act-cta";
    s.onchange=function(){d.cta=s.value};
    ctaWrap.appendChild(field("CTA",s,"How the viewer is asked to act. Shorts and reels get different CTAs."));
  }
  fmtSel.onchange=function(){
    d.type=fmtSel.value;
    var f=formatById(d.type);
    if(!f||f.angles.indexOf(d.angle)<0)d.angle="";
    if(!f||!f.cta)d.cta="";
    if(f&&f.platforms.length&&(!d.platforms.length||autoPlat)){
      d.platforms=f.platforms.slice();autoPlat=true;
      var bs=pl.querySelectorAll("button");
      for(var i=0;i<bs.length;i++)bs[i].setAttribute("aria-pressed",d.platforms.indexOf(bs[i].textContent)>=0?"true":"false");
    }
    drawAngle();drawCta();
  };
  drawAngle();drawCta();

  var pl=el("div","pills");
  PLATFORMS.forEach(function(x){
    var b=el("button","pill sky",x[0]);b.type="button";
    b.setAttribute("aria-pressed",d.platforms.indexOf(x[0])>=0);
    b.onclick=function(){
      var i=d.platforms.indexOf(x[0]);
      if(i>=0)d.platforms.splice(i,1);else d.platforms.push(x[0]);
      autoPlat=false;
      b.setAttribute("aria-pressed",d.platforms.indexOf(x[0])>=0);
    };
    pl.appendChild(b);
  });
  body.appendChild(field("Platforms",pl,"One activity can ship to several places."));

  var two=el("div","f2");
  var dd=input("date",d.dueDate);dd.id="act-date";
  var dt=input("time",d.dueTime);dt.id="act-time";
  var dw=field("End date",dd),tw=field("End time (optional)",dt,"Blank = anytime that day. A live or a broadcast needs one.");
  two.appendChild(dw);two.appendChild(tw);
  body.appendChild(two);
  var rangeHint=el("div","hint warn");rangeHint.hidden=true;body.appendChild(rangeHint);
  dd.oninput=function(){d.dueDate=dd.value;validate()};
  dt.oninput=function(){d.dueTime=dt.value};

  body.appendChild(field("Owner",ownerPicker(d.owner,function(id){d.owner=id}),"Unowned work is the first thing to slip."));

  var ta=el("textarea");ta.id="act-desc";ta.value=d.description;ta.className="short-ta";
  ta.placeholder="One or two lines: what this is and why.";
  ta.oninput=function(){d.description=ta.value};
  body.appendChild(field("Short description",ta));

  var kw=input("text",d.keywords.join(", "),"norcet, aiims, high yield…");
  kw.id="act-keywords";
  kw.oninput=function(){
    d.keywords=kw.value.split(",").map(function(x){return x.trim()}).filter(Boolean);
  };
  body.appendChild(field("Keywords",kw,"Comma separated. Feeds the title, description and tags when it goes up."));

  var sc=el("textarea");sc.id="act-script";sc.value=d.script;sc.className="script-ta";
  sc.placeholder="Hook…\n\nBody…\n\nCTA…";
  sc.oninput=function(){d.script=sc.value};
  var scriptField=field("Script",sc,"The spoken or written script. Long form, shorts, reels, broadcasts — whatever this one needs.");

  /* status + assets write immediately on an existing activity */
  if(!isNew){
    var sp=el("div","pills");
    STATUSES.forEach(function(st){
      var b=el("button","pill",st);b.type="button";
      b.setAttribute("aria-pressed",a.status===st);
      b.onclick=function(){
        if(!writable()||a.status===st)return;
        setField(a.id,{status:st},function(){
          a.status=st;
          var all=sp.querySelectorAll("button");
          for(var i=0;i<all.length;i++)all[i].setAttribute("aria-pressed",all[i].textContent===st);
          toast("Marked "+st.toLowerCase());
        });
      };
      sp.appendChild(b);
    });
    body.appendChild(field("Status",sp,isLate(a)?"Overdue since "+fmtLong(a.dueDate):null,"err"));

    var sbox=el("div","ps-list");
    var drawSubs;
    var patchSub=function(id,upd){
      a.subtasks=patchNode(a.subtasks||[],id,upd);
      persistSubs(a);render();drawSubs(null);
    };
    var dropSub=function(id){
      a.subtasks=removeNode(a.subtasks||[],id);
      persistSubs(a);render();drawSubs(null);
    };
    var addSub=function(parentId){
      var n=newNode("","");
      a.subtasks=addChild(a.subtasks||[],parentId,n);
      persistSubs(a);render();drawSubs("t"+n.id);
    };
    var psNodes=function(nodes,depth){
      nodes.forEach(function(s){
        var ch=kids(s),group=ch.length>0;
        var r=el("div","ps-row dep"+Math.min(depth,MAXDEPTH)+(group?" grp":""));
        if(group){
          var n=nodeCount(s),pg=el("span","sub-count",n[0]+"/"+n[1]);
          if(n[1]&&n[0]===n[1])pg.classList.add("ok");
          r.appendChild(pg);
        }else{
          var cb=el("button","sub-chk");cb.setAttribute("aria-pressed",s.done?"true":"false");
          cb.appendChild(el("i",null,"✓"));cb.title=s.done?"Mark not done":"Mark done";
          cb.onclick=function(){patchSub(s.id,{done:!s.done})};
          r.appendChild(cb);
        }
        var ti=input("text",s.title);ti.className="ps-title"+(nodeDone(s)?" done":"");
        ti.placeholder="Name this item…";ti.setAttribute("data-pfocus","t"+s.id);
        ti.onchange=function(){
          var v=ti.value.trim();
          if(!v&&!group){dropSub(s.id);return}
          patchSub(s.id,{title:v||s.title});
        };
        r.appendChild(ti);
        if(depth<MAXDEPTH-1){
          var pc=el("button","sub-x place","⊞");
          pc.title="This creative goes to several placements — add them";
          pc.onclick=function(){
            S.placeFor=(S.placeFor===s.id?null:s.id);
            drawSubs(null);
          };
          r.appendChild(pc);
          var pl=el("button","sub-x plus","+");pl.title="Add one item under this";
          pl.onclick=function(){addSub(s.id)};
          r.appendChild(pl);
        }
        var x=el("button","sub-x","✕");
        x.title=group?"Remove this group and everything in it":"Remove";
        x.onclick=function(){dropSub(s.id)};
        r.appendChild(x);
        var two=el("div","ps-2");
        var pf2=dropdown(PLATFORMS.map(function(p){return[p[0],p[0]]}),s.platform||"","Platform…");
        pf2.className="ps-plat";pf2.setAttribute("aria-label","Platform");
        pf2.onchange=function(){patchSub(s.id,{platform:pf2.value})};
        var kd=dropdown(SUBKINDS.map(function(k){return[k,k]}),s.kind||"","Type…");
        kd.className="ps-kind";kd.setAttribute("aria-label","Type");
        kd.onchange=function(){patchSub(s.id,{kind:kd.value})};
        var dd=input("date",s.due||"");dd.className="ps-date";
        dd.title="Due date for this item";
        dd.onchange=function(){patchSub(s.id,{due:dd.value})};
        var op=ownerPicker(s.owner,function(id){patchSub(s.id,{owner:id})});
        op.classList.add("ps-own");
        two.appendChild(pf2);two.appendChild(kd);two.appendChild(dd);two.appendChild(op);
        r.appendChild(two);
        sbox.appendChild(r);
        if(S.placeFor===s.id&&depth<MAXDEPTH-1){
          sbox.appendChild(placementPicker(s,function(nodes){
            a.subtasks=nodes.reduce(function(acc,n){return addChild(acc,s.id,n)},a.subtasks||[]);
            S.placeFor=null;
            persistSubs(a);render();drawSubs(null);
            toast("Added "+nodes.length+" placement"+(nodes.length>1?"s":""));
          },function(){drawSubs(null)}));
        }
        if(group)psNodes(ch,depth+1);
      });
    };
    drawSubs=function(focusKey){
      clear(sbox);
      psNodes(a.subtasks||[],0);
      var ai=el("input");ai.type="text";ai.className="sub-add";
      ai.placeholder="+ Add an item and press Enter";
      ai.setAttribute("data-pfocus","add");
      ai.onkeydown=function(e){
        if(e.key!=="Enter")return;
        e.preventDefault();
        var v=ai.value.trim();if(!v)return;
        a.subtasks=(a.subtasks||[]).concat([newNode(v,"")]);
        persistSubs(a);render();drawSubs("add");
      };
      sbox.appendChild(ai);
      if(writable()){
        var def=STEPS[d.type]||["Script","Edit","Review"];
        var tb=el("button","tpl-btn","+ Add the usual breakdown"+(d.type?" for "+d.type.toLowerCase():""));
        tb.type="button";
        tb.title=def.map(function(x){return typeof x==="string"?x:x.t}).join(" · ");
        tb.onclick=function(){
          var have={};
          (a.subtasks||[]).forEach(function(s){have[(s.title||"").toLowerCase()]=1});
          var fresh=buildSteps(def).filter(function(n){return !have[(n.title||"").toLowerCase()]});
          if(!fresh.length){toast("That breakdown is already here");return}
          a.subtasks=(a.subtasks||[]).concat(fresh);
          persistSubs(a);render();drawSubs(null);
          toast("Added "+fresh.length+" item"+(fresh.length>1?"s":""));
        };
        sbox.appendChild(tb);
      }
      if(!writable()){
        var ff=sbox.querySelectorAll("input,button,select");
        for(var i=0;i<ff.length;i++)ff[i].disabled=true;
      }
      if(focusKey){
        var f=sbox.querySelector('[data-pfocus="'+focusKey+'"]');
        if(f)f.focus();
      }
      paintNames();
    };
    drawSubs(null);
    body.appendChild(field("Subtasks",sbox,"A step carries its own type, owner and date. Add as many thumbnails, community messages or reminders as this one needs."));
  }else{
    body.appendChild(field("Subtasks",el("div","sub-empty","Create the activity first, then reopen it to break the work into subtasks.")));
  }
  body.appendChild(scriptField);

  var foot=el("div","p-foot");
  var err=el("div","hint err");err.hidden=true;
  var save=el("button","btn btn-p",isNew?"Create activity":"Save changes");
  save.onclick=function(){submit()};
  if(!isNew&&writable()){
    var del=el("button","btn btn-d","Delete");
    var confirmRow=null;
    del.onclick=function(){
      if(confirmRow){return}
      confirmRow=el("div");confirmRow.style.cssText="display:flex;gap:8px;align-items:center;width:100%";
      confirmRow.appendChild(el("span","hint err","Delete this activity?"));
      var yes=el("button","btn btn-d","Delete");
      yes.style.marginLeft="auto";
      yes.onclick=function(){
        db.doc("activities/"+a.id).delete().then(function(){closeOverlay();toast("Activity deleted")})
          .catch(function(e){showErr(e)});
      };
      var no=el("button","btn btn-o","Cancel");
      no.onclick=function(){confirmRow.remove();confirmRow=null};
      confirmRow.appendChild(yes);confirmRow.appendChild(no);
      foot.appendChild(confirmRow);
    };
    foot.appendChild(del);
  }
  save.classList.add("sp");
  foot.appendChild(save);
  p.appendChild(foot);
  body.appendChild(err);

  function showErr(e){err.hidden=false;err.textContent=msgFor(e);save.disabled=false;save.textContent=isNew?"Create activity":"Save changes"}
  function validate(){
    var ok=d.title.trim()&&d.campaignId&&d.dueDate;
    save.disabled=!ok||!writable();
    var c=campById(d.campaignId);
    if(c&&d.dueDate&&(d.dueDate<c.startDate||d.dueDate>c.endDate)){
      rangeHint.hidden=false;
      rangeHint.textContent="Outside the campaign window ("+fmtShort(c.startDate)+" → "+fmtLong(c.endDate)+"). Saved anyway.";
    }else rangeHint.hidden=true;
    return ok;
  }
  function submit(){
    if(!validate())return;
    save.disabled=true;save.textContent="Saving…";err.hidden=true;
    var payload={title:d.title.trim(),campaignId:d.campaignId,type:d.type,angle:d.angle,cta:d.cta,
      platforms:d.platforms,dueDate:d.dueDate,dueTime:d.dueTime,owner:d.owner,
      description:d.description.trim(),keywords:d.keywords,script:d.script};
    if(isNew){
      payload.status="Not started";payload.assets={};payload.subtasks=[];
      payload.createdAt=new Date().toISOString();
      db.collection("activities").add(payload).then(function(){closeOverlay();toast("Activity added to "+fmtLong(d.dueDate))})
        .catch(showErr);
    }else{
      db.doc("activities/"+a.id).update(payload).then(function(){closeOverlay();toast("Changes saved")}).catch(showErr);
    }
  }
  validate();
  overlay(p);
}

function setField(id,patch,ok){
  db.doc("activities/"+id).update(patch).then(ok).catch(function(e){toast(msgFor(e))});
}
function msgFor(e){
  var c=e&&e.code;
  if(c==="permission-denied")return "You don't have permission to change this.";
  if(c==="unauthenticated")return "Your session expired. Reload the page to sign in again.";
  if(c==="unavailable")return "Can't reach the database. Check your connection — your change will send when it's back.";
  if(c==="resource-exhausted")return "Too many changes at once. Wait a moment and try again.";
  if(c==="invalid-argument"||c==="failed-precondition")return "Something about that record is invalid.";
  if(c==="not-found")return "That record no longer exists. Someone may have deleted it.";
  return "Couldn't save. Try again in a moment.";
}

/* ─── campaign modal ────────────────────────────────────── */
function openCampaign(c){
  if(!writable())return;
  var isNew=!c;
  var d={name:c?c.name:"",goal:c?(c.goal||""):"",startDate:c?c.startDate:TODAY,
    endDate:c?c.endDate:addDays(TODAY,14),owner:c?(c.owner||""):"",status:c?c.status:"Planning"};
  var m=el("div","modal");m.setAttribute("role","dialog");m.setAttribute("aria-label",isNew?"New campaign":"Edit campaign");
  var head=el("div","p-head");head.appendChild(el("h2",null,isNew?"New campaign":"Edit campaign"));
  var xb=el("button","x","✕");xb.onclick=closeOverlay;head.appendChild(xb);m.appendChild(head);
  var body=el("div","p-body");m.appendChild(body);

  var nm=input("text",d.name,"e.g. NORCET 11 launch push");nm.id="camp-name";
  nm.oninput=function(){d.name=nm.value;validate()};
  body.appendChild(field("Campaign name",nm));

  var gl=input("text",d.goal,"What is this campaign for?");gl.id="camp-goal";
  gl.oninput=function(){d.goal=gl.value};
  body.appendChild(field("Goal (optional)",gl));

  var two=el("div","f2");
  var sd=input("date",d.startDate);sd.id="camp-start";
  var ed=input("date",d.endDate);ed.id="camp-end";
  two.appendChild(field("Start date",sd));
  var ew=field("End date",ed);two.appendChild(ew);
  body.appendChild(two);
  var derr=el("div","hint err");derr.hidden=true;body.appendChild(derr);
  sd.oninput=function(){d.startDate=sd.value;validate()};
  ed.oninput=function(){d.endDate=ed.value;validate()};

  body.appendChild(field("Owner",ownerPicker(d.owner,function(id){d.owner=id})));

  var sp=el("div","pills");
  CSTATUS.forEach(function(st){
    var b=el("button","pill",st);b.type="button";
    b.setAttribute("aria-pressed",d.status===st);
    b.onclick=function(){d.status=st;var all=sp.querySelectorAll("button");
      for(var i=0;i<all.length;i++)all[i].setAttribute("aria-pressed",all[i].textContent===st)};
    sp.appendChild(b);
  });
  body.appendChild(field("Status",sp));

  var foot=el("div","p-foot");
  var err=el("div","hint err");err.hidden=true;body.appendChild(err);
  var save=el("button","btn btn-p sp",isNew?"Create campaign":"Save changes");
  if(!isNew){
    var n=S.activities.filter(function(a){return a.campaignId===c.id}).length;
    var del=el("button","btn btn-d","Delete"),crow=null;
    del.onclick=function(){
      if(crow)return;
      crow=el("div");crow.style.cssText="display:flex;gap:8px;align-items:center;width:100%;flex-wrap:wrap";
      crow.appendChild(el("span","hint err",n?"Delete this campaign and its "+n+" activities?":"Delete this campaign?"));
      var yes=el("button","btn btn-d","Delete");yes.style.marginLeft="auto";
      yes.onclick=function(){
        yes.disabled=true;yes.textContent="Deleting…";
        var kids=S.activities.filter(function(a){return a.campaignId===c.id});
        var chain=Promise.resolve();
        kids.forEach(function(a){chain=chain.then(function(){return db.doc("activities/"+a.id).delete()})});
        chain.then(function(){return db.doc("campaigns/"+c.id).delete()})
          .then(function(){closeOverlay();toast("Campaign deleted")})
          .catch(function(e){err.hidden=false;err.textContent=msgFor(e);yes.disabled=false;yes.textContent="Delete"});
      };
      var no=el("button","btn btn-o","Cancel");no.onclick=function(){crow.remove();crow=null};
      crow.appendChild(yes);crow.appendChild(no);foot.appendChild(crow);
    };
    foot.appendChild(del);
  }
  save.onclick=function(){submit()};
  foot.appendChild(save);m.appendChild(foot);

  function validate(){
    var bad=d.endDate&&d.startDate&&d.endDate<d.startDate;
    derr.hidden=!bad;
    if(bad)derr.textContent="End date can't be before the start date.";
    save.disabled=!(d.name.trim()&&d.startDate&&d.endDate)||bad;
    return !save.disabled;
  }
  function submit(){
    if(!validate())return;
    save.disabled=true;save.textContent="Saving…";err.hidden=true;
    var payload={name:d.name.trim(),goal:d.goal.trim(),startDate:d.startDate,endDate:d.endDate,
      owner:d.owner,status:d.status};
    var done=function(){closeOverlay();toast(isNew?"Campaign created":"Campaign updated")};
    var fail=function(e){err.hidden=false;err.textContent=msgFor(e);save.disabled=false;save.textContent=isNew?"Create campaign":"Save changes"};
    if(isNew){
      payload.colour=CCOLORS[S.campaigns.length%CCOLORS.length];
      payload.createdAt=new Date().toISOString();
      db.collection("campaigns").add(payload).then(done).catch(fail);
    }else{
      db.doc("campaigns/"+c.id).update(payload).then(done).catch(fail);
    }
  }
  validate();
  overlay(m);
}

/* ─── shell wiring ──────────────────────────────────────── */
var now=new Date();S.y=now.getFullYear();S.m=now.getMonth();S.anchor=TODAY;
function setPhone(){var was=phone;phone=window.matchMedia("(max-width:720px)").matches;S.dayMax=phone?99:3;return was!==phone}
setPhone();
window.addEventListener("resize",function(){if(setPhone())render()});

function step(n){
  if(S.calView==="week"){S.anchor=addDays(weekStart(S.anchor||TODAY),n*7)}
  else{S.m+=n;if(S.m<0){S.m=11;S.y--}if(S.m>11){S.m=0;S.y++}}
  clearDayExpand();render();
}

render();

/* ─── data: Firestore ───────────────────────────────────── */
var ALLOWED_DOMAIN="nprep.in";
var pending=0,timer=null,auth=null,subs=[];
function settled(){
  pending--;
  if(pending<=0){S.loading=false;S.stale=false;if(timer){clearTimeout(timer);timer=null}render()}
}
function sortCampaigns(){S.campaigns.sort(function(a,b){return a.createdAt<b.createdAt?-1:1})}
function emailAllowed(e){
  e=String(e||"").toLowerCase();
  return e.slice(-(ALLOWED_DOMAIN.length+1))==="@"+ALLOWED_DOMAIN;
}

/* The sign-in screen. One job, one button. */
function showGate(kind,extra){
  var g=$("gate");clear(g);g.hidden=false;
  var c=el("div","gate-card");
  c.appendChild(el("i","gate-mark"));
  if(kind==="config"){
    c.appendChild(el("h1",null,"One step left"));
    c.appendChild(el("p",null,"This portal needs a Firebase project to hold the team's plan. "
      +"Create one, copy its web config, and paste it into firebase-config.js in the repository."));
    var rd=el("a","btn btn-o","Firebase console");
    rd.href="https://console.firebase.google.com/";rd.target="_blank";rd.rel="noopener";
    c.appendChild(rd);
  }else if(kind==="denied"){
    c.appendChild(el("h1",null,"Not an NPrep account"));
    c.appendChild(el("p",null,(extra||"That account")+" isn't on "+ALLOWED_DOMAIN
      +", so it can't open the content calendar."));
    var out=el("button","btn btn-o","Try another account");
    out.onclick=function(){auth.signOut().then(function(){location.reload()})};
    c.appendChild(out);
  }else{
    c.appendChild(el("h1",null,"Content calendar"));
    c.appendChild(el("p",null,"Sign in with your NPrep account to see what the team is shipping."));
    var b=el("button","btn btn-p","Sign in with Google");
    b.onclick=function(){
      var p=new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({hd:ALLOWED_DOMAIN,prompt:"select_account"});
      auth.signInWithPopup(p).catch(function(e){
        if(e&&(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment"))
          auth.signInWithRedirect(p);
        else if(e&&e.code!=="auth/popup-closed-by-user"&&e.code!=="auth/cancelled-popup-request")
          toast(e&&e.message?e.message:"Couldn't sign in.");
      });
    };
    c.appendChild(b);
  }
  g.appendChild(c);
}

function startData(){
  subs.forEach(function(f){try{f()}catch(e){}});subs=[];
  S.loading=true;S.err=null;pending=3;render();
  if(timer)clearTimeout(timer);
  timer=setTimeout(function(){if(S.loading){S.stale=true;render()}},10000);
  var onErr=function(e){
    S.loading=false;S.err=msgFor(e);
    if(timer){clearTimeout(timer);timer=null}
    render();
  };
  subs.push(db.collection("campaigns").onSnapshot(function(snap){
    S.campaigns=snap.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});
    sortCampaigns();
    if(!snap.metadata.fromCache)settled();else render();
  },onErr));
  subs.push(db.collection("activities").onSnapshot(function(snap){
    S.activities=snap.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});
    if(!snap.metadata.fromCache)settled();else render();
  },onErr));
  /* the team roster, so owners resolve to real names */
  subs.push(db.collection("users").onSnapshot(function(snap){
    S.team=snap.docs.map(function(d){
      var v=d.data()||{};
      return {id:d.id,name:v.name||v.email||"Teammate"};
    });
    S.team.forEach(function(p){S.profiles[p.id]={name:p.name}});
    if(!snap.metadata.fromCache)settled();else render();
  },function(){settled()}));
}

/* Stands in for the identity the artifact runtime used to provide. */
function makeUser(){
  return {
    profiles:function(ids){
      var out={};
      (ids||[]).forEach(function(id){
        var p=S.profiles[id];
        out[id]={id:id,name:(p&&p.name)||"",isMe:!!(S.me&&S.me.id===id)};
      });
      return Promise.resolve(out);
    },
    search:function(q){
      q=String(q||"").toLowerCase().trim();
      var list=S.team.slice().sort(function(a,b){return a.name>b.name?1:-1});
      if(q)list=list.filter(function(p){return p.name.toLowerCase().indexOf(q)>=0});
      return Promise.resolve(list.slice(0,8));
    },
    can:function(){return Promise.resolve(true)}
  };
}

$("who").onclick=function(){if(auth)auth.signOut()};

(function boot(){
  var cfg=window.FIREBASE_CONFIG;
  if(!cfg||!cfg.apiKey||String(cfg.apiKey).indexOf("PASTE_")===0){
    S.loading=false;render();showGate("config");return;
  }
  if(typeof firebase==="undefined"){
    S.loading=false;S.err="The Firebase libraries didn't load. Check your connection and reload.";
    render();return;
  }
  firebase.initializeApp(cfg);
  auth=firebase.auth();
  db=firebase.firestore();
  /* keeps the last view readable offline and makes reloads instant */
  try{db.enablePersistence({synchronizeTabs:true}).catch(function(){})}catch(e){}
  auth.onAuthStateChanged(function(u){
    if(!u){
      subs.forEach(function(f){try{f()}catch(e){}});subs=[];
      S.me=null;S.campaigns=[];S.activities=[];S.team=[];S.loading=true;
      render();showGate("signin");return;
    }
    if(!emailAllowed(u.email)){S.me=null;render();showGate("denied",u.email);return;}
    $("gate").hidden=true;
    S.me={id:u.uid,name:u.displayName||u.email,email:u.email};
    S.canWrite=true;
    U=makeUser();
    db.collection("users").doc(u.uid).set({
      name:u.displayName||"",email:u.email||"",seenAt:new Date().toISOString()
    },{merge:true}).catch(function(){});
    startData();
  });
})();
})();
