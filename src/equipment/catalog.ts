import type {Rarity} from '../progression/config.ts'
export type Slot='head'|'body'|'accessory'
export type GearBonus={time:number;coins:number;rare:number}
export type Equipment={id:string;name:string;regionId:string;rarity:Rarity;slot:Slot;icon:string;bonus:GearBonus}
export const slotLabels:Record<Slot,string>={head:'머리',body:'몸',accessory:'장신구'}
const gear=(regionId:string,id:string,name:string,rarity:Rarity,slot:Slot,icon:string,bonus:Partial<GearBonus>):Equipment=>({id:`gear-${id}`,regionId,name,rarity,slot,icon,bonus:{time:0,coins:0,rare:0,...bonus}})
export const equipmentCatalog:Equipment[]=[
 gear('cave','miner-hat','낡은 광부 모자','common','head','⛑️',{time:.03}),
 gear('cave','miner-gloves','광부의 장갑','uncommon','body','🧤',{time:.10}),
 gear('cave','ancient-pickaxe','고대 탐험가의 곡괭이','rare','accessory','⛏️',{coins:.20}),
 gear('cave','underground-helm','지하왕의 투구','legendary','head','👑',{time:.15}),
 gear('garden','leaf-hat','풀잎 모자','common','head','🍃',{coins:.05}),
 gear('garden','fairy-cloak','요정의 망토','uncommon','body','🧥',{time:.08}),
 gear('garden','spirit-necklace','정령의 목걸이','rare','accessory','📿',{coins:.25}),
 gear('garden','spirit-ring','정령왕의 반지','legendary','accessory','💍',{coins:.50}),
 gear('mine','crystal-hat','수정 광부모','common','head','⛑️',{time:.05}),
 gear('mine','crystal-armor','수정 갑옷','uncommon','body','🛡️',{coins:.12}),
 gear('mine','crystal-compass','수정 나침반','rare','accessory','🧭',{rare:3}),
 gear('mine','crystal-crown','수정왕의 왕관','legendary','head','👑',{rare:6}),
 gear('temple','guardian-helm','고대 수호자의 투구','common','head','🪖',{coins:.08}),
 gear('temple','guardian-robe','신전 수호복','uncommon','body','🥋',{time:.10}),
 gear('temple','sun-charm','태양의 부적','rare','accessory','☀️',{rare:4}),
 gear('temple','time-robe','시간의 신관복','legendary','body','👘',{time:.20}),
 gear('sanctuary','star-hair','별빛 머리장식','common','head','⭐',{coins:.10}),
 gear('sanctuary','moon-robe','달빛 로브','uncommon','body','👘',{time:.12}),
 gear('sanctuary','galaxy-necklace','은하의 목걸이','rare','accessory','📿',{coins:.30}),
 gear('sanctuary','star-crown','별의 왕관','legendary','head','👑',{coins:.50}),
]
export const equipmentById=Object.fromEntries(equipmentCatalog.map(i=>[i.id,i])) as Record<string,Equipment>
export const equipmentOdds:Record<string,{chance:number;weights:Record<Rarity,number>}>= {
 cave:{chance:.08,weights:{common:55,uncommon:32,rare:12.5,legendary:.5}},
 garden:{chance:.10,weights:{common:45,uncommon:35,rare:19,legendary:1}},
 mine:{chance:.12,weights:{common:35,uncommon:40,rare:23,legendary:2}},
 temple:{chance:.15,weights:{common:25,uncommon:40,rare:31,legendary:4}},
 sanctuary:{chance:.18,weights:{common:15,uncommon:35,rare:42,legendary:8}},
}
export function bonusText(b:GearBonus){return [b.time?`탐험 시간 -${Math.round(b.time*100)}%`:'',b.coins?`기본 탐험 코인 +${Math.round(b.coins*100)}%`:'',b.rare?`희귀 보물 +${b.rare}%p`:''].filter(Boolean).join(' · ')||'장비 효과 없음'}
