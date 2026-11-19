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
  globalThis.api={copyNodes,insertAfter,treeDepth,copyActivity,repeatDate,writeActivityCopies,
    setDB(value){db=value}};
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
  console.log('PASS: independent copies, sibling placement, date shifting, status reset, month boundaries, atomic repeat batch');
})().catch(error=>{console.error(error);process.exitCode=1});
