import { spawn } from 'child_process';
import puppeteer from 'puppeteer';

const SERVER_PORT = 4173;

const startDevServer = () => {
  const dev = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', String(SERVER_PORT), '--clearScreen', 'false'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  return dev;
};

const waitForReady = (dev) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Dev server did not become ready in time'));    
    }, 30000);

    dev.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes('ready in')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    dev.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    dev.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

const run = async () => {
  const dev = startDevServer();
  try {
    await waitForReady(dev);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    page.on('console', async (msg) => {
      const args = await Promise.all(msg.args().map((arg) => arg.jsonValue().catch(() => '<unserializable>')));
      console.log('[PAGE]', msg.type(), ...args);
    });
    page.on('pageerror', (error) => console.error('[PAGE ERROR]', error.message));

    await page.goto(`http://localhost:${SERVER_PORT}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.$$eval('button', (buttons) => {
      const target = buttons.find((btn) => btn.textContent?.includes('Cache Simulator'));
      target?.click();
    });
    await page.waitForTimeout(2000);
    await browser.close();
  } finally {
    dev.kill();
  }
};

run().catch((error) => {
  console.error('DEBUG ERROR', error);
  process.exitCode = 1;
});