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
test('independent browser and cloud jobs start in parallel while build still requires every full validation suite',()=>{
 const browser=workflow.split('\n  browser:\n')[1].split('\n  cloud:\n')[0]
 const cloud=workflow.split('\n  cloud:\n')[1].split('\n  build:\n')[0]
 const build=workflow.split('\n  build:\n')[1].split('\n  plan:\n')[0]
 for(const job of [browser,cloud])assert.doesNotMatch(job,/^    needs:/m)
 assert.match(browser,/run: npm run test:e2e/)
 assert.match(cloud,/run: npm run test:cloud/)
 assert.match(build,/needs: \[unit, browser, cloud\]/)
 assert.match(build,/test "\$UNIT" = success && test "\$BROWSER" = success && test "\$CLOUD" = success/)
})

test('Pages release and rollback use the exact official REST-lookup release with attempt-specific names',()=>{
 const pin='f33f41b675f0ab2dc5a6863c9a170fe83af3571e'
 for(const name of ['deploy.yml','rollback-pages.yml']){
  const source=readFileSync(new URL(`../../.github/workflows/${name}`,import.meta.url),'utf8')
  assert.equal(source.match(/uses: actions\/deploy-pages@([^\s]+)/)?.[1],pin)
  const upload=source.split('uses: actions/upload-pages-artifact@v3')[1].split('\n      - ')[0]
  const release=source.split(`uses: actions/deploy-pages@${pin}`)[1].split('\n      - ')[0]
  assert.match(upload,/name: github-pages-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/)
  assert.match(release,/artifact_name: github-pages-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/)
  assert.match(source,/pages: write/)
  assert.match(source,/id-token: write/)
  assert.match(source,/node scripts\/automation\/verify-site.mjs/)
 }
})
