const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const context = {
  document: { addEventListener() {}, getElementById() { return {}; } },
  window: { addEventListener() {}, matchMedia() { return { matches: false }; } },
};
vm.createContext(context);
vm.runInContext(source.slice(0, source.indexOf('(function boot(){')).replace(/^render\(\);$/m, '') + `
  globalThis.api={copyNodes,insertAfter,treeDepth,copyActivity,repeatDate,writeActivityCopies,applySopRules,saveActivityWithSops,subtaskLocation,saveSubtaskWithSops,storeSopRule,archiveSop,normalizeSopName,sopNameTaken,sopDisplayName,allSopRules,moveSopNode,sopNodePosition,
    materializeSop,reconcileSop,syncActivitySop,sopUsage,sopNodes,copyIndependentSubtask,
    setActivities(rows){S.activities=rows},setDB(value){db=value;render=function(){}},setSops(rules,ready=true){S.sopRules=rules;S.sopReady=ready;S.templatesLoading=false;S.templateError=""},setTemplates(rows){S.templates=rows},getRules(){return S.sopRules}};
})();`, context);
const api = context.api;
const nodes = [{id:'group',title:'Pre class',done:true,due:'2026-11-18',owner:'owner',description:'Keep this',children:[
  {id:'leaf',title:'Thumbnail',done:true,due:'2026-11-19',platform:'YouTube',kind:'Thumbnail',children:[]},
  {id:'undated',title:'Review',done:false,due:'',children:[]},
]}];
const snapshot = JSON.stringify(nodes);
const copied = api.copyNodes(nodes, 7);
assert.notEqual(copied[0].id, 'group');
assert.notEqual(copied[0].children[0].id, 'leaf');
assert.equal(copied[0].done, false);
assert.equal(copied[0].children[0].done, false);
assert.equal(copied[0].due, '2026-11-25');
assert.equal(copied[0].children[0].due, '2026-11-26');
assert.equal(copied[0].children[1].due, '');
assert.equal(copied[0].owner, 'owner');
assert.equal(copied[0].description, 'Keep this');
assert.equal(JSON.stringify(nodes), snapshot);
assert.notEqual(api.copyNodes(nodes)[0].id, copied[0].id);
const sibling = api.insertAfter(nodes, 'leaf', copied[0].children[0]);
assert.equal(sibling[0].children.length, 3);
assert.equal(sibling[0].children[1].id, copied[0].children[0].id);
assert.equal(nodes[0].children.length, 2);
assert.equal(api.treeDepth(nodes), 2);
const moveTree=[...nodes,{id:'other',title:'Other group',children:[{id:'last',title:'Last',owner:'writer',done:true,children:[]}]}];
const originalMoveTree=JSON.stringify(moveTree);
const rootMoved=api.moveSopNode(moveTree,'other','group','before');
assert.equal(rootMoved[0].id,'other');assert.equal(rootMoved[0].children[0].owner,'writer');
const reordered=api.moveSopNode(moveTree,'undated','leaf','before');
assert.deepEqual(Array.from(reordered[0].children,n=>n.id),['undated','leaf']);
const crossGroup=api.moveSopNode(moveTree,'leaf','last','after');
assert.equal(crossGroup[0].children.length,1);assert.deepEqual(Array.from(crossGroup[1].children,n=>n.id),['last','leaf']);
assert.equal(crossGroup[1].children[1].done,true);assert.equal(crossGroup[1].children[1].due,'2026-11-19');
const nested=api.moveSopNode(moveTree,'last','leaf','inside');
assert.equal(nested[0].children[0].children[0].id,'last');
const outdented=api.moveSopNode(nested,'last','group','after');
assert.deepEqual(Array.from(outdented,n=>n.id),['group','last','other']);
assert.equal(api.moveSopNode(nested,'group','last','inside'),nested);
assert.equal(api.moveSopNode(nested,'other','last','inside'),nested);
assert.equal(api.moveSopNode(moveTree,'group','group','after'),moveTree);
assert.equal(api.moveSopNode(moveTree,'missing','leaf','after'),moveTree);
assert.equal(api.moveSopNode(moveTree,'leaf','last','invalid'),moveTree);
assert.equal(JSON.stringify(moveTree),originalMoveTree);
const activity = { id:'activity',title:'YouTube live',campaignId:'campaign',dueDate:'2026-11-19',
  status:'Published',assets:{link:'old output'},subtasks:nodes,repeat:{seriesId:'old'},script:'Keep script' };
const copy = api.copyActivity(activity, '2026-12-03', 'other');
assert.equal(copy.id, undefined);
assert.equal(copy.campaignId, 'other');
assert.equal(copy.status, 'Not started');
assert.equal(Object.keys(copy.assets).length, 0);
assert.equal(copy.repeat, undefined);
assert.equal(copy.script, 'Keep script');
assert.equal(copy.subtasks[0].due, '2026-12-02');
assert.equal(api.repeatDate('2026-12-31', 'daily', 1), '2027-01-01');
assert.equal(api.repeatDate('2026-11-19', 'weekly', 3), '2026-12-10');
assert.equal(api.repeatDate('2027-01-31', 'monthly', 1), '2027-02-28');
assert.equal(api.repeatDate('2028-01-31', 'monthly', 1), '2028-02-29');
assert.equal(api.repeatDate('2027-01-31', 'monthly', 2), '2027-03-31');
const writes=[];
api.setDB({batch(){return {set(ref,value){writes.push({ref,value})},commit(){return Promise.resolve()}}},
  collection(){return {doc(){return {id:String(writes.length)}}}}});
(async function(){
  await api.writeActivityCopies(activity, {unit:'weekly',count:3});
  assert.equal(writes.length, 3);
  assert.equal(writes[2].value.dueDate, '2026-12-03');
  assert.equal(writes[2].value.subtasks[0].due, '2026-12-02');
  assert.equal(new Set(writes.map(w=>w.value.subtasks[0].id)).size, 3);
  assert.equal(new Set(writes.map(w=>w.value.repeat.seriesId)).size, 1);
  assert.equal(writes[2].value.repeat.index, 2);
  assert.equal(activity.status, 'Published');
  api.setSops([]);
  const longForm={type:'Long form',platforms:['YouTube'],dueDate:'2026-12-03',subtasks:[]};
  assert.equal(api.applySopRules(longForm).subtasks.length,0);
  const auto=api.applySopRules(longForm,["builtin-youtube-long-form"]);
  assert.equal(auto.subtasks.length,3);
  assert.equal(auto.appliedSopRules[0],'builtin-youtube-long-form');
  assert.equal(api.applySopRules(auto).subtasks.length,3);
  assert.equal(longForm.subtasks.length,0);
  assert.equal(api.applySopRules({...longForm,platforms:['Instagram']}).subtasks.length,0);
  assert.equal(api.applySopRules({...longForm,type:'Live'}).subtasks.length,0);
  api.setSops([{id:'builtin-youtube-long-form',enabled:false},
    {id:'custom',name:'Live setup',enabled:true,platform:'YouTube',format:'Live',anchorDate:'2026-11-19',nodes}]);
  assert.equal(api.applySopRules(longForm).subtasks.length,0);
  const live=api.applySopRules({...longForm,type:'Live'},['custom']);
  assert.equal(live.subtasks[0].due,'2026-12-02');
  assert.equal(live.subtasks[0].children[0].done,false);
  const existing={...longForm,type:'Live',subtasks:[{...nodes[0],children:[nodes[0].children[0]]}]};
  const merged=api.applySopRules(existing,["custom"]);
  assert.equal(merged.subtasks.length,1);
  assert.equal(merged.subtasks[0].children.length,2);
  assert.equal(merged.subtasks[0].children[0].id,'leaf');
  assert.equal(merged.subtasks[0].children[0].done,true);
  assert.equal(existing.subtasks[0].children.length,1);
  assert.equal(api.applySopRules(merged).subtasks[0].children.length,2);
  api.setSops([{id:'academic',name:'Academic',enabled:true,platform:'YouTube',format:'Long form',angle:'Academic',nodes}]);
  assert.equal(api.applySopRules({...longForm,angle:'Live class'},['academic']).subtasks.length,0);
  assert.equal(api.applySopRules({...longForm,angle:'Academic'},['academic']).subtasks.length,1);
  api.setSops([],false);
  assert.equal(api.applySopRules(longForm).subtasks.length,0);
  api.setSops([]);
  let stored={...longForm,subtasks:[{id:'existing',title:'Custom work',done:true,children:[]}]};
  api.setDB({doc(){return {}},async runTransaction(fn){return fn({
    async get(){return {exists:true,data(){return stored}}},update(ref,patch){stored={...stored,...patch}}
  })}});
  await api.saveActivityWithSops('a1',{title:'Saved title'},['builtin-youtube-long-form']);
  assert.equal(stored.title,'Saved title');assert.equal(stored.subtasks.length,4);assert.equal(stored.subtasks[0].done,true);
  await api.saveActivityWithSops('a1',{title:'Saved twice'});
  assert.equal(stored.subtasks.length,4);
  console.log('PASS: independent copies, sibling placement, date shifting, status reset, month boundaries, atomic repeat batch');
  console.log('PASS: opt-in SOPs, topic matching, shifted deadlines, deduplication, preserved progress, transactional saves');
  const parent={id:'a',platforms:['YouTube'],type:'Long form',angle:'Academic',dueDate:'2026-12-03',subtasks:[{id:'s',title:'Video clip',children:[]}]};
  assert.equal(api.subtaskLocation(parent,'s').context.angle,'Academic');
  parent.subtasks[0].type='Live';
  assert.equal(api.subtaskLocation(parent,'s').context.angle,'');
  parent.subtasks[0].angle='Academic discussion';
  assert.equal(api.subtaskLocation(parent,'s').context.angle,'Academic discussion');
  const records=new Map();let next=0,chain=Promise.resolve();
  function ref(path){return {path,id:path.split('/')[1]}}
  api.setDB({doc:ref,collection(name){return {doc(){return ref(name+'/'+(++next))}}},runTransaction(fn){
    const work=chain.then(async()=>{const writes=[];const result=await fn({
      async get(r){return {exists:records.has(r.path),data(){return records.get(r.path)}}},
      set(r,v){writes.push(()=>records.set(r.path,structuredClone(v)))},
      update(r,v){writes.push(()=>records.set(r.path,{...records.get(r.path),...structuredClone(v)}))},
      delete(r){writes.push(()=>records.delete(r.path))}
    });writes.forEach(f=>f());return result});chain=work.catch(()=>{});return work;
  }});
  api.setSops([]);api.setTemplates([{id:'old1',name:'Same name',nodes},{id:'old2',name:' Same  Name ',nodes}]);
  assert.equal(api.sopNameTaken(' SAME NAME '),true);
  const legacy=api.allSopRules().filter(r=>r.legacyId);
  assert.notEqual(api.sopDisplayName(legacy[0]),api.sopDisplayName(legacy[1]));
  await assert.rejects(api.storeSopRule({name:'same name',nodes}),/./);
  api.setTemplates([]);
  const rule={name:'  Academic  SOP ',platform:'YouTube',format:'Long form',angle:'Academic',nodes,enabled:true};
  const results=await Promise.allSettled([api.storeSopRule(rule),api.storeSopRule({...rule,name:'academic sop'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal([...records.keys()].filter(k=>k.startsWith('sopRules/')).length,1);
  let saved=api.getRules()[0];assert.equal(saved.name,'Academic SOP');
  await api.storeSopRule({...saved,name:'Renamed SOP'});
  assert.equal(records.has('sopNameClaims/n-academic%20sop'),false);
  saved=api.getRules()[0];await api.archiveSop(saved);
  assert.equal(records.has('sopNameClaims/n-renamed%20sop'),false);
  assert.equal(records.get('sopRules/'+saved.id).archived,true);
  assert.equal(api.normalizeSopName(' Ａcademic  SOP '),'academic sop');
  const previous={id:'sync',name:'Sync test',platform:'YouTube',format:'Live',enabled:true,version:1,anchorDate:'2026-11-19',nodes:[
    {id:'p',title:'Prepare',children:[{id:'s1',title:'Draft',due:'2026-11-18',children:[]},{id:'s2',title:'Review',children:[]}]},
    {id:'s3',title:'Publish',children:[]},{id:'s4',title:'Remove unused',children:[]},{id:'s5',title:'Keep assigned',children:[]}
  ]};
  const applied=api.materializeSop(previous,'2026-11-26');
  const ids=JSON.parse(JSON.stringify(applied));
  applied[0].children[0].title='My custom draft';applied[0].children[0].due='2026-11-30';applied[0].children[0].owner='writer';
  applied[0].children[1].done=true;applied[2].description='Local instructions';applied[3].owner='editor';
  applied.push({id:'custom',title:'Custom task',children:[],done:false});
  const updated={...previous,nodes:[{...previous.nodes[0],children:[{...previous.nodes[0].children[0],title:'Write draft',due:'2026-11-20'}, {id:'new',title:'Check slides',children:[]}]},{...previous.nodes[1],title:'Publish video'}]};
  const ongoingActivity={id:'sync-ongoingActivity',status:'In progress',dueDate:'2026-11-26',appliedSopRules:['sync'],subtasks:applied};
  const synced=api.syncActivitySop(ongoingActivity,previous,updated);
  assert.equal(synced.subtasks[0].children[0].id,ids[0].children[0].id);assert.equal(synced.subtasks[0].children[0].title,'My custom draft');assert.equal(synced.subtasks[0].children[0].due,'2026-11-30');assert.equal(synced.subtasks[0].children[0].owner,'writer');
  assert.equal(synced.subtasks[0].children[1].title,'Check slides');assert.equal(synced.subtasks[0].children[2].title,'Review');assert.equal(synced.subtasks[0].children[2].done,true);
  assert.equal(synced.subtasks[1].title,'Publish video');assert.equal(synced.subtasks.find(n=>n.id==='custom').title,'Custom task');
  assert.equal(synced.subtasks.find(n=>n.title==='Remove unused').description,'Local instructions');assert.equal(synced.subtasks.find(n=>n.title==='Keep assigned').owner,'editor');
  const pristine=api.materializeSop(previous,'2026-11-26');
  assert.equal(api.reconcileSop(pristine,previous,updated,'2026-11-26').length,2);
  const independent=api.copyIndependentSubtask(pristine[0]);assert.equal(independent.sopSource,undefined);assert.equal(independent.children[0].sopSource,undefined);
  const innerRule={...previous,nodes:[previous.nodes[1]]},outerNodes=api.materializeSop(innerRule,'2026-11-26');
  outerNodes[0].appliedSopRules=['sync'];outerNodes[0].children=api.materializeSop(innerRule,'2026-11-26');
  const nestedCopy=api.copyIndependentSubtask(outerNodes[0]);assert.equal(nestedCopy.sopSource,undefined);assert.equal(nestedCopy.children[0].sopSource.ruleId,'sync');
  const twoUses={id:'two',status:'In progress',dueDate:'2026-11-26',appliedSopRules:['sync'],subtasks:outerNodes};
  const changedInner={...innerRule,nodes:[{...previous.nodes[1],title:'Publish updated'}]};
  const bothSynced=api.syncActivitySop(twoUses,innerRule,changedInner);assert.equal(bothSynced.subtasks.length,1);assert.equal(bothSynced.subtasks[0].title,'Publish updated');assert.equal(bothSynced.subtasks[0].children[0].title,'Publish updated');assert.notEqual(bothSynced.subtasks[0].id,bothSynced.subtasks[0].children[0].id);
  const allDone=api.materializeSop(previous,'2026-11-26');allDone[0].children.forEach(n=>n.done=true);
  const withAddedInCompleteGroup=api.reconcileSop(allDone,previous,updated,'2026-11-26');
  assert.equal(withAddedInCompleteGroup[0].children.some(n=>n.title==='Check slides'),true);assert.equal(withAddedInCompleteGroup[0].children.find(n=>n.title==='Draft').done,true);
  const moved={...previous,nodes:[{...previous.nodes[0],children:[previous.nodes[0].children[1]]},{...previous.nodes[1],children:[previous.nodes[0].children[0]]}]};
  const movedResult=api.reconcileSop(pristine,previous,moved,'2026-11-26');
  assert.equal(movedResult[0].children.length,1);assert.equal(movedResult[1].children[0].id,pristine[0].children[0].id);
  assert.equal(JSON.stringify(api.syncActivitySop({...ongoingActivity,status:'Published'},previous,updated).subtasks),JSON.stringify(ongoingActivity.subtasks));
  const repeated=api.copyNodes(pristine,7);assert.equal(repeated[0].children[0].sopSource.baseline.due,'2026-12-02');
  const legacyNodes=JSON.parse(JSON.stringify(pristine));(function strip(ns){ns.forEach(n=>{delete n.sopSource;strip(n.children)})})(legacyNodes);
  const legacyUpdated=api.reconcileSop(legacyNodes,previous,updated,'2026-11-26');assert.equal(legacyUpdated[0].children[0].title,'Write draft');assert.equal(legacyUpdated.some(n=>n.title==='Remove unused'),true);
  const nested={...ongoingActivity,appliedSopRules:[],subtasks:[{id:'parent',title:'Nested use',appliedSopRules:['sync'],children:api.materializeSop(previous,'2026-11-26')}]};
  assert.equal(api.sopUsage(nested,'sync'),1);assert.equal(api.syncActivitySop(nested,previous,updated).subtasks[0].children[1].title,'Publish video');
  records.set('sopRules/sync',structuredClone(previous));records.set('activities/sync-ongoingActivity',structuredClone(ongoingActivity));api.setSops([previous]);api.setActivities([ongoingActivity]);
  await api.storeSopRule(updated,false,previous);assert.equal(records.get('activities/sync-ongoingActivity').subtasks[1].title,'Publish');
  let latest=api.getRules().find(r=>r.id==='sync');await api.storeSopRule({...latest,nodes:updated.nodes},true,latest);assert.equal(records.get('activities/sync-ongoingActivity').subtasks[1].title,'Publish video');
  await assert.rejects(api.storeSopRule(updated,true,previous),e=>e.userMessage.includes('someone else'));
  console.log('PASS: SOP propagation, custom edits/completed work, removed steps, source moves, legacy safety, nested use, shifted baselines, SOP-only scope and concurrent edits');
  console.log('PASS: inherited subtask conditions, legacy duplicate labels, concurrent name reservations, rename/archive releases');
})().catch(error=>{console.error(error);process.exitCode=1});
