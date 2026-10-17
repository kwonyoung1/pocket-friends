import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {wordBank,wordById} from './bank'
import {accepts} from './model'
import {wordTargets} from './selection'
it('audits the complete authored bank for global uniqueness, Korean answers, examples, POS and stable IDs',()=>{
 expect(new Set(wordBank.map(w=>w.word.trim().toLowerCase())).size).toBe(wordBank.length)
 expect(new Set(wordBank.map(w=>w.id)).size).toBe(wordBank.length)
 for(const w of wordBank){
  expect(w.id).toBe(`word-${w.word}`);expect(['명사','동사','형용사','부사'].some(p=>w.pos.includes(p))).toBe(true)
  expect(w.example.trim()).toMatch(/^[A-Z].*[.!?]$/);expect(w.example.length).toBeGreaterThan(12);expect(w.hint.length).toBeGreaterThan(0)
  expect(w.acceptedAnswers.length).toBeGreaterThan(0)
  for(const a of w.acceptedAnswers){expect(a).toMatch(/[가-힣]/);expect(accepts(w,a)).toBe(true)}
  for(const bad of ['전혀무관한답','banana is yellow','아무뜻이나'])expect(accepts(w,bad)).toBe(false)
 }
 expect([1,2,3].map(level=>wordBank.filter(w=>w.level===level).length)).toEqual([230,230,230])
 expect(Object.values(wordTargets).reduce((a,b)=>a+b,0)-wordBank.length).toBe(4310)
})
it('checks source fields and representative Korean meanings including multiple valid senses',()=>{
 const lines=readFileSync(new URL('../../data/words/recovery-expansion.tsv',import.meta.url),'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#'))
 expect(lines).toHaveLength(300);for(const l of lines){const [level,word,pos,answers,example]=l.split('|');expect(wordById[`word-${word}`]).toMatchObject({level:+level,pos,acceptedAnswers:answers.split(','),example})}
 for(const answer of ['개발하다','발달하다','발전하다'])expect(accepts(wordById['word-develop'],answer)).toBe(true)
 expect(wordById['word-infrastructure'].meanings).toContain('기반 시설');expect(wordById['word-eraser'].meanings).toContain('지우개')
 expect(wordById['word-evidence'].meanings).toContain('증거');expect(accepts(wordById['word-evidence'],'사과')).toBe(false)
})
