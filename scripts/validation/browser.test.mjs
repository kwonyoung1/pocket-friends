import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ensureBrowser} from './browser.mjs'
test('valid browser cache performs no second installation',async()=>{const calls=[];assert.deepEqual(await ensureBrowser({probe:async()=>calls.push('probe'),repair:()=>calls.push('repair'),install:()=>calls.push('install')}),{repaired:false});assert.deepEqual(calls,['probe'])})
test('missing/corrupt cache repairs once, installs once and verifies again',async()=>{const calls=[];const r=await ensureBrowser({probe:async()=>{calls.push('probe');if(calls.length===1)throw Error('corrupt')},repair:()=>calls.push('repair'),install:()=>calls.push('install')});assert(r.repaired);assert.deepEqual(calls,['probe','repair','install','probe'])})
test('a second probe or failed installation propagates failure instead of retrying forever',async()=>{let repairs=0;await assert.rejects(()=>ensureBrowser({probe:async()=>{throw Error('still broken')},repair:()=>repairs++,install:()=>{}}),/still broken/);assert.equal(repairs,1)})
