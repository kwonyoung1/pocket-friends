export type Stat='hp'|'atk'|'def'
export type ScrollId='small'|'medium'|'large'|'legendary'
export type Training={hp:number;atk:number;def:number}
export type ArenaShop={training:Record<string,Training>;skills:Record<string,Partial<Record<string,number>>>;command:number;scrolls:Partial<Record<ScrollId,number>>}
export type ShopCommand={type:'arena-shop';item:'training';friendId:string;stat:Stat;expected:number}|{type:'arena-shop';item:'skill';friendId:string;skillId:string;expected:number}|{type:'arena-shop';item:'command';expected:number}|{type:'arena-shop';item:'scroll-buy';scrollId:ScrollId;quantity:number}|{type:'arena-shop';item:'scroll-use';scrollId:ScrollId;quantity:number;friendId:string}
export const trainingOf=(s:ArenaShop|undefined,id:string):Training=>s?.training[id]??{hp:0,atk:0,def:0}
export const bounded=(n:unknown,max:number)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=max?n:0
export const trainingPrice=(step:number)=>100+step*30+Math.floor(step/10)*500+step*step*5
export const skillPrice=(step:number)=>300+step*step*200
export const COMMAND_PRICES=[20000,60000,150000] as const
export const SCROLLS=[{id:'small',name:'작은 경험치 주문서',xp:100,price:800},{id:'medium',name:'중급 경험치 주문서',xp:500,price:4500},{id:'large',name:'고급 경험치 주문서',xp:2000,price:20000},{id:'legendary',name:'전설 경험치 주문서',xp:10000,price:120000}] as const
export const scrollById=(id:string)=>SCROLLS.find(s=>s.id===id)
export function costLimit(shop:ArenaShop|undefined,ids:readonly string[],profiles:Readonly<Record<string,{level:number}>>={},relic=false){return Math.min(15,10+bounded(shop?.command,3)+(ids.some(id=>['special-boy','special-girl'].includes(id)&&(profiles[id]?.level??1)>=40)?1:0)+(relic?1:0))}
