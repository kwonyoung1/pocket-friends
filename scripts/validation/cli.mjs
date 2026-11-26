import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {assess,assertResults,hashPolicy,parseRequest} from './policy.mjs'
const arg=name=>{const i=process.argv.indexOf('--'+name);return i<0?undefined:process.argv[i+1]}
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
const source=(ref,file)=>execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024})
const output=plan=>{
 if(arg('out'))writeFileSync(arg('out'),JSON.stringify(plan,null,2)+'\n')
 if(process.env.GITHUB_OUTPUT)for(const [k,v]of Object.entries({plan:JSON.stringify(plan),mode:plan.mode,browser:String(plan.required.browser),cloud:String(plan.required.cloud),all_unit:String(plan.checks.allUnit),automation:String(plan.checks.automation),deno:String(plan.checks.deno),unit_tests:JSON.stringify(plan.unitTests),browser_tests:JSON.stringify(plan.browserTests),cloud_tests:JSON.stringify(plan.cloudTests),validated_base:arg('validated-base')??plan.base}))appendFileSync(process.env.GITHUB_OUTPUT,`${k}=${v}\n`)
 const summary=`### Validation policy\n- Requested: ${plan.requested}\n- Automatic minimum: ${plan.minimum}\n- Applied: **${plan.mode}**\n- Head: \`${plan.head}\`\n- Base: \`${plan.base}\`\n- Policy: \`${plan.policyHash}\`\n${plan.reasons.map(r=>'- '+r).join('\n')}\n${Object.entries(plan.skipped).filter(([,v])=>v).map(([k,v])=>`- Intentionally omitted ${k}: ${v}`).join('\n')}\n`
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary)
 console.log(summary)
}
const command=process.argv[2]??'plan'
if(command==='request'){
 const requested=arg('mode')??'AUTO';if(!['AUTO','FAST','STANDARD','FULL'].includes(requested))throw Error('Unknown validation mode')
 const base=git('rev-parse',arg('base')??'origin/main');writeFileSync('validation.request.json',JSON.stringify({requested,base},null,2)+'\n');console.log('Recorded base-bound request in validation.request.json; include it in the PR commit. This cannot lower the independent minimum.')
}else if(command==='gate'){
 const plan=JSON.parse(process.env.VALIDATION_PLAN??readFileSync(arg('plan')??'validation-plan.json','utf8'));assertResults(plan,{unit:process.env.UNIT,browser:process.env.BROWSER,cloud:process.env.CLOUD});console.log('Every required job succeeded; policy skips were verified.')
}else if(command==='run'){
 const plan=JSON.parse(readFileSync(arg('plan')??'validation-plan.json','utf8')),task=arg('task')
 const run=(bin,args,env={})=>execFileSync(bin,args,{stdio:'inherit',env:{...process.env,...env}})
 if(task==='unit'){if(plan.assetFiles?.length)run('node',['scripts/validation/assets.mjs',...plan.assetFiles]);if(plan.checks.automation)run('npm',['run','test:automation']);if(plan.checks.allUnit)run('npm',['test','--','--maxWorkers=2']);else if(plan.unitTests.length)run('npx',['vitest','run',...plan.unitTests]);else console.log('No mapped unit tests: '+plan.skipped.unitSubset)}
 else if(task==='browser'){if(!plan.required.browser)throw Error('Browser is not selected');run('npx',['playwright','test',...plan.browserTests],{VITE_CLOUD_ENABLED:'false'})}
 else if(task==='cloud'){if(!plan.required.cloud)throw Error('Cloud is not selected');run('npx',['playwright','test','--config=playwright.cloud.config.ts',...plan.cloudTests])}
 else throw Error('Unknown task')
}else{
 const base=arg('base')??'origin/main',head=arg('head')??'HEAD',worktree=process.argv.includes('--worktree');let result
 try{
 const baseSha=git('rev-parse',base),headSha=git('rev-parse',head),raw=execFileSync('git',['diff','--raw','--no-abbrev','-z','--no-renames',baseSha,...(worktree?[]:[headSha])],{encoding:'utf8'}).split('\0').filter(Boolean),changes=[]
 if(worktree)for(const path of execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))raw.push(':000000 '+(lstatSync(path).isSymbolicLink()?'120000':lstatSync(path).mode&0o111?'100755':'100644')+' 0 0 A',path)
 for(let i=0;i<raw.length;i+=2){const fields=raw[i].split(' '),status=fields[4],mode=fields[1],path=raw[i+1],binary=mode!=='100644'||/\.(?:png|webp|jpe?g|gif|avif|ico|woff2?)$/i.test(path);changes.push({status,path,mode,before:status==='M'&&!binary?source(baseSha,path):'',after:['A','M'].includes(status)&&!binary?(worktree?readFileSync(path,'utf8'):source(headSha,path)):''})}
 let requested=arg('requested')??'AUTO'
 const requestBase=arg('request-base')?git('rev-parse',arg('request-base')):baseSha,requestChanged=requestBase===baseSha?changes.some(c=>c.path==='validation.request.json'):!!git('diff','--name-only',requestBase,headSha,'--','validation.request.json')
 if(requestChanged){const metadataFile=changes.find(c=>c.path==='validation.request.json');if(metadataFile&&(metadataFile.mode!=='100644'||!['A','M'].includes(metadataFile.status)))throw Error('Request metadata must be a regular file');requested=parseRequest(worktree?readFileSync('validation.request.json','utf8'):source(headSha,'validation.request.json'),requestBase);if(arg('requested')&&arg('requested')!=='AUTO'){const weights=['AUTO','FAST','STANDARD','FULL'];requested=weights[Math.max(weights.indexOf(requested),weights.indexOf(arg('requested')))]}}
 const policyHash=hashPolicy([readFileSync(fileURLToPath(new URL('./policy.mjs',import.meta.url)),'utf8'),readFileSync(fileURLToPath(import.meta.url),'utf8')])
 result=assess(changes,{requested,failure:arg('require-full'),base:baseSha,requestBase,head:worktree?'WORKTREE:'+headSha:headSha,policyHash})
 }catch(e){result=assess([],{requested:arg('requested')??'AUTO',base,head,failure:e.message,policyHash:'fallback-full'})}
 output(result)
}
