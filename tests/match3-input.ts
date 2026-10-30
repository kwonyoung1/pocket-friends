import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'
import {moves} from '../src/match3/engine'
import type {Board,Special} from '../src/match3/engine'
export async function currentBoard(page:Page){return page.getByRole('gridcell').evaluateAll(els=>({board:els.map(e=>({id:Number(e.getAttribute('data-gem-id')),color:e.getAttribute('data-color')==='rainbow'?null:Number(e.getAttribute('data-color')),special:e.getAttribute('data-special')||undefined})),ice:els.map(e=>Number(e.getAttribute('data-ice')))})) as Promise<{board:Board;ice:number[]}>}
export async function nextMove(page:Page){const s=await currentBoard(page);const m=moves(s.board,s.ice)[0];expect(m).toBeDefined();return m}
export async function swap(page:Page,a:number,b:number,touch=false){const one=page.locator(`[data-index="${a}"]`),two=page.locator(`[data-index="${b}"]`)
 if(touch){const p=await one.boundingBox(),q=await two.boundingBox(),x=p!.x+p!.width/2,y=p!.y+p!.height/2,tx=q!.x+q!.width/2,ty=q!.y+q!.height/2;const c=await page.context().newCDPSession(page);await c.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await c.detach()}
 else{await one.click();await two.click()}
}
export async function idle(page:Page){await expect(page.getByRole('grid')).toHaveAttribute('data-phase','IDLE',{timeout:45000})}
export type GemSpecial=Special
