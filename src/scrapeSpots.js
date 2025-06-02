import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeSpotDetails(link) {
    const browser = await puppeteer.launch({ headless: false });
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
        // Navigate to the spot page
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extract immutable data
        const details = await page.evaluate(() => {
            // Find the script tag containing FCGON
            let scriptContent = '';
            document.querySelectorAll('script').forEach(script => {
                if (script.innerText.includes('FCGON')) {
                    scriptContent = script.innerText;
                }
            });

            // Extract coordinates
            const match = scriptContent.match(/"lat":([\d.]+),"lng":([\d.-]+)/);
            const lat = match ? parseFloat(match[1]) : null;
            const lon = match ? parseFloat(match[2]) : null;

            // Extract spot type and reliability
            const spotType = document.querySelector('.guide-header__type-icon--break + span')?.innerText.trim();
            const reliability = document.querySelector('.guide-header__information tbody tr td:first-child')?.innerText.trim();

            // Extract best season
            const bestSeason = document.querySelector('.guide-page__best-month span')?.innerText.trim();

            // Extract surfability rating
            const rating = document.querySelector('.guide-header__type-icon--stars + span')?.innerText.trim();

            return { lat, lon, spotType, reliability, bestSeason, rating };
        });


        await browser.close();
        return details;
    } catch (err) {
        console.error(`Failed to scrape ${link}:`, err);
        await browser.close();
        return null;
    }
}

async function scrapeSpots() {

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Read the spots.json file synchronously
    const spots = JSON.parse(fs.readFileSync(new URL('../spots.json', import.meta.url), 'utf8'));

    // Set a real user-agent
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Remove bot detection
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    try {
/*
        // Navigate to the Morocco surf spots page
        await page.goto('https://www.surf-forecast.com/countries/Spain/breaks', {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });

        // Extract surf spots
        const spots = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.list_table tr'));
            const results = [];
            let currentRegion = null;

            rows.forEach((row) => {
                const regionCell = row.querySelector('td[colspan="6"] h2 a');
                if (regionCell) {
                    currentRegion = regionCell.innerText.trim(); // New region header
                    return; // Skip to next row
                }

                const spotLinks = Array.from(row.querySelectorAll('a'));
                spotLinks.forEach((link) => {
                    results.push({
                        name: link.innerText.trim(),
                        link: link.href,
                        region: currentRegion,
                    });
                });
            });

            return results;
        });

        // Save to file
        fs.writeFileSync('spots.json', JSON.stringify(spots, null, 2));
        console.log('Spots saved to spots.json');

        */
        // Scrape details for each spot
        const detailedSpots = [];
        for (let i = 0; i < spots.length; i++) {
            console.log(`Scraping details for ${spots[i].name}...`);
            const details = await scrapeSpotDetails(spots[i].link);
            if (details) {
                detailedSpots.push({ ...spots[i], ...details });
            }
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
        }

        // Save detailed spots to file
        fs.writeFileSync('detailedSpots.json', JSON.stringify(detailedSpots, null, 2));
        console.log('Detailed spots saved to detailedSpots.json');
    } catch (err) {
        console.error('Scraping failed:', err);
    } finally {
        await browser.close();
    }
}

scrapeSpots();