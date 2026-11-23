import {BEASTS,beastById} from './beasts.ts'
import {BEAST_LIMITS} from './beast-state.ts'
import type {ArenaAccount,BeastRarity,ChestId,Opening} from './beast-state.ts'
export const CHESTS:{id:ChestId;name:string;weights:readonly number[];coins:number;legendaryPity:boolean;mythicPity:boolean}[]=[
 {id:'forest',name:'숲의 보물상자',weights:[8000,2000,0,0,0],coins:4,legendaryPity:false,mythicPity:false},
 {id:'lake',name:'호수의 보물상자',weights:[7600,2200,200,0,0],coins:6,legendaryPity:false,mythicPity:false},
 {id:'crystal',name:'수정 보물상자',weights:[7000,2500,500,0,0],coins:10,legendaryPity:false,mythicPity:false},
 {id:'ancient',name:'고대 보물상자',weights:[6800,2400,750,50,0],coins:16,legendaryPity:false,mythicPity:false},
 {id:'starlight',name:'별빛 보물상자',weights:[6600,2400,850,150,0],coins:25,legendaryPity:true,mythicPity:false},
 {id:'legendary',name:'전설의 보물상자',weights:[6500,2400,800,270,30],coins:40,legendaryPity:true,mythicPity:true},
]
export const chestById=(id:string)=>CHESTS.find(c=>c.id===id)
const tiers=['common','rare','heroic','legendary','mythic'] as const
export function chestForStage(index:number,boss:boolean,random:()=>number):ChestId{if(index<5)return 'forest';if(index<10)return random()<.35||boss?'lake':'forest';if(index<15)return 'crystal';if(index<20)return boss||random()<.6?'ancient':'crystal';if(index<25)return 'ancient';if(index<30)return boss||random()<.35?'starlight':'ancient';if(index<35)return 'starlight';return 'legendary'}
export function chestOdds(id:ChestId,a?:ArenaAccount){const c=chestById(id)!;if(c.mythicPity&&(a?.pity.mythic??0)>=BEAST_LIMITS.mythicPity-1)return [0,0,0,0,10000];if(c.legendaryPity&&(a?.pity.legendary??0)>=BEAST_LIMITS.legendaryPity-1)return [0,0,0,10000,0];return [...c.weights]}
/** RNG is supplied only by the authenticated server command path, never by a battle seed. */
export function openChest(a:ArenaAccount,id:ChestId,nonce:number,now:number,random:()=>number):Opening{
 if(nonce===a.opens&&a.lastOpening?.nonce===nonce){if(a.lastOpening.chest!==id)throw Error('이미 연 상자의 종류와 달라요.');return a.lastOpening}
 if(nonce!==a.opens+1)throw Error('최신 상자 개봉 기록을 먼저 불러와 주세요.')
 if((a.chests[id]??0)<1)throw Error('보유한 보물상자가 없어요.')
 const box=chestById(id)!,weights=chestOdds(id,a),pick=random()*10000;let sum=0,tier:Opening['tier']='common';for(let i=0;i<weights.length;i++){sum+=weights[i];if(pick<sum){tier=tiers[i];break}}
 const forced=weights.some((w,i)=>w!==box.weights[i]),result:Opening={nonce,chest:id,tier,duplicate:false,shards:0,coins:0,stones:0,at:now,pity:forced}
 if(tier==='common'){if(random()<.18)result.stones=1;else result.coins=box.coins}
 else{const pool=BEASTS.filter(b=>b.rarity===tier),beast=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];result.beastId=beast.id;const old=a.beasts[beast.id];if(old){result.duplicate=true;result.shards=BEAST_LIMITS.duplicateShards[tier as BeastRarity];old.duplicates++;old.shards=Math.min(BEAST_LIMITS.shards,old.shards+result.shards)}else a.beasts[beast.id]={at:now,level:1,xp:0,shards:0,duplicates:0,mastery:0}}
 if(box.legendaryPity)a.pity.legendary=tier==='legendary'||tier==='mythic'?0:Math.min(BEAST_LIMITS.legendaryPity,a.pity.legendary+1)
 if(box.mythicPity)a.pity.mythic=tier==='mythic'?0:Math.min(BEAST_LIMITS.mythicPity,a.pity.mythic+1)
 a.chests[id]=(a.chests[id]??0)-1;a.opens=nonce;a.lastOpening=result;return result
}
export function trainBeast(a:ArenaAccount,id:string,training:'xp'|'mastery'){
 const b=a.beasts[id];if(!b||!beastById(id))throw Error('보유한 환수를 골라 주세요.')
 if(training==='mastery'){if(b.mastery>=5)throw Error('환수 별자리가 최고 단계예요.');const cost=(b.mastery+1)*10;if(b.shards<cost)throw Error(`전용 조각 ${cost}개가 필요해요.`);b.shards-=cost;b.mastery++;return '환수 별자리를 강화했어요. HP·공격·방어가 단계마다 3% 증가해요.'}
 if(b.level>=50)throw Error('이미 최고 레벨 환수예요.');if(b.shards<5)throw Error('전용 조각 5개가 필요해요.');return ''
}
