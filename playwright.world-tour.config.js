import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:['**/world-tour-mid-race-browser.spec.js','**/world-tour-showcase-browser.spec.js','**/showcase-camera-views-browser.spec.js'],
 fullyParallel:true,workers:1, // one worker, but CI --shard splits by test instead of by file
 timeout:process.env.CI?180000:90000,
 expect:{timeout:20000},
 reporter:'list',
 use:{
   baseURL:'http://127.0.0.1:5183',viewport:{width:640,height:360},
   deviceScaleFactor:process.env.CI?.5:1,
   channel:'chrome',launchOptions:{args:['--enable-unsafe-swiftshader']},
 },
 webServer:{
   command:'npm run dev -- --port 5183 --strictPort',
   url:'http://127.0.0.1:5183/tests/fixtures/world-tour-mid-race.html',
   reuseExistingServer:!process.env.CI,
 },
});
