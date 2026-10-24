import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {openPreview,root} from './browser.mjs';
const out=root+'.local/qa/tizen3/';
mkdirSync(out,{recursive:true});
const report={scope:'Isolated Chromium; legacy stylesheet removes native CSS variables, inset and flex gap. No TV contacted.',cases:[],failures:[]};
const preview=await openPreview({publicFonts:true});
const pages=[];
const samples=['#utLens','#utLensAlt','#utilFocusLabel','#appFocusName','#focusStatus','#stage','#home','.clock','#dock','.tile','.plate.on-focus','.ph-name','.quiet-utils .u','.settings-group','.setting-choice','.sheet','.appearance','.scene'];
const props=['color','backgroundColor','backgroundImage','fontFamily','fontWeight','opacity','boxShadow','textShadow','width','height','top'];
async function snapshot(p){
 return p.evaluate(({samples,props})=>samples.map(selector=>{
  const el=document.querySelector(selector);
  if(!el)return {selector,missing:true};
  const cs=getComputedStyle(el),r=el.getBoundingClientRect(),styles={};
  props.forEach(k=>styles[k]=cs[k]);
  return {selector,styles,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
 }),{samples,props});
}
try{
 const normal=await preview.browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 const legacy=await preview.browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 pages.push(normal,legacy);
 for(const p of pages){
  p.on('pageerror',e=>report.failures.push({error:e.message}));
  await p.goto(preview.baseURL+'/home/'+(p===legacy?'?legacy=1':''));
  await p.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready());
 }
 assert.equal(await normal.evaluate(()=>CleanFrameLegacy.active),false);
 assert.equal(await legacy.evaluate(()=>CleanFrameLegacy.active),true);
 for(const c of [
  {name:'photo-dock',look:{bg:'photo',layout:'dock',font:'manrope'}},
  {name:'light-dock',look:{bg:'light',layout:'dock'}},
  {name:'dark-list',look:{bg:'dark',layout:'list'}},
  {name:'photo-list',look:{bg:'photo',layout:'list'}},
  {name:'photo-geist',look:{bg:'photo',layout:'dock',font:'geist'}},
  {name:'icons-look',look:{controls:'icons',apps:'icons',focus:'glass'}},
  {name:'utility-focus',nav:'up'},
  {name:'settings',scene:'settings'},
  {name:'home-return',scene:'home'}
 ]){
  for(const p of pages){
   if(c.look)await p.evaluate(v=>ShoreQA.look(v),c.look);
   if(c.nav)await p.evaluate(v=>ShoreQA.nav(v),c.nav);
   if(c.scene)await p.evaluate(v=>ShoreQA.scene(v),c.scene);
   await p.waitForFunction(()=>ShoreQA.ready()&&!/is-reflow|is-font-switch/.test(document.getElementById('stage').className));
  }
  for(const p of pages)await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const a=await snapshot(normal),b=await snapshot(legacy),diff=[];
  a.forEach((node,i)=>{
   if(node.missing||b[i].missing)return;
   for(const prop of props)if(node.styles[prop]!==b[i].styles[prop])diff.push({selector:node.selector,property:prop,modern:node.styles[prop],legacy:b[i].styles[prop]});
   for(const k of ['x','y','width','height'])if(Math.abs(node.rect[k]-b[i].rect[k])>2)diff.push({selector:node.selector,geometry:k,modern:node.rect[k],legacy:b[i].rect[k]});
  });
  const state=await legacy.evaluate(()=>({view:ShoreQA.state().view,focus:ShoreQA.where(),legacy:CleanFrameLegacy.stats}));
  report.cases.push({name:c.name,differences:diff,state});
  console.log(c.name+': '+diff.length+' differences; legacy update '+state.legacy.ms+' ms');
  await legacy.screenshot({path:out+c.name+'.jpg',type:'jpeg',quality:85});
 }
 const unit=await legacy.evaluate(()=>{
  const f=CleanFrameLegacy.resolve;
  return [f('rgba(0,0,0,var(--alpha,.4))',{}),f('var(--a)',{'--a':'var(--b)','--b':'red'}),f('var(--a,blue)',{'--a':'var(--a)'}),f('var(--missing)',{})];
 });
 assert.deepEqual(unit,['rgba(0,0,0,.4)','red','blue',null]);
 const css=readFileSync(root+'app/style-tizen3.css','utf8');
 assert.ok(!/var\(|(?:^|[;{])\s*(?:gap|inset|--[\w-]+)\s*:/.test(css));
 for(const p of pages){await p.evaluate(()=>ShoreQA.scene('home'));await p.keyboard.press('ArrowRight');}
 assert.equal((await normal.evaluate(()=>ShoreQA.where())).focusAction,(await legacy.evaluate(()=>ShoreQA.where())).focusAction);
 await legacy.reload();await legacy.waitForFunction(()=>window.ShoreQA&&ShoreQA.ready());
 assert.equal(await legacy.evaluate(()=>ShoreQA.state().committed.font),'geist');
 if(report.cases.some(c=>c.differences.length))report.failures.push({error:'Visual style or geometry differences; inspect cases.'});
} catch(e){report.failures.push({error:e.stack});}
finally{
 for(const p of pages)await p.close();
 await preview.close();
 writeFileSync(out+'report.json',JSON.stringify(report,null,2));
}
if(report.failures.length){console.error(JSON.stringify(report.failures));process.exitCode=1;}
else console.log('Tizen 3 compatibility checks passed.');
