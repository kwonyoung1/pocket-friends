import {expect,it} from 'vitest'
import {freshWorld,applyCommand} from '../cloud/engine'
import {life,lifeCommand,settleLife,bathStatus} from './model'
import {lifeBalance} from './config'
import {parseSave} from '../game'
const now=Date.parse('2026-10-17T03:00:00Z')
it('keeps a previous two-use day and grants exactly two more baths without shortening the original 30 minutes',()=>{
 const s=freshWorld(now),f=s.friends[0];life(f,now).bathCount=2
 const restored=parseSave(JSON.stringify(s),now),g=restored.friends[0]
 for(let i=0;i<2;i++){lifeCommand(restored,{type:'bath',friendId:g.id},now+i*1800000);expect(g.life!.bath!.endsAt).toBe(now+(i+1)*1800000);expect(g.life!.bathCount).toBe(3+i);settleLife(restored,now+(i+1)*1800000)}
 expect(lifeCommand(restored,{type:'bath',friendId:g.id},now+3600000)).toBe('오늘은 충분히 씻었어요! 내일 다시 씻겨 주세요 🛁')
 expect(parseSave(JSON.stringify(restored),now+3600000).friends[0].life!.bathCount).toBe(4)
})
it('daily quota is independent per friend, KST midnight resets it without ending an active bath, and countdown uses seconds',()=>{
 const t=Date.parse('2026-10-17T14:45:00Z'),s=freshWorld(t),f=s.friends[0],l=life(f,t);l.bathCount=3
 // Use bibi's later bedtime so the test measures midnight, not sleep restrictions.
 const b=s.friends[1];life(b,t).bathCount=3;lifeCommand(s,{type:'bath',friendId:b.id},t)
 expect(bathStatus(b,t+1234).time).toBe('29분 59초');expect(bathStatus(f,t).full).toBe(false)
 const midnight=Date.parse('2026-10-17T15:00:00Z');settleLife(s,midnight)
 expect(b.life!.bathCount).toBe(0);expect(b.life!.bath).toBeDefined();expect(bathStatus(b,midnight).remaining).toBe(15*60000)
 expect(lifeBalance.bathsPerDay).toBe(4)
})
it('server rejects device time spoofing and repeated bath clicks do not increment counts or issue completion rewards twice',()=>{
 let s=freshWorld(now)
 const c={type:'bath' as const,friendId:'momo',now:now+86400000}
 s=applyCommand(s,{},c,'pc',now).save
 const first=s.friends[0].life!.bath!,count=s.friends[0].life!.bathCount
 s=applyCommand(s,{},c,'mobile',now+1000).save;expect(s.friends[0].life!.bathCount).toBe(count);expect(s.friends[0].life!.bath).toEqual(first)
 s=applyCommand(s,{}, {type:'refresh'},'pc',now+1800000).save;const happy=s.friends[0].stats.happiness
 s=applyCommand(s,{}, {type:'refresh'},'mobile',now+1800000).save;expect(s.friends[0].stats.happiness).toBe(happy);expect(s.friends[0].life!.bathCount).toBe(1)
})
