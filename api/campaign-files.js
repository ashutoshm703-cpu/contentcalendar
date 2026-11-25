'use strict';
const {Readable}=require('node:stream');
const {get,del}=require('@vercel/blob');
const {handleUpload}=require('@vercel/blob/client');
const R=require('../lib/campaign-resources.js');
const FIREBASE_KEY='AIzaSyAlE7Olc49cSQoJG3AzscE84yn9ZYnhxVk';
const BASE='https://firestore.googleapis.com/v1/projects/nprep-content-calendar/databases/(default)/documents';
const recent=new Map();
const fail=(status,message)=>Object.assign(new Error(message),{status});
function decode(v){if(!v)return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('booleanValue'in v)return v.booleanValue;if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)]));return null}
async function identity(req){
  const bearer=(req.headers.authorization||'').match(/^Bearer ([A-Za-z0-9_.-]{1,8192})$/);if(!bearer)throw fail(401,'Sign in again to access campaign files.');
  const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FIREBASE_KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:bearer[1]}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw fail(401,'Your session expired. Sign in again.');const account=(await response.json()).users?.[0];
  if(!account?.emailVerified||account.disabled||!account.email?.toLowerCase().endsWith('@nprep.in')||!R.id(account.localId))throw fail(403,'Campaign files are available to verified NPrep accounts.');return {uid:account.localId,email:account.email.toLowerCase(),token:bearer[1]};
}
async function firestore(url,user,body){const response=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});if(response.status===404)throw fail(404,'This campaign no longer exists.');if(!response.ok)throw fail(response.status===403?403:503,'Could not access this campaign. Please try again.');return response.json()}
async function campaign(id,user){if(!R.id(id))throw fail(400,'Choose a valid campaign.');const document=await firestore(BASE+'/campaigns/'+id,user);return Object.fromEntries(Object.entries(document.fields||{}).map(([k,v])=>[k,decode(v)]))}
function uploadData(raw,user,pathname){let data;try{if(typeof raw!=='string'||raw.length>3000)throw new Error();data=JSON.parse(raw)}catch(e){throw fail(400,'Choose the file again.')}
  if(!R.id(data.campaignId)||!R.id(data.resourceId)||typeof data.name!=='string'||data.name.length>180)throw fail(400,'This upload is invalid.');R.validateFile({name:data.name,size:data.size});if(pathname!==R.filePath(user.uid,data.resourceId,data.name))throw fail(403,'The upload path is invalid.');return data;
}
function limit(uid){const now=Date.now();for(const [id,entry]of recent)if(now-entry.start>60000)recent.delete(id);const entry=recent.get(uid)||{start:now,count:0};if(++entry.count>30)throw fail(429,'Please wait a minute before uploading more files.');recent.set(uid,entry)}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return res.status(405).json({error:'Method not allowed.'})}
  try{
    const user=await identity(req),query=req.query||{};
    if(req.method==='GET'&&query.action==='status')return res.status(200).json({configured:!!process.env.BLOB_READ_WRITE_TOKEN,maxBytes:R.MAX_BYTES});
    if(!process.env.BLOB_READ_WRITE_TOKEN)throw fail(503,'File uploads are not available yet. You can still add links.');
    if(req.method==='POST'){
      if(!req.body||req.body.type!=='blob.generate-client-token'||typeof req.body.payload?.pathname!=='string'||typeof req.body.payload?.clientPayload!=='string')throw fail(400,'Invalid upload request.');
      const result=await handleUpload({request:req,body:req.body,onBeforeGenerateToken:async(pathname,payload)=>{const data=uploadData(payload,user,pathname),c=await campaign(data.campaignId,user);if(R.list(c).length>=R.MAX_RESOURCES)throw fail(400,'This campaign already has 100 resources. Remove one before adding another.');limit(user.uid);return {maximumSizeInBytes:R.MAX_BYTES,validUntil:Date.now()+10*60*1000,addRandomSuffix:false,allowOverwrite:false,tokenPayload:JSON.stringify({uid:user.uid,campaignId:data.campaignId,resourceId:data.resourceId})}}});return res.status(200).json(result);
    }
    if(req.method==='DELETE'){
      const data=req.body||{},isAdmin=user.uid==='XPLO57VwLWZnXGaI2uJzVL4qx6t2'&&user.email==='ashutosh_mishra@nprep.in';
      if(!R.id(data.addedBy)||!R.id(data.resourceId)||typeof data.name!=='string'||data.name.length>180||data.path!==R.filePath(data.addedBy,data.resourceId,data.name))throw fail(400,'Invalid file reference.');
      if(data.addedBy!==user.uid&&!isAdmin)return res.status(200).json({retained:true});
      const references=await firestore(BASE+':runQuery',user,{structuredQuery:{from:[{collectionId:'campaigns'}],select:{fields:[{fieldPath:'__name__'}]},where:{fieldFilter:{field:{fieldPath:'resourcePaths'},op:'ARRAY_CONTAINS',value:{stringValue:data.path}}},limit:1}});
      if(references.some(row=>row.document))return res.status(200).json({retained:true});await del(data.path);return res.status(200).json({removed:true});
    }
    const c=await campaign(query.campaignId,user),resource=R.list(c).find(item=>item.id===query.resourceId&&item.kind==='file');if(!resource)throw fail(404,'This file is no longer attached to the campaign.');
    const result=await get(resource.path,{access:'private',useCache:false});if(!result||result.statusCode!==200||!result.stream)throw fail(404,'This file could not be found.');if(result.blob.size>R.MAX_BYTES)throw fail(400,'This file is too large to download here.');
    res.status(200);res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Disposition',"attachment; filename=campaign-file; filename*=UTF-8''"+encodeURIComponent(resource.name));
    await new Promise((resolve,reject)=>{const stream=Readable.fromWeb(result.stream);stream.once('error',reject);res.once('finish',resolve);res.once('close',()=>{stream.destroy();resolve()});stream.pipe(res)});
  }catch(e){if(res.headersSent){res.destroy();return}return res.status(e.status||(e.userMessage?400:503)).json({error:e.status?e.message:e.userMessage||'Could not access file storage. Please try again.'})}
};
module.exports._test={decode,identity,uploadData,recent};
