import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {assess,finalMode,numericOnly,assertResults} from './policy.mjs'
const change=(path,before,after,status='M')=>({path,before,after,status})
const stats=()=>change('src/arena/characters.ts','const a={id:"momo",hp:190,atk:45,def:9,cost:2}','const a={id:"momo",hp:200,atk:49,def:9,cost:2}')
const monster=()=>change('src/arena/enemy-pressure.ts','const p=[{hp:1.4,atk:1.6,def:1.2}]','const p=[{hp:1.4,atk:1.7,def:1.2}]')
const skill=()=>change('src/arena/characters.ts','const a={hp:190,skills:[sk("basic","attack",1,0,"enemy","slash",1,1,"hit")]}','const a={hp:190,skills:[sk("basic","attack",1,0,"enemy","slash",1,1,"hit"),sk("active1","burst",30,1,"all-enemies","fire",2,1,"burst")]}')
const image=()=>change('src/arena/art/enemies-test.webp',undefined,undefined)
test('A: AUTO character base numbers -> FAST, related units/build only',()=>{const p=assess([stats()]);assert.equal(p.mode,'FAST');assert.deepEqual(p.unitTests,['src/arena']);assert.equal(p.required.browser,false);assert.equal(p.required.cloud,false);assert.equal(p.checks.typecheck,true);assert.equal(p.checks.build,true)})
test('B: requested FAST existing monster pressure -> FAST',()=>assert.equal(assess([monster()],{requested:'FAST'}).mode,'FAST'))
test('C: requested FAST new AoE skill -> STANDARD with mapped browser/cloud tests',()=>{const p=assess([skill()],{requested:'FAST'});assert.equal(p.minimum,'STANDARD');assert.equal(p.mode,'STANDARD');assert(p.browserTests.includes('tests/arena.spec.ts'));assert(p.cloudTests.includes('cloud-tests/arena.spec.ts'))})
test('D: requested FAST Supabase save code -> FULL with every core suite',()=>{const p=assess([change('src/cloud/server.ts','a','b')],{requested:'FAST'});assert.equal(p.mode,'FULL');assert(p.checks.allUnit&&p.checks.automation&&p.checks.deno&&p.required.cloud&&p.required.browser)})
test('E: requested FULL static image -> FULL; STANDARD may also only raise',()=>{assert.equal(assess([image()],{requested:'FULL'}).mode,'FULL');assert.equal(assess([image()],{requested:'STANDARD'}).mode,'STANDARD')})
test('F: workflow, classifier, package lock and protected growth/economy always force FULL',()=>{for(const path of ['.github/workflows/deploy.yml','scripts/validation/policy.mjs','scripts/automation/github.mjs','package-lock.json','src/arena/fusion.ts','src/arena/shop.ts','src/arena/energy.ts','src/arena/server.ts','supabase/functions/game/index.ts','src/arena/season2.ts','src/arena/legacy-v6/model.ts','AGENTS.md'])assert.equal(assess([change(path,'1','2')],{requested:'FAST'}).mode,'FULL',path)})
test('G: missing/failed/unknown/deleted/renamed/invalid analyses fail closed to FULL',()=>{for(const [changes,options]of [[[],{}],[[image()],{failure:'cannot diff'}],[[change('mystery.bin','a','b')],{}],[[{path:'src/arena/model.ts',status:'D'}],{}],[[{path:'src/arena/model.ts',status:'R100'}],{}],[[image()],{requested:'quick'}]])assert.equal(assess(changes,options).mode,'FULL')})
test('a low request/metadata/commit message cannot override an unrelated sensitive change',()=>{const p=assess([stats(),change('validation.request.json','','{"requested":"FAST"}'),change('src/cloud/server.ts','a','b')],{requested:'FAST'});assert.equal(p.mode,'FULL');assert.equal(finalMode('FAST','FULL'),'FULL')})
test('literal-only checks reject operators, imports, names, additional skills and reward coefficients',()=>{
 assert(numericOnly('const x={hp:1}','const x={hp:2}','src/arena/characters.ts'))
 for(const after of ['const x={hp:1+2}','const x={coins:2}','const x={hp:eval("2")}','const x={hp:2,atk:3}'])assert(!numericOnly('const x={hp:1}',after,'src/arena/characters.ts'))
 const source=readFileSync('src/arena/balance.ts','utf8');assert.equal(assess([change('src/arena/balance.ts',source,source.replace('4.5','4.6'))]).mode,'FULL');assert.equal(assess([change('src/arena/balance.ts',source,source.replace('1.08','1.09'))]).mode,'FAST')
 assert.equal(assess([change('src/arena/model.ts','const x=1','import x from "./evil.ts"; const x=1')]).mode,'FULL')
})
test('new client storage side effects are not downgraded to combat logic',()=>assert.equal(assess([change('src/arena/model.ts','const x=1','const x=localStorage.clear()')]).mode,'FULL'))
test('static CSS and passive SVG are FAST but active SVG/external imports are not',()=>{
 assert.equal(assess([change('src/arena/styles.css','a{}','a{color:red}')]).mode,'FAST')
 assert.equal(assess([change('src/arena/art/a.svg','<svg/>','<svg><path d="M0 0"/></svg>')]).mode,'FAST')
 for(const after of ['<svg onload="alert(1)"/>','<svg><script/></svg>','<svg><image href="x"/></svg>','<!ENTITY x SYSTEM "x">'])assert.equal(assess([change('src/arena/art/a.svg','<svg/>',after)]).mode,'FULL')
})
test('STANDARD always runs a real boot/browser suite even on a documentation-only explicit request',()=>{const p=assess([change('docs/a.md','a','b')],{requested:'STANDARD'});assert.equal(p.required.browser,true);assert.deepEqual(p.browserTests,['tests/game.spec.ts'])})
test('all selected paths exist and no empty subset expands into the full suite accidentally',()=>{const p=assess([skill()]);for(const path of [...p.unitTests,...p.browserTests,...p.cloudTests])assert(existsSync(path),path);assert(p.required.browser&&p.browserTests.length>0);assert(p.required.cloud&&p.cloudTests.length>0)})
test('required failures/cancellations/skips/missing jobs block every mode; only intentional omission is accepted',()=>{
 for(const mode of ['FAST','STANDARD','FULL']){const p=assess([stats()],{requested:mode}),success={unit:'success',browser:p.required.browser?'success':'skipped',cloud:p.required.cloud?'success':'skipped'};assert(assertResults(p,success))
 for(const job of ['unit','browser','cloud'])for(const result of ['failure','cancelled','skipped',undefined,'success']){const altered={...success,[job]:result};if(result===success[job])assert(assertResults(p,altered));else assert.throws(()=>assertResults(p,altered))}
 }assert.throws(()=>assertResults(null,{}));assert.throws(()=>assertResults({mode:'FAST'},{}))
})
test('real monster stat array and existing rarity stat multiplier edits are FAST, not arbitrary logic edits',()=>{
 const stages=readFileSync('src/arena/stages.ts','utf8');assert.equal(assess([change('src/arena/stages.ts',stages,stages.replace('[15,14,25,36]','[16,14,25,36]'))]).mode,'FAST')
 const beasts=readFileSync('src/arena/beasts.ts','utf8');assert.equal(assess([change('src/arena/beasts.ts',beasts,beasts.replace('b.atk*2.4','b.atk*2.5'))]).mode,'FAST')
 assert.equal(assess([change('src/arena/stages.ts',stages,stages.replace('coins:30','coins:31'))]).mode,'FULL')
})
test('static art import replacement is FAST but executable imports remain FULL',()=>{
 const before="import a from './art/old.png';export const ASSETS={enemy:a}"
 assert.equal(assess([change('src/arena/assets.ts',before,before.replace('old.png','new.webp'))]).mode,'FAST')
 assert.equal(assess([change('src/arena/assets.ts',before,before.replace('./art/old.png','./new.ts'))]).mode,'FULL')
})
test('unchanged trusted CSS asset URLs and internal SVG gradients do not force full browser suites',()=>{
 assert.equal(assess([change('src/arena/styles.css','a{background:url(a.png);color:red}','a{background:url(a.png);color:blue}')]).mode,'FAST')
 assert.equal(assess([change('src/arena/styles.css','a{background:url(a.png)}','a{background:url(https://other.invalid/x)}')]).mode,'FULL')
 assert.equal(assess([change('src/arena/art/a.svg','<svg/>','<svg><defs><linearGradient id="a"/></defs><path fill="url(#a)"/></svg>')]).mode,'FAST')
})
test('a symlink or executable disguised as a static image cannot enter FAST',()=>{for(const mode of ['120000','100755','160000'])assert.equal(assess([{...image(),mode}]).mode,'FULL')})
test('pure battle animation STANDARD keeps feature browser coverage without unrelated cloud/Deno work',()=>{
 const p=assess([change('src/arena/Battle.ts','const frame=0','const frame=1')]);assert.equal(p.mode,'STANDARD');assert.equal(p.required.browser,true);assert.equal(p.required.cloud,false);assert.equal(p.checks.deno,false)
 const imagePlan=assess([image()],{requested:'STANDARD'});assert.equal(imagePlan.required.cloud,false)
 const ui=assess([change('src/arena/Arena.tsx','const frame=0','const frame=1')]);assert.equal(ui.required.cloud,true)
})
test('request metadata is not an exception to regular-file checks',()=>assert.equal(assess([{path:'validation.request.json',status:'A',mode:'120000'}]).mode,'FULL'))
