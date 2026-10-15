import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { GameCommand } from './protocol'
import { CloudClient, cloudConfiguration } from './client'
import { initialSnapshot, rawBackup } from '../storage'
import { parseSave } from '../game'
import { world } from '../progression/model'
import App from '../App'
import { Character } from '../Character'
import { createFriends } from '../game'
import './cloud.css'
const config = cloudConfiguration()
export function CloudGate() {
  if (!config.enabled) return <App />
  if (config.error) return <section className="cloud-gate"><h1>포켓프렌즈</h1><p role="alert">{config.error}</p><p>이 기기의 기존 사진과 육성 데이터는 그대로 보관되어 있어요.</p></section>
  return <ConnectedGame />
}
function ConnectedGame() {
  const [client] = useState(() => new CloudClient(config.url, config.key))
  const send = useCallback((c: GameCommand) => client.send(c), [client])
  const state = useSyncExternalStore(client.subscribe, client.snapshot)
  const [password, setPassword] = useState(''), [joined, setJoined] = useState(false), [confirm, setConfirm] = useState<'local' | 'fresh' | null>(null)
  const [importError, setImportError] = useState(''), [sourceName, setSourceName] = useState('이 기기의 기존 데이터')
  const [local, setLocal] = useState(() => { try { const raw = initialSnapshot(); return raw ? parseSave(raw) : null } catch { return null } })
  useEffect(() => { void client.start(); return () => client.dispose() }, [client])
  const backup = () => {
    const source = rawBackup() ?? initialSnapshot()
    if (!source) return
    const url = URL.createObjectURL(new Blob([source], { type: 'application/json' })), a = document.createElement('a')
    a.href = url; a.download = 'pocket-friends-before-cloud.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const retry = () => { void client.retry() }
  if (state.phase === 'ready' && state.row?.data && joined) return <><div className="cloud-status" role="status"><span>{state.busy ? '클라우드 처리 중…' : state.realtime ? '공유 월드 · 실시간 연결' : '공유 월드 · 5초마다 연결 확인'}</span><span>v{state.row.revision}</span><button onClick={() => { void client.read() }} disabled={state.busy}>새로 동기화</button><button onClick={() => { setJoined(false); void client.logout() }} disabled={state.busy}>로그아웃</button></div>{state.error && <div className="cloud-error" role="alert">{state.error}{state.pending && <button onClick={retry} disabled={state.busy}>같은 작업 다시 시도</button>}</div>}{state.message && <p className="cloud-message" role="status">{state.message}</p>}<App cloud={{ now: client.now, row: state.row, busy: state.busy || state.pending, error: state.error, send, retry, logout: () => { void client.logout() } }} /></>
  return <main className="cloud-gate"><div className="cloud-card"><span className="cloud-art"><Character friend={createFriends()[0]} /></span><small>OUR LITTLE SHARED HOME</small><h1>포켓프렌즈</h1>
    {state.phase === 'loading' ? <p>입장 정보를 확인하고 있어요…</p> : state.phase === 'login' ? <form onSubmit={e => { e.preventDefault(); setJoined(false); void client.login(password); setPassword('') }}><p>우리의 작은 집에 오신 걸 환영해요.</p><label>접속 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={128} autoFocus /></label><button className="primary-button" disabled={state.busy}>입장하기</button><p className="cloud-note">인증은 서버에서 확인해요.<br />기존 기기 데이터는 자동으로 삭제하지 않아요.</p></form> : <>
      <h2>{state.row?.data ? '공유 월드에 함께할까요?' : '처음 사용할 데이터를 선택해 주세요'}</h2><p>PC와 모바일의 데이터를 합산하지 않아요. 가져오면 사진도 인증된 기기들과 공유돼요.</p>
      <div className="cloud-comparison"><article><strong>{sourceName}</strong><p>{local ? `${local.friends.length}명 · ${world(local).coins.toLocaleString()}코인 · 등록 사진 ${local.friends.filter(f => f.photo).length}개` : '저장된 기존 게임이 없어요.'}</p><button onClick={backup} disabled={!initialSnapshot() && !rawBackup()}>기존 데이터 파일 백업</button></article><article><strong>클라우드 공유 월드</strong><p>{state.row?.data ? `${state.row.data.friends.length}명 · ${state.row.data.world?.coins.toLocaleString()}코인 · v${state.row.revision}` : '아직 만들어지지 않았어요.'}</p></article></div>
      {state.row?.data ? <><button className="primary-button" disabled={state.busy || state.pending} onClick={() => setJoined(true)}>이 클라우드 월드 사용하기</button><p className="cloud-note">다른 기기의 데이터로 이미 만든 월드는 여기서 덮어쓰지 않아요. 이 기기의 원본은 계속 보관돼요.</p></> : <><label className="cloud-file">백업 파일에서 원본 선택<input type="file" accept="application/json,.json" aria-label="클라우드 이전 원본 백업 선택" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
        try { if (file.size > 2_000_000) throw Error('백업 파일은 2MB 이하로 선택해 주세요.'); setLocal(parseSave(await file.text())); setSourceName('선택한 백업 파일'); setImportError('') }
        catch { setImportError('백업을 읽지 못했어요. 유효한 2MB 이하 게임 백업을 선택해 주세요.') }
      }} /></label><button className="primary-button" disabled={!local || state.busy || state.pending} onClick={() => setConfirm('local')}>이 기기 데이터를 기준으로 가져오기</button><button disabled={state.busy || state.pending} onClick={() => setConfirm('fresh')}>새 공유 월드로 시작하기</button></>}
      {confirm && <div role="dialog" aria-modal="true" aria-label="공유 월드 생성 확인"><p>{confirm === 'local' ? '이 기기의 사진·코인·육성 상태를 한 번만 복사합니다.' : '새 월드로 시작합니다. 이 기기의 기존 게임은 그대로 보관합니다.'} 다른 기기에서 동시에 만들면 먼저 완료된 월드를 사용합니다.</p><button disabled={state.busy || state.pending} onClick={() => { void client.send({ type: 'initialize', source: confirm, ...(confirm === 'local' ? { data: local } : {}) }); setConfirm(null) }}>확인하고 공유 월드 만들기</button><button onClick={() => setConfirm(null)}>취소</button></div>}
      <button disabled={state.busy} onClick={() => { void client.logout() }}>로그아웃</button>
    </>}
    {importError && <p role="alert">{importError}</p>}{state.error && <p role="alert">{state.error}</p>}{state.pending && <button onClick={retry} disabled={state.busy}>앞선 작업 결과 다시 확인</button>}
  </div></main>
}
