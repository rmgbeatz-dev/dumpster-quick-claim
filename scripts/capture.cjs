// Capture screenshots of every preview screen.
const playwrightPath = '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(playwrightPath);
const path = require('path');
const fs = require('fs');

async function shoot(page, outDir, name) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log('  ->', name);
}

async function navBack(page) {
  // react-navigation native-stack header back button on web has aria-label "Go back" / "Back"
  const candidates = [
    'button[aria-label="Go back"]',
    'button[aria-label="Back"]',
    '[aria-label="Go back"]',
    '[aria-label="Back"]',
  ];
  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    if (await loc.count()) { await loc.click(); await page.waitForTimeout(500); return; }
  }
  // Fallback: tap top-left where the chevron should sit.
  await page.mouse.click(20, 40); await page.waitForTimeout(500);
}

async function tap(page, label, opts = {}) {
  // Avoid matching the navigation-bar text by scoping to the body and using
  // the last visible element with that label inside scrollable content.
  const loc = page.locator(`role=button[name="${label}"]`).or(page.getByText(label, { exact: true })).last();
  await loc.click(opts);
}

(async () => {
  const outDir = path.resolve(__dirname, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  console.log('Loading http://localhost:8081');
  await page.goto('http://localhost:8081', { waitUntil: 'load', timeout: 120_000 });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, { timeout: 120_000 });
  await page.waitForTimeout(1500);
  await shoot(page, outDir, '01-login.png');

  // Sign in. Inputs first; click button by precise text inside the form card.
  const emailInput = page.locator('input').first();
  await emailInput.fill('ryan@example.test');
  const inputs = page.locator('input');
  await inputs.nth(1).fill('preview');
  await page.locator('div[role="button"]:has-text("Sign in"), [tabindex="0"]:has-text("Sign in")').last().click();
  await page.waitForTimeout(2000);
  await shoot(page, outDir, '02-dashboard-provider.png');

  // Switch to Proxy via the preview switcher (the chip labeled "proxy")
  await page.getByText('proxy', { exact: true }).first().click();
  await shoot(page, outDir, '03-dashboard-proxy.png');

  // Open CVS Pharmacy (grace period)
  await page.getByText('CVS Pharmacy', { exact: true }).click();
  await shoot(page, outDir, '04-claim-grace.png');
  await navBack(page);

  // Walgreens (approved + EOB)
  await page.getByText('Walgreens', { exact: true }).click();
  await shoot(page, outDir, '05-claim-approved-eob.png');
  await navBack(page);

  // Uber (denied + appeal)
  await page.getByText('Uber', { exact: true }).click();
  await shoot(page, outDir, '06-claim-denied-with-appeal.png');
  await navBack(page);

  // Rite Aid (overdue + deductible)
  await page.getByText('Rite Aid', { exact: true }).click();
  await shoot(page, outDir, '07-claim-overdue.png');
  await navBack(page);

  // Submit Claim form
  await page.getByText('+ New Claim').click();
  await page.waitForTimeout(800);
  await page.locator('input').first().fill('Walmart Pharmacy');
  await page.locator('input').nth(2).fill('19.99');
  await shoot(page, outDir, '08-submit-claim.png');
  await navBack(page);

  // Audit log
  await page.getByText('Audit log', { exact: true }).click();
  await shoot(page, outDir, '09-audit-log.png');
  await navBack(page);

  // Switch back to Provider, then Admin Settings
  await page.getByText('provider', { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('Admin settings', { exact: true }).click();
  await shoot(page, outDir, '10-admin-settings.png');

  await browser.close();
  console.log('done');
})().catch((e) => { console.error(e.message); process.exit(1); });
