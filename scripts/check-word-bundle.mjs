import {readFileSync,readdirSync} from 'node:fs'
// The public UI receives hints/revealed answers from the server, not the full answer bank.
for(const name of readdirSync('dist/assets').filter(n=>n.endsWith('.js'))){
 const code=readFileSync(`dist/assets/${name}`,'utf8')
 if(code.includes('A vitamin deficiency can cause health problems.')||code.includes('word-nevertheless')||code.includes('We should protect the environment.')||code.includes('Solar panels generate electricity.'))throw Error('The full word answer bank must not be bundled in the production client.')
}
console.log('Production word answer bank exclusion verified.')
