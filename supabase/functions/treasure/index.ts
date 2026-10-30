import {createClient} from 'npm:@supabase/supabase-js@2.117.3'
import {createRewardHandler} from '../../../src/match3/rewardServer.ts'
import type {RewardRepository} from '../../../src/match3/rewardServer.ts'
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
function checked<T>(value:{data:T;error:unknown}){if(value.error){const message=(value.error as {message?:string}).message??'';throw Error(/[가-힣]/.test(message)?message:'보상 서버 SQL(202610300001_treasure_rewards.sql)과 연결을 확인해 주세요.');}return value.data}
const repository:RewardRepository={
 async authorize(user){const row=checked(await admin.from('game_members').select('expires_at').eq('user_id',user).maybeSingle());return !!row&&Date.parse(row.expires_at)>Date.now()},
 async start(user,request,seed){return checked(await admin.rpc('treasure_start',{p_user:user,p_request:request,p_seed:seed}))},
 async load(user,id){return checked(await admin.from('treasure_sessions').select('*').eq('id',id).eq('user_id',user).maybeSingle())},
 async advance(user,id,cursor,hash,log,state,complete,coins,result){return checked(await admin.rpc('treasure_advance',{p_user:user,p_id:id,p_cursor:cursor,p_hash:hash,p_log:log,p_checkpoint:state,p_complete:complete,p_coins:coins,p_result:result}))}
}
Deno.serve(createRewardHandler({repository,user:async token=>{const {data,error}=await admin.auth.getUser(token);return error?null:data.user?.id??null},origins:(Deno.env.get('GAME_ALLOWED_ORIGINS')??'').split(',').map(s=>s.trim()).filter(Boolean)}))
