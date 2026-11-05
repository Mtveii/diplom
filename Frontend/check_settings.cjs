const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://localhost:5173/settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const content = await page.content();
  console.log('Has Bot Gateway Health:', content.includes('Bot Gateway Health'));
  console.log('Has settings title:', content.includes('Управление системой') || content.includes('Settings'));
  console.log('ERRORS:', JSON.stringify(errors));
  await page.screenshot({ path: 'Z:/diplom/frontend_settings.png', fullPage: true });
  await browser.close();
})();
