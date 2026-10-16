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
export const foodPreferences: Record<string,{like:string;dislike:string}> = {
 'special-boy':{like:'cheeseburger',dislike:'strawberry-milk'}, 'special-girl':{like:'rainbow-macaron',dislike:'cheeseburger'},
 momo:{like:'strawberry-milk',dislike:'sushi-box'}, bibi:{like:'rainbow-macaron',dislike:'sushi-box'},
 coco:{like:'cheeseburger',dislike:'rainbow-macaron'}, dudu:{like:'sushi-box',dislike:'strawberry-milk'},
 lulu:{like:'sushi-box',dislike:'cheeseburger'},toto:{like:'cheeseburger',dislike:'strawberry-milk'},
 byeol:{like:'rainbow-macaron',dislike:'sushi-box'},mungchi:{like:'strawberry-milk',dislike:'rainbow-macaron'},
}
const foodIds=['strawberry-milk','cheeseburger','sushi-box','rainbow-macaron']
export function defaultTaste(id:string) { const hash=[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);return foodPreferences[id]??{like:foodIds[hash%4],dislike:foodIds[(hash%4+1)%4]} }
export const furnitureChance=.25
export const restCooldownMs=4*3600000
