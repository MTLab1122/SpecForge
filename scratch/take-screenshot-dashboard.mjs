import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  
  // Click 'Skip for now' button in onboarding wizard
  const skipBtn = await page.locator("button:has-text('Skip for now')");
  if (await skipBtn.isVisible()) {
    console.log("Clicking 'Skip for now'...");
    await skipBtn.click();
    await page.waitForTimeout(1000);
  }
  
  const screenshotPath = "C:/Users/muham/.gemini/antigravity/brain/7d2900a3-635f-43c1-84c2-0a011116a53b/dashboard_overview.png";
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log("Screenshot captured to " + screenshotPath);
  
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

