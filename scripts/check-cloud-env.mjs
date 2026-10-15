import { loadEnv } from 'vite'
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env }
if (env.VITE_CLOUD_ENABLED === 'true') {
  const url = env.VITE_SUPABASE_URL ?? '', key = env.VITE_SUPABASE_ANON_KEY ?? ''
  let publishable = /^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)
  try { publishable ||= JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role === 'anon' } catch { /* invalid key */ }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !publishable || key.startsWith('sb_secret_')) {
    console.error('클라우드 설정 오류: Supabase HTTPS URL과 공개 publishable/anon 키가 필요합니다. 서비스 역할 키와 비밀 키는 프런트엔드에서 사용할 수 없습니다.')
    process.exit(1)
  }
}
