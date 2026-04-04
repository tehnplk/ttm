const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 2500, height: 900 } });
  const filePath = 'file://' + path.join(process.cwd(), 'rich.html');
  await page.goto(filePath);
  await page.screenshot({ path: 'rich-menu.png', fullPage: true });
  await browser.close();
})();
