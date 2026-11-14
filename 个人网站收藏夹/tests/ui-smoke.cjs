const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.argv[2] || 'playwright');

const siteUrl = process.env.BOOKMARK_TEST_URL || 'http://127.0.0.1:8000/';
const screenshots = path.resolve(__dirname, '../screenshots');
const checks = [];
function check(name, passed) {
  assert.ok(passed, name);
  checks.push(name);
}

(async () => {
  await fs.mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  // A fresh, isolated context keeps all checks away from the user's bookmarks.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Keep deliberately fake import/test hosts away from external icon services.
  await context.route('https://example.com/favicon.ico', (route) => route.abort());
  await context.route('https://a.favicon.im/example.com?*', (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cards = page.locator('.bookmark-card');
  const tag = (name) => page.getByRole('button', { name, exact: true });
  const card = (name) => cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
  try {
    await page.goto(siteUrl, { waitUntil: 'networkidle' });
    check('default bookmarks, categories and pins', await cards.count() === 4 && await page.locator('#tagCount').textContent() === '8' && await page.locator('#pinnedCount').textContent() === '2');
    check('each site has an icon or bookmark fallback', await page.locator('.site-icon img, .site-icon svg').count() === 4);
    check('open links retain URLs and separate browsing context', await card('GitHub').locator('.visit-btn').getAttribute('href') === 'https://github.com' && await card('GitHub').locator('.visit-btn').getAttribute('target') === '_blank');
    await page.screenshot({ path: path.join(screenshots, 'desktop-redesign.png'), fullPage: true });
    for (const width of [320, 390, 540, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        bodyWidth: document.documentElement.scrollWidth,
        columns: getComputedStyle(document.querySelector('.bookmark-grid')).gridTemplateColumns.split(' ').length,
        right: Math.max(...[...document.querySelectorAll('.bookmark-card')].map((item) => item.getBoundingClientRect().right)),
      }));
      check(`no page overflow at ${width}px`, layout.bodyWidth <= layout.viewport + 1 && layout.right <= layout.viewport);
      if (width === 390) {
        check('phone uses one card per row', layout.columns === 1);
        await page.screenshot({ path: path.join(screenshots, 'mobile-redesign.png'), fullPage: true });
      }
      if (width === 1440) check('desktop uses four columns', layout.columns === 4);
    }
    await tag('开发').click();
    check('category filters correctly', await cards.count() === 1 && await cards.first().locator('h3').textContent() === 'GitHub');
    check('selected category keeps keyboard focus', await page.evaluate(() => document.activeElement.textContent) === '开发');
    await tag('全部').click();
    await page.locator('#searchInput').fill('developer.mozilla.org');
    check('search by domain', await cards.count() === 1 && await cards.first().locator('h3').textContent() === 'MDN Web Docs');
    await page.locator('#searchInput').fill('no-such-bookmark-1234');
    check('empty search state', await cards.count() === 0 && await page.locator('#emptyState').isVisible());
    await page.locator('#searchInput').fill('');

    await page.getByRole('button', { name: '添加网站', exact: true }).click();
    check('add dialog opens and focuses name', await page.locator('#bookmarkDialog').isVisible() && await page.locator('#deleteBtn').isHidden() && await page.evaluate(() => document.activeElement.id) === 'nameInput');
    await page.screenshot({ path: path.join(screenshots, 'dialog-redesign.png'), fullPage: true });
    await page.locator('#nameInput').fill('测试收藏');
    await page.locator('#urlInput').fill('example.com/docs');
    await page.locator('#tagsInput').fill('测试分类, 工作');
    await page.locator('#notesInput').fill('用于验证新版添加、编辑和备份功能。');
    await page.getByRole('button', { name: '保存网站', exact: true }).click();
    check('add and normalize URL', await cards.count() === 5 && await card('测试收藏').locator('.visit-btn').getAttribute('href') === 'https://example.com/docs');
    check('unavailable custom icon uses a bookmark, not initials', await card('测试收藏').locator('.site-icon svg use').getAttribute('href') === '#icon-bookmark' && await card('测试收藏').locator('.site-icon').textContent() === '');
    await card('测试收藏').locator('.pin').focus();
    await card('测试收藏').locator('.pin').press('Enter');
    check('pin toggle and count', await card('测试收藏').locator('.pin').getAttribute('aria-pressed') === 'true' && await page.locator('#pinnedCount').textContent() === '3');
    check('pin retains focus after reorder', await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === '取消置顶 测试收藏');
    await card('测试收藏').locator('.pin').press('Enter');
    await tag('测试分类').click();
    await card('测试收藏').locator('.edit-btn').click();
    check('edit dialog loads values', await page.locator('#nameInput').inputValue() === '测试收藏' && await page.locator('#deleteBtn').isVisible());
    await page.locator('#nameInput').fill('测试收藏（已编辑）');
    await page.locator('#tagsInput').fill('资料');
    await page.getByRole('button', { name: '保存网站', exact: true }).click();
    check('editing last item of active category restores all', await cards.count() === 5 && await tag('全部').getAttribute('aria-pressed') === 'true');
    check('saving edit restores focus to updated edit button', await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === '编辑 测试收藏（已编辑）');
    await page.locator('#sortSelect').selectOption('recent');
    check('recent sorting', await cards.first().locator('h3').textContent() === '测试收藏（已编辑）');
    const savedBeforeRefresh = await page.evaluate(() => localStorage.getItem('personal-bookmark-site:v1'));
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: '刷新页面', exact: true }).click(),
    ]);
    check('refresh button reloads the page and keeps edited bookmarks', await cards.count() === 5 && await card('测试收藏（已编辑）').count() === 1);
    check('refresh leaves saved bookmark data unchanged', await page.evaluate(() => localStorage.getItem('personal-bookmark-site:v1')) === savedBeforeRefresh);

    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出', exact: true }).click();
    const download = await downloadEvent;
    const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    check('export creates complete JSON backup', download.suggestedFilename() === 'my-bookmarks.json' && exported.length === 5 && exported.some((item) => item.name === '测试收藏（已编辑）' && item.tags[0] === '资料'));
    await card('测试收藏（已编辑）').locator('.edit-btn').click();
    await page.getByRole('button', { name: '删除网站', exact: true }).click();
    check('delete updates count', await cards.count() === 4 && await page.locator('#totalCount').textContent() === '4');
    check('delete restores keyboard focus to a remaining control', await page.evaluate(() => document.activeElement.matches('.edit-btn, #addBookmarkBtn')));
    const pickerEvent = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '导入', exact: true }).click();
    await (await pickerEvent).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
    await page.waitForFunction(() => document.querySelector('#totalCount').textContent === '5');
    check('import restores exported data', await cards.count() === 5 && await card('测试收藏（已编辑）').count() === 1);

    const legacyTags = ['开发', '设计', '学习', '效率', '灵感', '视频', '音乐', '工具', '<img src=x onerror=alert(1)>'];
    const legacy = Array.from({ length: 23 }, (_, index) => ({ id: `legacy-${index}`, name: index === 0 ? '一个很长的网站名称用于确认卡片不会撑破手机布局' : `收藏 ${index + 1}`, url: `https://example.com/${index}`, tags: [legacyTags[index % 9]], notes: '一段较长的备注，用于确认文本换行和截断之后，卡片底部操作依然对齐。'.repeat(3), pinned: false, createdAt: 1600000000000 + index }));
    await page.locator('#importFile').setInputFiles({ name: 'legacy-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
    await page.waitForFunction(() => document.querySelector('#totalCount').textContent === '23');
    check('original 23-item backup schema remains compatible', await cards.count() === 23 && await page.locator('#tagCount').textContent() === '9' && await page.locator('#pinnedCount').textContent() === '0');
    check('category text cannot inject HTML', await page.locator('#tagStrip img').count() === 0 && await tag(legacyTags[8]).count() === 1);
    await page.reload({ waitUntil: 'networkidle' });
    check('imported data survives reload', await cards.count() === 23);
    await page.setViewportSize({ width: 320, height: 720 });
    check('long imported content does not overflow mobile', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#searchInput').fill('unmatched');
    const importedBeforeRefresh = await page.evaluate(() => localStorage.getItem('personal-bookmark-site:v1'));
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: '刷新页面', exact: true }).click(),
    ]);
    check('phone refresh keeps all imported bookmarks and clears the page filter', await cards.count() === 23 && await page.locator('#searchInput').inputValue() === '');
    check('phone refresh leaves imported data unchanged', await page.evaluate(() => localStorage.getItem('personal-bookmark-site:v1')) === importedBeforeRefresh);
    check('destructive reset control is absent', await page.getByRole('button', { name: '恢复示例数据', exact: true }).count() === 0);
    await page.getByRole('button', { name: '添加网站', exact: true }).click();
    check('phone dialog fits viewport', await page.locator('#bookmarkDialog').evaluate((dialog) => dialog.getBoundingClientRect().width <= innerWidth));
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    check('close dialog works', await page.locator('#bookmarkDialog').isHidden());
    const contrastResults = await page.evaluate(() => {
      function luminance(color) {
        const components = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
          const channel = Number(value) / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722;
      }
      return ['.stats', '.site-link', '.field-hint'].map((selector) => {
        const element = document.querySelector(selector);
        const foreground = luminance(getComputedStyle(element).color);
        let parent = element;
        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
        const background = luminance(parent ? getComputedStyle(parent).backgroundColor : 'rgb(255, 255, 255)');
        return { selector, ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
      });
    });
    for (const result of contrastResults) check(`readable text contrast ${result.selector}: ${result.ratio.toFixed(2)}`, result.ratio >= 4.5);
    check('no JavaScript runtime errors', errors.length === 0);
    console.log(JSON.stringify({ status: 'passed', checks: checks.length, details: checks, screenshots }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
