// Offline deterministic experiment. No Supabase access, credentials or operating data.
// Run: node --experimental-transform-types scripts/measure-egress.mts
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { createGameHandler } from '../src/cloud/server.ts'
import type { CloudRepository } from '../src/cloud/server.ts'
import type { ServerWorld, WorldRow } from '../src/cloud/protocol.ts'
import { freshWorld } from '../src/cloud/engine.ts'
import { applyWorldDelta, syncProtocol } from '../src/cloud/transport.ts'
import { pair } from '../src/sichuan/board.ts'

const baselineCommit='a867db9', epoch=Date.parse('2026-11-11T03:00:00Z')
const bytes=(v:unknown)=>Buffer.byteLength(JSON.stringify(v))
const temporary=mkdtempSync(join(tmpdir(),'pocket-egress-'))
const source=execFileSync('git',['show',`${baselineCommit}:src/cloud/server.ts`],{encoding:'utf8'})
writeFileSync(join(temporary,'baseline.ts'),source.replaceAll("'./engine.ts'",JSON.stringify(resolve('src/cloud/engine.ts'))).replaceAll("'./protocol.ts'",JSON.stringify(resolve('src/cloud/protocol.ts'))))
const legacy=(await import(pathToFileURL(join(temporary,'baseline.ts')).href)).createGameHandler as typeof createGameHandler
const initial:ServerWorld={id:'home',revision:1,data:freshWorld(epoch),holds:{},updated_at:new Date(epoch).toISOString()}
initial.data!.world!.inventory.snack=100;initial.data!.world!.inventory.ball=1
initial.data!.friends[0].photo='data:image/png;base64,'
initial.data!.friends[0].photo+='A'.repeat(Math.max(0,53800-bytes(initial)))

async function experiment(label:string,scenario:'idle'|'care'|'sichuan',optimized:boolean,cold=false){
 let randomSeed=7129
 Math.random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296}
 let row=structuredClone(initial),time=epoch
 const local:Array<WorldRow|undefined>=[undefined,undefined],receipts=new Map<string,{command:string;message:string}>()
 const c={requests:0,auth:0,membership:0,fullLoads:0,headLoads:0,commits:0,edgeResponseBytes:0,requestBytes:0,dbWorldResponseBytes:0,deltaResponses:0,unchangedResponses:0}
 const db:CloudRepository={loginSlot:async()=>true,authorize:async()=>{c.membership++;return true},enroll:async()=>{},revoke:async()=>{},
  head:async()=>{c.headLoads++;const head={id:row.id,revision:row.revision,updated_at:row.updated_at};c.dbWorldResponseBytes+=bytes(head);return head},
  load:async()=>{c.fullLoads++;c.dbWorldResponseBytes+=bytes(row);return structuredClone(row)},
  commit:async(_user,operation,command,expected,data,holds,message)=>{
   const prior=receipts.get(operation);if(prior){assert.equal(prior.command,JSON.stringify(command));return{status:'duplicate',message:prior.message}}
   if(expected!==row.revision)return{status:'conflict'}
   row={id:row.id,revision:row.revision+1,data:structuredClone(data) as ServerWorld['data'],holds:structuredClone(holds),updated_at:new Date(time).toISOString()}
   receipts.set(operation,{command:JSON.stringify(command),message});c.commits++;return{status:'ok',message}
  }}
 const make=()=>(optimized?createGameHandler:legacy)({repository:db,user:async token=>{c.auth++;return token},password:()=> 'fixture',origins:['https://fixture.test'],now:()=>time})
 let handler=make()
 const contact=[-Infinity,-Infinity],heartbeat=[epoch,epoch]
 const call=async(device:number,body:object)=>{
  if(cold)handler=make()
  const request={...body,clientVersion:12,...(optimized?{sync:syncProtocol,...(local[device]?{knownRevision:local[device]!.revision}:{})}:{})}
  c.requestBytes+=bytes(request);c.requests++
  const response=await handler(new Request('https://fixture.test/game',{method:'POST',headers:{origin:'https://fixture.test',authorization:`Bearer player${device}`},body:JSON.stringify(request)}))
  const text=await response.text();c.edgeResponseBytes+=Buffer.byteLength(text)
  const result=JSON.parse(text);assert.equal(response.status,200,result.error)
  if(result.row)local[device]=result.row
  else if(result.delta){c.deltaResponses++;local[device]=applyWorldDelta(local[device]!,result.delta)}
  else if(result.unchanged){c.unchangedResponses++;assert.equal(local[device]!.revision,result.revision)}
  else throw Error('Missing world')
  contact[device]=time
  if((body as {action?:string}).action==='command')heartbeat[device]=time
  const {holds:_,...publicRow}=row;assert.deepEqual(local[device],JSON.parse(JSON.stringify(publicRow)))
 }
 const command=(device:number,command:object)=>call(device,{action:'command',operation:crypto.randomUUID(),command})
 await call(0,{action:'status'});await call(1,{action:'status'})
 if(scenario==='sichuan'){
  await command(0,{type:'sichuan-start',mode:'competition',nickname:'측정친구'})
  for(let i=0;i<32;i++){
   time+=600;const r=row.data!.world!.sichuan!.competitions.player0,found=pair(r.board);assert.ok(found)
   await command(0,{type:'sichuan-match',mode:'competition',sessionId:r.id,turn:r.turn,a:found[0],b:found[1]})
   if(i%8===7)await call(1,{action:'status'})
  }
  assert.equal(row.data!.world!.sichuan!.competitions.player0.status,'settled')
 } else {
  for(let elapsed=2500;elapsed<=600000;elapsed+=2500){
   time=epoch+elapsed
   if(scenario==='care'&&elapsed%10000===2500)await command(0,{type:'care',friendId:'momo',action:'pet'})
   if(elapsed%5000===0)for(let device=0;device<2;device++){
    // Idealized 5-second probe schedule with instantaneous responses; browser timing is tested separately. No Realtime bytes added.
    if(optimized){if(time-contact[device]<5000)continue;if(time-heartbeat[device]>=30000)await command(device,{type:'refresh'});else await call(device,{action:'status'})}
    else {await call(device,{action:'status'});if(elapsed%30000===0)await command(device,{type:'refresh'})}
   }
  }
 }
 const {holds:_,...final}=row
 assert.equal(final.data!.friends[0].photo,initial.data!.friends[0].photo)
 return {label,scenario,optimized,cold,fixtureWorldBytes:bytes(initial),...c,finalRevision:row.revision,coins:row.data!.world!.coins}
}
try {
 const results=[]
 for(const scenario of ['idle','care','sichuan'] as const){
  const old=await experiment('baseline',scenario,false),warm=await experiment('optimized-warm',scenario,true),cold=await experiment('optimized-cold',scenario,true,true)
  for(const value of [warm,cold]){
   assert.equal(value.coins,old.coins)
   Object.assign(value,{edgeReductionPct:+(100*(1-value.edgeResponseBytes/old.edgeResponseBytes)).toFixed(2),dbWorldReductionPct:+(100*(1-value.dbWorldResponseBytes/old.dbWorldResponseBytes)).toFixed(2),requestReductionPct:+(100*(1-value.requests/old.requests)).toFixed(2)})
  }
  results.push(old,warm,cold)
 }
 const report={baselineCommit,measuredAt:new Date().toISOString(),method:'Offline UTF-8 JSON response bytes from actual baseline/new handlers and instrumented in-memory repository; idealized 5-second probe schedule, two devices, no production requests. HTTP/TLS/compression, auth/member/RPC bodies and Realtime traffic excluded. Not Supabase billed usage.',results}
 writeFileSync('docs/EGRESS_MEASUREMENTS.json',JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report,null,2))
} finally {rmSync(temporary,{recursive:true,force:true})}
