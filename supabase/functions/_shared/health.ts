import {releaseSha} from './release.ts'
/** Metadata only. Supabase gateway JWT verification and all game handlers stay intact. */
export function withHealth(name:'game'|'treasure',handler:(request:Request)=>Promise<Response>,origins:string[]){
 return async(request:Request)=>{
  const pathname=new URL(request.url).pathname
  if(['GET','OPTIONS'].includes(request.method)&&(pathname==='/health'||pathname.endsWith(`/${name}/health`))){
   const origin=request.headers.get('origin')??''
   if(origin&&!origins.includes(origin))return new Response(null,{status:403})
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS',Vary:'Origin'}})
   return Response.json({status:'ok',function:name,sha:releaseSha},{headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin'}})
  }
  return handler(request)
 }
}
