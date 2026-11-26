import {ADVENTURERS} from '../src/arena/adventurers'
import {arenaProgress,arenaAccount} from '../src/arena/server'
import {createRewardHandler} from '../src/match3/rewardServer'
import type {RewardRepository,RewardSession} from '../src/match3/rewardServer'
import { test as base } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { createGameHandler } from '../src/cloud/server'
import type { CloudRepository } from '../src/cloud/server'
import type { ServerWorld } from '../src/cloud/protocol'
export const test = base.extend<{
  backend: {
    seedArena: (energy?:number) => void
    seedIntegratedGrowth: (strong?:boolean) => void
    seedFusion: (strong?:boolean) => void
    seedShop: () => void
    seedLegacySeason: () => void
    seedAdventurers: (level?:number) => void
    forceArenaRolls: (rolls:number[]) => void
    loseNextArenaResponse: (type:'arena-open'|'arena-start'|'arena-fuse'|'arena-shop'|'arena-season-start') => void
    setTime: (at:number) => void
    seedRanking: () => void
    secret: string
    attach: (context: BrowserContext) => Promise<void>
    row: () => ServerWorld
    loseNextEnhanceResponse: () => void
    pauseNextEnhanceResponse: () => () => void
    loseNextBuyResponse: () => void
    loseNextRewardResponse: () => void
    traffic: () => { action: string; type: string; bytes: number; unchanged: boolean; delta: boolean }[]
    setPhoto: (photo: string) => void
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
      loseEnhance = false,
      loseNext = false
    const traffic: { action: string; type: string; bytes: number; unchanged: boolean; delta: boolean }[] = []
    let enhanceResponseGate: Promise<void> | undefined
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
      head: async () => ({ id: row.id, revision: row.revision, updated_at: row.updated_at }),
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
    let rolls:number[]=[]
    const handler = createGameHandler({
      arenaSeed:()=>{if(rolls.length)return Math.floor(rolls.shift()!*4294967296);const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0]},
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
    let loseArena:''|'arena-open'|'arena-start'|'arena-fuse'|'arena-shop'|'arena-season-start'=''
    let loseReward=false
    const sessions=new Map<string,RewardSession&{user:string}>(),requests=new Map<string,string>()
    const rewards:RewardRepository={authorize:async user=>members.has(user),start:async(user,request,seed)=>{const old=requests.get(user+request);if(old)return sessions.get(old)!;const value={id:crypto.randomUUID(),seed,rules:6,created_at:new Date(now()).toISOString(),cursor:0,log_hash:null,checkpoint:null,coins:null,result:null,user};sessions.set(value.id,value);requests.set(user+request,value.id);return value},load:async(user,id)=>{const value=sessions.get(id);return value?.user===user?structuredClone(value):null},advance:async(user,id,cursor,hash,_log,state,complete,coins,result)=>{const value=sessions.get(id)!;if(value.user!==user)throw Error('wrong user');if(value.coins!==null)return {status:'paid',coins:value.coins,result:value.result};if(value.cursor!==cursor)return {status:'pending'};Object.assign(value,{cursor:state.cursor,log_hash:hash,checkpoint:structuredClone(state)});if(!complete)return {status:'pending'};value.coins=coins;value.result=result;row.data!.world!.coins+=coins;row.revision++;return {status:'paid',coins,result}}}
    const rewardHandler=createRewardHandler({repository:rewards,user:async token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub}catch{return null}},origins:['http://127.0.0.1:4185'],now,seed:()=>66})
    const attach = async (ctx: BrowserContext) => {
      await ctx.addInitScript(() => {
        const nativeNow = Date.now.bind(Date),
          offset = Date.parse('2026-10-15T03:00:00Z') - nativeNow()
        Date.now = () => nativeNow() + offset
      })
      let user = crypto.randomUUID()
      await ctx.route('https://cloud-fixture.supabase.co/**', async (route) => {
        const request = route.request(),
          url = request.url()
        if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) {
          if(url.includes('/auth/v1/signup'))user=crypto.randomUUID()
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
          if(loseArena&&request.postDataJSON()?.command?.type===loseArena){loseArena='';await route.abort('failed');return}
          if ((loseNext && ['buy','buy-many'].includes(request.postDataJSON()?.command?.type))||(loseEnhance&&request.postDataJSON()?.command?.type==='enhance')) {
            loseNext = false;loseEnhance=false
            await route.abort('failed')
            return
          }
          // Commit first, then let the test explicitly acknowledge the response.
          // Expose reload races without depending on runner speed or sleeps.
          if (request.postDataJSON()?.command?.type === 'enhance' && enhanceResponseGate) {
            const gate = enhanceResponseGate
            enhanceResponseGate = undefined
            await gate
          }
          const text=await response.text(),payload=JSON.parse(text),body=request.postDataJSON()
          traffic.push({action:body?.action??'',type:body?.command?.type??'',bytes:Buffer.byteLength(text),unchanged:payload.unchanged===true,delta:!!payload.delta})
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: text,
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
      loseNextArenaResponse:type=>{loseArena=type},
      seedArena:(energy=100)=>{if(!row.data)throw Error('Initialize first');const p=arenaProgress(row.data,now());p.season=2;for(const user of members){const a=arenaAccount(p,user,now());a.growth=Object.fromEntries(row.data.friends.map(f=>[f.id,{level:50,xp:0}]));a.energy={value:energy,at:now()};a.chests.legendary=2;a.chests.forest=2;a.pity.mythic=299;a.pity.legendary=39;for(const id of ['beast-lumi','beast-nebula'])a.beasts[id]??={at:now(),level:50,xp:0,shards:0,duplicates:0,mastery:0}}for(const f of row.data.friends)if(f.growth)f.growth.level=50;row.revision++},
      seedIntegratedGrowth:(strong=false)=>{if(!row.data)throw Error('Initialize first');const p=arenaProgress(row.data,now());p.season=2;p.sharedOwner??=[...members][0];const a=arenaAccount(p,p.sharedOwner,now());a.layoutVersion=2;a.chapterAccess=14;a.adventurers=Object.fromEntries(ADVENTURERS.map(h=>[h.id,{at:now(),level:50,xp:17,shards:1000,duplicates:15,...(strong?{stars:5}:{})}]));a.growth=Object.fromEntries(row.data.friends.map(f=>[f.id,{level:50,xp:7}]));a.shop={training:{'special-boy':{hp:20,atk:20,def:20},'special-girl':{hp:20,atk:20,def:20}},skills:{},command:3,scrolls:{small:2}};a.commandRelic=true;row.revision++},
      seedFusion:(strong=false)=>{if(!row.data)throw Error('Initialize first');const p=arenaProgress(row.data,now()),id=p.sharedOwner??[...members][0],a=arenaAccount(p,id,now());p.season=2;a.growth=Object.fromEntries(row.data.friends.map(f=>[f.id,{level:50,xp:0}]));for(const id of ['beast-lumi','beast-nebula','beast-phynix'])a.beasts[id]={at:now(),level:35,xp:7,mastery:2,duplicates:15,shards:id==='beast-lumi'?120:0,...(strong?{stars:5}:{})};for(const f of row.data.friends)if(f.growth)f.growth.level=50;row.revision++},
      seedShop:()=>{if(!row.data)throw Error('Initialize first');row.data.world!.coins=100000;const p=arenaProgress(row.data,now()),a=arenaAccount(p,p.sharedOwner??[...members][0],now());p.season=2;a.growth=Object.fromEntries(row.data.friends.map(f=>[f.id,{level:1,xp:0}]));a.chests.christmas=1;a.beasts['beast-lumi']={at:now(),level:1,xp:0,mastery:2,shards:0,duplicates:0,stars:3};for(const f of row.data.friends)if(f.growth){f.growth.level=1;f.growth.xp=0}row.revision++},
      forceArenaRolls:values=>{rolls=[...values]},
      seedLegacySeason:()=>{if(!row.data)throw Error('Initialize first');const p=arenaProgress(row.data,now());delete p.season;p.sharedOwner??=[...members][0];const a=arenaAccount(p,p.sharedOwner,now());for(const f of row.data.friends)if(f.growth){f.growth.level=42;f.growth.xp=17}a.energy={value:37,at:now()};a.cleared['8-5']={firstAt:now(),clears:2,firstRewarded:true};a.beasts['beast-lumi']={at:now(),level:44,xp:7,stars:4,mastery:3,duplicates:7,shards:50};a.shop={training:{momo:{hp:10,atk:20,def:30}},skills:{momo:{active1:7}},command:3,scrolls:{small:1}};a.chests.christmas=2;row.revision++},
      seedAdventurers:(level=35)=>{if(!row.data)throw Error('Initialize first');const p=arenaProgress(row.data,now());p.season=2;p.sharedOwner??=[...members][0];const a=arenaAccount(p,p.sharedOwner,now());a.adventurers=Object.fromEntries(ADVENTURERS.map(h=>[h.id,{at:now(),level,xp:0,shards:10,duplicates:1}]));a.growth=Object.fromEntries(row.data.friends.map(f=>[f.id,{level:35,xp:0}]));a.chests.christmas=2;a.pity={legendary:0,mythic:0};a.shop??={training:{},skills:{},command:3,scrolls:{small:2}};a.shop.command=3;row.data.world!.coins=100000;row.revision++},
      traffic: () => structuredClone(traffic),
      setPhoto: (photo:string) => { if(!row.data)throw Error('Initialize first');row.data.friends[0].photo=photo;row.revision++ },
      setTime: (at:number) => {timeOffset=at-(epoch+Date.now()-clockStarted)},
      seedRanking: () => {if(!row.data)throw Error('Initialize test world first');row.data.world!.sichuan={version:1,nextStartAt:0,competitions:{},bests:[{playerId:'test-player',nickname:'오늘친구',elapsedMs:1234,at:now(),sessionId:'test-record'}]};row.revision++},
      attach,
      row: () => structuredClone(row),
      loseNextRewardResponse:()=>{loseReward=true},
      loseNextEnhanceResponse:()=>{loseEnhance=true},
      pauseNextEnhanceResponse:()=>{
        if(enhanceResponseGate)throw Error('An enhancement response is already paused')
        let release!: () => void
        enhanceResponseGate = new Promise<void>(resolve=>{release=resolve})
        return release
      },
      loseNextBuyResponse: () => {
        loseNext = true
      },
    })
  },
})
