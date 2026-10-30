import {test,expect} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
test('ten real minutes of animated play collect frame, long-task and retained-heap measurements',async({page},info)=>{
 test.skip(process.env.MATCH3_SOAK!=='1','Opt-in real 10-minute measurement; normal CI runs the functional chain tests.')
 test.setTimeout(660000)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tests/fixtures/match3.html?case=chain10&soak=1');await expect(page.getByRole('gridcell')).toHaveCount(64)
 const session=await page.context().newCDPSession(page);await session.send('HeapProfiler.collectGarbage');const before=await session.send('Runtime.getHeapUsage'),nodes=await page.locator('*').count()
 await page.evaluate(()=>{(window as unknown as {match3Harness:{start:()=>void}}).match3Harness.start()})
 const started=Date.now();let reported=0;while(Date.now()-started<600000){await page.waitForTimeout(Math.max(0,Math.min(10000,600000-(Date.now()-started))));if(Date.now()-started>reported+60000){reported=Date.now()-started;console.log(info.project.name,await page.evaluate(()=>(window as unknown as {match3Harness:{peek:()=>unknown}}).match3Harness.peek()))}}
 const metrics=await page.evaluate(()=>{return (window as unknown as {match3Harness:{stop:()=>Record<string,number>}}).match3Harness.stop()})
 await session.send('HeapProfiler.collectGarbage');const after=await session.send('Runtime.getHeapUsage');const result={project:info.project.name,viewport:page.viewportSize(),...metrics,heapBefore:before.usedSize,heapAfter:after.usedSize,retainedHeapDelta:after.usedSize-before.usedSize,nodesBefore:nodes,errors}
 await writeFile(`/tmp/pocket-match3-performance-${info.project.name}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result))
 expect(metrics.durationMs).toBeGreaterThanOrEqual(600000);expect(metrics.turns).toBeGreaterThan(100);expect(metrics.domNodes).toBeLessThan(nodes+300);expect(after.usedSize-before.usedSize).toBeLessThan(8*1024*1024);expect(errors).toEqual([]);await session.detach()
})
