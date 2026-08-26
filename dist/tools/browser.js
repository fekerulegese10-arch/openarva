import { chromium } from 'playwright-core';
export async function scrapeWebPage(url) {
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.locator('body').innerText();
        await browser.close();
        return content || 'No readable content found.';
    }
    catch (error) {
        return `Scraping Error: ${error.message}`;
    }
}
