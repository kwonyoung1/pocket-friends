import {pathToFileURL} from 'node:url'
export async function verifySite(url,sha,{fetcher=fetch,attempts=6,pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Invalid expected deployment SHA')
 let last
 for(let attempt=0;attempt<attempts;attempt++){
  try{
   const root=new URL(url);if(!root.pathname.endsWith('/'))root.pathname+='/';if(root.protocol!=='https:'&&root.hostname!=='127.0.0.1')throw Error('HTTPS website required')
   const request=async resource=>{const target=new URL(resource,root);target.searchParams.set('release',sha);const r=await fetcher(target,{cache:'no-store',signal:AbortSignal.timeout(15000)});if([401,403].includes(r.status))throw Object.assign(Error(`Access denied (${r.status})`),{fatal:true});if(!r.ok)throw Error(`Website HTTP ${r.status}`);return r}
   const version=await (await request('version.json')).json();if(version.sha!==sha)throw Error('The live website still serves a different commit')
   const html=await (await request('./')).text();if(!html.includes(`name="pocket-build" content="${sha}"`))throw Error('HTML and version metadata disagree')
   const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);if(!scripts.length)throw Error('Website has no executable entry asset')
   for(const src of scripts){if(new URL(src,root).origin!==root.origin)throw Error('Unexpected external entry script');await request(src)}
   return {sha,url:root.href,assets:scripts.length}
  }catch(error){if(error.fatal)throw error;last=error;if(attempt+1<attempts)await pause(10000)}
 }
 throw last
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await verifySite(process.env.SITE_URL||'https://kwonyoung1.github.io/pocket-friends/',process.env.EXPECTED_SHA);console.log(`Verified website ${result.sha}; ${result.assets} entry assets respond.`)}catch(e){console.error(e.message);process.exitCode=1}}
