import {describe,it,expect} from 'vitest'
import {TravelDirection,directionRow} from './direction'
describe('heading from actual path movement',()=>{
 it.each([[4,0,'right'],[-4,0,'left'],[0,-4,'back'],[0,4,'front']] as const)('uses vector %s,%s as %s regardless of saved facing', (x,y,expected)=>{
  const heading=new TravelDirection();heading.update(x,y,.1,true);expect(heading.direction).toBe(expected)
 })
 it('holds heading near diagonals, rejects jitter and commits sustained turns',()=>{
  const h=new TravelDirection();h.update(4,0,.1,true)
  for(let i=0;i<10;i++)h.update(2,i%2?2.1:1.9,.04,true)
  expect(h.direction).toBe('right')
  h.update(-.01,0,.04,true);expect(h.direction).toBe('right')
  h.update(0,-3,.04,true);expect(h.direction).toBe('right')
  expect(h.update(0,-3,.04,true)).toBe(true);expect(h.direction).toBe('back')
 })
 it('keeps the last valid direction while stopped, held, resumed or corrected',()=>{
  const h=new TravelDirection();h.update(-3,0,.1,true)
  for(const [x,y,dt,active] of [[0,8,.1,false],[500,0,.1,true],[4,0,1,true],[4,0,0,true]] as const)h.update(x,y,dt,active)
  expect(h.direction).toBe('left');expect(directionRow(h.direction)).toBe(0);expect(directionRow('back')).toBe(2);expect(directionRow('front')).toBe(1)
 })
})
