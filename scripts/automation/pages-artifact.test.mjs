import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {awaitPagesArtifact} from './pages-artifact.mjs'
const artifact={id:42,name:'github-pages-123-2',expired:false,size_in_bytes:1234}
function setup(responses){
 let calls=0,waits=0
 const endpoint=()=>{}
 return {options:{repo:{owner:'owner',repo:'repo'},runId:123,artifactId:'42',artifactName:artifact.name,pause:async ms=>{assert.equal(ms,2000);waits++},github:{rest:{actions:{listWorkflowRunArtifacts:endpoint}},paginate:async(method,args)=>{assert.equal(method,endpoint);assert.equal(args.run_id,123);assert.equal(args.per_page,100);const response=responses[Math.min(calls++,responses.length-1)];if(response instanceof Error)throw response;return response}}},counts:()=>({calls,waits})}
}
test('Pages lookup waits for current upload and ignores older attempts',async()=>{
 const s=setup([[{...artifact,id:41,name:'github-pages-123-1'}],[artifact]])
 assert.equal(await awaitPagesArtifact(s.options),artifact.name)
 assert.deepEqual(s.counts(),{calls:2,waits:1})
})
test('missing upload ID fails before querying or deploying',async()=>{
 const s=setup([[artifact]])
 for(const id of [undefined,'','NaN','0'])await assert.rejects(awaitPagesArtifact({...s.options,artifactId:id}),/no valid artifact_id/)
 assert.equal(s.counts().calls,0)
})
test('missing artifact lookup stops after a fixed bound and reports actual names',async()=>{
 const s=setup([[{...artifact,name:'website-sha'}]])
 await assert.rejects(awaitPagesArtifact({...s.options,attempts:3}),/website-sha/)
 assert.deepEqual(s.counts(),{calls:3,waits:2})
})
test('ambiguous, wrong-ID, expired and empty artifacts fail closed without retry',async()=>{
 for(const [rows,message]of [[[artifact,artifact],/Multiple/],[[{...artifact,id:99}],/ID differs/],[[{...artifact,expired:true}],/expired or empty/],[[{...artifact,size_in_bytes:0}],/expired or empty/]]){
  const s=setup([rows]);await assert.rejects(awaitPagesArtifact(s.options),message);assert.deepEqual(s.counts(),{calls:1,waits:0})
 }
})
test('404 metadata visibility is bounded; permission and other API errors never retry',async()=>{
 const notFound=Object.assign(Error('not found'),{status:404}),s=setup([notFound,[artifact]])
 assert.equal(await awaitPagesArtifact(s.options),artifact.name)
 for(const status of [401,403,429,500]){
  const error=Object.assign(Error('API failure'),{status}),f=setup([error])
  await assert.rejects(awaitPagesArtifact(f.options),e=>e===error);assert.deepEqual(f.counts(),{calls:1,waits:0})
 }
})
test('run/name validation prevents use of another run',async()=>{
 const s=setup([[artifact]])
 await assert.rejects(awaitPagesArtifact({...s.options,artifactName:'github-pages-999-2'}),/run\/name/)
 assert.equal(s.counts().calls,0)
})
test('release and rollback pass the uploaded ID through verification before deploy-pages',()=>{
 for(const file of ['deploy.yml','rollback-pages.yml']){
  const workflow=readFileSync(new URL(`../../.github/workflows/${file}`,import.meta.url),'utf8')
  assert.match(workflow,/uses: actions\/upload-pages-artifact@v3\n        id: pages_upload\n        with:\n          name: github-pages-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/)
  assert.match(workflow,/PAGES_ARTIFACT_ID: \$\{\{ steps.pages_upload.outputs.artifact_id \}\}/)
  assert.match(workflow,/artifact_name: \$\{\{ steps.pages_metadata.outputs.artifact_name \}\}/)
  assert(workflow.indexOf('id: pages_upload')<workflow.indexOf('id: pages_metadata'))
  assert(workflow.indexOf('id: pages_metadata')<workflow.indexOf('uses: actions/deploy-pages@v4'))
  assert.match(workflow,/core.setOutput\('artifact_name',name\)/)
 }
})
