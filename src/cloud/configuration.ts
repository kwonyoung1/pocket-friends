type Environment = { VITE_CLOUD_ENABLED?: string; VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string }
/** Public deployments always require the server gate; missing settings never open local data. */
export function resolveCloudConfiguration(env: Environment, production: boolean) {
  const enabled = production || env.VITE_CLOUD_ENABLED === 'true'
  const url = env.VITE_SUPABASE_URL ?? '', key = env.VITE_SUPABASE_ANON_KEY ?? ''
  let error = ''
  if (enabled && (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key)) error = '클라우드 설정이 아직 완료되지 않았어요. Supabase URL과 공개 키를 설정한 뒤 다시 배포해 주세요.'
  return {enabled, url, key, error}
}
