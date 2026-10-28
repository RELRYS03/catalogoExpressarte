import {defineConfig,devices} from '@playwright/test';
const baseURL=process.env.STUDIO_PREVIEW_URL;
if(!baseURL||!/^https:\/\/[a-z0-9.-]+(?::443)?(?:\/.*)?$/i.test(baseURL))throw Error('STUDIO_PREVIEW_URL precisa ser uma URL HTTPS publica da prévia');
export default defineConfig({
  testDir:'./tests/browser',
  testMatch:'meshseal-wasm.spec.mjs',
  timeout:180000,
  retries:0,
  reporter:'list',
  use:{baseURL,...devices['Desktop Chrome'],acceptDownloads:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
});
