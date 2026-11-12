/** Original vector artwork. Decorative only: no placements or navigation obstacles. */
export function ChristmasDecor({active,low}:{active:boolean;low:boolean}){
 return <g className="christmas-decor" data-testid="christmas-decor" data-lights-active={active} data-effects-quality={low?'low':'normal'} strokeLinecap="round" strokeLinejoin="round">
  <defs>
   <linearGradient id="christmas-fir" x2=".8" y2="1"><stop stopColor="#789b75"/><stop offset=".5" stopColor="#476e53"/><stop offset="1" stopColor="#294e42"/></linearGradient>
   <radialGradient id="christmas-light"><stop stopColor="#fff8cb"/><stop offset=".3" stopColor="#ffe4a3" stopOpacity=".65"/><stop offset="1" stopColor="#ffd79a" stopOpacity="0"/></radialGradient>
   <linearGradient id="christmas-red" x2="1" y2="1"><stop stopColor="#d38d7d"/><stop offset="1" stopColor="#9e4e49"/></linearGradient>
  </defs>
  {/* Small wreath and stockings live on the wall, away from user furniture. */}
  <g data-testid="christmas-wreath" transform="translate(660 65)">
   <circle r="24" fill="none" stroke="#b0a887" strokeWidth="15" opacity=".25"/>
   <circle r="23" fill="none" stroke="#64836b" strokeWidth="12"/>
   {Array.from({length:12},(_,i)=><path key={i} d="M0 -19 Q-10 -35 0 -32 Q9 -34 4 -20" fill={i%2?'#7e9974':'#4d7058'} transform={`rotate(${i*30})`}/>)}
   <path d="M0 18 Q-24 0 -20 18 Q-13 31 0 21 Q17 32 22 16 Q17 4 0 18 M-3 23 L-12 40 L0 36 L4 42 L8 22" fill="url(#christmas-red)" stroke="#a76858" strokeWidth="1.4"/>
   <circle cx="-17" cy="-14" r="3" fill="#d6b16a"/><circle cx="17" cy="-13" r="3" fill="#d6b16a"/>
  </g>
  <path d="M652 131 Q691 144 735 130" fill="none" stroke="#9b8563" strokeWidth="2"/>
  {[657,710].map((x,i)=><g key={x} transform={`translate(${x} 133) rotate(${i?8:-9})`} data-testid="christmas-stocking"><path d="M0 0 H18 V29 Q35 29 30 42 Q20 52 3 44 Q-3 40 0 31Z" fill={i?'#6e8769':'url(#christmas-red)'} stroke="#9b7b61" strokeWidth="1.4"/><path d="M-2 -2 H20 V8 H-2Z" fill="#fff0d7"/><path d="M4 21 L11 16 L16 22 L11 28Z" fill="#e6c68b"/></g>)}
  {/* Tree foot stays in the background; actors and all placed furniture render above it. */}
  <g data-testid="christmas-tree" transform="translate(675 142)">
   <ellipse cx="0" cy="172" rx="56" ry="12" fill="#826640" opacity=".13"/>
   <path d="M-11 145 L-9 174 H12 L10 145" fill="#967050"/>
   <path d="M0 0 Q-16 25 -27 38 L-17 37 Q-37 64 -43 73 L-30 71 Q-49 104 -56 115 L-39 111 Q-63 145 -65 151 Q-30 163 0 157 Q35 162 65 151 L39 111 L56 115 L30 71 L43 73 L17 37 L27 38Z" fill="url(#christmas-fir)" stroke="#58725a" strokeWidth="2.5"/>
   <path d="M-24 43 Q0 51 24 42 M-39 77 Q0 93 39 77 M-53 118 Q0 137 53 118" stroke="#a2b38a" strokeWidth="3" opacity=".4" fill="none"/>
   <path d="M-19 39 Q35 61 -34 84 Q-18 100 44 114 Q30 139 -50 147" fill="none" stroke="#e2bc78" strokeWidth="2"/>
   <path d="M0 -16 L5 -5 L18 -4 L8 4 L11 17 L0 10 L-11 17 L-8 4 L-18 -4 L-5 -5Z" fill="#ebcc83" stroke="#c59b59" strokeWidth="1.5"/>
   {[[-15,44],[13,63],[-26,88],[28,109],[-34,132],[15,146]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="5.5" fill={i%2?'#c49861':'#c77d71'} stroke="#e9c99c"/><circle cx={x-1.5} cy={y-1.5} r="1.4" fill="#ffefd8"/></g>)}
   {(low?[[-7,36],[22,89],[-22,116],[30,147]]:[[-7,36],[18,53],[-17,76],[-30,90],[22,107],[-22,126],[30,147],[-43,144]]).map(([x,y],i)=><g key={i} className="christmas-bulb" style={{animationDelay:`-${i*.7}s`}}><circle cx={x} cy={y} r={low?7:11} fill="url(#christmas-light)"/><circle cx={x} cy={y} r="2.2" fill="#fff0b3"/></g>)}
  </g>
  <g data-testid="christmas-gifts" transform="translate(718 308)" stroke="#ad8564" strokeWidth="1.2">
   <path d="M-19 0 L17 -3 L23 22 L-14 26Z" fill="url(#christmas-red)"/><path d="M-2 -1 L4 24 M-18 7 L19 4" fill="none" stroke="#edcf8d" strokeWidth="4"/>
   <path d="M-3 -3 Q-25 -20 -19 -6 Q-14 1 -3 -3 Q13 -22 14 -9 Q15 -1 -3 -3" fill="none" stroke="#e9c58c" strokeWidth="3"/>
   <path d="M-57 13 H-25 V35 H-57Z" fill="#91a281"/><path d="M-59 10 H-23 V17 H-59Z" fill="#b0b89a"/><path d="M-43 11 V35" stroke="#eedbb1" strokeWidth="4"/>
  </g>
  {/* Window-frame snow and a soft, knitted cushion accent. */}
  <path d="M353 162 Q410 153 468 161 M495 161 Q554 154 617 160" fill="none" stroke="#f8f5e9" strokeWidth="5" opacity=".9"/>
  <g transform="translate(139 228) rotate(-12)" opacity=".85"><rect width="44" height="40" rx="8" fill="#b37365" stroke="#e8c7a3" strokeWidth="2"/><path d="M22 7 V33 M9 20 H35 M13 11 L31 29 M31 11 L13 29" stroke="#f4dfbc" strokeWidth="2"/></g>
 </g>
}
