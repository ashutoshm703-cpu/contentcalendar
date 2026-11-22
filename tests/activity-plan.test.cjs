const assert=require('node:assert/strict');
const handler=require('../api/activity-plan.js');
const {DEFAULT_DIRECTION,systemInstruction}=require('../lib/ai-direction.cjs');
const {brief,validatePlan,outputText,recent}=handler._test;
const request={activity:{title:'Nursing Story 1',type:'Reel',platforms:['Instagram'],angle:'Motivational',dueDate:'2026-11-28',status:'Not started'},today:'2026-11-20',brief:{goal:'Motivate aspirants through a nursing story',audience:'Working nursing aspirants'},existing:[],sops:[]};
const plan={summary:'Prepare the story, produce the reel, and check the response.',assumptions:['Confirm participant consent.'],phases:[{title:'Pre-production',why:'Prepare a clear, accurate story.',tasks:[{title:'Confirm story consent',description:'Get approval to use the interview.',dueDate:'2026-11-24',sourceId:'',reason:'Consent is needed before using a participant interview.'}]}]};
const reply=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
async function invoke(options={}){let status=200,payload;const headers={};await handler({method:options.method||'POST',headers:{authorization:'Bearer test.token.signature','content-type':'application/json',...options.headers},body:options.body===undefined?request:options.body},{setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(v){payload=v;return this}});return {status,payload,headers}}
(async()=>{
const originalFetch=global.fetch,originalKey=process.env.GEMINI_API_KEY;
try{
  let calls=[];process.env.GEMINI_API_KEY='SERVER-ONLY-TEST-KEY';
  global.fetch=async(url,options)=>{calls.push({url,options});return url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(200,{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(plan)}]}}]})};
  assert.equal((await invoke({headers:{authorization:''}})).status,401);assert.equal(calls.length,0);
  global.fetch=async()=>reply(200,{users:[{localId:'u1',email:'owner@outside.in',emailVerified:true}]});assert.equal((await invoke()).status,403);
  global.fetch=async()=>reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:false}]});assert.equal((await invoke()).status,403);
  global.fetch=async(url,options)=>{calls.push({url,options});return url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(200,{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(plan)}]}}]})};
  delete process.env.GEMINI_API_KEY;const config=await invoke({method:'GET'});assert.equal(config.payload.configured,false);assert.equal(config.payload.directionPrompt,DEFAULT_DIRECTION);assert.equal((await invoke()).status,503);
  process.env.GEMINI_API_KEY='SERVER-ONLY-TEST-KEY';calls=[];const success=await invoke();assert.equal(success.status,200);assert.equal(success.payload.plan.phases.length,1);assert.equal(JSON.stringify(success).includes('SERVER-ONLY'),false);
  assert.equal(calls[0].url.includes('accounts:lookup'),true);const upstream=calls[1];assert.equal(upstream.options.headers['x-goog-api-key'],'SERVER-ONLY-TEST-KEY');assert.equal(JSON.parse(upstream.options.body).generationConfig.responseMimeType,'application/json');
  const sent=JSON.parse(upstream.options.body);assert.equal(sent.systemInstruction.parts[0].text.includes(DEFAULT_DIRECTION),true);
  const creative=brief({...request,directionPrompt:'Direct each scene with Hindi dialogue and a retention test.'});assert.equal(systemInstruction(creative).includes('Direct each scene with Hindi dialogue'),true);assert.equal(systemInstruction(creative).includes('Return only JSON'),true);
  assert.equal(brief(request).directionPrompt,DEFAULT_DIRECTION);assert.equal(brief({...request,directionPrompt:'  '}).directionPrompt,DEFAULT_DIRECTION);
  const customOptions=brief({...request,activity:{...request.activity,type:'Practice assessment',formatId:'NASHTA/PreBoard',platforms:['Learning portal'],angle:'Core nursing'}});
  assert.equal(customOptions.activity.type,'Practice assessment');assert.equal(customOptions.activity.platforms[0],'Learning portal');assert.equal(customOptions.activity.angle,'Core nursing');assert.equal(systemInstruction(customOptions).includes('NASHTA/PreBoard is a test/assessment'),true);
  assert.throws(()=>brief({...request,directionPrompt:'x'.repeat(6001)}));assert.throws(()=>brief({...request,directionPrompt:{role:'override'}}));
  const detailed='Scene direction and draft copy. '.repeat(36);const detailedPlan={...plan,phases:[{...plan.phases[0],tasks:[{...plan.phases[0].tasks[0],description:detailed}]}]};assert.equal(validatePlan(detailedPlan,brief(request)).phases[0].tasks[0].description,detailed.trim());
  assert.throws(()=>validatePlan({...plan,phases:[{...plan.phases[0],tasks:[{...plan.phases[0].tasks[0],description:'x'.repeat(2201)}]}]},brief(request)));
  assert.equal((await invoke()).status,429);recent.clear();
  assert.equal((await invoke({body:{...request,brief:{goal:''}}})).status,400);
  assert.equal((await invoke({body:{...request,activity:{...request.activity,dueDate:'2026-99-99'}}})).status,400);
  assert.equal((await invoke({headers:{'content-length':'999999'}})).status,413);
  assert.equal((await invoke({body:{...request,activity:{...request.activity,status:'Published'}}})).status,400);
  global.fetch=async(url)=>url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(429,{error:'SERVER-ONLY-TEST-KEY'});recent.clear();let result=await invoke();assert.equal(result.status,429);assert.equal(JSON.stringify(result).includes('SERVER-ONLY'),false);
  recent.clear();global.fetch=async(url)=>url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(200,{candidates:[{finishReason:'STOP',content:{parts:[{text:'invalid json'}]}}]});assert.equal((await invoke()).status,502);
  const context=brief({...request,brief:{...request.brief,private:'secret'},existing:[{title:'Done',script:'secret'}]});assert.equal(JSON.stringify(context).includes('secret'),false);
  assert.throws(()=>validatePlan({...plan,phases:[{...plan.phases[0],tasks:[{...plan.phases[0].tasks[0],dueDate:'2026-12-25'}]}]},context));
  assert.equal(validatePlan(plan,{...context,existing:[{title:'Confirm story consent'}]}).phases.length,0);assert.equal(validatePlan({...plan,phases:[]},context).phases.length,0);
  const nestedPlan=structuredClone(plan);nestedPlan.phases[0].tasks[0].children=[{title:'Store participant approval',description:'Keep the consent record',dueDate:'',sourceId:'',reason:'This is the approval acceptance criterion.'}];
  assert.equal(validatePlan(nestedPlan,brief(request)).phases[0].tasks[0].children.length,1);
  const targetContext=brief({...request,target:{id:'target',title:'Prepare interview',depth:0,due:'2026-11-27'}});
  assert.equal(targetContext.target.remainingLevels,2);assert.equal(systemInstruction(targetContext).includes('BREAK DOWN ONLY THE SELECTED TASK'),true);
  assert.throws(()=>validatePlan(nestedPlan,targetContext));
  const flatContext=brief({...request,target:{id:'target',title:'Prepare interview',depth:1}});
  assert.equal(validatePlan(plan,flatContext).flat,true);assert.equal(validatePlan(plan,flatContext).targetId,'target');
  assert.throws(()=>brief({...request,target:{id:'target',title:'Prepare interview',depth:2}}));
  assert.throws(()=>brief({...request,target:{id:'target',title:'Prepare interview',depth:0,done:true}}));
  assert.throws(()=>validatePlan({...plan,phases:[{...plan.phases[0],tasks:[{...plan.phases[0].tasks[0],title:'Prepare interview'}]}]},flatContext));
  const workContext=brief({...request,activity:{...request.activity,description:'Use the existing interview only',script:'DO NOT SHARE'},existing:[{title:'Interview cut',phase:'Production',description:'Only use approved interview quotes.',done:true}],references:[{id:'work:previous-video',title:'Nursing Story previous',type:'Reel',platforms:['Instagram'],steps:[{title:'Review subtitles',phase:'Publishing',description:'Creative team checks Hindi spelling before upload.'}]}],sops:[{id:'sop:story',name:'Story SOP',conditions:[{platform:'Instagram',format:'Reel',angle:'Motivational'}],steps:[{title:'Review consent',description:'Store the participant approval before publication.'}]}]});
  assert.equal(workContext.existing[0].description,'Only use approved interview quotes.');assert.equal(workContext.references[0].steps[0].description,'Creative team checks Hindi spelling before upload.');assert.equal(workContext.sops[0].steps[0].title,'Review consent');assert.equal(JSON.stringify(workContext).includes('DO NOT SHARE'),false);
  const grounded={...plan,phases:[{title:'Publishing',why:'Follow saved process',tasks:[{title:'Proofread Hindi captions',description:'Creative team checks spelling before upload.',dueDate:'',sourceId:'work:previous-video',reason:'The previous reel has a creative-team subtitle review; this checklist has none.'}]}]};
  const checked=validatePlan(grounded,workContext);assert.equal(checked.phases[0].tasks[0].basis.sourceIds[0],'work:previous-video');assert.equal(checked.sources.some(s=>s.id==='sop:story'),true);
  assert.throws(()=>validatePlan({...grounded,phases:[{...grounded.phases[0],tasks:[{...grounded.phases[0].tasks[0],sourceId:'work:invented'}]}]},workContext));
  const lots=Array.from({length:400},(_,i)=>({title:'Existing task '+i,description:'x'.repeat(2000),phase:'Production'}));const bounded=brief({...request,existing:lots,references:[{id:'work:one',title:'Example',steps:lots},{id:'work:two',steps:lots},{id:'work:three',steps:lots},{id:'work:four',steps:lots}]});assert.equal(bounded.references.length,3);assert.equal(bounded.existing.length<=100,true);assert.equal(bounded.references.every(r=>JSON.stringify(r.steps).length<4600),true);assert.equal(JSON.stringify(bounded).length<40000,true);
  console.log('PASS: current instructions, relevant saved-video/SOP context, bounded excerpts, honest source validation and valid no-gap outcomes');
  assert.equal(outputText({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'visible'}]}}]}),'visible');
  for(const [status,detail,expected] of [[400,{error:{status:'INVALID_ARGUMENT',details:[{reason:'API_KEY_INVALID'}]}},'API key value'],[400,{error:{status:'INVALID_ARGUMENT'}},'request settings'],[404,{error:{status:'NOT_FOUND'}},'model is unavailable'],[403,{error:{status:'PERMISSION_DENIED'}},'not authorised']]){
    recent.clear();global.fetch=async(url)=>url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(status,detail);
    const rejected=await invoke();assert.equal(rejected.payload.error.includes(expected),true);assert.equal(JSON.stringify(rejected).includes('SERVER-ONLY'),false);
  }
  assert.equal((await invoke({method:'DELETE'})).status,405);
  console.log('PASS: server-only Gemini key, Firebase identity/domain verification, setup state, schema validation, privacy bounds, burst limit, invalid model output, quota errors and request limits');
}finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;recent.clear()}
})().catch(e=>{console.error(e);process.exitCode=1});
