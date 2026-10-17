import type {Board,Point} from './board.ts'
import {path,rules} from './board.ts'
export type MatchEffect={id:string;sessionId:string;turn:number;a:number;b:number;board:Board;route:Point[]}
export function makeEffect(board:Board,a:number,b:number,sessionId:string,turn:number):MatchEffect|null{
 const route=path(board,a,b);return route?{id:`${sessionId}:${turn+1}`,sessionId,turn:turn+1,a,b,board:{...board,tiles:[...board.tiles]},route}:null
}
export type Combo={count:number;at:number}
export function nextCombo(previous:Combo,at:number):Combo{return{count:previous.count&&at>=previous.at&&at-previous.at<=rules.comboMs?previous.count+1:1,at}}
export const comboLabel=(count:number)=>count===3?'Nice!':count===5?'Great!':count===10?'Perfect!':''
