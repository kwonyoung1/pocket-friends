// Do not deploy a similarly named artifact from another run or attempt.
export async function awaitPagesArtifact({github,repo,runId,artifactId,artifactName,attempts=6,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),info=()=>{}}){
 if(!/^[1-9]\d*$/.test(String(artifactId??'')))throw Error('Pages upload returned no valid artifact_id. Inspect upload-pages-artifact / Upload artifact before retrying.')
 if(!Number.isSafeInteger(runId)||runId<=0||!new RegExp(`^github-pages-${runId}-[1-9]\\d*$`).test(artifactName??''))throw Error('Invalid Pages artifact run/name')
 if(!Number.isInteger(attempts)||attempts<1||attempts>10)throw Error('Invalid artifact lookup limit')
 let names=[]
 for(let attempt=1;attempt<=attempts;attempt++){
  let artifacts
  try{
   artifacts=await github.paginate(github.rest.actions.listWorkflowRunArtifacts,{...repo,run_id:runId,per_page:100})
  }catch(error){
   // Authentication, permissions and other API failures require intervention.
   if(error.status!==404)throw error
   artifacts=[]
  }
  names=artifacts.map(a=>`${a.name} (id=${a.id}, expired=${a.expired})`)
  const matches=artifacts.filter(a=>a.name===artifactName)
  if(matches.length>1)throw Error(`Multiple Pages artifacts named ${artifactName}; refusing ambiguous deployment`)
  const artifact=matches[0]
  if(artifact){
   if(String(artifact.id)!==String(artifactId))throw Error('Pages artifact ID differs from this upload; refusing deployment')
   if(artifact.expired||!(artifact.size_in_bytes>0))throw Error('Pages artifact is expired or empty; upload a fresh artifact')
   info(`Verified Pages artifact: ${artifact.name}, id=${artifact.id}, bytes=${artifact.size_in_bytes}, run=${runId}`)
   return artifact.name
  }
  info(`Pages artifact not yet listed (${attempt}/${attempts}). Expected ${artifactName}, id=${artifactId}. Listed: ${names.join(', ')||'(none)'}`)
  if(attempt<attempts)await pause(2000)
 }
 throw Error(`Pages artifact ${artifactName} (id=${artifactId}) was not listed in run ${runId}. Listed: ${names.join(', ')||'(none)'}. Inspect Upload artifact; do not substitute another artifact.`)
}
