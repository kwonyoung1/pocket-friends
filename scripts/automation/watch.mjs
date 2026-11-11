import {execFileSync} from 'node:child_process'
const call=(...args)=>execFileSync('gh',args,{encoding:'utf8'}).trim()
try{
 const run=process.argv[2];if(!/^\d+$/.test(run??''))throw Error('Usage: node scripts/automation/watch.mjs <run-id>')
 execFileSync('gh',['run','watch',run,'--exit-status','--interval','10'],{stdio:'inherit',timeout:25*60000})
 const details=JSON.parse(call('run','view',run,'--json','conclusion,url,headSha'))
 console.log(JSON.stringify(details))
 if(details.conclusion!=='success')process.exitCode=1
}catch(e){console.error('Validation/deployment did not complete successfully.');console.error('Use gh run view <id> --log-failed to diagnose. Repair code in this Codex session at most twice; never blindly retry credentials, permission, migration or data errors.');process.exitCode=1}
