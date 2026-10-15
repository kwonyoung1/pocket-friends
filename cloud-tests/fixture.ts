import { test as base } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { createGameHandler } from '../src/cloud/server'
import type { CloudRepository } from '../src/cloud/server'
import type { ServerWorld } from '../src/cloud/protocol'
export const test = base.extend<{ backend: { secret: string; attach: (context: BrowserContext) => Promise<void>; row: () => ServerWorld; loseNextBuyResponse: () => void } }>({
  backend: async ({ context }, use) => {
    const secret = crypto.randomUUID(), members = new Set<string>()
    let row: ServerWorld = { id: 'home', revision: 0, data: null, holds: {}, updated_at: new Date().toISOString() }, loseNext = false
    const receipts = new Map<string, { user: string; command: string; message: string }>()
    const repo: CloudRepository = {
      loginSlot: async () => true, authorize: async user => members.has(user), enroll: async user => { members.add(user) }, revoke: async user => { members.delete(user) },
      load: async () => structuredClone(row),
      commit: async (user, id, command, expected, data, holds, message) => {
        const prior = receipts.get(id)
        if (prior) { if (prior.user !== user || prior.command !== JSON.stringify(command)) throw Error('mismatch'); return { status: 'duplicate', message: prior.message } }
        if (row.revision !== expected || (command as {type: string}).type === 'initialize' && row.data) return { status: 'conflict' }
        row = { ...row, revision: row.revision + 1, data: structuredClone(data) as ServerWorld['data'], holds: structuredClone(holds), updated_at: new Date().toISOString() }
        receipts.set(id, { user, command: JSON.stringify(command), message }); return { status: 'ok', message }
      },
    }
    const handler = createGameHandler({ repository: repo, user: async token => { try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub } catch { return null } }, password: () => secret, origins: ['http://127.0.0.1:4185'] })
    const attach = async (ctx: BrowserContext) => {
      const user = crypto.randomUUID()
      await ctx.route('https://cloud-fixture.supabase.co/**', async route => {
        const request = route.request(), url = request.url()
        if (url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) {
          const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url')}.fixture`
          await route.fulfill({ json: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: user, aud: 'authenticated', role: 'authenticated', is_anonymous: true } } }); return
        }
        if (url.includes('/auth/v1/logout')) { await route.fulfill({ status: 204 }); return }
        if (url.includes('/functions/v1/game')) {
          const response = await handler(new Request(url, { method: request.method(), headers: request.headers(), ...(request.method() !== 'OPTIONS' ? { body: request.postData() } : {}) }))
          if (loseNext && request.postDataJSON()?.command?.type === 'buy') { loseNext = false; await route.abort('failed'); return }
          await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() }); return
        }
        await route.fulfill({ status: 404, json: {} })
      })
      await ctx.routeWebSocket('**/realtime/v1/**', socket => socket.close())
    }
    await attach(context)
    await use({ secret, attach, row: () => structuredClone(row), loseNextBuyResponse: () => { loseNext = true } })
  },
})
