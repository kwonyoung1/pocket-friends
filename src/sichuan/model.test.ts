import {expect,it} from 'vitest'
import {createBoard,path,pair,reshuffle,rules,stages,formatTime} from './board'
import type {Board} from './board'
import {sichuanCommand,expireSichuan,progress} from './model'
import {migrateSichuan,ranking} from './state'
import type {Round,SichuanCommand} from './state'
import {freshWorld,applyCommand,validateCommand,importWorld} from '../cloud/engine'
import {parseSave} from '../game'
const now=Date.parse('2026-10-17T03:00:00Z')
const rng=()=>{let n=4123;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}}
function fixture(mode:'adventure'|'competition'='adventure'){const s=freshWorld(now);sichuanCommand(s,{type:'sichuan-start',mode,nickname:'테스터'},'pc',now,rng());return s}
const command=(r:Round,type:Exclude<SichuanCommand['type'],'sichuan-start'>,extra?:{a:number;b:number}):SichuanCommand=>({type,mode:r.mode,sessionId:r.id,turn:r.turn,...extra})
function solve(s:ReturnType<typeof fixture>,r:Round,at:number){while(r.board.tiles.some(Boolean)){const found=pair(r.board);expect(found).not.toBeNull();sichuanCommand(s,command(r,'sichuan-match',{a:found![0],b:found![1]}),r.owner,at,rng());at+=501}return at}
it.each(stages.map((s,i)=>[i+1,s] as const))('stage %i has specified tile count and time, paired randomized tiles with legal moves',(stage,cfg)=>{
 const a=createBoard(stage,rng()),b=createBoard(stage,()=>.7)
 expect(a.tiles).toHaveLength(cfg.width*cfg.height);expect(a.width).toBe(cfg.width);expect(a.height).toBe(cfg.height);expect(a.tiles).not.toEqual(b.tiles);expect(pair(a)).not.toBeNull()
 for(const type of new Set(a.tiles))expect(a.tiles.filter(x=>x===type).length%2).toBe(0)
 // Random boards are not a row of prearranged adjacent identical pairs.
 expect(a.tiles.filter((v,i)=>i%2===0&&v===a.tiles[i+1]).length).toBeLessThan(a.tiles.length/4)
})
it('finds straight, one-turn, two-turn and outside paths, rejects obstacles, three turns and invalid pairs',()=>{
 expect(path({width:3,height:1,tiles:[1,0,1]},0,2)).not.toBeNull()
 expect(path({width:2,height:2,tiles:[1,0,0,1]},0,3)).not.toBeNull()
 const outside=path({width:3,height:1,tiles:[1,2,1]},0,2)!
 expect(outside.some(p=>p.y===-1||p.y===1)).toBe(true)
 expect(path({width:3,height:3,tiles:[2,2,2,2,1,2,2,2,1]},4,8)).toBeNull()
 expect(path({width:2,height:1,tiles:[1,2]},0,1)).toBeNull()
 expect(path({width:2,height:1,tiles:[1,1]},0,0)).toBeNull()
 expect(path({width:2,height:1,tiles:[1,1]},-1,0)).toBeNull()
 const winding:Board={width:5,height:5,tiles:[2,2,2,2,2,2,1,0,2,2,2,2,0,0,2,2,2,2,1,2,2,2,2,2,2]}
 expect(path(winding,6,18)).toBeNull()
})
it('reshuffle preserves occupied positions and multiplicities and guarantees a legal pair even with fixed RNG',()=>{
 const dead:Board={width:4,height:4,tiles:[1,2,3,4,3,4,1,2,2,1,4,3,4,3,2,1]}
 expect(pair(dead)).toBeNull()
 for(const random of [()=>0,()=>.999,rng()]){
  const shuffled=reshuffle(dead,random)
  expect(pair(shuffled)).not.toBeNull();expect([...shuffled.tiles].sort()).toEqual([...dead.tiles].sort())
 }
 const gaps:Board={width:4,height:2,tiles:[1,0,2,0,2,0,1,0]},shuffled=reshuffle(gaps,rng())
 expect(shuffled.tiles.map(v=>!!v)).toEqual(gaps.tiles.map(v=>!!v));expect([...shuffled.tiles].sort()).toEqual([...gaps.tiles].sort())
})
it('finishes all five stages with exact deadlines, resets hints, and pays only the final 800 once',()=>{
 const s=fixture(),r=progress(s).adventure!;let at=now+1
 const oldFriends=structuredClone(s.friends),oldInventory=structuredClone(s.world!.inventory)
 for(let stage=1;stage<=5;stage++){
  expect(r.board.tiles).toHaveLength(stages[stage-1].width*stages[stage-1].height)
  expect(r.stageEndsAt-(stage===1?now:at-1)).toBe(stages[stage-1].seconds*1000)
  at=solve(s,r,at);expect(r.completed).toBe(stage)
  if(stage<5){expect(s.world!.coins).toBe(300);sichuanCommand(s,command(r,'sichuan-next'),'pc',at++,rng());expect(r.hints).toBe(3);expect(r.manual).toBe(3)}
 }
 expect(s.world!.coins).toBe(1100);expect(r.status).toBe('settled');expect(s.world!.ledger.filter(x=>x.reason==='사천성 탐험 정산')).toHaveLength(1)
 sichuanCommand(s,command(r,'sichuan-stop'),'pc',at);expireSichuan(s,at+999999);expect(s.world!.coins).toBe(1100)
 expect(s.friends).toEqual(oldFriends);expect(s.world!.inventory).toEqual(oldInventory)
})
it.each([0,1,2,3,4])('timeout after %i completed stages preserves the last reward after restore',(completed)=>{
 const s=fixture();let r=progress(s).adventure!,at=now+1
 for(let i=0;i<completed;i++){at=solve(s,r,at);sichuanCommand(s,command(r,'sichuan-next'),'pc',at++,rng())}
 const restored=parseSave(JSON.stringify(s),at);r=progress(restored).adventure!
 const end=r.stageEndsAt;expireSichuan(restored,end-1);expect(r.status).toBe('playing');expireSichuan(restored,end)
 const reward=completed?stages[completed-1].reward:0
 expect(restored.world!.coins).toBe(300+reward);expect(r.reward).toBe(reward);expireSichuan(restored,end+1000);expect(restored.world!.coins).toBe(300+reward)
})
it('stopping at a clear screen settles once, prevents session reuse and retains the server cooldown after reload',()=>{
 const s=fixture(),r=progress(s).adventure!,at=solve(s,r,now+1)
 sichuanCommand(s,command(r,'sichuan-stop'),'mobile',at)
 expect(s.world!.coins).toBe(360);expect(()=>sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'mobile',now+3599999)).toThrow()
 const restored=parseSave(JSON.stringify(s),at);sichuanCommand(restored,command(r,'sichuan-next'),'pc',at);expect(restored.world!.coins).toBe(360)
 sichuanCommand(restored,{type:'sichuan-start',mode:'adventure'},'pc',now+rules.cooldown);expect(progress(restored).adventure!.id).not.toBe(r.id)
})
it('blocks a second live exploration even when its cooldown has passed at the clear screen',()=>{
 const s=fixture(),r=progress(s).adventure!;solve(s,r,now+1)
 expect(()=>sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'pc',now+7200000)).toThrow(/먼저/)
})
it('unlimited 8x8 competition is independent of cooldown, validates nickname and records server completion time only',()=>{
 const s=fixture();sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'영이'},'pc',now+1,rng());let r=progress(s).competitions.pc
 expect(r.board.tiles).toHaveLength(64);expect(r.stageEndsAt).toBe(0)
 const at=solve(s,r,now+123);expect(r.elapsedMs).toBe(at-501-r.startedAt)
 expect(s.world!.coins).toBe(300);const saved=r.elapsedMs;expireSichuan(s,now+86400000);expect(r.elapsedMs).toBe(saved)
 for(let i=0;i<5;i++){const id=r.id;sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'새이름'},'pc',at+i,rng());r=progress(s).competitions.pc;expect(r.id).not.toBe(id);expect(r.board.tiles.filter(Boolean)).toHaveLength(64)}
 for(const name of ['a','a'.repeat(13),'ab\nc'])expect(()=>sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:name},'other',at)).toThrow()
 expect(formatTime(123456)).toBe('02:03.45')
 const ordered={version:1 as const,nextStartAt:0,competitions:{},bests:[{playerId:'a',nickname:'먼저',elapsedMs:100,at:1,sessionId:'zzz'},{playerId:'b',nickname:'나중',elapsedMs:100,at:1,sessionId:'aaa'}]};expect(ranking(ordered,1).map(x=>x.playerId)).toEqual(['a','b'])
})
it('ranks one best per authenticated player, ties by first finish, slower runs never replace a best',()=>{
 const s=fixture();for(let i=0;i<7;i++){
  const user=`player${i}`;sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:`친구${i}`},user,now+i,rng())
  const r=progress(s).competitions[user];r.board={width:2,height:1,tiles:[1,1]};sichuanCommand(s,command(r,'sichuan-match',{a:0,b:1}),user,now+i+5000)
 }
 const p=progress(s);expect(ranking(p,now).map(r=>r.playerId)).toEqual(['player0','player1','player2','player3','player4'])
 sichuanCommand(s,{type:'sichuan-start',mode:'competition',nickname:'바뀐이름'},'player0',now+10000,rng());const r=p.competitions.player0;r.board={width:2,height:1,tiles:[1,1]}
 sichuanCommand(s,command(r,'sichuan-match',{a:0,b:1}),'player0',now+16000);expect(p.bests).toHaveLength(7);expect(p.bests.find(r=>r.playerId==='player0')!.nickname).toBe('친구0')
})
it.each(['adventure','competition'] as const)('auto shuffles deadlocks after removal without consuming manual uses, clears hints and locks input 500ms (%s)',mode=>{
 const s=fixture(mode),r=mode==='adventure'?progress(s).adventure!:progress(s).competitions.pc
 r.board={width:4,height:5,tiles:[1,2,3,4,3,4,1,2,2,1,4,3,4,3,2,1,5,5,0,0]};r.hint=[16,17]
 const msg=sichuanCommand(s,command(r,'sichuan-match',{a:16,b:17}),'pc',now+1,()=>0)
 expect(msg).toContain('자동으로');expect(r.autoShuffles).toBe(1);expect(r.manual).toBe(mode==='competition'?1:3);expect(r.hint).toBeUndefined();expect(pair(r.board)).not.toBeNull()
 expect(()=>sichuanCommand(s,command(r,'sichuan-hint'),'pc',now+400)).toThrow(/섞고/)
 sichuanCommand(s,command(r,'sichuan-hint'),'pc',now+501);expect(path(r.board,...r.hint!)).not.toBeNull();expect(r.hints).toBe(2)
 sichuanCommand(s,command(r,'sichuan-shuffle'),'pc',now+502,rng());expect(r.manual).toBe(mode==='competition'?0:2);expect(pair(r.board)).not.toBeNull();expect(r.hint).toBeUndefined()
})
it('server rejects forged moves, stale turns and cross-user competition actions without mutating original state',()=>{
 const s=fixture('competition'),r=progress(s).competitions.pc,before=JSON.stringify(s)
 for(const c of [command(r,'sichuan-match',{a:0,b:0}),{...command(r,'sichuan-hint'),turn:9}])expect(()=>applyCommand(s,{},c,'pc',now+1)).toThrow()
 expect(()=>applyCommand(s,{},command(r,'sichuan-hint'),'mobile',now+1)).toThrow();expect(JSON.stringify(s)).toBe(before)
 expect(()=>validateCommand({type:'sichuan-match',mode:'adventure',sessionId:r.id,turn:0,a:-1,b:1})).toThrow()
 expect(importWorld(s,now).world!.sichuan).toBeUndefined()
})
it('additive migration preserves old economy and records and rejects corrupted tile data without reset',()=>{
 const s=freshWorld(now),old=structuredClone(s);expect(migrateSichuan(undefined)).toBeUndefined();sichuanCommand(s,{type:'sichuan-start',mode:'adventure'},'pc',now,rng())
 const restored=parseSave(JSON.stringify(s),now);expect(restored.world!.sichuan).toEqual(s.world!.sichuan);expect(restored.world!.coins).toBe(old.world!.coins);expect(restored.world!.inventory).toEqual(old.world!.inventory)
 progress(s).adventure!.board.tiles[0]=999;expect(()=>parseSave(JSON.stringify(s),now)).toThrow()
})
