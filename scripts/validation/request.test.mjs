import {test} from 'node:test'
import assert from 'node:assert/strict'
import {submit} from '../automation/github.mjs'
test('auto PR mirrors only base-bound request metadata without using it as validation proof',async()=>{
 const saved=process.env.AUTO_PR_ENABLED;process.env.AUTO_PR_ENABLED='true';const updates=[],base='b'.repeat(40),sha='a'.repeat(40)
 try{const pr={number:7,base:{sha:base},body:'Original description',html_url:'https://example.invalid/pr/7'},github={rest:{pulls:{list:async()=>({data:[pr]}),listFiles:()=>{},update:async p=>updates.push(p)},repos:{getContent:async p=>{assert.equal(p.ref,sha);return{data:{content:Buffer.from(JSON.stringify({requested:'FAST',base})).toString('base64')}}}},actions:{listWorkflowRuns:async()=>({data:{workflow_runs:[{head_sha:sha,conclusion:'success'}]}})}},paginate:async()=>[{filename:'validation.request.json'}]}
 await submit({github,context:{repo:{owner:'owner',repo:'r'},actor:'owner',ref:'refs/heads/codex/request',sha},pause:async()=>{}})
 assert.equal(updates.length,1);assert.match(updates[0].body,/Original description/);assert.match(updates[0].body,/검증 등급 요청: \*\*FAST\*\*/);assert.match(updates[0].body,/CI에서 자동 상향/)
 pr.body=updates[0].body+'\nOwner follow-up text';github.rest.repos.getContent=async()=>({data:{content:Buffer.from('{"requested":"FAST","base":"stale"}').toString('base64')}});await submit({github,context:{repo:{owner:'owner',repo:'r'},actor:'owner',ref:'refs/heads/codex/request',sha},pause:async()=>{}});assert.match(updates[1].body,/검증 등급 요청: \*\*FULL\*\*/);assert.match(updates[1].body,/Owner follow-up text/)
 }finally{if(saved===undefined)delete process.env.AUTO_PR_ENABLED;else process.env.AUTO_PR_ENABLED=saved}
})
