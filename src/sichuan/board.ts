export type Board = { width: number; height: number; tiles: number[] }
export const stages = [
  {width:6,height:3,seconds:60,reward:60}, {width:6,height:6,seconds:120,reward:150},
  {width:8,height:8,seconds:180,reward:300}, {width:10,height:10,seconds:240,reward:500},
  {width:12,height:10,seconds:300,reward:800},
] as const
export const icons = ['🍓','🍊','🍋','🍇','🍒','🍑','🥝','🍎','🌸','🌻','🍀','🍄','🐱','🐶','🐰','🐼','⭐','🌙','💎','🦋']
export const rules = {cooldown:3600000,hints:3,manualShuffles:3,competitionShuffles:1,shuffleMs:500,matchMs:450,comboMs:3000}
export type Point = {x:number;y:number}
// Padded empty border permits outside paths. Direction is part of the search state:
// visiting a cell from another direction can allow a different two-turn continuation.
export function path(b:Board,a:number,z:number):Point[]|null {
 if(a===z||!b.tiles[a]||b.tiles[a]!==b.tiles[z]||a<0||z<0||a>=b.tiles.length||z>=b.tiles.length)return null
 const W=b.width+2,H=b.height+2,start={x:a%b.width+1,y:Math.floor(a/b.width)+1},end={x:z%b.width+1,y:Math.floor(z/b.width)+1}
 const dirs=[[1,0],[0,1],[-1,0],[0,-1]],queue:{x:number;y:number;dir:number;turns:number;route:Point[]}[]=[]
 for(let dir=0;dir<4;dir++)queue.push({...start,dir,turns:0,route:[start]})
 const seen=new Map<string,number>()
 for(let i=0;i<queue.length;i++){
  const q=queue[i]
  for(let d=0;d<4;d++){
   const turns=q.turns+(d===q.dir?0:1),x=q.x+dirs[d][0],y=q.y+dirs[d][1]
   if(turns>2||x<0||y<0||x>=W||y>=H)continue
   const route=[...q.route,{x,y}]
   if(x===end.x&&y===end.y)return route.map(p=>({x:p.x-1,y:p.y-1}))
   if(x>0&&x<W-1&&y>0&&y<H-1&&b.tiles[(y-1)*b.width+x-1])continue
   const key=`${x},${y},${d}`
   if((seen.get(key)??3)<=turns)continue
   seen.set(key,turns);queue.push({x,y,dir:d,turns,route})
  }
 }
 return null
}
export function pair(b:Board):[number,number]|null {
 for(let a=0;a<b.tiles.length;a++)if(b.tiles[a])for(let z=a+1;z<b.tiles.length;z++)if(b.tiles[a]===b.tiles[z]&&path(b,a,z))return[a,z]
 return null
}
export const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296
function shuffle<T>(values:T[],rng:()=>number){for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values}
// Positions and multiplicities are preserved, including gaps. Fallback chooses two
// geometrically connectable occupied cells, then swaps a duplicate into that pair.
export function reshuffle(b:Board,rng=random):Board {
 const result={...b,tiles:[...b.tiles]},positions=result.tiles.flatMap((v,i)=>v?[i]:[]),values=positions.map(i=>b.tiles[i])
 if(!positions.length)return result
 for(let attempt=0;attempt<24;attempt++){shuffle(values,rng);positions.forEach((p,i)=>result.tiles[p]=values[i]);if(pair(result))return result}
 const geometry={...b,tiles:b.tiles.map(v=>v?1:0)},target=pair(geometry)
 if(!target)throw Error('연결할 수 있는 보드를 만들지 못했어요.')
 const [a,z]=target,type=result.tiles[a],other=positions.find(i=>i!==a&&result.tiles[i]===type)
 if(other===undefined)throw Error('패의 짝이 맞지 않아요.')
 ;[result.tiles[z],result.tiles[other]]=[result.tiles[other],result.tiles[z]]
 return result
}
export function createBoard(stage:number,rng=random):Board {
 const config=stages[stage-1];if(!config)throw Error('단계를 확인해 주세요.')
 const count=config.width*config.height,types=Math.min(icons.length,6+stage*3)
 const tiles=Array.from({length:count},(_,i)=>Math.floor(i/2)%types+1)
 return reshuffle({width:config.width,height:config.height,tiles},rng)
}
export function formatTime(ms:number){const n=Math.max(0,Math.floor(ms/10));return`${String(Math.floor(n/6000)).padStart(2,'0')}:${String(Math.floor(n/100)%60).padStart(2,'0')}.${String(n%100).padStart(2,'0')}`}
