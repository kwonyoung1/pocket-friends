import {test,expect} from '@playwright/test'
test('board gestures stay inside the game and closing it restores ordinary page scrolling',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'사천성',exact:true}).click();await page.getByRole('button',{name:'사천성 탐험 시작'}).click()
 const board=page.getByTestId('sichuan-board');await board.scrollIntoViewIfNeeded()
 const metrics=()=>page.evaluate(()=>({page:scrollY,modal:document.querySelector('.sichuan-backdrop')!.scrollTop}))
 const before=await metrics(),box=(await board.boundingBox())!,x=box.x+box.width/2,y=box.y+box.height*.75
 if(info.project.name==='mobile'){
  const cdp=await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
  for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-box.height*.4*i/5}]})
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()
 }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-box.height*.4,{steps:5});await page.mouse.up()}
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())))
 expect(await metrics()).toEqual(before)
 await page.getByRole('button',{name:'사천성 닫기'}).click();const old=await page.evaluate(()=>scrollY)
 await page.mouse.move(200,300);await page.mouse.wheel(0,500)
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(old)
})
