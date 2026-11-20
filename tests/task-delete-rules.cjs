// Synthetic requests for the Firebase Rules test API; no live documents are changed.
const ownerId='XPLO57VwLWZnXGaI2uJzVL4qx6t2',ownerEmail='ashutosh_mishra@nprep.in';
const identity=(uid,email,verified=true)=>({uid,token:{email,email_verified:verified}});
const cases=[];
for(const collection of ['activities','campaigns']){
  const path='/databases/(default)/documents/'+collection+'/synthetic-permission-check';
  const add=(label,expectation,method,auth)=>cases.push({label:collection+': '+label,test:{expectation,request:{path,method,auth,resource:{data:{title:'Synthetic task',owner:ownerId}}},resource:{data:{title:'Synthetic task',owner:ownerId}}}});
  add('Ashutosh can delete','ALLOW','delete',identity(ownerId,ownerEmail));
  add('Ashutosh email is case insensitive','ALLOW','delete',identity(ownerId,ownerEmail.toUpperCase()));
  add('another member cannot delete','DENY','delete',identity('another-user','teammate@nprep.in'));
  add('same display name is not an identity','DENY','delete',{...identity('another-user','teammate@nprep.in'),name:'Ashutosh Mishra'});
  add('same email with a different UID cannot delete','DENY','delete',identity('another-user',ownerEmail));
  add('same UID with a different email cannot delete','DENY','delete',identity(ownerId,'teammate@nprep.in'));
  add('unverified owner cannot delete','DENY','delete',identity(ownerId,ownerEmail,false));
  add('signed-out visitor cannot delete','DENY','delete',null);
  add('outsider cannot delete','DENY','delete',identity('outsider','person@example.com'));
  for(const method of ['get','create','update'])add('team still can '+method,'ALLOW',method,identity('another-user','teammate@nprep.in'));
}
module.exports=cases;
