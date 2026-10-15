import type { ServerWorld, WorldRow, Holds } from './protocol.ts'
import {
  applyCommand,
  freshWorld,
  importWorld,
  validateCommand,
} from './engine.ts'
export interface CloudRepository {
  loginSlot(): Promise<boolean>
  authorize(user: string): Promise<boolean>
  enroll(user: string): Promise<void>
  revoke(user: string): Promise<void>
  load(): Promise<ServerWorld>
  commit(
    user: string,
    operation: string,
    command: unknown,
    expected: number,
    data: unknown,
    holds: Holds,
    message: string,
  ): Promise<{ status: 'ok' | 'duplicate' | 'conflict'; message?: string }>
}
export const publicRow = (r: ServerWorld): WorldRow => ({
  id: r.id,
  revision: r.revision,
  data: r.data,
  updated_at: r.updated_at,
})
export function createGameHandler(options: {
  repository: CloudRepository
  user: (token: string) => Promise<string | null>
  password: () => string | undefined
  origins: string[]
  now?: () => number
  wait?: (ms: number) => Promise<void>
}) {
  const { repository: db } = options,
    now = options.now ?? Date.now
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? ''
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': options.origins.includes(origin)
        ? origin
        : '',
      'Access-Control-Allow-Headers':
        'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    }
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers })
    if (origin && !options.origins.includes(origin))
      return reply({ error: '허용되지 않은 사이트예요.' }, 403)
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers })
    if (request.method !== 'POST')
      return reply({ error: 'POST 요청만 허용해요.' }, 405)
    try {
      const token = request.headers
        .get('authorization')
        ?.replace(/^Bearer /i, '')
      const user = token ? await options.user(token) : null
      if (!user) return reply({ error: '다시 로그인해 주세요.' }, 401)
      // Limit streamed bodies too, without trusting Content-Length.
      const reader = request.body?.getReader()
      if (!reader) return reply({ error: '빈 요청이에요.' }, 400)
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const part = await reader.read()
        if (part.done) break
        size += part.value.length
        if (size > 2_100_000) {
          await reader.cancel()
          return reply({ error: '요청이 너무 커요.' }, 413)
        }
        chunks.push(part.value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      const body = JSON.parse(new TextDecoder().decode(bytes))
      if (body.action === 'login') {
        const password = options.password()
        if (!password)
          return reply(
            { error: '서버 접속 비밀번호가 아직 설정되지 않았어요.' },
            503,
          )
        if (!(await db.loginSlot()))
          return reply(
            { error: '입장 시도가 많아요. 15분 후 다시 시도해 주세요.' },
            429,
          )
        if (typeof body.password !== 'string' || body.password.length > 128)
          return reply({ error: '비밀번호를 확인해 주세요.' }, 403)
        const hash = async (v: string) =>
          new Uint8Array(
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)),
          )
        const [a, b] = await Promise.all([hash(password), hash(body.password)])
        let different = 0
        for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i]
        if (different) return reply({ error: '비밀번호가 맞지 않아요.' }, 403)
        await db.enroll(user)
        return reply({ row: publicRow(await db.load()) })
      }
      if (!(await db.authorize(user)))
        return reply(
          { error: '입장 인증이 만료되었어요. 다시 로그인해 주세요.' },
          403,
        )
      if (body.action === 'logout') {
        await db.revoke(user)
        return reply({ ok: true })
      }
      if (body.action === 'status')
        return reply({ row: publicRow(await db.load()) })
      if (
        body.action !== 'command' ||
        typeof body.operation !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          body.operation,
        )
      )
        return reply({ error: '올바른 작업 번호가 필요해요.' }, 400)
      if (body.clientVersion !== 2 && (await db.load()).data?.world?.expansion)
        return reply(
          {
            error: '게임이 업데이트되었어요. 새로고침 후 다시 시도해 주세요.',
            rejected: true,
          },
          409,
        )
      // Receipt lookup happens before evaluating a consumed hold or an already-imported world.
      const receipt = await db.commit(
        user,
        body.operation,
        body.command,
        -1,
        null,
        {},
        '',
      )
      if (receipt.status === 'duplicate')
        return reply({
          row: publicRow(await db.load()),
          message: receipt.message,
        })
      const initialize = body.command?.type === 'initialize'
      let command: ReturnType<typeof validateCommand> | null = null
      try {
        command = initialize ? null : validateCommand(body.command)
      } catch (error) {
        return reply({ error: (error as Error).message, rejected: true }, 400)
      }
      for (let attempt = 0; attempt < 6; attempt++) {
        const row = await db.load()
        if (initialize && row.data) {
          const prior = await db.commit(
            user,
            body.operation,
            body.command,
            row.revision,
            row.data,
            row.holds,
            '공유 월드를 이미 만들었어요.',
          )
          if (prior.status === 'duplicate')
            return reply({ row: publicRow(row), message: prior.message })
          return reply(
            {
              error:
                '다른 기기에서 이미 월드를 만들었어요. 공유 월드 사용하기를 선택해 주세요.',
              row: publicRow(row),
              rejected: true,
            },
            409,
          )
        }
        if (!initialize && !row.data)
          return reply(
            { error: '먼저 기존 데이터를 가져오거나 새 월드를 만들어 주세요.' },
            409,
          )
        // Server measures the hold. Network jitter cannot turn an early call into a reward.
        if (command?.type === 'pet-special') {
          const hold = row.holds[command.friendId]
          if (
            hold?.id === command.holdId &&
            hold.user === user &&
            now() - hold.at < 2000
          ) {
            await (
              options.wait ??
              ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
            )(2000 - (now() - hold.at) + 10)
          }
        }
        const at = now()
        let result: ReturnType<typeof applyCommand>
        try {
          result = initialize
            ? {
                save:
                  body.command.source === 'local'
                    ? importWorld(body.command.data, at)
                    : body.command.source === 'fresh'
                      ? freshWorld(at)
                      : (() => {
                          throw Error('가져올 데이터를 선택해 주세요.')
                        })(),
                holds: {},
                message: '공유 월드를 안전하게 만들었어요.',
              }
            : applyCommand(row.data!, row.holds, command!, user, at)
        } catch (error) {
          return reply(
            {
              error:
                error instanceof Error
                  ? error.message
                  : '올바르지 않은 게임 행동이에요.',
              rejected: true,
            },
            400,
          )
        }
        const committed = await db.commit(
          user,
          body.operation,
          body.command,
          row.revision,
          result.save,
          result.holds,
          result.message,
        )
        if (committed.status === 'conflict') continue
        return reply({
          row: publicRow(await db.load()),
          message: committed.message ?? result.message,
        })
      }
      return reply(
        {
          error: '다른 기기에서 변경 중이에요. 같은 작업을 다시 시도해 주세요.',
        },
        409,
      )
    } catch (error) {
      if (error instanceof SyntaxError)
        return reply({ error: '요청 형식이 올바르지 않아요.' }, 400)
      // Domain failures are safe Korean messages; infrastructure details stay server-side.
      const text =
        error instanceof Error && /[가-힣]/.test(error.message)
          ? error.message
          : '클라우드 연결에 실패했어요. 잠시 후 같은 작업을 다시 시도해 주세요.'
      return reply({ error: text }, 503)
    }
  }
}
