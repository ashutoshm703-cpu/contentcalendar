const assert=require('node:assert/strict');
const handler=require('../api/campaign-plan.js');
const {brief,validatePlan,outputText,recent}=handler._test;
const request={campaign:{name:'NORCET strategy class',startDate:'2026-11-20',endDate:'2026-11-30'},today:'2026-11-20',brief:{goal:'Increase class registrations',audience:'Working nursing aspirants'},existing:[],sops:[]};
const plan={summary:'Test the message, invite learners, and measure registrations.',assumptions:['The class is free. Confirm this.'],activities:[{title:'Test class invitation',type:'WhatsApp broadcast',platforms:['WhatsApp'],dueDate:'2026-11-24',why:'Test whether a working-nurse angle drives registrations.',metric:'Registrations per delivered message',subtasks:['Write two invitation variants','Check registration link']}]};
const reply=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
async function invoke(options={}){let status=200,payload;const headers={};await handler({method:options.method||'POST',headers:{authorization:'Bearer test.token.signature','content-type':'application/json',...options.headers},body:options.body===undefined?request:options.body},{setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(v){payload=v;return this}});return {status,payload,headers}}
(async()=>{
const originalFetch=global.fetch,originalKey=process.env.GEMINI_API_KEY;
try{
  let calls=[];process.env.GEMINI_API_KEY='SERVER-ONLY-TEST-KEY';
  global.fetch=async(url,options)=>{calls.push({url,options});return url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(200,{status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(plan)}]}]})};
  assert.equal((await invoke({headers:{authorization:''}})).status,401);assert.equal(calls.length,0);
  global.fetch=async()=>reply(200,{users:[{localId:'u1',email:'owner@outside.in',emailVerified:true}]});assert.equal((await invoke()).status,403);
  global.fetch=async()=>reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:false}]});assert.equal((await invoke()).status,403);
  global.fetch=async(url,options)=>{calls.push({url,options});return url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(200,{status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(plan)}]}]})};
  delete process.env.GEMINI_API_KEY;assert.equal((await invoke({method:'GET'})).payload.configured,false);assert.equal((await invoke()).status,503);
  process.env.GEMINI_API_KEY='SERVER-ONLY-TEST-KEY';calls=[];const success=await invoke();assert.equal(success.status,200);assert.equal(success.payload.plan.activities.length,1);assert.equal(JSON.stringify(success).includes('SERVER-ONLY'),false);
  assert.equal(calls[0].url.includes('accounts:lookup'),true);const upstream=calls[1];assert.equal(upstream.options.headers['x-goog-api-key'],'SERVER-ONLY-TEST-KEY');assert.equal(JSON.parse(upstream.options.body).response_format.mime_type,'application/json');
  assert.equal((await invoke()).status,429);recent.clear();
  assert.equal((await invoke({body:{...request,brief:{goal:''}}})).status,400);
  assert.equal((await invoke({body:{...request,campaign:{...request.campaign,startDate:'2026-99-99'}}})).status,400);
  assert.equal((await invoke({headers:{'content-length':'99999'}})).status,413);
  assert.equal((await invoke({body:{...request,today:'2027-01-01'}})).status,400);
  global.fetch=async(url)=>url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(429,{error:'SERVER-ONLY-TEST-KEY'});recent.clear();let result=await invoke();assert.equal(result.status,429);assert.equal(JSON.stringify(result).includes('SERVER-ONLY'),false);
  recent.clear();global.fetch=async(url)=>url.includes('identitytoolkit')?reply(200,{users:[{localId:'u1',email:'owner@nprep.in',emailVerified:true}]}):reply(200,{status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'invalid json'}]}]});assert.equal((await invoke()).status,502);
  const context=brief({...request,brief:{...request.brief,private:'secret'},existing:[{title:'Done',script:'secret'}]});assert.equal(JSON.stringify(context).includes('secret'),false);
  assert.throws(()=>validatePlan({...plan,activities:[{...plan.activities[0],dueDate:'2026-12-25'}]},context));assert.throws(()=>validatePlan({...plan,activities:[{...plan.activities[0],type:'Unknown'}]},context));
  assert.throws(()=>validatePlan(plan,{...context,existing:[{title:'Test class invitation'}]}));assert.equal(outputText({steps:[{type:'thought',content:[{type:'text',text:'hidden'}]},{type:'model_output',content:[{type:'text',text:'visible'}]}]}),'visible');
  assert.equal((await invoke({method:'DELETE'})).status,405);
  console.log('PASS: server-only Gemini key, Firebase identity/domain verification, setup state, schema validation, privacy bounds, burst limit, invalid model output, quota errors and request limits');
}finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;recent.clear()}
})().catch(e=>{console.error(e);process.exitCode=1});
