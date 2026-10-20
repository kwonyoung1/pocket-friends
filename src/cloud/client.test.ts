import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudClient } from './client'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'player' }, access_token: 'test' } } }) } }),
}))

describe('serialized cloud commands without background input locks', () => {
  let client: CloudClient
  let storage: Map<string, string>
  let requests: { body: { operation: string; command: { type: string } }; resolve: (response: Response) => void }[]
  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) })
    requests = []
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise<Response>(resolve => requests.push({ body: JSON.parse(options.body), resolve }))))
    client = new CloudClient('https://test.supabase.co', 'public')
  })
  afterEach(() => { vi.unstubAllGlobals() })
  const flush = async () => { await vi.waitFor(() => expect(requests.length).toBeGreaterThan(0)) }
  const ok = (revision: number) => Response.json({ row: { id: 'home', revision, data: null }, serverTime: 1000 })

  it('keeps controls available throughout a background refresh', async () => {
    const job = client.send({ type: 'refresh' })
    await flush()
    expect(client.snapshot()).toMatchObject({ busy: true, pending: true, blocking: false })
    requests[0].resolve(ok(1)); await job
    expect(client.snapshot()).toMatchObject({ busy: false, pending: false, blocking: false })
  })

  it('queues a player action behind refresh, waits for acknowledgement and locks only player work', async () => {
    const refresh = client.send({ type: 'refresh' }); await flush()
    let complete = false
    const action = client.send({ type: 'care', action: 'pet', friendId: 'momo' }).then(() => { complete = true })
    await Promise.resolve()
    expect(complete).toBe(false)
    expect(requests).toHaveLength(1)
    expect(client.snapshot().blocking).toBe(true)
    requests[0].resolve(ok(1))
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(complete).toBe(false)
    expect(requests[1].body.command.type).toBe('care')
    requests[1].resolve(ok(2)); await Promise.all([refresh, action])
    expect(complete).toBe(true)
    expect(client.snapshot()).toMatchObject({ blocking: false, pending: false, busy: false })
    expect(JSON.parse(storage.get('pocket-friends-cloud-pending')!)).toEqual([])
  })

  it('retries failed background work with the same operation before a player action', async () => {
    const refresh = client.send({ type: 'refresh' }); await flush()
    const operation = requests[0].body.operation
    requests[0].resolve(Response.json({ error: '일시적인 연결 오류' }, { status: 503 })); await refresh
    expect(client.snapshot()).toMatchObject({ blocking: false, pending: true })
    const action = client.send({ type: 'care', action: 'pet', friendId: 'momo' })
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1].body.operation).toBe(operation)
    expect(client.snapshot().blocking).toBe(true)
    requests[1].resolve(ok(1))
    await vi.waitFor(() => expect(requests).toHaveLength(3))
    requests[2].resolve(ok(2)); await action
    expect(client.snapshot()).toMatchObject({ blocking: false, pending: false, error: '' })
  })

  it('keeps failed player actions locked and durable until the same operation is retried', async () => {
    const action = client.send({ type: 'care', action: 'pet', friendId: 'momo' }); await flush()
    const operation = requests[0].body.operation
    requests[0].resolve(Response.json({ error: '일시적인 연결 오류' }, { status: 503 })); await action
    expect(client.snapshot()).toMatchObject({ busy: false, blocking: true, pending: true })
    const retry = client.retry()
    await vi.waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[1].body.operation).toBe(operation)
    requests[1].resolve(ok(1)); await retry
    expect(client.snapshot().blocking).toBe(false)
  })
})
