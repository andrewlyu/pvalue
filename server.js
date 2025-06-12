const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store browser instance
let browser = null;

// Initialize browser
async function initBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                '--single-process'
            ]
        });
    }
    return browser;
}

// API endpoint to fetch values
app.get('/api/values', async (req, res) => {
    const resultKey = req.query.resultKey;
    
    if (!resultKey) {
        return res.status(400).json({ error: 'Result key is required' });
    }

    try {
        const browser = await initBrowser();
        const page = await browser.newPage();
        
        // Set a longer timeout for navigation
        await page.setDefaultNavigationTimeout(30000);
        
        // Navigate to the URL
        const url = `https://personalvalu.es/results/${resultKey}`;
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Wait for the content to load
        await page.waitForSelector('div[class*="position-"]', { timeout: 10000 });
        
        // Extract values
        const values = await page.evaluate(() => {
            const valueElements = document.querySelectorAll('div[class*="position-"]');
            return Array.from(valueElements).map(element => {
                const titleElement = element.querySelector('h1');
                const descriptionElement = element.querySelector('h2');
                const position = element.className.match(/position-(\d+)/)?.[1] || '';
                
                return {
                    rank: position,
                    name: titleElement ? titleElement.textContent.trim() : '',
                    description: descriptionElement ? descriptionElement.textContent.trim() : ''
                };
            });
        });

        await page.close();
        
        if (values.length === 0) {
            return res.status(404).json({ error: 'No values found' });
        }

        res.json({ values });
    } catch (error) {
        console.error('Error fetching values:', error);
        res.status(500).json({ error: 'Failed to fetch values' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 