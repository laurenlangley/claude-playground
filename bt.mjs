/**
 * Headless verification of the engine build. Checks the things that are easy to
 * get silently wrong: worklet module loading, actual signal on the bus, the
 * shaper responding, keyboard operability, and console cleanliness.
 */
import { chromium } from 'playwright-core';

const URL_BASE = process.argv[2] ?? 'http://localhost:4180/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const page = await browser.newPage();
const errors = [];
const failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });

await page.goto(URL_BASE, { waitUntil: 'networkidle' });

const beforeStart = await page.textContent('#peak-stat');
await page.getByRole('button', { name: 'Start' }).click();
await page.waitForTimeout(9000);

const text = (sel) => page.textContent(sel);
console.log('status        :', await page.textContent('[role="status"]'));
console.log('peak (before) :', beforeStart);
console.log('peak (after)  :', await text('#peak-stat'));
console.log('cpu           :', await text('#cpu-stat'));

const peakDb = parseFloat((await text('#peak-stat')).match(/(-?\d+\.\d+) dBFS/)?.[1] ?? 'NaN');
const signalOk = Number.isFinite(peakDb) && peakDb > -60 && peakDb < 0;
console.log('signal present:', signalOk ? `yes (${peakDb} dBFS)` : 'NO');

// Shaper must actually change the drawn response curve.
const inkOf = () => page.evaluate(() => {
  const c = document.querySelector('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i + 3];
  return sum;
});
const inkFlat = await inkOf();
await page.getByRole('button', { name: 'Speech masking' }).click();
await page.waitForTimeout(2000);
const inkShaped = await inkOf();
const bands = await page.evaluate(() =>
  [...document.querySelectorAll('input[type=range]')].slice(2, 12).map((i) => i.value).join(' '));
console.log('bands applied :', bands);
console.log('curve moved   :', inkFlat !== inkShaped ? 'yes' : 'NO');

// Drone: start it and confirm no error and the button state flips.
await page.getByRole('button', { name: 'Drone off' }).click();
await page.waitForTimeout(1500);
console.log('drone toggled :', await page.getAttribute('button[aria-pressed]:has-text("Drone")', 'aria-pressed'));

// Keyboard: a band slider must take focus and respond to arrow keys.
const kb = await page.evaluate(() => {
  const s = document.querySelectorAll('input[type=range]')[4];
  s.focus();
  return { focused: document.activeElement === s, value: s.value };
});
await page.keyboard.press('ArrowUp');
const kbAfter = await page.evaluate(() => document.querySelectorAll('input[type=range]')[4].value);
console.log('kbd focus     :', kb.focused ? 'yes' : 'NO');
console.log('kbd arrow     :', kb.value !== kbAfter ? `yes (${kb.value} -> ${kbAfter})` : 'NO');

// Stop must fade, not cut.
await page.getByRole('button', { name: 'Stop' }).click();
await page.waitForTimeout(2500);
console.log('stopped       :', await page.textContent('[role="status"]'));

const realFailures = failedRequests.filter((r) => !r.includes('favicon'));
console.log('failed reqs   :', realFailures.length ? realFailures : 'none (favicon ignored)');
console.log('console errors:', errors.length ? errors : 'none');

await browser.close();
const ok = signalOk && inkFlat !== inkShaped && kb.focused && !realFailures.length && !errors.length;
console.log(ok ? '\nBROWSER CHECK PASSED' : '\nBROWSER CHECK FAILED');
process.exit(ok ? 0 : 1);
