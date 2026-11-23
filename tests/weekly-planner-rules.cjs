// Synthetic requests only; these checks do not change live plan data.
const path='/databases/(default)/documents/workspaceSettings/weeklyPlanner';
const auth={uid:'plan-editor',token:{email:'editor@nprep.in',email_verified:true}};
const valid={version:1,cells:Object.fromEntries(Array.from({length:56},(_,i)=>['cell-'+i,[]])),updatedAt:'synthetic-time',updatedBy:auth.uid};
const cases=[];
function add(label,expectation,method,identity=auth,data=valid,previous){const test={expectation,request:{path,method,auth:identity,resource:{data}}};if(previous)test.resource={data:previous};cases.push({label:'weekly planner: '+label,test})}
add('team reads','ALLOW','get');add('team creates','ALLOW','create');add('team updates atomically','ALLOW','update',auth,{...valid,version:2},valid);
add('stale revision rejected','DENY','update',auth,valid,valid);add('wrong initial version rejected','DENY','create',auth,{...valid,version:3});add('wrong editor rejected','DENY','create',auth,{...valid,updatedBy:'someone-else'});
add('missing cells rejected','DENY','create',auth,{...valid,cells:{}});add('unexpected fields rejected','DENY','create',auth,{...valid,extra:true});add('deletion rejected','DENY','delete',auth,valid,valid);add('anonymous read rejected','DENY','get',null);add('outsider write rejected','DENY','create',{uid:'outsider',token:{email:'person@example.com',email_verified:true}});add('unverified editor rejected','DENY','create',{...auth,token:{...auth.token,email_verified:false}});
module.exports=cases;
