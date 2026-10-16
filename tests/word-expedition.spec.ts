import {test,expect} from '@playwright/test'
import {wordById} from '../src/words/bank'
const at=Date.parse('2026-10-16T03:00:00Z')
test('word expedition completes all 30 questions, scores each once, restores progress and keeps cooldown and review rewards separate',async({page})=>{
 test.setTimeout(120000)
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.goto('/')
 await page.getByRole('navigation').getByRole('button',{name:'영단어 탐험',exact:true}).click()
 await page.getByRole('button',{name:'영단어 탐험 시작',exact:true}).click()
 const play=page.getByTestId('word-play')
 await expect(play).toHaveAttribute('data-status','unanswered')
 await page.getByRole('button',{name:'정답 확인',exact:true}).click();await expect(page.getByRole('alert')).toContainText('입력')
 for(let n=0;n<30;n++){
  await expect(page.locator('.word-stage')).toContainText(`${n+1} / 30문제`)
  const id=await play.getAttribute('data-word-id');expect(id).toBeTruthy()
  if(n<3){await page.getByRole('button',{name:/^힌트 · 남은/}).click();await page.getByRole('button',{name:'힌트 다시 보기'}).click()}
  if(n===3)await expect(page.getByRole('button',{name:'힌트 · 남은 0회'})).toBeDisabled()
  if(n===10||n===20)await expect(page.getByRole('button',{name:'힌트 · 남은 3회'})).toBeEnabled()
  if(n===0){await page.getByRole('button',{name:'정답 보기',exact:true}).click();await page.getByRole('button',{name:'정답 보기',exact:true}).click();await expect(page.locator('.word-score')).toContainText('오답 1');await page.getByRole('button',{name:'다음 문제',exact:true}).click()}
  else if(n===1)await page.getByRole('button',{name:'건너뛰기',exact:true}).click()
  else if(n===2){await page.getByLabel('한국어 뜻',{exact:true}).fill('모르는 답');await page.getByRole('button',{name:'정답 확인',exact:true}).click();await page.getByRole('button',{name:'정답 보기',exact:true}).click();await expect(page.locator('.word-score')).toContainText('오답 3');await page.getByRole('button',{name:'다음 문제',exact:true}).click()}
  else{await page.getByLabel('한국어 뜻',{exact:true}).fill(wordById[id!].acceptedAnswers[0]);if(n%2)await page.getByLabel('한국어 뜻',{exact:true}).press('Enter');else await page.getByRole('button',{name:'정답 확인',exact:true}).click()}
  if(n===7){await expect(page.locator('.word-stage')).toContainText('9 / 30문제');await page.reload();await page.getByRole('navigation').getByRole('button',{name:'영단어 탐험',exact:true}).click();await expect(page.locator('.word-stage')).toContainText('9 / 30문제')}
 }
 await expect(page.getByTestId('word-reward')).toHaveText('270코인')
 await expect(page.getByRole('button',{name:'영단어 탐험 시작',exact:true})).toBeDisabled()
 const raw=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!))
 expect((await raw()).world.coins).toBe(570)
 await page.reload();await page.getByRole('navigation').getByRole('button',{name:'영단어 탐험',exact:true}).click()
 expect((await raw()).world.coins).toBe(570)
 await page.getByRole('button',{name:'오답 노트 (3)',exact:true}).click();await expect(page.locator('.wrong-notes article')).toHaveCount(3)
 const before=(await raw()).world.words.nextStartAt
 await page.getByRole('button',{name:'오답 복습',exact:true}).click()
 for(let i=0;i<3;i++){await expect(page.locator('.word-stage')).toContainText(`${i+1} / 3문제`);const id=await play.getAttribute('data-word-id');await page.getByLabel('한국어 뜻',{exact:true}).fill(wordById[id!].acceptedAnswers[0]);await page.getByRole('button',{name:'정답 확인',exact:true}).click()}
 await expect(page.getByTestId('word-reward')).toHaveText('0코인');expect((await raw()).world.coins).toBe(570);expect((await raw()).world.words.nextStartAt).toBe(before)
 expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)
 await page.screenshot({path:`/tmp/pocket-word-${test.info().project.name}.png`,fullPage:true})
})
