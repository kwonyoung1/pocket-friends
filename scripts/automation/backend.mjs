import {execFileSync} from 'node:child_process'
import {writeFileSync,appendFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
export function anonJWT(token){try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).role==='anon'}catch{return false}}
export async function health(name,{ref,token,sha,fetcher=fetch}={}){
 if(!['game','treasure'].includes(name)||!/^[a-z0-9-]+$/.test(ref??''))throw Error('Invalid backend target')
 if(!anonJWT(token??''))throw Error('Configure a public legacy anon JWT in SUPABASE_HEALTH_ANON_JWT; never use service_role')
 const r=await fetcher(`https://${ref}.supabase.co/functions/v1/${name}/health`,{headers:{apikey:token,Authorization:`Bearer ${token}`,Origin:'https://kwonyoung1.github.io'},cache:'no-store',signal:AbortSignal.timeout(15000)})
 if(!r.ok)throw Error(`Backend ${name} health HTTP ${r.status}`)
 if(r.headers.get('Access-Control-Allow-Origin')!=='https://kwonyoung1.github.io')throw Error(`Backend ${name} CORS health mismatch`)
 const data=await r.json();if(data.status!=='ok'||data.function!==name||!/^[a-f0-9]{40}$/.test(data.sha)||sha&&data.sha!==sha)throw Error(`Backend ${name} version mismatch`)
 return data.sha
}
export async function deploy(){
 const sha=process.env.DEPLOY_SHA,ref=process.env.PROJECT_REF,token=process.env.SUPABASE_HEALTH_ANON_JWT||process.env.VITE_SUPABASE_ANON_KEY
 if(!/^[a-f0-9]{40}$/.test(sha??''))throw Error('Invalid deploy SHA')
 if(!anonJWT(token??''))throw Error('Missing public anon health JWT; no deployment attempted')
 if(!ref||!process.env.SUPABASE_ACCESS_TOKEN)throw Error('Missing Supabase deployment configuration')
 writeFileSync('supabase/functions/_shared/release.ts',`export const releaseSha=${JSON.stringify(sha)}\n`)
 const result={}
 for(const name of ['game','treasure']){
  if(process.env[`DEPLOY_${name.toUpperCase()}`]!=='true')continue
  let current;try{current=await health(name,{ref,token})}catch(e){if(!/HTTP (404|405)/.test(e.message))throw e /* Only a legacy missing health route may bootstrap. */}
  if(current!==sha)execFileSync('supabase',['functions','deploy',name,'--project-ref',ref],{stdio:'inherit'})
  let error
  for(let attempt=0;attempt<4;attempt++){try{result[name]=await health(name,{ref,token,sha});error=undefined;break}catch(e){error=e;if(/HTTP (401|403)/.test(e.message))break;if(attempt<3)await new Promise(r=>setTimeout(r,5000))}}
  if(error)throw error
  console.log(`Backend ${name}: verified ${sha}`)
 }
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`versions=${JSON.stringify(result)}\n`)
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### Backend\n${Object.entries(result).map(([n,s])=>`- ${n}: ${s}`).join('\n')||'- No function changed.'}\n`)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)deploy().catch(e=>{console.error(e.message);process.exitCode=1})
