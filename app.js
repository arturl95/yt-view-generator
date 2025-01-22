const { Actor } = require('apify');
const { PlaywrightCrawler } = require('crawlee');
const randomUserAgent = require('random-useragent');

(async () => {
    await Actor.init();

    const input = await Actor.getInput();
    console.log(JSON.stringify(input, null, 2));

    if (!input || !Array.isArray(input.startUrls) || input.startUrls.length === 0) {
        console.error('No valid Start URLs provided:', JSON.stringify(input, null, 2));
        throw new Error('No valid Start URLs provided in the input.');
    }

    const playDuration = input.playDuration || Math.floor(Math.random() * (122000 - 120001 + 1)) + 120001; // Default to random between 120001 and 122000 seconds

    const youtubeRequests = input.startUrls.map(item => ({ url: item.url }));
    let proxyConfiguration;
    try {
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['RESIDENTIAL'],
            countryCode: input.proxyCountryCode || 'US',
        });
        console.log('Proxy configuration created.');
    } catch (error) {
        console.error('Failed to create proxy configuration:', error.message);
        throw error;
    }

    const crawler = new PlaywrightCrawler({
        launchContext: {
            launchOptions: { headless: true },
        },
        browserPoolOptions: {
            useFingerprints: true,
        },
        proxyConfiguration,
        preNavigationHooks: [
            async ({ page }) => {
                await page.setExtraHTTPHeaders({
                    'User-Agent': randomUserAgent.getRandom(),
                    'Accept-Language': 'en-US,en;q=0.9',
                });
            },
        ],
        requestHandler: async ({ page, request }) => {
            try {
                console.log(`Navigating to ${request.url}`);
                await page.goto(request.url, { waitUntil: 'networkidle' });

                console.log(`Playing video on ${request.url}`);
                // Wait for the video element and play it
                await page.waitForSelector('video', { timeout: 15000 });
                const videoElement = await page.$('video');
                if (videoElement) {
                    await page.evaluate(video => video.play(), videoElement);
                }

                console.log(`Simulating view for ${playDuration / 1000} seconds`);
                await page.waitForTimeout(playDuration);

                console.log(`Finished view simulation for ${request.url}`);
            } catch (error) {
                console.error(`Error processing ${request.url}:`, error.message);
            }
        },
        failedRequestHandler: ({ request }) => {
            console.error(`Failed to process ${request.url}`);
        },
    });

    console.log('Starting crawler...');
    await crawler.run(youtubeRequests);
    console.log('Crawler finished.');
    await Actor.exit();
})();
