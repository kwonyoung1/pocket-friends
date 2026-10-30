import {SIZE,stages,COMBOS} from './config'
export type Special='row'|'column'|'bomb'|'rainbow'|'lightning'
export type Gem={id:number;color:number|null;special?:Special}
export type Board=(Gem|null)[]
export type Phase='IDLE'|'SWAPPING'|'MATCHING'|'CLEARING'|'FALLING'|'REFILLING'|'CASCADING'
export type Effect={kind:Special|'all';from:number;targets:number[]}
export type Motion={id:number;from:number;to:number}
export type Frame={phase:Phase;board:Board;ice:number[];combo:number;score:number;moves:number;gain:number;removed:number[];effects:Effect[];motions:Motion[]}
export type Game={stage:number;board:Board;ice:number[];moves:number;score:number;seed:number;nextId:number;status:'playing'|'won'|'lost';maxCombo:number;reshuffles:number}
export type Group={cells:number[];special?:Special}
const all=Array.from({length:SIZE*SIZE},(_,i)=>i)
const row=(i:number)=>Math.floor(i/SIZE),col=(i:number)=>i%SIZE
export const adjacent=(a:number,b:number)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<64&&b<64&&Math.abs(row(a)-row(b))+Math.abs(col(a)-col(b))===1
function random(g:Game){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296}
function gem(g:Game):Gem{return {id:g.nextId++,color:Math.floor(random(g)*stages[g.stage-1].colors)}}
const same=(b:Board,ids:number[])=>b[ids[0]]?.color!=null&&ids.every(i=>b[i]?.color===b[ids[0]]?.color)
export function matches(b:Board):Group[]{
 const pieces:{cells:number[];special?:Special}[]=[]
 for(const vertical of [false,true])for(let line=0;line<8;line++){
  let start=0
  while(start<8){let end=start+1;const index=(n:number)=>vertical?n*8+line:line*8+n
   while(end<8&&same(b,[index(start),index(end)]))end++
   const length=end-start;if(length>=3)pieces.push({cells:Array.from({length},(_,i)=>index(start+i)),special:length>=5?'rainbow':length===4?(vertical?'column':'row'):undefined})
   start=end
  }
 }
 for(let r=0;r<7;r++)for(let c=0;c<7;c++){const n=r*8+c,ids=[n,n+1,n+8,n+9];if(same(b,ids))pieces.push({cells:ids,special:'lightning'})}
 const groups:Group[]=[]
 while(pieces.length){const connected=[pieces.pop()!],cells=new Set(connected[0].cells);let changed=true
  while(changed){changed=false;for(let i=pieces.length-1;i>=0;i--)if(pieces[i].cells.some(x=>cells.has(x))){const p=pieces.splice(i,1)[0];connected.push(p);p.cells.forEach(x=>cells.add(x));changed=true}}
  const h=connected.some(p=>p.special!=='lightning'&&p.cells.length>=3&&row(p.cells[0])===row(p.cells[1])),v=connected.some(p=>p.special!=='lightning'&&p.cells.length>=3&&col(p.cells[0])===col(p.cells[1]))
  const special:Special|undefined=connected.some(p=>p.special==='rainbow')?'rainbow':h&&v&&cells.size>=5?'bomb':connected.find(p=>p.special==='row'||p.special==='column')?.special??connected.find(p=>p.special==='lightning')?.special
  groups.push({cells:[...cells].sort((a,b)=>a-b),special})
 }
 return groups
}
export function validMove(b:Board,ice:number[],a:number,z:number){
 if(!adjacent(a,z)||ice[a]>0||ice[z]>0||!b[a]||!b[z])return false
 if(b[a]?.special==='rainbow'||b[z]?.special==='rainbow'||b[a]?.special&&b[z]?.special)return true
 const swapped=b.slice();[swapped[a],swapped[z]]=[swapped[z],swapped[a]]
 return matches(swapped).some(g=>g.cells.includes(a)||g.cells.includes(z))
}
export function moves(board:Board,ice:number[]=all.map(()=>0)):{a:number;b:number}[]{
 const result:{a:number;b:number}[]=[]
 for(const a of all)for(const b of [col(a)<7?a+1:-1,a+8])if(b>=0&&b<64&&validMove(board,ice,a,b))result.push({a,b})
 return result
}
function shuffleArray<T>(a:T[],g:Game){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function shuffle(g:Game){
 for(let n=0;n<160;n++){shuffleArray(g.board,g);if(!matches(g.board).length&&moves(g.board,g.ice).length){g.reshuffles++;return}}
 // Preserve every special identity/kind even in the bounded regeneration fallback.
 const specials=g.board.flatMap((tile,at)=>tile?.special?[{tile,at}]:[])
 for(let attempt=0;attempt<160;attempt++){fillStable(g);for(const {tile,at} of specials)g.board[at]={...tile,color:tile.special==='rainbow'?null:g.board[at]!.color};if(!matches(g.board).length&&moves(g.board,g.ice).length){g.reshuffles++;return}}
 throw Error('보드를 만들지 못했어요. 다시 시작해 주세요.')
}
function fillStable(g:Game){
 g.board=[]
 for(const i of all){let tile:Gem;do{tile=gem(g)}while((col(i)>1&&same([...g.board,tile],[i-2,i-1,i]))||(row(i)>1&&same([...g.board,tile],[i-16,i-8,i]))||(row(i)>0&&col(i)>0&&same([...g.board,tile],[i-9,i-8,i-1,i])));g.board.push(tile)}
}
export function newGame(stage=1,seed=(Math.random()*4294967296)>>>0):Game{
 stage=Math.max(1,Math.min(30,Math.floor(stage)));const s=stages[stage-1]
 const g:Game={stage,board:[],ice:all.map(()=>0),score:0,moves:s.moves,seed:seed>>>0,nextId:1,status:'playing',maxCombo:0,reshuffles:0}
 const spots=[18,21,42,45,10,13,50,53,26,29,34,37];for(const i of spots.slice(0,s.ice))g.ice[i]=s.layers
 fillStable(g);if(!moves(g.board,g.ice).length)shuffle(g);return g
}
const line=(at:number,vertical:boolean)=>all.filter(i=>vertical?col(i)===col(at):row(i)===row(at))
const square=(at:number,radius:number)=>all.filter(i=>Math.abs(row(i)-row(at))<=radius&&Math.abs(col(i)-col(at))<=radius)
function seek(g:Game,excluded:Set<number>,n=3){const available=all.filter(i=>g.board[i]&&!excluded.has(i));return [...shuffleArray(available.filter(i=>!g.board[i]?.special),g),...shuffleArray(available.filter(i=>g.board[i]?.special),g)].slice(0,n)}
export function planMove(source:Game,a:number,b:number):{game:Game;frames:Frame[];valid:boolean}{
 const g=structuredClone(source),frames:Frame[]=[];let combo=0
 const frame=(phase:Phase,extras:Partial<Frame>={})=>frames.push({phase,board:structuredClone(g.board),ice:g.ice.slice(),combo,score:g.score,moves:g.moves,gain:0,removed:[],effects:[],motions:[],...extras})
 if(g.status!=='playing'||!adjacent(a,b)||g.ice[a]>0||g.ice[b]>0)return {game:g,frames,valid:false}
 const valid=validMove(g.board,g.ice,a,b);[g.board[a],g.board[b]]=[g.board[b],g.board[a]]
 frame('SWAPPING',{motions:[{id:g.board[a]!.id,from:b,to:a},{id:g.board[b]!.id,from:a,to:b}]})
 if(!valid){[g.board[a],g.board[b]]=[g.board[b],g.board[a]];frame('SWAPPING',{motions:[{id:g.board[a]!.id,from:b,to:a},{id:g.board[b]!.id,from:a,to:b}]});frame('IDLE');return {game:g,frames,valid:false}}
 g.moves--;frame('MATCHING')
 const first=g.board[a]!,second=g.board[b]!,specialPair=first.special&&second.special, rainbow=first.special==='rainbow'||second.special==='rainbow'
 let initial=new Set<number>(),initialEffects:Effect[]=[],alreadyFired=new Set<number>()
 const add=(kind:Effect['kind'],from:number,targets:number[])=>{initialEffects.push({kind,from,targets});targets.forEach(i=>initial.add(i))}
 if(rainbow){
  const at=first.special==='rainbow'?a:b,other=at===a?b:a,t=g.board[other]!
  alreadyFired.add(g.board[at]!.id);initial.add(at);initial.add(other)
  if(t.special==='rainbow'){alreadyFired.add(t.id);add('all',at,all)}
  else{const ids=all.filter(i=>g.board[i]?.color===t.color)
   if(t.special){for(const i of ids)g.board[i]={...g.board[i]!,special:t.special==='row'||t.special==='column'?(i%2?'row':'column'):t.special};frame('MATCHING')}
   add('rainbow',at,ids)
  }
 }else if(specialPair){
  alreadyFired.add(first.id);alreadyFired.add(second.id);initial.add(a);initial.add(b)
  const kinds=[first.special,second.special]
  if(kinds.includes('lightning')){const targets=seek(g,new Set([a,b]),first.special===second.special?6:3);add('lightning',a,targets)
   const partner=first.special==='lightning'?second.special:first.special
   for(const i of targets){if(partner==='bomb')add('bomb',i,square(i,1));else if(partner==='row'||partner==='column')add(partner,i,line(i,partner==='column'))}
  }else if(first.special==='bomb'&&second.special==='bomb')add('bomb',b,square(b,2))
  else if(kinds.includes('bomb')){for(const offset of [-1,0,1]){if(row(b)+offset>=0&&row(b)+offset<8)add('row',b+offset*8,line(b+offset*8,false));if(col(b)+offset>=0&&col(b)+offset<8)add('column',b+offset,line(b+offset,true))}}
  else {add('row',b,line(b,false));add('column',b,line(b,true))}
 }
 let groups=matches(g.board),firstRound=true,rounds=0
 while((initial.size||groups.length)&&rounds++<64){
  const protectedCells=new Set<number>(),created:{at:number;tile:Gem;bonus:number}[]=[]
  if(!firstRound||!specialPair&&!rainbow){for(const group of groups){group.cells.forEach(i=>initial.add(i));if(group.special){const at=[b,a,...group.cells].find(i=>group.cells.includes(i)&&g.board[i]&&!g.board[i]?.special)
   if(at!==undefined){protectedCells.add(at);created.push({at,tile:{...g.board[at]!,color:group.special==='rainbow'?null:g.board[at]!.color,special:group.special},bonus:group.special==='rainbow'||group.special==='bomb'?200:100})}
  }}}
  const removed=new Set<number>(),fired=new Set(alreadyFired),original=structuredClone(g.board)
  let hits=initial,effects=initialEffects,bonus=created.reduce((n,c)=>n+c.bonus,0),generation=0
  while(hits.size&&generation++<65){
   const fresh=[...hits].filter(i=>g.board[i]&&!removed.has(i)&&!protectedCells.has(i)),next=new Set<number>(),nextEffects:Effect[]=[]
   for(const i of fresh){const t=original[i]!;if(t.special&&!fired.has(t.id)){fired.add(t.id);let targets:number[]=[]
    if(t.special==='row'||t.special==='column')targets=line(i,t.special==='column')
    else if(t.special==='bomb')targets=square(i,1)
    else if(t.special==='lightning')targets=seek(g,new Set([...removed,...fresh,...protectedCells]))
    else{const color=all.map(i=>original[i]).find(t=>t?.color!=null)?.color;targets=all.filter(i=>original[i]?.color===color)}
    nextEffects.push({kind:t.special,from:i,targets});targets.forEach(i=>next.add(i))
   }}
   if(fresh.length||bonus){combo++;g.maxCombo=Math.max(combo,g.maxCombo);const gain=Math.round((fresh.length*50+bonus)*COMBOS[Math.min(combo-1,5)]);g.score+=gain
    // Clearing snapshots retain bodies so the visual layer can fracture them before dropping.
    const visible=structuredClone(g.board);for(const i of fresh){removed.add(i);if(g.ice[i])g.ice[i]--;g.board[i]=null}
    for(const c of created)g.board[c.at]=c.tile
    frame('CLEARING',{board:visible,gain,removed:fresh,effects});bonus=0
   }else if(effects.length)frame('CLEARING',{effects})
   hits=next;effects=nextEffects
  }
  for(const c of created)g.board[c.at]=c.tile
  const motions:Motion[]=[]
  for(let c=0;c<8;c++){
   const existing=all.filter(i=>col(i)===c&&g.board[i]).map(i=>({tile:g.board[i]!,from:i}));const empty=8-existing.length
   for(let r=7;r>=0;r--){const to=r*8+c,old=existing[r-empty];if(old){g.board[to]=old.tile;if(old.from!==to)motions.push({id:old.tile.id,from:old.from,to})}else{const tile=gem(g);g.board[to]=tile;motions.push({id:tile.id,from:(r-empty)*8+c,to})}}
  }
  frame('FALLING',{motions});frame('REFILLING');groups=matches(g.board);initial=new Set();initialEffects=[];alreadyFired=new Set();firstRound=false
  if(groups.length)frame('CASCADING')
 }
 if(matches(g.board).length||!moves(g.board,g.ice).length){shuffle(g);frame('REFILLING',{motions:g.board.map((t,i)=>({id:t!.id,from:i-64,to:i}))})}
 g.status=g.score>=stages[g.stage-1].target?'won':g.moves===0?'lost':'playing';frame('IDLE')
 return {game:g,frames,valid:true}
}
