import {expect,it} from 'vitest'
import {makeEffect,nextCombo,comboLabel} from './effects'
import {path} from './board'
import {freshWorld} from '../cloud/engine'
import {sichuanCommand,progress} from './model'
import {migrateSichuan} from './state'
const now=Date.parse('2026-10-17T03:00:00Z')
it('effects copy the actual legal outside path and never fabricate a straight line or mutate the board',()=>{
 const b={width:3,height:1,tiles:[1,2,1]},e=makeEffect(b,0,2,'test',0)!
 expect(e.route).toEqual(path(b,0,2));expect(e.route.some(p=>p.y===-1||p.y===1)).toBe(true)
 expect(makeEffect(b,0,1,'test',0)).toBeNull();e.board.tiles[0]=0;expect(b.tiles[0]).toBe(1)
})
it('counts successes only within 3s, resets after idle, and labels exactly 3/5/10 without rewards',()=>{
 let combo={count:0,at:0}
 for(let i=1;i<=10;i++){combo=nextCombo(combo,i*1000);expect(combo.count).toBe(i);expect(comboLabel(i)).toBe(i===3?'Nice!':i===5?'Great!':i===10?'Perfect!':'')}
 expect(nextCombo(combo,13001).count).toBe(1);expect(nextCombo(combo,13000).count).toBe(11)
})
it('competition grants only one manual shuffle and restarts refill it; adventure retains three',()=>{
 const s=freshWorld(now);sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'영이'},'pc',now)
 let r=progress(s).competitions.pc
 const shuffle=()=>({type:'sichuan-shuffle' as const,mode:'competition' as const,sessionId:r.id,turn:r.turn})
 expect(r.manual).toBe(1);sichuanCommand(s,shuffle(),'pc',now+1);expect(r.manual).toBe(0)
 expect(()=>sichuanCommand(s,shuffle(),'pc',now+501)).toThrow(/모두/)
 sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'영이'},'pc',now+502);r=progress(s).competitions.pc;expect(r.manual).toBe(1)
 sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'pc',now+503);expect(progress(s).adventure!.manual).toBe(3)
})
it('upgrading old competition sessions preserves used shuffles, boards, timers and all rankings',()=>{
 for(const remaining of [3,2,1,0]){
  const s=freshWorld(now);sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'찬미'},'pc',now)
  const p=progress(s),r=p.competitions.pc;r.manual=remaining;delete r.manualLimit
  p.bests=[{playerId:'pc',nickname:'찬미',elapsedMs:5432,at:now,sessionId:'old-best'}]
  const restored=migrateSichuan(p)!
  expect(restored.competitions.pc.manual).toBe(Math.max(0,remaining-2));expect(restored.competitions.pc.id).toBe(r.id);expect(restored.competitions.pc.board).toEqual(r.board);expect(restored.competitions.pc.startedAt).toBe(now);expect(restored.bests).toEqual(p.bests)
 }
})
