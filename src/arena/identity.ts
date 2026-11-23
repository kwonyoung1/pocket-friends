import type {ArenaProgress} from './state.ts'
export const ARENA_IDENTITY_KEY='pocket-friends-arena-identity-v1'
export type ArenaIdentity={id:string;secret:string;registered:boolean}
export const validArenaId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
export const validArenaSecret=(secret:unknown):secret is string=>typeof secret==='string'&&/^[0-9a-f]{64}$/i.test(secret)
export function arenaOwner(p:ArenaProgress|undefined,user:string){return p?.sharedOwner??p?.links?.[user]??user}
export function readArenaIdentity():ArenaIdentity|null{try{const p=JSON.parse(localStorage.getItem(ARENA_IDENTITY_KEY)??'null');return p&&validArenaId(p.id)&&validArenaSecret(p.secret)?p:null}catch{return null}}
export function writeArenaIdentity(value:ArenaIdentity){localStorage.setItem(ARENA_IDENTITY_KEY,JSON.stringify(value))}
export function createArenaIdentity(id:string):ArenaIdentity{if(!validArenaId(id))throw Error('먼저 게임에 로그인해 주세요.');const bytes=crypto.getRandomValues(new Uint8Array(32)),value={id,secret:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),registered:false};writeArenaIdentity(value);return value}
export function parseArenaCode(code:string){const[id,secret,...extra]=code.trim().split('.');if(extra.length||!validArenaId(id)||!validArenaSecret(secret))throw Error('아레나 연결 코드 형식을 확인해 주세요.');return{id,secret}}

/** Choose once from saved records; no balance/progress is merged or reset. */
export function initialSharedOwner(p:ArenaProgress,user:string){
 if(p.sharedOwner)return p.sharedOwner
 const ids=Object.keys(p.accounts??{}).sort(),active=Object.values(p.tickets).filter(t=>t.status==='active').map(t=>t.owner).sort()
 return active.find(id=>ids.includes(id))??ids[0]??active[0]??user
}
