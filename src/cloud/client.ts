import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { GameCommand, WorldRow } from './protocol'
import { resolveCloudConfiguration } from './configuration'
export type InitialCommand = { type: 'initialize'; source: 'fresh' | 'local'; data?: unknown }
type Pending = { operation: string; command: GameCommand | InitialCommand }
export type CloudState = { phase: 'loading' | 'login' | 'ready'; row: WorldRow | null; busy: boolean; blocking: boolean; error: string; message: string; realtime: boolean; pending: boolean }
class CloudRequestError extends Error { constructor(message: string, readonly rejected = false) { super(message) } }
const pendingKey = 'pocket-friends-cloud-pending'
export class CloudClient {
  private state: CloudState = { phase: 'loading', row: null, busy: false, blocking: false, error: '', message: '', realtime: false, pending: false }
  private listeners = new Set<() => void>()
  private pending: Pending[] = []
  private channel?: RealtimeChannel
  private timer?: ReturnType<typeof setInterval>
  private reading = false
  private draining?: Promise<void>
  private processingQueue = false
  private heartbeat = 0
  private disposed = false
  private serverAt = 0
  private receivedAt = 0
  now = () => this.serverAt + (performance.now() - this.receivedAt)
  playerId = ''
  readonly sdk: SupabaseClient
  constructor(private url: string, private key: string) {
    this.sdk = createClient(url, key, { auth: { storageKey: 'pocket-friends-cloud-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    try { this.pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? '[]') } catch { /* original game data is untouched */ }
    if (!Array.isArray(this.pending)) this.pending = []
    this.state.pending = this.pending.length > 0
    this.state.blocking = this.pending.some(p => p.command.type !== 'refresh')
  }
  snapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  // Background refreshes use the same durable queue without locking gameplay.
  private update(patch: Partial<CloudState>) { if (this.disposed) return; this.state = { ...this.state, ...patch }; this.state.blocking = this.pending.some(p => p.command.type !== 'refresh') || (this.state.busy && !this.processingQueue); this.listeners.forEach(fn => fn()) }
  private accept(row: WorldRow) { if (!this.state.row || row.revision >= this.state.row.revision) this.update({ row }) }
  private async request(body: unknown): Promise<{ row: WorldRow; message?: string }> {
    const { data: { session } } = await this.sdk.auth.getSession()
    if(session)this.playerId=session.user.id
    if (!session) { this.update({ phase: 'login' }); throw Error('다시 로그인해 주세요.') }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(`${this.url}/functions/v1/game`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: this.key, Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...(body as object), clientVersion: 10 }), signal: controller.signal })
      const result = await response.json()
      if (Number.isFinite(result.serverTime)) { this.serverAt = result.serverTime; this.receivedAt = performance.now() }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403 && body && typeof body === 'object' && 'action' in body && body.action !== 'login') this.update({ phase: 'login' })
        if (result.row) this.accept(result.row)
        throw new CloudRequestError(result.error ?? '클라우드 연결에 실패했어요.', result.rejected === true)
      }
      return result
    } catch (error) { if (error instanceof CloudRequestError) throw error; throw Error(error instanceof Error && /[가-힣]/.test(error.message) ? error.message : '동기화에 실패했어요. 연결을 확인하고 다시 시도해 주세요.') }
    finally { clearTimeout(timer) }
  }
  async start() {
    try {
      const { data: { session } } = await this.sdk.auth.getSession()
      if (!session) { this.update({ phase: 'login' }); return }
      const result = await this.request({ action: 'status' }); this.accept(result.row); this.update({ phase: 'ready' }); this.watch()
    } catch (e) { this.update({ phase: 'login', error: (e as Error).message }) }
  }
  async login(password: string) {
    this.update({ busy: true, error: '' })
    try {
      const { data: { session } } = await this.sdk.auth.getSession()
      if (!session) { const { error } = await this.sdk.auth.signInAnonymously(); if (error) throw Error('기기 로그인을 시작하지 못했어요. Supabase Anonymous sign-ins 설정을 확인해 주세요.') }
      const result = await this.request({ action: 'login', password })
      this.accept(result.row); this.update({ phase: 'ready', error: '' }); this.watch()
    } catch (e) { this.update({ error: (e as Error).message }) }
    finally { this.update({ busy: false }) }
  }
  private resume = () => {if(!document.hidden&&this.state.phase==='ready'&&this.state.row?.data&&!this.pending.length&&!this.state.busy)void this.send({type:'refresh'})}
  private watch() {
    if (this.timer) return
    this.channel = this.sdk.channel('shared-home').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_worlds', filter: 'id=eq.home' }, () => { void this.read() }).subscribe(status => this.update({ realtime: status === 'SUBSCRIBED' }))
    this.heartbeat = performance.now()
    document.addEventListener('visibilitychange',this.resume)
    this.timer = setInterval(() => {
      if (this.state.phase !== 'ready') return
      void this.read()
      if (this.state.row?.data && performance.now() - this.heartbeat >= 30000 && !this.pending.length && !this.state.busy) { this.heartbeat = performance.now(); void this.send({ type: 'refresh' }) }
    }, 5000)
  }
  async read() {
    if (this.reading || this.disposed) return
    this.reading = true
    try { const result = await this.request({ action: 'status' }); this.accept(result.row); if (!this.pending.length) this.update({ error: '' }) }
    catch (e) { this.update({ error: (e as Error).message }) }
    finally { this.reading = false }
  }
  private saveQueue() { try { sessionStorage.setItem(pendingKey, JSON.stringify(this.pending)); return true } catch { return false } }
  async send(command: GameCommand | InitialCommand) {
    if (this.pending.length >= 20 || this.state.error && this.pending.some(p => p.command.type !== 'refresh')) { this.update({ error: '앞선 작업을 다시 확인한 뒤 시도해 주세요.' }); return }
    this.pending.push({ operation: crypto.randomUUID(), command })
    if (!this.saveQueue()) { this.pending.pop(); this.update({ error: '작업 번호를 저장하지 못해 요청을 보내지 않았어요. 브라우저 저장 공간을 확인해 주세요.', pending: this.pending.length > 0 }); return }
    this.update({ pending: true }); await this.retry()
  }
  async retry() {
    // Every caller waits for its queued command, even when a refresh is in flight.
    if (this.draining) return this.draining
    if (!this.pending.length || this.state.busy) return
    this.processingQueue = true
    this.draining = this.drainQueue()
    try { await this.draining }
    finally { this.draining = undefined; this.processingQueue = false }
  }
  private async drainQueue() {
    this.update({ busy: true, error: '' })
    try {
      while (this.pending.length) {
        const result = await this.request({ action: 'command', ...this.pending[0] })
        this.accept(result.row); this.pending.shift(); this.saveQueue()
        this.update({ error: '', message: result.message ?? '', pending: this.pending.length > 0 })
      }
    } catch (e) {
      if (e instanceof CloudRequestError && e.rejected) { this.pending = []; this.saveQueue(); this.update({ pending: false }) }
      this.update({ error: (e as Error).message })
    }
    finally { this.update({ busy: false }) }
  }
  async logout() {
    if (this.state.busy) return
    this.update({ busy: true })
    try {
      // Membership is revoked before clearing the browser session (including JWT access).
      await this.request({ action: 'logout' }); await this.sdk.auth.signOut({ scope: 'local' })
      this.pending = []; try { sessionStorage.removeItem(pendingKey) } catch { /* optional */ }
      this.stop(); this.update({ phase: 'login', row: null, error: '', pending: false, realtime: false })
    } catch (e) { this.update({ error: `로그아웃을 완료하지 못했어요. ${(e as Error).message}` }) }
    finally { this.update({ busy: false }) }
  }
  private stop() { document.removeEventListener('visibilitychange',this.resume); if (this.timer) clearInterval(this.timer); this.timer = undefined; if (this.channel) void this.sdk.removeChannel(this.channel); this.channel = undefined }
  dispose() { this.stop(); this.disposed = true }
}
export function cloudConfiguration() {
  return resolveCloudConfiguration({ VITE_CLOUD_ENABLED: import.meta.env.VITE_CLOUD_ENABLED, VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY }, import.meta.env.PROD)
}
