import {Component,lazy,memo,Suspense,useCallback,useRef,useState} from 'react'
import type {ReactNode} from 'react'
import App from '../App'
import type {CloudGame} from '../cloud/protocol'
const TreasureMatch=lazy(()=>import('./Panel'))
const World=memo(App)
class MatchBoundary extends Component<{children:ReactNode;close:()=>void},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="cloud-gate" role="alert"><h2>보물 퍼즐을 잠시 쉬어갈게요.</h2><p>기존 친구들과 공유 월드는 그대로예요.</p><button onClick={this.props.close}>거실로 돌아가기</button></div>:this.props.children}
}
/** Freeze only the background view; requests, durable queue and server time keep their existing behavior. */
export function GameShell({cloud,onResume}:{cloud?:CloudGame;onResume?:()=>void}){
 const [open,setOpen]=useState(false),frozen=useRef(cloud),resume=useRef(onResume);resume.current=onResume
 if(!open)frozen.current=cloud
 const enter=useCallback(()=>setOpen(true),[]),leave=useCallback(()=>{setOpen(false);resume.current?.()},[])
 return <><div hidden={open} inert={open}><World cloud={frozen.current} suspended={open} openTreasureMatch={enter}/></div>{open&&<MatchBoundary close={leave}><Suspense fallback={<div className="cloud-gate" role="status">반짝이는 보물을 준비하고 있어요…</div>}><TreasureMatch close={leave}/></Suspense></MatchBoundary>}</>
}
