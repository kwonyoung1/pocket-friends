import {createHash} from 'node:crypto'
export const POLICY_VERSION=1
export const MODES=['FAST','STANDARD','FULL']
export function finalMode(requested='AUTO',minimum='FULL'){
 if(!['AUTO',...MODES].includes(requested)||!MODES.includes(minimum))return 'FULL'
 return MODES[Math.max(MODES.indexOf(minimum),MODES.indexOf(requested))]
}
const sensitive=/^(?:\.github\/|scripts\/|supabase\/|src\/cloud\/|src\/arena\/(?:server|state|beast-state|beast-owner|identity|fusion|beast-shop|shop|shop-state|season2|energy|replay|legacy[^/]*\/)|src\/(?:progression|trade|equipment|expansion)\/|src\/(?:game|interaction)\.ts$|package(?:-lock)?\.json$|AGENTS\.md$|(?:vite|vitest|playwright|tsconfig)|\.env)/
const hazardous=/\b(?:supabase|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|coins|chests|inventory|ownership|owned|reward|rewards|firstRewarded|firstBonusGranted|growArena|save|load|authorize|authenticate|password|token)\b/i
const numericFiles=new Set(['src/arena/tower/config.ts','src/arena/balance.ts','src/arena/enemy-pressure.ts','src/arena/characters.ts','src/arena/beasts.ts','src/arena/stages.ts'])
const stats=new Set(['hp','atk','def','spd','power','supportPower','pierce','breakPower','bonusDebuff','drain'])
/** Conservative lexical comparison: never evaluates candidate source. Unknown syntax refuses FAST. */
export function tokens(source){
 const out=[];let i=0
 while(i<source.length){const rest=source.slice(i),space=/^\s+/.exec(rest);if(space){i+=space[0].length;continue}
  if(rest.startsWith('//')){const n=rest.indexOf('\n');i=n<0?source.length:i+n;continue}
  if(rest.startsWith('/*')){const n=rest.indexOf('*/',2);if(n<0)return null;i+=n+2;continue}
  const quote=source[i];if(['"',"'",'`'].includes(quote)){let j=i+1;while(j<source.length){if(source[j]==='\\'){j+=2;continue}if(source[j]===quote)break;j++}if(j>=source.length)return null;out.push({kind:'text',value:source.slice(i,j+1)});i=j+1;continue}
  const number=/^(?:0[xX][\da-fA-F]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(rest)
  if(number){if(!Number.isFinite(Number(number[0])))return null;out.push({kind:'number',value:number[0]});i+=number[0].length;continue}
  const word=/^[\p{L}_$][\p{L}\p{N}_$]*/u.exec(rest);if(word){out.push({kind:'word',value:word[0]});i+=word[0].length;continue}
  // Regex literals are opaque tokens: numbers inside a pattern can never be stat edits.
  const previous=out.at(-1),operand=previous&&(previous.kind==='number'||previous.kind==='text'||/^(?:[\p{L}\p{N}_$]+|\)|\])$/u.test(previous.value)&&!['return','throw','case','yield'].includes(previous.value))
  if(quote==='/'&&!operand){let j=i+1,inClass=false;for(;j<source.length;j++){if(source[j]==='\\'){j++;continue}if(source[j]==='[')inClass=true;if(source[j]===']')inClass=false;if(source[j]==='/'&&!inClass)break;if(source[j]==='\n')return null}if(j>=source.length)return null;j++;while(/[a-z]/i.test(source[j]??'')&&j<source.length)j++;out.push({kind:'text',value:source.slice(i,j)});i=j;continue}
  const op=/^(?:===|!==|=>|\*\*|\?\.|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|\+=|-=|\*=|\/=|\.\.\.)/.exec(rest)?.[0]??quote
  out.push({kind:'operator',value:op});i+=op.length
 }return out
}
function functionRange(ts,name){const start=ts.findIndex((t,i)=>t.value==='function'&&ts[i+1]?.value===name);if(start<0)return[-1,-1];let open=ts.findIndex((t,i)=>i>start&&t.value==='{'),depth=0;for(let i=open;i<ts.length;i++){if(ts[i].value==='{')depth++;if(ts[i].value==='}'&&!--depth)return[open,i]}return[-1,-1]}
function numericSlots(ts,file){
 const allowed=new Set(),stack=[],range=file==='src/arena/balance.ts'?functionRange(ts,'stageDifficulty'):[-1,-1]
 for(let i=0;i<ts.length;i++){const t=ts[i],v=t.value
  if('([{'.includes(v)&&v.length===1)stack.push({open:v,callee:ts[i-1]?.value,arg:0})
  else if(')]}'.includes(v)&&v.length===1)stack.pop()
  else if(v===','&&stack.at(-1)?.open==='(')stack.at(-1).arg++
  if(v===','&&stack.at(-1)?.open==='{')stack.at(-1).stat=null
  if(v===':'&&stack.at(-1)?.open==='{')stack.at(-1).stat=stats.has(ts[i-1]?.value.replace(/^['"]|['"]$/g,''))?ts[i-1].value:null
  if(t.kind!=='number')continue
  const prop=ts[i-2]?.value.replace(/^['"]|['"]$/g,''),direct=ts[i-1]?.value===':'&&['{',','].includes(ts[i-3]?.value)&&stats.has(prop)
  const call=stack.at(-1),coefficient=call?.open==='('&&(['sk','skill'].includes(call.callee)&&call.arg===6||call.callee==='effect'&&call.arg===2)
  let statExpression=false
  for(let n=i-1,depth=0;n>=0;n--){const token=ts[n].value;if([')',']','}'].includes(token))depth++;if(['(','[','{'].includes(token)){if(depth===0)break;depth--}if(depth===0&&token===',')break;if(depth===0&&token===':'&&stats.has(ts[n-1]?.value.replace(/^['"]|['"]$/g,''))&&['{',','].includes(ts[n-2]?.value)){statExpression=true;break}}
  let start=i-1;while(start>=0&&![';','{','}'].includes(ts[start].value))start--
  let end=i+1;while(end<ts.length&&![';','{','}'].includes(ts[end].value))end++
  const statement=ts.slice(start+1,end).map(t=>t.kind==='number'?'#':t.value).join('')
  const statAssignment=/^([\w$]+)\.(hp|atk|def|spd)=(?:Math\.(?:round|ceil|floor)\()?\1\.\2\*#\)?$/.test(statement)||/^[\w$]+\.(?:hp|atk|def|spd)\*=#$/.test(statement)
  if(direct||statExpression||stack.some(frame=>frame.stat)||statAssignment||coefficient||i>range[0]&&i<range[1])allowed.add(i)
 }return allowed
}
export function numericOnly(before,after,file){
 const a=tokens(before),b=tokens(after);if(!a||!b||a.length!==b.length)return false
 const allowed=numericSlots(a,file);let changed=0
 for(let i=0;i<a.length;i++){if(a[i].kind!==b[i].kind)return false;if(a[i].value===b[i].value)continue;if(a[i].kind!=='number'||!allowed.has(i))return false;changed++}
 return changed>0
}
const areaTests={
 tower:{unit:['src/arena/tower'],browser:['tests/tower.spec.ts'],cloud:['cloud-tests/tower.spec.ts']},
 arena:{unit:['src/arena'],browser:['tests/arena.spec.ts'],cloud:['cloud-tests/arena.spec.ts','cloud-tests/fusion.spec.ts','cloud-tests/fairy-update.spec.ts']},
 humans:{unit:['src/humans'],browser:['tests/humans.spec.ts'],cloud:[]},
 effects:{unit:['src/effects'],browser:['tests/care-effects.spec.ts'],cloud:[]},
 room:{unit:['src/game.test.ts'],browser:['tests/game.spec.ts','tests/interactions.spec.ts'],cloud:['cloud-tests/cloud.spec.ts']},
}
export function assetImportsOnly(before,after){
 const a=tokens(before),b=tokens(after);if(!a||!b||a.length!==b.length)return false;let changed=false
 const image=/^['"]\.\/art\/[\w/-]+\.(?:png|webp|svg|jpe?g|gif|avif)(?:\?url)?['"]$/
 for(let i=0;i<a.length;i++){if(a[i].value===b[i].value)continue;if(a[i].kind!=='text'||b[i].kind!=='text'||a[i-1]?.value!=='from'||!image.test(a[i].value)||!image.test(b[i].value))return false;changed=true}
 return changed
}
export function staticCss(before,after){
 const links=source=>source.match(/@import[^;]*;|url\s*\([^)]*\)/gi)??[]
 return typeof after==='string'&&!/expression\s*\(|behavior\s*:|-moz-binding/i.test(after)&&JSON.stringify(links(before??''))===JSON.stringify(links(after))
}
export function passiveSvg(source){return typeof source==='string'&&!/<!|<\s*(?:script|foreignObject|image|use|animate|set|iframe|object|embed)|\bon\w+\s*=|(?:href|url|@import)\s*[:=(]/i.test(source.replace(/url\(\s*['"]?#[\w.-]+['"]?\s*\)/gi,''))}
/** Strength and execution scope are independent. Shared/tooling/unknown paths fail closed. */
export function impactScope(changes,failure){
 const reasons=[],areas=new Set();if(failure||!changes?.length)return {scope:'all',reasons:['Missing or failed dependency analysis']}
 for(const c of changes){const p=c.path??'';if(!['A','M'].includes(c.status)||c.mode&&c.mode!=='100644')return{scope:'all',reasons:['Unverifiable status or mode: '+p]}
  if(p==='validation.request.json'||/^docs\/.*\.(?:md|csv|json)$/.test(p)||/^(?:README|CHANGELOG)\.md$/.test(p))continue
  let area=/^src\/arena\//.test(p)||/^(?:tests\/(?:arena|tower)|cloud-tests\/(?:arena[^/]*|tower|beasts|fusion|fairy-update|season2|shop-season|skill-balance|integrated-growth))\.spec\.tsx?$/.test(p)?'arena':/^src\/match3\//.test(p)||/^(?:tests|cloud-tests)\/match3[^/]*\.spec\.tsx?$/.test(p)?'match3':/^src\/sichuan\//.test(p)||/^tests\/sichuan[^/]*\.spec\.tsx?$/.test(p)?'sichuan':null
  if(!area)return{scope:'all',reasons:['Shared, tooling or unmapped boundary: '+p]}
  if(p.endsWith('.css')){const selectors=[...(c.after??'').matchAll(/(?:^|})\s*([^{}]+)\{/g)].flatMap(m=>m[1].split(','));if(!staticCss(c.before,c.after)||!selectors.length||selectors.some(s=>!/^\s*\.(?:tower-|starlight-arena|arena-|battle-|enemy-|party-|hero-|roster|skill-)/.test(s)))return{scope:'all',reasons:['Unresolved global CSS: '+p]}}
  if(p.startsWith('src/')&&!/\.test\.tsx?$/.test(p)&&/\.tsx?$/.test(p)){
   const imports=source=>[...(source??'').matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]),old=new Set(imports(c.before)),added=imports(c.after).filter(x=>!old.has(x))
   // New relative imports may only stay within the owning feature; existing audited bridges remain unchanged.
   const root=p.split('/').slice(0,2).join('/'),base=p.split('/').slice(0,-1)
   for(const imp of added){if(!imp.startsWith('.')){if(!['react','pixi.js','gsap','lucide-react'].includes(imp))return{scope:'all',reasons:['Unresolved external dependency: '+p+' -> '+imp]};continue;}const parts=[...base];for(const part of imp.split('/')){if(part==='..')parts.pop();else if(part!=='.')parts.push(part)}if(!parts.join('/').startsWith(root+'/'))return{scope:'all',reasons:['New cross-feature dependency: '+p+' -> '+imp]}}
   if(/\bimport\s*\(\s*[^'"\s]/.test(c.after??''))return{scope:'all',reasons:['Unresolved dynamic import: '+p]}
  }
  areas.add(area);reasons.push(p+': '+area+' feature boundary')
 }
 if(areas.size!==1)return{scope:'all',reasons:['Mixed or missing feature boundaries']}
 return {scope:[...areas][0],reasons}
}
const scopedTests={
 arena:{browser:['tests/arena.spec.ts','tests/tower.spec.ts'],cloud:['cloud-tests/arena-polish.spec.ts','cloud-tests/arena.spec.ts','cloud-tests/beasts.spec.ts','cloud-tests/fusion.spec.ts','cloud-tests/fairy-update.spec.ts','cloud-tests/season2.spec.ts','cloud-tests/shop-season.spec.ts','cloud-tests/skill-balance.spec.ts','cloud-tests/integrated-growth.spec.ts','cloud-tests/tower.spec.ts']},
 match3:{browser:['tests/match3'],cloud:['cloud-tests/match3.spec.ts','cloud-tests/treasure-v4.spec.ts']},
 sichuan:{browser:['tests/sichuan'],cloud:['cloud-tests/cloud.spec.ts','--grep','Sichuan|competition|shuffle|transient path']},
}
export function assess(changes,{requested='AUTO',failure,policyHash='unbound',base='',requestBase=base,head=''}={}){
 let minimum='FAST';const reasons=[],areas=new Set(),assetFiles=[];let unknown=!!failure,needsCloud=false
 if(!changes?.length){unknown=true;reasons.push('No verifiable changed files; FULL fallback')}
 if(failure)reasons.push('Analysis failed: '+failure)
 const raise=(mode,reason)=>{if(MODES.indexOf(mode)>MODES.indexOf(minimum))minimum=mode;reasons.push(reason)}
 for(const c of changes??[]){const p=c.path
  if(p==='validation.request.json'){if(c.mode&&c.mode!=='100644'||!['A','M'].includes(c.status))raise('FULL','Invalid request metadata file mode/status');reasons.push('Request metadata cannot lower the inferred mode');continue}
  if(!p||!['A','M'].includes(c.status)){unknown=true;raise('FULL',`${p}: deletion/rename/unrecognized status`);continue}
  if(c.mode&&c.mode!=='100644'){raise('FULL',`${p}: non-regular/executable file mode`);continue}
  if(sensitive.test(p)||/\.sql$/i.test(p)||/\b(?:auth|storage|reward|session|save|security)\b/i.test(p)){raise('FULL',`${p}: server/data/security/tooling boundary`);continue}
  if(/^docs\/.*\.(?:md|json)$/.test(p)||/^(?:README|CHANGELOG)\.md$/.test(p)){reasons.push(`${p}: documentation only`);continue}
  if(/^(?:src\/assets\/|src\/arena\/art\/|public\/).*\.(?:png|webp|jpe?g|gif|avif|ico|woff2?)$/i.test(p)){assetFiles.push(p);if(p.startsWith('src/arena/'))areas.add('arena');else areas.add('room');reasons.push(`${p}: static asset; build checks references`);continue}
  if(/^src\/.*\.css$/.test(p)&&staticCss(c.before,c.after)){areas.add(p.startsWith('src/arena/')?'arena':'room');reasons.push(`${p}: static CSS without external imports`);continue}
  if(/^src\/arena\/art\/.*\.svg$/.test(p)&&passiveSvg(c.after)){assetFiles.push(p);areas.add('arena');reasons.push(`${p}: passive SVG image`);continue}
  if(p==='src/arena/assets.ts'&&c.status==='M'&&assetImportsOnly(c.before??'',c.after??'')){areas.add('arena');reasons.push(`${p}: static image import targets only`);continue}
  if(numericFiles.has(p)&&c.status==='M'&&typeof c.before==='string'&&typeof c.after==='string'&&numericOnly(c.before,c.after,p)){areas.add('arena');reasons.push(`${p}: verified existing stat/coefficient literals only`);continue}
  if(['src/arena/balance.ts','src/arena/stages.ts'].includes(p)){raise('FULL',`${p}: non-stat changes may affect rewards or unlocks`);continue}
  if(p==='src/arena/tower/TowerPanel.tsx'||/^src\/arena\/(?:model|characters|beasts|stages|balance|enemy-pressure|targeting|resonance|Battle|Arena|Party|integration|assets|monster-art)\.(?:ts|tsx)$/.test(p)){
   areas.add(p==='src/arena/tower/TowerPanel.tsx'?'tower':'arena');needsCloud||=!/\/(?:Battle|assets|monster-art)\.(?:ts|tsx)$/.test(p);const a=tokens(c.before??''),b=tokens(c.after??''),oldValues=new Set(a?.map(t=>t.value)),newValues=new Set(b?.map(t=>t.value)),removed=a?.filter(t=>!newValues.has(t.value))??[],added=b?.filter(t=>!oldValues.has(t.value))??[]
   const danger=[...removed,...added].some(t=>hazardous.test(t.value)),imports=source=>(source.match(/^\s*import[^\n]*/gm)??[]).join('\n')
   if(!a||!b||danger||imports(c.before??'')!==imports(c.after??''))raise('FULL',`${p}: uncertain imports or data-related logic`)
   else raise('STANDARD',`${p}: combat/party/UI control logic`)
   continue
  }
  unknown=true;raise('FULL',`${p}: not in the conservative allowlist`)
 }
 if(unknown)minimum='FULL'
 const mode=finalMode(requested,minimum);if(!['AUTO',...MODES].includes(requested))reasons.push('Invalid requested mode; FULL fallback')
 if(mode!==minimum)reasons.push(`Requested ${requested} raises ${minimum} to ${mode}`)
 const impact=impactScope(changes,failure),scope=mode==='FULL'?impact.scope:'all',full=mode==='FULL',selected=[...areas].map(a=>areaTests[a]),union=key=>[...new Set(selected.flatMap(a=>a[key]))]
 const unitTests=full?[]:union('unit'),browserTests=full?(scopedTests[scope]?.browser??[]):union('browser'),cloudTests=full?(scopedTests[scope]?.cloud??[]):!needsCloud?[]:union('cloud')
 if(mode==='STANDARD'&&!browserTests.length)browserTests.push('tests/game.spec.ts')
 const browser=full||mode==='STANDARD',cloud=full||mode==='STANDARD'&&cloudTests.length>0
 return{version:POLICY_VERSION,scope,scopeReasons:impact.reasons,base,requestBase,head,requested,minimum,mode,policyHash,reasons,assetFiles,unitTests,browserTests,cloudTests,required:{unit:true,browser,cloud},checks:{allUnit:full,relatedUnit:!full&&unitTests.length>0,automation:full,deno:full||mode==='STANDARD'&&needsCloud,typecheck:true,build:true,browser,cloud},skipped:{browser:browser?null:`${mode}: full browser suite outside required scope`,cloud:cloud?null:`${mode}: cloud suite outside required scope`,unitSubset:full?null:unitTests.length?null:'No executable changes with mapped unit tests'}}
}
export function assertResults(plan,results){
 if(!plan||plan.version!==POLICY_VERSION||!MODES.includes(plan.mode)||!plan.required?.unit)throw Error('Missing or invalid validation plan')
 for(const job of ['unit','browser','cloud']){const required=job==='unit'||plan.mode==='FULL'||job==='browser'&&plan.mode==='STANDARD'||plan.required[job];if(typeof plan.required[job]!=='boolean')throw Error('Missing job requirement: '+job)
  if(required&&results[job]!=='success')throw Error(`${job} required, received ${results[job]}`)
  if(!required&&(results[job]!=='skipped'||!plan.skipped[job]))throw Error(`${job} must be explicitly policy-skipped, received ${results[job]}`)
 }
 return true
}
export function hashPolicy(files){const h=createHash('sha256');for(const s of files)h.update(s);return h.digest('hex')}

export function parseRequest(text,base){const r=typeof text==='string'?JSON.parse(text):text;if(!r||!['AUTO',...MODES].includes(r.requested)||r.base!==base)throw Error('Invalid or stale base-bound validation request');return r.requested}
