import {it,expect,vi} from 'vitest'
import {visualRandom} from './visualRandom'
it('keeps decorative randomness independent of the simulation stream',()=>{
 const simulation=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('simulation RNG consumed')})
 try{for(let i=0;i<20;i++){const n=visualRandom();expect(n).toBeGreaterThanOrEqual(0);expect(n).toBeLessThan(1)}expect(simulation).not.toHaveBeenCalled()}finally{simulation.mockRestore()}
})
