import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',
 timeout:60000,
 retries:1,
 reporter:'list',
 use:{baseURL:'http://127.0.0.1:4173',...devices['Desktop Chrome'],acceptDownloads:true},
 webServer:{
   command:'python3 -m http.server 4173 --bind 127.0.0.1',
   url:'http://127.0.0.1:4173/studio-oficina-3d.html',
   reuseExistingServer:!process.env.CI,
   timeout:20000
 }
});
