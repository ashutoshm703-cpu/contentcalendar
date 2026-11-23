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
  {id:"NASHTA/PreBoard",label:"NASHTA/PreBoard",group:"Tests",platforms:[],angles:[]},
  {id:"Post",label:"Post",group:"Other",platforms:["Instagram","Facebook"],angles:[]},
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
  "NASHTA/PreBoard":["Prepare questions","Review answer key","Configure test","Publish test","Review results"],
  "Thumbnail":["Design","Review"]
};
function formatById(id){for(var i=0;i<FORMATS.length;i++)if(FORMATS[i].id===id)return FORMATS[i];return null}
function formatSelect(cur,blank,cls,platform){
  var s=el("select");if(cls)s.className=cls;var first=el("option",null,blank);first.value="";s.appendChild(first);var choices=platform!==undefined?contentFormats(platform):FORMATS,seen={};
  choices.forEach(function(f){if(seen[f.id])return;seen[f.id]=true;var option=el("option",null,f.label);option.value=f.id;option.selected=f.id===cur;s.appendChild(option)});
  if(cur&&!seen[cur]){var previous=el("optgroup");previous.label="Previously selected";var option=el("option",null,formatLabel(cur,platform));option.value=cur;option.selected=true;previous.appendChild(option);s.appendChild(previous)}
  s.disabled=platform!==undefined&&!platform;return s;
}
var PLATFORMS=[["YouTube","YT"],["Instagram","IG"],["Facebook","FB"],["WhatsApp","WA"],["Telegram","TG"],["Push","PN"],["App","APP"]];
var DEFAULT_FORMATS=JSON.parse(JSON.stringify(FORMATS)),DEFAULT_PLATFORMS=JSON.parse(JSON.stringify(PLATFORMS));
function defaultContentOptions(){return {version:0,platforms:DEFAULT_PLATFORMS.map(function(p){return {id:p[0],label:p[0],abbr:p[1],archived:false,formats:DEFAULT_FORMATS.filter(function(f){return !f.platforms.length||f.platforms.indexOf(p[0])>=0}).map(function(f){return {id:f.id,label:f.label,archived:false,topics:f.angles.map(function(t){return {id:t,label:t,archived:false}})}})}})}}
var CONTENT_OPTIONS=defaultContentOptions();
function contentPlatform(id,options){return ((options||CONTENT_OPTIONS).platforms||[]).find(function(p){return p.id===id})}
function contentFormats(platform,includeArchived){var p=contentPlatform(platform);return p&&(includeArchived||!p.archived)?p.formats.filter(function(f){return includeArchived||!f.archived}):[]}
function contentTopics(platform,format,includeArchived){var f=contentFormats(platform,true).find(function(f){return f.id===format});return f?f.topics.filter(function(t){return includeArchived||!t.archived}):[]}
function contentFormatFits(platform,format){return !format||contentFormats(platform).some(function(f){return f.id===format})}
function platformLabel(id){var p=contentPlatform(id);return p?p.label:id}
function formatLabel(id,platform){var f=contentFormats(platform,true).find(function(f){return f.id===id})||formatById(id);return f?f.label:id}
function topicLabel(id,format,platform){var t=contentTopics(platform,format,true).find(function(t){return t.id===id});if(!t)CONTENT_OPTIONS.platforms.some(function(p){t=contentTopics(p.id,format,true).find(function(t){return t.id===id});return !!t});return t?t.label:id}
function platformOptions(current){var out=CONTENT_OPTIONS.platforms.filter(function(p){return !p.archived||p.id===current}).map(function(p){return[p.id,p.label+(p.archived?" (archived)":"")]});if(current&&!out.some(function(p){return p[0]===current}))out.push([current,platformLabel(current)]);return out}
function contentPlatformSelect(current,blank){return dropdown(platformOptions(current),current||"",blank)}
function setContentOptions(options){
  CONTENT_OPTIONS=plannerContentOptions(options);PLATFORMS=CONTENT_OPTIONS.platforms.filter(function(p){return !p.archived}).map(function(p){return[p.id,p.abbr||p.label.slice(0,3).toUpperCase(),p.label]});var all=[];
  CONTENT_OPTIONS.platforms.forEach(function(p){p.formats.forEach(function(f){var known=all.find(function(x){return x.id===f.id}),original=DEFAULT_FORMATS.find(function(x){return x.id===f.id});if(!known){known={id:f.id,label:f.label,group:original?original.group:p.label,platforms:[],angles:[],cta:!!(original&&original.cta)};all.push(known)}if(!p.archived&&!f.archived){known.platforms.push(p.id);f.topics.filter(function(t){return !t.archived}).forEach(function(t){if(known.angles.indexOf(t.id)<0)known.angles.push(t.id)})}})});FORMATS=all;
}
/* Older saved option lists predate Instagram Post. Keep existing names, IDs
   and archived choices; add only the missing branch without rewriting tasks. */
function plannerContentOptions(options){
  var next=JSON.parse(JSON.stringify(options)),instagram=next.platforms.find(function(p){return p.id==="Instagram"}),post;
  next.platforms.some(function(p){post=p.formats.find(function(f){return f.id==="Post"});return !!post});
  if(instagram&&!instagram.formats.some(function(f){return f.id==="Post"||normalizeSopName(f.label)===normalizeSopName(post?post.label:"Post")}))instagram.formats.push({id:"Post",label:post?post.label:"Post",archived:false,topics:[]});
  return next;
}
function replaceSelect(select,next){var value=next.value,attrs=Array.from(select.attributes).map(function(a){return[a.name,a.value]});clear(select);while(next.firstChild)select.appendChild(next.firstChild);select.value=value;select.disabled=next.disabled;attrs.forEach(function(a){if(a[0]!=="disabled")select.setAttribute(a[0],a[1])})}
function validateContentOptions(options){
  function fail(message){throw Object.assign(new Error(message),{userMessage:message})}
  function list(items,label,max){if(!Array.isArray(items)||items.length>max)fail("Too many "+label+". Keep the list within "+max+".");var ids={},names={};items.forEach(function(x){if(!x||typeof x.id!=="string"||!x.id||x.id.length>180||typeof x.label!=="string"||!x.label.trim()||x.label.length>100||typeof x.archived!=="boolean")fail("Give each "+label+" option a name (up to 100 characters).");var key=normalizeSopName(x.label);if(ids[x.id]||names[key])fail("Duplicate "+label+" name: "+x.label+". Rename or restore the existing option.");ids[x.id]=true;names[key]=true})}
  list(options.platforms,"platform",30);var count=0,formatNames={};options.platforms.forEach(function(p){list(p.formats,"format",100);count+=p.formats.length;p.formats.forEach(function(f){if(formatNames[f.id]&&formatNames[f.id]!==f.label)fail("A shared format must have the same name on every platform.");formatNames[f.id]=f.label;list(f.topics,"topic",100)})});if(count>400)fail("Keep the shared list within 400 platform/format combinations.");return true;
}
function saveContentOptions(d,version){
  validateContentOptions(d);return db.runTransaction(function(tx){var ref=db.doc("workspaceSettings/contentOptions");return tx.get(ref).then(function(snap){var current=snap.exists?snap.data():{version:0};if(current.version!==version)throw Object.assign(new Error("Content options changed elsewhere. Reopen the latest list before saving."),{userMessage:"Content options changed elsewhere. Reopen the latest list before saving."});var next={version:version+1,platforms:d.platforms,updatedAt:new Date().toISOString(),updatedBy:S.me.id};tx.set(ref,next);return next})}).then(function(saved){setContentOptions(saved);S.contentOptionsReady=true;render();return saved});
}
var STATUSES=["Not started","In progress","Ready","Published"];
var CSTATUS=["Planning","Live","Done"];
var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
var DOW=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ─── state ─────────────────────────────────────────────── */
var S={campaigns:[],activities:[],view:"calendar",calView:"next7",workScope:"my",completing:{},anchor:"",y:0,m:0,
  filters:{campaign:"",platform:"",format:"",topic:"",owner:"",status:""},
  loading:true,stale:false,err:null,canWrite:null,open:null,expanded:{},focusAdd:null,lastAdd:{},
  placeFor:null,showFilters:false,me:null,team:[],members:[],userRoster:[],ownerAliases:{},membersReady:false,teamError:"",workCollapsed:{},
  profiles:{},dayMax:3,query:"",focusDay:"",templates:[],templateError:"",templatesLoading:true,
  sopRules:[],sopReady:false,contentOptionsReady:false,contentOptionsError:"",plannerPlatform:"Instagram",weeklyPlan:null,weeklyPlanReady:false,weeklyPlanError:"",cadenceExpanded:{}};
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
function validDueTime(t){return typeof t==="string"&&(t===""||/^([01]\d|2[0-3]):[0-5]\d$/.test(t))}
function dueTimeBadge(t){var badge=el("span","due-time","Due "+fmtTime(t));badge.title="Due at "+fmtTime(t);return badge}
function addDays(s,n){var d=parseISO(s);d.setDate(d.getDate()+n);return iso(d)}
function weekBounds(){var d=new Date(),off=(d.getDay()+6)%7;d.setDate(d.getDate()-off);var a=iso(d);d.setDate(d.getDate()+6);return[a,iso(d)]}
function daysBetween(a,b){return Math.round((parseISO(b)-parseISO(a))/86400000)}
function weekStart(s){var d=parseISO(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)}
function dowIdx(s){return (parseISO(s).getDay()+6)%7}
function monthLast(y,m){return y+"-"+pad(m+1)+"-"+pad(new Date(y,m+1,0).getDate())}
function viewRange(){
  if(S.calView==="today")return[TODAY,TODAY];
  if(S.calView==="next7"){var start=weekStart(S.anchor||TODAY);return[start,addDays(start,6)]}
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
  return "Weekly · "+rangeLabel(r[0],r[1]);
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
    if(f.topic&&a.angle!==f.topic)return false;
    if(!activityInWorkScope(a))return false;
    if(f.platform&&(a.platforms||[]).indexOf(f.platform)<0)return false;
    return true;
  });
}
function effectiveWork(a){
  var out=[];function walk(nodes,parent,path,depth){(nodes||[]).forEach(function(n){var row={a:a,n:n,id:n.id,title:n.title,due:n.due||parent.due||"",dueTime:n.dueTime||"",owner:ownerIdentity(n.owner||parent.owner||""),inheritedDue:!n.due,parentDue:parent.due||"",source:n.due?n.title:parent.source,done:nodeDone(n),path:path.join(" → "),depth:depth};out.push(row);walk(kids(n),{due:row.due,owner:row.owner,source:row.source},path.concat(n.title),depth+1)})}
  walk(a.subtasks,{due:a.dueDate||"",owner:a.owner||"",source:a.title},[],0);return out;
}
function workOwner(){return S.workScope==="my"?(S.me&&S.me.id)||"__signed_out__":S.filters.owner||""}
function ownerInScope(owner){var expected=workOwner();return !expected||ownerIdentity(owner)===ownerIdentity(expected)}
function activityInWorkScope(a){return ownerInScope(a.owner||"")||effectiveWork(a).some(function(row){return ownerInScope(row.owner)})}
function workItems(list){var out=[];(list||visible()).forEach(function(a){
  if(ownerInScope(a.owner||""))out.push({a:a,n:null,id:"activity:"+a.id,title:a.title,due:a.dueDate||"",dueTime:a.dueTime||"",owner:ownerIdentity(a.owner||""),done:a.status==="Published",path:"",depth:-1,inheritedDue:false});
  effectiveWork(a).forEach(function(row){if(!kids(row.n).length&&ownerInScope(row.owner))out.push(row)});
});return out}
function workByDay(list){var map={};workItems(list).forEach(function(row){if(row.due)(map[row.due]=map[row.due]||[]).push(row)});return map}
function scopedNodes(a,nodes){var allowed={};effectiveWork(a).forEach(function(row){if(ownerInScope(row.owner))allowed[row.id]=true});function filter(list){return (list||[]).reduce(function(out,n){var children=filter(kids(n));if(kids(n).length?children.length:allowed[n.id])out.push(Object.assign({},n,{children:children}));return out},[])}return filter(nodes)}
function matchesSearch(a){
  var q=S.query.trim().toLowerCase();
  if(!q)return true;
  var c=campById(a.campaignId);
  function subtext(nodes){return (nodes||[]).map(function(n){return [n.title,n.description,subtext(kids(n))].join(" ")}).join(" ")}
  return [a.title,a.type,a.angle,formatLabel(a.type,(a.platforms||[])[0]),topicLabel(a.angle,a.type,(a.platforms||[])[0]),(a.platforms||[]).map(platformLabel).join(" "),a.description,(a.keywords||[]).join(" "),c&&c.name,subtext(a.subtasks)].join(" ").toLowerCase().indexOf(q)>=0;
}
function campaignMatches(c){
  var f=S.filters,q=S.query.trim().toLowerCase();
  if(f.campaignStatus&&c.status!==f.campaignStatus)return false;
    if(!S.activities.some(function(a){return a.campaignId===c.id&&activityInWorkScope(a)})&&!(S.workScope==="team"&&!f.owner)&&!(S.workScope==="my"&&S.me&&ownerIdentity(c.owner)===S.me.id))return false;
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
  S.activities.concat(S.campaigns).forEach(function(r){var id=ownerIdentity(r.owner);if(id&&!seen[id]){seen[id]=1;out.push(id)}});
  S.activities.forEach(function(a){effectiveWork(a).forEach(function(row){if(row.owner&&!seen[row.owner]){seen[row.owner]=1;out.push(row.owner)}})});
  return out;
}

/* ─── dom helpers ───────────────────────────────────────── */
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild)}
function uname(id){
  var s=el("span","uid owner-badge");s.setAttribute("data-uid",id);s.setAttribute("role","img");
  updateOwnerBadge(s,(S.profiles[id]||{}).name);
  return s;
}
function updateOwnerBadge(badge,name){
  var resolved=String(name||"").trim(),label=resolved||"Teammate",avatar=badge.querySelector(".owner-avatar"),text=badge.querySelector(".owner-name");
  if(!avatar||!text){clear(badge);avatar=el("span","owner-avatar");avatar.setAttribute("aria-hidden","true");text=el("span","owner-name");badge.appendChild(avatar);badge.appendChild(text)}
  avatar.textContent=resolved?initials(label.split(" · ")[0]):"?";text.textContent=label;badge.title="Owner: "+label;badge.setAttribute("aria-label","Owner: "+label);
}
function toast(msg){
  clear($("toasts"));var t=el("div","toast",msg);t.setAttribute("role","status");$("toasts").appendChild(t);
  setTimeout(function(){t.style.transition="opacity .3s";t.style.opacity="0";setTimeout(function(){t.remove()},320)},2300);
}
function writable(){return S.canWrite!==false}
/* Match the immutable Firebase identity used by the database delete policy. */
function canDeleteTasks(){return writable()&&!!S.me&&S.me.id==="XPLO57VwLWZnXGaI2uJzVL4qx6t2"&&String(S.me.email||"").toLowerCase()==="ashutosh_mishra@nprep.in"}
function initials(n){
  var p=String(n||"").trim().split(/\s+/).filter(Boolean);
  if(!p.length)return "?";
  return (p[0][0]+(p.length>1?p[p.length-1][0]:"")).toUpperCase();
}

/* ─── render: pulse ─────────────────────────────────────── */
/* The page says, in words, what this screen is for. One job, one title. */
function headTitle(){
  if(S.view==="campaigns")return "Campaigns";
  if(S.view==="planner")return "Content planner";
  if(S.calView==="today")return "Today";
  if(S.calView==="next7"||S.calView==="week"){
    var r=viewRange();
    return r[0]===weekStart(TODAY)?"This week":"Week of "+fmtLong(r[0]);
  }
  return MONTHS[S.m]+" "+S.y;
}
function headSub(){
  if(S.loading)return "Loading the team's plan…";
  if(S.view==="planner")return "What to publish each week on Instagram and YouTube.";
  if(S.view==="campaigns"){
    if(!S.campaigns.length)return "Nothing planned yet.";
    if(S.query||activeFilters().length){var matches=S.campaigns.filter(campaignMatches).length;return matches+" matching "+(matches===1?"campaign":"campaigns")}
    var live=S.campaigns.filter(function(c){return c.status==="Live"}).length;
    return S.campaigns.length+(S.campaigns.length===1?" campaign":" campaigns")
      +(live?" · "+live+" live":"");
  }
  var r=viewRange();
  if(S.calView==="next7"&&S.focusDay)r=[S.focusDay,S.focusDay];
  var rows=workItems().filter(function(row){return row.due>=r[0]&&row.due<=r[1]}),n=rows.filter(function(row){return !row.done}).length,done=rows.length-n;
  if(S.calView==="today")return n+" to do today"+(done?" · "+done+" complete":"");
  if(S.calView==="next7")return rangeLabel(r[0],r[1])+" · "+n+" to do · "+done+" complete";
  if(S.calView==="week")
    return n?(n+" scheduled this week"):"Nothing scheduled this week yet.";
  return n?(n+" scheduled in "+MONTHS[S.m]):"Nothing scheduled in "+MONTHS[S.m]+" yet.";
}
function filterLabel(k,v){
  if(k==="campaign"){var c=campById(v);return c?c.name:v}
  if(k==="owner")return (S.profiles[v]&&S.profiles[v].name)||"Teammate";
  if(k==="platform")return platformLabel(v);if(k==="format")return formatLabel(v);if(k==="topic")return topicLabel(v,S.filters.format,S.filters.platform);return v;
}
function activeFilters(){
  var keys=S.view==="campaigns"?["owner","campaignStatus"]:["campaign","platform","format","topic","owner","status"];
  return keys.filter(function(k){return S.filters[k]});
}
function renderHead(){
  var h=$("head");clear(h);
  var cal=S.view!=="campaigns";
  var box=el("div","phead"+(S.view==="planner"?" is-planner":"")+(S.view==="calendar"&&S.calView==="next7"?" is-weekly":""));
  var heading=el("div","pheading"),intro=el("div");
  intro.appendChild(el("p","eyebrow",S.view==="planner"?"Weekly content plan":cal?"Daily work":"Campaign planning"));
  intro.appendChild(el("h1",null,headTitle()));
  intro.appendChild(el("p","psub",headSub()));heading.appendChild(intro);
  var add=el("button","btn btn-p","+ "+(!cal?"New campaign":"New activity"));add.id="new-act";
  add.hidden=S.loading||!S.me||!writable()||(!S.campaigns.length&&S.view!=="planner");
  add.onclick=!cal?function(){openCampaign(null)}:function(){var range=viewRange();openActivity(null,S.calView==="next7"?(S.focusDay||(TODAY>=range[0]&&TODAY<=range[1]?TODAY:range[0])):undefined)};
  if(S.view!=="planner")heading.appendChild(add);box.appendChild(heading);
  if(S.me&&!S.loading&&writable()&&S.view!=="planner"){
    var rules=el("button","text-button sop-manage","SOP library");rules.onclick=openSopRules;heading.insertBefore(rules,add);
  }
  if(S.view==="planner"){h.appendChild(box);return}
  var ctl=el("div","pctl");
  if(S.me){var scope=el("div","work-scope");scope.setAttribute("role","group");scope.setAttribute("aria-label","Work visibility");[["my","My work"],["team","Team work"]].forEach(function(option){var button=el("button",S.workScope===option[0]?"on":"",option[1]);button.setAttribute("aria-pressed",String(S.workScope===option[0]));button.onclick=function(){S.workScope=option[0];S.filters.owner="";render()};scope.appendChild(button)});ctl.appendChild(scope)}
  if(S.view==="calendar"&&(S.calView==="next7"||S.calView==="week"||S.calView==="month")){
    var weekly=S.calView==="next7"||S.calView==="week";
    var nav=el("div","nav");
    var pv=el("button",null,"‹");pv.setAttribute("aria-label",weekly?"Previous week":"Previous");pv.title=weekly?"Previous week":"Previous month";
    pv.id="calendar-previous";pv.onclick=function(){step(-1);focusWithoutScroll($("calendar-previous"))};
    var nx=el("button",null,"›");nx.setAttribute("aria-label",weekly?"Next week":"Next");nx.title=weekly?"Next week":"Next month";
    nx.id="calendar-next";nx.onclick=function(){step(1);focusWithoutScroll($("calendar-next"))};
    nav.appendChild(pv);nav.appendChild(nx);ctl.appendChild(nav);
    var td=el("button","ghost",weekly?"This week":"Today");
    td.onclick=function(){
      var d=new Date();S.y=d.getFullYear();S.m=d.getMonth();S.anchor=TODAY;S.focusDay="";
      clearDayExpand();render();
    };
    ctl.appendChild(td);
    if(weekly){var jump=input("date",S.focusDay||S.anchor||TODAY),jumpLabel=el("label","weekly-jump","Jump to date");jump.className="weekly-date";jump.setAttribute("aria-label","Jump to date");jump.title="Jump to a date and review its tasks";jump.onchange=function(){if(jump.value&&jump.checkValidity()){S.anchor=jump.value;S.focusDay=jump.value;clearDayExpand();render()}};jumpLabel.appendChild(jump);ctl.appendChild(jumpLabel)}
  }
  if(S.me&&!S.loading&&writable()){var content=el("button","text-button","Content options");content.onclick=function(){openContentOptions()};ctl.appendChild(content)}
  if(S.campaigns.length&&!S.loading){var folds=el("div","work-fold-tools");[["Collapse all",true],["Expand all",false]].forEach(function(option){var button=el("button","text-button",option[0]);button.onclick=function(){foldAllWork(option[1])};folds.appendChild(button)});ctl.appendChild(folds)}
  var late=workItems().filter(function(row){return row.due&&row.due<TODAY&&!row.done}).length;
  if(late&&!(S.view==="calendar"&&S.calView==="today")){
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
    var ids=ownerIds();
    if(S.workScope==="team"&&ids.length)f.appendChild(sel("f-own","Assigned to anyone",ids.map(function(id){return[id,(S.profiles[id]&&S.profiles[id].name)||"Teammate"]}),S.filters.owner,
      function(v){S.filters.owner=v;render()}));
    return f;
  }
  f.appendChild(sel("f-camp","All campaigns",S.campaigns.map(function(c){return[c.id,c.name]}),S.filters.campaign,
    function(v){S.filters.campaign=v;render()}));
  f.appendChild(sel("f-plat","All platforms",platformOptions(S.filters.platform),S.filters.platform,function(v){S.filters.platform=v;if(v&&!contentFormatFits(v,S.filters.format))S.filters.format="";S.filters.topic="";render()}));
  var formatChoices=S.filters.platform?contentFormats(S.filters.platform):FORMATS;f.appendChild(sel("f-fmt","All formats",formatChoices.map(function(x){return[x.id,x.label]}),S.filters.format,function(v){S.filters.format=v;S.filters.topic="";render()}));
  var topics=sopTopicSelect(S.filters.format,S.filters.topic||"","All topics",S.filters.platform||undefined);topics.setAttribute("aria-label","All topics");topics.onchange=function(){S.filters.topic=topics.value;render()};f.appendChild(topics);
  var ids=ownerIds();
  if(ids.length&&S.workScope==="team"){
    var os=sel("f-own","Anyone",ids.map(function(i){return[i,(S.profiles[i]&&S.profiles[i].name)||"Teammate"]}),S.filters.owner,
      function(v){S.filters.owner=v;render()});
    f.appendChild(os);
  }
  f.appendChild(sel("f-stat","Any status",STATUSES.map(function(s){return[s,s]}),S.filters.status,
    function(v){S.filters.status=v;render()}));
  return f;
}

/* ─── render: chip ──────────────────────────────────────── */
function saveCompletion(a,nodeId,done){
  var key=a.id+":"+(nodeId||"activity");S.completing=S.completing||{};if(S.completing[key])return Promise.resolve();S.completing[key]=true;render();
  return wq.then(function(){return db.runTransaction(function(tx){var ref=db.doc("activities/"+a.id);return tx.get(ref).then(function(snap){
    if(!snap.exists)throw new Error("This task no longer exists.");var current=Object.assign({id:a.id},snap.data()),patch;
    if(nodeId){var target=nodeById(current.subtasks,nodeId);if(!target)throw new Error("This subtask no longer exists.");function finish(n){return Object.assign({},n,{done:done,completedAt:done?new Date().toISOString():"",children:kids(n).map(finish)})}patch={subtasks:patchNode(current.subtasks,nodeId,finish(target))}}
    else patch={status:done?"Published":"Ready",completedAt:done?new Date().toISOString():""};
    tx.update(ref,patch);return Object.assign({},current,patch);
  })})}).then(function(saved){Object.assign(a,saved);S.activities=S.activities.map(function(item){return item.id===a.id?saved:item});toast(done?"Marked complete":"Marked incomplete");return saved}).catch(function(e){toast(e.code?msgFor(e):e.message);throw e}).finally(function(){delete S.completing[key];render()});
}
function completionControl(a,n,onSaved){
  if(n)n=nodeById(a.subtasks,n.id)||n;
  var done=n?nodeDone(n):a.status==="Published",title=n?n.title:a.title,key=a.id+":"+(n?n.id:"activity"),button=el("button","sub-chk work-complete"+(done?" is-done":""));button.setAttribute("role","checkbox");button.setAttribute("aria-checked",String(done));button.setAttribute("aria-pressed",String(done));button.setAttribute("aria-label",(done?"Reopen: ":"Complete: ")+title);button.setAttribute("data-focus-key","complete:"+key);button.appendChild(el("i",null,"✓"));button.disabled=!writable()||!!(S.completing&&S.completing[key]);
  button.onclick=function(e){e.stopPropagation();function save(){return saveCompletion(a,n&&n.id,!done).then(function(saved){if(onSaved)onSaved(saved)}).catch(function(){})}
    var count=n?leaves(kids(n)).filter(function(child){return !child.done}).length:leaves(a.subtasks).filter(function(child){return !child.done}).length;
    if(!done&&count){var ui=actionDialog(n?"Complete this group?":"Complete this task?",n?"This marks all "+count+" unfinished subtasks in “"+title+"” complete.":count+" subtasks are still unfinished. Completing this task marks the activity published; its subtasks keep their own progress.");var confirm=el("button","btn btn-p",n?"Complete group":"Complete task");confirm.onclick=function(){runDialogSave(ui,confirm,function(){return saveCompletion(a,n&&n.id,true)},function(saved){if(onSaved)onSaved(saved)})};ui.foot.appendChild(confirm);overlay(ui.node,null,true)}else save();
  };return button;
}
function workCard(row){
  var wrap=el("div","work-card"+(row.done?" is-done":""));wrap.setAttribute("data-work-id",row.n?row.a.id+":"+row.id:"activity:"+row.a.id);wrap.appendChild(completionControl(row.a,row.n));
  if(!row.n)wrap.appendChild(chip(row.a));else{var button=el("button","chip work-subtask"),title=el("span","t",row.title),meta=el("div","m");button.setAttribute("data-focus-key","work:"+row.a.id+":"+row.id);button.setAttribute("aria-label","Edit subtask: "+row.title);button.appendChild(title);meta.appendChild(el("span",null,row.a.title));if(row.path)meta.appendChild(el("span",null,row.path));if(row.owner)meta.appendChild(uname(row.owner));button.appendChild(meta);button.onclick=function(){openSubtask(row.a,row.n)};wrap.appendChild(button)}
  var meta=wrap.querySelector(".chip .m");if(meta){if(!row.n)meta.appendChild(row.owner?uname(row.owner):el("span",null,"Unassigned"));if(row.due)meta.appendChild(el("span","work-date",fmtShort(row.due)));if(row.n&&row.dueTime)meta.appendChild(dueTimeBadge(row.dueTime))}return wrap;
}
/* Date/owner filters select work, while its original ancestors provide context. */
function scheduledNodes(a,rows){
  var selected={};rows.forEach(function(row){if(row.n)selected[row.id]=true});
  function keep(nodes){return (nodes||[]).reduce(function(out,n){var children=keep(kids(n));if(selected[n.id]||children.length)out.push(Object.assign({},n,{children:children}));return out},[])}
  return keep(a.subtasks);
}
function groupedWork(rows){
  var groups=[];rows.forEach(function(row){var group=groups.find(function(g){return g.a.id===row.a.id});if(!group){group={a:row.a,rows:[]};groups.push(group)}group.rows.push(row)});
  return groups.sort(function(x,y){return (x.a.dueTime||"99").localeCompare(y.a.dueTime||"99")||x.a.title.localeCompare(y.a.title)});
}
function restoreWorkFolds(){try{var saved=JSON.parse(localStorage.getItem("nprep:work-folds:"+S.me.id)||"{}");S.workCollapsed=saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{}}catch(e){S.workCollapsed={}}}
function rememberWorkFolds(){try{if(S.me)localStorage.setItem("nprep:work-folds:"+S.me.id,JSON.stringify(S.workCollapsed))}catch(e){}}
function workFoldButton(kind,id,title,body){
  var key=kind+":"+id,button=el("button","work-disclosure"),panelId="work-fold-"+(++fieldCount);body.id=panelId;button.type="button";button.setAttribute("data-work-fold",key);button.setAttribute("aria-controls",panelId);button.setAttribute("data-focus-key","fold:"+key);
  function draw(b){var closed=!!S.workCollapsed[key],target=$(b.getAttribute("aria-controls"));if(target)target.hidden=closed;b.textContent=closed?"▸":"▾";b.setAttribute("aria-expanded",String(!closed));b.setAttribute("aria-label",(closed?"Expand ":"Collapse ")+kind+": "+title)}
  body.hidden=!!S.workCollapsed[key];button.textContent=body.hidden?"▸":"▾";button.setAttribute("aria-expanded",String(!body.hidden));button.setAttribute("aria-label",(body.hidden?"Expand ":"Collapse ")+kind+": "+title);
  button.onclick=function(){S.workCollapsed[key]=!S.workCollapsed[key];rememberWorkFolds();document.querySelectorAll("[data-work-fold]").forEach(function(peer){if(peer.getAttribute("data-work-fold")===key)draw(peer)})};return button;
}
function foldAllWork(closed){
  S.campaigns.forEach(function(c){S.workCollapsed["campaign:"+c.id]=closed;S.expanded["c"+c.id]=!closed});S.activities.forEach(function(a){S.workCollapsed["task:"+a.id]=closed;S.expanded["a"+a.id]=!closed;effectiveWork(a).forEach(function(row){if(kids(row.n).length){S.workCollapsed["group:"+row.id]=closed;S.expanded["n"+row.id]=!closed}})});rememberWorkFolds();render();
}
function renderWorkCampaigns(host,rows,options){
  options=options||{};S.campaigns.forEach(function(c){var entries=rows.filter(function(row){return row.a.campaignId===c.id});if(!entries.length)return;
    var section=el("section",options.focus?"cgroup":"work-campaign-block"),head=el("div","work-campaign-head"),body=el("div",options.focus?"cgroup-b":"work-campaign-body"),toggle=workFoldButton("campaign",c.id,c.name,body),heading=el("button",options.focus?"cgroup-h":"work-campaign-heading-button"),title=el("span","work-campaign-heading");section.setAttribute("data-work-campaign-section",c.id);section.style.setProperty("--c",c.colour);title.appendChild(el("small",null,"Campaign"));title.appendChild(el("span",options.focus?"cgroup-n":"work-campaign-name",c.name));heading.appendChild(title);var complete=entries.filter(function(row){return row.done}).length;heading.appendChild(el("span","cgroup-c",(entries.length-complete)+" to do"+(complete?" · "+complete+" complete":"")));heading.setAttribute("aria-label","Toggle campaign: "+c.name);heading.onclick=function(){toggle.click()};head.appendChild(toggle);head.appendChild(heading);section.appendChild(head);
    groupedWork(entries).forEach(function(entry){body.appendChild(workGroup(entry,Object.assign({},options,{campaignHeading:true})))});section.appendChild(body);host.appendChild(section);
  });
}
function workGroup(entry,options){
  options=options||{};var a=entry.a,rows=entry.rows,root=rows.find(function(row){return !row.n}),selected={},effective={},group=el("article","work-group"+(options.compact?" is-compact":"")+(options.focus?" focus-activity":""));
  var campaign=campById(a.campaignId);group.setAttribute("data-work-activity",a.id);group.setAttribute("data-work-campaign",a.campaignId||"");group.setAttribute("aria-label",(campaign?"Campaign: "+campaign.name+". ":"")+"Task: "+a.title);rows.forEach(function(row){if(row.n)selected[row.id]=row});effectiveWork(a).forEach(function(row){effective[row.id]=row});
  var heading=el("div","work-group-head"),body=el("div","work-group-body"),headRow=el("div","work-group-heading-row");
  if(options.compact&&campaign&&!options.campaignHeading)heading.appendChild(el("p","work-group-campaign","Campaign · "+campaign.name));
  var hasChecklist=rows.some(function(row){return !!row.n})||(options.focus&&leaves(scopedNodes(a,a.subtasks)).length);if(hasChecklist)headRow.appendChild(workFoldButton("task",a.id,a.title,body));
  if(root)headRow.appendChild(workCard(root));else{
    var context=el("button","work-parent-context"),title=el("span","work-parent-title",a.title),meta=el("span","work-parent-meta",a.status+" · "+(a.dueDate?"Video deadline "+fmtShort(a.dueDate):"No video deadline"));
    context.setAttribute("aria-label","Open parent task: "+a.title);context.setAttribute("data-focus-key","activity:"+a.id);context.appendChild(title);context.appendChild(meta);if(a.dueTime)context.appendChild(dueTimeBadge(a.dueTime));context.onclick=function(){openActivity(a)};headRow.appendChild(context);
  }
  heading.appendChild(headRow);if(hasChecklist)heading.appendChild(el("p","work-group-step-count",rows.filter(function(row){return !!row.n}).length+" steps in this view"));group.appendChild(heading);
  function tree(nodes){var list=el("ul","work-children");nodes.forEach(function(n){var raw=nodeById(a.subtasks,n.id)||n,row=selected[n.id],branch=kids(n).length>0,item=el("li","work-tree-item"),line=el("div","work-tree-row"+(row?" work-card":" work-branch")+(nodeDone(raw)?" is-done":""));item.setAttribute("data-work-node",n.id);
    if(row)line.setAttribute("data-work-id",a.id+":"+n.id);
    var children=branch?tree(kids(n)):null;if(branch)line.appendChild(workFoldButton("group",n.id,n.title,children));
    if(row||(effective[n.id]&&ownerInScope(effective[n.id].owner)))line.appendChild(completionControl(a,raw));
    var content=el("div","work-tree-content"),name=el("button","work-task-title",n.title);name.setAttribute("aria-label","Edit subtask: "+n.title);name.setAttribute("data-focus-key","work:"+a.id+":"+n.id);name.onclick=function(){openSubtask(a,raw)};content.appendChild(name);
    var meta=el("div","work-task-meta"),schedule=effective[n.id]||row;if(branch){var counts=nodeCount(raw);meta.appendChild(el("span",null,counts[0]+" of "+counts[1]+" complete"))}else if(row&&row.owner)meta.appendChild(uname(row.owner));if(schedule&&schedule.due){var date=el("span","work-date",fmtShort(schedule.due));date.title="Subtask deadline";meta.appendChild(date)}if(raw.dueTime)meta.appendChild(dueTimeBadge(raw.dueTime));
    if(meta.childNodes.length)content.appendChild(meta);line.appendChild(content);item.appendChild(line);if(branch)item.appendChild(children);list.appendChild(item);
  });return list}
  var full=options.focus&&!!S.expanded["focus-subs-"+a.id];if(!full){var nodes=scheduledNodes(a,rows);if(nodes.length)body.appendChild(tree(nodes))}
  if(options.focus)focusChecklist(body,a,options.from,options.to);group.appendChild(body);return group;
}
function chip(a){
  var b=el("button","chip"+(a.status==="Published"?" done":"")+(isLate(a)?" late":""));
  b.setAttribute("data-focus-key","activity:"+a.id);
  b.style.setProperty("--c",campColor(a.campaignId));
  var c=campById(a.campaignId);
  b.title=a.title+(c?" · "+c.name:"")+(a.type?" · "+formatLabel(a.type,(a.platforms||[])[0]):"")+(a.angle?" / "+topicLabel(a.angle,a.type,(a.platforms||[])[0]):"")
    +(a.cta?" · CTA: "+a.cta:"")+" · "+a.status
    +(a.dueTime?" · ends "+fmtTime(a.dueTime):"");
  var title=el("span","t");title.appendChild(el("span",null,a.title));b.appendChild(title);
  var m=el("div","m");
  m.appendChild(el("i","dot s"+statusIdx(a.status)));
  m.appendChild(el("span","status-label",a.status));
  (a.platforms||[]).slice(0,2).forEach(function(p){
    var badge=el("span","pf",platAbbr(p));badge.title=platformLabel(p);m.appendChild(badge);
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
  var frag=document.createDocumentFragment(),map=workByDay(),total=0;
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
    var groups=groupedWork(items),lim=(S.calView==="week"||S.expanded[key])?groups.length:S.dayMax;
    var selectedRows=[];groups.slice(0,lim).forEach(function(entry){selectedRows=selectedRows.concat(entry.rows)});renderWorkCampaigns(cell,selectedRows,{compact:true});
    if(groups.length>lim){
      var mb=el("button","more","+"+(groups.length-lim)+" more tasks");
      mb.onclick=function(k){return function(e){e.stopPropagation();S.expanded[k]=true;render()}}(key);
      cell.appendChild(mb);
    }
    grid.appendChild(cell);
  }
  frag.appendChild(grid);
  return {node:frag,total:total};
}

function agendaList(startISO,endISO,showEmpty){
  var box=el("div","agenda"),map=workByDay(),n=daysBetween(startISO,endISO),k=0,total=0;
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
    renderWorkCampaigns(ii,items,{compact:true});
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
function dueLeaves(a,from,to){return effectiveWork(a).filter(function(row){return !kids(row.n).length&&row.due&&row.due>=from&&row.due<=to&&!row.done&&ownerInScope(row.owner)}).map(function(row){return {n:row.n,path:row.path,due:row.due,owner:row.owner,inheritedDue:row.inheritedDue}})}

/* one tile per day, so empty days stay visible even when the list is grouped by campaign */
function weekStrip(from,to){
  var map=workByDay(),box=el("div","wstrip"),n=daysBetween(from,to);
  for(var i=0;i<=n;i++){
    var key=addDays(from,i),items=map[key]||[],complete=items.filter(function(row){return row.done}).length,pending=items.length-complete;
    var t=el("button","wday"+(key===TODAY?" today":"")+(items.length?"":" empty")+(S.focusDay===key?" selected":""));
    t.setAttribute("aria-pressed",String(S.focusDay===key));
    t.setAttribute("data-work-day",key);
    t.setAttribute("aria-label","Show activities for "+fmtLong(key));
    t.setAttribute("aria-description",pending+" to do, "+complete+" complete");
    t.title=fmtLong(key)+" — "+pending+" to do, "+complete+" complete"
      +". Select to view this day.";
    t.appendChild(el("span","wd",DOW[dowIdx(key)]));
    t.appendChild(el("b",null,String(parseISO(key).getDate())));
    t.appendChild(el("span","wn",pending+" to do"));t.appendChild(el("span","wcomplete",complete+" done"));
    t.onclick=function(k){return function(){S.focusDay=S.focusDay===k?"":k;render()}}(key);
    box.appendChild(t);
  }
  return box;
}
function focusChecklist(host,a,from,to){
  var total=leaves(scopedNodes(a,a.subtasks)).length;if(!total)return false;
  var key="focus-subs-"+a.id,open=!!S.expanded[key],due=dueLeaves(a,from,to).length,bar=el("div","focus-checklist-bar");
  var detail=el("span","hint",due+" unfinished subtasks due "+(from===to?"on this day":"in this range"));bar.appendChild(detail);
  var toggle=el("button","text-button",open?"Hide full checklist":"Show full checklist ("+total+")");toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",(open?"Hide":"Show")+" full checklist for "+a.title);toggle.onclick=function(){S.expanded[key]=!open;render()};bar.appendChild(toggle);host.appendChild(bar);
  if(open){var full=el("div","focus-full-checklist");full.appendChild(el("p","hint","Full checklist · Includes completed steps and steps with other dates or no deadline."));full.appendChild(subtaskTree(a));host.appendChild(full)}return open;
}

/* Today and Weekly: work stays grouped by campaign and task,
   with the range's subtasks under the task they belong to */
function renderFocus(box,from,to,showDates){
  var rows=workItems().filter(function(row){return row.due&&row.due>=from&&row.due<=to});
  renderWorkCampaigns(box,rows,{focus:true,from:from,to:to});
  return rows.length;
}
function overdueBlock(){
  var rows=workItems().filter(function(row){return row.due&&row.due<TODAY}).sort(function(a,b){return a.due.localeCompare(b.due)});if(!rows.length)return null;
  var pending=rows.filter(function(row){return !row.done}).length,complete=rows.length-pending,box=el("details","od work-overdue"),summary=el("summary","od-h",(pending?"Overdue · "+pending:"Earlier deadlines")+(complete?" · "+complete+" complete":"")+" · Review separately");box.open=!!S.expanded.workOverdue;box.ontoggle=function(){S.expanded.workOverdue=box.open};box.appendChild(summary);box.appendChild(el("p","hint","Earlier deadlines stay here. Completed items keep their place in each checklist."));renderWorkCampaigns(box,rows,{compact:true});return box;
}

/* A shared weekly content blueprint, independent of campaign activity dates. */
var CADENCE_PLATFORMS=[
  {id:"Instagram",columns:[{id:"shorts",label:"Shorts / Reels"},{id:"carousel",label:"Carousel"},{id:"stories",label:"Stories"}]},
  {id:"YouTube",columns:[{id:"shorts",label:"Shorts"},{id:"long-form",label:"Long Form"},{id:"live",label:"Live"},{id:"exam",label:"Exam"}]}
];
var CADENCE_DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","As and When"];
function cadenceKey(platform,day,column){return platform+":"+day+":"+column}
function defaultWeeklyPlan(){
  var plan={version:0,cells:{}};
  CADENCE_PLATFORMS.forEach(function(p){CADENCE_DAYS.forEach(function(day,index){p.columns.forEach(function(c){plan.cells[cadenceKey(p.id,index,c.id)]=[]})})});
  function put(platform,day,column,titles){var key=cadenceKey(platform,day,column);plan.cells[key]=titles.map(function(title,index){return {id:"seed-"+platform+"-"+day+"-"+column+"-"+index,title:title}})}
  var igShorts=[["Academic - Its Easy"],["Testimonial - Topper Talk Introduction","Exam Strategy | Salary"],["Academic - Its Easy"],["Gold Student Testimonial"],["Academic - Its Easy"],["Nursing Story"],["Promotional - Product"]];
  var carousels=[["Academic - Concept of Post Live Class"],["Academic - Its Easy"],["Academic - IBQ"],["Topper Talk - Strategy","Academic"],["Academic - Concept of Post Live Class"],["Academic - Its Easy"],["Academic - IBQ","Topper Talk - Questions Discussed"]];
  for(var day=0;day<7;day++){
    put("Instagram",day,"shorts",igShorts[day]);put("Instagram",day,"carousel",carousels[day]);
    var stories=[day===0?"Gold Plan Student Testimonial":"Gold Plan Student","Product Promotions","Carousel Based Story"];if(day===5)stories.unshift("NASHTA");put("Instagram",day,"stories",stories);
    put("YouTube",day,"shorts",["Academic - Concept of Post Live Class"]);put("YouTube",day,"live",day===6?["Academic - 3","Topper's Talk"]:["Academic - 3"]);
  }
  put("Instagram",7,"shorts",["Job Updates","Testimonial","Result"]);
  put("YouTube",0,"long-form",["High Yield Videos"]);put("YouTube",2,"long-form",["Gold Lecture"]);put("YouTube",4,"long-form",["High Yield Videos"]);put("YouTube",5,"long-form",["Exam Strategy Video"]);put("YouTube",0,"exam",["Mission BHU"]);
  put("YouTube",7,"long-form",["Testimonial","Jobs Vacancy","Exam Recall based Solutions"]);put("YouTube",7,"live",["Vacancy","Strategy - Exam Analysis | Solutions"]);return plan;
}
function validateWeeklyPlan(plan){
  function fail(message){throw Object.assign(new Error(message),{userMessage:message})}
  if(!plan||!Number.isInteger(plan.version)||plan.version<0||!plan.cells||typeof plan.cells!=="object"||Array.isArray(plan.cells))fail("The weekly plan could not be read. Reload to try again.");
  var expected=Object.keys(defaultWeeklyPlan().cells);if(Object.keys(plan.cells).length!==expected.length)fail("The weekly plan is missing a day or format.");
  expected.forEach(function(key){var items=plan.cells[key],seen={};if(!Array.isArray(items)||items.length>20)fail("Keep each list within 20 items.");items.forEach(function(item){if(!item||typeof item.id!=="string"||!item.id||item.id.length>140||seen[item.id]||typeof item.title!=="string"||!item.title.trim()||item.title.length>240)fail("Give each item a name of up to 240 characters.");seen[item.id]=true})});return true;
}
function weeklyPlannerItems(text,baseline){
  var used={};return String(text||"").split(/\r?\n/).map(function(line){return line.trim()}).filter(Boolean).map(function(title,index){var old=(baseline||[]).find(function(item){return item.title===title&&!used[item.id]})||((baseline||[])[index]&&!used[baseline[index].id]?baseline[index]:null),id=old?old.id:sid();used[id]=true;return {id:id,title:title}});
}
function saveWeeklyPlannerCell(key,items,baseline){
  if(!S.weeklyPlanReady)return Promise.reject(Object.assign(new Error("Wait for the weekly plan to load before saving."),{userMessage:"Wait for the weekly plan to load before saving."}));
  return db.runTransaction(function(tx){var ref=db.doc("workspaceSettings/weeklyPlanner");return tx.get(ref).then(function(snap){var current=snap.exists?snap.data():defaultWeeklyPlan();validateWeeklyPlan(current);if(!Object.prototype.hasOwnProperty.call(current.cells,key))throw new Error("This day or format no longer exists.");if(JSON.stringify(current.cells[key])!==JSON.stringify(baseline))throw Object.assign(new Error("This list was changed by a teammate. Reopen it to edit the latest version."),{userMessage:"This list was changed by a teammate. Reopen it to edit the latest version."});var next={version:current.version+1,cells:Object.assign({},current.cells),updatedAt:new Date().toISOString(),updatedBy:S.me.id};next.cells[key]=items;validateWeeklyPlan(next);tx.set(ref,next);return next})}).then(function(saved){S.weeklyPlan=JSON.parse(JSON.stringify(saved));render();return saved});
}
function openWeeklyPlannerCell(platform,day,column){
  if(!writable()||!S.weeklyPlanReady)return;
  var key=cadenceKey(platform.id,day,column.id),baseline=JSON.parse(JSON.stringify(S.weeklyPlan.cells[key])),initial=baseline.map(function(item){return item.title}).join("\n"),ui=actionDialog(CADENCE_DAYS[day]+" · "+platform.id+" "+column.label,day===7?"Keep content ideas to use as needed, outside the fixed weekly schedule.":"Edit the content you plan for this day each week."),text=el("textarea","cadence-input"),save=el("button","btn btn-p","Save list");
  text.value=initial;text.rows=Math.max(5,Math.min(10,baseline.length+2));text.placeholder="One item per line";text.maxLength=6000;ui.body.insertBefore(field("Content items",text,"One item per line. An empty list clears this cell."),ui.error);
  function read(){return weeklyPlannerItems(text.value,baseline)}
  function validate(){try{var draft={version:0,cells:Object.assign({},S.weeklyPlan.cells)};draft.cells[key]=read();validateWeeklyPlan(draft);save.disabled=!S.weeklyPlanReady;ui.error.hidden=true;return !save.disabled}catch(e){save.disabled=true;ui.error.textContent=e.userMessage||e.message;ui.error.hidden=false;return false}}
  text.oninput=validate;save.onclick=function(){if(validate())runDialogSave(ui,save,function(){return saveWeeklyPlannerCell(key,read(),baseline)},function(){toast("Weekly plan saved for the team")})};ui.foot.appendChild(save);validate();keyboardSave(ui.node,save);ui.node.querySelector(".keyboard-save-hint").textContent="One item per line · Ctrl/⌘+Enter saves";overlay(ui.node,function(){return text.value!==initial},true);
}
function cadenceCell(platform,day,column){
  var key=cadenceKey(platform.id,day,column.id),items=S.weeklyPlan.cells[key],cell=el("div","cadence-cell");cell.setAttribute("data-cadence-cell",key);
  if(items.length){var list=el("ol","cadence-items");items.forEach(function(item){var li=el("li",null,item.title);li.setAttribute("data-cadence-item",item.id);list.appendChild(li)});cell.appendChild(list)}else cell.appendChild(el("p","cadence-empty","Nothing planned"));
  if(S.me&&writable()){var edit=el("button","cadence-edit",items.length?"Edit list":"+ Add items");edit.setAttribute("aria-label","Edit "+platform.id+" "+CADENCE_DAYS[day]+" "+column.label);edit.onclick=function(){openWeeklyPlannerCell(platform,day,column)};cell.appendChild(edit)}return cell;
}
function renderPlanner(main){
  var box=el("section","planner cadence");box.setAttribute("aria-label","Reusable weekly content plan");main.appendChild(box);
  if(!S.weeklyPlanReady){box.appendChild(el("p",S.weeklyPlanError?"banner":"note",S.weeklyPlanError||"Loading the weekly content plan…"));if(S.weeklyPlanError){var retry=el("button","btn btn-o","Reload plan");retry.onclick=function(){location.reload()};box.appendChild(retry)}return}
  var platform=CADENCE_PLATFORMS.find(function(p){return p.id===S.plannerPlatform})||CADENCE_PLATFORMS[0],toolbar=el("div","planner-toolbar"),switcher=el("div","work-scope cadence-platforms");switcher.setAttribute("role","group");switcher.setAttribute("aria-label","Planner platforms");CADENCE_PLATFORMS.forEach(function(p){var button=el("button",platform.id===p.id?"on":"",p.id);button.setAttribute("aria-pressed",String(platform.id===p.id));button.onclick=function(){S.plannerPlatform=p.id;render()};switcher.appendChild(button)});toolbar.appendChild(switcher);
  if(phone){[["Expand all days",true],["Collapse all days",false]].forEach(function(option){var button=el("button","text-button",option[0]);button.onclick=function(){CADENCE_DAYS.forEach(function(day,index){S.cadenceExpanded[platform.id+":"+index]=option[1]});render()};toolbar.appendChild(button)})}box.appendChild(toolbar);box.appendChild(el("p","planner-help","Your repeatable content mix for each weekday. “As and When” holds content to use as opportunities arise."));
  if(phone){CADENCE_DAYS.forEach(function(day,index){var section=el("details","cadence-day"+(index===7?" cadence-as-needed":"")),key=platform.id+":"+index,summary=el("summary");section.open=S.cadenceExpanded[key]===undefined?(index===dowIdx(TODAY)||index===7):S.cadenceExpanded[key];summary.appendChild(el("strong",null,day));if(index===dowIdx(TODAY))summary.appendChild(el("span","cadence-today","Today"));section.appendChild(summary);section.ontoggle=function(){if(section.isConnected)S.cadenceExpanded[key]=section.open};platform.columns.forEach(function(column){var lane=el("section","cadence-mobile-lane");lane.appendChild(el("h3",null,column.label));lane.appendChild(cadenceCell(platform,index,column));section.appendChild(lane)});box.appendChild(section)})}
  else{var scroll=el("div","planner-scroll"),table=el("table","cadence-table"),caption=el("caption","sr-only",platform.id+" weekly content plan"),head=el("thead"),headRow=el("tr"),dayHeading=el("th",null,"Day");dayHeading.scope="col";headRow.appendChild(dayHeading);platform.columns.forEach(function(column){var th=el("th",null,column.label);th.scope="col";headRow.appendChild(th)});head.appendChild(headRow);table.appendChild(caption);table.appendChild(head);var body=el("tbody");CADENCE_DAYS.forEach(function(day,index){var row=el("tr",index===7?"cadence-as-needed":""),label=el("th",null,day);label.scope="row";if(index===dowIdx(TODAY))label.appendChild(el("span","cadence-today","Today"));row.appendChild(label);platform.columns.forEach(function(column){var td=el("td");td.appendChild(cadenceCell(platform,index,column));row.appendChild(td)});body.appendChild(row)});table.appendChild(body);scroll.appendChild(table);box.appendChild(scroll)}
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
  if(v==="today"||v==="next7"){
    var selected=v==="today"?TODAY:(S.focusDay&&S.focusDay>=r[0]&&S.focusDay<=r[1]?S.focusDay:"");
    if(v==="next7")box.appendChild(weekStrip(r[0],r[1]));
    if(selected||v==="today"){
      if(v==="next7"){var selectedHead=el("div","day-focus");selectedHead.appendChild(el("h2",null,selected===TODAY?"Today · "+fmtLong(selected):fmtLong(selected)));var allDays=el("button","text-button","Show full week");allDays.onclick=function(){S.focusDay="";render()};selectedHead.appendChild(allDays);box.appendChild(selectedHead)}
      if(selected===TODAY){var overdue=overdueBlock();if(overdue)box.appendChild(overdue)}
      if(!renderFocus(box,selected,selected,false))box.appendChild(el("div","note",S.workScope==="my"?"No work assigned to you on this date. Switch to Team work to see the team’s plan.":"No work due on this date."));
    }else{
      for(var day=0;day<7;day++){var date=addDays(r[0],day),holder=el("section","work-day"),title=date===TODAY?"Today":date===addDays(TODAY,1)?"Tomorrow":date===addDays(TODAY,-1)?"Yesterday":DOW[dowIdx(date)];holder.setAttribute("data-work-date",date);holder.appendChild(el("h2","work-day-title",title+" · "+fmtShort(date)));var count=renderFocus(holder,date,date,true);if(!count)holder.appendChild(el("p","hint","Nothing due"));box.appendChild(holder)}
    }
    var undated=workItems().filter(function(row){return !row.due&&!row.done}).length;if(undated)box.appendChild(el("div","note",undated+" work items need a parent deadline before they can appear on the calendar."));
    if(S.workScope==="team"){var unassigned=workItems().filter(function(row){return !row.owner&&!row.done}).length;if(unassigned)box.appendChild(el("p","hint",unassigned+" work items have no owner. Assign a parent or individual owner so they appear in My work."))}
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
    var acts=S.activities.filter(function(a){return a.campaignId===c.id&&activityInWorkScope(a)});
    var pub=acts.filter(function(a){return a.status==="Published"}).length;
    var late=acts.filter(isLate).length;
    var card=el("div","card");card.style.setProperty("--c",c.colour);card.style.animationDelay=(n*50)+"ms";
    var open=S.workCollapsed["campaign:"+c.id]===undefined?!!S.expanded["c"+c.id]:!S.workCollapsed["campaign:"+c.id];
    if(open)card.classList.add("open");
    var top=el("div","top");
    var tgl=el("button","c-top");
    tgl.setAttribute("aria-expanded",open?"true":"false");
    tgl.title=open?"Collapse campaign":"Expand to see and add activities";
    tgl.appendChild(el("i","chev",open?"▾":"▸"));
    tgl.appendChild(el("i","swatch"));
    var h=el("div","c-title");h.appendChild(el("h3",null,c.name));
    tgl.appendChild(h);
    tgl.onclick=function(){S.expanded["c"+c.id]=!open;S.workCollapsed["campaign:"+c.id]=open;rememberWorkFolds();render()};
    top.appendChild(tgl);
    var ed=el("button","edit-campaign","Edit");ed.setAttribute("aria-label","Edit "+c.name);
    ed.onclick=function(){openCampaign(c)};
    if(writable())top.appendChild(ed);
    if(writable()){
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
    if(c.owner)meta.appendChild(uname(c.owner));
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
      tb.onclick=function(){S.expanded["c"+c.id]=!open;S.workCollapsed["campaign:"+c.id]=open;rememberWorkFolds();render()};
      card.appendChild(tb);
    }
    if(open&&acts.length){
      var list=el("div","c-acts");
      acts.slice().sort(function(x,y){return x.dueDate<y.dueDate?-1:(x.dueDate>y.dueDate?1:0)})
      .forEach(function(a){
        var subs=a.subtasks||[],nSub=subTotal(a),pub=a.status==="Published",taskOpen=S.workCollapsed["task:"+a.id]===undefined?!!S.expanded["a"+a.id]:!S.workCollapsed["task:"+a.id];
        var aw=el("div","act-wrap"),r=el("div","row"+(isLate(a)?" late":"")+(pub?" done":""));
        var st=el("button","sub-tgl",taskOpen?"▾":"▸");
        st.title=nSub?"Show subtasks ("+nSub+")":"Add a subtask";
        st.setAttribute("aria-expanded",taskOpen?"true":"false");
        st.onclick=function(e){e.stopPropagation();S.expanded["a"+a.id]=!taskOpen;S.workCollapsed["task:"+a.id]=taskOpen;rememberWorkFolds();render()};
        r.appendChild(st);
        r.appendChild(completionControl(a,null));
        var rm=el("button","row-main");rm.setAttribute("data-focus-key","activity:"+a.id);
        rm.appendChild(el("span","d",fmtShort(a.dueDate)));
        rm.appendChild(el("span","n",a.title));
        if(a.dueTime)rm.appendChild(dueTimeBadge(a.dueTime));
        if(a.type||a.angle)
          rm.appendChild(el("span","row-ty",[formatLabel(a.type,(a.platforms||[])[0]),topicLabel(a.angle,a.type,(a.platforms||[])[0])].filter(Boolean).join(" · ")));
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
        if(taskOpen)aw.appendChild(subtaskTree(a));
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
  return {id:sid(),title:title,description:"",done:false,owner:"",due:"",dueTime:"",kind:kind||"",platform:plat||"",type:"",angle:"",children:[]};
}
function nodeById(nodes,id){
  for(var i=0;i<(nodes||[]).length;i++){
    if(nodes[i].id===id)return nodes[i];
    var found=nodeById(kids(nodes[i]),id);if(found)return found;
  }
  return null;
}
function platAbbr(p){
  var option=contentPlatform(p);return option?(option.abbr||option.label.slice(0,3).toUpperCase()):p;
}
function platPill(p){
  var s=el("span","sub-plat",platAbbr(p));s.title=platformLabel(p);return s;
}
function subtaskDeadline(a,s,onSaved){
  var context=effectiveWork(a).find(function(row){return row.id===s.id}),due=context?context.due:s.due||a.dueDate||"",late=!!due&&due<TODAY&&!nodeDone(s);
  var date=due?(due.slice(0,4)===TODAY.slice(0,4)?fmtShort(due):fmtLong(due)):"";
  var deadline=el(writable()?"button":"span","sub-deadline"+(late?" overdue":"")+(!due?" unset":""),due?date:"Set deadline");
  if(s.dueTime)deadline.appendChild(el("span","deadline-time",fmtTime(s.dueTime)));
  deadline.title=due?"Deadline: "+fmtLong(due)+(s.dueTime?" · "+fmtTime(s.dueTime):"")+(late?" · overdue":""):"No parent deadline set";deadline.setAttribute("data-focus-key","deadline:"+a.id+":"+s.id);
  if(writable()){
    deadline.setAttribute("aria-label",(due?"Change deadline for ":"Set deadline for ")+(s.title||"Untitled subtask")+(due?": "+fmtLong(due):""));
    deadline.onclick=function(){openSubtask(a,s,onSaved,true)};
  }else if(!due)deadline.textContent="No deadline";
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
function nodeOpen(id){if(S.workCollapsed["group:"+id]!==undefined)return !S.workCollapsed["group:"+id];var v=S.expanded["n"+id];return v===undefined?true:!!v}
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
    delete copy.completedAt;
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
  var copy=Object.assign({},a);delete copy.id;delete copy.completedAt;
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
  ui.foot.appendChild(save);validate();keyboardSave(ui.node,save);overlay(ui.node,null,true);
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
function sopConditions(rule){
  return (Array.isArray(rule.conditions)?rule.conditions:[rule]).map(function(c){c=c||{};return {platform:String(c.platform||"").trim(),format:String(c.format||"").trim(),angle:String(c.angle||"").trim()}});
}
function sopConditionKey(c){return JSON.stringify([c.platform,c.format,c.angle])}
function sopConditionsValid(rule){var conditions=sopConditions(rule),seen={};return conditions.length>0&&conditions.length<=20&&conditions.every(function(c){var key=sopConditionKey(c);if(!c.platform||!c.format||seen[key])return false;seen[key]=true;return true})}
function sopCondition(rule){return sopConditions(rule).map(function(c){return [platformLabel(c.platform)||"Platform not set",formatLabel(c.format,c.platform)||"Format not set",topicLabel(c.angle,c.format,c.platform)||"Any topic"].join(" → ")}).join(" OR ")}
function sopMatchingConditions(rule,a){return sopConditions(rule).filter(function(c){return c.platform&&c.format&&c.format===a.type&&(!c.angle||c.angle===(a.angle||""))&&(a.platforms||[]).indexOf(c.platform)>=0})}
function sopMatches(a){
  if(!S.sopReady)return [];
  function specificity(rule){return sopMatchingConditions(rule,a).some(function(c){return !!c.angle})?1:0}
  return allSopRules().filter(function(r){return r.enabled&&sopMatchingConditions(r,a).length>0}).sort(function(first,second){return specificity(second)-specificity(first)||first.name.localeCompare(second.name)});
}
function sopNodes(rule){
  if(rule.nodes)return rule.nodes;
  function stable(nodes,path){return nodes.map(function(n,i){var id=path+"-"+i;return Object.assign({},n,{id:id,children:stable(kids(n),id)})})}
  return stable(buildSteps(STEPS[(sopConditions(rule)[0]||{}).format]||["Script","Edit","Review"]),rule.id||"suggested");
}
function sopDefinition(nodes){return (nodes||[]).map(function(n){var copy=Object.assign({},n,{done:false,children:sopDefinition(kids(n))});delete copy.sopSource;delete copy.appliedSopRules;return copy})}
var SOP_FIELDS=["title","description","due","dueTime","kind","platform","type","angle"];
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
    var n=nodes[i],context=subtaskConditionContext(n,parent);
    if(n.id===id)return {node:n,context:context,parent:parent,depth:depth};
    var found=subtaskLocation(a,id,kids(n),context,depth+1);if(found)return found;
  }return null;
}
function subtaskConditionContext(n,parent){
  var platforms=n.platform?[n.platform]:parent.platforms,type=n.type||(!n.platform||contentFormatFits(platforms[0],parent.type)?parent.type:"");
  var inheritTopic=type===parent.type&&(!n.platform||n.platform===parent.platforms[0]||contentTopics(n.platform,type).some(function(t){return t.id===parent.angle}));
  return {platforms:platforms,type:type,angle:n.angle||(inheritTopic?parent.angle:"")};
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
  if(changes.dueTime!==undefined&&!validDueTime(changes.dueTime))return Promise.reject(Object.assign(new Error("Choose a valid due time."),{userMessage:"Choose a valid due time."}));
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
    row.appendChild(el("p",null,sopDisplayName(rule)));row.appendChild(el("p","hint",sopCondition({conditions:sopMatchingConditions(rule,context)})));
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
  if(!sopConditionsValid(rule)){var e=new Error();e.userMessage="Add 1–20 distinct conditions, each with a platform and content format.";return Promise.reject(e)}
  var payload=Object.assign({},rule),legacy=payload.legacyId;delete payload.id;delete payload.legacyId;
  payload.conditions=sopConditions(rule);payload.platform=payload.conditions[0].platform;payload.format=payload.conditions[0].format;payload.angle=payload.conditions[0].angle;
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
      summary.appendChild(el("p","hint",sopCondition(rule)+" · "+leaves(sopNodes(rule)).length+" subtasks · "+(!sopConditionsValid(rule)?"Needs setup":rule.enabled?"Enabled":"Paused")));
      if(rule.legacyId)summary.appendChild(el("p","hint","Existing saved group. Edit to set its SOP conditions."));
      if(sopNameTaken(rule.name,rule.id))summary.appendChild(el("p","hint warn","Duplicate name from the old library. Rename this SOP to make it unique."));row.appendChild(summary);
      var edit=el("button","btn btn-o",rule.legacyId?"Set up":"Edit");edit.setAttribute("aria-label","Edit SOP "+sopDisplayName(rule));edit.onclick=function(){openSopRule(rule,draw)};row.appendChild(edit);
      var toggle=el("button","text-button",rule.enabled?"Pause":"Enable");toggle.setAttribute("aria-label",(rule.enabled?"Pause":"Enable")+" SOP "+sopDisplayName(rule));toggle.disabled=!sopConditionsValid(rule)||!!rule.legacyId;
      toggle.onclick=function(){toggle.disabled=true;var updated=Object.assign({},rule,{enabled:!rule.enabled});
        var work=S.sopRules.some(function(r){return r.id===rule.id})?db.doc("sopRules/"+rule.id).update({enabled:updated.enabled}).then(function(){S.sopRules=S.sopRules.map(function(r){return r.id===rule.id?updated:r});render()}):storeSopRule(updated);
        work.then(draw).catch(function(e){toggle.disabled=false;toast(e.userMessage||msgFor(e))});
      };if(sopConditionsValid(rule)&&!rule.legacyId)row.appendChild(toggle);
      var remove=el("button","text-button","Delete");remove.setAttribute("aria-label","Delete SOP "+sopDisplayName(rule));
      remove.onclick=function(){confirmRemoval(row,"Remove this SOP from the library? Existing task checklists stay intact.",function(){remove.disabled=true;archiveSop(rule).then(draw).catch(function(e){remove.disabled=false;toast(msgFor(e))})})};if(rule.legacyId||S.sopRules.some(function(r){return r.id===rule.id}))row.appendChild(remove);
      var preview=el("details","sop-library-preview"),label=el("summary",null,"Preview checklist");preview.appendChild(label);preview.appendChild(sopChecklistList(sopNodes(rule)));row.appendChild(preview);list.appendChild(row);
    });
  }
  var add=el("button","btn btn-p sp","New SOP");add.onclick=function(){openSopRule(null,draw)};ui.foot.appendChild(add);draw();overlay(ui.node,null,true);
}
function sopTopicSelect(type,value,blank,platform){
  var topics=platform!==undefined?contentTopics(platform,type):[],seen={};if(platform===undefined)CONTENT_OPTIONS.platforms.forEach(function(p){contentTopics(p.id,type).forEach(function(t){if(!seen[t.id]){topics.push(t);seen[t.id]=true}})});
  var options=topics.map(function(t){return[t.id,t.label]});if(value&&!options.some(function(t){return t[0]===value}))options.push([value,topicLabel(value,type,platform)]);
  var select=dropdown(options,value||"",blank||"Any topic");select.disabled=!type||(platform!==undefined&&!platform);return select;
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
function openContentOptions(onSaved){
  if(!writable())return;
  var ui=actionDialog("Content options","Manage Platform → Format → Topic/Category. Rename options or archive them to hide them from new choices. Existing tasks and SOPs keep their selections."),d=JSON.parse(JSON.stringify(CONTENT_OPTIONS)),version=d.version||0,initial=JSON.stringify(d),selectedPlatform=(d.platforms[0]||{}).id||"",selectedFormat="",selectedTopic="",drafts={},columns=el("div","content-options-columns"),save=el("button","btn btn-p","Save options");ui.node.classList.add("content-options-editor");ui.body.insertBefore(columns,ui.error);
  function platform(){return contentPlatform(selectedPlatform,d)}
  function format(){var p=platform();return p&&p.formats.find(function(f){return f.id===selectedFormat})}
  function draftKey(level,p,f){return JSON.stringify([level,p||"",f||""])}
  function collection(level,p,f){if(level==="platform")return d.platforms;var parent=contentPlatform(p,d);if(!parent)return null;if(level==="format")return parent.formats;var child=parent.formats.find(function(x){return x.id===f});return child?child.topics:null}
  function validate(){try{validateContentOptions(d);save.disabled=!S.contentOptionsReady;if(S.contentOptionsError){ui.error.textContent=S.contentOptionsError;ui.error.hidden=false}else ui.error.hidden=true;return !save.disabled}catch(e){ui.error.textContent=e.userMessage||e.message;ui.error.hidden=false;save.disabled=true;return false}}
  function add(level,p,f){var key=draftKey(level,p,f),text=(drafts[key]||"").trim().replace(/\s+/g," ");if(!text)return true;var list=collection(level,p,f);if(!list)return false;if(list.some(function(x){return normalizeSopName(x.label)===normalizeSopName(text)})){ui.error.textContent="That "+level+" already exists. Select it to rename or restore it.";ui.error.hidden=false;return false}var item={id:"custom-"+sid(),label:text,archived:false};if(level==="platform"){item.abbr=text.slice(0,3).toUpperCase();item.formats=[];selectedPlatform=item.id;selectedFormat="";selectedTopic=""}else if(level==="format"){item.topics=[];selectedFormat=item.id;selectedTopic=""}else selectedTopic=item.id;list.push(item);drafts[key]="";return true}
  function draw(){
    clear(columns);var p=platform();if(!p){selectedPlatform=(d.platforms[0]||{}).id||"";p=platform()}if(p&&!p.formats.some(function(f){return f.id===selectedFormat}))selectedFormat=(p.formats[0]||{}).id||"";var f=format();if(f&&!f.topics.some(function(t){return t.id===selectedTopic}))selectedTopic=(f.topics[0]||{}).id||"";
    [{level:"platform",title:"Platforms",items:d.platforms,current:selectedPlatform,parent:"",format:""},{level:"format",title:"Formats",items:p?p.formats:[],current:selectedFormat,parent:p?p.id:"",format:""},{level:"topic",title:"Topics / categories",items:f?f.topics:[],current:selectedTopic,parent:p?p.id:"",format:f?f.id:""}].forEach(function(def){
      var column=el("section","content-options-column"),head=el("h3",null,def.title),list=el("div","content-options-list");list.setAttribute("role","listbox");list.setAttribute("aria-label",def.title);column.appendChild(head);column.appendChild(list);
      def.items.forEach(function(item){var button=el("button","content-option-row"+(item.archived?" is-archived":""),item.label+(item.archived?" · Archived":""));button.setAttribute("role","option");button.setAttribute("aria-selected",String(def.current===item.id));button.setAttribute("data-option-id",item.id);button.onclick=function(){if(def.level==="platform"){selectedPlatform=item.id;selectedFormat="";selectedTopic=""}else if(def.level==="format"){selectedFormat=item.id;selectedTopic=""}else selectedTopic=item.id;draw()};list.appendChild(button)});
      if(!def.items.length)list.appendChild(el("p","hint",def.level==="platform"?"Add your first platform.":def.level==="format"?(p?"Add a format for "+p.label+".":"Choose a platform first."):(f?"Add topics for "+f.label+".":"Choose a format first.")));
      var current=def.items.find(function(x){return x.id===def.current});if(current){var name=input("text",current.label);name.maxLength=100;name.oninput=function(){var label=name.value.trim().replace(/\s+/g," ");current.label=label;if(def.level==="format")d.platforms.forEach(function(p){p.formats.forEach(function(f){if(f.id===current.id)f.label=label})});var row=list.querySelector('[data-option-id="'+current.id+'"]');if(row)row.textContent=label+(current.archived?" · Archived":"");validate()};column.appendChild(field(def.level==="topic"?"Topic name":def.level.charAt(0).toUpperCase()+def.level.slice(1)+" name",name));var archive=el("button","text-button",current.archived?"Restore "+def.level:"Archive "+def.level);archive.onclick=function(){current.archived=!current.archived;draw()};column.appendChild(archive)}
      if(current&&def.level==="format"&&d.platforms.filter(function(p){return p.formats.some(function(f){return f.id===current.id})}).length>1)column.appendChild(el("p","hint","This format shares its name across platforms. Archiving hides it only from this platform."));
      var key=draftKey(def.level,def.parent,def.format),composer=el("div","content-option-add"),entry=input("text",drafts[key]||"","New "+def.level+" name"),button=el("button","btn btn-o","Add");entry.maxLength=100;entry.setAttribute("aria-label","New "+def.level+" name");entry.disabled=def.level!=="platform"&&!def.parent||def.level==="topic"&&!def.format;button.disabled=entry.disabled;entry.oninput=function(){drafts[key]=entry.value};function commit(){if(add(def.level,def.parent,def.format)){draw();var next=columns.querySelector('[aria-label="New '+def.level+' name"]');if(next&&!next.disabled)next.focus()}}entry.onkeydown=function(e){if(e.key==="Enter"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&!e.isComposing&&!e.repeat){e.preventDefault();commit()}};button.onclick=commit;composer.appendChild(entry);composer.appendChild(button);column.appendChild(composer);columns.appendChild(column);
    });validate();
    columns.querySelectorAll('.content-options-list').forEach(function(list){var row=list.querySelector('[aria-selected="true"]');if(row){var box=row.getBoundingClientRect(),parent=list.getBoundingClientRect();if(box.top<parent.top||box.bottom>parent.bottom)list.scrollTop+=box.top-parent.top-list.clientHeight/2+box.height/2}});
  }
  save.onclick=function(){var pending=Object.keys(drafts).filter(function(key){return drafts[key].trim()}).map(function(key){return JSON.parse(key)}).sort(function(a,b){return ["platform","format","topic"].indexOf(a[0])-["platform","format","topic"].indexOf(b[0])});for(var i=0;i<pending.length;i++)if(!add(pending[i][0],pending[i][1],pending[i][2]))return;draw();if(!validate())return;runDialogSave(ui,save,function(){return saveContentOptions(d,version)},function(){if(onSaved)onSaved();toast("Content options saved for the team")})};ui.foot.appendChild(save);draw();keyboardSave(ui.node,save,true);ui.node.querySelector('.keyboard-save-hint').textContent="Enter adds an option · Ctrl/⌘+Enter saves";overlay(ui.node,function(){return JSON.stringify(d)!==initial||Object.keys(drafts).some(function(key){return drafts[key].trim()})},true);
}
function openSopRule(rule,onSaved){
  var ui=actionDialog(rule?"Edit SOP":"New SOP","Set when this SOP is suggested, then arrange the steps your team follows.");ui.node.classList.add("sop-editor");
  var d={name:rule?rule.name:"",conditions:rule?sopConditions(rule):[{platform:"",format:"",angle:""}],nodes:rule?sopDefinition(sopNodes(rule)):[],anchorDate:rule?(rule.anchorDate||""):""};
  if(!d.conditions.length)d.conditions.push({platform:"",format:"",angle:""});
  var initial=JSON.stringify(d),name=input("text",d.name,"e.g. Nursing Story"),conditionList=el("div","sop-condition-list"),conditionHint=el("p","hint err"),builder=el("div","sop-builder"),hint=el("p","hint err");name.maxLength=100;
  ui.body.appendChild(field("SOP name *",name));ui.body.appendChild(el("h3","sop-condition-title","When should this SOP appear?"));ui.body.appendChild(el("p","hint sop-condition-help","Match any condition below. Within a condition, all selected fields must match. Every condition uses the same checklist."));ui.body.appendChild(conditionList);
  var editOptions=el("button","text-button content-options-link","Manage content options");editOptions.onclick=function(){openContentOptions(function(){drawConditions();validate()})};ui.body.appendChild(editOptions);
  conditionHint.setAttribute("role","status");conditionHint.hidden=true;ui.body.appendChild(conditionHint);
  var addCondition=el("button","sop-add-condition","+ Add another condition");addCondition.type="button";addCondition.onclick=function(){if(d.conditions.length>=20)return;d.conditions.push({platform:"",format:"",angle:""});drawConditions(d.conditions.length-1,"platform");validate()};ui.body.appendChild(addCondition);
  function formatFits(platform,format){return !platform||contentFormatFits(platform,format)}
  function drawConditions(focusIndex,focusField){
    clear(conditionList);
    d.conditions.forEach(function(c,index){
      if(index)conditionList.appendChild(el("div","sop-condition-or","OR"));
      var row=el("div","sop-condition-set");row.setAttribute("role","group");row.setAttribute("aria-label","Condition "+(index+1));
      var head=el("div","sop-condition-head");head.appendChild(el("strong",null,"Condition "+(index+1)));
      if(d.conditions.length>1){var remove=el("button","sop-remove-condition","Remove");remove.type="button";remove.setAttribute("aria-label","Remove condition "+(index+1));remove.onclick=function(){d.conditions.splice(index,1);drawConditions(Math.min(index,d.conditions.length-1),"platform");validate()};head.appendChild(remove)}row.appendChild(head);
      var platform=contentPlatformSelect(c.platform,"Choose platform"),format=formatSelect(c.format,"Choose content format",null,c.platform),topic=sopTopicSelect(c.format,c.angle,null,c.platform),grid=el("div","sop-condition-grid");
      platform.setAttribute("data-condition-field","platform");format.setAttribute("data-condition-field","format");topic.setAttribute("data-condition-field","topic");format.disabled=!c.platform;topic.disabled=!c.format;
      grid.appendChild(field("Platform *",platform));grid.appendChild(field("Content format *",format));row.appendChild(grid);row.appendChild(field("Topic / category",topic,"Any topic matches every topic within this platform and format."));
      platform.onchange=function(){c.platform=platform.value;if(!c.platform||!formatFits(c.platform,c.format)){c.format="";c.angle=""}if(!contentTopics(c.platform,c.format).some(function(t){return t.id===c.angle}))c.angle="";drawConditions(index,"format");validate()};
      format.onchange=function(){c.format=format.value;if(!contentTopics(c.platform,c.format).some(function(t){return t.id===c.angle}))c.angle="";drawConditions(index,"topic");validate()};
      topic.onchange=function(){c.angle=topic.value;validate()};conditionList.appendChild(row);
    });
    addCondition.disabled=d.conditions.length>=20;
    if(focusIndex!==undefined){var target=conditionList.querySelectorAll(".sop-condition-set")[focusIndex].querySelector('[data-condition-field="'+focusField+'"]');if(target&&!target.disabled)target.focus()}
  }
  var source=dropdown([["","Build or edit the checklist below"]].concat(S.activities.filter(function(a){return (a.subtasks||[]).length}).map(function(a){var c=campById(a.campaignId);return[a.id,a.title+" · "+fmtShort(a.dueDate)+(c?" · "+c.name:"")]})),"",null);
  source.onchange=function(){var a=S.activities.find(function(x){return x.id===source.value});if(!a)return;d.nodes=copyNodes(a.subtasks);composerDrafts={};activeSubtaskEditors={};clearMoveUndo();d.anchorDate=a.dueDate;if(d.conditions.every(function(c){return !c.platform&&!c.format&&!c.angle}))d.conditions=[{platform:(a.platforms||[])[0]||"",format:a.type||"",angle:a.angle||""}];drawConditions();drawBuilder();validate()};
  var importSection=disclosure("Start from a checklist","Optional: copy an activity or use suggested steps");importSection.body.appendChild(field("Activity checklist",source,"Copies the steps so you can edit them here."));ui.body.appendChild(importSection.node);
  var suggested=el("button","tpl-btn","Use suggested checklist for this format");suggested.onclick=function(){d.nodes=buildSteps(STEPS[d.conditions[0].format]||["Script","Edit","Review"]);composerDrafts={};activeSubtaskEditors={};clearMoveUndo();d.anchorDate="";drawBuilder();validate()};importSection.body.appendChild(suggested);importSection.body.appendChild(el("p","hint","Suggested steps use the first condition’s format. Your checklist is shared by all conditions."));
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
      entry.onkeydown=function(e){if(e.key==="Enter"&&!e.isComposing&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){e.preventDefault();commitDraft(parentId,true)}};
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
      title.onkeydown=function(e){if(e.key==="Enter"&&!e.isComposing&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){e.preventDefault();if(title.value.trim())startAdding(parentId,n.id)}};row.appendChild(title);
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
    var pending=Object.keys(composerDrafts).some(function(key){return composerDrafts[key].text.trim()&&(key==="root"||nodeById(d.nodes,key))}),duplicate=sopNameTaken(d.name,rule&&rule.id),valid=!!d.name.trim()&&d.name.trim().length<=100&&sopConditionsValid(d)&&(named(d.nodes)||(!d.nodes.length&&pending))&&treeDepth(d.nodes)<=MAXDEPTH;
    var seen={},repeated=d.conditions.some(function(c){if(!c.platform||!c.format)return false;var key=sopConditionKey(c),exists=!!seen[key];seen[key]=true;return exists});conditionHint.hidden=!repeated;conditionHint.textContent="This condition is already listed. Change or remove the duplicate.";
    hint.hidden=!duplicate;hint.textContent="An SOP with this name already exists. Choose a unique name.";
    save.disabled=!valid||duplicate||!S.sopReady||S.templatesLoading||!!S.templateError;suggested.disabled=!d.conditions[0].format;
  }
  name.oninput=function(){d.name=name.value;validate()};
  save.onclick=function(){validate();if(save.disabled)return;var flushed=false;Object.keys(composerDrafts).forEach(function(key){if(commitDraft(key==="root"?null:key,false))flushed=true});if(flushed)drawBuilder();validate();if(save.disabled)return;var payload={name:d.name,conditions:sopConditions(d),nodes:sopDefinition(d.nodes),anchorDate:d.anchorDate,enabled:rule&&!rule.legacyId?rule.enabled:true,createdAt:rule&&rule.createdAt||new Date().toISOString()};if(rule){payload.id=rule.id;if(rule.legacyId)payload.legacyId=rule.legacyId}
    function saved(result){if(onSaved)onSaved();toast((result.updated?"SOP saved · "+result.updated+" unfinished activities updated":"SOP saved")+(result.skipped?" · "+result.skipped+" uses kept at the nesting limit":""))}
    var ongoing=rule?S.activities.filter(function(a){return sopUsage(a,rule.id)>0}):[];
    if(!ongoing.length||JSON.stringify(d)===initial){runDialogSave(ui,save,function(){return wq.then(function(){return storeSopRule(payload,false,rule)})},saved);return}
    var choice=actionDialog("Update ongoing work?","This SOP is used in "+ongoing.length+" unfinished "+(ongoing.length===1?"activity":"activities")+". Where should these changes apply?");
    choice.body.appendChild(el("p","hint","Completed steps, owners and individual edits are kept. Only unchanged SOP steps are replaced or removed. Older untracked steps are kept when their origin is uncertain."));
    var tooDeep=ongoing.reduce(function(sum,a){return sum+sopDepthSkips(a,payload)},0);if(tooDeep)choice.body.appendChild(el("p","hint",tooDeep+" nested uses cannot fit the new checklist within three levels. Those checklists will be kept as they are."));
    var affected=el("details"),summary=el("summary",null,"View affected activities");affected.appendChild(summary);var list=el("ul","sop-steps");ongoing.forEach(function(a){list.appendChild(el("li",null,a.title))});affected.appendChild(list);choice.body.appendChild(affected);
    function choose(label,update){var button=el("button","btn "+(update?"btn-p":"btn-o"),label);button.onclick=function(){runDialogSave(choice,button,function(){return wq.then(function(){return storeSopRule(payload,update,rule)})},function(result){closeOverlay(true);saved(result)})};choice.foot.appendChild(button)}
    choose("SOP only",false);choose("Update unfinished tasks",true);overlay(choice.node,null,true);
  };ui.foot.appendChild(save);drawConditions();drawBuilder();validate();keyboardSave(ui.node,save,true);overlay(ui.node,function(){return JSON.stringify(d)!==initial||Object.keys(composerDrafts).some(function(key){return !!composerDrafts[key].text.trim()&&(key==="root"||nodeById(d.nodes,key))})},true);
}
function openTemplatePicker(a,parentId,depth,onAdd){
  var ui=actionDialog("Browse SOPs","Choose an SOP checklist to add. Its existing subtasks and progress are kept.");
  allSopRules().forEach(function(rule){var row=el("div","template-row"),text=el("div");text.appendChild(el("strong",null,sopDisplayName(rule)));text.appendChild(el("p","hint",sopCondition(rule)));row.appendChild(text);
    var add=el("button","btn btn-o","Add "+leaves(sopNodes(rule)).length+" subtasks");add.disabled=treeDepth(sopNodes(rule))+depth>MAXDEPTH||(a.appliedSopRules||[]).indexOf(rule.id)>=0;
    add.onclick=function(){closeOverlay(true);onAdd(materializeSop(rule,a.dueDate),parentId,rule.id)};row.appendChild(add);ui.body.appendChild(row);
  });overlay(ui.node,null,true);
}
function checklistTools(a,onChange){
  var bar=el("div","reuse-tools"),browse=el("button","tpl-btn","Browse SOPs");browse.onclick=function(){openTemplatePicker(a,null,0,function(nodes,parent,ruleId){saveSubtaskWithSops(a,null,{},[ruleId],true).then(onChange).catch(function(e){toast(e.userMessage||msgFor(e))})})};bar.appendChild(browse);
  if(a.status!=="Published"){var ai=el("button","tpl-btn","Suggest tasks with AI");ai.setAttribute("aria-label","Suggest tasks with AI for "+a.title);ai.onclick=function(){if(hasOverlayChanges()){toast("Save the activity details first, then ask AI for tasks.");return}openActivityPlanner(a,onChange)};bar.appendChild(ai)}return bar;
}
function subReuseActions(a,s,depth,onChange){
  s=nodeById(a.subtasks,s.id)||s;
  var menu=el("details","reuse-menu"),summary=el("summary",null,"⋯");summary.title="Subtask actions";summary.setAttribute("aria-label","Actions for "+s.title);menu.appendChild(summary);
  function action(label,fn){var b=el("button",null,label);b.onclick=function(){menu.open=false;fn()};menu.appendChild(b)}
  action("Duplicate",function(){var copy=copyIndependentSubtask(s);copy.title+=" (copy)";a.subtasks=insertAfter(a.subtasks,s.id,copy);onChange();toast("Subtask duplicated")});
  if(depth<MAXDEPTH-1&&a.status!=="Published"&&!(s.done&&!kids(s).length))action("Break down with AI",function(){if(hasOverlayChanges()){toast("Save the current details first, then break this task down.");return}openActivityPlanner(a,onChange,s.id)});
  if(depth<MAXDEPTH-1)action("Browse SOPs to add inside",function(){openTemplatePicker(a,s.id,depth+1,function(nodes,parent,ruleId){saveSubtaskWithSops(a,s.id,{},[ruleId],true).then(function(saved){a.subtasks=saved.subtasks;S.expanded["n"+s.id]=true;S.workCollapsed["group:"+s.id]=false;rememberWorkFolds();onChange()}).catch(function(e){toast(e.userMessage||msgFor(e))})})});return menu;
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
    if(e.key!=="Enter"||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    e.preventDefault();
    var v=ai.value.trim();if(!v)return;
    ai.value="";S.focusAdd=key;
    if(parentId){S.expanded["n"+parentId]=true;S.workCollapsed["group:"+parentId]=false;rememberWorkFolds();}
    var n=newNode(v,"");saveSubs(a,addChild(a.subtasks||[],parentId,n)).then(function(){offerSubtaskSop(a,n.id)});
  };
  return ai;
}

function subNodes(host,a,nodes,depth){
  nodes.forEach(function(s){
    var raw=nodeById(a.subtasks,s.id)||s,ch=kids(s),group=ch.length>0,open=nodeOpen(s.id);
    var r=el("div","sub-row"+(group?" grp":""));
    if(group){
      var cv=el("button","sub-tgl",open?"▾":"▸");
      cv.title=open?"Collapse":"Expand";
      cv.onclick=function(e){e.stopPropagation();S.expanded["n"+s.id]=!open;S.workCollapsed["group:"+s.id]=open;rememberWorkFolds();render()};
      r.appendChild(cv);
    }
    r.appendChild(completionControl(a,nodeById(a.subtasks,s.id)||s));
    var deadline=subtaskDeadline(a,s);if(deadline)r.appendChild(deadline);
    var subTitle=el("button","sub-t sub-title-button"+(nodeDone(raw)?" done":""),s.title);
    subTitle.setAttribute("aria-label","Edit subtask: "+s.title);
    subTitle.onclick=function(){openSubtask(a,s)};r.appendChild(subTitle);
    if(writable())r.appendChild(subtaskEditButton(a,s));
    if(writable())r.appendChild(subReuseActions(a,s,depth,function(){persistSubs(a);render()}));
    var mt=el("span","sub-meta");
    if(group){
      var n=nodeCount(raw),pg=el("span","sub-count",n[0]+"/"+n[1]);
      if(n[1]&&n[0]===n[1])pg.classList.add("ok");
      mt.appendChild(pg);
    }
    if(writable()){
      /* the two dropdowns that say what this item is: where it goes, and what it is */
      var ps=dropdown(platformOptions(s.platform),s.platform||"","＋ where");
      ps.className="inl plat"+(s.platform?"":" empty");
      ps.title=s.platform?("Platform: "+platformLabel(s.platform)):"Set the platform";
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
        S.expanded["n"+s.id]=true;S.workCollapsed["group:"+s.id]=false;rememberWorkFolds();render();
      };
      r.appendChild(pc);
      var pl=el("button","sub-x plus","+");pl.title="Add one item under this";
      pl.onclick=function(){S.expanded["n"+s.id]=true;S.workCollapsed["group:"+s.id]=false;rememberWorkFolds();S.focusAdd="n"+s.id;render()};
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
  subNodes(box,a,scopedNodes(a,subs),0);
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
  var lastFormat=formatById(la.type),platform=contentPlatformSelect(la.platform||(lastFormat&&lastFormat.platforms[0])||"","Platform…");platform.className="q-platform";platform.setAttribute("aria-label","Activity platform");
  var fs=formatSelect(la.type||"","Format…","q-fmt",platform.value);
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
    var angle=angleBox.querySelector("select"),context={type:fs.value,platforms:platform.value?[platform.value]:[],angle:angle?angle.value:""};
    selectedSops=selectedSops.filter(function(id){return sopMatches(context).some(function(r){return r.id===id})});
    renderSopNudge(sopHint,context,{children:[]},0,function(id,add){selectedSops=selectedSops.filter(function(x){return x!==id});if(add)selectedSops.push(id);drawQuickSop()},selectedSops);
  }
  function drawAngle(keep){
    clear(angleBox);
    var s=sopTopicSelect(fs.value,keep?(la.angle||""):"","Topic…",platform.value);
    s.setAttribute("aria-label","Topic");s.onchange=drawQuickSop;
    angleBox.appendChild(s);
  }
  platform.onchange=function(){var type=contentFormatFits(platform.value,fs.value)?fs.value:"";replaceSelect(fs,formatSelect(type,"Format…","q-fmt",platform.value));drawAngle(false);drawQuickSop()};
  fs.onchange=function(){drawAngle(false);drawQuickSop()};
  drawAngle(true);drawQuickSop();
  function add(){
    var t=ti.value.trim();if(!t||go.disabled)return;if(!validDueTime(tm.value)||!tm.checkValidity()){toast("Choose a valid due time.");tm.focus();return}
    var f=formatById(fs.value),asel=angleBox.querySelector("select");
    var ang=asel?asel.value:"";
    S.lastAdd[c.id]={platform:platform.value,type:fs.value,angle:ang,date:dt.value,time:tm.value};
    go.disabled=true;go.textContent="…";
    var payload=applySopRules({campaignId:c.id,title:t,type:fs.value,angle:ang,cta:"",
      platforms:platform.value?[platform.value]:[],
      dueDate:dt.value||TODAY,dueTime:tm.value,owner:(S.me&&S.me.id)||"",status:"Not started",description:"",
      keywords:[],script:"",subtasks:[],createdAt:new Date().toISOString()},selectedSops);
    db.collection("activities").add(payload)
      .then(function(){S.focusAdd="c"+c.id;render();toast("Added to "+c.name)})
      .catch(function(e){go.disabled=false;go.textContent="Add";toast(msgFor(e))});
  }
  go.onclick=add;
  ti.onkeydown=function(e){if(e.key==="Enter"&&!e.isComposing&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey){e.preventDefault();add()}};
  /* At rest this is one field. The rest arrives when you start typing. */
  var row2=el("div","qrow");
  box.appendChild(ti);box.appendChild(row2);
  row2.appendChild(platform);row2.appendChild(fs);row2.appendChild(angleBox);
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
      platforms:platform.value?[platform.value]:[]
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
var VIEWS=[["today","Today"],["next7","Weekly"],
           ["month","Month"],["planner","Planner"],["campaigns","Campaigns"]];
function renderViews(){
  var w=$("vsw");clear(w);
  VIEWS.forEach(function(v){
    var isC=v[0]==="campaigns",isP=v[0]==="planner";
    var on=isC||isP?S.view===v[0]:(S.view==="calendar"&&S.calView===v[0]);
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
      if(isC||isP)S.view=v[0];
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
function viewportPosition(){return {x:window.scrollX||0,y:window.scrollY||0}}
function restoreViewport(position){if(position&&window.scrollTo)window.scrollTo({left:position.x,top:position.y,behavior:"instant"})}
function focusWithoutScroll(node){if(node&&node.isConnected)node.focus({preventScroll:true})}
function returnFocusKey(node){return node&&node.getAttribute?node.getAttribute("data-focus-key")||node.getAttribute("data-pfocus")||"":""}
function findReturnFocus(scope,key){if(!key)return null;return Array.from(scope.querySelectorAll("[data-focus-key],[data-pfocus]")).find(function(node){return returnFocusKey(node)===key})||null}
function render(){
  var position=viewportPosition(),requestedFocus=!!S.focusAdd;
  renderViews();renderHead();
  var who=$("who");
  if(S.me){
    who.hidden=false;
    who.textContent=initials(S.me.name);
    who.title="Your account";who.setAttribute("aria-label","Your account: "+S.me.name);
  }else who.hidden=true;
  var teamManage=$("team-manage");if(teamManage){teamManage.hidden=!S.me;teamManage.onclick=openTeamMembers;}
  renderMain();if(!requestedFocus)restoreViewport(position);
}
function renderMain(){
  var position=viewportPosition(),requestedFocus=!!S.focusAdd,returnKey=returnFocusKey(document.activeElement);
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
  }else if(S.view==="calendar")renderCalendar(main);else if(S.view==="planner")renderPlanner(main);else renderCampaigns(main);
  if(S.focusAdd){
    var f=main.querySelector('[data-focus="'+S.focusAdd+'"]');
    S.focusAdd=null;
    if(f)f.focus();
  }
  paintNames();
  labelIconControls(main);
  if(!requestedFocus){if(!overlayState)focusWithoutScroll(findReturnFocus(main,returnKey));restoreViewport(position)}
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
      updateOwnerBadge(ns[i],(S.profiles[id2]||{}).name);
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
  var scope=overlayState?overlayState.node:$("workspace"),replacement=findReturnFocus(scope,closed&&closed.returnKey);
  focusWithoutScroll(previous&&previous.isConnected?previous:replacement||(overlayState?overlayState.node.querySelector("input,button"):$("main")));
  if(overlayState&&closed.parentScroll){var body=overlayState.node.querySelector(".p-body");if(body){body.scrollTop=closed.parentScroll.top;body.scrollLeft=closed.parentScroll.left}}
  if(closed)restoreViewport(closed.viewport);
}
function overlay(node,dirty,preserveParent){
  clear($("toasts"));
  var o=$("overlay"),parent=preserveParent?overlayState:null;
  var parentBody=parent&&parent.node.querySelector(".p-body");
  overlayState={node:node,dirty:dirty,previous:document.activeElement,returnKey:returnFocusKey(document.activeElement),viewport:viewportPosition(),parentScroll:parentBody?{top:parentBody.scrollTop,left:parentBody.scrollLeft}:null,parent:parent,parentNodes:parent?Array.from(o.childNodes):null};
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
  var first=node.querySelector("[autofocus]")||node.querySelector("input,select,textarea"),opened=overlayState;if(first)setTimeout(function(){if(overlayState===opened&&!node.contains(document.activeElement))focusWithoutScroll(first)},120);
}
/* Save only the active editor; inputs with their own Enter action take priority. */
function keyboardSave(node,save,checklist){
  save.setAttribute("aria-keyshortcuts","Enter Control+Enter Meta+Enter");save.title="Enter to save · Ctrl/Cmd+Enter from notes";
  var hint=el("p","keyboard-save-hint",checklist?"Enter adds a step · Ctrl/⌘+Enter saves":"Enter saves · Ctrl/⌘+Enter from notes");node.querySelector(".p-foot").appendChild(hint);
  node.addEventListener("keydown",function(e){
    if(e.key!=="Enter"||e.isComposing||e.keyCode===229||e.defaultPrevented||!overlayState||overlayState.node!==node)return;
    var target=e.target,shortcut=e.ctrlKey||e.metaKey;
    if(e.repeat){if(shortcut||(!target.matches("textarea")&&!target.isContentEditable))e.preventDefault();return}
    if(e.altKey||e.shiftKey||target.isContentEditable||target.closest('[role="listbox"],[role="menu"]'))return;
    if(!shortcut&&(!target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])')||target.classList.contains("sub-add")))return;
    e.preventDefault();if(overlayState.busy||!writable()||node.querySelector(".discard-notice"))return;
    var state=overlayState;
    target.blur();if(overlayState!==state)return;
    if(shortcut)Array.from(node.querySelectorAll("input")).forEach(function(entry){if(entry.isConnected&&entry.commitForSave)entry.commitForSave()});
    if(overlayState!==state)return;
    if(save.disabled){var invalid=node.querySelector("input:invalid,textarea:invalid,select:invalid");if(invalid){focusWithoutScroll(invalid);invalid.reportValidity()}return}
    save.click();
  });
}
function keyboardCommit(control,host){
  control.addEventListener("keydown",function(e){
    if(e.key!=="Enter"||e.isComposing||e.keyCode===229||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    e.preventDefault();var state=overlayState,key=returnFocusKey(control);control.blur();if(overlayState===state)focusWithoutScroll(findReturnFocus(host,key));
  });
}
document.addEventListener("keydown",function(e){
  if(e.isComposing||e.keyCode===229)return;
  if(e.key==="Enter"&&e.repeat&&!e.target.matches("textarea")&&!e.target.isContentEditable){e.preventDefault();return}
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

/* Assignable people are separate from Google sign-in profiles. */
function memberNameKey(name){return "n-"+encodeURIComponent(normalizeSopName(name))}
function memberEmailKey(email){return email?"e-"+encodeURIComponent(email.trim().toLowerCase()):""}
function ownerIdentity(id){return S.ownerAliases[id]||id||""}
function buildTeamDirectory(users,members){
  var byEmail={},team=[],profiles={},aliases={},linked={};
  (users||[]).forEach(function(u){if(u.email)byEmail[u.email.trim().toLowerCase()]=u});
  (members||[]).forEach(function(m){var account=m.email&&byEmail[m.email.trim().toLowerCase()],id=account?account.id:m.id,person={id:id,memberId:m.id,name:m.name,email:m.email||"",role:m.role||"",connected:!!account};aliases[m.id]=id;profiles[m.id]={name:m.name};if(account)linked[account.id]=true;team.push(person)});
  (users||[]).forEach(function(u){if(!linked[u.id])team.push({id:u.id,name:u.name||u.email||"Teammate",email:u.email||"",role:"",connected:true})});
  var names={};team.forEach(function(p){var key=normalizeSopName(p.name);names[key]=(names[key]||0)+1});team.forEach(function(p){p.label=p.name+(names[normalizeSopName(p.name)]>1&&p.email?" · "+p.email:"");profiles[p.id]={name:p.label};if(p.memberId)profiles[p.memberId]={name:p.label}});
  return {team:team.sort(function(a,b){return a.name.localeCompare(b.name)}),profiles:profiles,aliases:aliases};
}
function rebuildTeamDirectory(){var directory=buildTeamDirectory(S.userRoster,S.members);S.team=directory.team;S.ownerAliases=directory.aliases;Object.assign(S.profiles,directory.profiles)}
function storeTeamMember(d,original){
  var name=String(d.name||"").trim().replace(/\s+/g," "),email=String(d.email||"").trim().toLowerCase(),role=String(d.role||"").trim();
  function fail(message){throw Object.assign(new Error(message),{userMessage:message})}
  if(!name||name.length>100||role.length>80||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||email.length>200)fail("Enter a name and a valid email, or leave email blank.");
  var conflict=S.team.find(function(p){return p.memberId!==(original&&original.id)&&(normalizeSopName(p.name)===normalizeSopName(name)||(email&&String(p.email||"").toLowerCase()===email))});if(conflict)fail("This person is already in the team. Choose "+conflict.name+" from the owner list.");
  var ref=original?db.collection("teamMembers").doc(original.id):db.collection("teamMembers").doc(),nameKey=memberNameKey(name),emailKey=memberEmailKey(email),nameRef=db.doc("teamMemberNameClaims/"+nameKey),emailRef=emailKey?db.doc("teamMemberEmailClaims/"+emailKey):null;
  return db.runTransaction(function(tx){
    var oldName=original&&original.nameKey!==nameKey?db.doc("teamMemberNameClaims/"+original.nameKey):null,oldEmail=original&&original.emailKey&&original.emailKey!==emailKey?db.doc("teamMemberEmailClaims/"+original.emailKey):null;
    return Promise.all([tx.get(ref),tx.get(nameRef),emailRef?tx.get(emailRef):null,oldName?tx.get(oldName):null,oldEmail?tx.get(oldEmail):null]).then(function(snaps){var current=snaps[0];
      if(original&&(!current.exists||(current.data().revision||0)!==(original.revision||0)))fail("This member changed elsewhere. Reopen their latest details.");
      if((snaps[1].exists&&snaps[1].data().memberId!==ref.id)||(snaps[2]&&snaps[2].exists&&snaps[2].data().memberId!==ref.id))fail("That name or email is already in use. Choose the existing team member.");
      var now=new Date().toISOString(),member={name:name,email:email,role:role,nameKey:nameKey,emailKey:emailKey,createdBy:original?original.createdBy:S.me.id,createdAt:original?original.createdAt:now,updatedAt:now,revision:original?(original.revision||0)+1:1};
      tx.set(ref,member);tx.set(nameRef,{memberId:ref.id,name:name});if(emailRef)tx.set(emailRef,{memberId:ref.id,email:email});if(oldName&&snaps[3].exists&&snaps[3].data().memberId===ref.id)tx.delete(oldName);if(oldEmail&&snaps[4].exists&&snaps[4].data().memberId===ref.id)tx.delete(oldEmail);return Object.assign({id:ref.id},member);
    });
  }).then(function(member){S.members=S.members.filter(function(m){return m.id!==member.id}).concat(member);rebuildTeamDirectory();render();return member});
}
function openTeamMember(member,onSaved){
  var ui=actionDialog(member?"Edit team member":"Add team member","Create an assignable person. They do not need to sign in, and this does not send an invitation."),name=input("text",member?member.name:"","Full name"),role=input("text",member?member.role:"","e.g. Video editor"),email=input("email",member?member.email:"","name@nprep.in");name.maxLength=100;role.maxLength=80;email.maxLength=200;
  ui.body.appendChild(field("Name *",name));ui.body.appendChild(field("Role (optional)",role));ui.body.appendChild(field("Email (optional)",email,"If this email later signs in with an allowed account, their existing assignments appear in My work."));
  var save=el("button","btn btn-p",member?"Save member":"Add member");function validate(){save.disabled=!name.value.trim()||!email.checkValidity()};[name,role,email].forEach(function(n){n.oninput=validate});
  save.onclick=function(){validate();if(save.disabled)return;runDialogSave(ui,save,function(){return storeTeamMember({name:name.value,email:email.value,role:role.value},member)},function(saved){if(onSaved)onSaved(saved);toast(member?"Team member updated":"Team member added")})};ui.foot.appendChild(save);validate();keyboardSave(ui.node,save);overlay(ui.node,function(){return name.value!==(member?member.name:"")||role.value!==(member?member.role:"")||email.value!==(member?member.email:"")},true);
}
function openTeamMembers(){
  if(!writable())return;var ui=actionDialog("Team members","Add people before they sign in, then assign campaigns, tasks or subtasks to them."),list=el("div","team-directory"),search=input("search","","Search team members…");search.setAttribute("aria-label","Search team members");ui.body.insertBefore(search,ui.error);ui.body.insertBefore(list,ui.error);
  function draw(){clear(list);var q=search.value.trim().toLowerCase(),people=S.team.filter(function(p){return [p.name,p.role,p.email].join(" ").toLowerCase().indexOf(q)>=0});if(S.teamError)list.appendChild(el("p","hint err",S.teamError));people.forEach(function(person){var row=el("div","team-member-row"),text=el("div");text.appendChild(el("strong",null,person.name));text.appendChild(el("p","hint",[person.role,person.email,person.connected?"Signed-in account":"Assignable without sign-in"].filter(Boolean).join(" · ")));row.appendChild(text);if(person.memberId){var edit=el("button","btn btn-o","Edit");edit.setAttribute("aria-label","Edit team member "+person.name);edit.onclick=function(){openTeamMember(S.members.find(function(m){return m.id===person.memberId}),draw)};row.appendChild(edit)}list.appendChild(row)});if(!people.length)list.appendChild(el("p","hint","No matching team members."))}
  var add=el("button","btn btn-p","+ Add team member");add.disabled=!S.membersReady;add.onclick=function(){openTeamMember(null,draw)};ui.foot.appendChild(add);ui.cancel.textContent="Done";search.oninput=draw;draw();overlay(ui.node,null,true);
}

/* owner typeahead over the workspace */
function ownerPicker(current,onPick){
  current=ownerIdentity(current);
  var box=el("div","ac"),inp=input("text","","Search your team…"),menu=null,suppressQuery=false;
  inp.setAttribute("role","combobox");inp.setAttribute("aria-autocomplete","list");inp.setAttribute("aria-expanded","false");
  if(current&&S.profiles[current]&&S.profiles[current].name)inp.value=S.profiles[current].name;
  else if(current)inp.value="Teammate";
  box.appendChild(inp);
  function shut(){if(menu){menu.remove();menu=null}inp.setAttribute("aria-expanded","false")}
  function closeAndFocus(){suppressQuery=true;shut();focusWithoutScroll(inp);suppressQuery=false}
  function show(list){
    shut();
    menu=el("div","ac-menu");menu.id="owner-list-"+(++fieldCount);menu.setAttribute("role","listbox");menu.setAttribute("aria-label","Teammates");
    inp.setAttribute("aria-controls",menu.id);inp.setAttribute("aria-expanded","true");
    if(!list.length)menu.appendChild(el("p","owner-empty","No matching people. Add a team member below to assign them before sign-in."));
    list.sort(function(a,b){return a.id===(S.me&&S.me.id)?-1:b.id===(S.me&&S.me.id)?1:0});
    list.forEach(function(p){
      var b=el("button",null,(p.label||p.name||"Someone")+(p.id===(S.me&&S.me.id)?" (you)":""));b.type="button";b.setAttribute("role","option");b.setAttribute("aria-selected",String(current===p.id));
      b.setAttribute("data-owner-option",p.id);b.onclick=function(){current=p.id;inp.value=p.label||p.name||"Someone";S.profiles[p.id]={name:p.label||p.name||""};onPick(p.id);closeAndFocus()};
      menu.appendChild(b);
    });
    var cb=el("button",null,"Leave unassigned");cb.type="button";cb.setAttribute("role","option");cb.setAttribute("aria-selected",String(!current));
    cb.onclick=function(){current="";inp.value="";onPick("");closeAndFocus()};
    menu.appendChild(cb);
    var addPerson=el("button",null,"+ Add team member");addPerson.type="button";addPerson.disabled=!S.membersReady;addPerson.onclick=function(){shut();openTeamMember(null,function(saved){var id=ownerIdentity(saved.id),person=S.team.find(function(p){return p.id===id});current=id;inp.value=person?person.label:saved.name;onPick(id)})};menu.appendChild(addPerson);
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
  inp.onkeydown=function(e){if(e.isComposing||e.keyCode===229||e.repeat)return;if(e.key==="ArrowDown"&&menu){e.preventDefault();menu.querySelector("button").focus()}if(e.key==="Enter"&&menu){e.preventDefault();var match=menu.querySelector("[data-owner-option]");if(match)match.click()}if(e.key==="Escape"){e.stopPropagation();shut()}};
  box.addEventListener("focusout",function(){setTimeout(function(){if(!box.contains(document.activeElement))shut()},180)});
  if(!U||!U.search){inp.disabled=true;inp.placeholder="Team directory unavailable"}
  return box;
}

/* Subtask details are saved together; the parent activity draft stays intact. */
function subtaskEditButton(a,s,onSaved){
  var edit=el("button","sub-edit");edit.title="Edit subtask";
  edit.setAttribute("data-focus-key","edit-subtask:"+a.id+":"+s.id);
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
  var original={title:s.title||"",description:s.description||"",owner:s.owner||"",due:s.due||"",dueTime:s.dueTime||"",platform:s.platform||"",kind:s.kind||"",type:s.type||"",angle:s.angle||""};
  var draft=Object.assign({},original),saving=false,selected=[],location=subtaskLocation(a,s.id),parent=location?location.parent:{platforms:a.platforms||[],type:a.type||"",angle:a.angle||""};
  var dialog=el("div","modal subtask-modal");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-label","Edit subtask");
  var head=el("div","p-head");head.appendChild(el("h2",null,"Subtask details"));
  var close=el("button","x","✕");close.onclick=closeOverlay;head.appendChild(close);dialog.appendChild(head);
  var body=el("div","p-body");dialog.appendChild(body);body.appendChild(el("p","form-intro","Part of "+a.title+". Conditions inherit from the parent unless you change them."));
  var title=input("text",draft.title,"What needs to be done?");title.required=true;title.oninput=function(){draft.title=title.value;validate()};body.appendChild(field("Subtask name *",title));
  var platform=contentPlatformSelect(draft.platform,"Use parent platform"),format=formatSelect(draft.type,"Use parent format",null,draft.platform||parent.platforms[0]||""),topicWrap=el("div"),nudge=el("div","sop-preview");
  var conditions=disclosure("SOP conditions",sopCondition({platform:parent.platforms.map(platformLabel).join(" + "),format:parent.type,angle:parent.angle}));conditions.node.open=!!draft.type||!!draft.angle;conditions.body.appendChild(field("Platform",platform));conditions.body.appendChild(field("Content format",format));conditions.body.appendChild(topicWrap);body.appendChild(conditions.node);body.appendChild(nudge);
  function context(){return subtaskConditionContext(draft,parent)}
  function drawNudge(){
    var effective=context();conditions.node.querySelector("summary small").textContent=sopCondition({platform:effective.platforms.map(platformLabel).join(" + "),format:effective.type,angle:effective.angle});
    var matches=sopMatches(effective);selected=selected.filter(function(id){return matches.some(function(r){return r.id===id})});
    renderSopNudge(nudge,context(),s,location?location.depth+1:1,function(id,add){selected=selected.filter(function(x){return x!==id});if(add)selected.push(id);drawNudge()},selected);
  }
  function drawTopic(){clear(topicWrap);var topic=sopTopicSelect(context().type,draft.angle,"Use parent topic",draft.platform||parent.platforms[0]||"");topic.onchange=function(){draft.angle=topic.value;drawNudge()};topicWrap.appendChild(field("Topic / category",topic))}
  function refreshFormats(){replaceSelect(format,formatSelect(draft.type,"Use parent format",null,draft.platform||parent.platforms[0]||""))}
  platform.onchange=function(){draft.platform=platform.value;var p=draft.platform||parent.platforms[0]||"";if(draft.type&&!contentFormatFits(p,draft.type)){draft.type="";draft.angle=""}if(!contentTopics(p,context().type).some(function(t){return t.id===draft.angle}))draft.angle="";refreshFormats();drawTopic();drawNudge()};format.onchange=function(){draft.type=format.value;draft.angle="";drawTopic();drawNudge()};drawTopic();drawNudge();
  var manage=el("button","text-button content-options-link","Manage content options");manage.onclick=function(){openContentOptions(function(){replaceSelect(platform,contentPlatformSelect(draft.platform,"Use parent platform"));refreshFormats();drawTopic();drawNudge()})};conditions.body.appendChild(manage);
  var description=el("textarea","subtask-description-input");description.value=draft.description;description.rows=4;description.placeholder="Instructions, links or acceptance criteria…";description.oninput=function(){draft.description=description.value};body.appendChild(field("Description (optional)",description));
  var planning=el("div","f2"),date=input("date",draft.due),time=input("time",draft.dueTime);time.step="60";time.oninput=function(){draft.dueTime=time.value;validate()};if(focusDeadline)date.autofocus=true;date.oninput=function(){draft.due=date.value};var inherited=effectiveWork(a).find(function(row){return row.id===s.id});planning.appendChild(field("Deadline (optional)",date,"Set a date only if this subtask needs a separate deadline."));planning.appendChild(field("Due time (optional)",time,"Leave blank for any time on the due date."));planning.appendChild(field("Owner (optional)",ownerPicker(draft.owner,function(id){draft.owner=id})));body.appendChild(planning);
  var kind=dropdown(SUBKINDS.map(function(k){return[k,k]}),draft.kind,"Not set");kind.onchange=function(){draft.kind=kind.value};conditions.body.appendChild(field("Work type (optional)",kind,"The production step, such as Script, Edit or Thumbnail."));body.insertBefore(planning,conditions.node);body.insertBefore(description.parentElement,conditions.node);
  var err=el("p","hint err");err.hidden=true;err.setAttribute("role","alert");body.appendChild(err);
  var foot=el("div","p-foot");foot.appendChild(el("p","required-note","Save to update this subtask and add any selected SOP steps."));
  var cancel=el("button","btn btn-o","Cancel");cancel.onclick=closeOverlay;foot.appendChild(cancel);var save=el("button","btn btn-p sp","Save subtask");foot.appendChild(save);dialog.appendChild(foot);
  function validate(){save.disabled=saving||!draft.title.trim()||!validDueTime(draft.dueTime)||!time.checkValidity()||!writable();return !save.disabled}
  save.onclick=function(){
    if(!validate())return;var changes={};Object.keys(original).forEach(function(key){var value=key==="title"?draft[key].trim():draft[key];if(value!==original[key])changes[key]=value});
    if(!draft.due&&!(inherited&&inherited.parentDue)){err.textContent="Set the parent task deadline or choose a deadline here before saving.";err.hidden=false;return}if(!Object.keys(changes).length&&!selected.length){closeOverlay(true);return}
    saving=true;validate();save.textContent="Saving…";err.hidden=true;cancel.disabled=true;close.disabled=true;body.querySelectorAll("input,textarea,select,button").forEach(function(control){control.disabled=true});
    var editingState=overlayState;editingState.busy=true;var write=saveSubtaskWithSops(a,s.id,changes,selected);wq=write.catch(function(){});
    write.then(function(saved){editingState.busy=false;if(overlayState===editingState)closeOverlay(true);if(onSaved)onSaved(saved);render();toast("Subtask saved")}).catch(function(e){
      editingState.busy=false;saving=false;validate();save.textContent="Save subtask";cancel.disabled=false;close.disabled=false;body.querySelectorAll("input,textarea,select,button").forEach(function(control){control.disabled=false});drawNudge();err.textContent=e.userMessage||msgFor(e);err.hidden=false;
    });
  };
  clear($("toasts"));validate();keyboardSave(dialog,save);overlay(dialog,function(){return JSON.stringify(draft)!==JSON.stringify(original)||selected.length>0},true);
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
    owner:a?(a.owner||""):((S.me&&S.me.id)||""),
    description:a?(a.description||""):"",
    keywords:a?(a.keywords||[]).slice():[],
    script:a?(a.script||""):"",manualSops:[],selectedSopIds:[],templateAnchor:presetDate||TODAY,repeat:{unit:"",count:1}
  };
  var initial=JSON.stringify(d);
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

  var primary=contentPlatformSelect(d.platforms[0]||"","Choose platform"),fmtSel=formatSelect(d.type,"Not set",null,primary.value);primary.id="act-platform";fmtSel.id="act-format";
  body.appendChild(field("Platform",primary,"Choose the main platform first; available formats and topics follow it."));body.appendChild(field("Format",fmtSel));
  var contentDetails=disclosure("Content details","Additional platforms, notes & keywords"),angleWrap=el("div"),ctaWrap=el("div"),pl=el("div","pills");body.appendChild(angleWrap);contentDetails.body.appendChild(ctaWrap);
  function drawAngle(){clear(angleWrap);var select=sopTopicSelect(d.type,d.angle,"Not set",primary.value);select.id="act-angle";select.onchange=function(){d.angle=select.value;if(sopPreview)drawSopPreview()};angleWrap.appendChild(field("Topic / category",select,"Topics depend on the selected platform and format."))}
  function drawCta(){clear(ctaWrap);var f=formatById(d.type);ctaWrap.hidden=!(f&&f.cta);if(!f||!f.cta)return;var select=dropdown(CTAS.map(function(x){return[x,x]}),d.cta,"Not set");select.id="act-cta";select.onchange=function(){d.cta=select.value};ctaWrap.appendChild(field("CTA",select,"How the viewer is asked to act."))}
  function drawPlatforms(){clear(pl);var choices=platformOptions();d.platforms.forEach(function(id){if(!choices.some(function(p){return p[0]===id}))choices.push([id,platformLabel(id)])});choices.forEach(function(choice){var button=el("button","pill sky",choice[1]);button.type="button";button.setAttribute("aria-pressed",String(d.platforms.indexOf(choice[0])>=0));if(choice[0]===primary.value)button.title="Primary platform";button.onclick=function(){if(choice[0]===primary.value)return;var index=d.platforms.indexOf(choice[0]);if(index>=0)d.platforms.splice(index,1);else d.platforms.push(choice[0]);drawPlatforms();if(sopPreview)drawSopPreview()};pl.appendChild(button)})}
  function refreshContent(){replaceSelect(fmtSel,formatSelect(d.type,"Not set",null,primary.value));drawAngle();drawCta();drawPlatforms();if(sopPreview)drawSopPreview()}
  primary.onchange=function(){var id=primary.value,old=d.platforms[0];d.platforms=id?[id].concat(d.platforms.filter(function(p){return p!==id&&p!==old})):[];if(!id||!contentFormatFits(id,d.type)){d.type="";d.angle=""}if(!contentTopics(id,d.type).some(function(t){return t.id===d.angle}))d.angle="";refreshContent()};
  fmtSel.onchange=function(){d.type=fmtSel.value;d.angle="";var f=formatById(d.type);if(!f||!f.cta)d.cta="";drawAngle();drawCta();if(sopPreview)drawSopPreview()};
  var manageOptions=el("button","text-button content-options-link","Manage content options");manageOptions.onclick=function(){openContentOptions(function(){replaceSelect(primary,contentPlatformSelect(d.platforms[0]||"","Choose platform"));refreshContent()})};body.appendChild(manageOptions);drawAngle();drawCta();drawPlatforms();contentDetails.body.appendChild(field("Additional platforms",pl,"Optional distribution channels. The main platform controls the format and topic lists."));

  var two=el("div","f2");
  var dd=input("date",d.dueDate);dd.id="act-date";
  var dt=input("time",d.dueTime);dt.id="act-time";
  dd.required=true;
  var dw=field("Due date *",dd),tw=field("Due time (optional)",dt,"Leave blank for any time that day.");
  two.appendChild(dw);two.appendChild(tw);
  body.appendChild(two);
  var rangeHint=el("div","hint warn");rangeHint.hidden=true;body.appendChild(rangeHint);
  dd.oninput=function(){d.dueDate=dd.value;if(repeatOptions)repeatOptions.refresh();validate()};
  dt.oninput=function(){d.dueTime=dt.value;validate()};
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
        var raw=nodeById(a.subtasks,s.id)||s,ch=kids(s),group=ch.length>0;
        var r=el("div","ps-row dep"+Math.min(depth,MAXDEPTH)+(group?" grp":""));
        if(group){var n=nodeCount(raw),pg=el("span","sub-count",n[0]+"/"+n[1]);if(n[1]&&n[0]===n[1])pg.classList.add("ok");r.appendChild(pg)}
        r.appendChild(completionControl(a,s,function(saved){a.subtasks=saved.subtasks;drawSubs(null)}));
        var ti=input("text",s.title);ti.className="ps-title"+(nodeDone(raw)?" done":"");
        ti.placeholder="Name this item…";ti.setAttribute("data-pfocus","t"+s.id);
        keyboardCommit(ti,sbox);
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
        var pf2=dropdown(platformOptions(s.platform),s.platform||"","Platform…");
        pf2.className="ps-plat";pf2.setAttribute("aria-label","Platform for "+s.title);
        pf2.onchange=function(){patchSub(s.id,{platform:pf2.value})};
        var kd=dropdown(SUBKINDS.map(function(k){return[k,k]}),s.kind||"","Type…");
        kd.className="ps-kind";kd.setAttribute("aria-label","Type");
        kd.onchange=function(){patchSub(s.id,{kind:kd.value})};
        var dd=input("date",s.due||"");dd.className="ps-date";dd.setAttribute("data-focus-key","inline-deadline:"+a.id+":"+s.id);
        dd.title="Due date for this item";
        keyboardCommit(dd,sbox);
        dd.onchange=function(){patchSub(s.id,{due:dd.value})};
        var op=ownerPicker(s.owner,function(id){patchSub(s.id,{owner:id})});
        op.classList.add("ps-own");
        var deadlineField=field("Deadline",dd);deadlineField.classList.add("ps-deadline");var clock=input("time",s.dueTime||"");clock.step="60";clock.className="ps-time";clock.setAttribute("data-focus-key","inline-due-time:"+a.id+":"+s.id);clock.onchange=function(){if(!validDueTime(clock.value)||!clock.checkValidity()){toast("Choose a valid due time.");return}patchSub(s.id,{dueTime:clock.value})};keyboardCommit(clock,sbox);var timeField=field("Due time",clock);timeField.classList.add("ps-due-time");
        two.appendChild(pf2);two.appendChild(kd);two.appendChild(deadlineField);two.appendChild(timeField);two.appendChild(op);
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
      var scrollTop=body.scrollTop,scrollLeft=body.scrollLeft,oldFocus=document.activeElement,key=returnFocusKey(oldFocus);
      clear(sbox);
      psNodes(scopedNodes(a,a.subtasks||[]),0);
      var ai=el("input");ai.type="text";ai.className="sub-add";
      ai.placeholder="+ Add an item and press Enter";
      ai.setAttribute("data-pfocus","add");
      function addTypedItem(suggest){var v=ai.value.trim();if(!v)return;var fresh=newNode(v,"");a.subtasks=(a.subtasks||[]).concat([fresh]);
        persistSubs(a).then(function(){if(suggest)offerSubtaskSop(a,fresh.id,function(saved){a.subtasks=saved.subtasks;drawSubs(null)})});render();drawSubs(suggest?"add":null)}
      ai.commitForSave=function(){addTypedItem(false)};
      ai.onkeydown=function(e){
        if(e.key!=="Enter"||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
        e.preventDefault();addTypedItem(true);
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
      }else{focusWithoutScroll(findReturnFocus(sbox,key));body.scrollTop=scrollTop;body.scrollLeft=scrollLeft}
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
  if(!isNew&&canDeleteTasks()){
    var del=el("button","btn btn-d","Delete");
    var confirmRow=null;
    del.onclick=function(){
      if(confirmRow){return}
      confirmRow=el("div");confirmRow.style.cssText="display:flex;gap:8px;align-items:center;width:100%";
      confirmRow.appendChild(el("span","hint err","Delete this activity?"));
      var yes=el("button","btn btn-d","Delete");
      yes.style.marginLeft="auto";
      yes.onclick=function(){
        if(!canDeleteTasks()){showErr({code:"permission-denied"});return}
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
    var ok=d.title.trim()&&d.campaignId&&d.dueDate&&validDueTime(d.dueTime)&&dt.checkValidity()&&S.sopReady&&(!repeatOptions||repeatOptions.valid());
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
  validate();keyboardSave(p,save);
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
  return auth.currentUser.getIdToken().then(function(token){return fetch("/api/activity-plan",{method:method,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(65000)})}).then(function(response){return response.json().catch(function(){throw new Error("AI planning is unavailable. Please try again later.")}).then(function(data){if(!response.ok)throw new Error(data.error||"AI planning is unavailable.");return data})});
}
function aiChecklistContext(nodes,phase){
  var out=[];(nodes||[]).forEach(function(n){out.push({id:n.id||"",title:n.title,phase:phase||"",description:n.description||"",platform:platformLabel(n.platform)||"",kind:n.kind||"",done:nodeDone(n),due:n.due||""});out=out.concat(aiChecklistContext(kids(n),phase?phase+" → "+n.title:n.title))});return out;
}
function aiReferenceChecklist(nodes){
  return (nodes||[]).reduce(function(out,n){var children=aiReferenceChecklist(kids(n)),edited=n.aiOriginal&&(n.title!==n.aiOriginal.title||(n.description||"")!==n.aiOriginal.description);
    if(children.length||(!kids(n).length&&(!n.aiPlanId||n.done||edited)))out.push(Object.assign({},n,{children:children}));return out},[]);
}
function aiReferenceCandidates(current){
  function words(title){return String(title||"").toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]}
  function topic(value){return String(value||"").toLowerCase().replace(/\s*\([^)]*\)/g,"").trim()}
  var tokens=words(current.title).filter(function(w){return w.length>2&&["the","and","for","video","nursing"].indexOf(w)<0}),seen={};
  return S.activities.filter(function(a){return a.id!==current.id&&aiReferenceChecklist(a.subtasks).length}).map(function(a){
    var sameFormat=!!a.type&&a.type===current.type,samePlatform=(a.platforms||[]).some(function(p){return (current.platforms||[]).indexOf(p)>=0}),sameTopic=!!a.angle&&topic(a.angle)===topic(current.angle),conflictingTopic=!!a.angle&&!!current.angle&&!sameTopic,sameCampaign=a.campaignId===current.campaignId,overlap=tokens.filter(function(w){return words(a.title).indexOf(w)>=0}).length;
    var reasons=[];if(sameCampaign)reasons.push("same campaign");if(sameFormat)reasons.push("same format");if(samePlatform)reasons.push("same platform");if(sameTopic)reasons.push("same category");
    return {activity:a,score:(sameFormat?50:0)+(samePlatform?35:0)+(sameTopic?90:0)+(sameCampaign?45:0)+overlap*18+(a.status==="Published"?5:0),reasons:reasons,eligible:!conflictingTopic&&((sameFormat&&samePlatform)||(sameCampaign&&overlap>0)||(sameTopic&&samePlatform&&overlap>0))};
  }).filter(function(r){return r.eligible}).sort(function(a,b){return b.score-a.score||(b.activity.createdAt||"").localeCompare(a.activity.createdAt||"")||a.activity.id.localeCompare(b.activity.id)}).filter(function(r){var key=JSON.stringify(aiChecklistContext(aiReferenceChecklist(r.activity.subtasks)).map(function(n){return [n.title,n.description]}));if(seen[key])return false;seen[key]=true;return true});
}
function aiSopSources(a){var seen={};return allSopRules().filter(function(r){return (a.appliedSopRules||[]).indexOf(r.id)>=0}).concat(sopMatches(a)).filter(function(r){if(seen[r.id])return false;seen[r.id]=true;return true}).slice(0,3)}
function aiContextSteps(nodes,limit,maxChars){var remaining=maxChars||8000,out=[];aiChecklistContext(nodes).slice(0,limit).some(function(n){var row=Object.assign({},n,{title:String(n.title||"").slice(0,180),phase:n.phase.slice(0,180),description:n.description.slice(0,400)}),size=JSON.stringify(row).length;if(size>remaining)return true;remaining-=size;out.push(row);return false});return out}
function aiWorkRequest(current,referenceIds,sopIds,brief,direction,targetId){
  var campaign=campById(current.campaignId),location=targetId?subtaskLocation(current,targetId):null;if(targetId&&!location)throw new Error("This task no longer exists.");
  return {target:location?{id:location.node.id,title:location.node.title,description:location.node.description||"",depth:location.depth,due:(effectiveWork(current).find(function(row){return row.id===targetId})||{}).due||current.dueDate,done:nodeDone(location.node),hasChildren:!!kids(location.node).length}:null,activity:{title:current.title,type:formatLabel(current.type,(current.platforms||[])[0]),formatId:current.type,platforms:(current.platforms||[]).map(platformLabel),angle:topicLabel(current.angle,current.type,(current.platforms||[])[0]),dueDate:current.dueDate,status:current.status,description:(current.description||"").slice(0,1000),campaign:{name:campaign?campaign.name:"",goal:campaign?campaign.goal||"":""}},brief:brief,directionPrompt:direction,today:TODAY,
    existing:aiContextSteps(current.subtasks,100,12000),references:referenceIds.slice(0,3).map(function(id){return S.activities.find(function(a){return a.id===id&&a.id!==current.id})}).filter(Boolean).map(function(a){return {id:"work:"+a.id,title:a.title,type:formatLabel(a.type,(a.platforms||[])[0]),platforms:(a.platforms||[]).map(platformLabel),angle:topicLabel(a.angle,a.type,(a.platforms||[])[0])||"",description:(a.description||"").slice(0,600),status:a.status,steps:aiContextSteps(aiReferenceChecklist(a.subtasks),30,4500)}}).filter(function(a){return a.steps.length}),
    sops:allSopRules().filter(function(r){return sopIds.indexOf(r.id)>=0}).slice(0,3).map(function(r){return {id:"sop:"+r.id,name:r.name,conditions:sopConditions(r).map(function(c){return {platform:platformLabel(c.platform),format:formatLabel(c.format,c.platform),angle:topicLabel(c.angle,c.format,c.platform)}}),steps:aiContextSteps(sopNodes(r),40,6000)}})};
}
function appendAiChecklist(a,phases,planId,brief,targetId){
  if(a.status==="Published")throw new Error("This activity is complete. Reopen it before adding tasks.");
  if((a.appliedAiPlans||[]).indexOf(planId)>=0)return {activity:a,added:0};
  var location=targetId?subtaskLocation(a,targetId):null;if(targetId&&!location)throw new Error("This task no longer exists.");
  if(location&&(location.depth>=MAXDEPTH-1||(!kids(location.node).length&&location.node.done)))throw new Error("Reopen this task or use its parent to add more subtasks.");
  var depth=location?location.depth+1:0,flat=depth===MAXDEPTH-1,base=location?kids(location.node):a.subtasks||[],known=aiChecklistContext(base).map(function(n){return n.title.trim().toLowerCase()}),count=0;
  function make(task){var title=task.title.trim();if(!title||!task.description.trim())throw new Error("Name each selected task and include its instructions.");if(task.dueDate&&(task.dueDate<TODAY||task.dueDate>addDays(a.dueDate>TODAY?a.dueDate:TODAY,7)))throw new Error("Review the task deadlines before adding.");var node=newNode(title);node.description=task.description;node.due=task.dueDate||"";node.aiPlanId=planId;node.aiOriginal={title:title,description:task.description};if(task.basis)node.aiBasis=task.basis;node.children=(task.children||[]).map(make);return node}
  var incoming=flat?phases.reduce(function(out,p){return out.concat(p.tasks.map(make))},[]):phases.map(function(p){var group=newNode(p.title.trim());if(!group.title)throw new Error("Name each phase.");group.description=p.why;group.aiPlanId=planId;group.children=p.tasks.map(make);return group});
  if(treeDepth(incoming)+depth>MAXDEPTH)throw new Error("This breakdown is too deep. Use the parent task or fewer levels.");
  function merge(existing,added,isPhase){var out=existing.slice();added.forEach(function(n){var key=n.title.toLowerCase(),index=out.findIndex(function(old){return old.title.trim().toLowerCase()===key});if(index>=0){var old=out[index];if(kids(n).length&&!(old.done&&!kids(old).length))out[index]=Object.assign({},old,{children:merge(kids(old),kids(n),false)});return}
    if(kids(n).length){var children=merge([],kids(n),false);if(!children.length)return;n=Object.assign({},n,{children:children})}else if(known.indexOf(key)>=0)return;
    known.push(key);out.push(n);if(!isPhase)count++;
  });return out}
  var next=merge(base,incoming,!flat),nodes=location?patchNode(a.subtasks,targetId,{children:next}):next;
  return {activity:Object.assign({},a,{subtasks:nodes,aiBrief:brief,appliedAiPlans:(a.appliedAiPlans||[]).concat([planId]).slice(-100)}),added:count};
}
function saveAiChecklist(a,phases,planId,brief,targetId){
  return wq.then(function(){return db.runTransaction(function(tx){var ref=db.doc("activities/"+a.id);return tx.get(ref).then(function(snap){
    if(!snap.exists)throw new Error("This activity no longer exists.");var result=appendAiChecklist(Object.assign({id:a.id},snap.data()),phases,planId,brief,targetId);
    tx.update(ref,{subtasks:result.activity.subtasks,aiBrief:result.activity.aiBrief||brief,appliedAiPlans:result.activity.appliedAiPlans||[]});return result;
  })})}).then(function(result){Object.assign(a,result.activity);S.activities=S.activities.map(function(current){return current.id===a.id?result.activity:current});if(targetId){S.expanded["n"+targetId]=true;S.workCollapsed["group:"+targetId]=false;rememberWorkFolds();}render();return result});
}
function saveAiDirection(direction,audience){
  if(!S.me||!S.me.id)return Promise.reject(new Error("Sign in again to save your AI direction."));
  var settings={directionPrompt:direction.trim(),audience:audience.trim()};
  if(!settings.directionPrompt||settings.directionPrompt.length>6000)return Promise.reject(new Error("Keep the AI system prompt between 1 and 6,000 characters."));
  return db.doc("users/"+S.me.id).set({aiPlanning:settings},{merge:true}).then(function(){S.aiPlanning=settings;return settings});
}
function openActivityPlanner(a,onSaved,targetId){
  if(!writable())return;
  var target=targetId?subtaskLocation(a,targetId):null;if(targetId&&(!target||target.depth>=MAXDEPTH-1)){toast("Use the parent task to add more levels.");return}
  var ui=actionDialog(target?"Break down task with AI":"Plan video tasks with AI","Suggest phases and missing tasks for “"+a.title+"”. Your existing checklist stays intact; you choose what to add.");ui.node.classList.add("ai-planner");if(target)ui.node.querySelector(".form-intro").textContent="Break down “"+target.node.title+"” into subtasks. The result will be added inside this task.";
  var saved=a.aiBrief||{},settings=S.aiPlanning||{},brief=el("div","ai-brief"),results=el("div","ai-results"),status=el("p","hint","Checking AI availability…"),ready=false,working=false,plan=null,planId=sid(),drafts=[],defaultDirection="",directionTouched=false;
  var referenceIds=aiReferenceCandidates(a).slice(0,3).map(function(r){return r.activity.id}),sopIds=aiSopSources(a).map(function(r){return r.id}),sourcesTouched=false;
  var listedReferences=referenceIds.slice(),listedSops=sopIds.slice();
  results.hidden=true;ui.body.appendChild(status);ui.body.appendChild(brief);ui.body.appendChild(results);
  var context=el("p","ai-video-context",[formatLabel(a.type,(a.platforms||[])[0])].concat((a.platforms||[]).map(platformLabel)).concat([topicLabel(a.angle,a.type,(a.platforms||[])[0]),fmtLong(a.dueDate)]).filter(Boolean).join(" · "));brief.appendChild(context);
  brief.appendChild(el("p","ai-role-summary","Creative director · Instagram & YouTube specialist · Growth strategist"));
  var campaign=campById(a.campaignId),goal=el("textarea");goal.rows=2;goal.value=target?"Break down “"+target.node.title+"” into clear, actionable subtasks. "+(target.node.description||""):saved.goal||(a.description||"").slice(0,700)||(campaign&&campaign.goal)||"Plan “"+a.title+"” using its saved checklist and relevant examples.";goal.maxLength=1000;goal.placeholder="e.g. Tell a nursing success story that motivates aspirants to keep preparing";
  var audience=input("text",saved.audience||settings.audience||"Nursing exam aspirants","Who is watching this video?");audience.maxLength=600;
  brief.appendChild(field("What should this video achieve? *",goal));brief.appendChild(field("Who is it for? *",audience));
  var extra=disclosure("Constraints & context","Capacity, tone, resources or anything to avoid"),constraints=el("textarea");constraints.rows=3;constraints.maxLength=1000;constraints.value=saved.constraints||"";constraints.placeholder="e.g. A 45-second video using an interview we already recorded; no new shoot";extra.body.appendChild(field("Constraints",constraints));brief.appendChild(extra.node);
  var directionSection=disclosure("How AI should think","System prompt · Director, platform expert & growth strategist"),direction=el("textarea","ai-direction-prompt"),directionActions=el("div","ai-direction-actions"),saveDirection=el("button","btn btn-o","Save as my default"),resetDirection=el("button","text-button","Use recommended prompt"),copyDirection=el("button","text-button","Copy prompt"),directionStatus=el("p","hint"),persistedDirection=settings.directionPrompt||"";
  direction.rows=12;direction.maxLength=6000;direction.value=persistedDirection;direction.placeholder="Loading the recommended system prompt…";directionSection.body.appendChild(field("AI system prompt",direction,"Used for every draft. Save it as your default to reuse it across all videos on your account."));
  [saveDirection,resetDirection,copyDirection].forEach(function(button){button.type="button";directionActions.appendChild(button)});directionSection.body.appendChild(directionActions);directionStatus.setAttribute("role","status");directionStatus.textContent=persistedDirection?"Using your saved direction. Change it here for this draft, or save a new default.":"The recommended direction applies automatically. Save changes once to reuse them for future videos.";directionSection.body.appendChild(directionStatus);brief.appendChild(directionSection.node);
  direction.oninput=function(){directionTouched=true;directionStatus.textContent="Changed for this draft. Save as my default to reuse across videos.";validate()};
  resetDirection.onclick=function(){direction.value=defaultDirection;directionTouched=true;directionStatus.textContent="Recommended prompt restored for this draft. Save as my default to keep it.";validate()};
  copyDirection.onclick=function(){if(!navigator.clipboard){directionSection.node.open=true;direction.focus();direction.select();directionStatus.textContent="Select and copy the prompt above.";return}navigator.clipboard.writeText(direction.value).then(function(){directionStatus.textContent="System prompt copied."}).catch(function(){directionSection.node.open=true;direction.focus();direction.select();directionStatus.textContent="Select and copy the prompt above."})};
  saveDirection.onclick=function(){validate();if(saveDirection.disabled)return;busy(true);directionStatus.textContent="Saving your default…";saveAiDirection(direction.value,audience.value).then(function(){persistedDirection=direction.value;directionStatus.textContent="Saved for your account. Future videos will use this direction and audience."}).catch(function(e){directionStatus.textContent=e.code?msgFor(e):e.message}).finally(function(){busy(false)})};
  var learning=disclosure("Using your saved work","Current checklist, matching SOPs and similar videos"),sourceList=el("div","ai-source-list"),sourceSummary=el("p","hint");learning.body.appendChild(sourceSummary);learning.body.appendChild(sourceList);brief.appendChild(learning.node);
  function drawSources(){
    clear(sourceList);var current=S.activities.find(function(n){return n.id===a.id})||a,steps=aiContextSteps(current.subtasks,100,12000),examples=referenceIds.map(function(id){return S.activities.find(function(n){return n.id===id})}).filter(Boolean),rules=allSopRules().filter(function(r){return sopIds.indexOf(r.id)>=0}),available=aiReferenceCandidates(current);
    sourceSummary.textContent="Includes the latest saved instructions and completion status. Choose the examples that should guide this draft.";
    learning.node.querySelector("summary small").textContent=steps.length+" current steps · "+examples.length+" saved "+(examples.length===1?"video":"videos")+" · "+rules.length+" SOP"+(rules.length===1?"":"s")+" · Review sources";
    sourceList.appendChild(el("p","hint",steps.length?"Your current checklist is always included. AI should find gaps, keep your phase names and avoid work already done.":"This video has no checklist yet. Selected examples and SOP steps provide a starting point."));
    function sourceRow(title,subtitle,checked,onChange,nodes){var row=el("div","ai-source-row"),check=input("checkbox","");check.checked=checked;check.setAttribute("aria-label","Use "+title+" as AI context");check.onchange=function(){sourcesTouched=true;onChange(check.checked);drawSources()};row.appendChild(check);var content=el("div");content.appendChild(el("strong",null,title));content.appendChild(el("p","hint",subtitle));var preview=el("details"),summary=el("summary",null,"Preview saved steps");preview.appendChild(summary);preview.appendChild(sopChecklistList(nodes));content.appendChild(preview);row.appendChild(content);sourceList.appendChild(row)}
    listedReferences.map(function(id){return S.activities.find(function(example){return example.id===id})}).filter(Boolean).forEach(function(example){var candidate=available.find(function(r){return r.activity.id===example.id});sourceRow(example.title,"Example video · "+(candidate?candidate.reasons.join(", "):"chosen by you"),referenceIds.indexOf(example.id)>=0,function(checked){referenceIds=referenceIds.filter(function(id){return id!==example.id});if(checked&&referenceIds.length<3)referenceIds.push(example.id)},aiReferenceChecklist(example.subtasks))});
    allSopRules().filter(function(rule){return listedSops.indexOf(rule.id)>=0}).forEach(function(rule){sourceRow(rule.name,"SOP · "+sopCondition(rule),sopIds.indexOf(rule.id)>=0,function(checked){sopIds=sopIds.filter(function(id){return id!==rule.id});if(checked&&sopIds.length<3)sopIds.push(rule.id)},sopNodes(rule))});
    var additional=S.activities.filter(function(example){return example.id!==current.id&&listedReferences.indexOf(example.id)<0&&aiReferenceChecklist(example.subtasks).length});
    if(additional.length){var choose=dropdown(additional.map(function(example){var c=campById(example.campaignId);return [example.id,example.title+(c?" · "+c.name:"")]}),"","Choose another saved video");choose.setAttribute("aria-label","Add a video example for AI");choose.disabled=referenceIds.length>=3;choose.onchange=function(){if(choose.value&&referenceIds.length<3){referenceIds.push(choose.value);listedReferences.push(choose.value);sourcesTouched=true;drawSources()}};sourceList.appendChild(field("Add a video example",choose,"Use up to 3 relevant checklists. Nothing is copied automatically."))}
    var moreRules=aiSopSources(current).filter(function(rule){return sopIds.indexOf(rule.id)<0});if(moreRules.length){var restore=el("button","text-button","Include matching SOPs");restore.type="button";restore.onclick=function(){sopIds=aiSopSources(current).map(function(rule){return rule.id});listedSops=listedSops.concat(sopIds).filter(function(id,index,all){return all.indexOf(id)===index});sourcesTouched=true;drawSources()};sourceList.appendChild(restore)}
    if(!steps.length&&!examples.length&&!rules.length)sourceList.appendChild(el("p","hint","No work examples selected. Suggestions will be new ideas, not learned from a previous checklist."));
  }
  var matches=sopMatches(a).filter(function(r){return (a.appliedSopRules||[]).indexOf(r.id)<0});if(matches.length)brief.appendChild(el("p","hint","Matching SOP available: "+matches.map(sopDisplayName).join(", ")+". Its steps are available as context; apply the SOP from your checklist if you want all its tasks."));
  var sharing=el("p","hint ai-sharing","Sends the video brief/notes, AI direction, current checklist instructions and the selected saved-video/SOP steps to Google Gemini. Scripts and owner details are excluded. Only bounded excerpts are shared. Google’s free tier may use submitted content to improve its products.");brief.appendChild(sharing);
  var pricing=el("a",null,"Google data-use and pricing terms");pricing.href="https://ai.google.dev/gemini-api/docs/pricing";pricing.target="_blank";pricing.rel="noopener noreferrer";sharing.appendChild(document.createTextNode(" "));sharing.appendChild(pricing);
  var generate=el("button","btn btn-p sp","Suggest phases & tasks"),add=el("button","btn btn-p sp","Add selected tasks"),back=el("button","btn btn-o","Edit brief");add.hidden=true;back.hidden=true;ui.foot.appendChild(back);ui.foot.appendChild(generate);ui.foot.appendChild(add);
  function values(){return {goal:goal.value.trim(),audience:audience.value.trim(),constraints:constraints.value.trim()}}
  function allDraftTasks(){var out=[];function walk(tasks){tasks.forEach(function(t){out.push(t);walk(t.children||[])})}drafts.forEach(function(p){walk(p.tasks)});return out}
  function chosen(){return allDraftTasks().filter(function(t){return t.selected}).length}
  function validate(){var directionValid=!!direction.value.trim()&&direction.value.length<=6000;generate.disabled=working||!ready||!values().goal||!values().audience||!directionValid;saveDirection.disabled=working||!directionValid||!audience.value.trim();resetDirection.disabled=working||!defaultDirection;copyDirection.disabled=working||!direction.value.trim();var count=chosen();add.textContent="Add "+count+" "+(count===1?"task":"tasks");add.disabled=working||!count||drafts.some(function(p){return p.tasks.some(function(t){return t.selected&&!p.title.trim()})})||allDraftTasks().some(function(t){return t.selected&&(!t.title.trim()||!t.description.trim()||t.description.length>2200||(t.dueDate&&(t.dueDate<TODAY||t.dueDate>addDays(a.dueDate>TODAY?a.dueDate:TODAY,7))))});}
  [goal,audience,constraints].forEach(function(n){n.oninput=validate});
  back.onclick=function(){results.hidden=true;brief.hidden=false;generate.hidden=false;back.hidden=true;add.hidden=true;goal.focus()};
  function busy(value){working=value;overlayState.busy=value;ui.close.disabled=value;ui.cancel.disabled=value;ui.body.querySelectorAll("input,textarea,select,button").forEach(function(n){n.disabled=value});back.disabled=value;validate()}
  function drawPlan(){
    clear(results);results.appendChild(el("p","ai-plan-summary",plan.summary));
    var contextDetails=el("details","ai-context-used"),contextLabel=el("summary",null,"Context provided to AI ("+(plan.sources||[]).length+" sources)");contextDetails.appendChild(contextLabel);var contextList=el("ul","sop-steps");(plan.sources||[]).forEach(function(source){contextList.appendChild(el("li",null,source.title+" · "+(source.stepCount?source.stepCount+" steps":"video notes")))});contextDetails.appendChild(contextList);results.appendChild(contextDetails);
    if(plan.assumptions.length){var assumptions=el("details"),summary=el("summary",null,"Assumptions to check ("+plan.assumptions.length+")");assumptions.appendChild(summary);var list=el("ul","sop-steps");plan.assumptions.forEach(function(s){list.appendChild(el("li",null,s))});assumptions.appendChild(list);results.appendChild(assumptions)}
    results.appendChild(el("p","hint",drafts.length?"Tasks based on your work are selected. New suggestions are optional. Check the source and reason, edit as needed, then add only what helps.":"No missing tasks found. Your existing checklist is kept; AI does not need to add work just to fill a list."));
    var taskIndex=0;drafts.forEach(function(phase,i){var section=el("section","ai-phase"),title=input("text",phase.title);title.maxLength=100;title.className="ai-phase-title";title.setAttribute("aria-label","Phase name "+(i+1));title.oninput=function(){phase.title=title.value;validate()};section.appendChild(title);section.appendChild(el("p","hint",phase.why));
      function drawTask(task,depth,ancestors){var index=++taskIndex,card=el("div","ai-step"),check=input("checkbox","");card.style.marginLeft=(depth*20)+"px";check.checked=task.selected;check.setAttribute("aria-label","Include "+task.title);check.onchange=function(){function select(t,value){t.selected=value;(t.children||[]).forEach(function(c){select(c,value)})}select(task,check.checked);if(check.checked)ancestors.forEach(function(parent){parent.selected=true});drawPlan()};card.appendChild(check);
        var content=el("div","ai-step-content"),name=input("text",task.title);name.maxLength=180;name.setAttribute("aria-label","Suggested task title "+index);name.oninput=function(){task.title=name.value;validate()};content.appendChild(name);
        var basis=task.basis||{sourceIds:[],reason:"New suggestion"},sourceNames=(basis.sources||[]).map(function(source){return source.title});content.appendChild(el("p","ai-task-basis"+(sourceNames.length?"":" is-new"),sourceNames.length?"Based on: "+sourceNames.join(" · "):"New suggestion · Optional"));content.appendChild(el("p","hint",basis.reason));
        var instructions=el("details","ai-task-instructions"),instructionsSummary=el("summary",null,"Direction & draft copy"),description=el("textarea");description.rows=6;description.maxLength=2200;description.value=task.description;description.setAttribute("aria-label","Instructions for task "+index);description.oninput=function(){task.description=description.value;validate()};instructions.appendChild(instructionsSummary);instructions.appendChild(description);content.appendChild(instructions);
        var due=input("date",task.dueDate);due.min=TODAY;due.max=addDays(a.dueDate>TODAY?a.dueDate:TODAY,7);due.setAttribute("aria-label","Due date for task "+index);content.appendChild(field("Task deadline (inherits when blank)",due));due.oninput=function(){task.dueDate=due.value;validate()};card.appendChild(content);section.appendChild(card);(task.children||[]).forEach(function(child){drawTask(child,depth+1,ancestors.concat(task))});
      }phase.tasks.forEach(function(task){drawTask(task,0,[])});results.appendChild(section);
    });results.hidden=false;brief.hidden=true;generate.hidden=true;back.hidden=false;add.hidden=false;validate();
  }
  generate.onclick=function(){
    validate();if(generate.disabled)return;ui.error.hidden=true;busy(true);generate.textContent="Planning video tasks…";status.textContent="Reviewing the video and its existing checklist…";
    var current=S.activities.find(function(n){return n.id===a.id});if(!current){busy(false);ui.error.textContent="This activity no longer exists.";ui.error.hidden=false;return}
    wq.then(function(){var latest=S.activities.find(function(n){return n.id===a.id});if(!latest)throw new Error("This activity no longer exists.");return aiRequest("POST",aiWorkRequest(latest,referenceIds,sopIds,values(),direction.value.trim(),targetId))}).then(function(data){plan=data.plan;function draftTask(t){var basis=Object.assign({sourceIds:[],reason:"New suggestion"},t.basis);basis.sources=(plan.sources||[]).filter(function(source){return basis.sourceIds.indexOf(source.id)>=0});var children=(t.children||[]).map(draftTask);return Object.assign({},t,{basis:basis,children:children,selected:basis.sources.length>0||children.some(function(c){return c.selected})})}drafts=plan.phases.map(function(p){return {title:p.title,why:p.why,tasks:p.tasks.map(draftTask)}});planId=sid();status.textContent="Draft from "+data.model+((plan.sources||[]).length?" · Using the supplied saved work":" · No saved sources; new suggestions only");drawPlan()}).catch(function(e){status.textContent="Your checklist is unchanged.";ui.error.textContent=e.message||"AI could not suggest tasks. Please try again.";ui.error.hidden=false}).finally(function(){busy(false);generate.textContent="Suggest phases & tasks"});
  };
  add.onclick=function(){
    validate();if(add.disabled)return;ui.error.hidden=true;busy(true);function selection(tasks){return tasks.filter(function(t){return t.selected}).map(function(t){return Object.assign({},t,{children:selection(t.children||[])})})}var selected=drafts.map(function(p){return {title:p.title.trim(),why:p.why,tasks:selection(p.tasks)}}).filter(function(p){return p.tasks.length});
    saveAiChecklist(a,selected,planId,values(),targetId).then(function(result){busy(false);closeOverlay(true);if(onSaved)onSaved();render();toast(result.added?result.added+" tasks added to this video":"Those tasks are already in the checklist")}).catch(function(e){busy(false);ui.error.textContent=e.message||msgFor(e);ui.error.hidden=false});
  };
  var initialBrief=JSON.stringify(values());drawSources();validate();overlay(ui.node,function(){return !!plan||sourcesTouched||JSON.stringify(values())!==initialBrief||(directionTouched&&direction.value.trim()!==(persistedDirection||defaultDirection).trim())},true);
  aiRequest("GET").then(function(data){ready=data.configured;defaultDirection=data.directionPrompt||"";if(!directionTouched&&!persistedDirection)direction.value=defaultDirection;status.textContent=ready?"Gemini is ready · From scene direction to distribution":"AI setup needed: add GEMINI_API_KEY in Vercel → Settings → Environment Variables (Production), then redeploy. Your key stays on the server.";if(!ready){var link=el("a",null,"Open Vercel AI setup");link.href="https://vercel.com/ashutosh-mishra-5049s-projects/contentcalendar/settings/environment-variables";link.target="_blank";link.rel="noopener noreferrer";status.appendChild(document.createTextNode(" "));status.appendChild(link)}validate()}).catch(function(e){status.textContent=e.message;validate()});
}
function openCampaign(c,afterCreate){
  if(!writable())return;
  var isNew=!c;
  var d={name:c?c.name:"",goal:c?(c.goal||""):"",startDate:c?c.startDate:TODAY,
    endDate:c?c.endDate:addDays(TODAY,14),owner:c?(c.owner||""):((S.me&&S.me.id)||""),status:c?c.status:"Planning"};
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
  var save=el("button","btn btn-p sp",isNew?"Create campaign":"Save changes"),saving=false;
  if(!isNew&&canDeleteTasks()){
    var n=S.activities.filter(function(a){return a.campaignId===c.id}).length;
    var del=el("button","btn btn-d","Delete"),crow=null;
    del.onclick=function(){
      if(crow)return;
      crow=el("div");crow.style.cssText="display:flex;gap:8px;align-items:center;width:100%;flex-wrap:wrap";
      crow.appendChild(el("span","hint err",n?"Delete this campaign and its "+n+(n===1?" activity?":" activities?"):"Delete this campaign?"));
      var yes=el("button","btn btn-d","Delete");yes.style.marginLeft="auto";
      yes.onclick=function(){
        if(!canDeleteTasks()){err.hidden=false;err.textContent=msgFor({code:"permission-denied"});return}
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
    save.disabled=saving||!(d.name.trim()&&d.startDate&&d.endDate)||bad;
    requiredNote.textContent=save.disabled?"Add a campaign name and valid dates to continue.":isNew?"Next: add activities to your campaign.":"Changes apply to this campaign.";
    return !save.disabled;
  }
  function submit(){
    if(!validate())return;
    saving=true;var editingState=overlayState;editingState.busy=true;
    save.disabled=true;save.textContent="Saving…";err.hidden=true;
    var payload={name:d.name.trim(),goal:d.goal.trim(),startDate:d.startDate,endDate:d.endDate,
      owner:d.owner,status:d.status};
    var done=function(ref){
      editingState.busy=false;
      closeOverlay(true);
      if(isNew){
        var created=Object.assign({id:ref.id},payload);
        if(!campById(ref.id)){S.campaigns.push(created);sortCampaigns()}
        if(afterCreate){afterCreate(created);return}
        S.view="campaigns";S.query="";resetFilterValues();S.expanded["c"+ref.id]=true;S.focusAdd="c"+ref.id;render();
      }
      toast(isNew?"Campaign created. Add your first video or activity below.":"Campaign updated");
    };
    var fail=function(e){saving=false;editingState.busy=false;err.hidden=false;err.textContent=msgFor(e);validate();save.textContent=isNew?"Create campaign":"Save changes"};
    if(isNew){
      payload.colour=CCOLORS[S.campaigns.length%CCOLORS.length];
      payload.createdAt=new Date().toISOString();
      db.collection("campaigns").add(payload).then(done).catch(fail);
    }else{
      db.doc("campaigns/"+c.id).update(payload).then(done).catch(fail);
    }
  }
  validate();keyboardSave(m,save);
  overlay(m,function(){return JSON.stringify(d)!==initial});
}

/* ─── shell wiring ──────────────────────────────────────── */
var now=new Date();S.y=now.getFullYear();S.m=now.getMonth();S.anchor=TODAY;
function setPhone(){var was=phone;phone=window.matchMedia("(max-width:720px)").matches;S.dayMax=phone?99:3;return was!==phone}
setPhone();
window.addEventListener("resize",function(){if(setPhone())render()});

function step(n){
  if(S.calView==="next7"||S.calView==="week"){S.anchor=addDays(weekStart(S.anchor||TODAY),n*7);S.focusDay=""}
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
  S.loading=true;S.err=null;S.sopReady=false;S.sopRules=[];pending=8;S.weeklyPlan=null;S.weeklyPlanReady=false;S.weeklyPlanError="";S.contentOptionsReady=false;S.contentOptionsError="";render();
  S.templates=[];S.templatesLoading=true;S.templateError="";
  S.members=[];S.userRoster=[];S.ownerAliases={};S.membersReady=false;S.teamError="";
  var waiting={campaigns:true,activities:true,users:true,teamMembers:true,contentOptions:true,weeklyPlanner:true,sopRules:true,subtaskTemplates:true};
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
    var mine=S.me&&snap.docs.find(function(d){return d.id===S.me.id});S.aiPlanning=mine?(mine.data().aiPlanning||{}):{};
    S.userRoster=snap.docs.map(function(d){var v=d.data()||{};return {id:d.id,name:v.name||v.email||"Teammate",email:v.email||""}});rebuildTeamDirectory();
    received("users",snap);render();
  },function(){received("users")}));
  subs.push(db.collection("teamMembers").onSnapshot({includeMetadataChanges:true},function(snap){S.members=snap.docs.map(function(d){return Object.assign({},d.data(),{id:d.id})});S.membersReady=true;S.teamError="";rebuildTeamDirectory();received("teamMembers",snap);render()},function(e){S.membersReady=false;S.teamError="The team directory could not load. Reload to try again.";received("teamMembers");render()}));
  subs.push(db.doc("workspaceSettings/weeklyPlanner").onSnapshot({includeMetadataChanges:true},function(snap){try{var plan=snap.exists?snap.data():defaultWeeklyPlan();validateWeeklyPlan(plan);S.weeklyPlan=plan;S.weeklyPlanReady=true;S.weeklyPlanError=""}catch(e){S.weeklyPlanReady=false;S.weeklyPlanError="The weekly content plan could not load. Reload to try again."}received("weeklyPlanner",snap);render()},function(){S.weeklyPlanReady=false;S.weeklyPlanError="The weekly content plan could not load. Reload to try again.";received("weeklyPlanner");render()}));
  subs.push(db.doc("workspaceSettings/contentOptions").onSnapshot({includeMetadataChanges:true},function(snap){var options=snap.exists?snap.data():defaultContentOptions();try{validateContentOptions(options);setContentOptions(options);S.contentOptionsReady=true;S.contentOptionsError=""}catch(e){S.contentOptionsReady=false;S.contentOptionsError="Content options could not load. Reopen the app to try again."}received("contentOptions",snap);render()},function(){S.contentOptionsReady=false;S.contentOptionsError="Content options could not load. Reload to try again.";received("contentOptions");render()}));
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
      if(q)list=list.filter(function(p){return [p.name,p.email,p.role].join(" ").toLowerCase().indexOf(q)>=0});
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
  var options=el("button","account-signout","Content options");options.onclick=function(){closeAccount();openContentOptions()};menu.appendChild(options);
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
      S.me=null;S.aiPlanning={};S.weeklyPlan=null;S.weeklyPlanReady=false;S.weeklyPlanError="";S.cadenceExpanded={};S.campaigns=[];S.activities=[];S.team=[];S.userRoster=[];S.members=[];S.ownerAliases={};S.workCollapsed={};S.membersReady=false;S.contentOptionsReady=false;setContentOptions(defaultContentOptions());S.templates=[];S.templateError="";S.templatesLoading=true;S.sopRules=[];S.sopReady=false;S.loading=true;
      render();showGate("signin");return;
    }
    if(!emailAllowed(u.email)){S.me=null;render();showGate("denied",u.email);return;}
    $("gate").hidden=true;
    document.querySelector(".topbar").inert=false;$("workspace").inert=false;
    S.me={id:u.uid,name:u.displayName||u.email,email:u.email};S.aiPlanning={};S.workScope="my";restoreWorkFolds();
    S.canWrite=true;
    U=makeUser();
    db.collection("users").doc(u.uid).set({
      name:u.displayName||"",email:u.email||"",seenAt:new Date().toISOString()
    },{merge:true}).catch(function(){});
    startData();
  });
})();
})();
