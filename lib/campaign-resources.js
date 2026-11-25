(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CampaignResourceUtils=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  var MAX_BYTES=25*1024*1024,MAX_RESOURCES=100;
  function error(message){return Object.assign(new Error(message),{userMessage:message})}
  function id(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,150}$/.test(value)}
  function cleanName(value){return String(value||'').trim().slice(0,180)}
  function link(raw,name){
    var text=String(raw||'').trim();if(!text||text.length>2048)throw error('Paste a valid link to continue.');
    if(!/^[a-z][a-z0-9+.-]*:/i.test(text))text='https://'+text;
    var url;try{url=new URL(text)}catch(e){throw error('Paste a valid link to continue.')}
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname.includes('.'))throw error('Use a web link starting with https:// or http://.');
    var label='Link';if(url.hostname==='docs.google.com'){if(url.pathname.indexOf('/spreadsheets/')===0)label='Google Sheets';else if(url.pathname.indexOf('/document/')===0)label='Google Docs';else if(url.pathname.indexOf('/presentation/')===0)label='Google Slides';else label='Google Drive'}else if(url.hostname==='drive.google.com')label='Google Drive';
    return {kind:'link',name:cleanName(name)||label,url:url.href,label:label};
  }
  function safeFileName(name){return String(name||'file').split(/[\\/]/).pop().replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120).replace(/^\.+/,'')||'file'}
  function filePath(uid,resourceId,name){if(!id(uid)||!id(resourceId))throw error('This upload is invalid. Please choose the file again.');return 'campaign-files/'+uid+'/'+resourceId+'/'+safeFileName(name)}
  function validateFile(file){if(!file||!cleanName(file.name)||!Number.isInteger(file.size)||file.size<1)throw error('Choose a file that is not empty.');if(file.size>MAX_BYTES)throw error('Files can be up to 25 MB each. For larger files, add a Drive link.');return true}
  function validRecord(item){
    if(!item||!id(item.id)||typeof item.name!=='string'||!cleanName(item.name)||item.name.length>180||!id(item.addedBy)||typeof item.createdAt!=='string')return false;
    if(item.kind==='link'){try{return link(item.url,item.name).url===item.url}catch(e){return false}}
    return item.kind==='file'&&Number.isInteger(item.size)&&item.size>0&&item.size<=MAX_BYTES&&typeof item.path==='string'&&item.path===filePath(item.addedBy,item.id,item.name)&&typeof item.contentType==='string'&&item.contentType.length<=150;
  }
  function list(campaign){return Array.isArray(campaign&&campaign.resources)?campaign.resources.filter(validRecord):[]}
  function paths(resources){return resources.filter(function(r){return r.kind==='file'}).map(function(r){return r.path})}
  function formatBytes(n){return n>=1024*1024?(n/(1024*1024)).toFixed(n%(1024*1024)?1:0)+' MB':Math.ceil(n/1024)+' KB'}
  return {MAX_BYTES:MAX_BYTES,MAX_RESOURCES:MAX_RESOURCES,error:error,id:id,cleanName:cleanName,link:link,filePath:filePath,validateFile:validateFile,validRecord:validRecord,list:list,paths:paths,formatBytes:formatBytes};
});
