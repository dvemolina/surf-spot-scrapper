import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeSpots() {
  // Launch Puppeteer with debugging options
  const browser = await puppeteer.launch({
    headless: false, // Set to true once working
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set a real user-agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // Remove bot detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  try {
    // Navigate to the page
    await page.goto('https://www.surf-forecast.com/countries/Morocco/breaks', {
      waitUntil: 'networkidle2',
      timeout: 60000, // 60 seconds
    });

    // Take a screenshot to debug
    await page.screenshot({ path: 'debug.png', fullPage: true });

    // Extract surf spots
    const spots = await page.evaluate(() => {
      const regions = Array.from(document.querySelectorAll('.list_table'));
      const results = [];

      regions.forEach((region) => {
        const regionName = region.querySelector('h2 a')?.innerText.trim();
        const spotRows = Array.from(region.querySelectorAll('tr'));

        spotRows.forEach((row) => {
          const spotLinks = Array.from(row.querySelectorAll('a'));
          spotLinks.forEach((link) => {
            results.push({
              name: link.innerText.trim(),
              link: link.href,
              region: regionName,
            });
          });
        });
      });

      return results;
    });

    // Save to file
    fs.writeFileSync('spots.json', JSON.stringify(spots, null, 2));
    console.log('Spots saved to spots.json');
  } catch (err) {
    console.error('Scraping failed:', err);
  } finally {
    await browser.close();
  }
}

scrapeSpots();
