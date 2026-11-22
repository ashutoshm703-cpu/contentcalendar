// Synthetic Rules API requests; no live documents are changed.
const path='/databases/(default)/documents/workspaceSettings/contentOptions';
const team={uid:'synthetic-editor',token:{email:'editor@nprep.in',email_verified:true}};
// The Rules REST tester interprets RFC3339 literals as timestamps. Use a plain
// string here to model the ISO text written as a string by the Firestore SDK.
const valid={version:1,platforms:[],updatedAt:'synthetic-updated-at',updatedBy:team.uid};
const cases=[];
function add(label,expectation,method,auth,data=valid,previous){
  const test={expectation,request:{path,method,auth,resource:{data}}};
  if(previous)test.resource={data:previous};
  cases.push({label:'content options: '+label,test});
}
add('team reads','ALLOW','get',team);
add('team creates initial version','ALLOW','create',team);
add('team increments version','ALLOW','update',team,{...valid,version:2},valid);
add('stale version is denied','DENY','update',team,valid,valid);
add('wrong initial version is denied','DENY','create',team,{...valid,version:4});
add('impersonated editor is denied','DENY','create',team,{...valid,updatedBy:'someone-else'});
add('unexpected fields are denied','DENY','create',team,{...valid,extra:true});
add('oversized platform list is denied','DENY','create',team,{...valid,platforms:Array(31).fill({})});
add('deletion is denied','DENY','delete',team,valid,valid);
add('anonymous read is denied','DENY','get',null);
add('outsider write is denied','DENY','create',{uid:'outsider',token:{email:'x@example.com',email_verified:true}});
add('unverified write is denied','DENY','create',{...team,token:{...team.token,email_verified:false}});
module.exports=cases;
