const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to fetch and parse personal values
app.get('/api/values/:resultKey', async (req, res) => {
    let browser;
    try {
        const { resultKey } = req.params;
        const url = `https://personalvalu.es/results/${resultKey}`;
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Navigate to the page and wait for content to load
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Wait for the value containers to be present
        await page.waitForSelector('div[class*="position-"]', { timeout: 5000 });
        
        // Extract values
        const values = await page.evaluate(() => {
            const valueElements = document.querySelectorAll('div[class*="position-"]');
            return Array.from(valueElements).map(element => {
                const title = element.querySelector('h1')?.textContent?.trim();
                const description = element.querySelector('h2')?.textContent?.trim();
                const rank = parseInt(element.className.match(/position-(\d+)/)[1]);
                
                return { rank, name: title, description };
            }).filter(v => v.name && v.description);
        });

        if (values.length === 0) {
            console.log('No values found in the HTML content');
            return res.status(404).json({ error: 'No values found on the page' });
        }

        // Sort by rank to ensure correct order
        values.sort((a, b) => a.rank - b.rank);

        res.json({ values });
    } catch (error) {
        console.error('Error fetching values:', error);
        res.status(500).json({ error: 'Failed to fetch values' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 