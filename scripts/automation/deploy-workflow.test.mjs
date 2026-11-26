import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'

// Evaluate the actual job expression, including Actions' implicit success()
// when no status-check function is present. No network or deployment is run.
const workflow=readFileSync(new URL('../../.github/workflows/deploy.yml',import.meta.url),'utf8')
const deploy=workflow.split('\n  deploy:\n')[1]
assert(deploy,'Missing website deployment job')
const lines=deploy.split('\n'),start=lines.findIndex(line=>line.startsWith('    if:'))
assert(start>=0,'Missing deployment condition')
const first=lines[start].slice('    if:'.length).trim()
const expression=first==='>-'?lines.slice(start+1).slice(0,lines.slice(start+1).findIndex(line=>!line.startsWith('      '))).map(line=>line.trim()).join(' '):first
function scheduled({results={},cancelled=false,ref='refs/heads/main',event='push',ancestors=['success','success','success','skipped']}={}){
 const needs=Object.fromEntries(['build','plan','backend-gate'].map(name=>[name,{result:results[name]??'success'}]))
 const explicitStatus=/\b(?:always|success|failure|cancelled)\s*\(/.test(expression)
 if(!explicitStatus&&!ancestors.every(result=>result==='success'))return false
 return runInNewContext(`Boolean(${expression})`,{needs,github:{ref,event_name:event},cancelled:()=>cancelled})
}
test('frontend-only release deploys after successful gates despite intentionally skipped backend/approval ancestors',()=>{
 assert.equal(scheduled(),true)
 assert.equal(scheduled({ancestors:['success','skipped','skipped','success']}),true)
})
test('server release deploys only after successful release gates',()=>{
 assert.equal(scheduled({ancestors:['success','success','success','success']}),true)
})
test('failed, skipped, cancelled or missing required release gates never deploy',()=>{
 for(const name of ['build','plan','backend-gate'])for(const result of ['failure','skipped','cancelled','']){
  assert.equal(scheduled({results:{[name]:result}}),false,`${name}=${result}`)
 }
 assert.equal(scheduled({cancelled:true}),false)
})
test('pull requests and non-main dispatches never deploy to production',()=>{
 assert.equal(scheduled({event:'pull_request'}),false)
 assert.equal(scheduled({ref:'refs/heads/codex/fix',event:'workflow_dispatch'}),false)
 assert.equal(scheduled({event:'workflow_dispatch'}),true)
})
test('browser and cloud start after independent classification; required build keeps the policy-aware failure gate',()=>{
 const browser=workflow.split('\n  browser:\n')[1].split('\n  cloud:\n')[0]
 const cloud=workflow.split('\n  cloud:\n')[1].split('\n  build:\n')[0]
 const build=workflow.split('\n  build:\n')[1].split('\n  plan:\n')[0]
 for(const job of [browser,cloud])assert.match(job,/^    needs: changes$/m)
 assert.match(browser,/needs.changes.outputs.browser == 'true'/)
 assert.match(cloud,/needs.changes.outputs.cloud == 'true'/)
 assert.match(browser,/p.browserTests/);assert.match(cloud,/p.cloudTests/)
 assert.match(build,/needs: \[changes, unit, browser, cloud\]/)
 assert.match(build,/required&&result!=='success'/)
 assert.match(build,/result!=='skipped'\|\|!p.skipped\[job\]/)
 assert.match(build,/validated-head-.*-base-/)
})

test('Pages release and rollback pass the immutable upload ID through the bounded OIDC publisher',()=>{
 for(const name of ['deploy.yml','rollback-pages.yml']){
  const source=readFileSync(new URL(`../../.github/workflows/${name}`,import.meta.url),'utf8')
  assert.doesNotMatch(source,/uses: actions\/deploy-pages@/)
  assert.match(source,/uses: actions\/upload-pages-artifact@v3\n        id: pages_upload/)
  assert.match(source,/PAGES_ARTIFACT_ID: \$\{\{ steps.pages_upload.outputs.artifact_id \}\}/)
  assert.match(source,/PAGES_RUN_ATTEMPT: \$\{\{ github.run_attempt \}\}/)
  assert.match(source,/deployUploadedPages\(\{github,core,context,artifactId:process.env.PAGES_ARTIFACT_ID,attempt:process.env.PAGES_RUN_ATTEMPT\}\)/)
  assert.match(source,/timeout-minutes: 12/)
  const publisher=source.split('name: Deploy the exact uploaded Pages artifact ID')[1].split('\n      - ')[0]
  assert.match(publisher,/retries: 0/)
  assert.match(source,/pages: write/);assert.match(source,/id-token: write/)
  assert.match(source,/node scripts\/automation\/verify-site.mjs/)
 }
})
