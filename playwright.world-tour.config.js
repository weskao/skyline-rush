import { defineConfig } from '@playwright/test';
const port = process.env.PLAYWRIGHT_PORT || '5183';
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid Playwright port');
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests',testMatch:['**/world-tour-mid-race-browser.spec.js','**/world-tour-showcase-browser.spec.js','**/showcase-camera-views-browser.spec.js'],
 fullyParallel:false,workers:1,
 timeout:process.env.CI?180000:90000,
 expect:{timeout:20000},
 reporter:'list',
 use:{
   baseURL,viewport:{width:640,height:360},
   deviceScaleFactor:process.env.CI?.5:1,
   channel:'chrome',launchOptions:{args:['--enable-unsafe-swiftshader']},
 },
 webServer:{
   command:`npm run dev -- --port ${port} --strictPort`,
   url:`${baseURL}/tests/fixtures/world-tour-mid-race.html`,
   reuseExistingServer:!process.env.CI,
 },
});
