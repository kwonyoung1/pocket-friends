import {sichuanCommand,expireSichuan} from '../sichuan/model.ts'
import type {SichuanCommand} from '../sichuan/state.ts'
import {upgradeRoom} from '../room/migrate.ts'
import {trade,quantity,tradeLimits} from '../trade/model.ts'
import {wordCommand,expireWords} from '../words/model.ts'
import type {WordCommand} from '../words/state.ts'
import {defaultTaste} from '../adventure/catalog.ts'
import { settleCareAlerts } from '../careNeeds.ts'
import { specialIds } from '../humans/config.ts'
import { grantSpecialFriends } from '../humans/model.ts'
import {
  busyLife,
  lifeCommand,
  settleLife,
  attachNavigation,
  furnitureObstacles,
} from '../expansion/model.ts'
import { adoptionCatalog } from '../expansion/config.ts'
// Runs on the server. The browser never submits balances, XP or expedition results.
import { care, createFriends, decay, parseSave } from '../game.ts'
import type { Save } from '../game.ts'
import { grantPetReward } from '../interaction.ts'
import { validPosition } from '../navigation.ts'
import {
  attendance,
  buy,
  claimAchievement,
  claimMission,
  completeExpeditions,
  sell,
  startExpedition,
  useItem,
  world,
} from '../progression/model.ts'
import type { GameCommand, Holds } from './protocol.ts'
const friendIds = [
  'momo',
  'bibi',
  'coco',
  'dudu',
  ...adoptionCatalog.map((d) => d.id), ...specialIds,
]
const string = (value: unknown, max = 100): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max
export function validateCommand(value: unknown): GameCommand {
  if (!value || typeof value !== 'object')
    throw Error('잘못된 게임 명령이에요.')
  const c = value as Record<string, unknown>
  if ('friendId' in c && !friendIds.includes(String(c.friendId)))
    throw Error('친구를 선택해 주세요.')
  switch (c.type) {
    case 'sichuan-start': case 'sichuan-match': case 'sichuan-hint': case 'sichuan-shuffle': case 'sichuan-next': case 'sichuan-stop':
      if(!['adventure','competition'].includes(String(c.mode))||(c.type==='sichuan-start'?(c.nickname!==undefined&&(typeof c.nickname!=='string'||c.nickname.length>48)):(!string(c.sessionId,36)||!Number.isSafeInteger(c.turn)||Number(c.turn)<0))||(c.type==='sichuan-match'&&(!Number.isInteger(c.a)||!Number.isInteger(c.b)||Number(c.a)<0||Number(c.b)<0||Number(c.a)>119||Number(c.b)>119)))throw Error('사천성 조작 정보를 확인해 주세요.')
      break
    case 'buy-many':
      if(!string(c.id)||!quantity(c.quantity))throw Error('구매 수량은 1~10,000 사이 정수여야 해요.')
      break
    case 'sell-many':
      if(!Array.isArray(c.lines)||!c.lines.length||c.lines.length>tradeLimits.lines||c.lines.some(l=>!l||!string(l.id)||!quantity(l.quantity,tradeLimits.inventory)))throw Error('판매 항목과 수량을 확인해 주세요.')
      break
    case 'word-delete':
      if(!Array.isArray(c.ids)||!c.ids.length||c.ids.length>5000||c.ids.some(id=>!string(id,100)))throw Error('삭제할 단어를 선택해 주세요.')
      break
    case 'word-start':
      if(c.mode!=='reward')throw Error('게임 모드를 확인해 주세요.')
      break
    case 'word-answer':
    case 'word-reveal':
    case 'word-skip':
    case 'word-next':
    case 'word-hint':
    case 'word-abandon':
      if(c.mode!=='reward'||!string(c.sessionId,36)||!string(c.wordId,100)||(c.type==='word-answer'&&(typeof c.answer!=='string'||c.answer.length>120)))throw Error('단어 문제 정보를 확인해 주세요.')
      break
    case 'bath':
    case 'medicine':
      if (!friendIds.includes(String(c.friendId)))
        throw Error('친구를 선택해 주세요.')
      break
    case 'rename':
      if (!friendIds.includes(String(c.friendId)) || !string(c.name, 100))
        throw Error('이름을 확인해 주세요.')
      break
    case 'adopt':
    case 'recover-furniture':
      if (!string(c.id)) throw Error('항목을 선택해 주세요.')
      break
    case 'hamster':
      if (!string(c.id) || typeof c.deployed !== 'boolean')
        throw Error('햄스터를 선택해 주세요.')
      break
    case 'place':
      if (
        !string(c.itemId) ||
        (c.placementId !== undefined && !string(c.placementId)) ||
        typeof c.x !== 'number' ||
        typeof c.y !== 'number' ||
        !Number.isFinite(c.x) ||
        !Number.isFinite(c.y)
      )
        throw Error('가구 위치를 확인해 주세요.')
      break
    case 'seen-discoveries':
      break
    case 'claim-special-friends':
    case 'refresh':
    case 'attendance':
    case 'dismiss-notice':
      break
    case 'buy':
    case 'sell':
    case 'achievement':
      if (!string(c.id)) throw Error('아이템을 선택해 주세요.')
      break
    case 'use':
    case 'mission':
    case 'expedition':
      if (!string(c.id) || !friendIds.includes(String(c.friendId)))
        throw Error('친구와 항목을 선택해 주세요.')
      break
    case 'care':
      if (
        !friendIds.includes(String(c.friendId)) ||
        !['feed', 'wash', 'rest', 'pet'].includes(String(c.action))
      )
        throw Error('잘못된 돌봄이에요.')
      break
    case 'hold-start':
    case 'hold-cancel':
    case 'pet':
    case 'pet-special':
      if (!friendIds.includes(String(c.friendId)) || !string(c.holdId, 36))
        throw Error('교감 정보를 확인해 주세요.')
      break
    case 'drop':
      if (
        !friendIds.includes(String(c.friendId)) ||
        !string(c.holdId, 36) ||
        typeof c.x !== 'number' ||
        typeof c.y !== 'number' ||
        !Number.isFinite(c.x) ||
        !Number.isFinite(c.y)
      )
        throw Error('잘못된 위치예요.')
      break
    case 'photo':
      if (
        !['momo', 'bibi'].includes(String(c.friendId)) ||
        !string(c.photo, 399999) ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(c.photo)
      )
        throw Error('사진 형식을 확인해 주세요.')
      break
    default:
      throw Error('지원하지 않는 게임 명령이에요.')
  }
  return c as GameCommand
}
export function freshWorld(now: number): Save {
  const s: Save = {
    version: 2,
    savedAt: now,
    friends: createFriends(now),
    memories: [],
  }
  world(s, now)
  upgradeRoom(s)
  return s
}
export function importWorld(value: unknown, now: number): Save {
  const raw = JSON.stringify(value)
  if (raw.length > 2_000_000) throw Error('가져올 데이터가 너무 커요.')
  // Migration is a one-time, explicitly selected trust boundary; never merge economies.
  const s = parseSave(raw, now)
  s.savedAt = now
  // Imported local records cannot seed a public ranking or claim server rewards.
  if(s.world)delete s.world.sichuan
  return s
}
export function applyCommand(
  original: Save,
  oldHolds: Holds,
  command: GameCommand,
  user: string,
  now: number,
) {
  const save = structuredClone(original),
    holds = structuredClone(oldHolds)
  upgradeRoom(save)
  for (const f of save.friends) {
    f.stats = decay(f.stats, Math.max(0, now - save.savedAt))
    f.foodTaste??=defaultTaste(f.id)
    delete f.interaction
  }
  for (const id of Object.keys(holds))
    if (now - holds[id].at > 60000) delete holds[id]
  expireWords(save,now)
  expireSichuan(save,now)
  settleLife(save, now)
  attachNavigation(save)
  const returns = completeExpeditions(save, now)
  const c = command,
    f =
      'friendId' in c
        ? save.friends.find((p) => p.id === c.friendId)!
        : undefined
  if ('friendId' in c && !f) throw Error('아직 함께 살지 않는 친구예요.')
  let message = returns.join(' · ') || '클라우드와 동기화했어요.'
  switch (c.type) {
    case 'sichuan-start': case 'sichuan-match': case 'sichuan-hint': case 'sichuan-shuffle': case 'sichuan-next': case 'sichuan-stop': message=sichuanCommand(save,c as SichuanCommand,user,now);break
    case 'buy-many': case 'sell-many': message=trade(save,c,now);break
    case 'word-delete': case 'word-start': case 'word-answer': case 'word-reveal': case 'word-skip': case 'word-next': case 'word-hint': case 'word-abandon':
      message=wordCommand(save,c as WordCommand,now);break
    case 'claim-special-friends': message=grantSpecialFriends(save,now)?'남자아이와 여자아이가 새 가족이 되었어요! 특별 친구는 무료예요.':'특별 친구들과 함께하고 있어요.';break
    case 'bath':
    case 'medicine':
    case 'rename':
    case 'adopt':
    case 'place':
    case 'recover-furniture':
    case 'hamster':
    case 'seen-discoveries':
      if (c.type === 'bath' && holds[c.friendId])
        throw Error('교감이 끝난 뒤 목욕을 시작해 주세요.')
      message = lifeCommand(save, c, now)
      break
    case 'refresh':
      break
    case 'buy':
      message = buy(save, c.id, now)
      break
    case 'sell':
      message = sell(save, c.id, now)
      break
    case 'use':
      if (holds[c.friendId])
        throw Error('교감이 끝난 뒤 아이템을 사용해 주세요.')
      message = useItem(save, c.id, c.friendId, now)
      break
    case 'expedition':
      if (holds[c.friendId]) throw Error('교감이 끝난 뒤 탐험을 시작해 주세요.')
      message = startExpedition(
        save,
        c.friendId,
        c.id,
        now,
        () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
      )
      break
    case 'attendance':
      message = attendance(save, now)
      break
    case 'mission':
      message = claimMission(save, c.id, c.friendId, now)
      break
    case 'achievement':
      message = claimAchievement(save, c.id, now)
      break
    case 'dismiss-notice':
      world(save, now).notices.shift()
      break
    case 'care':
      message =
        c.action === 'wash'
          ? lifeCommand(save, { type: 'bath', friendId: f!.id }, now)
          : (care(f!, c.action, now) ?? '잠깐 기다려 주세요 ♡')
      break
    case 'photo':
      f!.photo = c.photo
      message = '친구의 사진을 클라우드에 등록했어요.'
      break
    case 'hold-start':
      if (f!.growth?.awayJobId || busyLife(f!, now))
        throw Error('탐험 중인 친구예요.')
      if (holds[f!.id] && holds[f!.id].user !== user)
        throw Error('다른 기기에서 교감 중이에요.')
      holds[f!.id] = { id: c.holdId, user, at: now }
      break
    case 'hold-cancel':
    case 'pet':
    case 'pet-special':
    case 'drop': {
      const hold = holds[f!.id]
      if (
        c.type === 'hold-cancel' &&
        (!hold || hold.id !== c.holdId || hold.user !== user)
      )
        break
      if (!hold || hold.id !== c.holdId || hold.user !== user)
        throw Error('교감이 끝났어요. 다시 터치해 주세요.')
      if (c.type === 'pet-special' && now - hold.at < 2000)
        throw Error('조금 더 오래 쓰다듬어 주세요.')
      if (c.type === 'pet' || c.type === 'pet-special') {
        if (!hold.rewarded) {
          grantPetReward(f!, c.type === 'pet-special', now)
          hold.rewarded = true
        }
        message =
          c.type === 'pet-special'
            ? '오래 마음을 나누었어요 ♡'
            : '다정한 손길을 전했어요 ♡'
      }
      if (c.type === 'drop' && !f!.growth?.awayJobId && !busyLife(f!, now)) {
        Object.assign(f!, validPosition(c, furnitureObstacles(save)))
        f!.route = []
      }
      if (c.type !== 'pet-special') delete holds[f!.id]
      break
    }
  }
  if (
    returns.length ||
    ['care', 'photo', 'pet', 'pet-special', 'use', 'expedition'].includes(
      c.type,
    )
  )
    save.memories = [
      { id: crypto.randomUUID(), text: message, at: now },
      ...save.memories,
    ].slice(0, 20)
  // Gestures and frame-by-frame simulation never become authoritative server state.
  for (const p of save.friends) {
    delete p.navObstacles
    delete p.interaction
    p.route = []
    p.moving = false
  }
  settleCareAlerts(save.friends, now)
  world(save, now).adventureVersion = 1
  world(save, now).careRulesVersion = 1
  save.savedAt = now
  return { save, holds, message }
}
