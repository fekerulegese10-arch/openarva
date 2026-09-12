import { chromium } from 'playwright-core';
export async function runWebTask(url) {
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url);
        const title = await page.title();
        await browser.close();
        return `Successfully visited ${url}. Page title: "${title}"`;
    }
    catch (error) {
        return `Browser Automation Error: ${error.message}`;
    }
}
