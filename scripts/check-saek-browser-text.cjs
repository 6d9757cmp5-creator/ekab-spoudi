// Run from the repository root with Playwright installed.
// Optional: PLAYWRIGHT_CHANNEL=msedge. Default uses installed Chromium.
// Text bounds only: this does not detect overlaps or certify scientific content.
const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const options = { headless: true };
  if (process.env.PLAYWRIGHT_CHANNEL) options.channel = process.env.PLAYWRIGHT_CHANNEL;
  const browser = await chromium.launch(options);
  const records = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1110, height: 656 } });
    const registry = JSON.parse(fs.readFileSync('saek-image-audit-2026.json', 'utf8'));
    for (const [id, asset] of Object.entries(registry.assets)) {
      if (!asset.localPath) continue;
      await page.setContent(fs.readFileSync(asset.localPath, 'utf8'));
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        if (!svg) throw new Error('Missing SVG');
        const v = svg.viewBox.baseVal;
        return [...svg.querySelectorAll('text')].map(text => {
          const box = text.getBBox();
          // Include nested transforms, but remove CSS viewport scaling.
          const matrix = svg.getScreenCTM().inverse().multiply(text.getScreenCTM());
          const corners = [[box.x, box.y], [box.x + box.width, box.y],
            [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
            .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
          const left = Math.min(...corners.map(p => p.x));
          const top = Math.min(...corners.map(p => p.y));
          const right = Math.max(...corners.map(p => p.x));
          const bottom = Math.max(...corners.map(p => p.y));
          return { text: text.textContent, left, top, right, bottom };
        }).filter(box => box.left < v.x - 0.5 || box.top < v.y - 0.5 ||
          box.right > v.x + v.width + 0.5 || box.bottom > v.y + v.height + 0.5);
      });
      records.push({ id, path: asset.localPath, overflow });
    }
    const report = {
      scope: 'Rendered SVG text bounds only; excludes text overlaps, external images and scientific approval',
      browser: browser.version(), checked: records.length,
      assetsWithOverflow: records.filter(r => r.overflow.length).length, records
    };
    fs.writeFileSync('image-browser-text-report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ checked: report.checked, assetsWithOverflow: report.assetsWithOverflow }));
    if (!records.length || report.assetsWithOverflow) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
