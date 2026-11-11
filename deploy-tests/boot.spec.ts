import {test,expect} from '@playwright/test'
test('live mobile app boots at the expected version without login or world writes',async({page,request,baseURL})=>{
 const writes:string[]=[],errors:string[]=[]
 await page.route('https://*.supabase.co/**',async route=>{const r=route.request();if(['POST','PUT','PATCH','DELETE'].includes(r.method())){writes.push(`${r.method()} ${new URL(r.url()).pathname}`);await route.abort();return}await route.continue()})
 page.on('pageerror',e=>errors.push(e.message))
 const version=await request.get(new URL(`version.json?verify=${process.env.EXPECTED_SHA}`,baseURL).href)
 expect(version.ok()).toBe(true);expect((await version.json()).sha).toBe(process.env.EXPECTED_SHA)
 await page.goto('./');await expect(page.locator('meta[name=pocket-build]')).toHaveAttribute('content',process.env.EXPECTED_SHA!)
 await expect(page.getByLabel('접속 비밀번호')).toBeVisible()
 for(const [width,height]of [[360,800],[375,812],[390,844],[412,915]]){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.body.scrollWidth>innerWidth)).toBe(false)}
 expect(writes).toEqual([]);expect(errors).toEqual([])
})
