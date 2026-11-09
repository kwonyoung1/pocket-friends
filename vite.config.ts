import {defineConfig} from 'vite'
import {resolve} from 'node:path'
import react from '@vitejs/plugin-react'
import {effectsIsolationAudit} from './scripts/effects-isolation-plugin'
export default defineConfig({
 base:'./',plugins:[react(),effectsIsolationAudit()],
 build:{manifest:true,rollupOptions:{output:{manualChunks(id){if(id.includes('commonjsHelpers'))return 'shared-helpers';if(id.includes('vite/preload-helper'))return 'preload-helper';if(id.includes('/node_modules/gsap/'))return 'gsap';if(id.includes('/node_modules/pixi.js/'))return 'pixi'}},input:{
  game:resolve(import.meta.dirname,'index.html'),
  effectsLab:resolve(import.meta.dirname,'effects-lab/index.html'),
 }}},
})
