import {createRewardHandler} from '../src/match3/rewardServer'
import type {RewardRepository,RewardSession} from '../src/match3/rewardServer'
import { test as base } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { createGameHandler } from '../src/cloud/server'
import type { CloudRepository } from '../src/cloud/server'
import type { ServerWorld } from '../src/cloud/protocol'
export const test = base.extend<{
  backend: {
    setTime: (at:number) => void
    seedRanking: () => void
    secret: string
    attach: (context: BrowserContext) => Promise<void>
    row: () => ServerWorld
    loseNextBuyResponse: () => void
    loseNextRewardResponse: () => void
  }
}>({
  backend: async ({ context }, use) => {
    let timeOffset=0
    const clockStarted = Date.now(),
      epoch = Date.parse('2026-10-15T03:00:00Z'),
      now = () => epoch + Date.now() - clockStarted + timeOffset
    const secret = crypto.randomUUID(),
      members = new Set<string>()
    let row: ServerWorld = {
        id: 'home',
        revision: 0,
        data: null,
        holds: {},
        updated_at: new Date().toISOString(),
      },
      loseNext = false
    const receipts = new Map<
      string,
      { user: string; command: string; message: string }
    >()
    const repo: CloudRepository = {
      loginSlot: async () => true,
      authorize: async (user) => members.has(user),
      enroll: async (user) => {
        members.add(user)
      },
      revoke: async (user) => {
        members.delete(user)
      },
      load: async () => structuredClone(row),
      commit: async (user, id, command, expected, data, holds, message) => {
        const prior = receipts.get(id)
        if (prior) {
          if (prior.user !== user || prior.command !== JSON.stringify(command))
            throw Error('mismatch')
          return { status: 'duplicate', message: prior.message }
        }
        if (
          row.revision !== expected ||
          ((command as { type: string }).type === 'initialize' && row.data)
        )
          return { status: 'conflict' }
        row = {
          ...row,
          revision: row.revision + 1,
          data: structuredClone(data) as ServerWorld['data'],
          holds: structuredClone(holds),
          updated_at: new Date().toISOString(),
        }
        receipts.set(id, { user, command: JSON.stringify(command), message })
        return { status: 'ok', message }
      },
    }
    const handler = createGameHandler({
      repository: repo,
      user: async (token) => {
        try {
          return JSON.parse(
            Buffer.from(token.split('.')[1], 'base64url').toString(),
          ).sub
        } catch {
          return null
        }
      },
      password: () => secret,
      origins: ['http://127.0.0.1:4185'],
      now,
    })
    let loseReward=false
    const sessions=new Map<string,RewardSession&{user:string}>(),requests=new Map<string,string>()
    const rewards:RewardRepository={authorize:async user=>members.has(user),start:async(user,request,seed)=>{const old=requests.get(user+request);if(old)return sessions.get(old)!;const value={id:crypto.randomUUID(),seed,rules:5,created_at:new Date(now()).toISOString(),cursor:0,log_hash:null,checkpoint:null,coins:null,result:null,user};sessions.set(value.id,value);requests.set(user+request,value.id);return value},load:async(user,id)=>{const value=sessions.get(id);return value?.user===user?structuredClone(value):null},advance:async(user,id,cursor,hash,_log,state,complete,coins,result)=>{const value=sessions.get(id)!;if(value.user!==user)throw Error('wrong user');if(value.coins!==null)return {status:'paid',coins:value.coins,result:value.result};if(value.cursor!==cursor)return {status:'pending'};Object.assign(value,{cursor:state.cursor,log_hash:hash,checkpoint:structuredClone(state)});if(!complete)return {status:'pending'};value.coins=coins;value.result=result;row.data!.world!.coins+=coins;row.revision++;return {status:'paid',coins,result}}}
    const rewardHandler=createRewardHandler({repository:rewards,user:async token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub}catch{return null}},origins:['http://127.0.0.1:4185'],now,seed:()=>66})
    const attach = async (ctx: BrowserContext) => {
      await ctx.addInitScript(() => {
        const nativeNow = Date.now.bind(Date),
          offset = Date.parse('2026-10-15T03:00:00Z') - nativeNow()
        Date.now = () => nativeNow() + offset
      })
      const user = crypto.randomUUID()
      await ctx.route('https://cloud-fixture.supabase.co/**', async (route) => {
        const request = route.request(),
          url = request.url()
        if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) {
          const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user, exp: Math.floor(now() / 1000) + 3600, role: 'authenticated' })).toString('base64url')}.fixture`
          await route.fulfill({
            json: {
              access_token: token,
              refresh_token: 'test-refresh',
              token_type: 'bearer',
              expires_in: 3600,
              expires_at: Math.floor(now() / 1000) + 3600,
              user: {
                id: user,
                aud: 'authenticated',
                role: 'authenticated',
                is_anonymous: true,
              },
            },
          })
          return
        }
        if (url.includes('/auth/v1/logout')) {
          await route.fulfill({ status: 204 })
          return
        }
        if(url.includes('/functions/v1/treasure')){const response=await rewardHandler(new Request(url,{method:request.method(),headers:request.headers(),...(request.method()!=='OPTIONS'?{body:request.postData()}: {})}));const body=await response.text();if(loseReward&&JSON.parse(body).status==='paid'){loseReward=false;await route.abort('failed');return}await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body});return}
        if (url.includes('/functions/v1/game')) {
          const response = await handler(
            new Request(url, {
              method: request.method(),
              headers: request.headers(),
              ...(request.method() !== 'OPTIONS'
                ? { body: request.postData() }
                : {}),
            }),
          )
          if (loseNext && ['buy','buy-many'].includes(request.postDataJSON()?.command?.type)) {
            loseNext = false
            await route.abort('failed')
            return
          }
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: await response.text(),
          })
          return
        }
        await route.fulfill({ status: 404, json: {} })
      })
      await ctx.routeWebSocket('**/realtime/v1/**', (socket) => socket.close())
    }
    await attach(context)
    await use({
      secret,
      setTime: (at:number) => {timeOffset=at-(epoch+Date.now()-clockStarted)},
      seedRanking: () => {if(!row.data)throw Error('Initialize test world first');row.data.world!.sichuan={version:1,nextStartAt:0,competitions:{},bests:[{playerId:'test-player',nickname:'오늘친구',elapsedMs:1234,at:now(),sessionId:'test-record'}]};row.revision++},
      attach,
      row: () => structuredClone(row),
      loseNextRewardResponse:()=>{loseReward=true},
      loseNextBuyResponse: () => {
        loseNext = true
      },
    })
  },
})
