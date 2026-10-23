// Original game item metadata. IDs never replace any existing treasure.
export const newTreasures = [
 {id:'treasure-pearl',name:'진주',rarity:'rare',icon:'⚪',salePrice:150,color:'#f4cfdf'},
 {id:'treasure-topaz',name:'토파즈',rarity:'rare',icon:'🔶',salePrice:250,color:'#efb85b'},
 {id:'treasure-silver',name:'은',rarity:'rare',icon:'🪙',salePrice:200,color:'#bbcdd6'},
 {id:'treasure-amethyst',name:'자수정',rarity:'rare',icon:'🔮',salePrice:300,color:'#b39bd9'},
 {id:'treasure-diamond',name:'다이아몬드',rarity:'legendary',icon:'💎',salePrice:3000,color:'#a1dce7'},
 {id:'treasure-gold',name:'금',rarity:'legendary',icon:'🏅',salePrice:1500,color:'#edc456'},
 {id:'treasure-ruby',name:'루비',rarity:'legendary',icon:'♦️',salePrice:2000,color:'#e18b9b'},
 {id:'treasure-sapphire',name:'사파이어',rarity:'legendary',icon:'🔷',salePrice:1800,color:'#8baee8'},
 {id:'treasure-emerald',name:'에메랄드',rarity:'legendary',icon:'💚',salePrice:2200,color:'#8bc5a4'},
] as const
export const specialFoodTaste = Object.freeze({like:'rainbow-macaron',dislike:'cheeseburger'})
export const foodPreferences: Record<string,{like:string;dislike:string}> = {
 'special-boy':specialFoodTaste, 'special-girl':specialFoodTaste,
 momo:{like:'strawberry-milk',dislike:'sushi-box'}, bibi:{like:'rainbow-macaron',dislike:'sushi-box'},
 coco:{like:'cheeseburger',dislike:'rainbow-macaron'}, dudu:{like:'sushi-box',dislike:'strawberry-milk'},
 lulu:{like:'sushi-box',dislike:'cheeseburger'},toto:{like:'cheeseburger',dislike:'strawberry-milk'},
 byeol:{like:'rainbow-macaron',dislike:'sushi-box'},mungchi:{like:'strawberry-milk',dislike:'rainbow-macaron'},
}
const foodIds=['strawberry-milk','cheeseburger','sushi-box','rainbow-macaron']
export function defaultTaste(id:string) { const hash=[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);return foodPreferences[id]??{like:foodIds[hash%4],dislike:foodIds[(hash%4+1)%4]} }
export const furnitureChance=.25
export const restCooldownMs=4*3600000

// Fixed IDs keep their shared preference even after renaming or loading an old save.
export function resolveTaste(id:string, saved?:{like:string;dislike:string}) { return id==='special-boy'||id==='special-girl'?{...specialFoodTaste}:saved??defaultTaste(id) }

export const regionTreasures = [
 {id:'mine-blue-crystal',regionId:'mine',name:'푸른 수정',rarity:'uncommon' as const,icon:'🔷',salePrice:350,color:'#83c9ee',description:'깊은 수정 광산의 차가운 빛을 품었어요.'},
 {id:'mine-pink-crystal',regionId:'mine',name:'분홍 수정',rarity:'rare' as const,icon:'🔮',salePrice:650,color:'#e8a8cb',description:'광산에서만 자라는 장밋빛 수정이에요.'},
 {id:'mine-ancient-core',regionId:'mine',name:'고대 수정핵',rarity:'legendary' as const,icon:'💠',salePrice:3500,color:'#b1a3f0',description:'수천 년의 광채가 모인 광산의 중심이에요.'},
 {id:'temple-emblem',regionId:'temple',name:'신전의 문장',rarity:'uncommon' as const,icon:'⚜️',salePrice:400,color:'#d9b176',description:'잊힌 수호자의 약속이 새겨진 문장이에요.'},
 {id:'temple-relic',regionId:'temple',name:'봉인된 유물',rarity:'rare' as const,icon:'🏺',salePrice:800,color:'#c59a7d',description:'신전 깊은 곳에서 발견한 봉인된 기억이에요.'},
 {id:'temple-sun-tablet',regionId:'temple',name:'태양의 석판',rarity:'legendary' as const,icon:'🌞',salePrice:4000,color:'#edbe62',description:'신전의 첫 햇살을 간직한 전설의 석판이에요.'},
 {id:'sanctuary-star-shard',regionId:'sanctuary',name:'별의 조각',rarity:'uncommon' as const,icon:'⭐',salePrice:450,color:'#e9cf82',description:'별빛 성역에서 조용히 내려앉은 별 조각이에요.'},
 {id:'sanctuary-moon-crystal',regionId:'sanctuary',name:'달빛 결정',rarity:'rare' as const,icon:'🌙',salePrice:950,color:'#bac8ed',description:'성역의 달빛을 투명하게 굳힌 결정이에요.'},
 {id:'sanctuary-celestial-gem',regionId:'sanctuary',name:'천상의 보석',rarity:'legendary' as const,icon:'💎',salePrice:5000,color:'#a5e2d6',description:'별빛 성역의 하늘을 비추는 가장 귀한 보석이에요.'},
]
export const treasureRegions:Record<string,string[]>=Object.fromEntries(regionTreasures.map(i=>[i.id,[i.regionId]]))
export function treasureAllowed(id:string,rarity:string,regionId:string){return (!treasureRegions[id]||treasureRegions[id].includes(regionId))&&(rarity!=='legendary'||['cave','garden','mine','temple','sanctuary'].includes(regionId))}
