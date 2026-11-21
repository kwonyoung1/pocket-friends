import {Component,lazy,memo,Suspense,useCallback,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import App from '../App'
import type {ArenaFriend} from '../arena/integration'
import type {CloudGame} from '../cloud/protocol'
const Arena=lazy(()=>import('../arena/Arena'))
const TreasureMatch=lazy(()=>import('./Panel'))
const World=memo(App)
class MatchBoundary extends Component<{children:ReactNode;close:()=>void;arena?:boolean},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="cloud-gate" role="alert"><h2>{this.props.arena?'별빛 아레나를 준비하지 못했어요.':'보물 퍼즐을 잠시 쉬어갈게요.'}</h2><p>기존 친구들과 공유 월드는 그대로예요.</p><button onClick={this.props.close}>거실로 돌아가기</button></div>:this.props.children}
}
/** Freeze only the background view; requests, durable queue and server time keep their existing behavior. */
export function GameShell({cloud,onResume}:{cloud?:CloudGame;onResume?:()=>void}){
 const [open,setOpen]=useState<'treasure'|'arena'|null>(null),[arenaFriends,setArenaFriends]=useState<ArenaFriend[]>([]),frozen=useRef(cloud),resume=useRef(onResume);resume.current=onResume
 if(!open)frozen.current=cloud
 const enter=useCallback(()=>setOpen('treasure'),[]),leave=useCallback(()=>{setOpen(null);resume.current?.()},[])
 const enterArena=useCallback((friends:ArenaFriend[])=>{setArenaFriends(friends);setOpen('arena')},[])
 return <><div hidden={!!open} inert={!!open}><World cloud={frozen.current} suspended={!!open} openTreasureMatch={enter} openArena={enterArena}/></div>{open&&<MatchBoundary key={open} close={leave} arena={open==='arena'}><Suspense fallback={<div className="cloud-gate" role="status">{open==='arena'?'별빛 아레나를 준비하고 있어요…':'반짝이는 보물을 준비하고 있어요…'}</div>}>{open==='arena'?<Arena friends={arenaFriends} close={leave}/>:<TreasureMatch close={leave} rewarded={!!cloud}/>}</Suspense></MatchBoundary>}</>
}
