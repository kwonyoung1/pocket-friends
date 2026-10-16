import {test,expect} from '@playwright/test'
import {freshWorld} from '../src/cloud/engine'
import {wordCommand} from '../src/words/model'
import {wordById} from '../src/words/bank'
import {makeAdoptee} from '../src/expansion/model'
import {grantSpecialFriends} from '../src/humans/model'
import {room} from '../src/room/config'
const at=Date.parse('2026-10-16T03:00:00Z')
test('bulk purchase quantity validation and an atomic mixed sale retain the wallet, counts and collection on reload',async({page})=>{
 const s=freshWorld(at);s.world!.coins=1000;s.world!.inventory={leaf:15,'treasure-diamond':1,'world-seed':1};s.world!.book.leaf={firstAt:at,lastAt:at,count:15}
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>{if(!sessionStorage.getItem('bulk-seeded')){localStorage.setItem('pocket-friends-v1',JSON.stringify(s));sessionStorage.setItem('bulk-seeded','1')}},s);await page.goto('/')
 await page.getByRole('navigation').getByRole('button',{name:'상점',exact:true}).click();await page.getByTestId('item-snack').getByRole('button',{name:'구매하기'}).click()
 const quantity=page.getByLabel('구매 수량',{exact:true}),confirm=page.getByRole('button',{name:'구매 확정',exact:true})
 for(const n of ['0','-1','1.5','10001']){await quantity.fill(n);await expect(confirm).toBeDisabled()}
 await quantity.fill('100');await expect(page.getByRole('alert')).toContainText('500개 부족');await expect(confirm).toBeDisabled()
 await quantity.fill('10');await expect(page.getByRole('alertdialog')).toContainText('150코인');await confirm.click();await expect(page.getByRole('button',{name:'보유 코인 850'})).toBeVisible()
 await page.getByRole('button',{name:'메뉴 닫기'}).click();await page.clock.runFor(1000);await page.getByRole('navigation').getByRole('button',{name:'인벤토리',exact:true}).click()
 await page.getByRole('button',{name:'일괄 판매',exact:true}).click();const list=page.locator('.bulk-sale-list')
 await expect(list).not.toContainText('세계수의 씨앗')
 await list.getByRole('checkbox',{name:/행운의 나뭇잎/}).check();await page.getByLabel('행운의 나뭇잎 판매 수량',{exact:true}).fill('10');await list.getByRole('checkbox',{name:/다이아몬드/}).check()
 await page.getByRole('button',{name:'선택한 아이템 판매',exact:true}).click();await expect(page.getByRole('alertdialog')).toContainText('전설 보물이 포함');await page.getByRole('button',{name:'판매 취소',exact:true}).click()
 await expect(page.getByRole('button',{name:'보유 코인 850'})).toBeVisible();await page.getByRole('button',{name:'선택한 아이템 판매',exact:true}).click();await page.getByRole('button',{name:'확인하고 일괄 판매',exact:true}).click();await expect(page.getByRole('button',{name:'보유 코인 3950'})).toBeVisible()
 await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.inventory.leaf).toBe(5);expect(saved.world.inventory.snack).toBe(10);expect(saved.world.inventory['treasure-diamond']).toBe(0);expect(saved.world.book.leaf.firstAt).toBe(at);expect(saved.world.trades).toHaveLength(2)
})
test('a hinted correct answer removes its saved mistake; manual deletion cancels safely and the former review button is absent',async({page})=>{
 const s=freshWorld(at);wordCommand(s,{type:'word-start',mode:'reward'},at,()=>.5);const r=s.world!.words!.round!,w=wordById[r.questions[0].wordId]
 s.world!.words!.mistakes[w.id]={word:w.word,pos:w.pos,meanings:w.meanings,example:w.example,count:2,lastAt:at}
 const other=wordById['word-issue'];s.world!.words!.mistakes[other.id]={word:other.word,pos:other.pos,meanings:other.meanings,example:other.example,count:3,lastAt:at}
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>localStorage.setItem('pocket-friends-v1',JSON.stringify(s)),s);await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'영단어 탐험',exact:true}).click()
 await page.getByRole('button',{name:'힌트 · 남은 3회',exact:true}).click();await page.getByLabel('한국어 뜻',{exact:true}).fill(w.acceptedAnswers[0]);await page.getByRole('button',{name:'정답 확인',exact:true}).click();await expect(page.locator('.word-feedback')).toContainText('오답노트에서 복습 완료!')
 await page.getByRole('button',{name:'오답 노트 (1)',exact:true}).click();await expect(page.getByRole('button',{name:'오답 복습',exact:true})).toHaveCount(0);await expect(page.locator('.wrong-notes article')).toContainText('issue')
 await page.getByRole('button',{name:'issue 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 취소',exact:true}).click();await expect(page.locator('.wrong-notes article')).toHaveCount(1)
 await page.getByRole('button',{name:'issue 삭제',exact:true}).click();await page.getByRole('button',{name:'확인하고 삭제',exact:true}).click();await expect(page.locator('.wrong-notes article')).toHaveCount(0)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.coins).toBe(300);expect(saved.world.words.round.index).toBe(1);expect(saved.world.words.removals).toHaveLength(2)
})
test('expanded room has a separate scrolling camera, ten actors and three hamsters with unchanged world sprite sizes',async({page,isMobile})=>{
 const s=freshWorld(at);s.world!.inventory.plant=1;grantSpecialFriends(s,at);s.friends.push(...['lulu','toto','byeol','mungchi'].map(id=>makeAdoptee(id,at)));s.world!.expansion??={version:1,placements:[],hamsters:[],adoptions:[],events:[],seen:[]};s.world!.expansion.hamsters=[0,1,2].map(i=>({id:`h${i}`,deployed:true,foundAt:at,regionId:'forest',x:500+i*90,y:550}))
 await page.clock.install({time:new Date(at)});await page.clock.pauseAt(new Date(at+1000));await page.addInitScript(s=>localStorage.setItem('pocket-friends-v1',JSON.stringify(s)),s);await page.goto('/');await expect(page.locator('.room-friend')).toHaveCount(10);await expect(page.locator('.room-hamster')).toHaveCount(3)
 const surface=page.locator('.room'),camera=page.getByRole('region',{name:'확장된 방 카메라'})
 await expect(surface).toHaveAttribute('data-world-width',String(room.width));const r=await surface.boundingBox(),actor=await page.getByTestId('room-momo').boundingBox();expect(actor!.width/r!.width*room.width).toBeCloseTo(100,0)
 await camera.evaluate(el=>{el.scrollLeft=el.scrollWidth;el.scrollTop=el.scrollHeight});expect(await camera.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0)
 await page.clock.runFor(20000);expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)
 if(isMobile)expect(await camera.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true)
 const discovery=page.getByRole('button',{name:'새 발견 알림 닫기',exact:true});if(await discovery.isVisible())await discovery.click()
 await page.getByRole('navigation').getByRole('button',{name:'인벤토리',exact:true}).click();await page.getByTestId('item-plant').getByRole('button',{name:'방에 배치하기'}).click();await page.clock.runFor(500)
 await page.getByRole('button',{name:'배치 카메라 오른쪽 보기',exact:true}).click();const rect=await surface.boundingBox(),point={x:rect!.x+1060/room.width*rect!.width,y:rect!.y+600/room.height*rect!.height}
 if(isMobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y)
 await page.getByRole('button',{name:'여기에 놓기',exact:true}).click();await expect(page.locator('.placed-furniture')).toHaveCount(1)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-friends-v1')!));expect(saved.world.expansion.placements[0].x).toBeCloseTo(1060,0);expect(saved.world.expansion.placements[0].y).toBeCloseTo(600,0);expect(saved.world.inventory.plant).toBe(0)
 await page.screenshot({path:`/tmp/pocket-expanded-${isMobile?'mobile':'desktop'}.png`,fullPage:true})
})
