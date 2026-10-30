// Development-only browser harness. Vite's production entry does not import this module.
import {createRoot} from 'react-dom/client'
import {Profiler} from 'react'
import TreasureMatch from '../../src/match3/Panel'
import {scenario} from '../match3-fixtures'
import {recordKey,readRecords,saveRecords} from '../../src/match3/records'
import {installSoak} from './match3-soak'
import '../../src/styles.css'
const kind=new URLSearchParams(location.search).get('case')??'invalid'
if(new URLSearchParams(location.search).has('soak'))installSoak()
if(!localStorage.getItem(recordKey)&&kind!=='win')saveRecords({...readRecords(),unlocked:30})
let commits=0
document.documentElement.dataset.commits='0'
createRoot(document.getElementById('root')!).render(<Profiler id="treasure-match" onRender={()=>{document.documentElement.dataset.commits=String(++commits)}}><TreasureMatch initialGame={scenario(kind)} close={()=>{document.getElementById('root')!.textContent='거실로 돌아왔어요'}}/></Profiler>)
