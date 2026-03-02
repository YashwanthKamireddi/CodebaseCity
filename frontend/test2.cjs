const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => {
        if(msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[Browser ${msg.type()}] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => {
        console.log(`[Browser Exception] ${err.message}`);
    });

    console.log("Navigating to page...");
    await page.goto('http://localhost:5173');

    console.log("Filling workspace...");
    await page.waitForSelector('button:has-text("Connect Workspace")');
    await page.click('button:has-text("Connect Workspace")');
    await page.fill('input[type="text"]', '/home/yash/Projects/Code_City/frontend');
    await page.click('button:has-text("Connect")');

    console.log("Analyzing...");
    await page.waitForSelector('button:has-text("Analyze")');
    await page.click('button:has-text("Analyze")');

    console.log("Waiting 3s for render to crash...");
    await page.waitForTimeout(3000);

    await browser.close();
    console.log("Done");
})();
