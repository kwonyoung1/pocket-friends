import {describe,it,expect} from 'vitest'
import {animalAppearance,animalArt,plushArt,lifeFrames} from './assets'
describe('approved plush identities without save migrations',()=>{
 it('keeps nine independently authored looks and selects saved IDs even after rename',()=>{
  expect(Object.keys(plushArt)).toHaveLength(9)
  const urls=new Set(Object.values(plushArt).map(a=>a.png));expect(urls.size).toBe(9)
  expect(animalAppearance({id:'lulu',kind:'cat',color:'#f4dfb8'})).toBe(plushArt.lulu)
  expect(animalAppearance({id:'toto',kind:'bear',color:'#b48c71'})).toBe(plushArt.toto)
  expect(animalAppearance({id:'byeol',kind:'bunny',color:'#c4afe4'})).toBe(plushArt.byeol)
  expect(animalAppearance({id:'discovered-hamster-1',kind:'hamster',color:'#e6c39a'})).toBe(plushArt.hamster)
 })
 it('supports old kind/color data and preserves every legacy life slot',()=>{
  expect(animalAppearance({kind:'cat',color:'#f4c19b'})).toBe(animalArt.cat)
  expect(animalAppearance({kind:'cat',color:'#f4dfb8'})).toBe(plushArt.lulu)
  expect(Object.entries(lifeFrames).slice(0,8).map(([key])=>key)).toEqual(['idle','blink','sit','sleep','stretch','groom','yawn','look'])
  expect(lifeFrames.eatOpen).not.toBe(lifeFrames.eatClosed)
 })
})
