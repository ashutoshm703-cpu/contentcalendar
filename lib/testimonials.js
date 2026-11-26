(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TestimonialPortal=api})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var STATUSES={not_scheduled:'Not scheduled',scheduled:'Scheduled',recorded:'Recorded'};
  var LIMITS={studentName:140,examName:200,rank:60,city:120,state:120,college:240,interviewStatus:30,interviewDate:10,interviewTime:5,recordingUrl:2000,notes:2000,campaignId:160,coordinator:200,contentDueDate:10};
  function error(message,code){var e=new Error(message);e.userMessage=message;e.code=code||'invalid-record';return e}
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v}
  function safeUrl(value){if(!value)return '';try{var u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw 0;return u.href}catch(e){throw error('Use a complete https:// or http:// recording link.')}}
  function normalize(values){
    var out={};Object.keys(LIMITS).forEach(function(k){out[k]=typeof values[k]==='string'?values[k].trim():'';if(out[k].length>LIMITS[k])throw error('Keep '+k+' within '+LIMITS[k]+' characters.')});
    if(!out.studentName)throw error('Add the student name.');if(!out.examName)throw error('Add the exam name.');if(!out.campaignId)throw error('Choose the testimonial campaign.');
    if(!Object.hasOwn(STATUSES,out.interviewStatus))throw error('Choose an interview stage.');
    if(!validDate(out.contentDueDate))throw error('Choose a valid campaign task deadline.');
    if(out.interviewDate&&!validDate(out.interviewDate))throw error('Choose a valid interview date.');
    if(out.interviewTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(out.interviewTime))throw error('Choose a valid interview time.');
    if(out.interviewStatus==='scheduled'&&(!out.interviewDate||!out.interviewTime))throw error('Add an interview date and time before marking it scheduled.');
    out.recordingUrl=safeUrl(out.recordingUrl);if(out.recordingUrl.length>LIMITS.recordingUrl)throw error('Keep the recording link within 2,000 characters.');return out;
  }
  function title(record){return record.studentName+' · '+record.examName}
  function profile(record,id){var out={id:id};Object.keys(LIMITS).forEach(function(k){out[k]=record[k]||''});return out}
  function plain(record){var out={};Object.keys(LIMITS).forEach(function(k){out[k]=record[k]||''});return out}
  function portalUrl(origin,campaignId){var base=new URL(safeUrl(origin)),url=new URL('/testimonials/',base.origin);if(campaignId)url.searchParams.set('campaign',campaignId);return url.href}
  function campaignResources(campaign,origin,campaignId,actor){var items=Array.isArray(campaign.resources)?campaign.resources.slice():[],url=portalUrl(origin,campaignId);if(items.some(function(r){return r.kind==='link'&&r.url===url}))return null;var resource={id:'testimonial-portal',kind:'link',name:'Testimonial portal',url:url,label:'Link',addedBy:actor.id,createdAt:new Date().toISOString()},existing=items.findIndex(function(r){try{return r.kind==='link'&&new URL(r.url).origin===new URL(url).origin&&new URL(r.url).pathname==='/testimonials/'}catch(e){return false}});if(existing>=0){resource.id=items[existing].id;items[existing]=resource;return items}if(items.length>=100)throw error('This campaign has 100 resources. Remove one before connecting the portal.');while(items.some(function(r){return r.id===resource.id}))resource.id+='-link';items.unshift(resource);return items}
  function connectCampaign(db,campaignId,actor,origin){if(!campaignId||!actor||!actor.id)throw error('Choose a campaign and sign in first.');return db.runTransaction(function(tx){var ref=db.doc('campaigns/'+campaignId);return tx.get(ref).then(function(snap){if(!snap.exists)throw error('This campaign no longer exists.');var current=snap.data(),items=campaignResources(current,origin,campaignId,actor);if(items)tx.update(ref,{resources:items});return true})})}
  function people(users,members){var accounts={},linked={},out=[];(users||[]).forEach(function(u){if(u.email)accounts[u.email.toLowerCase()]=u});(members||[]).forEach(function(m){var u=m.email&&accounts[m.email.toLowerCase()];if(u)linked[u.id]=true;out.push({id:u?u.id:m.id,name:m.name||u&&u.name||'Teammate'})});(users||[]).forEach(function(u){if(!linked[u.id])out.push({id:u.id,name:u.name||u.email||'Teammate'})});return out.sort(function(a,b){return a.name.localeCompare(b.name)})}
  function save(db,request){
    var values=normalize(request.values),actor=request.actor,id=request.id;if(!actor||!actor.id)throw error('Sign in again before saving.','unauthenticated');if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw error('This student record has an invalid ID.');
    var recordRef=db.doc('testimonials/'+id),activityId='testimonial-'+id,activityRef=db.doc('activities/'+activityId),campaignRef=db.doc('campaigns/'+values.campaignId);
    return db.runTransaction(function(tx){return Promise.all([tx.get(recordRef),tx.get(activityRef),tx.get(campaignRef)]).then(function(snaps){
      var old=snaps[0].exists?snaps[0].data():null,current=snaps[1].exists?snaps[1].data():null;
      if(!snaps[2].exists)throw error('This campaign no longer exists. Choose another campaign.','campaign-missing');
      if((old?old.revision:0)!==request.expectedRevision)throw error('Someone else updated this student. Load the latest version before saving.','stale-record');
      if(old&&old.activityId!==activityId)throw error('This student has an invalid campaign connection.','invalid-link');
      if(current&&current.testimonialId!==id)throw error('This campaign task belongs to another record.','invalid-link');
      if(old&&!current&&!request.reconnect)throw error('The linked campaign task was deleted. Select “Create replacement campaign task” to reconnect it.','task-missing');
      var next=Object.assign({},values),base=request.base||old;
      if(current&&base){if(values.contentDueDate===base.contentDueDate)next.contentDueDate=current.dueDate;if(values.coordinator===base.coordinator)next.coordinator=current.owner||'';if(values.campaignId===base.campaignId)next.campaignId=current.campaignId;}
      // Never silently move a task back after someone relinks it in the calendar.
      if(next.campaignId!==values.campaignId)throw error('The task was moved to another campaign. Reopen this student to use its current campaign.','stale-record');
      if(!validDate(next.contentDueDate))throw error('The linked task needs a deadline before this record can be saved.');
      var stamp=new Date().toISOString(),record=Object.assign({},next,{activityId:activityId,revision:(old?old.revision:0)+1,createdBy:old?old.createdBy:actor.id,createdAt:old?old.createdAt:stamp,updatedBy:actor.id,updatedAt:stamp});
      var patch={testimonialId:id,testimonial:profile(record,id)};
      if(current){if(!old||current.title===title(old))patch.title=title(record);if(!base||values.contentDueDate!==base.contentDueDate)patch.dueDate=next.contentDueDate;if(!base||values.coordinator!==base.coordinator)patch.owner=next.coordinator;if(!base||values.campaignId!==base.campaignId)patch.campaignId=next.campaignId;tx.update(activityRef,patch)}
      else{tx.set(activityRef,Object.assign({title:title(record),campaignId:record.campaignId,dueDate:record.contentDueDate,dueTime:'',owner:record.coordinator,status:'Not started',platforms:[],type:'',angle:'',cta:'',description:'Interview and prepare the student testimonial.',script:'',keywords:[],assets:{},subtasks:[],createdAt:stamp},patch));}
      if(request.portalOrigin){var items=campaignResources(snaps[2].data(),request.portalOrigin,record.campaignId,actor);if(items)tx.update(campaignRef,{resources:items})}
      tx.set(recordRef,record);return Object.assign({id:id},record);
    })});
  }
  return {STATUSES:STATUSES,LIMITS:LIMITS,normalize:normalize,validDate:validDate,safeUrl:safeUrl,title:title,plain:plain,people:people,save:save,portalUrl:portalUrl,connectCampaign:connectCampaign};
});
