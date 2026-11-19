/* Browser smoke test with an in-memory database; never connects to Firebase.
   Run with playwright available on NODE_PATH: node tests/reuse-ui.cjs */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const seed = `
  S.loading=false;S.canWrite=true;S.templatesLoading=false;S.me={id:'owner',name:'Test owner'};
  S.team=[{id:'owner',name:'Test owner'}];S.profiles={owner:{name:'Test owner'}};U=makeUser();
  S.campaigns=[{id:'c1',name:'Live campaign',goal:'Teach',startDate:'2026-11-01',endDate:'2026-11-30',owner:'owner',status:'Live',colour:'#131B63',createdAt:'2026-11-01'}];
  S.activities=[{id:'a1',campaignId:'c1',title:'YouTube live',type:'Live',dueDate:'2026-11-19',dueTime:'18:00',status:'Published',owner:'owner',script:'Live script',assets:{url:'old'},subtasks:[
    {id:'g1',title:'Pre class',done:true,description:'Preparation',due:'2026-11-18',owner:'owner',children:[
      {id:'s1',title:'Thumbnail',done:true,kind:'Thumbnail',platform:'YouTube',due:'2026-11-18',children:[]},
      {id:'g2',title:'Reminders',done:true,due:'',children:[{id:'s2',title:'WhatsApp reminder',done:true,due:'2026-11-19',children:[]}]}
    ]}
  ]}];
  let nextId=0;window.fixture={S,failNext:false};
  function list(collection){return collection==='campaigns'?S.campaigns:collection==='activities'?S.activities:S.templates}
  function apply(ref,data,remove){
    const parts=ref.path.split('/'),rows=list(parts[0]),i=rows.findIndex(r=>r.id===parts[1]);
    if(remove){if(i>=0)rows.splice(i,1)}else if(i>=0)rows[i]=Object.assign({},rows[i],data);else rows.push(Object.assign({},data,{id:parts[1]}));
  }
  function commit(writes){
    if(window.fixture.failNext){window.fixture.failNext=false;return Promise.reject({code:'permission-denied'})}
    writes.forEach(w=>apply(w.ref,JSON.parse(JSON.stringify(w.data||{})),w.remove));render();return Promise.resolve();
  }
  function ref(p){return {id:p.split('/')[1],path:p,update(data){return commit([{ref:this,data}])},delete(){return commit([{ref:this,remove:true}])}}}
  db={collection(name){return {doc(id){return ref(name+'/'+(id||'fixture'+(++nextId)))},add(data){const r=this.doc();return commit([{ref:r,data}]).then(()=>r)}}},
    doc:ref,batch(){const writes=[];return {set(ref,data){writes.push({ref,data})},commit(){return commit(writes)}}}};
  S.view='campaigns';S.expanded={cc1:true,aa1:true};render();
})();`;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<script[^>]*src="[^\"]*"[^>]*><\/script>/g, '')
  .replace('</body>', '<script src="/fixture-app.js"></script></body>');
const server = http.createServer((req,res)=>{
  if(req.url==='/fixture-app.js'){res.setHeader('Content-Type','text/javascript');return res.end(source.slice(0,source.indexOf('(function boot(){'))+seed)}
  if(req.url==='/styles.css'){res.setHeader('Content-Type','text/css');return res.end(fs.readFileSync(path.join(root,'styles.css')))}
  res.setHeader('Content-Type','text/html');res.end(html);
});
let browser;
const errors=[];
async function state(page){return page.evaluate(()=>JSON.parse(JSON.stringify(fixture.S)))}
async function waitFor(page,fn){await page.waitForFunction(fn)}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'Duplicate Live campaign',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'Duplicate campaign',exact:true});
  await dialog.getByLabel('Start date *',{exact:true}).fill('2026-12-01');
  await dialog.getByRole('button',{name:'Duplicate',exact:true}).click();
  await waitFor(page,()=>fixture.S.campaigns.length===2);
  let s=await state(page),campaign=s.campaigns.find(c=>c.id!=='c1'),activity=s.activities.find(a=>a.campaignId===campaign.id);
  assert.equal(campaign.status,'Planning');assert.equal(campaign.endDate,'2026-12-30');
  assert.equal(activity.dueDate,'2026-12-19');assert.equal(activity.subtasks[0].due,'2026-12-18');assert.equal(activity.status,'Not started');
  assert.notEqual(activity.subtasks[0].id,'g1');
  await page.getByRole('button',{name:'Duplicate activity YouTube live',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Duplicate activity',exact:true});
  await dialog.getByLabel('First due date *',{exact:true}).fill('2026-11-26');
  await dialog.getByRole('button',{name:'Duplicate',exact:true}).click();
  await waitFor(page,()=>fixture.S.activities.length===3);
  s=await state(page);activity=s.activities.find(a=>a.title==='YouTube live (copy)');
  assert.equal(activity.subtasks[0].children[0].due,'2026-11-25');assert.equal(activity.subtasks[0].children[0].done,false);
  await page.getByLabel('Actions for WhatsApp reminder',{exact:true}).click();
  await page.locator('.reuse-menu[open]').getByRole('button',{name:'Duplicate',exact:true}).click();
  await waitFor(page,()=>fixture.S.activities[0].subtasks[0].children[1].children.length===2);
  s=await state(page);assert.equal(s.activities[0].subtasks[0].children[1].children[1].done,false);
  await page.getByLabel('Actions for Pre class',{exact:true}).click();
  await page.locator('.reuse-menu[open]').getByRole('button',{name:'Save as reusable group',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Save reusable group',exact:true});
  await dialog.getByLabel('Group name *',{exact:true}).fill('YouTube live setup');
  await dialog.getByRole('button',{name:'Save group',exact:true}).click();
  await waitFor(page,()=>fixture.S.templates.length===1);
  await page.getByRole('button',{name:'+ Add saved group',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Add saved group',exact:true});
  await dialog.getByRole('button',{name:'Add group',exact:true}).click();
  await waitFor(page,()=>fixture.S.activities[0].subtasks.length===2);
  s=await state(page);assert.notEqual(s.activities[0].subtasks[0].id,s.activities[0].subtasks[1].id);
  assert.equal(s.activities[0].subtasks[1].done,false);
  // Whole groups duplicate at the same level and nested insertion respects the depth limit.
  await page.getByLabel('Actions for Pre class',{exact:true}).first().click();
  await page.locator('.reuse-menu[open]').getByRole('button',{name:'Duplicate',exact:true}).click();
  await waitFor(page,()=>fixture.S.activities[0].subtasks.length===3);
  assert.equal((await state(page)).activities[0].subtasks[1].title,'Pre class (copy)');
  await page.getByLabel('Actions for Pre class',{exact:true}).first().click();
  await page.locator('.reuse-menu[open]').getByRole('button',{name:'Add saved group inside',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Add saved group',exact:true});
  assert.equal(await dialog.getByRole('button',{name:'Add group',exact:true}).isDisabled(),true);
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  // New activity: reuse a group, change the date, then create three weekly occurrences.
  await page.getByRole('tab',{name:'Next 7 days',exact:true}).click();
  await page.locator('#new-act').click();
  dialog=page.getByRole('dialog',{name:'New activity',exact:true});
  await dialog.getByLabel('Activity title *',{exact:true}).fill('Recurring live');
  await dialog.getByLabel('Campaign *',{exact:true}).selectOption('c1');
  await dialog.locator('summary').filter({hasText:'Checklist'}).click();
  await dialog.getByRole('button',{name:'+ Add saved group',exact:true}).click();
  await page.getByRole('dialog',{name:'Add saved group',exact:true}).getByRole('button',{name:'Add group',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'New activity',exact:true});
  await dialog.getByLabel('Due date *',{exact:true}).fill('2026-12-03');
  await dialog.locator('summary').filter({hasText:'Repeat activity'}).click();
  await dialog.getByLabel('Repeat',{exact:true}).selectOption('weekly');
  await dialog.getByLabel('Total occurrences (2–52)',{exact:true}).fill('1');
  assert.equal(await dialog.getByRole('button',{name:'Create activity',exact:true}).isDisabled(),true);
  await dialog.getByLabel('Total occurrences (2–52)',{exact:true}).fill('3');
  await dialog.getByRole('button',{name:'Create activity',exact:true}).click();
  await waitFor(page,()=>fixture.S.activities.filter(a=>a.title==='Recurring live').length===3);
  s=await state(page);const repeats=s.activities.filter(a=>a.title==='Recurring live');
  assert.deepEqual(repeats.map(a=>a.dueDate),['2026-12-03','2026-12-10','2026-12-17']);
  assert.deepEqual(repeats.map(a=>a.subtasks[0].due),['2026-12-02','2026-12-09','2026-12-16']);
  // Failure is visible, retry creates exactly one campaign.
  await page.getByRole('tab',{name:'Campaigns',exact:true}).click();
  await page.getByRole('button',{name:'Duplicate Live campaign',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Duplicate campaign',exact:true});
  await page.evaluate(()=>{fixture.failNext=true});
  await dialog.getByRole('button',{name:'Duplicate',exact:true}).click();
  await dialog.getByText("You don't have permission to change this.",{exact:true}).waitFor();
  assert.equal((await state(page)).campaigns.length,2);
  await dialog.getByRole('button',{name:'Duplicate',exact:true}).click();
  await waitFor(page,()=>fixture.S.campaigns.length===3);
  // Mobile: open an activity and repeat from saved details while preserving draft title.
  await page.setViewportSize({width:390,height:844});
  await page.locator('.row-main').filter({hasText:'YouTube live'}).first().click();
  dialog=page.getByRole('dialog',{name:'Activity',exact:true});
  await dialog.getByLabel('Activity title *',{exact:true}).fill('Unsaved title');
  await dialog.getByRole('button',{name:'Repeat activity',exact:true}).click();
  let child=page.getByRole('dialog',{name:'Repeat activity',exact:true});
  await child.getByLabel('First due date *',{exact:true}).fill('2027-01-31');
  await child.getByLabel('Repeat',{exact:true}).selectOption('monthly');
  await child.getByLabel('Total occurrences (2–52)',{exact:true}).fill('3');
  await child.getByRole('button',{name:'Create repeats',exact:true}).click();
  await dialog.waitFor();assert.equal(await dialog.getByLabel('Activity title *',{exact:true}).inputValue(),'Unsaved title');
  s=await state(page);assert.deepEqual(s.activities.slice(-3).map(a=>a.dueDate),['2027-01-31','2027-02-28','2027-03-31']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  fs.mkdirSync(path.join(root,'output/playwright'),{recursive:true});
  await page.screenshot({path:path.join(root,'output/playwright/reuse-mobile.png'),animations:'disabled'});
  await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
  await dialog.getByRole('button',{name:'Discard changes',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(root,'output/playwright/reuse-campaigns-mobile.png'),animations:'disabled'});
  await page.setViewportSize({width:1280,height:1000});
  await page.screenshot({path:path.join(root,'output/playwright/reuse-campaigns-desktop.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: campaign/activity/nested subtask duplication, saved groups, new weekly series, retry, monthly repeats, draft preservation, mobile layout');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close()});
