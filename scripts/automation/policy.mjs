import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import path from 'node:path'
export const entries={game:'supabase/functions/game/index.ts',treasure:'supabase/functions/treasure/index.ts'}
export const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim()
export function dependencies(entry,read=file=>readFileSync(file,'utf8')){
 const seen=new Set()
 function visit(file){if(seen.has(file))return;seen.add(file);const source=read(file)
  const imports=[...source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s*)?['"]([^'"]+)['"]/g),...source.matchAll(/\bimport\(['"]([^'"]+)['"]\)/g)]
  for(const [,specifier]of imports){if(!specifier.startsWith('.'))continue;let target=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));if(!/\.(?:tsx?|m?js|json)$/.test(target))target+='.ts';if(target.endsWith('.json')){seen.add(target);continue}visit(target)}
 }
 visit(entry);return seen
}
const sensitive=[/^\.github\//,/^scripts\//,/^AGENTS\.md$/,/^package(?:-lock)?\.json$/,/^(?:vite|playwright|tsconfig|vitest).*\.(?:ts|json)$/,/^supabase\//,/\.sql$/i,/^\.env/,/^src\/(?:game|interaction)\.ts$/,/^src\/cloud\/.*\.ts$/,/^src\/match3\/(?:rewardServer|replay|rules|model|rewards|board|config).*\.ts$/,/^src\/(?:progression|trade|equipment|status)\/(?:model|config|balance|enhancement)\.ts$/,/^src\/expansion\/(?:model|config)\.ts$/]
export function classify(changes,graphs){
 const functions=Object.entries(graphs).filter(([,files])=>changes.some(c=>files.has(c.path))).map(([name])=>name)
 const reasons=changes.filter(c=>sensitive.some(rule=>rule.test(c.path))||c.status==='D'&&!/^(?:docs\/|tests\/|cloud-tests\/)|\.test\./.test(c.path)).map(c=>`${c.status}: ${c.path}`)
 return {functions,reviewRequired:reasons.length>0,reasons,changed:changes.map(c=>c.path)}
}
export function plan(base,head='HEAD'){
 const raw=execFileSync('git',['diff','--name-status','-z','--no-renames',base,head],{encoding:'utf8'}).split('\0').filter(Boolean),changes=[]
 for(let i=0;i<raw.length;i+=2)changes.push({status:raw[i],path:raw[i+1]})
 const graphs={}
 for(const[name,entry]of Object.entries(entries)){
  const files=new Set()
  for(const ref of [base,head]){try{for(const file of dependencies(entry,f=>execFileSync('git',['show',`${ref}:${f}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']})))files.add(file)}catch(error){throw Error(`Cannot resolve ${name} dependencies at ${ref}: ${error.message.split('\n')[0]}`)}}
  graphs[name]=files
 }
 return {...classify(changes,graphs),base,head:git('rev-parse',head)}
}
