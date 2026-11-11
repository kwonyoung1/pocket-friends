import {execFileSync} from 'node:child_process'
const gh=(...args)=>execFileSync('gh',args,{encoding:'utf8'}).trim()
const value=flag=>{const i=process.argv.indexOf(flag);return i<0?undefined:process.argv[i+1]}
try{
 const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()
 if(!/^codex\/[a-z0-9/_-]+$/.test(branch))throw Error('Use a codex/<task> branch based on latest main')
 execFileSync('git',['push','-u','origin',branch],{stdio:'inherit'})
 const lookup=()=>JSON.parse(gh('pr','list','--head',branch,'--base','main','--state','open','--json','number,url'))[0]
 let pr=lookup()
 const title=value('--title')??`Codex: ${branch.slice(6)}`,file=value('--body-file')
 if(!pr){try{gh('pr','create','--base','main','--head',branch,'--title',title,...(file?['--body-file',file]:['--body','Implemented and locally validated by Codex; required CI and release gates still apply.']))}catch(e){pr=lookup();if(!pr)throw e}pr??=lookup()}
 if(!pr)throw Error('PR creation was not confirmed')
 if(file)gh('pr','edit',String(pr.number),'--title',title,'--body-file',file)
 console.log(`PR confirmed: ${pr.url}`)
 const rows=JSON.parse(gh('run','list','--workflow','deploy.yml','--branch',branch,'--limit','1','--json','databaseId,url'))
 if(rows[0])console.log(`Watch validation: npm run automation:watch -- ${rows[0].databaseId}\n${rows[0].url}`)
 else console.log('Validation dispatch may still be queued by auto-pr. Monitor it; do not claim deployment complete.')
}catch(e){console.error(e.message);console.error('Git push access alone is not GitHub API access. Fix first-time API/Actions authorization; never paste tokens into chat.');process.exitCode=1}
