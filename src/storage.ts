import { parseSave, STORAGE_KEY } from './game'
const DATABASE = 'pocket-friends-stage-two'
let database: IDBDatabase | null = null
let initialRaw: string | null = null
let blocked = false
let brokenRaw: string | null = null
export let storageWarning = ''
let writeQueue = Promise.resolve()
function read(key: string): Promise<string | null> {
  if (!database) return Promise.resolve(null)
  return new Promise((resolve, reject) => { const request = database!.transaction('saves').objectStore('saves').get(key); request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null); request.onerror = () => reject(request.error) })
}
function put(key: string, value: string): Promise<void> {
  if (!database) return Promise.reject(Error('IndexedDB unavailable'))
  return new Promise((resolve, reject) => { const tx = database!.transaction('saves', 'readwrite'); tx.objectStore('saves').put(value, key); tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error) })
}
async function open(): Promise<void> {
  await new Promise<void>((resolve) => {
    let done = false
    const timer = setTimeout(() => { done = true; resolve() }, 1800)
    try {
      const request = indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('saves')) request.result.createObjectStore('saves') }
      request.onsuccess = () => { if (!done) { database = request.result; database.onversionchange = () => { database?.close(); database = null } } else request.result.close(); clearTimeout(timer); resolve() }
      request.onerror = request.onblocked = () => { clearTimeout(timer); resolve() }
    } catch { clearTimeout(timer); resolve() }
  })
}
export async function hydrateStorage() {
  await open()
  let local: string | null = null, db: string | null = null
  try { local = localStorage.getItem(STORAGE_KEY) } catch { storageWarning = '브라우저 저장 공간에 제한이 있어요. 추억 보관으로 백업해 주세요.' }
  try { db = await read('current') } catch { storageWarning = 'IndexedDB를 읽지 못해 기존 저장소를 사용해요.' }
  const valid: { raw: string; savedAt: number }[] = []
  for (const raw of [local, db]) {
    if (!raw) continue
    try { parseSave(raw); valid.push({ raw, savedAt: JSON.parse(raw).savedAt }) } catch { brokenRaw ??= raw }
  }
  valid.sort((a, b) => b.savedAt - a.savedAt)
  initialRaw = valid[0]?.raw ?? null
  if (!initialRaw && brokenRaw) { blocked = true; storageWarning = '저장 데이터가 손상되어 자동 덮어쓰기를 멈췄어요. 추억 보관으로 원본을 백업하고 올바른 파일을 복원해 주세요.' }
  if (initialRaw && JSON.parse(initialRaw).version === 1) {
    try { if (database && !await read('before-v2')) await put('before-v2', initialRaw) } catch { /* The legacy source remains intact until a validated snapshot is saved. */ }
    try { if (!localStorage.getItem(`${STORAGE_KEY}-before-v2`)) localStorage.setItem(`${STORAGE_KEY}-before-v2`, initialRaw) } catch { /* IndexedDB backup or manual export is still available. */ }
  }
}
export function initialSnapshot() { return initialRaw }
export function rawBackup() { return blocked ? brokenRaw : null }
export function saveSnapshot(raw: string, status: (local: boolean, indexed: boolean) => void) {
  if (blocked) { status(false, false); return }
  let local = false
  try { localStorage.setItem(STORAGE_KEY, raw); local = true } catch { /* Try IndexedDB as an independent persistence route. */ }
  status(local, !!database)
  writeQueue = writeQueue.then(async () => { try { await put('current', raw); status(local, true) } catch { status(local, false) } }).catch(() => status(local, false))
}
export async function beforeRestore(raw: string) {
  // Keep the previous game recoverable before replacing the live model.
  let saved = false
  if (database) { await put('before-restore', raw); saved = true }
  try { localStorage.setItem(`${STORAGE_KEY}-before-restore`, raw); saved = true } catch { /* One durable backup is sufficient. */ }
  if (!saved) throw Error('기존 데이터의 백업 공간이 부족해 복원을 중단했어요. 먼저 추억 보관으로 내려받아 주세요.')
  blocked = false; brokenRaw = null
}
