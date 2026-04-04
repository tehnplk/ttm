const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set viewport to match rich menu size
    await page.setViewport({
        width: 2500,
        height: 843,
        deviceScaleFactor: 1
    });
    
    // Load the HTML file
    const filePath = path.join(__dirname, 'rich.html');
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    // Take screenshot
    await page.screenshot({
        path: 'rich-menu-output.png',
        fullPage: false,
        clip: {
            x: 0,
            y: 0,
            width: 2500,
            height: 843
        }
    });
    
    console.log('✅ Screenshot saved to rich-menu-output.png');
    
    await browser.close();
})();


