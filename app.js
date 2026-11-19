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
var S={campaigns:[],activities:[],view:"calendar",calView:"next7",anchor:"",y:0,m:0,
  filters:{campaign:"",platform:"",format:"",owner:"",status:""},
  loading:true,stale:false,err:null,canWrite:null,open:null,expanded:{},focusAdd:null,lastAdd:{},
  placeFor:null,showFilters:false,me:null,team:[],
  profiles:{},dayMax:3,query:"",focusDay:""};
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
  return [a.title,a.type,a.angle,a.description,(a.keywords||[]).join(" "),c&&c.name].join(" ").toLowerCase().indexOf(q)>=0;
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
        var subTitle=el("button","sub-t sub-title-button",x.n.title);
        subTitle.setAttribute("aria-label","Edit subtask: "+x.n.title);
        subTitle.onclick=function(){openSubtask(it.a,x.n)};r.appendChild(subTitle);
        if(writable())r.appendChild(subtaskEditButton(it.a,x.n));
        var mt=el("span","sub-meta");
        mt.appendChild(subtaskDeadline(it.a,x.n));
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
  return {id:sid(),title:title,description:"",done:false,owner:"",due:"",kind:kind||"",platform:plat||"",children:[]};
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
  var deadline=el(writable()?"button":"span","sub-deadline"+(late?" overdue":"")+(!s.due?" unset":""),s.due?"Due "+date:"Set deadline");
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
    var subTitle=el("button","sub-t sub-title-button"+(nodeDone(s)?" done":""),s.title);
    subTitle.setAttribute("aria-label","Edit subtask: "+s.title);
    subTitle.onclick=function(){openSubtask(a,s)};r.appendChild(subTitle);
    if(writable())r.appendChild(subtaskEditButton(a,s));
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
    mt.appendChild(subtaskDeadline(a,s));
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
  if(writable())box.appendChild(subAddInput(a,null,"+ Add a subtask"));
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
  ti.oninput=function(){go.disabled=!ti.value.trim()};
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
    var t=ti.value.trim();if(!t||go.disabled)return;
    var f=formatById(fs.value),asel=angleBox.querySelector("select");
    var ang=asel?asel.value:"";
    S.lastAdd[c.id]={type:fs.value,angle:ang,date:dt.value,time:tm.value};
    go.disabled=true;go.textContent="…";
    db.collection("activities").add({campaignId:c.id,title:t,type:fs.value,angle:ang,cta:"",
      platforms:f?f.platforms.slice():[],
      dueDate:dt.value||TODAY,dueTime:tm.value,owner:"",status:"Not started",description:"",
      keywords:[],script:"",subtasks:[],createdAt:new Date().toISOString()})
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
  var original={title:s.title||"",description:s.description||"",owner:s.owner||"",due:s.due||"",platform:s.platform||"",kind:s.kind||""};
  var draft=Object.assign({},original),saving=false;
  var dialog=el("div","modal subtask-modal");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-label","Edit subtask");
  var head=el("div","p-head");head.appendChild(el("h2",null,"Subtask details"));
  var close=el("button","x","✕");close.onclick=closeOverlay;head.appendChild(close);dialog.appendChild(head);
  var body=el("div","p-body");dialog.appendChild(body);
  body.appendChild(el("p","form-intro","Part of "+a.title+(kids(s).length?". This group contains other checklist items.":".")));
  var title=input("text",draft.title,"What needs to be done?");title.required=true;
  title.oninput=function(){draft.title=title.value;validate()};body.appendChild(field("Subtask name *",title));
  var description=el("textarea","subtask-description-input");description.value=draft.description;description.rows=5;
  description.placeholder="Add instructions, context, links or acceptance criteria…";
  description.oninput=function(){draft.description=description.value};
  body.appendChild(field("Description (optional)",description,"Include anything the person doing this task needs to know."));
  var planning=el("div","f2"),date=input("date",draft.due);
  if(focusDeadline)date.autofocus=true;
  date.oninput=function(){draft.due=date.value};planning.appendChild(field("Deadline (optional)",date));
  planning.appendChild(field("Owner (optional)",ownerPicker(draft.owner,function(id){draft.owner=id})));body.appendChild(planning);
  var details=disclosure("More details","Platform & type");
  var platform=dropdown(PLATFORMS.map(function(p){return[p[0],p[0]]}),draft.platform,"Not set");
  platform.onchange=function(){draft.platform=platform.value};details.body.appendChild(field("Platform",platform));
  var kind=dropdown(SUBKINDS.map(function(k){return[k,k]}),draft.kind,"Not set");
  kind.onchange=function(){draft.kind=kind.value};details.body.appendChild(field("Type",kind));body.appendChild(details.node);
  var err=el("p","hint err");err.hidden=true;err.setAttribute("role","alert");body.appendChild(err);
  var foot=el("div","p-foot"),note=el("p","required-note","Save to update this subtask. Other checklist items stay as they are.");
  foot.appendChild(note);
  var cancel=el("button","btn btn-o","Cancel");cancel.onclick=function(){closeOverlay()};foot.appendChild(cancel);
  var save=el("button","btn btn-p sp","Save subtask");foot.appendChild(save);dialog.appendChild(foot);
  function validate(){save.disabled=saving||!draft.title.trim()||!writable();return !save.disabled}
  save.onclick=function(){
    if(!validate())return;
    var changes={};Object.keys(original).forEach(function(key){var value=key==="title"?draft[key].trim():draft[key];if(value!==original[key])changes[key]=value});
    if(!Object.keys(changes).length){closeOverlay(true);return}
    saving=true;validate();save.textContent="Saving…";err.hidden=true;cancel.disabled=true;close.disabled=true;
    body.querySelectorAll("input,textarea,select,button").forEach(function(control){control.disabled=true});
    var editingState=overlayState;editingState.busy=true;
    var savedActivity;
    var write=wq.then(function(){
      var current=S.activities.filter(function(item){return item.id===a.id})[0]||a;
      if(!nodeById(current.subtasks,s.id)){var missing=new Error("Subtask no longer exists");missing.code="not-found";throw missing}
      var updated=patchNode(current.subtasks,s.id,changes);
      return db.doc("activities/"+a.id).update({subtasks:updated}).then(function(){current.subtasks=updated;a.subtasks=updated;savedActivity=current});
    });
    wq=write.catch(function(){});
    write.then(function(){
      editingState.busy=false;
      if(overlayState===editingState)closeOverlay(true);
      if(onSaved)onSaved(savedActivity);
      render();
      if(overlayState){var savedNote=overlayState.node.querySelector(".autosave-note");if(savedNote)savedNote.textContent="Subtask saved. Status and checklist changes save automatically."}
      else toast("Subtask saved");
    }).catch(function(e){
      editingState.busy=false;saving=false;validate();save.textContent="Save subtask";cancel.disabled=false;close.disabled=false;
      body.querySelectorAll("input,textarea,select,button").forEach(function(control){control.disabled=false});
      err.textContent=msgFor(e);err.hidden=false;
    });
  };
  clear($("toasts"));
  validate();overlay(dialog,function(){return JSON.stringify(draft)!==JSON.stringify(original)},true);
}

/* ─── activity panel ────────────────────────────────────── */
function openActivity(a,presetDate,presetCampaign,preset){
  if(!a&&!writable())return;
  if(!a&&!S.campaigns.length){openCampaign(null,function(c){openActivity(null,presetDate,c.id,preset)});return}
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
    script:a?(a.script||""):"",useTemplate:false
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
  var contentDetails=disclosure("Content details","Topic, platforms, notes & keywords");
  var angleWrap=el("div"),ctaWrap=el("div");
  contentDetails.body.appendChild(angleWrap);contentDetails.body.appendChild(ctaWrap);
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
    if(templateHint)templateHint.textContent=templateDescription();
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
  contentDetails.body.appendChild(field("Platforms",pl,"Choose where this activity will appear."));

  var two=el("div","f2");
  var dd=input("date",d.dueDate);dd.id="act-date";
  var dt=input("time",d.dueTime);dt.id="act-time";
  dd.required=true;
  var dw=field("Due date *",dd),tw=field("Time (optional)",dt,"Leave blank for any time that day.");
  two.appendChild(dw);two.appendChild(tw);
  body.appendChild(two);
  var rangeHint=el("div","hint warn");rangeHint.hidden=true;body.appendChild(rangeHint);
  dd.oninput=function(){d.dueDate=dd.value;validate()};
  dt.oninput=function(){d.dueTime=dt.value};

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
          patchSub(s.id,{title:v||s.title});
        };
        r.appendChild(ti);
        r.appendChild(subtaskEditButton(a,s,function(current){a.subtasks=current.subtasks;drawSubs(null)}));
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
      labelIconControls(sbox);
    };
    drawSubs(null);
    var checklist=disclosure("Checklist",subDone(a)+" of "+subTotal(a)+" items complete");checklist.node.open=true;
    checklist.body.appendChild(sbox);body.appendChild(checklist.node);
  }else{
    var checklist=disclosure("Checklist","Start with a suggested set of steps");
    var checkLabel=el("label","check-label"),templateToggle=input("checkbox");templateToggle.id="act-template";
    templateToggle.onchange=function(){d.useTemplate=templateToggle.checked};
    checkLabel.appendChild(templateToggle);checkLabel.appendChild(document.createTextNode("Add suggested checklist"));
    var templateHint=el("p","hint",templateDescription());
    checklist.body.appendChild(checkLabel);checklist.body.appendChild(templateHint);body.appendChild(checklist.node);
  }
  body.appendChild(scriptSection.node);
  function templateDescription(){return (STEPS[d.type]||["Script","Edit","Review"]).map(function(s){return typeof s==="string"?s:s.t}).join(" · ")}

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

  function showErr(e){err.hidden=false;err.textContent=msgFor(e);save.disabled=false;save.textContent=isNew?"Create activity":"Save changes"}
  function validate(){
    var ok=d.title.trim()&&d.campaignId&&d.dueDate;
    save.disabled=!ok||!writable();
    var missing=[];if(!d.title.trim())missing.push("a title");if(!d.campaignId)missing.push("a campaign");if(!d.dueDate)missing.push("a due date");
    requiredNote.textContent=ok?(isNew?"Optional details can be added later.":"Save changes to update the details above."):"Add "+missing.join(", ")+" to continue.";
    var c=campById(d.campaignId);
    if(c&&d.dueDate&&(d.dueDate<c.startDate||d.dueDate>c.endDate)){
      rangeHint.hidden=false;
      rangeHint.textContent="This date is outside the campaign window ("+fmtShort(c.startDate)+" → "+fmtLong(c.endDate)+"). You can still save it.";
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
      payload.status="Not started";payload.assets={};payload.subtasks=d.useTemplate?buildSteps(STEPS[d.type]||["Script","Edit","Review"]):[];
      payload.createdAt=new Date().toISOString();
      db.collection("activities").add(payload).then(function(){closeOverlay(true);toast("Activity added to "+fmtLong(d.dueDate))})
        .catch(showErr);
    }else{
      db.doc("activities/"+a.id).update(payload).then(function(){closeOverlay(true);toast("Changes saved")}).catch(showErr);
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
      toast(isNew?"Campaign created. Add your first activity below.":"Campaign updated");
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
  S.loading=true;S.err=null;pending=3;render();
  var waiting={campaigns:true,activities:true,users:true};
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
      S.me=null;S.campaigns=[];S.activities=[];S.team=[];S.loading=true;
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
