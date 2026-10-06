import { chromium } from 'playwright';
const [,, salida, ...urls] = process.argv;
const nav = await chromium.launch({ channel: 'chrome' });
const pag = await nav.newPage({ viewport: { width: 1400, height: 900 } });
let i = 0;
for (const u of urls) {
  await pag.goto(u, { waitUntil: 'load', timeout: 60000 });
  await pag.waitForTimeout(2500);
  await pag.screenshot({ path: `${salida}/${++i}.png`, fullPage: false });
}
await nav.close();
console.log('capturas hechas');
