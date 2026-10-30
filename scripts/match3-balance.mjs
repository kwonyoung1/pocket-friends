import {createServer} from 'vite'
import {writeFile} from 'node:fs/promises'
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {newGame,moves,planMove}=await vite.ssrLoadModule('/src/match3/engine.ts'),{stages}=await vite.ssrLoadModule('/src/match3/config.ts')
 const samples=Number(process.env.MATCH3_SAMPLES??5),result=[]
 for(const stage of stages){const runs=[]
  for(let seed=0;seed<samples;seed++){let g=newGame(stage.id,stage.id*10000+seed*97+33),turns=0
   while(g.status==='playing'&&turns++<26){
    const possible=moves(g.board,g.ice),plans=possible.map(m=>planMove(g,m.a,m.b)).filter(p=>p.valid)
    const value=p=>p.game.score-g.score+p.game.board.reduce((s,t)=>s+(t?.special==='rainbow'?750:t?.special==='bomb'?300:t?.special?150:0),0)
    plans.sort((a,b)=>value(b)-value(a));if(!plans.length)throw Error(`Unplayable stage ${stage.id}`);g=plans[0].game
   }
   runs.push({seed,won:g.status==='won',score:g.score,turns,maxCombo:g.maxCombo})
  }
  result.push({stage:stage.id,colors:stage.colors,moves:stage.moves,target:stage.target,wins:runs.filter(r=>r.won).length,samples,median:runs.map(r=>r.score).sort((a,b)=>a-b)[Math.floor(samples/2)],runs})
  console.log(`Stage ${stage.id}: ${result.at(-1).wins}/${samples} wins; median ${result.at(-1).median}; target ${stage.target}`)
 }
 await writeFile('/tmp/pocket-match3-balance.json',JSON.stringify(result,null,2))
}finally{await vite.close()}
