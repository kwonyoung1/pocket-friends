// One process: Node's test library still reports each assertion/test normally.
import {readdirSync} from 'node:fs'
for(const file of readdirSync(new URL('./',import.meta.url)).filter(n=>n.endsWith('.test.mjs')).sort())await import(new URL(file,import.meta.url).href)
