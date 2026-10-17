import type {EmotionKind} from './model'
import './styles.css'
export function Emotion({kind,variant=0}:{kind:EmotionKind;variant?:number}){
 return <svg viewBox="0 0 48 48" className="pastel-emotion" aria-hidden="true">
  <path d="M10 6h28a7 7 0 0 1 7 7v20a7 7 0 0 1-7 7H24l-7 5 1-5h-8a7 7 0 0 1-7-7V13a7 7 0 0 1 7-7Z" fill="#fff9ed" stroke="#dfc9ae" strokeWidth="1.8"/>
  {kind==='hunger'?(variant?<><path d="M11 32V21c-5-10 5-14 11-10 8-4 18 0 15 10v11Z" fill="#e9bc84" stroke="#bd9266" strokeWidth="1.6"/><path d="M16 29V20c0-5 16-5 16 0v9Z" fill="#fff0c9"/><path d="m20 20-2 5m9-5-2 5" stroke="#d6ae7d" strokeLinecap="round"/></>:<><path d="M12 23c0-12 24-12 24 0" fill="#fff" stroke="#d7c7ac"/><path d="M10 24h28l-5 11H15Z" fill="#adc9c1" stroke="#8ba9a0"/><path d="M22 9c-4 4 4 4 0 8m7-9c-4 4 4 4 0 8" stroke="#ceaa87" fill="none" strokeLinecap="round"/></>):null}
  {kind==='hygiene'?<><rect x="10" y="23" width="25" height="12" rx="6" transform="rotate(-10 23 29)" fill={variant?'#bdd8e6':'#e5b9ce'} stroke="#b49eae"/><circle cx="29" cy="16" r="6" fill="#e1f3f5" stroke="#a9cdd6"/><circle cx="16" cy="15" r="3" fill="#f4fcfd" stroke="#a9cdd6"/><circle cx="37" cy="22" r="3" fill="#e1f3f5"/></>:null}
  {kind==='energy'?<><path d="M30 12a12 12 0 1 0 6 19c-14 4-19-12-6-19Z" fill="#ecd191" stroke="#c5ad7c"/><text x="29" y="17" fontSize="10" fill="#a5a3bc">z</text><text x="34" y="26" fontSize="8" fill="#a5a3bc">z</text></>:null}
  {kind==='happy'?variant?<path d="m24 10 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z" fill="#eed594" stroke="#c6aa79"/>:<path d="M24 35 12 24c-10-12 6-20 12-9 7-11 22-3 12 9Z" fill="#e8adbb" stroke="#c391a0"/>:null}
  {kind==='cold'?<><path d="M17 13a7 7 0 0 1 14 0v13a10 10 0 1 1-14 0Z" fill="#e4edf2" stroke="#acbfc9"/><path d="M24 17v15" stroke="#dfa4a6" strokeWidth="4" strokeLinecap="round"/><circle cx="24" cy="33" r="5" fill="#dfa4a6"/><path d="M33 13h5m-5 7h5" stroke="#acbfc9"/></>:null}
 </svg>
}
