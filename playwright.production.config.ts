import {defineConfig,devices} from '@playwright/test'
import {existsSync} from 'node:fs'
export default defineConfig({
 testDir:'./deploy-tests',timeout:30000,workers:1,outputDir:'test-results/production',
 use:{...devices['iPhone 13'],defaultBrowserType:'chromium',serviceWorkers:'block',baseURL:process.env.SITE_URL??'https://kwonyoung1.github.io/pocket-friends/',trace:'retain-on-failure',launchOptions:existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{}},
 projects:[{name:'live-mobile'}],
 // Offline verification of the very same built app; never enabled in deployment.
 webServer:process.env.LOCAL_PREVIEW==='true'?{command:'npm run preview -- --port 4187 --strictPort',url:'http://127.0.0.1:4187',reuseExistingServer:false}:undefined,
})
