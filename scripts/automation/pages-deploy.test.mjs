import {test} from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {deployUploadedPages} from './pages-deploy.mjs'
const sha='a'.repeat(40),run=45549364867,artifactId=14890968253
function fixture({artifact={},statuses=['succeed'],getError,createError,statusError,oidcError}={}){
 const calls=[],logs=[],outputs={},waits=[],masked=[],signals=new EventEmitter()
 let getCount=0,statusCount=0,clock=0
 const options={artifactId:String(artifactId),attempt:'2',context:{ref:'refs/heads/main',eventName:'push',sha,runId:run,repo:{owner:'owner',repo:'repo'}},signals,now:()=>clock,pause:async ms=>{waits.push(ms);clock+=ms},core:{info:v=>logs.push(v),warning:v=>logs.push(v),setOutput:(k,v)=>{outputs[k]=v},setSecret:v=>masked.push(v),getIDToken:async()=>{if(oidcError)throw oidcError;return 'fake-oidc-token'}},github:{request:async(route,args)=>{
  calls.push({route,args})
  if(route==='GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}'){
   const error=getError?.(getCount++);if(error)throw error
   return {data:artifact===null?undefined:{id:artifactId,name:`github-pages-${run}-2`,size_in_bytes:22947828,expired:false,workflow_run:{id:run,head_sha:sha,head_branch:'main'},...artifact}}
  }
  // The original failure's inconsistent list/count is never consulted.
  if(route.includes('/actions/runs/')||route.includes('/artifacts?'))return {data:{total_count:1,artifacts:[]}}
  if(route==='POST /repos/{owner}/{repo}/pages/deployments'){if(createError)throw createError;return {data:{id:'deploy-123',page_url:'https://owner.github.io/repo/'}}}
  if(route.endsWith('/cancel'))return {data:{}}
  if(route==='GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}'){
   const i=statusCount++,error=statusError?.(i);if(error)throw error
   return {data:{status:statuses[Math.min(i,statuses.length-1)]}}
  }
  throw Error('Unexpected API route '+route)
 }}}
 return {options,calls,logs,outputs,waits,masked,signals,creates:()=>calls.filter(c=>c.route==='POST /repos/{owner}/{repo}/pages/deployments'),cancels:()=>calls.filter(c=>c.route.endsWith('/cancel'))}
}
const apiError=status=>Object.assign(Error('fixture API error'),{status})
test('publishes the exact upload ID without list/count lookup, retains OIDC/SHA, and waits for succeed',async()=>{
 const f=fixture({statuses:['deployment_in_progress','succeed']})
 const result=await deployUploadedPages(f.options)
 assert.equal(result.artifactId,artifactId);assert.equal(f.creates().length,1);assert.equal(f.cancels().length,0)
 const args=f.creates()[0].args
 assert.equal(args.artifact_id,artifactId);assert.equal(args.pages_build_version,sha);assert.equal(args.oidc_token,'fake-oidc-token')
 assert.deepEqual(f.masked,['fake-oidc-token']);assert(!f.logs.join().includes('fake-oidc-token'))
 assert.equal(f.outputs.status,'succeed');assert.equal(f.outputs.page_url,'https://owner.github.io/repo/')
 assert(!f.calls.some(c=>c.route.includes('/actions/runs/')||c.route.includes('/artifacts?')))
 assert.equal(f.signals.listenerCount('SIGTERM'),0);assert.equal(f.signals.listenerCount('SIGINT'),0)
})
test('malformed metadata and wrong ID/name/run/SHA/branch never request OIDC or create a deployment',async()=>{
 for(const artifact of [null,{id:99},{name:'github-pages-other'},{workflow_run:{id:123,head_sha:sha,head_branch:'main'}},{workflow_run:{id:run,head_sha:'b'.repeat(40),head_branch:'main'}},{workflow_run:{id:run,head_sha:sha,head_branch:'feature'}}]){
  const f=fixture({artifact});await assert.rejects(deployUploadedPages(f.options),/metadata does not match/);assert.equal(f.creates().length,0);assert.equal(f.masked.length,0)
 }
})
test('expired, empty, malformed-size or oversized artifacts fail before deployment',async()=>{
 for(const artifact of [{expired:true},{expired:undefined},{size_in_bytes:0},{size_in_bytes:NaN},{size_in_bytes:1073741825}]){
  const f=fixture({artifact});await assert.rejects(deployUploadedPages(f.options),/expired, empty or exceeds/);assert.equal(f.creates().length,0)
 }
})
test('missing upload IDs and non-main/untrusted events fail before any API',async()=>{
 for(const artifactId of [undefined,'','0','NaN','-1','1.5','9007199254740992']){const f=fixture();await assert.rejects(deployUploadedPages({...f.options,artifactId}),/artifact_id/);assert.equal(f.calls.length,0)}
 for(const change of [{ref:'refs/heads/feature'},{eventName:'pull_request'},{eventName:'workflow_run'}]){const f=fixture();await assert.rejects(deployUploadedPages({...f.options,context:{...f.options.context,...change}}),/approved main/);assert.equal(f.calls.length,0)}
})
test('exact-ID metadata 404 visibility is bounded and never switches artifacts',async()=>{
 const f=fixture({getError:n=>n<2?apiError(404):undefined});await deployUploadedPages(f.options)
 assert.deepEqual(f.waits,[2000,2000]);assert(f.calls.filter(c=>c.route.includes('/actions/artifacts/')).every(c=>c.args.artifact_id===artifactId))
 const missing=fixture({getError:()=>apiError(404)});await assert.rejects(deployUploadedPages(missing.options),/no deployment attempted/)
 assert.equal(missing.calls.length,4);assert.deepEqual(missing.waits,[2000,2000,2000]);assert.equal(missing.creates().length,0)
})
test('metadata permissions/rate/server errors are not blindly retried',async()=>{
 for(const status of [401,403,429,500]){const f=fixture({getError:()=>apiError(status)});await assert.rejects(deployUploadedPages(f.options),new RegExp('HTTP '+status));assert.equal(f.calls.length,1);assert.equal(f.creates().length,0)}
})
test('OIDC failure and an ambiguous creation failure never retry publication',async()=>{
 const oidc=fixture({oidcError:Error('OIDC unavailable')});await assert.rejects(deployUploadedPages(oidc.options),/OIDC unavailable/);assert.equal(oidc.creates().length,0)
 const f=fixture({createError:apiError(500)});await assert.rejects(deployUploadedPages(f.options),/Creation is not retried/);assert.equal(f.creates().length,1);assert.equal(f.cancels().length,0);assert.equal(f.signals.listenerCount('SIGTERM'),0)
})
test('terminal Pages failure never reports success',async()=>{
 for(const status of ['deployment_failed','deployment_content_failed','deployment_cancelled','deployment_lost']){
  const f=fixture({statuses:[status]});await assert.rejects(deployUploadedPages(f.options),new RegExp(status));assert.equal(f.outputs.status,undefined);assert.equal(f.creates().length,1);assert.equal(f.cancels().length,0)
 }
})
test('temporary status errors are bounded; status permission failures stop and cancel',async()=>{
 const f=fixture({statusError:n=>n===0?apiError(503):undefined});await deployUploadedPages(f.options);assert.equal(f.outputs.status,'succeed');assert.equal(f.creates().length,1)
 for(const status of [401,403,429,404,503]){
  const bad=fixture({statusError:()=>apiError(status)});await assert.rejects(deployUploadedPages(bad.options),/could not be verified/);assert.equal(bad.creates().length,1);assert.equal(bad.cancels().length,1);assert.equal(bad.outputs.status,undefined)
 }
})
test('poll-count/time limits cancel a pending deployment exactly once',async()=>{
 for(const limits of [{maxPolls:2},{timeoutMs:1}]){
  const f=fixture({statuses:['deployment_in_progress']});await assert.rejects(deployUploadedPages({...f.options,...limits}),/timed out/)
  assert.equal(f.creates().length,1);assert.equal(f.cancels().length,1);assert.equal(f.outputs.status,undefined);assert.equal(f.signals.listenerCount('SIGTERM'),0)
 }
})
test('runner cancellation waits for cancellation API and cleans up handlers',async()=>{
 const f=fixture({statuses:['deployment_in_progress']});let finished=false
 f.options.pause=async()=>{f.signals.emit('SIGTERM')}
 const original=f.options.github.request
 f.options.github.request=async(route,args)=>{if(route.endsWith('/cancel')){await Promise.resolve();finished=true}return original(route,args)}
 await assert.rejects(deployUploadedPages(f.options),/cancelled/);assert.equal(finished,true);assert.equal(f.cancels().length,1);assert.equal(f.signals.listenerCount('SIGTERM'),0)
})

test('creation can return a scoped status_url; missing or foreign IDs never trigger another create',async()=>{
 for(const response of [{status_url:'https://api.github.com/repos/owner/repo/pages/deployments/dep-from-url'},{} ,{status_url:'https://example.com/repos/owner/repo/pages/deployments/foreign'}]){
  const f=fixture(),original=f.options.github.request
  f.options.github.request=async(route,args)=>{const result=await original(route,args);return route==='POST /repos/{owner}/{repo}/pages/deployments'?{data:response}:result}
  if(response.status_url?.startsWith('https://api.github.com/repos/owner/repo/')){const result=await deployUploadedPages(f.options);assert.equal(result.id,'dep-from-url')}
  else await assert.rejects(deployUploadedPages(f.options),/no valid deployment ID/)
  assert.equal(f.creates().length,1)
 }
})
