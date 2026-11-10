import {it,expect} from 'vitest'
import {freshWorld} from '../cloud/engine'
import {feeling,nearbyFriend,feelings} from './presence'
const at=Date.parse('2026-11-10T12:00:00+09:00')
it('derives ten feelings from confirmed state without changing the saved friend',()=>{
 const f=freshWorld(at).friends[0];f.stats.happiness=60;f.restingUntil=0
 const original=structuredClone(f);expect(feeling(f,at)).toBe('smile');expect(f).toEqual(original)
 expect(Object.keys(feelings)).toHaveLength(10)
 f.stats.happiness=90;expect(feeling(f,at)).toBe('joy')
 f.stats.hunger=30;expect(feeling(f,at)).toBe('hungry');f.stats.hunger=31;f.stats.hygiene=30;expect(feeling(f,at)).toBe('dusty');f.stats.hygiene=31
 f.stats.energy=30;expect(feeling(f,at)).toBe('sleepy');f.stats.energy=31;f.stats.happiness=30;expect(feeling(f,at)).toBe('lonely');f.stats.happiness=60
 f.restingUntil=at+100;expect(feeling(f,at)).toBe('rest');f.eatingUntil=at+100;expect(feeling(f,at)).toBe('content');f.socialUntil=at+100;delete f.eatingUntil;expect(feeling(f,at)).toBe('excited')
 f.growth!.levelUpUntil=at+100;expect(feeling(f,at)).toBe('surprised');expect(feeling(f,Date.parse('2026-11-10T00:30:00+09:00'))).toBe('sleepy')
})
it('nearby glances exclude absent, held and sleeping friends and never move them',()=>{
 const s=freshWorld(at),[f,other]=s.friends;other.x=f.x+30;other.y=f.y
 const before=structuredClone(s);expect(nearbyFriend(f,[f,other],at)).toBe(other);expect(s).toEqual(before)
 other.growth!.awayJobId='away';expect(nearbyFriend(f,[other],at)).toBeUndefined();delete other.growth!.awayJobId
 expect(nearbyFriend(f,[other],Date.parse('2026-11-10T00:30:00+09:00'))).toBeUndefined()
})
