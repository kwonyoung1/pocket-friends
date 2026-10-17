import {expect,it} from 'vitest'
import {freshWorld} from '../cloud/engine'
import {parseSave} from '../game'
import {sichuanCommand,progress} from './model'
import {ranking,rankingReset,migrateSichuan} from './state'
const midnight=Date.parse('2026-10-17T15:00:00Z')
function finish(s:ReturnType<typeof freshWorld>,user:string,started:number,ended:number){sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'친구'+user},user,started);const r=progress(s).competitions[user];r.board.tiles=r.board.tiles.map((_,i)=>i<2?1:0);sichuanCommand(s,{type:'sichuan-match',mode:'competition',sessionId:r.id,turn:r.turn,a:0,b:1},user,ended);return r}
it('keeps yesterday intact, resets at KST midnight and assigns crossing rounds to the finish day',()=>{
 const s=freshWorld(midnight-10000);finish(s,'pc',midnight-9000,midnight-1000)
 const previous=structuredClone(progress(s).bests),oldDaily=structuredClone(progress(s).dailyBests)
 expect(ranking(progress(s),midnight-1)).toHaveLength(1);expect(ranking(progress(s),midnight)).toHaveLength(0)
 expect(rankingReset(midnight-1000)).toBe('00:00:01');expect(rankingReset(midnight)).toBe('24:00:00')
 finish(s,'pc',midnight-500,midnight+9000)
 expect(progress(s).bests).toEqual(previous);expect(progress(s).dailyBests).toHaveLength(2)
 expect(progress(s).dailyBests![0]).toEqual(oldDaily![0]);expect(ranking(progress(s),midnight)[0].elapsedMs).toBe(9500)
 const restored=parseSave(JSON.stringify(s),midnight+9000);expect(restored.world!.sichuan).toEqual(s.world!.sichuan)
})
it('stores one daily best per user, breaks ties by first finish and pays no competition coins',()=>{
 const s=freshWorld(midnight)
 for(let i=6;i>=0;i--)finish(s,String(i),midnight,midnight+1000+i)
 finish(s,'0',midnight+2000,midnight+4000)
 expect(progress(s).dailyBests).toHaveLength(7);expect(ranking(progress(s),midnight).map(r=>r.playerId)).toEqual(['0','1','2','3','4'])
 finish(s,'0',midnight+5000,midnight+5100);expect(ranking(progress(s),midnight)[0].elapsedMs).toBe(100)
 expect(s.world!.coins).toBe(300)
})
it('seeds legacy records by their own completion dates without changing all-time records',()=>{
 const old={version:1 as const,nextStartAt:0,competitions:{},bests:[{playerId:'pc',nickname:'기존친구',elapsedMs:999,at:midnight-1,sessionId:'old'}]}
 const p=migrateSichuan(old)!;expect(p.bests).toEqual(old.bests);expect(p.dailyBests).toEqual(old.bests);expect(ranking(p,midnight)).toHaveLength(0)
 expect(migrateSichuan(p)).toEqual(p)
 const corrupt=structuredClone(p);corrupt.dailyBests!.push({...corrupt.dailyBests![0]});expect(()=>migrateSichuan(corrupt)).toThrow('일일 랭킹')
})
