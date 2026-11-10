import {it,expect} from 'vitest'
import {freshWorld} from '../cloud/engine'
import {activityItem} from './activity'
const at=Date.parse('2026-11-10T03:00:00Z')
it('only shows the confirmed toy during its actual play reaction, without changing data',()=>{
 const s=freshWorld(at),f=s.friends[0];f.furnitureUntil=at+2000;f.furnitureActivity='신나는 놀이';const before=structuredClone(s)
 expect(activityItem(f,[],`${f.name}와 작은 공을 가지고 놀았어요!`,at)?.id).toBe('ball')
 expect(activityItem(f,[],'친구가 즐기는 중이에요. 잠깐 기다려 주세요.',at)).toBeUndefined()
 expect(activityItem(f,[],`${f.name}와 작은 공을 가지고 놀았어요!`,at+2001)).toBeUndefined();expect(s).toEqual(before)
})
it('uses a recent confirmed cloud/batch message for food and ignores expired reactions',()=>{
 const f=freshWorld(at).friends[0];f.eatingUntil=at+2000
 expect(activityItem(f,[{id:'x',at,text:'일괄 딸기우유 먹이주기 · 총 6명 중 2명 완료'}],'',at)?.category).toBe('food')
 expect(activityItem(f,[{id:'x',at:at-3000,text:'일괄 딸기우유 먹이주기 · 총 6명 중 2명 완료'}],'',at)).toBeUndefined()
})
