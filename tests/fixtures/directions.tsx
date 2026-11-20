// Development-only integration harness for the exact production renderers.
// Coordinates are controlled here; this is not a screenshot of live gameplay.
import {createRoot} from 'react-dom/client'
import {Character} from '../../src/Character'
import {AnimalSprite} from '../../src/animals/AnimalSprite'
import {freshWorld} from '../../src/cloud/engine'
import {grantSpecialFriends} from '../../src/humans/model'
import {lifeCommand} from '../../src/expansion/model'
import '../../src/styles.css'
import '../../src/art/home.css'
const at=Date.now(),save=freshWorld(at)
save.world!.coins=60000
for(const id of ['lulu','toto','byeol','mungchi'])lifeCommand(save,{type:'adopt',id},at)
grantSpecialFriends(save,at)
const friends=save.friends
for(const f of friends){f.moving=false;f.facing=-1;f.eatingUntil=0;f.socialUntil=0}
const hamster={id:'hamster',kind:'hamster' as const,name:'햄스터',color:'#e6c39a',x:100,y:300,facing:-1,moving:false}
Object.assign(window,{directionFixture:{
 step(dx:number,dy:number){for(const f of [...friends,hamster]){f.x+=dx;f.y+=dy;f.moving=true}},
 stop(){for(const f of [...friends,hamster])f.moving=false},
}})
createRoot(document.getElementById('root')!).render(<main className="illustrated-home" style={{padding:12}}><p>제작 검증 화면 · 실제 게임 렌더러 / 좌표 제어</p><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{[...friends,hamster].map(f=><section key={f.id} data-actor={f.id} style={{minWidth:0,textAlign:'center',border:'1px solid #d3c4ae',borderRadius:16,padding:12}}><div className="room-friend" style={{position:'relative',left:'auto',top:'auto',width:'100%',height:110,transform:'none'}}>{f.kind==='hamster'?<AnimalSprite friend={f}/>:<Character friend={f}/>}</div><span>{f.name}</span></section>)}</div></main>)
