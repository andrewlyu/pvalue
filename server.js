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

// Cache for storing browser instance
let browserInstance = null;

// Initialize browser instance
async function initBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1280, height: 800 }
        });
    }
    return browserInstance;
}

// API endpoint to fetch and parse personal values
app.get('/api/values/:resultKey', async (req, res) => {
    let page;
    try {
        const { resultKey } = req.params;
        const url = `https://personalvalu.es/results/${resultKey}`;
        
        // Get or create browser instance
        const browser = await initBrowser();
        
        // Create new page
        page = await browser.newPage();
        
        // Set timeout to 10 seconds
        await page.setDefaultNavigationTimeout(10000);
        
        // Navigate to the page and wait for content to load
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
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
        if (page) {
            await page.close();
        }
    }
});

// Cleanup browser instance on server shutdown
process.on('SIGINT', async () => {
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit();
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 