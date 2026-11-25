// GitHub Pages REST API, authenticated with the existing job token + OIDC.
// Consume the immutable upload ID. Never search or select an artifact by a list/count.
const terminal=new Set(['deployment_failed','deployment_content_failed','deployment_cancelled','deployment_lost'])
const integer=(v)=>Number.isSafeInteger(Number(v))&&Number(v)>0
export async function deployUploadedPages({github,core,context,artifactId,attempt,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=()=>Date.now(),signals=process,maxPolls=120,timeoutMs=600000}){
 if(context.ref!=='refs/heads/main'||!['push','workflow_dispatch'].includes(context.eventName))throw Error('Pages publication requires an approved main release')
 if(!/^[a-f0-9]{40}$/.test(context.sha??'')||!integer(context.runId)||!integer(attempt)||!/^\d+$/.test(String(attempt)))throw Error('Invalid Pages run/attempt/SHA')
 if(!/^[1-9]\d*$/.test(String(artifactId??''))||!integer(artifactId))throw Error('Upload returned no valid artifact_id; inspect Upload artifact')
 if(!Number.isInteger(maxPolls)||maxPolls<1||maxPolls>120||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>600000)throw Error('Invalid Pages status wait limit')
 const repo=context.repo,id=Number(artifactId),expectedName=`github-pages-${context.runId}-${attempt}`
 const request=(route,args={})=>github.request(route,{...repo,...args,headers:{'X-GitHub-Api-Version':'2022-11-28'},request:{timeout:15000}})
 let artifact
 for(let n=0;n<4;n++){
  try{artifact=(await request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}',{artifact_id:id})).data;break}
  catch(error){if(error.status!==404||n===3)throw Error(`Pages artifact ${id} could not be read (HTTP ${error.status??'unknown'}); no deployment attempted`);await pause(2000)}
 }
 if(!artifact||artifact.id!==id||artifact.name!==expectedName||artifact.workflow_run?.id!==Number(context.runId)||artifact.workflow_run?.head_sha!==context.sha||artifact.workflow_run?.head_branch!=='main')throw Error(`Artifact ${id} metadata does not match this main run, attempt, name and SHA; no deployment attempted`)
 if(artifact.expired!==false||!integer(artifact.size_in_bytes)||artifact.size_in_bytes>1073741824)throw Error(`Artifact ${id} is expired, empty or exceeds the Pages size limit; no deployment attempted`)
 core.info(`Verified uploaded Pages artifact ${id}: ${artifact.name}, ${artifact.size_in_bytes} bytes`)
 const oidc=await core.getIDToken();if(!oidc)throw Error('Pages OIDC token is missing; id-token: write is required')
 core.setSecret(oidc)
 let deploymentId,cancelled=false,cancelPromise,complete=false
 const cancel=()=>{
  if(cancelPromise)return cancelPromise
  if(!deploymentId||complete)return Promise.resolve()
  cancelPromise=(async()=>{try{await request('POST /repos/{owner}/{repo}/pages/deployments/{deploymentId}/cancel',{deploymentId});core.info(`Cancelled Pages deployment ${deploymentId}`)}catch{core.warning(`Could not cancel Pages deployment ${deploymentId}; inspect its status before retrying`)}})()
  return cancelPromise
 }
 const onCancel=()=>{cancelled=true;void cancel()}
 signals.on('SIGINT',onCancel);signals.on('SIGTERM',onCancel)
 try{
  let created
  try{created=(await request('POST /repos/{owner}/{repo}/pages/deployments',{artifact_id:id,pages_build_version:context.sha,oidc_token:oidc})).data}
  catch(error){throw Error(`Pages creation failed (HTTP ${error.status??'unknown'}). Creation is not retried; inspect Pages before another attempt.`)}
  const prefix=`${context.apiUrl??'https://api.github.com'}/repos/${repo.owner}/${repo.repo}/pages/deployments/`
  const fallback=typeof created?.status_url==='string'&&created.status_url.startsWith(prefix)?created.status_url.slice(prefix.length):''
  const candidate=String(created?.id??fallback)
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(candidate))throw Error('Pages creation returned no valid deployment ID; inspect Pages before retrying')
  deploymentId=candidate
  core.info(`Created Pages deployment ${deploymentId} from artifact ${id}`)
  const started=now();let failures=0
  for(let poll=0;poll<maxPolls&&now()-started<timeoutMs;poll++){
   if(cancelled)throw Error('Pages publication cancelled')
   let status
   try{status=(await request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}',{deploymentId})).data?.status;failures=0}
   catch(error){if((error.status===404||error.status>=500)&&++failures<3){await pause(5000);continue}throw Error(`Pages status could not be verified (HTTP ${error.status??'unknown'})`)}
   if(status==='succeed'){
    if(cancelled)throw Error('Pages publication cancelled')
    complete=true
    const pageUrl=created.page_url||`https://${repo.owner}.github.io/${repo.repo}/`
    core.setOutput('page_url',pageUrl);core.setOutput('status','succeed');core.setOutput('deployment_id',deploymentId)
    core.info(`Pages deployment ${deploymentId} succeeded`)
    return {id:deploymentId,pageUrl,artifactId:id}
   }
   if(terminal.has(status)){complete=true;throw Error(`Pages deployment ${deploymentId} ended with ${status}`)}
   if(typeof status!=='string'||!status)throw Error('Pages status response has no status')
   core.info(`Pages deployment ${deploymentId}: ${status}`)
   await pause(5000)
  }
  throw Error('Pages publication status timed out; success was not confirmed')
 }catch(error){await cancel();throw error}
 finally{signals.removeListener('SIGINT',onCancel);signals.removeListener('SIGTERM',onCancel)}
}
