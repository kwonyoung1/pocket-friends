// Development-only art verification. Not part of either production build entry.
import {createRoot} from 'react-dom/client'
import {PaintedSprite} from '../../src/art/PaintedSprite'
const poses=['idle','smile','happy','sleepy','surprised','walk','rest','sleep']
const kinds=['cat','bunny','dog','bear','fox','boy','girl'] as const
createRoot(document.getElementById('root')!).render(<main style={{fontFamily:'sans-serif',padding:24}}><h1>실제 PNG/WebP 원화 · 제작/포즈 검증</h1>{kinds.map(kind=><section key={kind}><h2>{kind}</h2><div style={{display:'flex',flexWrap:'wrap',gap:12}}>{poses.map(pose=><div key={pose} data-kind={kind} data-pose={pose} style={{width:140,textAlign:'center'}}><div style={{height:164}}><PaintedSprite kind={kind} human={kind==='boy'||kind==='girl'} pose={pose} expression={['sleep','sleepy','rest'].includes(pose)?'closed':pose==='happy'?'happy':pose==='surprised'?'surprised':pose==='smile'?'smile':'normal'}/></div><span>{pose}</span></div>)}</div></section>)}</main>)
