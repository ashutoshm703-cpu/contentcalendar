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
   angles:["Academic","Live class","Vacancy","High yield","GOLD lecture — Edition 6.5","Strategy video","Testimonial video","Opinion video"]},
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
var S={campaigns:[],activities:[],view:"calendar",calView:"next7",anchor:"",y:0,m:0,
  filters:{campaign:"",platform:"",format:"",owner:"",status:""},
  loading:true,stale:false,err:null,canWrite:null,open:null,expanded:{},focusAdd:null,lastAdd:{},
  placeFor:null,showFilters:false,me:null,team:[],
  profiles:{},dayMax:3,query:"",focusDay:"",templates:[],templateError:"",templatesLoading:true,
  sopRules:[],sopReady:false};
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
    if(!matchesSearch(a))return false;
    if(f.campaign&&a.campaignId!==f.campaign)return false;
    if(f.status&&a.status!==f.status)return false;
    if(f.format&&a.type!==f.format)return false;
    if(f.owner&&a.owner!==f.owner)return false;
    if(f.platform&&(a.platforms||[]).indexOf(f.platform)<0)return false;
    return true;
  });
}
function matchesSearch(a){
  var q=S.query.trim().toLowerCase();
  if(!q)return true;
  var c=campById(a.campaignId);
  function subtext(nodes){return (nodes||[]).map(function(n){return [n.title,n.description,subtext(kids(n))].join(" ")}).join(" ")}
  return [a.title,a.type,a.angle,a.description,(a.keywords||[]).join(" "),c&&c.name,subtext(a.subtasks)].join(" ").toLowerCase().indexOf(q)>=0;
}
function campaignMatches(c){
  var f=S.filters,q=S.query.trim().toLowerCase();
  if(f.campaignStatus&&c.status!==f.campaignStatus)return false;
  if(f.owner&&c.owner!==f.owner)return false;
  return !q||[c.name,c.goal].join(" ").toLowerCase().indexOf(q)>=0||S.activities.some(function(a){return a.campaignId===c.id&&matchesSearch(a)});
}
function resetFilterValues(){Object.keys(S.filters).forEach(function(k){S.filters[k]=""})}
function resetFilters(){resetFilterValues();S.query="";render()}
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
  clear($("toasts"));var t=el("div","toast",msg);t.setAttribute("role","status");$("toasts").appendChild(t);
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
    if(S.query||activeFilters().length){var matches=S.campaigns.filter(campaignMatches).length;return matches+" matching "+(matches===1?"campaign":"campaigns")}
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
  var keys=S.view==="campaigns"?["owner","campaignStatus"]:["campaign","platform","format","owner","status"];
  return keys.filter(function(k){return S.filters[k]});
}
function renderHead(){
  var h=$("head");clear(h);
  var cal=S.view==="calendar";
  var box=el("div","phead");
  var heading=el("div","pheading"),intro=el("div");
  intro.appendChild(el("p","eyebrow",cal?"Publishing schedule":"Campaign planning"));
  intro.appendChild(el("h1",null,headTitle()));
  intro.appendChild(el("p","psub",headSub()));heading.appendChild(intro);
  var add=el("button","btn btn-p","+ "+(!cal?"New campaign":"New activity"));add.id="new-act";
  add.hidden=S.loading||!S.me||!writable()||!S.campaigns.length;
  add.onclick=!cal?function(){openCampaign(null)}:function(){openActivity(null,S.calView==="next7"?S.focusDay:undefined)};
  heading.appendChild(add);box.appendChild(heading);
  if(S.me&&!S.loading&&writable()){
    var rules=el("button","text-button sop-manage","SOP library");rules.onclick=openSopRules;heading.appendChild(rules);
  }
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
  if(S.campaigns.length){
  var search=el("div","searchbox");
  var searchIn=input("search",S.query,cal?"Search activities…":"Search campaigns…");
  searchIn.id="calendar-search";searchIn.setAttribute("aria-label",cal?"Search activities":"Search campaigns");
  searchIn.oninput=function(){S.query=searchIn.value;renderMain();clearSearch.hidden=!S.query};
  var clearSearch=el("button","search-clear","×");clearSearch.setAttribute("aria-label","Clear search");clearSearch.hidden=!S.query;
  clearSearch.onclick=function(){S.query="";searchIn.value="";clearSearch.hidden=true;renderMain();searchIn.focus()};
  search.appendChild(searchIn);search.appendChild(clearSearch);ctl.appendChild(search);
  var fb=el("button","ghost"+(S.showFilters?" on":""),"Filters"+(activeFilters().length?" · "+activeFilters().length:""));
  fb.setAttribute("aria-expanded",String(S.showFilters));fb.setAttribute("aria-controls","calendar-filters");
  fb.onclick=function(){S.showFilters=!S.showFilters;render()};
  ctl.appendChild(fb);
  activeFilters().forEach(function(k){
    var ch=el("div","fchip");
    ch.appendChild(el("b",null,filterLabel(k,S.filters[k])));
    var x=el("button",null,"✕");x.setAttribute("aria-label","Clear "+filterLabel(k,S.filters[k])+" filter");
    x.onclick=function(){S.filters[k]="";render()};
    ch.appendChild(x);ctl.appendChild(ch);
  });
  if(activeFilters().length){var clearAll=el("button","text-button","Clear filters");clearAll.onclick=resetFilters;ctl.appendChild(clearAll)}
  }
  if(S.campaigns.length)box.appendChild(ctl);
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
  var f=el("div","fbar");f.id="calendar-filters";
  if(S.view==="campaigns"){
    f.appendChild(sel("f-cstat","Any campaign status",CSTATUS.map(function(s){return[s,s]}),S.filters.campaignStatus,
      function(v){S.filters.campaignStatus=v;render()}));
    var seen={},owners=S.campaigns.filter(function(c){if(!c.owner||seen[c.owner])return false;seen[c.owner]=true;return true});
    if(owners.length)f.appendChild(sel("f-own","Any campaign owner",owners.map(function(c){return[c.owner,(S.profiles[c.owner]&&S.profiles[c.owner].name)||"Teammate"]}),S.filters.owner,
      function(v){S.filters.owner=v;render()}));
    return f;
  }
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
  var title=el("span","t");title.appendChild(el("span",null,a.title));b.appendChild(title);
  var m=el("div","m");
  m.appendChild(el("i","dot s"+statusIdx(a.status)));
  m.appendChild(el("span","status-label",a.status));
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
    var t=el("button","wday"+(key===TODAY?" today":"")+(items.length?"":" empty")+(S.focusDay===key?" selected":""));
    t.setAttribute("aria-pressed",String(S.focusDay===key));
    t.setAttribute("aria-label","Show activities for "+fmtLong(key));
    t.title=fmtLong(key)+" — "+(items.length?items.length+" scheduled":"nothing scheduled")
      +". Select to view this day.";
    t.appendChild(el("span","wd",DOW[dowIdx(key)]));
    t.appendChild(el("b",null,String(parseISO(key).getDate())));
    t.appendChild(el("span","wn",items.length?String(items.length):"—"));
    t.onclick=function(k){return function(){S.focusDay=S.focusDay===k?"":k;render()}}(key);
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
        r.appendChild(subtaskDeadline(it.a,x.n));
        var subTitle=el("button","sub-t sub-title-button",x.n.title);
        subTitle.setAttribute("aria-label","Edit subtask: "+x.n.title);
        subTitle.onclick=function(){openSubtask(it.a,x.n)};r.appendChild(subTitle);
        if(writable())r.appendChild(subtaskEditButton(it.a,x.n));
        var mt=el("span","sub-meta");
        if(x.path)mt.appendChild(el("span","sub-kind",x.path));
        if(x.n.platform)mt.appendChild(platPill(x.n.platform));
        if(x.n.kind)mt.appendChild(el("span","sub-kind",x.n.kind));
        if(x.n.owner)mt.appendChild(uname(x.n.owner));
        r.appendChild(mt);
        if(x.n.description)r.appendChild(el("p","sub-description",x.n.description));
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
    var selected=S.focusDay&&S.focusDay>=r[0]&&S.focusDay<=r[1]?S.focusDay:"";
    if(selected){
      var dayHead=el("div","day-focus");dayHead.appendChild(el("h2",null,fmtLong(selected)));
      var allDays=el("button","text-button","Show all 7 days");allDays.onclick=function(){S.focusDay="";render()};dayHead.appendChild(allDays);box.appendChild(dayHead);
    }else{var od2=overdueBlock();if(od2)box.appendChild(od2)}
    if(!renderFocus(box,selected||r[0],selected||r[1],true)){
      var empty=el("div","no-results");empty.appendChild(el("h2",null,selected?"A clear day":"Nothing scheduled yet"));
      empty.appendChild(el("p",null,selected?"No activities or checklist items are due on this day.":"Add an activity to start planning the week ahead."));
      if(writable()){var add=el("button","btn btn-o","+ Add activity");add.onclick=function(){openActivity(null,selected||TODAY)};empty.appendChild(add)}
      box.appendChild(empty);
    }
  }else if(phone){
    res=agendaList(r[0],r[1],false);box.appendChild(res.node);
    if(!res.total)box.appendChild(el("div","note","Nothing scheduled in "
      +(v==="week"?"this week":MONTHS[S.m]+" "+S.y)+". Use + New activity to add the first one."));
  }else if(v==="week"){
    res=dayGrid(r[0],7,"232px");box.appendChild(res.node);
    if(!res.total)box.appendChild(el("div","note","Nothing scheduled this week. Choose + on a day to add an activity."));
  }else{
    var first=new Date(S.y,S.m,1),off=(first.getDay()+6)%7,ndays=new Date(S.y,S.m+1,0).getDate();
    res=dayGrid(addDays(iso(first),-off),Math.ceil((off+ndays)/7)*7,null);
    box.appendChild(res.node);
    if(!res.total)box.appendChild(el("div","note","Nothing scheduled in "+MONTHS[S.m]+" "+S.y+". Choose + on a day to add an activity."));
  }
  main.appendChild(box);
}

/* ─── render: campaigns ─────────────────────────────────── */
function renderCampaigns(main){
  if(S.loading){var g=el("div","camps");for(var i=0;i<3;i++){var s=el("div","skel");s.style.height="178px";g.appendChild(s)}main.appendChild(g);return}
  if(!S.campaigns.length){main.appendChild(emptyHero());return}
  var wrap=el("div","camps");
  var filtered=S.campaigns.filter(campaignMatches);
  if(!filtered.length){main.appendChild(noResults("No matching campaigns","Try another search or clear your filters."));return}
  filtered.slice().sort(function(a,b){return a.startDate<b.startDate?1:-1}).forEach(function(c,n){
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
    var ed=el("button","edit-campaign","Edit");ed.setAttribute("aria-label","Edit "+c.name);
    ed.onclick=function(){openCampaign(c)};
    if(writable())top.appendChild(ed);
    if(writable()){
      var plan=el("button","edit-campaign ai-launch","AI plan");plan.setAttribute("aria-label","AI plan for "+c.name);plan.onclick=function(){openCampaignPlanner(c)};top.appendChild(plan);
      var duplicate=el("button","edit-campaign","Duplicate");duplicate.setAttribute("aria-label","Duplicate "+c.name);
      duplicate.onclick=function(){openDuplicate(c,true,false)};top.appendChild(duplicate);
    }
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
      var tb=el("button","c-toggle");tb.setAttribute("aria-expanded",String(open));
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
        if(writable()){
          var dup=el("button","edit-campaign","Duplicate");dup.setAttribute("aria-label","Duplicate activity "+a.title);
          dup.onclick=function(){openDuplicate(a,false,false)};r.appendChild(dup);
        }
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
  return {id:sid(),title:title,description:"",done:false,owner:"",due:"",kind:kind||"",platform:plat||"",type:"",angle:"",children:[]};
}
function nodeById(nodes,id){
  for(var i=0;i<(nodes||[]).length;i++){
    if(nodes[i].id===id)return nodes[i];
    var found=nodeById(kids(nodes[i]),id);if(found)return found;
  }
  return null;
}
function platAbbr(p){
  for(var i=0;i<PLATFORMS.length;i++)if(PLATFORMS[i][0]===p)return PLATFORMS[i][1];
  return p;
}
function platPill(p){
  var s=el("span","sub-plat",platAbbr(p));s.title=p;return s;
}
function subtaskDeadline(a,s,onSaved){
  var late=!!s.due&&s.due<TODAY&&!nodeDone(s);
  var date=s.due?(s.due.slice(0,4)===TODAY.slice(0,4)?fmtShort(s.due):fmtLong(s.due)):"";
  var deadline=el(writable()?"button":"span","sub-deadline"+(late?" overdue":"")+(!s.due?" unset":""),s.due?date:"Set deadline");
  deadline.title=s.due?"Deadline: "+fmtLong(s.due)+(late?" · overdue":""):"No deadline set";
  if(writable()){
    deadline.setAttribute("aria-label",(s.due?"Change deadline for ":"Set deadline for ")+(s.title||"Untitled subtask")+(s.due?": "+fmtLong(s.due):""));
    deadline.onclick=function(){openSubtask(a,s,onSaved,true)};
  }else if(!s.due)deadline.textContent="No deadline";
  return deadline;
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
  return wq;
}
function saveSubs(a,arr){a.subtasks=arr;var saved=persistSubs(a);render();return saved}

/* Copies always have their own IDs and start with a fresh checklist. */
function copyNodes(nodes,offset){
  return (nodes||[]).map(function(n){var copy=Object.assign({},n,{id:sid(),done:false,
    due:n.due?addDays(n.due,offset||0):"",children:copyNodes(kids(n),offset)});
    if(n.sopSource)copy.sopSource=Object.assign({},n.sopSource,{baseline:Object.assign({},n.sopSource.baseline,{due:n.sopSource.baseline.due?addDays(n.sopSource.baseline.due,offset||0):""})});
    return copy;
  });
}
function copyIndependentSubtask(node){
  function detach(n,active){if(n.sopSource&&!active[n.sopSource.ruleId])delete n.sopSource;
    var next=Object.assign({},active);(n.appliedSopRules||[]).forEach(function(id){next[id]=true});n.children=kids(n).map(function(child){return detach(child,next)});return n}
  return detach(copyNodes([node])[0],{});
}
function insertAfter(nodes,id,copy){
  var out=[];
  (nodes||[]).forEach(function(n){
    out.push(kids(n).length?Object.assign({},n,{children:insertAfter(kids(n),id,copy)}):n);
    if(n.id===id)out.push(copy);
  });return out;
}
function treeDepth(nodes){return (nodes||[]).reduce(function(max,n){return Math.max(max,1+treeDepth(kids(n)))},0)}
function copyActivity(a,date,campaignId){
  var copy=Object.assign({},a);delete copy.id;
  copy.campaignId=campaignId||a.campaignId;copy.dueDate=date;copy.status="Not started";copy.assets={};
  copy.subtasks=copyNodes(a.subtasks,daysBetween(a.dueDate,date));copy.createdAt=new Date().toISOString();
  delete copy.repeat;return copy;
}
function repeatDate(start,unit,index){
  if(unit!=="monthly")return addDays(start,index*(unit==="weekly"?7:1));
  var d=parseISO(start),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+index);
  d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return iso(d);
}
function repeatForm(host,start,onChange,defaultUnit){
  var unit=dropdown([["","Does not repeat"],["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"]],defaultUnit||""),
    count=input("number","4"),detail=el("div","repeat-detail"),hint=el("p","hint");
  count.min="2";count.max="52";count.step="1";
  host.appendChild(field("Repeat",unit));detail.appendChild(field("Total occurrences (2–52)",count));
  detail.appendChild(hint);host.appendChild(detail);
  function read(){return {unit:unit.value,count:unit.value?Number(count.value):1}}
  function valid(){var r=read();return !r.unit||(Number.isInteger(r.count)&&r.count>=2&&r.count<=52)}
  function refresh(){
    detail.hidden=!unit.value;
    hint.textContent=valid()&&start()?"Creates all occurrences now, through "+fmtLong(repeatDate(start(),unit.value,read().count-1))+". Each can be edited independently.":"Enter a whole number from 2 to 52.";
    if(onChange)onChange();
  }
  unit.onchange=refresh;count.oninput=refresh;refresh();
  return {read:read,valid:valid,refresh:refresh};
}
function writeActivityCopies(payload,repeat){
  var batch=db.batch(),series=sid();
  for(var i=0;i<repeat.count;i++){
    var copy=copyActivity(payload,repeatDate(payload.dueDate,repeat.unit,i));
    if(repeat.unit)copy.repeat={seriesId:series,unit:repeat.unit,index:i,count:repeat.count};
    batch.set(db.collection("activities").doc(),copy);
  }return batch.commit();
}
/* A small child dialog preserves any unfinished activity form underneath. */
function actionDialog(title,intro){
  var node=el("div","modal"),head=el("div","p-head"),body=el("div","p-body"),foot=el("div","p-foot"),error=el("p","hint err");
  node.setAttribute("role","dialog");node.setAttribute("aria-label",title);head.appendChild(el("h2",null,title));
  var close=el("button","x","✕");close.onclick=closeOverlay;head.appendChild(close);node.appendChild(head);
  body.appendChild(el("p","form-intro",intro));node.appendChild(body);error.hidden=true;body.appendChild(error);
  var cancel=el("button","btn btn-o","Cancel");cancel.onclick=closeOverlay;foot.appendChild(cancel);node.appendChild(foot);
  return {node:node,body:body,foot:foot,error:error,close:close,cancel:cancel};
}
function runDialogSave(ui,button,work,done){
  var state=overlayState;if(state.busy)return;var controls=Array.from(ui.node.querySelectorAll("input,textarea,select,button")).map(function(n){return {node:n,disabled:n.disabled}});state.busy=true;ui.error.hidden=true;
  controls.forEach(function(item){item.node.disabled=true});
  Promise.resolve().then(work).then(function(result){state.busy=false;closeOverlay(true);done(result)}).catch(function(e){
    state.busy=false;controls.forEach(function(item){item.node.disabled=item.disabled});
    ui.error.textContent=e.userMessage||msgFor(e);ui.error.hidden=false;
  });
}
function openDuplicate(source,campaign,repeating){
  if(!writable())return;
  var ui=actionDialog(repeating?"Repeat activity":campaign?"Duplicate campaign":"Duplicate activity",
    "Copies saved details and all subtasks, keeps owners, and resets progress. Dates move with the new "+(campaign?"start date.":"due date."));
  var name=input("text",(campaign?source.name:source.title)+(repeating?"":" (copy)")),date=input("date",campaign?source.startDate:repeating?addDays(source.dueDate,7):source.dueDate);
  ui.body.appendChild(field(campaign?"Campaign name *":"Activity title *",name));ui.body.appendChild(field(campaign?"Start date *":"First due date *",date));
  var repeat=null,save=el("button","btn btn-p sp",repeating?"Create repeats":"Duplicate");
  if(repeating)repeat=repeatForm(ui.body,function(){return date.value},function(){if(repeat)validate()},"weekly");
  var camp=null;
  if(!campaign){camp=dropdown(S.campaigns.map(function(c){return[c.id,c.name]}),source.campaignId);ui.body.appendChild(field("Campaign *",camp));camp.onchange=validate}
  function validate(){save.disabled=!name.value.trim()||!date.value||(repeat&&!repeat.valid())||(camp&&!camp.value)}
  name.oninput=validate;date.oninput=function(){if(repeat)repeat.refresh();validate()};
  save.onclick=function(){
    validate();if(save.disabled)return;
    runDialogSave(ui,save,function(){return wq.then(function(){
      var current=campaign?(campById(source.id)||source):(S.activities.find(function(a){return a.id===source.id})||source);
      if(!campaign){var copy=copyActivity(current,date.value,camp.value);copy.title=name.value.trim();return writeActivityCopies(copy,repeat?repeat.read():{unit:"",count:1})}
      var acts=S.activities.filter(function(a){return a.campaignId===source.id});
      if(acts.length>499){var e=new Error();e.userMessage="This campaign has too many activities to duplicate at once (maximum 499).";throw e}
      var batch=db.batch(),ref=db.collection("campaigns").doc(),offset=daysBetween(current.startDate,date.value),copy=Object.assign({},current);
      delete copy.id;copy.name=name.value.trim();copy.startDate=date.value;copy.endDate=addDays(current.endDate,offset);copy.status="Planning";copy.createdAt=new Date().toISOString();
      batch.set(ref,copy);acts.forEach(function(a){batch.set(db.collection("activities").doc(),copyActivity(a,addDays(a.dueDate,offset),ref.id))});
      return batch.commit();
    })},function(){toast(repeating?"Recurring activities created":campaign?"Campaign and activities duplicated":"Activity duplicated")});
  };
  ui.foot.appendChild(save);validate();overlay(ui.node,null,true);
}
/* One library owns SOP names, conditions and editable checklists. Legacy groups
   remain visible here until edited; no existing checklist is deleted. */
var DEFAULT_SOP={id:"builtin-youtube-long-form",name:"YouTube long form SOP",platform:"YouTube",format:"Long form",angle:"",enabled:true,source:"suggested"};
function normalizeSopName(name){return String(name||"").normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase()}
function sopNameKey(name){return "n-"+encodeURIComponent(normalizeSopName(name))}
function allSopRules(){
  var rules=S.sopRules.slice();
  if(!rules.some(function(r){return r.id===DEFAULT_SOP.id}))rules.unshift(DEFAULT_SOP);
  S.templates.filter(function(t){return !t.sopId&&!t.archived}).forEach(function(t){
    rules.push(Object.assign({},t,{id:"legacy-"+t.id,legacyId:t.id,enabled:false,platform:t.platform||"",format:t.format||"",angle:t.angle||""}));
  });return rules.filter(function(r){return !r.archived});
}
function sopNameTaken(name,id){return allSopRules().some(function(r){return r.id!==id&&normalizeSopName(r.name)===normalizeSopName(name)})}
function sopDisplayName(rule){
  var matches=allSopRules().filter(function(r){return normalizeSopName(r.name)===normalizeSopName(rule.name)}).sort(function(a,b){return (a.createdAt||"").localeCompare(b.createdAt||"")||a.id.localeCompare(b.id)});
  if(matches.length<2)return rule.name;
  return rule.name+" (duplicate "+(matches.findIndex(function(r){return r.id===rule.id})+1)+")";
}
function sopCondition(rule){return [rule.platform||"Platform not set",rule.format||"Format not set",rule.angle||"Any topic"].join(" → ")}
function sopMatches(a){
  if(!S.sopReady)return [];
  return allSopRules().filter(function(r){return r.enabled&&r.platform&&r.format&&r.format===a.type&&
    (!r.angle||r.angle===(a.angle||""))&&(a.platforms||[]).indexOf(r.platform)>=0}).sort(function(a,b){return Number(!!b.angle)-Number(!!a.angle)||a.name.localeCompare(b.name)});
}
function sopNodes(rule){
  if(rule.nodes)return rule.nodes;
  function stable(nodes,path){return nodes.map(function(n,i){var id=path+"-"+i;return Object.assign({},n,{id:id,children:stable(kids(n),id)})})}
  return stable(buildSteps(STEPS[rule.format]||["Script","Edit","Review"]),rule.id||"suggested");
}
function sopDefinition(nodes){return (nodes||[]).map(function(n){var copy=Object.assign({},n,{done:false,children:sopDefinition(kids(n))});delete copy.sopSource;delete copy.appliedSopRules;return copy})}
var SOP_FIELDS=["title","description","due","kind","platform","type","angle"];
function sopBaseline(n){var out={};SOP_FIELDS.forEach(function(k){out[k]=n[k]||""});return out}
function materializeSop(rule,date){
  var offset=rule.anchorDate&&date?daysBetween(rule.anchorDate,date):0;
  function build(nodes){return nodes.map(function(n){var copy=Object.assign({},n,{id:sid(),done:false,due:n.due?addDays(n.due,offset):"",children:build(kids(n))});
    copy.sopSource={ruleId:rule.id,stepId:n.id,baseline:sopBaseline(copy)};return copy})}
  return build(sopNodes(rule));
}
function sopUsage(a,id){
  if(a.status==="Published")return 0;
  function count(nodes){return (nodes||[]).reduce(function(sum,n){return sum+(nodeDone(n)?0:((n.appliedSopRules||[]).indexOf(id)>=0?1:0)+count(kids(n)))},0)}
  return ((a.appliedSopRules||[]).indexOf(id)>=0?1:0)+count(a.subtasks);
}
function sopDepthSkips(a,rule){
  if(a.status==="Published")return 0;var required=treeDepth(sopNodes(rule));
  function count(target,depth){return ((target.appliedSopRules||[]).indexOf(rule.id)>=0&&required+depth>MAXDEPTH?1:0)+kids(target).reduce(function(sum,n){return sum+(nodeDone(n)?0:count(n,depth+1))},0)}
  return count({children:a.subtasks||[],appliedSopRules:a.appliedSopRules||[]},0);
}
/* Update only fields that still equal their applied baseline. Untracked old
   checklists are matched conservatively and are never deleted. */
function reconcileSop(existing,oldRule,rule,date){
  var tracked={},used={},blocked={},wanted={},incoming=materializeSop(rule,date),oldSteps={};
  (function indexWanted(nodes){nodes.forEach(function(n){wanted[n.sopSource.stepId]=true;indexWanted(kids(n))})})(incoming);
  function index(nodes){nodes.forEach(function(n){if(n.sopSource&&n.sopSource.ruleId===rule.id)tracked[n.sopSource.stepId]=n;if((n.appliedSopRules||[]).indexOf(rule.id)<0)index(kids(n))})}
  index(existing);
  function oldIndex(nodes){nodes.forEach(function(n){oldSteps[n.id]=n;oldIndex(kids(n))})}oldIndex(sopNodes(oldRule));
  function mark(nodes,map){nodes.forEach(function(n){map[n.id]=true;mark(kids(n),map)})}
  Object.keys(tracked).forEach(function(id){if(nodeDone(tracked[id])&&!kids(tracked[id]).length)mark([tracked[id]],blocked)});
  function pristine(n){return n.sopSource&&n.sopSource.ruleId===rule.id&&tracked[n.sopSource.stepId]===n&&!nodeDone(n)&&!n.owner&&!(n.appliedSopRules||[]).length&&
    SOP_FIELDS.every(function(k){return (n[k]||"")===(n.sopSource.baseline[k]||"")})&&kids(n).every(pristine)}
  function extras(nodes){var out=[];nodes.forEach(function(n){if(used[n.id]||(n.sopSource&&n.sopSource.ruleId===rule.id&&tracked[n.sopSource.stepId]===n&&wanted[n.sopSource.stepId]))return;if(pristine(n)){var children=extras(kids(n));if(children.length)out.push(Object.assign({},n,{children:children}));return}
    var copy=Object.assign({},n,{children:extras(kids(n))});out.push(copy)});return out}
  function build(next,previous){var out=[];next.forEach(function(n){
    var step=n.sopSource.stepId,found=tracked[step],legacy=false;
    if(!found&&oldSteps[step]){var original=oldSteps[step],matches=previous.filter(function(p){return !used[p.id]&&!p.sopSource&&p.title===original.title&&(p.platform||"")===(original.platform||"")&&!!kids(p).length===!!kids(original).length});if(matches.length===1){found=matches[0];legacy=true}}
    if(found&&used[found.id])return;
    if(found){
      used[found.id]=true;
      if(nodeDone(found)&&!kids(found).length){out.push(legacy?Object.assign({},found,{sopSource:n.sopSource}):found);return}
      if(blocked[found.id])return;
      var copy=Object.assign({},found),base=legacy?sopBaseline(Object.assign({},oldSteps[step],{due:oldSteps[step].due&&oldRule.anchorDate&&date?addDays(oldSteps[step].due,daysBetween(oldRule.anchorDate,date)):oldSteps[step].due||""})):found.sopSource.baseline;
      SOP_FIELDS.forEach(function(k){if((found[k]||"")===(base[k]||""))copy[k]=n[k]||""});
      copy.sopSource=n.sopSource;copy.children=build(kids(n),kids(found));out.push(copy);
    }else{var blockedMatch=Object.keys(tracked).some(function(key){return key===step&&blocked[tracked[key].id]});if(!blockedMatch){n.children=build(kids(n),[]);out.push(n)}}
  });return out.concat(extras(previous))}
  return build(incoming,existing);
}
function syncActivitySop(a,oldRule,rule){
  if(a.status==="Published")return a;
  function sync(target,depth,date){
    var nodes=kids(target).map(function(n){return nodeDone(n)?n:sync(n,depth+1,n.due||date)}),out=Object.assign({},target,{children:nodes});
    if((target.appliedSopRules||[]).indexOf(rule.id)>=0&&treeDepth(sopNodes(rule))+depth<=MAXDEPTH)out.children=reconcileSop(nodes,oldRule,rule,date);
    return out;
  }
  var root=sync({children:a.subtasks||[],appliedSopRules:a.appliedSopRules||[]},0,a.dueDate);
  return Object.assign({},a,{subtasks:root.children});
}
function mergeSopNodes(existing,incoming){
  var out=(existing||[]).slice();
  (incoming||[]).forEach(function(n){
    var match=out.findIndex(function(old){return String(old.title||"").trim().toLowerCase()===String(n.title||"").trim().toLowerCase()&&
      (old.platform||"")===(n.platform||"")&&!!kids(old).length===!!kids(n).length});
    if(match<0)out.push(n);
    else if(kids(n).length)out[match]=Object.assign({},out[match],{children:mergeSopNodes(kids(out[match]),kids(n))});
  });return out;
}
function appendSop(target,rule,date){
  var applied=(target.appliedSopRules||[]).slice();if(applied.indexOf(rule.id)>=0)return target;
  applied.push(rule.id);
  return Object.assign({},target,{appliedSopRules:applied,children:mergeSopNodes(kids(target),materializeSop(rule,date))});
}
/* No rule is applied without an explicit selection in the nudge. */
function applySopRules(a,selected){
  var target={children:a.subtasks||[],appliedSopRules:a.appliedSopRules||[]};
  sopMatches(a).forEach(function(rule){if((selected||[]).indexOf(rule.id)>=0)target=appendSop(target,rule,a.dueDate)});
  return Object.assign({},a,{subtasks:target.children,appliedSopRules:target.appliedSopRules});
}
function subtaskLocation(a,id,nodes,parent,depth){
  nodes=nodes||a.subtasks||[];parent=parent||{platforms:a.platforms||[],type:a.type||"",angle:a.angle||""};depth=depth||0;
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i],context={platforms:n.platform?[n.platform]:parent.platforms,type:n.type||parent.type,
      angle:n.angle||(!n.type||n.type===parent.type?parent.angle:"")};
    if(n.id===id)return {node:n,context:context,parent:parent,depth:depth};
    var found=subtaskLocation(a,id,kids(n),context,depth+1);if(found)return found;
  }return null;
}
function saveActivityWithSops(id,patch,selected){
  return wq.then(function(){return db.runTransaction(function(tx){var ref=db.doc("activities/"+id);
    return tx.get(ref).then(function(snap){
      if(!snap.exists){var e=new Error();e.code="not-found";throw e}
      var current=snap.data(),next=applySopRules(Object.assign({},current,patch),selected),update=Object.assign({},patch);
      if(JSON.stringify(next.appliedSopRules)!==JSON.stringify(current.appliedSopRules||[])){update.subtasks=next.subtasks;update.appliedSopRules=next.appliedSopRules}
      tx.update(ref,update);
    });
  })});
}
function saveSubtaskWithSops(a,id,changes,selected,manual){
  return wq.then(function(){return db.runTransaction(function(tx){var ref=db.doc("activities/"+a.id);
    return tx.get(ref).then(function(snap){
      if(!snap.exists){var e=new Error();e.code="not-found";throw e}
      var current=Object.assign({id:a.id},snap.data()),location=id?subtaskLocation(current,id):null;
      if(id&&!location){var e=new Error();e.code="not-found";throw e}
      var target=id?Object.assign({},location.node,changes):{children:current.subtasks||[],appliedSopRules:current.appliedSopRules||[]};
      var updated=id?patchNode(current.subtasks,id,target):current.subtasks;
      var context=id?subtaskLocation(Object.assign({},current,{subtasks:updated}),id).context:current;
      var choices=manual?allSopRules():sopMatches(context);
      choices.forEach(function(rule){
        if((selected||[]).indexOf(rule.id)<0)return;
        if(treeDepth(sopNodes(rule))+(id?location.depth+1:0)>MAXDEPTH){var e=new Error();e.userMessage="This SOP is too deep for this subtask.";throw e}
        target=appendSop(target,rule,(id&&target.due)||current.dueDate);
      });
      var patch=id?{subtasks:patchNode(current.subtasks,id,target)}:{subtasks:target.children,appliedSopRules:target.appliedSopRules};
      tx.update(ref,patch);return Object.assign({},current,patch);
    });
  })}).then(function(current){a.subtasks=current.subtasks;a.appliedSopRules=current.appliedSopRules||[];render();return current});
}
function sopChecklistList(nodes){var list=el("ul","sop-steps");(nodes||[]).forEach(function(n){var item=el("li",null,n.title);if(kids(n).length)item.appendChild(sopChecklistList(kids(n)));list.appendChild(item)});return list}
function sopAdditionCount(target,rule){return Math.max(0,leaves(mergeSopNodes(kids(target),sopNodes(rule))).length-leaves(kids(target)).length)}
function renderSopNudge(host,context,target,depth,onSelect,selected){
  clear(host);var matches=sopMatches(context).filter(function(r){return (target.appliedSopRules||[]).indexOf(r.id)<0&&sopAdditionCount(target,r)>0});
  host.hidden=!matches.length;if(!matches.length)return;
  host.appendChild(el("strong",null,"Found an SOP for these conditions"));
  matches.forEach(function(rule){
    var row=el("div","sop-match"),count=sopAdditionCount(target,rule),fits=treeDepth(sopNodes(rule))+depth<=MAXDEPTH;
    row.appendChild(el("p",null,sopDisplayName(rule)));row.appendChild(el("p","hint",sopCondition(rule)));
    var chosen=(selected||[]).indexOf(rule.id)>=0,add=el("button","btn btn-o",chosen?"Remove selection":"Add "+count+" "+(count===1?"subtask":"subtasks"));
    add.disabled=!fits;add.onclick=function(){onSelect(rule.id,!chosen)};row.appendChild(add);
    if(chosen)row.appendChild(el("p","hint","Selected. These steps will be added when you save."));
    if(!fits)row.appendChild(el("p","hint","This SOP exceeds the nesting limit here. Use it on the parent task."));
    var preview=el("details"),summary=el("summary",null,"Preview "+count+" subtasks");preview.appendChild(summary);preview.appendChild(sopChecklistList(sopNodes(rule)));row.appendChild(preview);host.appendChild(row);
  });
}
function offerSubtaskSop(a,id,onSaved){
  return wq.then(function(){
    var current=S.activities.find(function(x){return x.id===a.id})||a,location=subtaskLocation(current,id);
    if(!location||!sopMatches(location.context).some(function(r){return (location.node.appliedSopRules||[]).indexOf(r.id)<0&&sopAdditionCount(location.node,r)>0&&treeDepth(sopNodes(r))+location.depth+1<=MAXDEPTH}))return;
    var ui=actionDialog("SOP found",location.node.title+": choose whether to add a matching checklist."),nudge=el("div","sop-preview");ui.cancel.textContent="Not now";ui.body.appendChild(nudge);
    renderSopNudge(nudge,location.context,location.node,location.depth+1,function(ruleId){
      var button=ui.body.querySelector("button");runDialogSave(ui,button,function(){return saveSubtaskWithSops(current,id,{},[ruleId])},function(saved){a.subtasks=saved.subtasks;if(onSaved)onSaved(saved);toast("SOP subtasks added")});
    },[]);overlay(ui.node,null,true);
  });
}
function storeSopRule(rule,updateOngoing,original){
  if(!S.sopReady||S.templatesLoading||S.templateError){var e=new Error();e.userMessage="Wait for the SOP library to load before saving.";return Promise.reject(e)}
  if(sopNameTaken(rule.name,rule.id)){var e=new Error();e.userMessage="An SOP with this name already exists. Choose a unique name.";return Promise.reject(e)}
  var payload=Object.assign({},rule),legacy=payload.legacyId;delete payload.id;delete payload.legacyId;
  payload.name=payload.name.trim().replace(/\s+/g," ");payload.nameKey=sopNameKey(payload.name);
  var ref=rule.id?db.doc("sopRules/"+rule.id):db.collection("sopRules").doc(),claim=db.doc("sopNameClaims/"+payload.nameKey);
  var candidates=updateOngoing?S.activities.filter(function(a){return sopUsage(a,rule.id)>0}):[];
  if(candidates.length>400){var e=new Error();e.userMessage="More than 400 activities use this SOP. Save the SOP only, then update campaigns in smaller groups.";return Promise.reject(e)}
  var updates=[],skipped=0;
  return db.runTransaction(function(tx){return Promise.all([tx.get(ref),tx.get(claim)]).then(function(snaps){
    if(snaps[1].exists&&snaps[1].data().sopId!==ref.id){var e=new Error();e.userMessage="An SOP with this name already exists. Choose a unique name.";throw e}
    var oldKey=snaps[0].exists&&snaps[0].data().nameKey,oldRef=oldKey&&oldKey!==payload.nameKey?db.doc("sopNameClaims/"+oldKey):null;
    return Promise.all([oldRef?tx.get(oldRef):Promise.resolve(null),Promise.all(candidates.map(function(a){return tx.get(db.doc("activities/"+a.id))}))]).then(function(reads){
      var old=reads[0],previous=snaps[0].exists?Object.assign({id:ref.id},snaps[0].data()):original||rule;
      if(snaps[0].exists&&previous.archived){var e=new Error();e.userMessage="This SOP was removed. Reopen the library to choose another SOP.";throw e}
      if(original&&snaps[0].exists&&(previous.version||0)!==(original.version||0)){var e=new Error();e.userMessage="This SOP was changed by someone else. Reopen it to edit the latest version.";throw e}
      if(snaps[0].exists)payload.enabled=previous.enabled;
      payload.version=(previous.version||0)+1;payload.updatedAt=new Date().toISOString();updates=[];skipped=0;
      reads[1].forEach(function(snap,i){if(!snap.exists)return;var current=Object.assign({id:candidates[i].id},snap.data());if(!sopUsage(current,ref.id))return;
        var nextRule=Object.assign({id:ref.id},payload);skipped+=sopDepthSkips(current,nextRule);var next=syncActivitySop(current,previous,nextRule);
        if(JSON.stringify(next.subtasks)!==JSON.stringify(current.subtasks)){tx.update(db.doc("activities/"+current.id),{subtasks:next.subtasks});updates.push(next)}
      });
      tx.set(ref,payload);tx.set(claim,{sopId:ref.id,name:payload.name});
      if(old&&old.exists&&old.data().sopId===ref.id)tx.delete(oldRef);
      if(legacy)tx.update(db.doc("subtaskTemplates/"+legacy),{sopId:ref.id});
    });
  })}).then(function(){
    S.sopRules=S.sopRules.filter(function(r){return r.id!==ref.id}).concat([Object.assign({},payload,{id:ref.id})]);
    if(legacy)S.templates=S.templates.map(function(t){return t.id===legacy?Object.assign({},t,{sopId:ref.id}):t});
    updates.forEach(function(a){S.activities=S.activities.map(function(current){return current.id===a.id?a:current})});render();return {updated:updates.length,skipped:skipped};
  });
}
function archiveSop(rule){
  var ref=db.doc((rule.legacyId?"subtaskTemplates/":"sopRules/")+(rule.legacyId||rule.id));
  return db.runTransaction(function(tx){return tx.get(ref).then(function(snap){
    var key=snap.exists&&snap.data().nameKey,claim=key?db.doc("sopNameClaims/"+key):null;
    return (claim?tx.get(claim):Promise.resolve(null)).then(function(name){
      tx.set(ref,Object.assign({},snap.exists?snap.data():rule,{archived:true,enabled:false}));
      if(name&&name.exists&&name.data().sopId===rule.id)tx.delete(claim);
    });
  })}).then(function(){
    if(rule.legacyId)S.templates=S.templates.map(function(t){return t.id===rule.legacyId?Object.assign({},t,{archived:true}):t});
    else S.sopRules=S.sopRules.filter(function(r){return r.id!==rule.id}).concat([Object.assign({},rule,{archived:true,enabled:false})]);render();
  });
}
function openSopRules(){
  if(!writable())return;
  var ui=actionDialog("SOP library","Keep the checklist and its conditions together. Matching tasks and subtasks offer an Add subtasks nudge. SOPs are applied only when you choose to add them.");ui.cancel.textContent="Done";
  var list=el("div","sop-rule-list");ui.body.appendChild(list);
  function draw(){
    clear(list);
    allSopRules().forEach(function(rule){
      var row=el("div","template-row"),summary=el("div");summary.appendChild(el("strong",null,sopDisplayName(rule)));
      summary.appendChild(el("p","hint",sopCondition(rule)+" · "+leaves(sopNodes(rule)).length+" subtasks · "+(!rule.platform||!rule.format?"Needs setup":rule.enabled?"Enabled":"Paused")));
      if(rule.legacyId)summary.appendChild(el("p","hint","Existing saved group. Edit to set its SOP conditions."));
      if(sopNameTaken(rule.name,rule.id))summary.appendChild(el("p","hint warn","Duplicate name from the old library. Rename this SOP to make it unique."));row.appendChild(summary);
      var edit=el("button","btn btn-o",rule.legacyId?"Set up":"Edit");edit.setAttribute("aria-label","Edit SOP "+sopDisplayName(rule));edit.onclick=function(){openSopRule(rule,draw)};row.appendChild(edit);
      var toggle=el("button","text-button",rule.enabled?"Pause":"Enable");toggle.setAttribute("aria-label",(rule.enabled?"Pause":"Enable")+" SOP "+sopDisplayName(rule));toggle.disabled=!rule.platform||!rule.format||!!rule.legacyId;
      toggle.onclick=function(){toggle.disabled=true;var updated=Object.assign({},rule,{enabled:!rule.enabled});
        var work=S.sopRules.some(function(r){return r.id===rule.id})?db.doc("sopRules/"+rule.id).update({enabled:updated.enabled}).then(function(){S.sopRules=S.sopRules.map(function(r){return r.id===rule.id?updated:r});render()}):storeSopRule(updated);
        work.then(draw).catch(function(e){toggle.disabled=false;toast(e.userMessage||msgFor(e))});
      };if(rule.platform&&rule.format&&!rule.legacyId)row.appendChild(toggle);
      var remove=el("button","text-button","Delete");remove.setAttribute("aria-label","Delete SOP "+sopDisplayName(rule));
      remove.onclick=function(){confirmRemoval(row,"Remove this SOP from the library? Existing task checklists stay intact.",function(){remove.disabled=true;archiveSop(rule).then(draw).catch(function(e){remove.disabled=false;toast(msgFor(e))})})};if(rule.legacyId||S.sopRules.some(function(r){return r.id===rule.id}))row.appendChild(remove);
      var preview=el("details","sop-library-preview"),label=el("summary",null,"Preview checklist");preview.appendChild(label);preview.appendChild(sopChecklistList(sopNodes(rule)));row.appendChild(preview);list.appendChild(row);
    });
  }
  var add=el("button","btn btn-p sp","New SOP");add.onclick=function(){openSopRule(null,draw)};ui.foot.appendChild(add);draw();overlay(ui.node,null,true);
}
function sopTopicSelect(type,value,blank){
  var f=formatById(type),options=f?f.angles.slice():[];if(value&&options.indexOf(value)<0)options.push(value);
  return dropdown(options.map(function(v){return[v,v]}),value||"",blank||"Any topic");
}
function sopNodePosition(nodes,id,parent,depth){
  for(var i=0;i<(nodes||[]).length;i++){
    if(nodes[i].id===id)return {node:nodes[i],siblings:nodes,index:i,parent:parent||null,depth:depth||0};
    var found=sopNodePosition(kids(nodes[i]),id,nodes[i],(depth||0)+1);if(found)return found;
  }return null;
}
function moveSopNode(nodes,id,targetId,placement){
  var from=sopNodePosition(nodes,id),to=sopNodePosition(nodes,targetId);
  if(!from||!to||id===targetId||nodeById(kids(from.node),targetId)||["before","after","inside"].indexOf(placement)<0)return nodes;
  var depth=to.depth+(placement==="inside"?1:0);
  if(depth+treeDepth([from.node])>MAXDEPTH)return nodes;
  var remaining=removeNode(nodes,id);
  if(placement==="inside")return addChild(remaining,targetId,from.node);
  function insert(list){
    var result=[];(list||[]).forEach(function(n){
      if(n.id===targetId&&placement==="before")result.push(from.node);
      result.push(kids(n).length?Object.assign({},n,{children:insert(kids(n))}):n);
      if(n.id===targetId&&placement==="after")result.push(from.node);
    });return result;
  }return insert(remaining);
}
function openSopRule(rule,onSaved){
  var ui=actionDialog(rule?"Edit SOP":"New SOP","Set when this SOP is suggested, then arrange the steps your team follows.");ui.node.classList.add("sop-editor");
  var d={name:rule?rule.name:"",platform:rule?rule.platform:"",format:rule?rule.format:"",angle:rule?(rule.angle||""):"",nodes:rule?sopDefinition(sopNodes(rule)):[],anchorDate:rule?(rule.anchorDate||""):""};
  var initial=JSON.stringify(d),name=input("text",d.name,"e.g. YouTube academic video"),platform=dropdown(PLATFORMS.map(function(p){return[p[0],p[0]]}),d.platform,"Choose platform"),format=formatSelect(d.format,"Choose content format"),topicWrap=el("div"),builder=el("div","sop-builder"),hint=el("p","hint err");name.maxLength=100;
  ui.body.appendChild(field("SOP name *",name));var conditionsGrid=el("div","sop-condition-grid");conditionsGrid.appendChild(field("Platform *",platform));conditionsGrid.appendChild(field("Content format *",format));ui.body.appendChild(conditionsGrid);ui.body.appendChild(topicWrap);
  function drawTopic(){clear(topicWrap);var topic=sopTopicSelect(d.format,d.angle);topic.onchange=function(){d.angle=topic.value};topicWrap.appendChild(field("Topic / category",topic,"Any topic matches every topic within the selected format."))}
  var source=dropdown([["","Build or edit the checklist below"]].concat(S.activities.filter(function(a){return (a.subtasks||[]).length}).map(function(a){var c=campById(a.campaignId);return[a.id,a.title+" · "+fmtShort(a.dueDate)+(c?" · "+c.name:"")]})),"",null);
  source.onchange=function(){var a=S.activities.find(function(x){return x.id===source.value});if(!a)return;d.nodes=copyNodes(a.subtasks);composerDrafts={};activeSubtaskEditors={};clearMoveUndo();d.anchorDate=a.dueDate;d.platform=(a.platforms||[])[0]||d.platform;d.format=a.type||d.format;d.angle=a.angle||"";platform.value=d.platform;format.value=d.format;drawTopic();drawBuilder();validate()};
  var importSection=disclosure("Start from a checklist","Optional: copy an activity or use suggested steps");importSection.body.appendChild(field("Activity checklist",source,"Copies the steps so you can edit them here."));ui.body.appendChild(importSection.node);
  var suggested=el("button","tpl-btn","Use suggested checklist for this format");suggested.onclick=function(){d.nodes=buildSteps(STEPS[d.format]||["Script","Edit","Review"]);composerDrafts={};activeSubtaskEditors={};clearMoveUndo();d.anchorDate="";drawBuilder();validate()};importSection.body.appendChild(suggested);
  var checklistHeading=el("div","sop-checklist-heading");checklistHeading.appendChild(el("h3",null,"Checklist"));var stepCount=el("span","sop-step-count");checklistHeading.appendChild(stepCount);
  var addStep=el("button","sop-header-add","+ Add step");addStep.type="button";addStep.onclick=function(){startAdding(null)};checklistHeading.appendChild(addStep);ui.body.appendChild(checklistHeading);
  var reorderHelp=el("p","hint sop-reorder-help","Drag to reorder within a group. Use ⋯ to change grouping. Type below a group to add subtasks.");ui.body.appendChild(reorderHelp);
  var moveAnnouncement=el("p","hint sop-move-status");moveAnnouncement.setAttribute("role","status");moveAnnouncement.setAttribute("aria-live","polite");
  var moveFeedback=el("div","sop-move-feedback"),undoMove=el("button","sop-undo-move","Undo move");undoMove.type="button";undoMove.hidden=true;moveFeedback.appendChild(moveAnnouncement);moveFeedback.appendChild(undoMove);
  ui.body.appendChild(builder);ui.body.appendChild(moveFeedback);ui.body.appendChild(hint);
  var save=el("button","btn btn-p sp","Save SOP");
  var draggedId=null,collapsed={},composerDrafts={},activeSubtaskEditors={},lastMove=null;
  function clearMoveUndo(){lastMove=null;undoMove.hidden=true}
  function resetInsertionPoints(){Object.keys(composerDrafts).forEach(function(key){composerDrafts[key].afterId=null});activeSubtaskEditors={}}
  undoMove.onclick=function(){
    if(!lastMove)return;var previous=lastMove;d.nodes=previous.nodes;resetInsertionPoints();clearMoveUndo();
    drawBuilder({id:previous.id,control:"handle"});validate();moveAnnouncement.textContent="Move undone.";
  };
  function composerKey(parentId){return parentId||"root"}
  function composerDraft(parentId){var key=composerKey(parentId);return composerDrafts[key]||(composerDrafts[key]={text:"",afterId:null})}
  function startAdding(parentId,afterId){
    var draft=composerDraft(parentId);draft.afterId=afterId||null;
    if(parentId){collapsed[parentId]=false;activeSubtaskEditors[parentId]=true}
    drawBuilder({composer:composerKey(parentId)});
  }
  function commitDraft(parentId,focus){
    var draft=composerDraft(parentId),text=draft.text.trim();if(!text)return false;
    if(parentId&&!nodeById(d.nodes,parentId))return false;
    clearMoveUndo();var fresh=newNode(text,""),position=draft.afterId?sopNodePosition(d.nodes,draft.afterId):null;
    if(position&&((position.parent&&position.parent.id)||null)===(parentId||null))d.nodes=insertAfter(d.nodes,draft.afterId,fresh);
    else d.nodes=addChild(d.nodes,parentId,fresh);
    draft.text="";draft.afterId=fresh.id;
    if(focus){drawBuilder({composer:composerKey(parentId)});validate();moveAnnouncement.textContent="Added "+text+". Type the next "+(parentId?"subtask":"step")+"."}
    return true;
  }
  function moveStep(id,target,placement){
    var next=moveSopNode(d.nodes,id,target,placement);if(next===d.nodes)return false;
    lastMove={nodes:d.nodes,id:id};undoMove.hidden=false;
    var title=nodeById(next,id).title||"Untitled step";d.nodes=next;draggedId=null;resetInsertionPoints();
    if(placement==="inside")collapsed[target]=false;
    drawBuilder({id:id,control:"handle"});validate();moveAnnouncement.textContent="Moved "+title+". Save SOP to keep the new order.";return true;
  }
  function clearDrop(){builder.querySelectorAll(".drop-before,.drop-after,.drop-inside").forEach(function(n){n.classList.remove("drop-before","drop-after","drop-inside")})}
  function canDrop(target,placement){
    var from=draggedId&&sopNodePosition(d.nodes,draggedId),to=sopNodePosition(d.nodes,target);
    return !!from&&!!to&&((from.parent&&from.parent.id)||null)===((to.parent&&to.parent.id)||null)&&
      (placement==="before"||placement==="after")&&moveSopNode(d.nodes,draggedId,target,placement)!==d.nodes;
  }
  function drawBuilder(focus){
    builder.querySelectorAll("[popover]").forEach(function(menu){if(menu.matches(":popover-open"))menu.hidePopover()});
    clear(builder);builder.classList.remove("is-dragging");
    function total(nodes){return nodes.reduce(function(count,n){return count+1+total(kids(n))},0)}
    stepCount.textContent=total(d.nodes)+" steps";
    function composer(parentId,depth){
      var draft=composerDraft(parentId),row=el("div","sop-add-composer");row.style.setProperty("--step-depth",depth);
      var plus=el("span","sop-composer-plus","+");plus.setAttribute("aria-hidden","true");row.appendChild(plus);
      var entry=input("text",draft.text,parentId?"Add a subtask…":"Add a step…");entry.setAttribute("aria-label",parentId?"New subtask in "+(nodeById(d.nodes,parentId).title||"untitled group"):"New SOP step");entry.setAttribute("data-sop-composer",composerKey(parentId));entry.enterKeyHint="next";
      var add=el("button","sop-composer-add","Add");add.type="button";add.disabled=!draft.text.trim();add.setAttribute("aria-label",parentId?"Add subtask to "+(nodeById(d.nodes,parentId).title||"untitled group"):"Add SOP step");
      entry.oninput=function(){clearMoveUndo();draft.text=entry.value;add.disabled=!draft.text.trim();validate()};
      entry.onkeydown=function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();commitDraft(parentId,true)}};
      add.onclick=function(){commitDraft(parentId,true)};row.appendChild(entry);row.appendChild(add);builder.appendChild(row);
    }
    function rows(nodes,depth,parentId){nodes.forEach(function(n,index){
      var group=kids(n).length>0||!!activeSubtaskEditors[n.id]||!!(composerDrafts[n.id]&&composerDrafts[n.id].text.trim()),row=el("div","sop-step-row"+(group?" is-group":""));
      row.style.setProperty("--step-depth",depth);row.setAttribute("data-sop-depth",depth);row.setAttribute("data-sop-row",n.id);
      var handle=el("button","sop-drag-handle","⠿");handle.type="button";handle.draggable=true;handle.title="Drag to reorder. Arrow keys move this step; left/right changes nesting.";
      handle.setAttribute("aria-label","Drag SOP subtask "+(n.title||"untitled step"));handle.setAttribute("data-move-control","handle");
      handle.ondragstart=function(e){
        draggedId=n.id;builder.classList.add("is-dragging");row.classList.add("is-drag-source");
        e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",n.id);
      };
      handle.ondragend=function(){draggedId=null;builder.classList.remove("is-dragging");clearDrop();row.classList.remove("is-drag-source")};
      handle.onkeydown=function(e){
        var current=sopNodePosition(d.nodes,n.id),target=null,placement="before";
        if(e.key==="ArrowUp")target=current.siblings[current.index-1];
        else if(e.key==="ArrowDown"){target=current.siblings[current.index+1];placement="after"}
        else if(e.key==="ArrowRight"){target=current.siblings[current.index-1];placement="inside"}
        else if(e.key==="ArrowLeft"){target=current.parent;placement="after"}else return;
        e.preventDefault();if(target)moveStep(n.id,target.id,placement);
      };row.appendChild(handle);
      if(group){
        var toggle=el("button","sop-group-toggle",collapsed[n.id]?"▸":"▾");toggle.type="button";toggle.setAttribute("aria-label",(collapsed[n.id]?"Expand":"Collapse")+" group "+(n.title||"untitled step"));toggle.setAttribute("aria-expanded",String(!collapsed[n.id]));toggle.setAttribute("data-move-control","toggle");
        toggle.onclick=function(){collapsed[n.id]=!collapsed[n.id];drawBuilder({id:n.id,control:"toggle"})};row.appendChild(toggle);
      }else{var spacer=el("span","sop-group-spacer");spacer.setAttribute("aria-hidden","true");row.appendChild(spacer)}
      var title=input("text",n.title,"Untitled step");title.setAttribute("aria-label","Subtask title");title.setAttribute("data-sop-node",n.id);title.oninput=function(){clearMoveUndo();d.nodes=patchNode(d.nodes,n.id,{title:title.value});validate()};
      title.onkeydown=function(e){if(e.key==="Enter"&&!e.isComposing){e.preventDefault();if(title.value.trim())startAdding(parentId,n.id)}};row.appendChild(title);
      var count=el("span","sop-group-count",group?String(kids(n).length):"");if(group)count.title=kids(n).length+" nested steps";row.appendChild(count);
      var actions=el("button","sop-actions-trigger","⋯");actions.type="button";actions.title="Step actions";actions.setAttribute("aria-label","Actions for SOP step "+(n.title||"untitled step"));actions.setAttribute("aria-haspopup","menu");actions.setAttribute("aria-expanded","false");row.appendChild(actions);
      var menu=el("div","sop-actions-popover");menu.setAttribute("popover","auto");menu.setAttribute("role","menu");menu.setAttribute("aria-label","Actions for "+(n.title||"untitled step"));
      function command(text,label,icon,fn,disabled,danger){
        var button=el("button","sop-menu-command"+(danger?" danger":""));button.type="button";button.setAttribute("role","menuitem");button.setAttribute("aria-label",label);button.disabled=!!disabled;
        var glyph=el("span","sop-command-icon",icon);glyph.setAttribute("aria-hidden","true");button.appendChild(glyph);button.appendChild(el("span",null,text));
        button.onclick=function(){menu.hidePopover();fn()};menu.appendChild(button);return button;
      }
      function moveCommand(text,label,icon,target,placement){
        return command(text,label+" "+(n.title||"untitled step"),icon,function(){moveStep(n.id,target.id,placement)},!target||moveSopNode(d.nodes,n.id,target.id,placement)===d.nodes);
      }
      moveCommand("Move up","Move up","↑",nodes[index-1],"before");moveCommand("Move down","Move down","↓",nodes[index+1],"after");
      moveCommand("Nest under previous step","Move inside previous step:","↳",nodes[index-1],"inside");
      moveCommand("Move out one level","Move out one level:","↰",sopNodePosition(d.nodes,n.id).parent,"after");
      var divider=el("div","sop-menu-divider");divider.setAttribute("role","separator");menu.appendChild(divider);
      command("Add subtask","Add nested subtask under "+(n.title||"untitled step"),"+",function(){startAdding(n.id)},depth>=MAXDEPTH-1);
      command("Remove step","Remove SOP subtask "+(n.title||"untitled step"),"−",function(){clearMoveUndo();d.nodes=removeNode(d.nodes,n.id);delete activeSubtaskEditors[n.id];drawBuilder();validate();moveAnnouncement.textContent="Step removed. Save SOP to keep this change."},false,true);
      menu.ontoggle=function(){actions.setAttribute("aria-expanded",String(menu.matches(":popover-open")))};
      menu.onkeydown=function(e){
        var items=Array.from(menu.querySelectorAll("button:not(:disabled)")),i=items.indexOf(document.activeElement);
        if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();items[(i+(e.key==="ArrowDown"?1:-1)+items.length)%items.length].focus()}
        else if(e.key==="Home"||e.key==="End"){e.preventDefault();items[e.key==="Home"?0:items.length-1].focus()}
        else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();menu.hidePopover();actions.focus()}
      };
      actions.onclick=function(){
        if(menu.matches(":popover-open")){menu.hidePopover();return}
        menu.showPopover();var anchor=actions.getBoundingClientRect(),bounds=menu.getBoundingClientRect();
        menu.style.left=Math.max(12,Math.min(anchor.right-bounds.width,window.innerWidth-bounds.width-12))+"px";
        menu.style.top=Math.max(12,anchor.bottom+6+bounds.height>window.innerHeight-12?anchor.top-bounds.height-6:anchor.bottom+6)+"px";
        var first=menu.querySelector("button:not(:disabled)");if(first)first.focus();
      };
      row.appendChild(menu);
      function dropPlacement(e){var bounds=row.getBoundingClientRect();return e.clientY<bounds.top+bounds.height/2?"before":"after";
      }
      row.ondragover=function(e){var placement=dropPlacement(e);if(!canDrop(n.id,placement))return;e.preventDefault();e.dataTransfer.dropEffect="move";clearDrop();row.classList.add("drop-"+placement)};
      row.ondragleave=function(e){if(!row.contains(e.relatedTarget))row.classList.remove("drop-before","drop-after","drop-inside")};
      row.ondrop=function(e){e.preventDefault();e.stopPropagation();var placement=dropPlacement(e);if(canDrop(n.id,placement))moveStep(draggedId,n.id,placement)};
      builder.appendChild(row);if(group&&!collapsed[n.id]&&depth<MAXDEPTH-1)rows(kids(n),depth+1,n.id);
      if(composerDraft(parentId).afterId===n.id)composer(parentId,depth);
    });
      var draft=composerDraft(parentId);if(!draft.afterId||!nodes.some(function(n){return n.id===draft.afterId}))composer(parentId,depth);
    }rows(d.nodes,0,null);
    if(focus){
      var control=typeof focus==="string"?builder.querySelector('[data-sop-node="'+focus+'"]'):focus.composer?builder.querySelector('[data-sop-composer="'+focus.composer+'"]'):builder.querySelector('[data-sop-row="'+focus.id+'"] [data-move-control="'+focus.control+'"]');
      if(control){control.focus();control.scrollIntoView({block:"nearest"})}
    }
  }
  function named(nodes){return nodes.length>0&&nodes.every(function(n){return !!n.title.trim()&&(!kids(n).length||named(kids(n)))})}
  function validate(){
    var pending=Object.keys(composerDrafts).some(function(key){return composerDrafts[key].text.trim()&&(key==="root"||nodeById(d.nodes,key))}),duplicate=sopNameTaken(d.name,rule&&rule.id),valid=!!d.name.trim()&&d.name.trim().length<=100&&d.platform&&d.format&&(named(d.nodes)||(!d.nodes.length&&pending))&&treeDepth(d.nodes)<=MAXDEPTH;
    hint.hidden=!duplicate;hint.textContent="An SOP with this name already exists. Choose a unique name.";
    save.disabled=!valid||duplicate||!S.sopReady||S.templatesLoading||!!S.templateError;suggested.disabled=!d.format;
  }
  name.oninput=function(){d.name=name.value;validate()};platform.onchange=function(){d.platform=platform.value;validate()};format.onchange=function(){d.format=format.value;var f=formatById(d.format);if(!f||f.angles.indexOf(d.angle)<0)d.angle="";drawTopic();validate()};
  save.onclick=function(){validate();if(save.disabled)return;var flushed=false;Object.keys(composerDrafts).forEach(function(key){if(commitDraft(key==="root"?null:key,false))flushed=true});if(flushed)drawBuilder();validate();if(save.disabled)return;var payload={name:d.name,platform:d.platform,format:d.format,angle:d.angle,nodes:sopDefinition(d.nodes),anchorDate:d.anchorDate,enabled:rule&&!rule.legacyId?rule.enabled:true,createdAt:rule&&rule.createdAt||new Date().toISOString()};if(rule){payload.id=rule.id;if(rule.legacyId)payload.legacyId=rule.legacyId}
    function saved(result){if(onSaved)onSaved();toast((result.updated?"SOP saved · "+result.updated+" unfinished activities updated":"SOP saved")+(result.skipped?" · "+result.skipped+" uses kept at the nesting limit":""))}
    var ongoing=rule?S.activities.filter(function(a){return sopUsage(a,rule.id)>0}):[];
    if(!ongoing.length||JSON.stringify(d)===initial){runDialogSave(ui,save,function(){return wq.then(function(){return storeSopRule(payload,false,rule)})},saved);return}
    var choice=actionDialog("Update ongoing work?","This SOP is used in "+ongoing.length+" unfinished "+(ongoing.length===1?"activity":"activities")+". Where should these changes apply?");
    choice.body.appendChild(el("p","hint","Completed steps, owners and individual edits are kept. Only unchanged SOP steps are replaced or removed. Older untracked steps are kept when their origin is uncertain."));
    var tooDeep=ongoing.reduce(function(sum,a){return sum+sopDepthSkips(a,payload)},0);if(tooDeep)choice.body.appendChild(el("p","hint",tooDeep+" nested uses cannot fit the new checklist within three levels. Those checklists will be kept as they are."));
    var affected=el("details"),summary=el("summary",null,"View affected activities");affected.appendChild(summary);var list=el("ul","sop-steps");ongoing.forEach(function(a){list.appendChild(el("li",null,a.title))});affected.appendChild(list);choice.body.appendChild(affected);
    function choose(label,update){var button=el("button","btn "+(update?"btn-p":"btn-o"),label);button.onclick=function(){runDialogSave(choice,button,function(){return wq.then(function(){return storeSopRule(payload,update,rule)})},function(result){closeOverlay(true);saved(result)})};choice.foot.appendChild(button)}
    choose("SOP only",false);choose("Update unfinished tasks",true);overlay(choice.node,null,true);
  };ui.foot.appendChild(save);drawTopic();drawBuilder();validate();overlay(ui.node,function(){return JSON.stringify(d)!==initial||Object.keys(composerDrafts).some(function(key){return !!composerDrafts[key].text.trim()&&(key==="root"||nodeById(d.nodes,key))})},true);
}
function openTemplatePicker(a,parentId,depth,onAdd){
  var ui=actionDialog("Browse SOPs","Choose an SOP checklist to add. Its existing subtasks and progress are kept.");
  allSopRules().forEach(function(rule){var row=el("div","template-row"),text=el("div");text.appendChild(el("strong",null,sopDisplayName(rule)));text.appendChild(el("p","hint",sopCondition(rule)));row.appendChild(text);
    var add=el("button","btn btn-o","Add "+leaves(sopNodes(rule)).length+" subtasks");add.disabled=treeDepth(sopNodes(rule))+depth>MAXDEPTH||(a.appliedSopRules||[]).indexOf(rule.id)>=0;
    add.onclick=function(){closeOverlay(true);onAdd(materializeSop(rule,a.dueDate),parentId,rule.id)};row.appendChild(add);ui.body.appendChild(row);
  });overlay(ui.node,null,true);
}
function checklistTools(a,onChange){
  var bar=el("div","reuse-tools"),browse=el("button","tpl-btn","Browse SOPs");browse.onclick=function(){openTemplatePicker(a,null,0,function(nodes,parent,ruleId){saveSubtaskWithSops(a,null,{},[ruleId],true).then(onChange).catch(function(e){toast(e.userMessage||msgFor(e))})})};bar.appendChild(browse);return bar;
}
function subReuseActions(a,s,depth,onChange){
  var menu=el("details","reuse-menu"),summary=el("summary",null,"⋯");summary.title="Subtask actions";summary.setAttribute("aria-label","Actions for "+s.title);menu.appendChild(summary);
  function action(label,fn){var b=el("button",null,label);b.onclick=function(){menu.open=false;fn()};menu.appendChild(b)}
  action("Duplicate",function(){var copy=copyIndependentSubtask(s);copy.title+=" (copy)";a.subtasks=insertAfter(a.subtasks,s.id,copy);onChange();toast("Subtask duplicated")});
  if(depth<MAXDEPTH-1)action("Browse SOPs to add inside",function(){openTemplatePicker(a,s.id,depth+1,function(nodes,parent,ruleId){saveSubtaskWithSops(a,s.id,{},[ruleId],true).then(function(saved){a.subtasks=saved.subtasks;S.expanded["n"+s.id]=true;onChange()}).catch(function(e){toast(e.userMessage||msgFor(e))})})});return menu;
}

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
    var n=newNode(v,"");saveSubs(a,addChild(a.subtasks||[],parentId,n)).then(function(){offerSubtaskSop(a,n.id)});
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
    r.appendChild(subtaskDeadline(a,s));
    var subTitle=el("button","sub-t sub-title-button"+(nodeDone(s)?" done":""),s.title);
    subTitle.setAttribute("aria-label","Edit subtask: "+s.title);
    subTitle.onclick=function(){openSubtask(a,s)};r.appendChild(subTitle);
    if(writable())r.appendChild(subtaskEditButton(a,s));
    if(writable())r.appendChild(subReuseActions(a,s,depth,function(){persistSubs(a);render()}));
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
      x.onclick=function(){confirmRemoval(r,group?"Remove this group and everything inside it?":"Remove this checklist item?",function(){saveSubs(a,removeNode(a.subtasks,s.id))})};
      r.appendChild(x);
    }
    if(s.description)r.appendChild(el("p","sub-description",s.description));
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
  if(writable()){
    box.appendChild(subAddInput(a,null,"+ Add a subtask"));
    box.appendChild(checklistTools(a,function(){persistSubs(a);render()}));
  }
  return box;
}

function quickAdd(c){
  var la=S.lastAdd[c.id]||{};
  var box=el("div","qadd");
  var ti=el("input");ti.type="text";ti.className="q-title";
  ti.placeholder="Add an activity to this campaign…";
  ti.setAttribute("aria-label","Activity title for "+c.name);
  ti.setAttribute("data-focus","c"+c.id);
  var fs=formatSelect(la.type||"","Format…","q-fmt");
  fs.setAttribute("aria-label","Activity format");
  var angleBox=el("span","q-angle");
  var dt=el("input");dt.type="date";dt.className="q-date";
  dt.title="Due date";dt.setAttribute("aria-label","Due date");
  dt.value=la.date||((TODAY>=c.startDate&&TODAY<=c.endDate)?TODAY:c.startDate);
  var tm=el("input");tm.type="time";tm.className="q-time";
  tm.title="Time (optional)";tm.setAttribute("aria-label","Time, optional");
  tm.value=la.time||"";
  var go=el("button","btn btn-p q-go","Add");
  go.disabled=true;
  ti.oninput=function(){go.disabled=!ti.value.trim()||!S.sopReady};
  var sopHint=el("div","sop-preview quick-sop"),selectedSops=[];
  function drawQuickSop(){
    var f=formatById(fs.value),angle=angleBox.querySelector("select"),context={type:fs.value,platforms:f?f.platforms:[],angle:angle?angle.value:""};
    selectedSops=selectedSops.filter(function(id){return sopMatches(context).some(function(r){return r.id===id})});
    renderSopNudge(sopHint,context,{children:[]},0,function(id,add){selectedSops=selectedSops.filter(function(x){return x!==id});if(add)selectedSops.push(id);drawQuickSop()},selectedSops);
  }
  function drawAngle(keep){
    clear(angleBox);
    var f=formatById(fs.value);
    if(!f||!f.angles.length)return;
    var s=dropdown(f.angles.map(function(x){return[x,x]}),keep?(la.angle||""):"","Topic…");
    s.setAttribute("aria-label","Topic");s.onchange=drawQuickSop;
    angleBox.appendChild(s);
  }
  fs.onchange=function(){drawAngle(false);drawQuickSop()};
  drawAngle(true);drawQuickSop();
  function add(){
    var t=ti.value.trim();if(!t||go.disabled)return;
    var f=formatById(fs.value),asel=angleBox.querySelector("select");
    var ang=asel?asel.value:"";
    S.lastAdd[c.id]={type:fs.value,angle:ang,date:dt.value,time:tm.value};
    go.disabled=true;go.textContent="…";
    var payload=applySopRules({campaignId:c.id,title:t,type:fs.value,angle:ang,cta:"",
      platforms:f?f.platforms.slice():[],
      dueDate:dt.value||TODAY,dueTime:tm.value,owner:"",status:"Not started",description:"",
      keywords:[],script:"",subtasks:[],createdAt:new Date().toISOString()},selectedSops);
    db.collection("activities").add(payload)
      .then(function(){S.focusAdd="c"+c.id;render();toast("Added to "+c.name)})
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
  row2.appendChild(sopHint);
  return box;
}

function emptyHero(){
  var h=el("div","hero");
  h.appendChild(el("span","empty-symbol","▦"));
  h.appendChild(el("p","eyebrow","A little structure. A clearer week."));
  h.appendChild(el("h2",null,"Start with your first campaign"));
  h.appendChild(el("p",null,writable()
    ?"Group related content around a launch, a topic or a goal. Then add activities to see the plan come together."
    :"Nothing has been planned yet. Once the marketing team adds campaigns, they appear here."));
  if(writable()){
    var steps=el("div","start-steps");steps.appendChild(el("span",null,"1  Create a campaign"));steps.appendChild(el("span",null,"2  Add your activities"));h.appendChild(steps);
    var b=el("button","btn btn-p","Create first campaign");b.onclick=function(){openCampaign(null)};h.appendChild(b);
  }
  return h;
}
function noResults(title,message){
  var box=el("div","no-results");box.appendChild(el("h2",null,title));box.appendChild(el("p",null,message));
  var clear=el("button","btn btn-o","Clear search and filters");clear.onclick=resetFilters;box.appendChild(clear);return box;
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
    b.tabIndex=on?0:-1;
    b.onkeydown=function(e){
      if(["ArrowLeft","ArrowRight","Home","End"].indexOf(e.key)<0)return;
      e.preventDefault();var index=VIEWS.indexOf(v),next=e.key==="Home"?0:e.key==="End"?VIEWS.length-1:(index+(e.key==="ArrowRight"?1:-1)+VIEWS.length)%VIEWS.length;
      w.children[next].click();$("vsw").children[next].focus();
    };
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
  var who=$("who");
  if(S.me){
    who.hidden=false;
    who.textContent=initials(S.me.name);
    who.title="Your account";who.setAttribute("aria-label","Your account: "+S.me.name);
  }else who.hidden=true;
  renderMain();
}
function renderMain(){
  var summary=document.querySelector("#head .psub");if(summary)summary.textContent=headSub();
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
  if(S.view==="calendar"&&(S.query||activeFilters().length)&&!visible().length&&!S.loading){
    main.appendChild(noResults("No matching activities","Try another search or clear your filters."));
  }else if(S.view==="calendar")renderCalendar(main);else renderCampaigns(main);
  if(S.focusAdd){
    var f=main.querySelector('[data-focus="'+S.focusAdd+'"]');
    S.focusAdd=null;
    if(f)f.focus();
  }
  paintNames();
  labelIconControls(main);
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
      if(f){var cur=f.value;renderHead();var f2=$("f-own");if(f2)f2.value=cur}
    }
  });
}

/* ─── overlay plumbing ──────────────────────────────────── */
var overlayState=null,fieldCount=0;
function hasOverlayChanges(){
  for(var state=overlayState;state;state=state.parent)if(state.dirty&&state.dirty())return true;
  return false;
}
function closeOverlay(force){
  if(overlayState&&overlayState.busy&&force!==true)return;
  if(overlayState&&overlayState.dirty&&overlayState.dirty()&&force!==true){
    var dialog=overlayState.node,old=dialog.querySelector(".discard-notice");
    if(old){old.querySelector("button").focus();return}
    var notice=el("div","discard-notice");notice.setAttribute("role","alert");
    notice.appendChild(el("span",null,"You have unsaved changes."));
    var keep=el("button","btn btn-o","Keep editing"),discard=el("button","btn btn-d","Discard changes");
    keep.onclick=function(){notice.remove();var f=dialog.querySelector("input,textarea,select");if(f)f.focus()};
    discard.onclick=function(){closeOverlay(true)};
    notice.appendChild(keep);notice.appendChild(discard);dialog.querySelector(".p-foot").prepend(notice);keep.focus();return;
  }
  var closed=overlayState,previous=closed&&closed.previous;
  clear($("overlay"));overlayState=closed&&closed.parent;
  if(overlayState)(closed.parentNodes||[]).forEach(function(n){$("overlay").appendChild(n)});
  document.body.style.overflow=overlayState?"hidden":"";
  document.querySelector(".topbar").inert=!!overlayState;$("workspace").inert=!!overlayState;
  if(previous&&previous.isConnected)previous.focus();
  else if(overlayState){var focus=overlayState.node.querySelector("input,button");if(focus)focus.focus()}
  else if($("new-act")&&!$("new-act").hidden)$("new-act").focus();
}
function overlay(node,dirty,preserveParent){
  clear($("toasts"));
  var o=$("overlay"),parent=preserveParent?overlayState:null;
  overlayState={node:node,dirty:dirty,previous:document.activeElement,parent:parent,parentNodes:parent?Array.from(o.childNodes):null};
  clear(o);
  var sc=el("div","scrim");sc.onclick=closeOverlay;
  o.appendChild(sc);o.appendChild(node);
  document.body.style.overflow="hidden";
  node.setAttribute("aria-modal","true");
  document.querySelector(".topbar").inert=true;$("workspace").inert=true;
  node.querySelectorAll(".p-head .x").forEach(function(b){b.setAttribute("aria-label","Close dialog")});
  labelIconControls(node);
  if(!writable()){
    var ff=node.querySelectorAll("input,select,textarea,.pill,.chk");
    for(var i=0;i<ff.length;i++)ff[i].disabled=true;
  }
  var first=node.querySelector("[autofocus]")||node.querySelector("input,select,textarea");if(first)setTimeout(function(){first.focus()},120);
}
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){if(!$("account-menu").hidden){closeAccount();$("who").focus()}else closeOverlay();return}
  if(e.key==="Tab"&&overlayState){
    var items=Array.from(overlayState.node.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(function(n){return n.getClientRects().length});
    var first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});
window.addEventListener("beforeunload",function(e){if(hasOverlayChanges()){e.preventDefault();e.returnValue=""}});

function field(label,control,hintText,hintCls){
  var w=el("div","field"),lab=el("label",null,label);lab.id="field-label-"+(++fieldCount);
  var target=control.matches("input,select,textarea")?control:control.querySelector("input,select,textarea");
  if(target){if(!target.id)target.id="field-control-"+fieldCount;lab.htmlFor=target.id}
  else{control.setAttribute("role","group");control.setAttribute("aria-labelledby",lab.id)}
  w.appendChild(lab);w.appendChild(control);
  if(hintText){var hint=el("div","hint"+(hintCls?" "+hintCls:""),hintText);hint.id="field-hint-"+fieldCount;if(target)target.setAttribute("aria-describedby",hint.id);w.appendChild(hint)}
  return w;
}
function disclosure(title,description){
  var details=el("details","form-section"),summary=el("summary");summary.appendChild(el("span",null,title));
  if(description)summary.appendChild(el("small",null,description));details.appendChild(summary);
  var content=el("div","section-body");details.appendChild(content);return {node:details,body:content};
}
function labelIconControls(scope){
  scope.querySelectorAll("button.sub-x,button.sub-tgl,button.sub-chk,button.mark").forEach(function(b){if(b.title)b.setAttribute("aria-label",b.title)});
}
function confirmRemoval(host,message,remove){
  if(host.querySelector(".inline-confirm"))return;
  var row=el("div","inline-confirm");row.setAttribute("role","alert");row.appendChild(el("span",null,message));
  var keep=el("button","btn btn-o","Keep item"),yes=el("button","btn btn-d","Remove item");
  keep.onclick=function(){row.remove()};yes.onclick=function(){remove();row.remove()};
  row.appendChild(keep);row.appendChild(yes);host.appendChild(row);keep.focus();
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
  var box=el("div","ac"),inp=input("text","","Search your team…"),menu=null,suppressQuery=false;
  inp.setAttribute("role","combobox");inp.setAttribute("aria-autocomplete","list");inp.setAttribute("aria-expanded","false");
  if(current&&S.profiles[current]&&S.profiles[current].name)inp.value=S.profiles[current].name;
  else if(current)inp.value="Teammate";
  box.appendChild(inp);
  function shut(){if(menu){menu.remove();menu=null}inp.setAttribute("aria-expanded","false")}
  function show(list){
    shut();
    menu=el("div","ac-menu");menu.id="owner-list-"+(++fieldCount);menu.setAttribute("role","listbox");menu.setAttribute("aria-label","Teammates");
    inp.setAttribute("aria-controls",menu.id);inp.setAttribute("aria-expanded","true");
    if(!list.length)menu.appendChild(el("p","owner-empty","No matching teammates. People appear here after their first sign-in."));
    list.sort(function(a,b){return a.id===(S.me&&S.me.id)?-1:b.id===(S.me&&S.me.id)?1:0});
    list.forEach(function(p){
      var b=el("button",null,(p.name||"Someone")+(p.id===(S.me&&S.me.id)?" (you)":""));b.type="button";b.setAttribute("role","option");b.setAttribute("aria-selected",String(current===p.id));
      b.onclick=function(){current=p.id;inp.value=p.name||"Someone";S.profiles[p.id]={name:p.name||""};onPick(p.id);shut()};
      menu.appendChild(b);
    });
    var cb=el("button",null,"Leave unassigned");cb.type="button";cb.setAttribute("role","option");cb.setAttribute("aria-selected",String(!current));
    cb.onclick=function(){current="";inp.value="";onPick("");shut()};
    menu.appendChild(cb);
    box.appendChild(menu);
    menu.onkeydown=function(e){
      var opts=Array.from(menu.querySelectorAll("button")),i=opts.indexOf(document.activeElement);
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();opts[(i+(e.key==="ArrowDown"?1:-1)+opts.length)%opts.length].focus()}
      if(e.key==="Escape"){e.stopPropagation();suppressQuery=true;shut();inp.focus();suppressQuery=false}
    };
  }
  function query(q){
    if(!U||!U.search){shut();return}
    U.search(q).then(function(r){show(r||[])});
  }
  inp.onfocus=function(){if(!suppressQuery)query("")};
  inp.oninput=function(){query(inp.value)};
  inp.onkeydown=function(e){if(e.key==="ArrowDown"&&menu){e.preventDefault();menu.querySelector("button").focus()}if(e.key==="Escape"){e.stopPropagation();shut()}};
  box.addEventListener("focusout",function(){setTimeout(function(){if(!box.contains(document.activeElement))shut()},180)});
  if(!U||!U.search){inp.disabled=true;inp.placeholder="Team directory unavailable"}
  return box;
}

/* Subtask details are saved together; the parent activity draft stays intact. */
function subtaskEditButton(a,s,onSaved){
  var edit=el("button","sub-edit");edit.title="Edit subtask";
  var pencil=document.createElementNS("http://www.w3.org/2000/svg","svg");
  pencil.setAttribute("viewBox","0 0 24 24");pencil.setAttribute("width","16");pencil.setAttribute("height","16");
  pencil.setAttribute("fill","none");pencil.setAttribute("stroke","currentColor");pencil.setAttribute("stroke-width","1.75");
  pencil.setAttribute("stroke-linecap","round");pencil.setAttribute("stroke-linejoin","round");pencil.setAttribute("aria-hidden","true");pencil.setAttribute("focusable","false");
  var stroke=document.createElementNS("http://www.w3.org/2000/svg","path");stroke.setAttribute("d","M16 4a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16 4Z M14 6l3 3");
  pencil.appendChild(stroke);edit.appendChild(pencil);
  edit.setAttribute("aria-label","Edit details for "+(s.title||"Untitled subtask"));
  edit.onclick=function(){openSubtask(a,s,onSaved)};return edit;
}
function openSubtask(a,s,onSaved,focusDeadline){
  var original={title:s.title||"",description:s.description||"",owner:s.owner||"",due:s.due||"",platform:s.platform||"",kind:s.kind||"",type:s.type||"",angle:s.angle||""};
  var draft=Object.assign({},original),saving=false,selected=[],location=subtaskLocation(a,s.id),parent=location?location.parent:{platforms:a.platforms||[],type:a.type||"",angle:a.angle||""};
  var dialog=el("div","modal subtask-modal");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-label","Edit subtask");
  var head=el("div","p-head");head.appendChild(el("h2",null,"Subtask details"));
  var close=el("button","x","✕");close.onclick=closeOverlay;head.appendChild(close);dialog.appendChild(head);
  var body=el("div","p-body");dialog.appendChild(body);body.appendChild(el("p","form-intro","Part of "+a.title+". Conditions inherit from the parent unless you change them."));
  var title=input("text",draft.title,"What needs to be done?");title.required=true;title.oninput=function(){draft.title=title.value;validate()};body.appendChild(field("Subtask name *",title));
  var platform=dropdown(PLATFORMS.map(function(p){return[p[0],p[0]]}),draft.platform,"Use parent platform"),format=formatSelect(draft.type,"Use parent format"),topicWrap=el("div"),nudge=el("div","sop-preview");
  var conditions=disclosure("SOP conditions",sopCondition({platform:parent.platforms.join(" + "),format:parent.type,angle:parent.angle}));conditions.node.open=!!draft.type||!!draft.angle;conditions.body.appendChild(field("Platform",platform));conditions.body.appendChild(field("Content format",format));conditions.body.appendChild(topicWrap);body.appendChild(conditions.node);body.appendChild(nudge);
  function context(){return {platforms:draft.platform?[draft.platform]:parent.platforms,type:draft.type||parent.type,angle:draft.angle||(!draft.type||draft.type===parent.type?parent.angle:"")}}
  function drawNudge(){
    var effective=context();conditions.node.querySelector("summary small").textContent=sopCondition({platform:effective.platforms.join(" + "),format:effective.type,angle:effective.angle});
    var matches=sopMatches(effective);selected=selected.filter(function(id){return matches.some(function(r){return r.id===id})});
    renderSopNudge(nudge,context(),s,location?location.depth+1:1,function(id,add){selected=selected.filter(function(x){return x!==id});if(add)selected.push(id);drawNudge()},selected);
  }
  function drawTopic(){clear(topicWrap);var topic=sopTopicSelect(draft.type||parent.type,draft.angle,"Use parent topic");topic.onchange=function(){draft.angle=topic.value;drawNudge()};topicWrap.appendChild(field("Topic / category",topic))}
  platform.onchange=function(){draft.platform=platform.value;drawNudge()};format.onchange=function(){draft.type=format.value;draft.angle="";drawTopic();drawNudge()};drawTopic();drawNudge();
  var description=el("textarea","subtask-description-input");description.value=draft.description;description.rows=4;description.placeholder="Instructions, links or acceptance criteria…";description.oninput=function(){draft.description=description.value};body.appendChild(field("Description (optional)",description));
  var planning=el("div","f2"),date=input("date",draft.due);if(focusDeadline)date.autofocus=true;date.oninput=function(){draft.due=date.value};planning.appendChild(field("Deadline (optional)",date));planning.appendChild(field("Owner (optional)",ownerPicker(draft.owner,function(id){draft.owner=id})));body.appendChild(planning);
  var kind=dropdown(SUBKINDS.map(function(k){return[k,k]}),draft.kind,"Not set");kind.onchange=function(){draft.kind=kind.value};conditions.body.appendChild(field("Work type (optional)",kind,"The production step, such as Script, Edit or Thumbnail."));body.insertBefore(planning,conditions.node);body.insertBefore(description.parentElement,conditions.node);
  var err=el("p","hint err");err.hidden=true;err.setAttribute("role","alert");body.appendChild(err);
  var foot=el("div","p-foot");foot.appendChild(el("p","required-note","Save to update this subtask and add any selected SOP steps."));
  var cancel=el("button","btn btn-o","Cancel");cancel.onclick=closeOverlay;foot.appendChild(cancel);var save=el("button","btn btn-p sp","Save subtask");foot.appendChild(save);dialog.appendChild(foot);
  function validate(){save.disabled=saving||!draft.title.trim()||!writable();return !save.disabled}
  save.onclick=function(){
    if(!validate())return;var changes={};Object.keys(original).forEach(function(key){var value=key==="title"?draft[key].trim():draft[key];if(value!==original[key])changes[key]=value});
    if(!Object.keys(changes).length&&!selected.length){closeOverlay(true);return}
    saving=true;validate();save.textContent="Saving…";err.hidden=true;cancel.disabled=true;close.disabled=true;body.querySelectorAll("input,textarea,select,button").forEach(function(control){control.disabled=true});
    var editingState=overlayState;editingState.busy=true;var write=saveSubtaskWithSops(a,s.id,changes,selected);wq=write.catch(function(){});
    write.then(function(saved){editingState.busy=false;if(overlayState===editingState)closeOverlay(true);if(onSaved)onSaved(saved);render();toast("Subtask saved")}).catch(function(e){
      editingState.busy=false;saving=false;validate();save.textContent="Save subtask";cancel.disabled=false;close.disabled=false;body.querySelectorAll("input,textarea,select,button").forEach(function(control){control.disabled=false});drawNudge();err.textContent=e.userMessage||msgFor(e);err.hidden=false;
    });
  };
  clear($("toasts"));validate();overlay(dialog,function(){return JSON.stringify(draft)!==JSON.stringify(original)||selected.length>0},true);
}

/* ─── activity panel ────────────────────────────────────── */
function openActivity(a,presetDate,presetCampaign,preset){
  if(!a&&!writable())return;
  if(!a&&!S.campaigns.length){openCampaign(null,function(c){openActivity(null,presetDate,c.id,preset)});return}
  var isNew=!a,pf=preset||{};
  var live=S.campaigns.filter(function(c){return c.status==="Live"});
  var d={
    title:a?a.title:(pf.title||""),
    campaignId:a?a.campaignId:(presetCampaign||S.filters.campaign||(live.length===1?live[0].id:(S.campaigns.length===1?S.campaigns[0].id:""))),
    type:a?(a.type||""):(pf.type||""),
    angle:a?(a.angle||""):(pf.angle||""),
    cta:a?(a.cta||""):"",
    platforms:a?(a.platforms||[]).slice():((pf.platforms||[]).slice()),
    dueDate:a?a.dueDate:(presetDate||TODAY),
    dueTime:a?(a.dueTime||""):(pf.time||""),
    owner:a?(a.owner||""):"",
    description:a?(a.description||""):"",
    keywords:a?(a.keywords||[]).slice():[],
    script:a?(a.script||""):"",manualSops:[],selectedSopIds:[],templateAnchor:presetDate||TODAY,repeat:{unit:"",count:1}
  };
  var initial=JSON.stringify(d);
  /* true while the platforms were filled in by the format, not by the user */
  var autoPlat=isNew&&!!(pf.platforms&&pf.platforms.length);
  var p=el("div","panel");p.setAttribute("role","dialog");p.setAttribute("aria-label",isNew?"New activity":"Activity");
  var head=el("div","p-head");
  head.appendChild(el("h2",null,isNew?"New activity":"Activity"));
  var xb=el("button","x","✕");xb.onclick=closeOverlay;head.appendChild(xb);
  p.appendChild(head);
  var body=el("div","p-body");p.appendChild(body);
  body.appendChild(el("p","form-intro",isNew?"Start with the essentials. You can fill in the content details later.":"Update the plan, schedule or content for this activity."));
  if(!isNew&&writable()){
    var reuse=el("div","reuse-tools"),duplicate=el("button","btn btn-o","Duplicate activity"),repeatButton=el("button","btn btn-o","Repeat activity");
    duplicate.onclick=function(){openDuplicate(a,false,false)};repeatButton.onclick=function(){openDuplicate(a,false,true)};
    reuse.appendChild(duplicate);reuse.appendChild(repeatButton);body.appendChild(reuse);
  }

  var titleIn=input("text",d.title,"e.g. Topper interview — Akriti, AIR 12");
  titleIn.id="act-title";
  titleIn.oninput=function(){d.title=titleIn.value;validate()};
  titleIn.required=true;body.appendChild(field("Activity title *",titleIn));

  var campSel=dropdown(S.campaigns.map(function(c){return[c.id,c.name]}),d.campaignId,"Choose a campaign");
  campSel.id="act-camp";
  campSel.onchange=function(){d.campaignId=campSel.value;validate()};
  campSel.required=true;body.appendChild(field("Campaign *",campSel));

  var fmtSel=formatSelect(d.type,"Not set");fmtSel.id="act-format";
  body.appendChild(field("Format",fmtSel));
  var contentDetails=disclosure("Content details","Platforms, notes & keywords");
  var angleWrap=el("div"),ctaWrap=el("div");
  body.appendChild(angleWrap);contentDetails.body.appendChild(ctaWrap);
  function drawAngle(){
    clear(angleWrap);
    var f=formatById(d.type);
    angleWrap.hidden=!(f&&f.angles.length);
    if(!f||!f.angles.length)return;
    var s=dropdown(f.angles.map(function(x){return[x,x]}),d.angle,"Not set");
    s.id="act-angle";
    s.onchange=function(){d.angle=s.value;if(sopPreview)drawSopPreview()};
    angleWrap.appendChild(field("Topic / category",s,"Choose the topic to find a more specific SOP."));
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
    if(sopPreview)drawSopPreview();
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
      if(sopPreview)drawSopPreview();
    };
    pl.appendChild(b);
  });
  contentDetails.body.appendChild(field("Platforms",pl,"Choose where this activity will appear."));

  var two=el("div","f2");
  var dd=input("date",d.dueDate);dd.id="act-date";
  var dt=input("time",d.dueTime);dt.id="act-time";
  dd.required=true;
  var dw=field("Due date *",dd),tw=field("Time (optional)",dt,"Leave blank for any time that day.");
  two.appendChild(dw);two.appendChild(tw);
  body.appendChild(two);
  var rangeHint=el("div","hint warn");rangeHint.hidden=true;body.appendChild(rangeHint);
  dd.oninput=function(){d.dueDate=dd.value;if(repeatOptions)repeatOptions.refresh();validate()};
  dt.oninput=function(){d.dueTime=dt.value};
  var repeatOptions=null;
  if(isNew){
    var repeatSection=disclosure("Repeat activity","Create a daily, weekly or monthly series");
    repeatOptions=repeatForm(repeatSection.body,function(){return d.dueDate},function(){if(repeatOptions){d.repeat=repeatOptions.read();validate()}});
    body.appendChild(repeatSection.node);
  }

  body.appendChild(field("Owner (optional)",ownerPicker(d.owner,function(id){d.owner=id})));
  body.appendChild(contentDetails.node);

  var ta=el("textarea");ta.id="act-desc";ta.value=d.description;ta.className="short-ta";
  ta.placeholder="One or two lines: what this is and why.";
  ta.oninput=function(){d.description=ta.value};
  contentDetails.body.appendChild(field("Notes",ta));

  var kw=input("text",d.keywords.join(", "),"norcet, aiims, high yield…");
  kw.id="act-keywords";
  kw.oninput=function(){
    d.keywords=kw.value.split(",").map(function(x){return x.trim()}).filter(Boolean);
  };
  contentDetails.body.appendChild(field("Keywords",kw,"Separate keywords with commas."));

  var sc=el("textarea");sc.id="act-script";sc.value=d.script;sc.className="script-ta";
  sc.placeholder="Hook…\n\nBody…\n\nCTA…";
  sc.oninput=function(){d.script=sc.value};
  var scriptField=field("Script",sc,"The spoken or written script. Long form, shorts, reels, broadcasts — whatever this one needs.");
  var scriptSection=disclosure("Script",d.script?"View or edit the draft":"Add a draft when you’re ready");scriptSection.body.appendChild(scriptField);

  /* status + assets write immediately on an existing activity */
  if(!isNew){
    body.appendChild(el("p","autosave-note","Status and checklist changes save automatically."));
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
          if(!v){ti.value=s.title;toast("Give this item a name, or use Remove to delete it.");return}
          patchSub(s.id,{title:v||s.title});if(v)offerSubtaskSop(a,s.id,function(saved){a.subtasks=saved.subtasks;drawSubs(null)});
        };
        r.appendChild(ti);
        r.appendChild(subtaskEditButton(a,s,function(current){a.subtasks=current.subtasks;drawSubs(null)}));
        if(writable())r.appendChild(subReuseActions(a,s,depth,function(){persistSubs(a);render();drawSubs(null)}));
        if(s.description)r.appendChild(el("p","sub-description",s.description));
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
        x.onclick=function(){confirmRemoval(r,group?"Remove this group and everything inside it?":"Remove this checklist item?",function(){dropSub(s.id)})};
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
        var deadlineField=field("Deadline",dd);deadlineField.classList.add("ps-deadline");
        two.appendChild(pf2);two.appendChild(kd);two.appendChild(deadlineField);two.appendChild(op);
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
        var fresh=newNode(v,"");a.subtasks=(a.subtasks||[]).concat([fresh]);
        persistSubs(a).then(function(){offerSubtaskSop(a,fresh.id,function(saved){a.subtasks=saved.subtasks;drawSubs(null)})});render();drawSubs("add");
      };
      sbox.appendChild(ai);
      if(writable()){
        sbox.appendChild(checklistTools(a,function(){persistSubs(a);render();drawSubs(null)}));

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
      labelIconControls(sbox);
    };
    drawSubs(null);
    var checklist=disclosure("Checklist",subDone(a)+" of "+subTotal(a)+" items complete");checklist.node.open=true;
    checklist.body.appendChild(sbox);body.appendChild(checklist.node);
  }else{
    var checklist=disclosure("Checklist","Choose an SOP checklist or add individual steps after creating the activity");
    var savedList=el("div","ps-list"),browse=el("button","tpl-btn","Browse SOPs");
    function drawSaved(){
      clear(savedList);d.manualSops.forEach(function(selection){
        var row=el("div","template-row"),rule=allSopRules().find(function(r){return r.id===selection.ruleId});
        row.appendChild(el("span",null,(rule?sopDisplayName(rule):"Selected SOP")+" · "+leaves(selection.nodes).length+" subtasks"));
        var remove=el("button","text-button","Remove");remove.onclick=function(){d.manualSops=d.manualSops.filter(function(x){return x!==selection});drawSaved();drawSopPreview()};row.appendChild(remove);savedList.appendChild(row);
      });
    }
    browse.onclick=function(){openTemplatePicker({dueDate:d.templateAnchor,appliedSopRules:d.manualSops.map(function(x){return x.ruleId})},null,0,function(nodes,parent,id){d.manualSops.push({ruleId:id,nodes:nodes});drawSaved();drawSopPreview()})};
    checklist.body.appendChild(browse);checklist.body.appendChild(savedList);body.appendChild(checklist.node);
  }
  var sopPreview=el("div","sop-preview");checklist.body.prepend(sopPreview);
  function drawSopPreview(){
    var current=isNew?null:S.activities.find(function(x){return x.id===a.id})||a,matches=sopMatches(d);
    d.selectedSopIds=d.selectedSopIds.filter(function(id){return matches.some(function(r){return r.id===id})});
    var target={children:current?current.subtasks:[],appliedSopRules:(current?current.appliedSopRules||[]:[]).concat(d.manualSops.map(function(x){return x.ruleId}))};
    renderSopNudge(sopPreview,d,target,0,function(id,add){d.selectedSopIds=d.selectedSopIds.filter(function(x){return x!==id});if(add)d.selectedSopIds.push(id);drawSopPreview()},d.selectedSopIds);
    if(isNew&&!sopPreview.hidden)checklist.node.open=true;
  }
  drawSopPreview();
  body.appendChild(scriptSection.node);

  var foot=el("div","p-foot");
  var err=el("div","hint err");err.hidden=true;
  var requiredNote=el("p","required-note");foot.appendChild(requiredNote);
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
        db.doc("activities/"+a.id).delete().then(function(){closeOverlay(true);toast("Activity deleted")})
          .catch(function(e){showErr(e)});
      };
      var no=el("button","btn btn-o","Cancel");
      no.onclick=function(){confirmRow.remove();confirmRow=null};
      confirmRow.appendChild(yes);confirmRow.appendChild(no);
      foot.appendChild(confirmRow);
    };
    foot.appendChild(del);
  }
  var cancel=el("button","btn btn-o","Cancel");cancel.onclick=function(){closeOverlay()};foot.appendChild(cancel);
  save.classList.add("sp");
  foot.appendChild(save);
  p.appendChild(foot);
  body.appendChild(err);

  var saving=false,disabledBeforeSave=[];
  function showErr(e){
    saving=false;if(overlayState)overlayState.busy=false;
    disabledBeforeSave.forEach(function(item){item.node.disabled=item.disabled});
    err.hidden=false;err.textContent=msgFor(e);validate();save.textContent=isNew?"Create activity":"Save changes";
  }
  function validate(){
    var ok=d.title.trim()&&d.campaignId&&d.dueDate&&S.sopReady&&(!repeatOptions||repeatOptions.valid());
    save.disabled=saving||!ok||!writable();
    var missing=[];if(!d.title.trim())missing.push("a title");if(!d.campaignId)missing.push("a campaign");if(!d.dueDate)missing.push("a due date");
    requiredNote.textContent=ok?(isNew?"Optional details can be added later.":"Save changes to update the details above."):"Add "+missing.join(", ")+" to continue.";
    if(repeatOptions&&!repeatOptions.valid())requiredNote.textContent="Choose 2 to 52 total occurrences.";
    if(!S.sopReady)requiredNote.textContent="Loading SOP rules before saving…";
    var c=campById(d.campaignId);
    if(c&&d.dueDate&&(d.dueDate<c.startDate||d.dueDate>c.endDate)){
      rangeHint.hidden=false;
      rangeHint.textContent="This date is outside the campaign window ("+fmtShort(c.startDate)+" → "+fmtLong(c.endDate)+"). You can still save it.";
    }else rangeHint.hidden=true;
    return ok&&!saving&&writable();
  }
  function submit(){
    if(!validate())return;
    saving=true;overlayState.busy=true;
    disabledBeforeSave=Array.from(p.querySelectorAll("button,input,textarea,select")).map(function(n){var item={node:n,disabled:n.disabled};n.disabled=true;return item});
    save.disabled=true;save.textContent="Saving…";err.hidden=true;
    var payload={title:d.title.trim(),campaignId:d.campaignId,type:d.type,angle:d.angle,cta:d.cta,
      platforms:d.platforms,dueDate:d.dueDate,dueTime:d.dueTime,owner:d.owner,
      description:d.description.trim(),keywords:d.keywords,script:d.script};
    if(isNew){
      payload.status="Not started";payload.assets={};payload.subtasks=copyNodes(d.manualSops.reduce(function(nodes,selection){return nodes.concat(selection.nodes)},[]),daysBetween(d.templateAnchor,d.dueDate));payload.appliedSopRules=d.manualSops.map(function(x){return x.ruleId});
      payload.createdAt=new Date().toISOString();
      payload=applySopRules(payload,d.selectedSopIds);
      writeActivityCopies(payload,d.repeat).then(function(){closeOverlay(true);toast(d.repeat.unit?d.repeat.count+" recurring activities created":"Activity added to "+fmtLong(d.dueDate))})
        .catch(showErr);
    }else{
      saveActivityWithSops(a.id,payload,d.selectedSopIds).then(function(){closeOverlay(true);toast("Changes saved")}).catch(showErr);
    }
  }
  validate();
  overlay(p,function(){return JSON.stringify(d)!==initial});
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
function aiRequest(method,payload){
  if(!auth||!auth.currentUser)return Promise.reject(new Error("Sign in again to use AI planning."));
  return auth.currentUser.getIdToken().then(function(token){return fetch("/api/campaign-plan",{method:method,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(50000)})}).then(function(response){return response.json().catch(function(){throw new Error("AI planning is unavailable. Please try again later.")}).then(function(data){if(!response.ok)throw new Error(data.error||"AI planning is unavailable.");return data})});
}
function openCampaignPlanner(c){
  if(!writable())return;
  var ui=actionDialog("Plan campaign with AI","Get a practical draft for "+c.name+". Review the steps and choose what to add.");ui.node.classList.add("ai-planner");
  var saved=c.aiBrief||{},brief=el("div","ai-brief"),results=el("div","ai-results"),status=el("p","hint","Checking AI availability…"),ready=false,working=false,plan=null,planId=sid(),selections=[],drafts=[];
  results.hidden=true;ui.body.appendChild(status);ui.body.appendChild(brief);ui.body.appendChild(results);
  var goal=el("textarea");goal.rows=2;goal.value=saved.goal||c.goal||"";goal.maxLength=1000;goal.placeholder="e.g. Get nursing aspirants to attend a free NORCET strategy class";
  var audience=input("text",saved.audience||"","e.g. First-time NORCET aspirants preparing alongside work");audience.maxLength=600;
  brief.appendChild(field("What should this campaign achieve? *",goal));brief.appendChild(field("Who is it for? *",audience));
  var extra=disclosure("Offer & constraints","Help AI suggest work your team can actually do"),offer=el("textarea"),constraints=el("textarea");offer.rows=2;offer.maxLength=600;offer.value=saved.offer||"";offer.placeholder="What are we inviting people to do? Include the real offer, if any.";constraints.rows=2;constraints.maxLength=1000;constraints.value=saved.constraints||"";constraints.placeholder="Channels, budget, team capacity, tone, or anything to avoid";
  extra.body.appendChild(field("Offer / call to action",offer));extra.body.appendChild(field("Constraints",constraints));brief.appendChild(extra.node);
  var sharing=el("p","hint ai-sharing","Sends this brief, campaign dates, existing activity titles/status and SOP names/conditions to Google Gemini. Scripts, owner details and internal task descriptions are excluded. Google’s free tier may use submitted content to improve its products.");brief.appendChild(sharing);
  var pricing=el("a",null,"Google data-use and pricing terms");pricing.href="https://ai.google.dev/gemini-api/docs/pricing";pricing.target="_blank";pricing.rel="noopener noreferrer";sharing.appendChild(document.createTextNode(" "));sharing.appendChild(pricing);
  var generate=el("button","btn btn-p sp","Draft campaign plan"),add=el("button","btn btn-p sp","Add selected activities"),back=el("button","btn btn-o","Edit brief");add.hidden=true;back.hidden=true;ui.foot.appendChild(back);ui.foot.appendChild(generate);ui.foot.appendChild(add);
  function values(){return {goal:goal.value.trim(),audience:audience.value.trim(),offer:offer.value.trim(),constraints:constraints.value.trim()}}
  function validate(){generate.disabled=working||!ready||!values().goal||!values().audience;var chosen=selections.filter(Boolean).length;add.textContent="Add "+chosen+" "+(chosen===1?"activity":"activities");add.disabled=working||!chosen||drafts.some(function(d,i){return selections[i]&&(!d.title.trim()||!d.dueDate||d.dueDate<c.startDate||d.dueDate>c.endDate)});}
  [goal,audience,offer,constraints].forEach(function(n){n.oninput=validate});
  back.onclick=function(){results.hidden=true;brief.hidden=false;generate.hidden=false;back.hidden=true;add.hidden=true;goal.focus()};
  function busy(value){working=value;overlayState.busy=value;ui.close.disabled=value;ui.cancel.disabled=value;ui.body.querySelectorAll("input,textarea,select,button").forEach(function(n){n.disabled=value});back.disabled=value;validate()}
  function drawPlan(){
    clear(results);results.appendChild(el("p","ai-plan-summary",plan.summary));
    if(plan.assumptions.length){var assumptions=el("details"),summary=el("summary",null,"Assumptions to check ("+plan.assumptions.length+")");assumptions.appendChild(summary);var list=el("ul","sop-steps");plan.assumptions.forEach(function(s){list.appendChild(el("li",null,s))});assumptions.appendChild(list);results.appendChild(assumptions)}
    results.appendChild(el("p","hint","Edit titles and dates, or uncheck anything you don’t need. Nothing is added until you confirm. Matching SOPs can be added when you open an activity."));
    drafts.forEach(function(d,i){var card=el("div","ai-step"),check=input("checkbox","");check.checked=selections[i];check.setAttribute("aria-label","Include "+d.title);check.onchange=function(){selections[i]=check.checked;validate()};card.appendChild(check);
      var content=el("div","ai-step-content"),title=input("text",d.title);title.maxLength=160;title.setAttribute("aria-label","Suggested activity title "+(i+1));title.oninput=function(){d.title=title.value;validate()};content.appendChild(title);
      var meta=el("div","ai-step-meta");meta.appendChild(el("span","tag",[d.type].concat(d.platforms).join(" · ")));var due=input("date",d.dueDate);due.min=c.startDate;due.max=c.endDate;due.setAttribute("aria-label","Due date for suggestion "+(i+1));due.oninput=function(){d.dueDate=due.value;validate()};meta.appendChild(due);content.appendChild(meta);
      content.appendChild(el("p","ai-step-why",d.why));content.appendChild(el("p","hint","Measure: "+d.metric));
      var detail=el("details"),summary=el("summary",null,d.subtasks.length+" execution steps");detail.appendChild(summary);var list=el("ul","sop-steps");d.subtasks.forEach(function(s){list.appendChild(el("li",null,s))});detail.appendChild(list);content.appendChild(detail);card.appendChild(content);results.appendChild(card);
    });results.hidden=false;brief.hidden=true;generate.hidden=true;back.hidden=false;add.hidden=false;validate();
  }
  generate.onclick=function(){
    validate();if(generate.disabled)return;ui.error.hidden=true;busy(true);generate.textContent="Drafting your plan…";status.textContent="Thinking through the goal and what’s already planned…";
    var current=campById(c.id);if(!current){busy(false);ui.error.textContent="This campaign no longer exists.";ui.error.hidden=false;return}
    var request={campaign:{name:current.name,startDate:current.startDate,endDate:current.endDate},brief:values(),today:TODAY,existing:S.activities.filter(function(a){return a.campaignId===c.id}).map(function(a){return {title:a.title,type:a.type,status:a.status,dueDate:a.dueDate}}),sops:allSopRules().filter(function(r){return r.enabled}).map(function(r){return {name:r.name,platform:r.platform,format:r.format,angle:r.angle}})};
    aiRequest("POST",request).then(function(data){plan=data.plan;drafts=plan.activities.map(function(d){return Object.assign({},d)});selections=drafts.map(function(){return true});planId=sid();status.textContent="Draft from "+data.model+" · Review before adding";drawPlan()}).catch(function(e){status.textContent="Your campaign is unchanged.";ui.error.textContent=e.message||"AI could not draft a plan. Please try again.";ui.error.hidden=false}).finally(function(){busy(false);generate.textContent="Draft campaign plan"});
  };
  add.onclick=function(){
    validate();if(add.disabled)return;ui.error.hidden=true;busy(true);var selected=drafts.map(function(d,i){return {draft:d,index:i}}).filter(function(x){return selections[x.index]}),details=values(),count=0;
    wq.then(function(){return db.runTransaction(function(tx){
      var campaignRef=db.doc("campaigns/"+c.id),refs=selected.map(function(x){return db.doc("activities/ai-"+planId+"-"+x.index)});
      return Promise.all([tx.get(campaignRef),Promise.all(refs.map(function(ref){return tx.get(ref)}))]).then(function(reads){
        if(!reads[0].exists)throw new Error("This campaign no longer exists.");var current=reads[0].data();count=0;
        var titles=S.activities.filter(function(a){return a.campaignId===c.id}).map(function(a){return a.title.trim().toLowerCase()});
        selected.forEach(function(x,i){if(reads[1][i].exists)return;var d=x.draft;if(d.dueDate<current.startDate||d.dueDate>current.endDate)throw new Error("The campaign dates changed. Review your suggested dates before adding.");
          var titleKey=d.title.trim().toLowerCase();if(titles.indexOf(titleKey)>=0)return;titles.push(titleKey);
          tx.set(refs[i],{campaignId:c.id,title:d.title.trim(),type:d.type,angle:"",cta:"",platforms:d.platforms,dueDate:d.dueDate,dueTime:"",owner:current.owner||"",status:"Not started",description:d.why+"\n\nMeasure: "+d.metric,keywords:[],script:"",assets:{},subtasks:d.subtasks.map(function(s){return newNode(s)}),aiPlanId:planId,createdAt:new Date().toISOString()});count++;
        });tx.update(campaignRef,{aiBrief:details});
      });
    })}).then(function(){busy(false);closeOverlay(true);S.view="campaigns";S.expanded["c"+c.id]=true;render();toast(count?count+" activities added to campaign":"These activities are already in your campaign")}).catch(function(e){busy(false);ui.error.textContent=e.message||msgFor(e);ui.error.hidden=false});
  };
  var initialBrief=JSON.stringify(values());validate();overlay(ui.node,function(){return !!plan||JSON.stringify(values())!==initialBrief},true);
  aiRequest("GET").then(function(data){ready=data.configured;status.textContent=ready?"Gemini is ready · Campaign dates: "+fmtShort(c.startDate)+" – "+fmtLong(c.endDate):"AI setup needed: add GEMINI_API_KEY in Vercel → Settings → Environment Variables (Production), then redeploy. Your key stays on the server.";if(!ready){var link=el("a",null,"Open Vercel AI setup");link.href="https://vercel.com/ashutosh-mishra-5049s-projects/contentcalendar/settings/environment-variables";link.target="_blank";link.rel="noopener noreferrer";status.appendChild(document.createTextNode(" "));status.appendChild(link)}validate()}).catch(function(e){status.textContent=e.message;validate()});
}
function openCampaign(c,afterCreate){
  if(!writable())return;
  var isNew=!c;
  var d={name:c?c.name:"",goal:c?(c.goal||""):"",startDate:c?c.startDate:TODAY,
    endDate:c?c.endDate:addDays(TODAY,14),owner:c?(c.owner||""):"",status:c?c.status:"Planning"};
  var initial=JSON.stringify(d);
  var m=el("div","modal");m.setAttribute("role","dialog");m.setAttribute("aria-label",isNew?"New campaign":"Edit campaign");
  var head=el("div","p-head");head.appendChild(el("h2",null,isNew?"New campaign":"Edit campaign"));
  var xb=el("button","x","✕");xb.onclick=closeOverlay;head.appendChild(xb);m.appendChild(head);
  var body=el("div","p-body");m.appendChild(body);
  body.appendChild(el("p","form-intro",isNew?"A campaign groups related content around one goal. Add your activities next.":"Keep the campaign’s dates, goal and ownership up to date."));

  var nm=input("text",d.name,"e.g. NORCET 11 launch push");nm.id="camp-name";
  nm.oninput=function(){d.name=nm.value;validate()};
  nm.required=true;body.appendChild(field("Campaign name *",nm));
  var more=disclosure("Campaign details","Goal, owner & status");

  var gl=input("text",d.goal,"What is this campaign for?");gl.id="camp-goal";
  gl.oninput=function(){d.goal=gl.value};
  more.body.appendChild(field("Goal (optional)",gl));

  var two=el("div","f2");
  var sd=input("date",d.startDate);sd.id="camp-start";
  var ed=input("date",d.endDate);ed.id="camp-end";
  two.appendChild(field("Start date",sd));
  var ew=field("End date",ed);two.appendChild(ew);
  body.appendChild(two);
  var derr=el("div","hint err");derr.hidden=true;body.appendChild(derr);
  sd.oninput=function(){d.startDate=sd.value;validate()};
  ed.oninput=function(){d.endDate=ed.value;validate()};

  more.body.appendChild(field("Owner (optional)",ownerPicker(d.owner,function(id){d.owner=id})));

  var sp=el("div","pills");
  CSTATUS.forEach(function(st){
    var b=el("button","pill",st);b.type="button";
    b.setAttribute("aria-pressed",d.status===st);
    b.onclick=function(){d.status=st;var all=sp.querySelectorAll("button");
      for(var i=0;i<all.length;i++)all[i].setAttribute("aria-pressed",all[i].textContent===st)};
    sp.appendChild(b);
  });
  more.body.appendChild(field("Status",sp));body.appendChild(more.node);if(!isNew)more.node.open=true;

  var foot=el("div","p-foot");
  var requiredNote=el("p","required-note");foot.appendChild(requiredNote);
  var err=el("div","hint err");err.hidden=true;body.appendChild(err);
  var save=el("button","btn btn-p sp",isNew?"Create campaign":"Save changes");
  if(!isNew){
    var n=S.activities.filter(function(a){return a.campaignId===c.id}).length;
    var del=el("button","btn btn-d","Delete"),crow=null;
    del.onclick=function(){
      if(crow)return;
      crow=el("div");crow.style.cssText="display:flex;gap:8px;align-items:center;width:100%;flex-wrap:wrap";
      crow.appendChild(el("span","hint err",n?"Delete this campaign and its "+n+(n===1?" activity?":" activities?"):"Delete this campaign?"));
      var yes=el("button","btn btn-d","Delete");yes.style.marginLeft="auto";
      yes.onclick=function(){
        yes.disabled=true;yes.textContent="Deleting…";
        var kids=S.activities.filter(function(a){return a.campaignId===c.id});
        var chain=Promise.resolve();
        kids.forEach(function(a){chain=chain.then(function(){return db.doc("activities/"+a.id).delete()})});
        chain.then(function(){return db.doc("campaigns/"+c.id).delete()})
          .then(function(){closeOverlay(true);toast("Campaign deleted")})
          .catch(function(e){err.hidden=false;err.textContent=msgFor(e);yes.disabled=false;yes.textContent="Delete"});
      };
      var no=el("button","btn btn-o","Cancel");no.onclick=function(){crow.remove();crow=null};
      crow.appendChild(yes);crow.appendChild(no);foot.appendChild(crow);
    };
    foot.appendChild(del);
  }
  var cancel=el("button","btn btn-o","Cancel");cancel.onclick=function(){closeOverlay()};foot.appendChild(cancel);
  save.onclick=function(){submit()};
  foot.appendChild(save);m.appendChild(foot);

  function validate(){
    var bad=d.endDate&&d.startDate&&d.endDate<d.startDate;
    derr.hidden=!bad;
    if(bad)derr.textContent="End date can't be before the start date.";
    save.disabled=!(d.name.trim()&&d.startDate&&d.endDate)||bad;
    requiredNote.textContent=save.disabled?"Add a campaign name and valid dates to continue.":isNew?"Next: add activities to your campaign.":"Changes apply to this campaign.";
    return !save.disabled;
  }
  function submit(){
    if(!validate())return;
    save.disabled=true;save.textContent="Saving…";err.hidden=true;
    var payload={name:d.name.trim(),goal:d.goal.trim(),startDate:d.startDate,endDate:d.endDate,
      owner:d.owner,status:d.status};
    var done=function(ref){
      closeOverlay(true);
      if(isNew){
        var created=Object.assign({id:ref.id},payload);
        if(!campById(ref.id)){S.campaigns.push(created);sortCampaigns()}
        if(afterCreate){afterCreate(created);return}
        S.view="campaigns";S.query="";resetFilterValues();S.expanded["c"+ref.id]=true;S.focusAdd="c"+ref.id;render();
      }
      toast(isNew?"Campaign created. Add activities or use AI plan for a starting point.":"Campaign updated");
    };
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
  overlay(m,function(){return JSON.stringify(d)!==initial});
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
  while(overlayState)closeOverlay(true);
  document.querySelector(".topbar").inert=true;$("workspace").inert=true;
  var g=$("gate");clear(g);g.hidden=false;
  g.setAttribute("role","dialog");g.setAttribute("aria-modal","true");g.setAttribute("aria-label","Sign in to Content calendar");
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
  var action=g.querySelector("button,a");if(action)action.focus();
}

function startData(){
  subs.forEach(function(f){try{f()}catch(e){}});subs=[];
  S.loading=true;S.err=null;S.sopReady=false;S.sopRules=[];pending=5;render();
  S.templates=[];S.templatesLoading=true;S.templateError="";
  var waiting={campaigns:true,activities:true,users:true,sopRules:true,subtaskTemplates:true};
  function received(key,snap){
    if(waiting[key]&&(!snap||!snap.metadata.fromCache)){
      waiting[key]=false;settled();
    }
  }
  if(timer)clearTimeout(timer);
  timer=setTimeout(function(){if(S.loading){S.stale=true;render()}},10000);
  var onErr=function(e){
    S.loading=false;S.err=msgFor(e);
    if(timer){clearTimeout(timer);timer=null}
    render();
  };
  subs.push(db.collection("campaigns").onSnapshot({includeMetadataChanges:true},function(snap){
    S.campaigns=snap.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});
    sortCampaigns();
    received("campaigns",snap);render();
  },onErr));
  subs.push(db.collection("activities").onSnapshot({includeMetadataChanges:true},function(snap){
    S.activities=snap.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});
    received("activities",snap);render();
  },onErr));
  subs.push(db.collection("sopRules").onSnapshot({includeMetadataChanges:true},function(snap){
    S.sopRules=snap.docs.map(function(d){return Object.assign({},d.data(),{id:d.id})});S.sopReady=true;
    received("sopRules",snap);render();
  },onErr));
  subs.push(db.collection("subtaskTemplates").onSnapshot({includeMetadataChanges:true},function(snap){
    S.templates=snap.docs.map(function(d){return Object.assign({},d.data(),{id:d.id})});
    S.templatesLoading=false;S.templateError="";received("subtaskTemplates",snap);render();
  },function(e){
    S.templatesLoading=false;S.templateError=e.code==="permission-denied"?
      "The SOP library could not load existing checklists. Reload the page to try again.":msgFor(e);received("subtaskTemplates");
  }));
  /* the team roster, so owners resolve to real names */
  subs.push(db.collection("users").onSnapshot({includeMetadataChanges:true},function(snap){
    S.team=snap.docs.map(function(d){
      var v=d.data()||{};
      return {id:d.id,name:v.name||v.email||"Teammate"};
    });
    S.team.forEach(function(p){S.profiles[p.id]={name:p.name}});
    received("users",snap);render();
  },function(){received("users")}));
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

function closeAccount(){$("account-menu").hidden=true;$("who").setAttribute("aria-expanded","false")}
$("who").onclick=function(){
  var menu=$("account-menu");
  if(!menu.hidden){closeAccount();return}
  clear(menu);menu.appendChild(el("strong",null,S.me?S.me.name:"Your account"));
  menu.appendChild(el("span","account-email",S.me?S.me.email:""));
  menu.appendChild(el("span","account-access","NPrep team workspace"));
  var signOut=el("button","account-signout","Sign out");
  signOut.onclick=function(){closeAccount();if(auth)auth.signOut()};menu.appendChild(signOut);
  menu.hidden=false;$("who").setAttribute("aria-expanded","true");
};
document.addEventListener("click",function(e){if(!e.target.closest(".account"))closeAccount()});

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
      S.me=null;S.campaigns=[];S.activities=[];S.team=[];S.templates=[];S.templateError="";S.templatesLoading=true;S.sopRules=[];S.sopReady=false;S.loading=true;
      render();showGate("signin");return;
    }
    if(!emailAllowed(u.email)){S.me=null;render();showGate("denied",u.email);return;}
    $("gate").hidden=true;
    document.querySelector(".topbar").inert=false;$("workspace").inert=false;
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
