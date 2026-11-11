import {readFileSync,existsSync,statSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
export function localSha(){
 let dir=resolve('.git');if(statSync(dir).isFile())dir=resolve(dirname(dir),readFileSync(dir,'utf8').trim().replace(/^gitdir:\s*/,''))
 const head=readFileSync(resolve(dir,'HEAD'),'utf8').trim();if(!head.startsWith('ref:'))return head
 const ref=head.slice(4).trim(),common=existsSync(resolve(dir,'commondir'))?resolve(dir,readFileSync(resolve(dir,'commondir'),'utf8').trim()):dir
 for(const base of [dir,common])if(existsSync(resolve(base,ref)))return readFileSync(resolve(base,ref),'utf8').trim()
 const packed=readFileSync(resolve(common,'packed-refs'),'utf8').split('\n').find(line=>line.endsWith(` ${ref}`));if(!packed)throw Error('Cannot resolve local commit SHA');return packed.split(' ')[0]
}
export function buildVersion(){const sha=process.env.GITHUB_SHA||localSha();if(!/^[a-f0-9]{40}$/.test(sha))throw Error('A full commit SHA is required');return {sha,builtAt:new Date().toISOString()}}
export function versionPlugin(){const version=buildVersion();return {name:'pocket-release-version',transformIndexHtml(html){return html.replace('</head>',`<meta name="pocket-build" content="${version.sha}"></head>`)},generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify(version)+'\n'})}}}
