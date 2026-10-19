// Renders site/index.html in headless Chromium and prints the first screen (#main) as HTML,
// so build.py can put it into the page for search engines that do not run JavaScript (Naver's crawler)
// and for Google's first, HTML-only pass.
//   node tools/prerender.js site/index.html
const path = require('path');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

(async () => {
  const file = path.resolve(process.argv[2] || 'site/index.html');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // only the local file: no fonts, rate APIs or analytics during the build
  await page.route('**/*', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto('file://' + file);
  await page.waitForSelector('#main section', { timeout: 10000 });
  const html = await page.$eval('#main', main => {
    // icons are drawn again by the page script; leaving them out keeps the HTML small
    main.querySelectorAll('i > svg.ico').forEach(s => s.remove());
    return main.innerHTML;
  });
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  process.stdout.write(html);
})().catch(e => { console.error(e.message); process.exit(1); });
