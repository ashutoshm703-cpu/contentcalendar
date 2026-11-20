'use strict';
const { DEFAULT_DIRECTION, systemInstruction } = require('../lib/ai-direction.cjs');

// Only this server function can access GEMINI_API_KEY. No browser key storage.
const FIREBASE_KEY = 'AIzaSyAlE7Olc49cSQoJG3AzscE84yn9ZYnhxVk';
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const recent = new Map(); // Best-effort per-instance burst protection; Google also enforces project quotas.
const platforms = ['YouTube','Instagram','Facebook','WhatsApp','Telegram','Push','App'];
const formats = ['Reel','Carousel','Story','Long form','Live','Short','Post','Push notification','WhatsApp broadcast','Telegram post','Email','Thumbnail','Other'];
const str = (v,max=500) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const fail = (status,message) => Object.assign(new Error(message),{status});
function date(v) { const time=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?Date.parse(v+'T00:00:00Z'):NaN;return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===v; }
const addDays=(v,n)=>new Date(Date.parse(v+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
function cleanSteps(value,limit,maxChars){let remaining=maxChars;const out=[];for(const n of (Array.isArray(value)?value:[]).slice(0,limit)){
  if(!n||!str(n.title,180))continue;const row={id:str(n.id,150),title:str(n.title,180),phase:str(n.phase,180),description:str(n.description,400),platform:platforms.includes(n.platform)?n.platform:'',kind:str(n.kind,60),done:n.done===true,due:date(n.due)?n.due:''},size=JSON.stringify(row).length;
  if(size>remaining)break;remaining-=size;out.push(row);
}return out}
function brief(body) {
  if(!body || typeof body!=='object' || Array.isArray(body)) throw fail(400,'Add a video brief to continue.');
  const a=body.activity||{}, b=body.brief||{};
  if(body.directionPrompt!==undefined&&(typeof body.directionPrompt!=='string'||body.directionPrompt.length>6000))throw fail(400,'Keep the AI system prompt within 6,000 characters.');
  if(!str(a.title)||!str(b.goal)||!str(b.audience)) throw fail(400,'Add a video title, goal and audience.');
  if(!date(a.dueDate)) throw fail(400,'The video needs a valid due date.');
  if(a.status==='Published')throw fail(400,'This video is already published. Reopen it before adding production tasks.');
  const today=date(body.today)?body.today:new Date().toISOString().slice(0,10);
  return {
    activity:{title:str(a.title,160),type:formats.includes(a.type)?a.type:'Other',angle:str(a.angle,100),platforms:(Array.isArray(a.platforms)?a.platforms:[]).filter(p=>platforms.includes(p)).slice(0,7),dueDate:a.dueDate,description:str(a.description,1000),campaign:{name:str(a.campaign?.name,160),goal:str(a.campaign?.goal,600)}},
    brief:{goal:str(b.goal,1000),audience:str(b.audience,600),constraints:str(b.constraints,1000)},
    directionPrompt:str(body.directionPrompt,6000)||DEFAULT_DIRECTION,
    today,latestDate:addDays(a.dueDate<today?today:a.dueDate,7),
    existing:cleanSteps(body.existing,100,12000),
    references:(Array.isArray(body.references)?body.references:[]).slice(0,3).filter(r=>r&&/^work:[\w-]{1,150}$/.test(r.id||'')).map(r=>({id:r.id,title:str(r.title,160),type:formats.includes(r.type)?r.type:'Other',platforms:(Array.isArray(r.platforms)?r.platforms:[]).filter(p=>platforms.includes(p)).slice(0,7),angle:str(r.angle,100),description:str(r.description,600),status:str(r.status,40),steps:cleanSteps(r.steps,30,4500)})).filter(r=>r.steps.length),
    sops:(Array.isArray(body.sops)?body.sops:[]).slice(0,3).filter(s=>s&&/^sop:[\w-]{1,150}$/.test(s.id||'')).map(s=>({id:s.id,name:str(s.name,100),conditions:(Array.isArray(s.conditions)?s.conditions:[s]).slice(0,20).map(c=>({platform:str(c.platform,40),format:str(c.format,50),angle:str(c.angle,100)})),steps:cleanSteps(s.steps,40,6000)})).filter(s=>s.steps.length)
  };
}
const schema={type:'object',properties:{
  summary:{type:'string'},assumptions:{type:'array',items:{type:'string'},maxItems:5},
  phases:{type:'array',items:{type:'object',properties:{
    title:{type:'string'},why:{type:'string'},tasks:{type:'array',items:{type:'object',properties:{title:{type:'string'},description:{type:'string'},dueDate:{type:'string'},sourceId:{type:'string'},reason:{type:'string'}},required:['title','description','dueDate','sourceId','reason'],additionalProperties:false}}
  },required:['title','why','tasks'],additionalProperties:false}}
},required:['summary','assumptions','phases'],additionalProperties:false};
function validatePlan(raw,context) {
  if(!raw||!Array.isArray(raw.phases)||raw.phases.length>6||!str(raw.summary,1200)) throw fail(502,'Gemini returned an incomplete checklist. Please try again.');
  const seen=new Set(context.existing.map(n=>n.title.trim().toLowerCase())),phaseNames=new Set(),sources=[...(context.existing.length||context.activity.description?[{id:'current',title:context.activity.title,kind:'current',stepCount:context.existing.length}]:[]),...(context.references||[]).map(r=>({id:r.id,title:r.title,kind:'activity',stepCount:r.steps.length})),...(context.sops||[]).map(s=>({id:s.id,title:s.name,kind:'sop',stepCount:s.steps.length}))],sourceIds=new Set(sources.map(s=>s.id));
  let total=0;const phases=raw.phases.map(p=>{
    if(!p||!str(p.title,100)||!str(p.why)||!Array.isArray(p.tasks)||p.tasks.length>10||!p.tasks.length)throw fail(502,'Gemini returned an invalid phase. Please try again.');
    const name=str(p.title,100).toLowerCase();if(phaseNames.has(name))throw fail(502,'Gemini returned repeated phases. Please try again.');phaseNames.add(name);
    return {title:str(p.title,100),why:str(p.why,600),tasks:p.tasks.map(t=>{
      if(!t||!str(t.title,180)||!str(t.description)||typeof t.dueDate!=='string'||(t.dueDate&&(!date(t.dueDate)||t.dueDate<context.today||t.dueDate>context.latestDate)))throw fail(502,'Gemini returned invalid tasks or dates. Please try again.');
      if(typeof t.description!=='string'||t.description.length>2200||++total>20)throw fail(502,'Gemini returned too much detail for one checklist. Please try again.');
      if(typeof t.sourceId!=='string'||(t.sourceId&&!sourceIds.has(t.sourceId))||!str(t.reason,500))throw fail(502,'Gemini could not explain a suggestion using the supplied work. Please try again.');
      return {title:str(t.title,180),description:str(t.description,2200),dueDate:t.dueDate,basis:{sourceIds:t.sourceId?[t.sourceId]:[],reason:str(t.reason,500)}};
    }).filter(t=>{const key=t.title.toLowerCase();if(seen.has(key))return false;seen.add(key);return true})};
  }).filter(p=>p.tasks.length);
  return {summary:str(raw.summary,1200),assumptions:(Array.isArray(raw.assumptions)?raw.assumptions:[]).map(s=>str(s,400)).filter(Boolean).slice(0,5),phases,sources};
}
function outputText(data) {
  return (data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('');
}
function providerFailure(status,data) {
  const error=data?.error||{},message=String(error.message||''),code=/^[A-Z_]+$/.test(error.status||'')?error.status:'UNKNOWN';
  const reasons=(Array.isArray(error.details)?error.details:[]).map(d=>String(d.reason||'')).filter(r=>/^[A-Z_]+$/.test(r));
  console.warn(JSON.stringify({event:'gemini_request_failed',httpStatus:status,code,reasons}));
  if(status===429)return fail(429,'Gemini quota is currently exhausted. Try again later; no fallback model was used.');
  if(reasons.includes('API_KEY_INVALID')||/api key (not valid|invalid|expired)/i.test(message))return fail(503,'Google rejected the API key. Replace GEMINI_API_KEY in Vercel with the API key value from Google AI Studio, then redeploy.');
  if(status===401||status===403)return fail(503,'The Gemini key is not authorised. Check its API restrictions and model access in Google AI Studio.');
  if(status===404)return fail(503,'The configured Gemini model is unavailable to this project. Check GEMINI_MODEL and model access in Vercel / Google AI Studio.');
  if(status===400)return fail(502,'Gemini rejected the request settings (400 '+code+'). This needs an integration check; your checklist is unchanged.');
  return fail(502,'Gemini is unavailable right now ('+status+' '+code+'). Your checklist is unchanged.');
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'})}
  try {
    const token=(req.headers.authorization||'').match(/^Bearer ([A-Za-z0-9_.-]+)$/);
    if(!token||token[1].length>8192) throw fail(401,'Sign in with your NPrep account to use AI planning.');
    const authResponse=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token[1]}),signal:AbortSignal.timeout(8000)});
    if(!authResponse.ok) throw fail(401,'Your session has expired. Sign in again.');
    const account=(await authResponse.json()).users?.[0];
    if(!account?.emailVerified||account.disabled||!account.email?.toLowerCase().endsWith('@nprep.in')) throw fail(403,'AI planning is available to verified NPrep accounts.');
    if(req.method==='GET') return res.status(200).json({configured:!!process.env.GEMINI_API_KEY,model:MODEL(),directionPrompt:DEFAULT_DIRECTION});
    if(!process.env.GEMINI_API_KEY) throw fail(503,'AI planning needs setup: add GEMINI_API_KEY in Vercel production settings, then redeploy.');
    if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) throw fail(415,'Send a JSON video brief.');
    if(Number(req.headers['content-length'])>256000) throw fail(413,'This brief is too long. Shorten it and try again.');
    let body=req.body;if(typeof body==='string'){if(Buffer.byteLength(body)>256000)throw fail(413,'This brief is too long.');try{body=JSON.parse(body)}catch{throw fail(400,'The video brief could not be read.')}}
    if(Buffer.byteLength(JSON.stringify(body)||'')>256000)throw fail(413,'This brief is too long. Shorten it and try again.');
    const context=brief(body);
    const now=Date.now(),key=account.localId;
    for(const [id,time] of recent)if(now-time>60000)recent.delete(id);
    if(recent.has(key)&&now-recent.get(key)<15000)throw fail(429,'Please wait 15 seconds before drafting another plan.');
    recent.set(key,now);
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(MODEL())+':generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY.trim()},signal:AbortSignal.timeout(45000),
      body:JSON.stringify({systemInstruction:{parts:[{text:systemInstruction(context)}]},contents:[{role:'user',parts:[{text:JSON.stringify(context)}]}],generationConfig:{maxOutputTokens:7000,thinkingConfig:{thinkingLevel:'LOW'},responseMimeType:'application/json',responseJsonSchema:schema}})
    });
    if(!response.ok){let detail;try{detail=await response.json()}catch{}throw providerFailure(response.status,detail)}
    const data=await response.json();if(data.candidates?.[0]?.finishReason&&data.candidates[0].finishReason!=='STOP')throw fail(502,'Gemini did not finish the checklist. Try again with a shorter brief.');
    let raw;try{raw=JSON.parse(outputText(data))}catch{throw fail(502,'Gemini returned an unreadable checklist. Please try again.')}
    return res.status(200).json({model:MODEL(),plan:validatePlan(raw,context)});
  }catch(e){if(!e.status)console.warn(JSON.stringify({event:'ai_connection_failed',name:e.name||'Error',code:e.cause?.code||e.code||'UNKNOWN'}));return res.status(e.status||504).json({error:e.status?e.message:'AI planning timed out or could not connect. Your checklist has not changed. Please try again.'})}
};
module.exports._test={brief,validatePlan,outputText,providerFailure,recent};
