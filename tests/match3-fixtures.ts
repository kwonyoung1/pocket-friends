import {newGame,newChallenge,planMove} from '../src/match3/engine'
import type {Game,Special} from '../src/match3/engine'
export function denseGame(seed:number){const g=newGame(30,seed);g.ice.fill(0);for(let i=0;i<64;i+=4)g.board[i]={...g.board[i]!,special:(['row','column','bomb','lightning'] as Special[])[Math.floor(i/4)%4]};g.board[27]={...g.board[27]!,color:null,special:'rainbow'};g.board[28]={...g.board[28]!,color:1,special:undefined};return g}
export function scenario(kind:string):Game{
 if(kind==='challenge')return newChallenge(66)
 if(kind==='level12'){const g=newChallenge(66);g.score=259999;return g}
 if(kind==='fast-level'){const g=newChallenge(66);g.score=59999;return g}
 if(kind==='challenge-legacy')return newChallenge(66,4)
 if(kind.startsWith('chain')){const depth=Number(kind.replace('chain',''));for(let seed=1;seed<=1000;seed++){const g=denseGame(seed);if(planMove(g,27,28).game.maxCombo>=depth)return g}throw Error('No deterministic chain fixture')}
 const g=newGame(1,kind==='invalid'?55:66)
 if(kind==='win')g.score=1999
 if(kind==='fail'){g.moves=1;g.score=0}
 if(kind==='rainbow'){g.stage=30;g.ice.fill(0);for(const i of [27,28])g.board[i]={...g.board[i]!,color:null,special:'rainbow'}}
 return g
}
