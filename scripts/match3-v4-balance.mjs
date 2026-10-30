import {createServer} from 'vite'
import {writeFile} from 'node:fs/promises'
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {newChallenge,moves,planMove}=await vite.ssrLoadModule('/src/match3/engine.ts'),{PlayClock}=await vite.ssrLoadModule('/src/match3/clock.ts')
 const profiles=[{name:'novice-model',base:5.6,growth:.7,error:.25,search:1},{name:'regular-model',base:3.8,growth:.65,error:.12,search:.7},{name:'skilled-model',base:2.4,growth:.6,error:.05,search:.45},{name:'expert-model',base:1.9,growth:.48,error:.02,search:.3},{name:'one-second-oracle',base:1,growth:0,error:0,search:0}]
 const samples=Number(process.env.MATCH3_SAMPLES??20),results=[];const calculations=[]
 for(const profile of profiles){const runs=[]
  for(let seed=1;seed<=samples;seed++){let g=newChallenge(seed*1777),clock=new PlayClock(true),now=0,rng=seed*3343,turns=0,maxCombo=0,minChoices=Infinity,highest=1;clock.set('idle',0)
   const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296}
   while(clock.value.survivalMs<900000&&!clock.value.expired&&turns<1400){const available=moves(g.board,g.ice);if(available.length<2)throw Error('Challenge lost its two legal moves');minChoices=Math.min(minChoices,available.length)
    const difficulty=g.difficulty??1,delay=profile.name==='one-second-oracle'?1000:Math.max(1000,(profile.base+profile.growth*(difficulty-1)+profile.search*Math.log2(6/Math.min(6,available.length))+(random()-.5)*2.4)*1000)
    clock.level=g.difficulty??1;now+=delay;clock.tick(now);if(clock.value.expired)break
    clock.set('busy',now)
    if(random()<profile.error){now+=220;clock.set('idle',now);continue}
    const m=available[Math.floor(random()*available.length)],start=performance.now(),p=planMove({...g,eligibleMs:clock.value.survivalMs},m.a,m.b,clock.value.combo+1);calculations.push(performance.now()-start);if(!p.valid)throw Error('Invalid generated candidate');g=p.game;clock.valid();maxCombo=Math.max(maxCombo,clock.value.combo);highest=Math.max(highest,g.difficulty??1);turns++;now+=800;clock.set('idle',now)
   }
   runs.push({seed,seconds:clock.value.survivalMs/1000,wallSeconds:clock.value.playMs/1000,score:g.score,highest,maxCombo,turns,minChoices,censored:!clock.value.expired})
  }
  const sorted=runs.map(r=>r.seconds).sort((a,b)=>a-b),r={profile,...profile,samples,min:sorted[0],median:sorted[Math.floor(sorted.length/2)],max:sorted.at(-1),overFiveMinutes:runs.filter(r=>r.seconds>300).length,runs};delete r.profile;results.push(r);console.log(profile.name,JSON.stringify({...r,runs:undefined}))
 }
 calculations.sort((a,b)=>a-b);const perf={count:calculations.length,p95Ms:calculations[Math.floor(calculations.length*.95)],maxMs:calculations.at(-1)};await writeFile('/tmp/pocket-v4-balance.json',JSON.stringify({note:'Reaction-time models, not measured human success rates; simulations stop observing at 900 eligible seconds without ending the client game.',results,calculation:perf},null,2));console.log('calculation',perf)
}finally{await vite.close()}
