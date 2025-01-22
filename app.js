const { Actor } = require('apify');
const { PlaywrightCrawler } = require('crawlee');
const randomUserAgent = require('random-useragent');

(async () => {
    await Actor.init();

    const input = await Actor.getInput();
    if (!input || !Array.isArray(input.startUrls) || input.startUrls.length === 0) {
        console.error('No valid Start URLs provided:', JSON.stringify(input, null, 2));
        throw new Error('No valid Start URLs provided in the input.');
    }

    const playDuration = input.playDuration || Math.floor(Math.random() * (34000 - 31000 + 1)) + 31000; // Random between 31,000 and 34,000 ms

    const youtubeRequests = input.startUrls.map(item => ({ url: item.url }));
    const proxyConfiguration = await Actor.createProxyConfiguration({
        groups: ['RESIDENTIAL'],
        countryCode: input.proxyCountryCode || 'US',
    });

    const viewGenerator = new PlaywrightCrawler({
        launchContext: {
            launchOptions: { headless: false }, // Browser opens in non-headless mode
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
                console.log(`Opening video URL: ${request.url}`);
                await page.goto(request.url, { waitUntil: 'networkidle' });

                console.log(`Checking for consent dialog...`);
                const rejectButtonSelector = 'button[aria-label="Reject the use of cookies and other data for the purposes described"]';
                if (await page.$(rejectButtonSelector)) {
                    console.log(`Reject button found. Clicking...`);
                    await page.click(rejectButtonSelector);
                    await page.waitForTimeout(1000); // Wait for the dialog to close
                } else {
                    console.log(`No consent dialog detected.`);
                }

                console.log(`Playing video on ${request.url}`);
                // Wait for the video container and play the video
                await page.waitForSelector('#movie_player', { timeout: 15000 });
                const videoContainer = await page.$('#movie_player');
                if (videoContainer) {
                    await page.evaluate(container => {
                        const video = container.querySelector('video');
                        if (video) video.play();
                    }, videoContainer);
                }

                console.log(`Simulating view for ${playDuration / 1000} seconds`);
                await page.waitForTimeout(playDuration);

                console.log(`View simulation completed for ${request.url}`);
            } catch (error) {
                console.error(`Error generating view for ${request.url}:`, error.message);
            }
        },
        failedRequestHandler: ({ request }) => {
            console.error(`Failed to generate view for ${request.url}`);
        },
    });

    console.log('Starting view generator...');
    await viewGenerator.run(youtubeRequests);
    console.log('View generation process finished.');
    await Actor.exit();
})();
