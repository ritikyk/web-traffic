import { readFileSync } from 'fs';
import { chromium, devices } from '@playwright/test';

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';

// Define the target URL
const url = 'https://slat.cc/ritikraj';  // Replace with the target URL

// Define the devices to simulate
const deviceProfiles = [
    { ...devices['iPhone 13'], name: 'iPhone 13' },
    { ...devices['Pixel 5'], name: 'Pixel 5' },
    { ...devices['iPad Mini'], name: 'iPad Mini' },
    { ...devices['Desktop Safari'], name: 'Desktop Safari' },
    { ...devices['Desktop Chrome'], name: 'Desktop Chrome' }
];

let visits = 0;
let successfulVisits = 0;  // Counter for successful visits

// Read proxies from the proxies.txt file
async function readProxiesFromFile() {
    const data = readFileSync('proxies.txt', 'utf-8');  // Adjust path if necessary
    // Split the proxy list by newlines and filter out any empty entries
    return data.split('\n').filter(proxy => proxy.trim());
}

// Function to visit the website with error handling
async function visitWebsite(device, proxy) {
    try {
        const [ip, port] = proxy.split(':'); // Split IP and port
        const browser = await chromium.launch({
            headless: true,
            proxy: {
                server: `http://${ip}:${port}`
            }
        });

        const context = await browser.newContext({
            ...device,
            userAgent: device.userAgent,
            viewport: device.viewport,
        });

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'load', timeout: 15000 });
        console.log(`${green}Visited ${yellow}${url} ${green}using ${yellow}${device.name} ${green}with proxy ${red}${ip}:${port}`);
        
        await browser.close();
        return true;  // Success

    } catch (error) {
        console.error(`${red}Failed to visit with proxy ${green}${proxy} - ${red}${error.message}`);
        return false;  // Failure
    }
}

// Main function to simulate traffic with proxy retry mechanism
async function simulateTraffic() {
    const proxies = await readProxiesFromFile();
    console.log(`${green}Fetched ${red}${proxies.length} ${green}proxies`);

    while (true) {
        for (let device of deviceProfiles) {
            let success = false;
            let attempts = 0;

            while (!success && attempts < 5) {
                // Pick a random proxy from the list
                const proxy = proxies[Math.floor(Math.random() * proxies.length)];
                success = await visitWebsite(device, proxy);
                visits += 1;

                if (success) {
                    successfulVisits += 1;  // Increment successful visits
                }

                if (!success) {
                    console.log(`${red}Retrying with a new proxy...`);
                    attempts += 1;
                }
            }

            if (!success) {
                console.log(`${yellow}Skipping ${red}${device.name} ${yellow}due to repeated proxy failures.`);
            }

            // Random delay between requests
            const delay = Math.random() * (3000 - 1000);
            console.log(`Waiting ${red}${delay / 1000} seconds before the next device`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// After the loop, print the total successful visits
simulateTraffic().finally(() => {
    console.log(`${green}Successfully Sent ${red}${successfulVisits} Requests`);
    console.log(`${green}Total Attempts: ${red}${visits}`);
});
