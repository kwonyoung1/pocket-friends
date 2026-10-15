export const specialCatalog = [
  {
    id: 'special-boy',
    name: '남자아이',
    kind: 'boy' as const,
    color: '#b5aaa0',
    description: '회색 니트를 입은 다정한 산책 친구',
    x: 190,
    y: 390,
  },
  {
    id: 'special-girl',
    name: '여자아이',
    kind: 'girl' as const,
    color: '#bc9e8e',
    description: '함께 있는 시간을 좋아하는 다정한 친구',
    x: 890,
    y: 550,
  },
]
export const specialIds = specialCatalog.map((f) => f.id)
export type HumanTopic =
  | 'daily'
  | 'pet'
  | 'special'
  | 'hungry'
  | 'sleep'
  | 'explore'
  | 'return'
  | 'social'
export const humanLines: Record<
  'boy' | 'girl',
  Record<HumanTopic, string[]>
> = {
  boy: {
    daily: [
      '오늘도 좋은 하루 보내자!',
      '뭐 하고 놀까?',
      '우리 같이 산책할래?',
      '작은 행복을 하나씩 찾아보자!',
      '이 집에 오면 마음이 편안해.',
      '친구들이랑 있으니까 든든해!',
    ],
    pet: [
      '헤헤, 고마워~',
      '쓰다듬어 주니 힘이 나!',
      '네 손길은 참 따뜻하다.',
      '한 번만 더 쓰담쓰담 해 줄래?',
    ],
    special: [
      '지금 이 순간이 정말 좋아!',
      '오래 함께 있어 줘서 고마워.',
      '나도 너한테 좋은 친구가 될게!',
      '우리 오늘 추억 하나 더 만들었네!',
    ],
    hungry: [
      '산책했더니 배가 고프다!',
      '따뜻한 빵을 나눠 먹고 싶어.',
      '맛있는 도시락이 생각나네~',
    ],
    sleep: [
      '벌써 졸린 것 같아~',
      '포근한 꿈에서 다시 만나자.',
      '으응… 조금만 더 잘래.',
    ],
    explore: [
      '새로운 길을 찾아 다녀올게!',
      '친구들에게 줄 선물을 찾아볼까?',
      '모험도 안전하게! 금방 돌아올게.',
    ],
    return: ['나 왔어! 재미있는 이야기가 많아!', '이걸 보고 네 생각이 났어.'],
    social: [
      '같이 앉아서 잠깐 이야기할까?',
      '오늘 어떤 즐거운 일이 있었어?',
      '네가 웃으니까 나도 웃게 돼!',
    ],
  },
  girl: {
    daily: [
      '오늘은 기분 좋은 하루야~',
      '우리 같이 놀자!',
      '오늘도 함께해서 행복해~',
      '햇살이 포근해서 산책하고 싶어.',
      '친구들과 모은 추억이 반짝반짝해!',
      '여기서 너를 기다리고 있었어.',
    ],
    pet: [
      '쓰다듬어 주니까 너무 좋아~',
      '헤헤, 간지럽지만 좋아!',
      '오늘도 다정하게 대해 줘서 고마워.',
      '네 손이 정말 따뜻해~',
    ],
    special: [
      '너랑 있으면 시간이 천천히 갔으면 좋겠어.',
      '마음까지 포근해지는 것 같아!',
      '이렇게 행복해도 되는 걸까?',
      '내 소중한 친구가 되어 줘서 고마워!',
    ],
    hungry: [
      '맛있는 거 먹고 싶다!',
      '달콤한 케이크 생각이 나~',
      '우리 도시락 나눠 먹을래?',
    ],
    sleep: [
      '눈이 스르르 감기네~',
      '좋은 꿈 꿔. 내일도 같이 놀자!',
      '으응… 포근해서 못 일어나겠어.',
    ],
    explore: [
      '작은 보물을 찾아 다녀올게!',
      '예쁜 꽃을 만나면 네게 이야기해 줄게.',
      '모험 수첩에 추억을 담아 올게!',
    ],
    return: ['다녀왔어~ 보고 싶었어!', '우리 같이 발견한 보물을 구경하자!'],
    social: [
      '너랑 이야기하면 기분이 좋아져!',
      '같이 산책하니 더 즐겁다~',
      '우리 내일도 함께 놀자!',
    ],
  },
}
export function humanLine(
  kind: string,
  topic: HumanTopic,
  last?: string,
  random = Math.random,
) {
  if (kind !== 'boy' && kind !== 'girl') return undefined
  const pool = humanLines[kind][topic].filter((s) => s !== last)
  return pool[Math.floor(random() * pool.length)]
}
