import {equipmentCatalog} from '../equipment/catalog.ts'
import { newTreasures, regionTreasures } from '../adventure/catalog.ts'
import { interactionBalance } from '../balance.ts'
import { collectionItems } from '../expansion/config.ts'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type Trait = 'active' | 'calm' | 'curious' | 'adventurous' | 'affectionate'
export const growthBalance = {
  maxLevel: 50, xpBase: 20, xpPerLevel: 10, startCoins: 300,
  xp: { feed: 3, play: 5, pet: 1, special: 3 },
  cooldown: { feed: 10000, play: 30000, pet: interactionBalance.rewardCooldownMs, special: interactionBalance.rewardCooldownMs },
  traitStep: .25, traitCooldownMs: 60000,
  bonuses: { adventurousXp: .1, curiousExtra: .08, activeTime: .05, calmEnergy: .2, affectionateSocial: 1 },
  dailyResetHourKst: 0, attendanceCoins: 30, purchaseCooldownMs: 800, itemUseCooldownMs: 1500,
  rarityWeights: { common: 65, uncommon: 25, rare: 9, legendary: 1 } as Record<Rarity, number>,
}
export const traitLabels: Record<Trait, string> = { active: '활발형', calm: '차분형', curious: '호기심형', adventurous: '모험가형', affectionate: '애교형' }
export const traitNames: Record<Trait, string> = { active: '활발함', calm: '차분함', curious: '호기심', adventurous: '모험심', affectionate: '애교' }
export const rarityLabels: Record<Rarity, string> = { common: '일반', uncommon: '고급', rare: '희귀', legendary: '전설' }
export type Item = { id: string; name: string; description: string; price: number; rarity: Rarity; icon: string; category: 'food' | 'toy' | 'decor' | 'treasure' | 'medicine' | 'equipment'; minLevel: number; sellable: boolean; salePrice?: number; consumable: boolean; effects: { hunger?: number; happiness?: number; energy?: number; hygiene?: number } }
const shop = (id: string, name: string, price: number, icon: string, category: Item['category'], effects: Item['effects'], minLevel = 1, rarity: Rarity = 'common'): Item => ({ id, name, price, icon, category, effects, minLevel, rarity, consumable: category === 'food' || category === 'medicine', sellable: true, description: category === 'medicine' ? '게임 속 감기에 걸린 친구를 치료해요. 건강한 친구에게는 사용하지 않아요.' : category === 'food' ? '맛있는 한 입으로 친구의 하루를 채워요.' : category === 'toy' ? '여러 번 함께 놀 수 있어요. 놀이 사이 30초 휴식이 필요해요.' : '방에 배치하면 친구들이 곁으로 찾아와요. 인벤토리에서 위치를 골라 보세요.' })
export const shopItems: Item[] = [
  shop('medicine', '감기약', 100, '💊', 'medicine', {}),
  shop('snack', '기본 사료', 15, '🥣', 'food', { hunger: 10 }),
  shop('bread', '폭신한 빵', 30, '🍞', 'food', { hunger: 20 }),
  shop('lunch', '과일 도시락', 50, '🍱', 'food', { hunger: 35, energy: 10 }, 1, 'uncommon'),
  shop('steak', '맛있는 스테이크', 100, '🥩', 'food', { hunger: 60 }),
  shop('cake', '특별 케이크', 200, '🍰', 'food', { hunger: 80, happiness: 15 }, 1, 'rare'),
  shop('strawberry-milk','딸기우유',60,'🥛','food',{hunger:10,happiness:15}),
  shop('cheeseburger','치즈버거',120,'🍔','food',{hunger:55,happiness:8}),
  shop('sushi-box','초밥 도시락',180,'🍣','food',{hunger:70,happiness:12}),
  shop('rainbow-macaron','무지개 마카롱',250,'🌈','food',{hunger:20,happiness:30}),
  shop('pumpkin-porridge','따뜻한 호박죽',120,'🎃','food',{hunger:35,happiness:5,energy:15}),
  shop('banana-smoothie','꿀바나나 스무디',180,'🍌','food',{hunger:20,happiness:12,energy:25}),
  shop('chicken-soup','특제 보양 삼계탕',300,'🍲','food',{hunger:60,happiness:10,energy:40}),
  shop('ball', '작은 공', 80, '🏐', 'toy', { happiness: 12 }),
  shop('doll', '인형', 150, '🧸', 'toy', { happiness: 20 }, 3, 'uncommon'),
  shop('toy', '특별 장난감', 300, '🎠', 'toy', { happiness: 30 }, 8, 'rare'),
  shop('plant', '작은 화분', 100, '🪴', 'decor', {}),
  shop('light', '별빛 조명', 250, '🌟', 'decor', {}, 5, 'uncommon'),
  shop('decoration', '희귀 장식품', 500, '🔮', 'decor', {}, 10, 'rare'),
]
export const regions = [
  { id: 'forest', name: '신비의 숲', icon: '🌳', minutes: 30, coins: 120, xp: 20, energy: 15, minLevel: 1, description: '나뭇잎 사이에 작은 보물이 숨어 있어요.', loot: { common: 'leaf', uncommon: 'mushroom', rare: 'forest-gem', legendary: 'world-seed' } },
  { id: 'beach', name: '반짝이는 해변', icon: '🏝️', minutes: 60, coins: 240, xp: 40, energy: 25, minLevel: 5, description: '파도가 남겨 준 반짝임을 찾아봐요.', loot: { common: 'shell', uncommon: 'pearl', rare: 'coral', legendary: 'moon-shell' } },
  { id: 'cave', name: '고대 동굴', icon: '⛰️', minutes: 120, coins: 500, xp: 60, energy: 40, minLevel: 10, description: '오래된 별의 이야기를 만나러 가요.', loot: { common: 'stone', uncommon: 'crystal', rare: 'fossil', legendary: 'star-heart' } },
  { id: 'garden', name: '비밀의 정원', icon: '🌷', minutes: 240, coins: 900, xp: 100, energy: 55, minLevel: 15, description: '꽃잎 사이로 마법이 반짝이는 정원.', loot: { common: 'leaf', uncommon: 'mushroom', rare: 'forest-gem', legendary: 'world-seed' } },
  {id:'mine',name:'수정 광산',icon:'💠',minutes:300,coins:1100,xp:140,energy:60,minLevel:20,description:'깊은 수정맥에서 빛나는 결정을 찾아요.',loot:{common:'stone',uncommon:'mine-blue-crystal',rare:'mine-pink-crystal',legendary:'mine-ancient-core'}},
  {id:'temple',name:'잊혀진 신전',icon:'🏛️',minutes:360,coins:1400,xp:180,energy:65,minLevel:25,description:'잊힌 수호자의 유물을 찾아요.',loot:{common:'stone',uncommon:'temple-emblem',rare:'temple-relic',legendary:'temple-sun-tablet'}},
  {id:'sanctuary',name:'별빛 성역',icon:'🌌',minutes:420,coins:1800,xp:220,energy:70,minLevel:30,description:'별과 달이 내려앉은 전설의 성역이에요.',loot:{common:'stone',uncommon:'sanctuary-star-shard',rare:'sanctuary-moon-crystal',legendary:'sanctuary-celestial-gem'}},
] as const
export const treasures: [string, string, string, Rarity][] = [
  ['leaf', '행운의 나뭇잎', '🍃', 'common'], ['mushroom', '빛나는 버섯', '🍄', 'uncommon'], ['forest-gem', '숲의 보석', '💎', 'rare'], ['world-seed', '세계수의 씨앗', '🌱', 'legendary'],
  ['shell', '작은 조개', '🐚', 'common'], ['pearl', '분홍 진주', '🫧', 'uncommon'], ['coral', '무지개 산호', '🪸', 'rare'], ['moon-shell', '달빛 소라', '🌙', 'legendary'],
  ['stone', '동굴 조약돌', '🪨', 'common'], ['crystal', '맑은 수정', '🧊', 'uncommon'], ['fossil', '고대 화석', '🦴', 'rare'], ['star-heart', '별의 심장', '🌠', 'legendary'],
]
export const items: Item[] = [...equipmentCatalog.map(i=>({...i,price:0,description:'탐험에서만 얻는 영구 장비예요. 강화·판매는 지원하지 않아요.',category:'equipment' as const,minLevel:1,sellable:false,consumable:false,effects:{}})),...regionTreasures.map(i=>({...i,price:i.salePrice*2,category:'treasure' as const,minLevel:1,sellable:true,consumable:false,effects:{}})),...newTreasures.map(t=>({...t,price:t.salePrice*2,description:`작은 별빛이 깃든 ${t.name}. 탐험에서 발견한 소중한 수집용 보물이에요.`,category:'treasure' as const,minLevel:1,sellable:true,consumable:false,effects:{}})), ...shopItems, ...collectionItems, ...treasures.map(([id, name, icon, rarity]) => ({ id, name, icon, rarity, price: { common: 10, uncommon: 30, rare: 100, legendary: 0 }[rarity], salePrice: { common: 10, uncommon: 30, rare: 100, legendary: 0 }[rarity], category: 'treasure' as const, effects: {}, consumable: false, minLevel: 1, sellable: rarity !== 'legendary', description: rarity === 'legendary' ? '오랫동안 간직하고 싶은 전설의 보물. 도감에 발견 날짜가 남아요.' : '탐험에서 발견한 작은 추억. 판매해도 도감 기록은 유지돼요.' }))]
export const itemById = Object.fromEntries(items.map(i => [i.id, i])) as Record<string, Item>
export const missions = [
  { id: 'feed', name: '맛있는 하루', description: '음식 3회 주기', target: 3, coins: 40, xp: 10 },
  { id: 'pet', name: '다정한 손길', description: '쓰다듬기 2회', target: 2, coins: 30, xp: 10 },
  { id: 'play', name: '함께 놀자', description: '놀이 1회', target: 1, coins: 40, xp: 20 },
  { id: 'explore', name: '작은 모험가', description: '탐험 1회 완료', target: 1, coins: 60, xp: 30 },
] as const

export const salePrice = (item: Item) => item.salePrice ?? Math.floor(item.price / 2)
