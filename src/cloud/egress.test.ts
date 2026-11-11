import { describe, expect, it } from 'vitest'
import { createGameHandler } from './server'
import type { CloudRepository } from './server'
import { freshWorld } from './engine'
import { applyWorldDelta, syncProtocol } from './transport'
import type { Holds, ServerWorld } from './protocol'

function fixture() {
  let at=Date.parse('2026-11-11T03:00:00Z'), member=true
  let row:ServerWorld={id:'home',revision:10,data:freshWorld(at),holds:{},updated_at:new Date(at).toISOString()}
  row.data!.friends[0].photo='data:image/png;base64,'+'A'.repeat(53000)
  const counts={auth:0,member:0,head:0,full:0,commits:0}
  const receipts=new Map<string,{command:string;message:string}>()
  let concurrent:(()=>void)|undefined
  const db:CloudRepository={
    loginSlot:async()=>true,authorize:async()=>{counts.member++;return member},enroll:async()=>{member=true},revoke:async()=>{member=false},
    head:async()=>{counts.head++;return {id:row.id,revision:row.revision,updated_at:row.updated_at}},
    load:async()=>{counts.full++;return structuredClone(row)},
    commit:async(_user,operation,command,expected,data,holds:Holds,message)=>{
      const receipt=receipts.get(operation)
      if(receipt){if(receipt.command!==JSON.stringify(command))throw Error('operation mismatch');return {status:'duplicate',message:receipt.message}}
      if(expected===-1)return {status:'conflict'}
      const hook=concurrent;concurrent=undefined;hook?.()
      if(expected!==row.revision)return {status:'conflict'}
      counts.commits++;row={...row,revision:row.revision+1,data:structuredClone(data) as ServerWorld['data'],holds:structuredClone(holds),updated_at:new Date(at).toISOString()}
      receipts.set(operation,{command:JSON.stringify(command),message});return {status:'ok',message}
    },
  }
  const make=()=>createGameHandler({repository:db,user:async token=>{counts.auth++;return token==='valid'?'player':null},password:()=> 'test-only',origins:['https://example.test'],now:()=>at})
  let handler=make()
  const call=async(body:object,token='valid')=>{const response=await handler(new Request('https://example.test/functions/v1/game',{method:'POST',headers:{origin:'https://example.test',authorization:`Bearer ${token}`},body:JSON.stringify({clientVersion:12,...body})}));return {status:response.status,body:await response.json()}}
  return {call,counts,row:()=>structuredClone(row),advance:(ms:number)=>{at+=ms},revoke:()=>{member=false},cold:()=>{handler=make()},concurrent:()=>{concurrent=()=>{row.data!.world!.coins+=100;row.revision++;row.updated_at=new Date(at).toISOString()}},external:()=>{row.data!.world!.coins+=50;row.revision++}}
}
const opt={sync:syncProtocol}
describe('authorized conditional cloud transport and CAS cache',()=>{
  it('returns a tiny unchanged reply without loading the world, and never bypasses auth/membership',async()=>{
    const f=fixture(),r=await f.call({action:'status'});expect(r.body.row.data).toBeTruthy()
    const n=f.counts.full
    for(let i=0;i<12;i++){
      const result=await f.call({action:'status',...opt,knownRevision:10})
      expect(result.body).toMatchObject({unchanged:true,revision:10});expect(JSON.stringify(result.body).length).toBeLessThan(110)
    }
    expect(f.counts.full).toBe(n);expect(f.counts.auth).toBe(13);expect(f.counts.member).toBe(13)
    f.revoke();expect((await f.call({action:'status',...opt,knownRevision:10})).status).toBe(403)
    expect((await f.call({action:'status',...opt,knownRevision:10},'invalid')).status).toBe(401)
  })
  it('acknowledges commands with exact patches, retains photos, and does not re-read the full world after commit',async()=>{
    const f=fixture(),before=f.row(),n=(await f.call({action:'status'}),f.counts.full)
    f.advance(1000)
    const result=await f.call({action:'command',...opt,knownRevision:10,operation:crypto.randomUUID(),command:{type:'care',friendId:'momo',action:'pet'}})
    expect(result.status).toBe(200);expect(result.body.delta).toBeTruthy()
    expect(applyWorldDelta(before,result.body.delta)).toEqual((({holds:_,...r})=>r)(f.row()))
    expect(f.counts.full).toBe(n);expect(f.row().data!.friends[0].photo).toBe(before.data!.friends[0].photo)
  })
  it('never trusts client data patches, handles duplicate operation IDs and retains concurrent device changes',async()=>{
    const f=fixture(),before=f.row();await f.call({action:'status'})
    const body={action:'command',...opt,knownRevision:10,operation:crypto.randomUUID(),command:{type:'care',friendId:'momo',action:'pet'},delta:{coins:9999999}}
    f.concurrent()
    const r=await f.call(body);expect(r.status).toBe(200)
    const current=f.row();expect(current.data!.world!.coins).toBe(before.data!.world!.coins+100)
    const committed=f.counts.commits;const duplicate=await f.call(body)
    expect(duplicate.status).toBe(200);expect(f.counts.commits).toBe(committed);expect(f.row()).toEqual(current)
    if(duplicate.body.delta)expect(applyWorldDelta(before,duplicate.body.delta).revision).toBe(current.revision)
  })
  it('old clients always receive complete rows, cold/new clients recover external revisions, and expired cache never hides changes',async()=>{
    const f=fixture();await f.call({action:'status'})
    const old=await f.call({action:'status',knownRevision:10});expect(old.body.row.revision).toBe(10)
    f.external();f.cold()
    const changed=await f.call({action:'status',...opt,knownRevision:10});expect(changed.body.row.revision).toBe(11)
    f.advance(61000);f.external()
    const later=await f.call({action:'status',...opt,knownRevision:11});expect(later.body.row.revision).toBe(12)
    expect(later.body.row.data.friends[0].photo).toBeTruthy()
  })
  it('two different edge isolates cannot replace newer coins with a cached pre-commit snapshot',async()=>{
    const f=fixture();await f.call({action:'status'});f.external()
    const result=await f.call({action:'command',...opt,knownRevision:10,operation:crypto.randomUUID(),command:{type:'refresh'}})
    expect(result.status).toBe(200);expect(f.row().data!.world!.coins).toBe(350)
    expect(f.counts.full).toBe(2)
  })
})
