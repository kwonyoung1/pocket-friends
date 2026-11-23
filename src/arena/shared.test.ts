import {expect,test} from 'vitest'
import {freshWorld} from '../cloud/engine.ts'
import {grantSpecialFriends} from '../humans/model.ts'
import {arenaAccount,arenaCommand,arenaProgress,validateArena} from './server.ts'
import {arenaOwner} from './identity.ts'
import {restoreArena} from './state.ts'
const now=Date.parse('2026-11-23T03:00:00Z'),a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
test('sharing reuses the saved account without merging, rewarding, resetting energy or needing a recovery secret',()=>{
 const save=freshWorld(now),p=arenaProgress(save,now),account=arenaAccount(p,a,now);account.energy.value=37;account.chests.forest=2;account.pity.legendary=12;account.beasts['beast-lumi']={at:now,level:12,xp:2,shards:7,duplicates:0,mastery:0}
 const before=structuredClone(save),snapshot=structuredClone(account)
 arenaCommand(save,{type:'arena-share'},b,now)
 expect(p.sharedOwner).toBe(a);expect(arenaOwner(p,a)).toBe(a);expect(arenaOwner(p,b)).toBe(a);expect(p.accounts).toEqual({[a]:snapshot});expect(save.world!.coins).toBe(before.world!.coins);expect(save.friends).toEqual(before.friends)
 arenaCommand(save,{type:'arena-share'},a,now);expect(p.accounts).toEqual({[a]:snapshot});expect(restoreArena(p)).toEqual(p)
})
test('multiple saved accounts and tickets survive selection; stale and invented selections are rejected',()=>{
 const save=freshWorld(now),p=arenaProgress(save,now);arenaAccount(p,a,now).energy.value=23;arenaAccount(p,b,now).energy.value=68
 grantSpecialFriends(save,now);for(const f of save.friends)f.growth!.level=35
 arenaCommand(save,{type:'arena-start',stageId:'1-1',party:['special-boy']},a,now);arenaCommand(save,{type:'arena-start',stageId:'1-1',party:['special-boy']},b,now)
 const accounts=structuredClone(p.accounts),tickets=structuredClone(p.tickets);arenaCommand(save,{type:'arena-share'},a,now)
 arenaCommand(save,{type:'arena-select',accountId:b,previousOwner:a},a,now);expect(arenaOwner(p,a)).toBe(b);expect(arenaOwner(p,b)).toBe(b);expect(p.accounts).toEqual(accounts)
 expect(()=>arenaCommand(save,{type:'arena-select',accountId:a,previousOwner:a},a,now)).toThrow('다른 기기');expect(p.sharedOwner).toBe(b)
 expect(()=>arenaCommand(save,{type:'arena-select',accountId:'missing',previousOwner:b},a,now)).toThrow('찾지');expect(p.accounts).toEqual(accounts)
 arenaCommand(save,{type:'arena-select',accountId:a,previousOwner:b},b,now);expect(p.accounts).toEqual(accounts);expect(p.tickets).toEqual(tickets)
})
test('sharing commands cannot accept arbitrary balances or create a selected account',()=>{
 expect(validateArena({type:'arena-share'})).toEqual({type:'arena-share'})
 expect(()=>validateArena({type:'arena-share',energy:100})).toThrow('보낼 수')
 expect(()=>validateArena({type:'arena-select',accountId:a,previousOwner:'bad'})).toThrow('기록')
})
