import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:8081...');
  await page.goto('http://localhost:8081');
  
  console.log('Waiting for network idle...');
  await page.waitForTimeout(5000);

  // Trigger the Add Player Modal
  console.log('Clicking to Players Tab...');
  const playersTab = await page.$('.lucide-users');
  if (playersTab) await playersTab.click();
  await page.waitForTimeout(1000);

  console.log('Clicking Add New Member...');
  await page.click('text="Add New Member"');
  await page.waitForTimeout(1000);

  console.log('Typing name...');
  await page.fill('input[placeholder="Enter player name"]', 'Ronnie OSullivan');

  console.log('Clicking Suggest Nicknames...');
  await page.click('text="Suggest Nicknames"');

  // Wait for ML to potentially download or fail
  await page.waitForTimeout(15000);

  await browser.close();
  console.log('Done.');
})();
