import {appendFileSync} from 'node:fs'
import {plan,git} from './policy.mjs'
export const internalMainRun=(run,repo)=>run.head_branch==='main'&&['push','workflow_dispatch'].includes(run.event)&&run.head_repository?.full_name===`${repo.owner}/${repo.repo}`
export const codexBranch=branch=>/^codex\/[a-z0-9][a-z0-9/_-]{0,150}$/.test(branch)
export function trusted(actor,owner,list=''){return new Set([owner,...list.split(',').map(s=>s.trim()).filter(Boolean)]).has(actor)}
function summary(text){if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n')}
export async function submit({github,context,core,branch=context.ref.replace('refs/heads/',''),sha=context.sha,smoke=false,pause=ms=>new Promise(r=>setTimeout(r,ms))}){
 const repo=context.repo
 if(process.env.AUTO_PR_ENABLED!=='true')throw Error('First enable AUTO_PR_ENABLED after one-time setup')
 if(!trusted(context.actor,repo.owner,process.env.TRUSTED_CODEX_ACTORS)||!codexBranch(branch))throw Error('Untrusted actor or branch: automatic PR creation denied')
 let pr=(await github.rest.pulls.list({...repo,state:'open',base:'main',head:`${repo.owner}:${branch}`})).data[0]
 if(!pr)pr=(await github.rest.pulls.create({...repo,base:'main',head:branch,title:smoke?'자동 배포 무변경 스모크 테스트':`Codex: ${branch.slice(6)}`,body:`내부 Codex 작업 브랜치의 자동 PR입니다.\n\n검증 커밋: ${sha}\n안전 정책과 필수 검사, 브랜치 보호 규칙을 모두 통과해야 자동 병합됩니다.`})).data
 // GITHUB_TOKEN-created PR events are suppressed; explicit dispatch is supported.
 let runs=[]
 for(let attempt=0;attempt<3;attempt++){runs=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'deploy.yml',head_sha:sha,per_page:30})).data.workflow_runs;if(runs.some(r=>r.head_sha===sha&&r.conclusion!=='cancelled'))break;if(attempt<2)await pause(2000)}
 if(!runs.some(r=>r.head_sha===sha&&r.conclusion!=='cancelled'))await github.rest.actions.createWorkflowDispatch({...repo,workflow_id:'deploy.yml',ref:branch,inputs:{validation_pr:String(pr.number)}})
 const files=await github.paginate(github.rest.pulls.listFiles,{...repo,pull_number:pr.number})
 if(files.some(f=>/^(?:effects-lab\/|src\/effects-lab\/|public\/effects-lab\/|effects-tests\/|scripts\/.*effects|playwright.effects.config.ts$|package(?:-lock)?\.json$|vite.config.ts$)/.test(f.filename))){
  const effects=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'effects-lab.yml',head_sha:sha,per_page:30})).data.workflow_runs
  if(!effects.some(r=>r.head_sha===sha&&r.conclusion!=='cancelled'))await github.rest.actions.createWorkflowDispatch({...repo,workflow_id:'effects-lab.yml',ref:branch})
 }
 core?.setOutput('pr',String(pr.number));summary(`### PR\n- [#${pr.number}](${pr.html_url})\n- Head: \`${sha}\`\n- Validation explicitly dispatched when absent.`)
 return pr
}
export async function requireProtectedApproval({github,context}){
 const {data}=await github.rest.repos.getEnvironment({...context.repo,environment_name:'release-approval'})
 if(!data.protection_rules?.some(rule=>rule.type==='required_reviewers'&&rule.reviewers?.length))throw Error('release-approval must have required reviewers; automatic empty environments are not approval')
}
export async function strictMainProtection({github,context}){
 const repo=context.repo
 try{
  const p=(await github.rest.repos.getBranchProtection({...repo,branch:'main'})).data
  if(p.required_pull_request_reviews&&p.required_status_checks?.strict&&[...(p.required_status_checks.contexts??[]),...(p.required_status_checks.checks??[]).map(c=>c.context)].includes('build'))return true
 }catch{/* Rulesets may replace legacy branch protection. */}
 try{
  const rules=(await github.request('GET /repos/{owner}/{repo}/rules/branches/{branch}',{...repo,branch:'main'})).data
  return rules.some(r=>r.type==='pull_request')&&rules.some(r=>r.type==='required_status_checks'&&r.parameters?.strict_required_status_checks_policy&&r.parameters.required_status_checks?.some(c=>c.context==='build'))
 }catch{return false}
}
export async function autoMerge({github,context,core,evaluate=plan}){
 const run=context.payload.workflow_run,repo=context.repo
 if(!run||run.head_repository?.full_name!==`${repo.owner}/${repo.repo}`||!codexBranch(run.head_branch??''))return
 const prs=(await github.rest.pulls.list({...repo,state:'open',base:'main',head:`${repo.owner}:${run.head_branch}`})).data
 for(const candidate of prs){
  const pr=(await github.rest.pulls.get({...repo,pull_number:candidate.number})).data
  if(pr.head.repo?.id!==pr.base.repo?.id||pr.draft)continue
  if(run.conclusion!=='success'){
   if(pr.head.sha!==run.head_sha)continue
   const marker=`<!-- codex-ci:${run.head_sha} -->`,comments=await github.paginate(github.rest.issues.listComments,{...repo,issue_number:pr.number})
   if(!comments.some(c=>c.body?.includes(marker)))await github.rest.issues.createComment({...repo,issue_number:pr.number,body:`${marker}\n검사가 통과하지 않아 자동 병합을 중단했습니다. [실패 실행 확인](${run.html_url})\n권한·비밀키·코드 오류를 확인한 뒤 같은 브랜치에서 수정합니다.`})
   continue
  }
  if(process.env.AUTO_MERGE_ENABLED!=='true')continue
  // Require an actual trusted push/smoke run, not a forgeable PR body or label.
  let provenance=false
  const evidence=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'auto-pr.yml',head_sha:pr.head.sha,per_page:30})).data.workflow_runs
  provenance=evidence.some(r=>r.head_sha===pr.head.sha&&r.conclusion==='success'&&trusted(r.actor?.login,repo.owner,process.env.TRUSTED_CODEX_ACTORS)&&r.event==='push')
  if(!provenance){
   const smokeRuns=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'automation-smoke.yml',status:'success',per_page:10})).data.workflow_runs
   for(const smoke of smokeRuns.filter(r=>trusted(r.actor?.login,repo.owner,process.env.TRUSTED_CODEX_ACTORS)&&r.event==='workflow_dispatch')){
    const artifacts=(await github.rest.actions.listWorkflowRunArtifacts({...repo,run_id:smoke.id})).data.artifacts
    if(artifacts.some(a=>a.name===`smoke-pr-${pr.head.sha}`&&!a.expired)){provenance=true;break}
   }
  }
  if(!provenance){summary(`PR #${pr.number}: trusted provenance not found; no merge.`);continue}
  if(!trusted(pr.user.login,repo.owner,process.env.TRUSTED_CODEX_ACTORS)&&pr.user.login!=='github-actions[bot]')continue
  if(!await strictMainProtection({github,context})){summary('Strict main PR/build protection could not be verified; automatic merge stopped.');continue}
  const baseSha=(await github.rest.repos.getCommit({...repo,ref:'main'})).data.sha
  const policy=evaluate(baseSha,pr.head.sha)
  if(policy.reviewRequired){summary(`PR #${pr.number}: protected paths changed; explicit review/merge required.\n${policy.reasons.map(s=>'- '+s).join('\n')}`);continue}
  if(policy.functions.length&&process.env.AUTO_SERVER_DEPLOY_ENABLED!=='true'){summary('Server automatic deployment has not been authorized; merge stopped.');continue}
  const query=await github.graphql(`query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewDecision mergeable mergeStateStatus commits(last:1){nodes{commit{statusCheckRollup{state}}}}}}}`,{owner:repo.owner,name:repo.repo,number:pr.number})
  const gate=query.repository.pullRequest
  if(pr.mergeable!==true||pr.mergeable_state!=='clean'||gate.mergeable!=='MERGEABLE'||gate.reviewDecision==='REVIEW_REQUIRED'||gate.reviewDecision==='CHANGES_REQUESTED'||gate.commits.nodes[0]?.commit.statusCheckRollup?.state!=='SUCCESS')continue
  const checks=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'deploy.yml',branch:pr.head.ref,status:'success',per_page:30})).data.workflow_runs
  let verified=false
  for(const check of checks.slice(0,10)){
   if(check.conclusion!=='success')continue
   const artifacts=(await github.rest.actions.listWorkflowRunArtifacts({...repo,run_id:check.id})).data.artifacts
   if(artifacts.some(a=>a.name===`validated-head-${pr.head.sha}-base-${baseSha}`&&!a.expired)){verified=true;break}
  }
  if(!verified)continue
  // Exact-head merge. GitHub still enforces branch protection/reviews; no bypass API.
  const settings=(await github.rest.repos.get(repo)).data
  const method=settings.allow_squash_merge?'squash':settings.allow_merge_commit?'merge':settings.allow_rebase_merge?'rebase':null
  if(!method)throw Error('No repository merge method is enabled')
  const merged=(await github.rest.pulls.merge({...repo,pull_number:pr.number,sha:pr.head.sha,merge_method:method})).data
  if(!merged.merged)throw Error('GitHub refused the protected merge')
  summary(`PR #${pr.number} merged: \`${merged.sha}\``)
  await github.rest.actions.createWorkflowDispatch({...repo,workflow_id:'deploy.yml',ref:'main'})
 }
}
export async function releasePlan({github,context,core}){
 const repo=context.repo,runs=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'deploy.yml',branch:'main',status:'success',per_page:30})).data.workflow_runs
 let previous
 for(const run of runs.filter(r=>internalMainRun(r,repo)&&r.id!==context.runId&&r.head_sha!==context.sha).slice(0,10)){
  const artifacts=(await github.rest.actions.listWorkflowRunArtifacts({...repo,run_id:run.id})).data.artifacts
  if(artifacts.some(a=>a.name===`release-proof-${run.head_sha}`&&!a.expired)){previous=run;break}
 }
 const base=previous?.head_sha??git('rev-parse',`${context.sha}^`)
 const result=plan(base,context.sha)
 // Initial migration must install health/version metadata in both existing functions.
 const bootstrap=!previous||process.env.BOOTSTRAP_BACKEND==='true'
 if(bootstrap){result.functions=['game','treasure'];result.reviewRequired=true;result.reasons.push('Bootstrap requires explicit production approval')}
 for(const[key,value]of Object.entries({game:result.functions.includes('game'),treasure:result.functions.includes('treasure'),review_required:result.reviewRequired,base}))core.setOutput(key,String(value))
 summary(`### Release plan\n- Commit: \`${context.sha}\`\n- Last successful release: \`${base}\`\n- Functions: ${result.functions.join(', ')||'none'}\n- Explicit approval: ${result.reviewRequired}\n${result.reasons.map(s=>'- '+s).join('\n')}`)
}
export async function reconcile({github,context}){
 if(process.env.AUTO_MERGE_ENABLED!=='true')return
 const repo=context.repo,sha=(await github.rest.repos.getCommit({...repo,ref:'main'})).data.sha
 const runs=(await github.rest.actions.listWorkflowRuns({...repo,workflow_id:'deploy.yml',branch:'main',head_sha:sha,per_page:30})).data.workflow_runs.filter(r=>r.head_sha===sha&&internalMainRun(r,repo))
 // Never loop failed credentials/deployments. Recovery is diagnostic/manual or by Codex.
 if(runs.length)return
 const prs=(await github.rest.repos.listPullRequestsAssociatedWithCommit({...repo,commit_sha:sha})).data
 if(!prs.some(p=>p.merged_at&&p.base.ref==='main'&&p.head.repo?.id===p.base.repo?.id&&codexBranch(p.head.ref)))return
 await github.rest.actions.createWorkflowDispatch({...repo,workflow_id:'deploy.yml',ref:'main'})
}
