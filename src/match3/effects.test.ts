import {it,expect,vi,afterEach} from 'vitest'
import {Painter,particleBudget} from './Effects'
import {newGame,planMove} from './engine'
afterEach(()=>vi.unstubAllGlobals())
it('budgets enforce 100/60/30 percent, mobile reduction and reduced motion',()=>{expect(['strong','normal','low'].map(i=>particleBudget(false,i as 'strong'|'normal'|'low',false))).toEqual([160,96,48]);expect(particleBudget(false,'strong',true)).toBe(96);expect(particleBudget(true,'strong',false)).toBe(0)})
it('reuses one canvas, bounds dense special bursts, skips repeated frames, pauses and disposes all resources',()=>{
 let draw:(t:number)=>void=()=>{};const disconnect=vi.fn(),cancel=vi.fn(),spies=new Map(),ctx=new Proxy({},{get:(_,key)=>{if(!spies.has(key))spies.set(key,vi.fn());return spies.get(key)}}) as CanvasRenderingContext2D,canvas={width:0,height:0,dataset:{},getContext:()=>ctx} as unknown as HTMLCanvasElement
 vi.stubGlobal('ResizeObserver',class{constructor(private callback:(e:unknown[])=>void){}observe(){this.callback([{contentRect:{width:512}}])}disconnect=disconnect})
 vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('devicePixelRatio',3);vi.stubGlobal('requestAnimationFrame',(cb:(t:number)=>void)=>{draw=cb;return 1});vi.stubGlobal('cancelAnimationFrame',cancel)
 const p=new Painter(canvas,false,'strong'),game=newGame(1,66);game.board[27]={...game.board[27]!,color:null,special:'rainbow'};game.board[28]={...game.board[28]!,color:null,special:'rainbow'}
 const frame=planMove(game,27,28,20).frames.find(f=>f.phase==='CLEARING')!,original=JSON.stringify(frame)
 p.update(frame,false);draw(performance.now()+16);expect(Number(canvas.dataset.particles)).toBeGreaterThan(0);expect(Number(canvas.dataset.particles)).toBeLessThanOrEqual(160);expect(canvas.width).toBe(1024);expect(JSON.stringify(frame)).toBe(original)
 p.update(frame,false);p.update(frame,true);expect(cancel).toHaveBeenCalled();p.dispose();expect(disconnect).toHaveBeenCalledOnce();expect(ctx.clearRect).toHaveBeenCalled()
})
