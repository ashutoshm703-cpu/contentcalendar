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
  globalThis.api={copyNodes,insertAfter,treeDepth,copyActivity,repeatDate,writeActivityCopies,applySopRules,saveActivityWithSops,subtaskLocation,saveSubtaskWithSops,storeSopRule,archiveSop,normalizeSopName,sopNameTaken,sopDisplayName,allSopRules,
    setDB(value){db=value;render=function(){}},setSops(rules,ready=true){S.sopRules=rules;S.sopReady=ready;S.templatesLoading=false;S.templateError=""},setTemplates(rows){S.templates=rows},getRules(){return S.sopRules}};
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
  console.log('PASS: inherited subtask conditions, legacy duplicate labels, concurrent name reservations, rename/archive releases');
})().catch(error=>{console.error(error);process.exitCode=1});
