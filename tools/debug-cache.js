import puppeteer from 'puppeteer';

const run = async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    const args = msg.args();
    Promise.all(args.map((arg) => arg.jsonValue())).then((values) => {
      console.log('[PAGE LOG]', msg.type(), ...values);
    });
  });
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err.message);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.warn('[PAGE RESPONSE]', res.status(), res.url());
    }
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.waitForSelector('button', { timeout: 10000 });
  await page.$$eval('button', (buttons) => {
    const target = buttons.find((btn) => btn.textContent?.includes('Cache Simulator'));
    target?.click();
  });
  await page.waitForTimeout(2000);
  await browser.close();
};

run().catch((error) => {
  console.error('DEBUG ERROR', error);
  process.exit(1);
});