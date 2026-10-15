import { it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { resolveCloudConfiguration } from './configuration'
const run = (env: Record<string, string>) => spawnSync(process.execPath, ['scripts/check-cloud-env.mjs'], { env: { ...process.env, ...env }, encoding: 'utf8' })
it('production cannot bypass password authentication through missing or disabled cloud configuration', () => {
  for (const env of [{}, {VITE_CLOUD_ENABLED:'false'}]) {
    const config = resolveCloudConfiguration(env, true)
    expect(config.enabled).toBe(true); expect(config.error).not.toBe('')
  }
  expect(resolveCloudConfiguration({}, false).enabled).toBe(false)
})
it('build refuses a service-role JWT or secret API key in public configuration', () => {
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')
  for (const key of [`e30.${payload}.fake`, 'sb_secret_fake-never-real']) {
    const r = run({ VITE_CLOUD_ENABLED: 'true', VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: key })
    expect(r.status).toBe(1); expect(r.stderr).not.toContain(key)
    expect(run({VITE_CLOUD_ENABLED:'false',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:key}).status).toBe(1)
  }
})
it('build accepts public keys and refuses incomplete cloud setup', () => {
  expect(run({ VITE_CLOUD_ENABLED: 'true', VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_publicfixture123' }).status).toBe(0)
  expect(run({ VITE_CLOUD_ENABLED: 'true', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }).status).toBe(1)
})
