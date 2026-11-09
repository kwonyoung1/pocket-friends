import {defineConfig} from 'vite'
import {resolve} from 'node:path'
import react from '@vitejs/plugin-react'
import {effectsIsolationAudit} from './scripts/effects-isolation-plugin'
export default defineConfig({
 base:'./',plugins:[react(),effectsIsolationAudit()],
 build:{manifest:true,rollupOptions:{input:{
  game:resolve(import.meta.dirname,'index.html'),
  effectsLab:resolve(import.meta.dirname,'effects-lab/index.html'),
 }}},
})
