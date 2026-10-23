import type {Save,Friend} from '../game'
import type {GameCommand} from '../cloud/protocol'
import {equipmentById,slotLabels,bonusText} from './catalog'
import type {Slot} from './catalog'
import {equipment,gearBonus,gearCommand} from './model'
import type {GearCommand,GearInstance} from './model'
import {rarityLabels} from '../progression/config'
import './styles.css'
type Props={save:Save;friend:Friend;command?:(c:GameCommand)=>Promise<void>;busy?:boolean;changed:()=>void;notify:(s:string)=>void}
export function EquipmentPanel({save,friend,command,busy,changed,notify}:Props){
 const instances=equipment(save).instances
 const run=(c:GearCommand)=>{if(busy)return;if(command){void command(c);return}try{notify(gearCommand(save,c));changed()}catch(e){notify((e as Error).message)}}
 const card=(i:GearInstance)=>{const d=equipmentById[i.itemId],owner=save.friends.find(f=>f.id===i.equippedBy);return <article className={`gear-card rarity-${d.rarity}`} key={i.id} data-testid={`gear-${i.id}`}><span className="gear-icon" aria-hidden="true">{d.icon}</span><div><strong>{d.name}</strong><small>{rarityLabels[d.rarity]} · {slotLabels[d.slot]} · {bonusText(d.bonus)}</small><small>{owner?`${owner.name} 착용 중`:'착용 가능 · 보관 중'}</small></div>{i.equippedBy===friend.id?<button disabled={busy} onClick={()=>run({type:'unequip',friendId:friend.id,instanceId:i.id})}>해제</button>:<button disabled={busy||!!i.equippedBy||instances.some(x=>x.equippedBy===friend.id&&equipmentById[x.itemId].slot===d.slot)} onClick={()=>run({type:'equip',friendId:friend.id,instanceId:i.id})}>{owner?'다른 친구 착용 중':'착용'}</button>}</article>}
 return <section className="equipment-panel" aria-label={`${friend.name} 장비`}><h3>{friend.name}의 장비</h3><p className="gear-summary">{bonusText(gearBonus(save,friend.id))}</p><p className="menu-note">출발할 때 효과 확정 · 시간 최대 -35% · 코인 최대 +80% · 희귀 최대 +8%p · 전설 확률 유지</p><div className="gear-slots">{(Object.keys(slotLabels) as Slot[]).map(slot=>{const i=instances.find(i=>i.equippedBy===friend.id&&equipmentById[i.itemId].slot===slot);return <div key={slot} data-testid={`gear-slot-${slot}`}><h4>{slotLabels[slot]}</h4>{i?card(i):<p>비어 있어요</p>}</div>})}</div><h4>보유 장비 · 총 {instances.length}개</h4><p className="menu-note">장비는 소모·판매되지 않아요. 다른 친구에게 주려면 먼저 해제하세요. 탐험 중에도 변경할 수 있지만 다음 출발부터 적용돼요.</p><div className="gear-inventory">{instances.filter(i=>i.equippedBy!==friend.id).map(card)}</div>{!instances.length&&<p>고대 동굴 이상의 탐험에서 장비를 발견할 수 있어요.</p>}</section>
}
