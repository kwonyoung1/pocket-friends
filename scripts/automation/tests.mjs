// One process: Node's test library still reports each assertion/test normally.
import {readdirSync} from 'node:fs'
for(const file of readdirSync(new URL('./',import.meta.url)).filter(n=>n.endsWith('.test.mjs')).sort())await import(new URL(file,import.meta.url).href)

// Shared local/CI policy and failure-gate regressions are part of FULL automation.
for(const file of readdirSync(new URL('../validation/',import.meta.url)).filter(n=>n.endsWith('.test.mjs')).sort())await import(new URL('../validation/'+file,import.meta.url).href)
