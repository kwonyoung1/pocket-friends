import type {Frame,Gem} from '../match3/engine'
export const names=['ruby','sapphire','emerald','amethyst','topaz','diamond','rainbow'] as const
export const colors=[0xff4c81,0x60aaff,0x4ff0b3,0xc483ff,0xffd06b,0xc2f8ff,0xf4d1ff]
export const board:Gem[]=Array.from({length:64},(_,id)=>id===27?{id,color:null,special:'rainbow'}:{id,color:(id*3+Math.floor(id/8))%6})
export type Scene='single'|'mass'|'rainbow'|'combo'
export const sceneNames:Record<Scene,string>={single:'보석 파괴',mass:'대형 폭발 · 16개',rainbow:'무지개 · 같은 색 전체',combo:'12콤보 · 초대형 점수'}
export const center=(i:number)=>({x:(i%8+.5)*64,y:(Math.floor(i/8)+.5)*64})
export function frameFor(scene:Scene,color=0):Frame{
 const removed=scene==='single'?[28]:scene==='rainbow'?board.flatMap((g,i)=>g.color===color?[i]:[]):[18,19,20,21,26,27,28,29,34,35,36,37,42,43,44,45]
 return {phase:'CLEARING',board:board.slice(),ice:Array(64).fill(0),combo:scene==='combo'?12:1,directCombo:scene==='combo'?12:1,score:scene==='combo'?128000:removed.length*1500,moves:0,gain:scene==='combo'?128000:removed.length*1500,removed,effects:scene==='rainbow'?[{kind:'rainbow',from:27,targets:removed}]:scene==='single'?[]:[{kind:'bomb',from:27,targets:removed}],motions:[],impact:removed.length>=10?5:0,specialPair:scene==='combo'}
}
export type LabMetrics={renderer:string;durationMs:number;frames:number;rafFps:number;p95Ms:number;longTasks:number|null;longestTaskMs:number|null;peakParticles:number;particleCap:number;dpr:number;reducedMotion:boolean;scenario:string}
