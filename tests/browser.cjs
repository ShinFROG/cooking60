const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = new URL(process.env.TEST_URL || 'http://127.0.0.1:4173/cooking60/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const storageKey = `cooking60:${base.pathname}:v1`;
const qa = resolve(__dirname, '../.qa');
const fs = require('node:fs');
const publicRecipes=['lunch','dinner'].flatMap(part=>JSON.parse(fs.readFileSync(resolve(__dirname,'../data/public/recipes-'+part+'.json'),'utf8')));
const within30=publicRecipes.filter(r=>r.estimatedTotalMinutes<=30).length;
const errors = [];
const externalRequests = new Set();
let browser;
let mainPage;

function watch(page, label) {
  page.on('request', request => {if(new URL(request.url()).origin!==base.origin)externalRequests.add(request.url());});
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('requestfailed', request => errors.push(`${label}: ${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  page.setDefaultTimeout(10000);
  return page;
}

async function goto(page, path = '') {
  const response = await page.goto(new URL(path, base).href, { waitUntil: 'networkidle' });
  assert.ok(response?.ok(), `Page loads successfully at ${path || '/'}`);
  assert.ok(page.url().startsWith(base.href), 'Navigation stays within the GitHub Pages project subpath.');
}

async function saved(page) {
  return page.evaluate(key => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, storageKey);
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert.ok(Math.max(dimensions.document, dimensions.body) <= dimensions.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
}

function inputFile(name, value) {
  return { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) };
}

async function readDownload(download) {
  const stream = await download.createReadStream();
  assert.ok(stream, 'Exported JSON can be read.');
  const buffers = [];
  for await (const chunk of stream) buffers.push(chunk);
  return JSON.parse(Buffer.concat(buffers).toString('utf8'));
}

async function mainFlow(page) {
  await goto(page);
  await page.evaluate(() => document.fonts.ready);
  const loadedFonts = await page.evaluate(() => [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family));
  assert.ok(loadedFonts.includes('Inter') && loadedFonts.includes('Noto Sans JP'), 'Both self-hosted fonts load under the site CSP.');
  assert.match(await page.locator('h1').textContent(), /毎日のごはん/);
  assert.equal(await page.locator('.overview .stat').count(), 3);
  await noOverflow(page, 'Desktop home');

  await goto(page, 'recipes/');
  assert.equal(await page.locator('#recipe-grid .recipe-card').count(), 60);
  await page.locator('[data-filter="time"]').selectOption('30');
  assert.equal(await page.locator('#recipe-grid .recipe-card').count(), within30);
  await page.locator('#search').fill('うどん');
  const filteredCount = await page.locator('#recipe-grid .recipe-card').count();
  assert.ok(filteredCount > 0 && filteredCount < within30);
  assert.ok((await page.locator('#recipe-grid h3').allTextContents()).every(title => title.includes('うどん')));
  await page.locator('#search').fill('該当しないテスト料理名');
  assert.equal(await page.locator('#recipe-grid .recipe-card').count(), 0);
  assert.match(await page.locator('#recipe-grid').textContent(), /該当する料理がありません/);
  await page.locator('[data-action="clear-filter"]').click();
  assert.equal(await page.locator('#recipe-grid .recipe-card').count(), 60);
  await noOverflow(page, 'Desktop recipe catalogue');
  console.log('PASS: subpath navigation and 60-dish filters/search');

  await page.locator('.recipe-card a[href$="/recipes/dish-01/"]').click();
  await page.waitForURL(new URL('recipes/dish-01/', base).href);
  await page.locator('#record-form').waitFor();
  assert.match(await page.locator('h1').textContent(), /卵チャーハン/);
  assert.match(await page.locator('.review-status').textContent(), /公開情報と照合しました/);
  await page.locator('.review-status a').click();
  assert.match(page.url(), /#source-review$/);
  await page.locator('#source-review details summary').click();
  assert.equal(await page.locator('#source-review details').getAttribute('open'), '');
  assert.match(await page.locator('#source-review').textContent(), /実際の調理、味、加熱結果、所要時間は未検証/);
  assert.ok(await page.locator('#source-review a[href^="https://"]').count() >= 2);
  await page.locator('#servings').selectOption('2');
  assert.match(await page.locator('.ingredient-list li').filter({ hasText: 'ご飯' }).locator('strong').textContent(), /^400g$/);
  assert.equal(await page.locator('[data-action="mastered"]').isDisabled(), true);
  await page.locator('#record-form input[name="date"]').fill('2026-10-17');
  await page.locator('#record-form button').click();
  await page.locator('#record-form input[name="date"]').fill('2026-10-17');
  await page.locator('#record-form button').click();
  assert.equal(await page.locator('.date-chip').count(), 1, 'Cooking twice on one date creates one date entry.');
  await page.locator('[data-action="mastered"]').check();
  await page.locator('#note').fill('火を少し弱めて仕上げる。');
  await page.locator('#note-form button').click();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-action="mastered"]').isChecked(), true);
  assert.equal(await page.locator('#note').inputValue(), '火を少し弱めて仕上げる。');
  assert.equal(await page.locator('#servings').inputValue(), '2');
  assert.equal(await page.locator('.date-chip').count(), 1);
  await noOverflow(page, 'Desktop recipe details');
  console.log('PASS: servings, cooking record, self-assessed mastery, and reload persistence');

  await goto(page, 'plan/');
  await page.locator('[data-action="slot-mode"][data-key="day-1-lunch"]').selectOption('hold');
  const beforeSwap = await saved(page);
  await page.getByText('献立の順番を入れ替える', { exact: true }).click();
  await page.locator('#swap-form [name="first"]').selectOption('day-1-lunch');
  await page.locator('#swap-form [name="second"]').selectOption('day-30-dinner');
  await page.locator('#swap-form button.primary').click();
  const afterSwap = await saved(page);
  assert.equal(new Set(afterSwap.slots.map(slot => slot.recipeId)).size, 60);
  assert.deepEqual(afterSwap.slots.map(slot => slot.recipeId).sort(), beforeSwap.slots.map(slot => slot.recipeId).sort());
  assert.equal(afterSwap.slots.find(slot => slot.key === 'day-1-lunch').recipeId, beforeSwap.slots.find(slot => slot.key === 'day-30-dinner').recipeId);
  assert.equal(afterSwap.slots.find(slot => slot.key === 'day-1-lunch').mode, 'hold');
  await noOverflow(page, 'Desktop monthly plan');
  console.log('PASS: swapping keeps 60 unique recipes and leaves hold settings on their slots');

  await goto(page, 'shopping/');
  await page.locator('[data-action="from-day"]').selectOption('1');
  await page.locator('[data-action="to-day"]').selectOption('1');
  await page.locator('[data-action="servings"]').selectOption('1');
  const riceRow = () => page.locator('.shopping-row').filter({ has: page.locator('.item-name > strong', { hasText: /^ご飯$/ }) });
  assert.equal(await riceRow().count(), 1);
  assert.match(await riceRow().locator('.amount').textContent(), /^150g$/);
  await riceRow().locator('[data-kind="bought"]').check();
  assert.equal(await riceRow().locator('[data-kind="bought"]').isChecked(), true);
  await page.locator('[data-action="servings"]').selectOption('2');
  assert.match(await riceRow().locator('.amount').textContent(), /^300g$/);
  assert.equal(await riceRow().locator('[data-kind="bought"]').isChecked(), false);
  assert.match(await riceRow().locator('.review-tag').textContent(), /再確認/);
  await riceRow().locator('[data-kind="bought"]').check();
  assert.equal(await riceRow().locator('.review-tag').count(), 0);
  assert.equal(await riceRow().locator('[data-kind="bought"]').isChecked(), true);
  await page.locator('[data-action="from-day"]').selectOption('2');
  assert.equal(await riceRow().locator('[data-kind="bought"]').isChecked(), false, 'A different purchase period must be checked again.');
  assert.match(await riceRow().locator('.review-tag').textContent(), /再確認/);
  await noOverflow(page, 'Desktop shopping list');
  console.log('PASS: shopping quantities and rechecking after an increase');

  await goto(page, 'progress/');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^cooking60-records-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = await readDownload(download);
  const beforeImport = await saved(page);
  assert.deepEqual(exported, beforeImport);
  await page.locator('#import-file').setInputFiles(inputFile('invalid.json', { ...exported, schemaVersion: 999 }));
  await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('変更できませんでした'));
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.deepEqual(await saved(page), beforeImport, 'Invalid imports preserve current records.');
  const incoming = structuredClone(exported);
  incoming.servings = 3;
  incoming.progress['dish-01'].note = 'バックアップ復元の確認';
  await page.locator('#import-file').setInputFiles(inputFile('restore.json', incoming));
  await page.locator('dialog[open]').waitFor();
  assert.match(await page.locator('dialog').textContent(), /作った料理 1品、再現できる 1品/);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'dialog-cancel');
  await page.keyboard.press('Escape');
  await page.locator('dialog').waitFor({ state: 'detached' });
  assert.deepEqual(await saved(page), beforeImport, 'Canceling an import preserves current records.');
  await page.locator('#import-file').setInputFiles([]);
  await page.locator('#import-file').setInputFiles(inputFile('restore-again.json', incoming));
  await page.locator('dialog[open]').waitFor();
  await page.locator('#dialog-confirm').click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).servings === 3, storageKey);
  assert.deepEqual(await saved(page), incoming);
  await noOverflow(page, 'Desktop progress');
  console.log('PASS: JSON export, invalid import protection, cancellation, and confirmed restore');
}

async function exceptionalContexts() {
  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJsPage = watch(await noJsContext.newPage(), 'JavaScript disabled');
  await goto(noJsPage, 'recipes/dish-01/');
  assert.match(await noJsPage.locator('h1').textContent(), /卵チャーハン/);
  assert.ok(await noJsPage.locator('.ingredient-list li').count() > 0);
  assert.ok(await noJsPage.locator('.steps li').count() >= 3);
  assert.match(await noJsPage.locator('#app').textContent(), /未試作/);
  await noOverflow(noJsPage, 'Static recipe at 390px');
  await noJsContext.close();
  console.log('PASS: complete static recipe with JavaScript disabled');

  const deniedContext = await browser.newContext();
  await deniedContext.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Test: storage denied', 'SecurityError'); } });
  });
  const deniedPage = watch(await deniedContext.newPage(), 'Storage denied');
  await goto(deniedPage, 'recipes/dish-01/');
  assert.match(await deniedPage.locator('#app-alert').textContent(), /保存領域を読み込めません/);
  await deniedPage.locator('#record-form button').click();
  assert.equal(await deniedPage.locator('.date-chip').count(), 1, 'Temporary records work when storage is denied.');
  const temporaryDownload = deniedPage.waitForEvent('download');
  await deniedPage.locator('#app-alert [data-action="export"]').click();
  const temporaryState = await readDownload(await temporaryDownload);
  assert.equal(temporaryState.progress['dish-01'].dates.length, 1, 'The current unsaved record can be exported without leaving this page.');
  deniedPage.on('dialog', dialog => dialog.accept());
  await deniedPage.reload({ waitUntil: 'networkidle' });
  assert.equal(await deniedPage.locator('.date-chip').count(), 0);
  await deniedContext.close();
  console.log('PASS: denied browser storage gives a warning and keeps the app usable');

  const futureContext = await browser.newContext();
  const futureRaw = JSON.stringify({ schemaVersion: 999, marker: 'Future data must survive without modification.' });
  await futureContext.addInitScript(({ key, raw }) => {
    localStorage.setItem(key, raw);
    localStorage.setItem('unrelated-app-test', 'keep');
  }, { key: storageKey, raw: futureRaw });
  const futurePage = watch(await futureContext.newPage(), 'Future storage schema');
  await goto(futurePage, 'recipes/dish-01/');
  assert.match(await futurePage.locator('#app-alert').textContent(), /新しい形式.*上書きを停止/);
  const rawDownloadPromise=futurePage.waitForEvent('download');
  await futurePage.locator('[data-action="export-original"]').click();
  assert.deepEqual(await readDownload(await rawDownloadPromise),JSON.parse(futureRaw),'Protected original data can be exported unchanged.');
  await futurePage.locator('#record-form button').click();
  assert.equal(await futurePage.locator('.date-chip').count(), 1);
  const retained = await futurePage.evaluate(key => ({ raw: localStorage.getItem(key), other: localStorage.getItem('unrelated-app-test') }), storageKey);
  assert.equal(retained.raw, futureRaw, 'Editing the temporary state never overwrites future-format storage.');
  assert.equal(retained.other, 'keep');
  await futureContext.close();
  console.log('PASS: future-format data and unrelated app storage remain intact');
}

async function printChecks(page){
  await page.setViewportSize({width:794,height:1123});await page.emulateMedia({media:'print'});
  for(const path of ['recipes/dish-01/','plan/','shopping/']){await goto(page,path);assert.equal(await page.locator('.site-header').isVisible(),false);assert.equal(await page.locator('h1').isVisible(),true);await noOverflow(page,'Print '+path);await page.pdf({path:resolve(qa,'print-'+(path.startsWith('recipes')?'recipe':path.split('/')[0])+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});}
  await goto(page,'recipes/dish-01/');await page.screenshot({path:resolve(qa,'print-recipe.png'),fullPage:true});await page.emulateMedia({media:'screen'});console.log('PASS: recipe, plan, and shopping print CSS; keyboard dialog cancellation');
}

async function responsiveScreenshots(page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(page);
  await noOverflow(page, '1440px home');
  await page.screenshot({ path: resolve(qa, 'desktop-home.png'), fullPage: true });
  const paths = ['', 'recipes/', 'recipes/dish-01/', 'plan/', 'shopping/', 'progress/', 'guide/', 'about/'];
  for (const width of [390, 320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 740 });
    for (const path of paths) {
      await goto(page, path);
      await noOverflow(page, `${width}px ${path || 'home'}`);
      if (!path) await page.screenshot({ path: resolve(qa, `mobile-${width}-home.png`), fullPage: true });
      if (path === 'recipes/dish-01/' && width === 390) await page.screenshot({ path: resolve(qa, 'mobile-390-recipe.png'), fullPage: true });
      if (path === 'shopping/' && width === 320) await page.screenshot({ path: resolve(qa, 'mobile-320-shopping.png'), fullPage: true });
    }
  }
  console.log('PASS: 1440/1280/768/390/360/320px layouts; screenshots saved in .qa/');
}

(async () => {
  await mkdir(qa, { recursive: true });
  try {
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    mainPage = watch(await context.newPage(), 'Main flow');
    if(process.env.PRINT_ONLY!=='1'){
      await mainFlow(mainPage);
      await exceptionalContexts();
      await responsiveScreenshots(mainPage);
    }
    await printChecks(mainPage);
    console.log('Chrome version: '+browser.version());
    assert.deepEqual([...new Set(errors)], [], 'No page, console, or request errors should occur.');
    assert.equal(externalRequests.size,0,'The site sends no external network requests.');
    console.log('Browser checks passed. No external network requests.');
  } catch (error) {
    if (mainPage && !mainPage.isClosed()) await mainPage.screenshot({ path: resolve(qa, 'failure.png'), fullPage: true }).catch(() => {});
    if (errors.length) console.error('Browser errors:', [...new Set(errors)]);
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
