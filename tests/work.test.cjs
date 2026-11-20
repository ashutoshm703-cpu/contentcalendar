const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const context={document:{addEventListener(){},getElementById(){return {}}},window:{addEventListener(){},matchMedia(){return {matches:false}}}};
vm.createContext(context);
vm.runInContext(source.slice(0,source.indexOf('(function boot(){')).replace(/^render\(\);$/m,'')+`
render=function(){};toast=function(){};
globalThis.api={S,effectiveWork,workItems,workByDay,visible,scopedNodes,saveCompletion,appendAiChecklist,aiWorkRequest,setDB(value){db=value}};
})();`,context);
const {api}=context,{S}=api;
assert.equal(S.workScope,'my');S.me={id:'me'};
const activity={id:'video',title:'A nursing story',owner:'other',dueDate:'2099-01-06',status:'In progress',subtasks:[
  {id:'phase',title:'Pre production',due:'2099-01-04',owner:'me',children:[
    {id:'inherit',title:'Outline',due:'',children:[]},
    {id:'override',title:'Interview',owner:'other',due:'2099-01-03',done:true,children:[]}]},
  {id:'root-inherit',title:'Publish',children:[]}]};
S.activities=[activity];
let rows=api.effectiveWork(activity);assert.equal(rows[1].due,'2099-01-04');assert.equal(rows[1].owner,'me');assert.equal(rows[1].parentDue,'2099-01-04');
assert.equal(rows[2].due,'2099-01-03');assert.equal(rows[3].due,'2099-01-06');
assert.deepEqual(Array.from(api.workItems(),r=>r.id),['inherit']);assert.equal(api.visible().length,1);
assert.deepEqual(Array.from(api.scopedNodes(activity,activity.subtasks)[0].children,n=>n.id),['inherit']);
const moved={...activity,dueDate:'2099-01-08',subtasks:[{...activity.subtasks[0],due:'2099-01-05'},activity.subtasks[1]]};
rows=api.effectiveWork(moved);assert.equal(rows[1].due,'2099-01-05');assert.equal(rows[2].due,'2099-01-03');assert.equal(rows[3].due,'2099-01-08');
S.workScope='team';assert.equal(api.workItems().length,4);assert.equal(api.workByDay()['2099-01-04'].length,1);
S.filters.owner='other';assert.deepEqual(Array.from(api.workItems(),r=>r.id),['activity:video','override','root-inherit']);S.filters.owner='';
const breakdown=[{title:'Scene preparation',why:'Prepare',tasks:[{title:'Direct the opening',description:'Shoot a clear hook',dueDate:'',children:[{title:'Approve dialogue',description:'Get sign off',dueDate:''}]}]}];
const empty={...activity,subtasks:[]};let planned=api.appendAiChecklist(empty,breakdown,'nested',{});
assert.equal(planned.added,2);assert.equal(planned.activity.subtasks[0].children[0].children[0].title,'Approve dialogue');
const targeted={...empty,subtasks:[{id:'target',title:'Edit story',children:[]}]};
const within=api.appendAiChecklist(targeted,[{...breakdown[0],tasks:[{...breakdown[0].tasks[0],children:[]}]}],'targeted',{},'target');
assert.equal(within.activity.subtasks[0].children[0].children[0].title,'Direct the opening');
assert.throws(()=>api.appendAiChecklist(targeted,breakdown,'too-deep',{},'target'));
const deep={...empty,subtasks:[{id:'parent',title:'Production',children:[{id:'deep',title:'Edit story',children:[]}]}]};
planned=api.appendAiChecklist(deep,[{...breakdown[0],tasks:[{...breakdown[0].tasks[0],children:[]}]}],'flat',{},'deep');
assert.equal(planned.activity.subtasks[0].children[0].children[0].title,'Direct the opening');
assert.throws(()=>api.appendAiChecklist(deep,breakdown,'too-deep',{},'deep'));
assert.equal(activity.subtasks[0].children[0].done,undefined);
console.log('PASS: My work default; descendant ownership; nearest-parent deadlines/owners; independent overrides; work counts; scoped trees; nested AI and depth limits');
(async()=>{
  // A concurrent editor has added a sibling. Completion must use the saved tree.
  let stored=structuredClone(activity),fail=false;
  stored.subtasks.push({id:'concurrent',title:'New task from teammate',children:[]});
  api.setDB({doc(id){return {id}},async runTransaction(work){let pending;const result=await work({async get(){return {exists:true,data(){return structuredClone(stored)}}},update(ref,patch){pending=patch}});if(fail)throw new Error('Save failed');Object.assign(stored,pending);return result}});
  await api.saveCompletion(activity,'inherit',true);assert.equal(stored.subtasks[0].children[0].done,true);assert.equal(stored.subtasks[2].id,'concurrent');assert.equal(stored.status,'In progress');
  await api.saveCompletion(activity,'phase',true);assert.equal(stored.subtasks[0].children.every(n=>n.done),true);
  await api.saveCompletion(activity,null,true);assert.equal(stored.status,'Published');assert.equal(stored.subtasks[1].done,undefined);
  await api.saveCompletion(activity,null,false);assert.equal(stored.status,'Ready');
  fail=true;await assert.rejects(api.saveCompletion(activity,'root-inherit',true));assert.equal(stored.subtasks[1].done,undefined);assert.equal(S.completing['video:root-inherit'],undefined);
  console.log('PASS: transactional leaf/group/task completion; independent publication; concurrent sibling preservation; failed-save recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
