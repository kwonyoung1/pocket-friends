import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {assess,parseRequest,assertResults} from './policy.mjs'
const cli=fileURLToPath(new URL('./cli.mjs',import.meta.url))
function fixture(run){const dir=mkdtempSync(path.join(tmpdir(),'pocket-policy-'));const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();const write=(p,s)=>{mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});writeFileSync(path.join(dir,p),s)};try{git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','Fixture');write('src/arena/characters.ts','const hero={hp:100,atk:20}');git('add','.');git('commit','-qm','base');const base=git('rev-parse','HEAD'),plan=(extra=[])=>{const file=path.join(tmpdir(),'pocket-plan-'+path.basename(dir)+'.json');try{execFileSync(process.execPath,[cli,'plan','--base',base,'--out',file,...extra],{cwd:dir,stdio:'pipe'});return JSON.parse(readFileSync(file,'utf8'))}finally{rmSync(file,{force:true})}};return run({dir,git,write,base,plan})}finally{rmSync(dir,{recursive:true,force:true})}}
test('real git CLI analyzes actual worktree and untracked risky files, not a claimed mode',()=>fixture(({write,plan})=>{write('src/arena/characters.ts','const hero={hp:110,atk:21}');assert.equal(plan(['--worktree']).mode,'FAST');write('supabase/functions/game/index.ts','changed server');assert.equal(plan(['--worktree','--requested','FAST']).mode,'FULL')}))
test('head/base binding, invalid metadata and immutable committed analysis are exercised end to end',()=>fixture(({write,git,plan,base})=>{
 write('src/arena/characters.ts','const hero={hp:110,atk:20}');write('validation.request.json',JSON.stringify({requested:'FULL',base}));git('add','.');git('commit','-qm','request');assert.equal(plan().mode,'FULL');write('validation.request.json','bad JSON');assert.equal(plan().mode,'FULL');assert.equal(plan(['--worktree']).minimum,'FULL');write('validation.request.json',JSON.stringify({requested:'FAST',base:'0'.repeat(40)}));assert.equal(plan(['--worktree']).mode,'FULL')
}))
test('analysis errors produce an explicit FULL plan instead of an empty successful subset',()=>fixture(({plan})=>{const p=plan(['--head','does-not-exist']);assert.equal(p.mode,'FULL');assert.equal(p.required.cloud,true);assert(p.reasons.some(r=>r.startsWith('Analysis failed:')))}))
test('request parser rejects stale/non-enum/body-like requests and only accepts bound metadata',()=>{assert.equal(parseRequest('{"requested":"FAST","base":"abc"}','abc'),'FAST');for(const text of ['{"requested":"FAST","base":"old"}','{"requested":"fast","base":"abc"}','FAST','{"label":"FAST","base":"abc"}'])assert.throws(()=>parseRequest(text,'abc'))})
const workflow=readFileSync(new URL('../../.github/workflows/deploy.yml',import.meta.url),'utf8')
test('CI reads the classifier from main/base, never executes candidate classifier, and preserves SHA proof/live gates',()=>{
 assert.match(workflow,/git show "\$trusted:scripts\/validation\/\$name"/);assert.match(workflow,/node "\$RUNNER_TEMP\/validation-trusted\/cli.mjs" plan/);assert.doesNotMatch(workflow,/node scripts\/validation\/cli.mjs (?:plan|run)/)
 assert.match(workflow,/trusted-policy-unavailable-full/);assert.match(workflow,/validated-head-.*-base-/);assert.match(workflow,/node scripts\/automation\/verify-site.mjs/);assert.match(workflow,/Read-only live mobile boot check/);assert.match(workflow,/Check both backend metadata routes/)
})
test('the actual workflow build gate rejects failures/missing/cancelled results across all grades',()=>{
 const section=workflow.split('\n  build:\n')[1].split('\n  plan:\n')[0],script=section.split("node --input-type=module <<'JS'\n")[1].split('\n          JS')[0].replace(/^\s*import .*\n/m,'')
 const execute=new Function('process','appendFileSync',script)
 for(const mode of ['FAST','STANDARD','FULL']){const p=assess([{path:'src/arena/art/example.webp',status:'M'}],{requested:mode}),good={CHANGES:'success',UNIT:'success',BROWSER:p.required.browser?'success':'skipped',CLOUD:p.required.cloud?'success':'skipped',VALIDATION_PLAN:JSON.stringify(p)};execute({env:good},()=>{})
 for(const job of ['CHANGES','UNIT','BROWSER','CLOUD'])for(const status of ['failure','cancelled','skipped','']){if(good[job]===status)continue;assert.throws(()=>execute({env:{...good,[job]:status}},()=>{}),`${mode}/${job}/${status}`)}
 }
 const tampered=assess([{path:'.github/workflows/deploy.yml',status:'M'}]);tampered.required.cloud=false;tampered.skipped.cloud='forged';assert.throws(()=>assertResults(tampered,{unit:'success',browser:'success',cloud:'skipped'}));assert.throws(()=>execute({env:{CHANGES:'success',UNIT:'success',BROWSER:'success',CLOUD:'skipped',VALIDATION_PLAN:JSON.stringify(tampered)}},()=>{}))
})
test('unreleased server changes cannot be hidden by a later numeric-only update',()=>fixture(({write,git,plan})=>{
 write('src/cloud/server.ts','export const save=1');git('add','.');git('commit','-qm','unreleased server');const main=git('rev-parse','HEAD')
 write('src/arena/characters.ts','const hero={hp:110,atk:20}');write('validation.request.json',JSON.stringify({requested:'FAST',base:main}));git('add','.');git('commit','-qm','numeric')
 const p=plan(['--request-base',main]);assert.equal(p.mode,'FULL');assert.equal(p.requested,'FAST');assert(p.reasons.some(r=>r.includes('src/cloud/server.ts')));assert(!p.reasons.some(r=>r.startsWith('Analysis failed')))
}))
test('unavailable cumulative release evidence forces FULL even for proven literal edits',()=>fixture(({write,git,plan})=>{write('src/arena/characters.ts','const hero={hp:110,atk:20}');git('add','.');git('commit','-qm','numeric');const p=plan(['--require-full','no verified release']);assert.equal(p.minimum,'FULL');assert(p.reasons.some(r=>r.includes('no verified release')))}))
test('baseline API filtering accepts only verified internal main releases and fails closed on missing evidence',async()=>{
 const script=workflow.split('name: Find last verified production baseline')[1].split('          script: |\n')[1].split('\n      - name: Bind changes')[0],execute=new (Object.getPrototypeOf(async function(){}).constructor)('github','context','core',script)
 const output=[],context={repo:{owner:'o',repo:'r'},runId:99,sha:'head'},valid={id:1,head_sha:'released',head_branch:'main',event:'push',head_repository:{full_name:'o/r'}}
 const github={
  rest:{actions:{
   listWorkflowRuns:async()=>({data:{workflow_runs:[{...valid,id:2,head_sha:'fork',head_repository:{full_name:'evil/fork'}},valid]}}),
   listWorkflowRunArtifacts:async({run_id})=>{
    assert.equal(run_id,1)
    return{data:{artifacts:[{name:'release-proof-released',expired:false}]}}
   }
  }}
 }
 await execute(github,context,{setOutput:(...args)=>output.push(args),warning:()=>{}});assert.deepEqual(output,[['sha','released']])
 output.length=0;github.rest.actions.listWorkflowRunArtifacts=async()=>({data:{artifacts:[{name:'release-proof-released',expired:true}]}});await execute(github,context,{setOutput:(...args)=>output.push(args),warning:()=>{}});assert.deepEqual(output,[])
 github.rest.actions.listWorkflowRuns=async()=>{throw Error('API failure')};await execute(github,context,{setOutput:(...args)=>output.push(args),warning:()=>{}});assert.deepEqual(output,[])
})
test('malformed selective plans and FULL plans with missing core checks fail validation before jobs run',()=>{
 const source=workflow.split("node --input-type=module <<'VERIFY'\n")[1].split('\n          VERIFY')[0].replace(/^\s*import .*\n/m,'')
 const execute=new Function('process','readFileSync',source),env={RUNNER_TEMP:'/tmp',DIFF_BASE:'base',TESTED_HEAD:'head'}
 const make=mode=>assess([{path:'src/arena/art/a.webp',status:'M'}],{requested:mode,base:'base',head:'head',policyHash:'a'.repeat(64)})
 for(const mode of ['FAST','STANDARD','FULL']){const p=make(mode);execute({env},()=>JSON.stringify(p))}
 const full=make('FULL');full.checks.allUnit=false;assert.throws(()=>execute({env},()=>JSON.stringify(full)))
 const standard=make('STANDARD');standard.browserTests=[];assert.throws(()=>execute({env},()=>JSON.stringify(standard)))
 const stale=make('FAST');stale.head='other';assert.throws(()=>execute({env},()=>JSON.stringify(stale)))
})
