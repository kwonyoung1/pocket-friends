import {readFileSync,writeFileSync} from 'node:fs'
const input=new URL('../data/words/recovery-expansion.tsv',import.meta.url),out=new URL('../src/words/recoveryRows.ts',import.meta.url)
const rows=readFileSync(input,'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#')).map(s=>s.split('|'))
const seen=new Set()
for(const [level,word,pos,answers,example,...extra] of rows){if(extra.length||![1,2,3].includes(+level)||!/^[a-z]+$/.test(word)||seen.has(word)||!pos||!answers.split(',').every(a=>/[가-힣]/.test(a))||!example.includes(' ')||!new RegExp(`\\b${word}\\b`,'i').test(example))throw Error(`Invalid word row: ${word}`);seen.add(word)}
const groups=[1,2,3].map(n=>rows.filter(r=>+r[0]===n).map(r=>r.slice(1).join('|')))
const text='// Generated from data/words/recovery-expansion.tsv with scripts/build-word-expansion.mjs.\nexport const recoveryRows: string[][] = '+JSON.stringify(groups,null,2)+'\n'
if(process.argv.includes('--check')){if(readFileSync(out,'utf8')!==text)throw Error('Word expansion must be regenerated')}else writeFileSync(out,text)
console.log(JSON.stringify({source:'original authored data',added:rows.length,byLevel:groups.map(g=>g.length)}))
