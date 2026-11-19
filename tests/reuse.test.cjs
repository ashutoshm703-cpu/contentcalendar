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
  globalThis.api={copyNodes,insertAfter,treeDepth,copyActivity,repeatDate,writeActivityCopies,applySopRules,saveActivityWithSops,
    setDB(value){db=value},setSops(rules,ready=true){S.sopRules=rules;S.sopReady=ready}};
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
  const auto=api.applySopRules(longForm);
  assert.equal(auto.subtasks.length,3);
  assert.equal(auto.appliedSopRules[0],'builtin-youtube-long-form');
  assert.equal(api.applySopRules(auto).subtasks.length,3);
  assert.equal(longForm.subtasks.length,0);
  assert.equal(api.applySopRules({...longForm,platforms:['Instagram']}).subtasks.length,0);
  assert.equal(api.applySopRules({...longForm,type:'Live'}).subtasks.length,0);
  api.setSops([{id:'builtin-youtube-long-form',enabled:false},
    {id:'custom',name:'Live setup',enabled:true,platform:'YouTube',format:'Live',anchorDate:'2026-11-19',nodes}]);
  assert.equal(api.applySopRules(longForm).subtasks.length,0);
  const live=api.applySopRules({...longForm,type:'Live'});
  assert.equal(live.subtasks[0].due,'2026-12-02');
  assert.equal(live.subtasks[0].children[0].done,false);
  const existing={...longForm,type:'Live',subtasks:[{...nodes[0],children:[nodes[0].children[0]]}]};
  const merged=api.applySopRules(existing);
  assert.equal(merged.subtasks.length,1);
  assert.equal(merged.subtasks[0].children.length,2);
  assert.equal(merged.subtasks[0].children[0].id,'leaf');
  assert.equal(merged.subtasks[0].children[0].done,true);
  assert.equal(existing.subtasks[0].children.length,1);
  assert.equal(api.applySopRules(merged).subtasks[0].children.length,2);
  api.setSops([{id:'all-video',enabled:true,platform:'YouTube',nodes}]);
  assert.equal(api.applySopRules({...longForm,type:'Short'}).subtasks.length,1);
  api.setSops([],false);
  assert.equal(api.applySopRules(longForm).subtasks.length,0);
  api.setSops([]);
  let stored={...longForm,subtasks:[{id:'existing',title:'Custom work',done:true,children:[]}]};
  api.setDB({doc(){return {}},async runTransaction(fn){return fn({
    async get(){return {exists:true,data(){return stored}}},update(ref,patch){stored={...stored,...patch}}
  })}});
  await api.saveActivityWithSops('a1',{title:'Saved title'});
  assert.equal(stored.title,'Saved title');assert.equal(stored.subtasks.length,4);assert.equal(stored.subtasks[0].done,true);
  await api.saveActivityWithSops('a1',{title:'Saved twice'});
  assert.equal(stored.subtasks.length,4);
  console.log('PASS: independent copies, sibling placement, date shifting, status reset, month boundaries, atomic repeat batch');
  console.log('PASS: SOP conditions, disabled rules, wildcard conditions, shifted deadlines, deduplication, preserved progress, transactional saves');
})().catch(error=>{console.error(error);process.exitCode=1});
