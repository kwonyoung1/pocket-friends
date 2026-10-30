import {test,expect} from '@playwright/test'
import {swap,idle} from './match3-input'
import {startMetrics,stopMetrics} from './match3-metrics'
import {writeFile} from 'node:fs/promises'
for(const depth of [3,5,10])test(`${depth}-chain renders its combo and returns to idle without input corruption`,async({page},info)=>{
 await page.goto(`/tests/fixtures/match3.html?case=chain${depth}`);await expect(page.getByRole('gridcell')).toHaveCount(64);let maximum=0
 await page.evaluate(()=>{const grid=document.querySelector('[role=grid]')!;document.documentElement.dataset.highestCombo='0';new MutationObserver(()=>{document.documentElement.dataset.highestCombo=String(Math.max(Number(document.documentElement.dataset.highestCombo),Number(grid.getAttribute('data-combo'))))}).observe(grid,{attributes:true,attributeFilter:['data-combo']})})
 await page.evaluate(()=>document.fonts.ready);await startMetrics(page);await swap(page,27,28);await expect(page.locator('.tm-score-burst')).toBeVisible();await idle(page);const metrics=await stopMetrics(page);await writeFile(`/tmp/pocket-match3-chain${depth}-${info.project.name}.json`,JSON.stringify(metrics,null,2));maximum=Number(await page.evaluate(()=>document.documentElement.dataset.highestCombo));expect(maximum).toBeGreaterThanOrEqual(depth);await expect(page.getByRole('gridcell')).toHaveCount(64);await expect(page.locator('.tm-effects')).toBeVisible();await page.screenshot({path:`/tmp/pocket-match3-chain${depth}-${info.project.name}.png`})
})
