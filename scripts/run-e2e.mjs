import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_DIST = path.join(ROOT_DIR, 'dist', 'chrome');

function findPlaywrightChromiumBinary() {
  const defaultPath = chromium.executablePath();
  if (defaultPath && fs.existsSync(defaultPath)) return defaultPath;

  const cacheRoots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'ms-playwright')
      : null,
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    path.join(os.homedir(), '.cache', 'ms-playwright'),
  ].filter(Boolean);

  for (const root of cacheRoots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs
      .readdirSync(root)
      .filter((d) => d.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const dir of dirs) {
      const candidates = [
        path.join(root, dir, 'chrome-win64', 'chrome.exe'),
        path.join(root, dir, 'chrome-win', 'chrome.exe'),
        path.join(root, dir, 'chrome-linux', 'chrome'),
        path.join(root, dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        path.join(root, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

function toBase64Url(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function startLocalTestServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/set-cookie') {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': ['site_boot=init_123; Path=/; SameSite=Lax'],
        });
        res.end('<h1>Cookira E2E Test Site</h1>');
        return;
      }
      if (req.url === '/echo-cookies') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ cookieHeader: req.headers.cookie || '' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Cookira Home</h1>');
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

async function runE2E() {
  if (!fs.existsSync(path.join(CHROME_DIST, 'manifest.json'))) {
    throw new Error('dist/chrome/manifest.json missing. Run npm run build first.');
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cookira-e2e-'));
  const userDataDir = path.join(tmpRoot, 'profile');
  const fixturesDir = path.join(tmpRoot, 'fixtures');
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(fixturesDir, { recursive: true });

  const { server, port } = await startLocalTestServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  const executablePath = findPlaywrightChromiumBinary();
  const consoleErrors = [];
  const pageErrors = [];
  let context;

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      executablePath,
      args: [
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--disable-extensions-except=${CHROME_DIST}`,
        `--load-extension=${CHROME_DIST}`,
      ],
    });

    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    const extensionId = new URL(serviceWorker.url()).host;
    console.log(`[E2E] Loaded extension ${extensionId}`);

    const sitePage = await context.newPage();
    await sitePage.goto(`${baseUrl}/set-cookie`, { waitUntil: 'domcontentloaded' });

    const dashPage = await context.newPage();
    dashPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    dashPage.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await dashPage.goto(`chrome-extension://${extensionId}/dashboard.html`, {
      waitUntil: 'networkidle',
    });

    // 1. Verify Dark/Light automatic synchronization with browser color scheme
    await dashPage.emulateMedia({ colorScheme: 'light' });
    await dashPage.waitForTimeout(300);
    const lightTheme = await dashPage.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.equal(lightTheme, 'light', 'Expected extension to follow browser Light mode');

    await dashPage.emulateMedia({ colorScheme: 'dark' });
    await dashPage.waitForTimeout(300);
    const darkTheme = await dashPage.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.equal(darkTheme, 'dark', 'Expected extension to follow browser Dark mode');
    console.log('[E2E] Verified automatic browser Light/Dark synchronization');

    // 2. Verify popup.html & sidepanel.html load cleanly with 0 errors
    const popupPage = await context.newPage();
    popupPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`popup: ${msg.text()}`);
    });
    popupPage.on('pageerror', (err) => pageErrors.push(`popup: ${err.message}`));
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'networkidle' });
    await popupPage.getByText('COOKIRA').waitFor({ state: 'visible' });
    await popupPage.close();

    const sidePage = await context.newPage();
    await sidePage.setViewportSize({ width: 400, height: 600 });
    sidePage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`sidepanel: ${msg.text()}`);
    });
    sidePage.on('pageerror', (err) => pageErrors.push(`sidepanel: ${err.message}`));
    await sidePage.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'networkidle' });
    await sidePage.getByText('COOKIRA').waitFor({ state: 'visible' });

    // Verify narrow Side Panel starts in Simple mode and + Add opens editor at TOP of viewport immediately
    await sidePage.getByRole('button', { name: 'Add' }).click();
    const newHeading = sidePage.getByText('New Cookie');
    await newHeading.waitFor({ state: 'visible' });
    const box = await newHeading.boundingBox();
    assert.ok(box && box.y < 180, `Expected New Cookie editor at top of narrow Side Panel, got y=${box?.y}`);
    assert.equal(await sidePage.getByText('Cookie name is required.').count(), 0, 'Do not show premature error before typing');
    await sidePage.getByRole('button', { name: 'List' }).click();
    await sidePage.close();
    console.log('[E2E] Verified Simple mode & narrow Side Panel top-mounted Add/Edit navigation');

    // Switch dashPage to Advanced mode for full developer/QA tool verification
    await dashPage.getByRole('button', { name: 'Advanced' }).click();

    // 3. Select 127.0.0.1 domain and verify site_boot cookie is visible
    await dashPage.getByLabel('Target domain scope').selectOption('127.0.0.1');
    await dashPage.getByText('site_boot').waitFor({ state: 'visible' });

    // 4. Create new JWT cookie & verify Smart Value Inspector + validation
    await dashPage.getByRole('button', { name: 'Add' }).click();
    const jwtSample = `${toBase64Url('{"alg":"HS256","typ":"JWT"}')}.${toBase64Url('{"sub":"e2e_tester","role":"qa"}')}.sig_ok`;

    const secureCheckbox = dashPage.locator('label', { hasText: 'Secure' }).locator('input[type="checkbox"]');
    if (await secureCheckbox.isChecked()) await secureCheckbox.uncheck();

    await dashPage.getByPlaceholder('session_token').fill('__Host-invalid');
    await dashPage.getByText('Cookies prefixed with "__Host-" must have Secure enabled.').waitFor({ state: 'visible' });

    await dashPage.getByPlaceholder('session_token').fill('cookira_e2e_jwt');
    await dashPage.getByPlaceholder('Cookie payload...').fill(jwtSample);
    await dashPage.getByText('JWT (Read-Only Decoded)').waitFor({ state: 'visible' });
    await dashPage.getByText('"sub": "e2e_tester"').waitFor({ state: 'visible' });

    await dashPage.getByRole('button', { name: 'Create Cookie' }).click();
    await dashPage.getByText('Saved cookie "cookira_e2e_jwt"').waitFor({ state: 'visible' });

    // Confirm browser actually sends the newly created cookie to sitePage!
    const echoRes1 = await sitePage.evaluate(async () => {
      const r = await fetch('/echo-cookies');
      return r.json();
    });
    assert.ok(echoRes1.cookieHeader.includes('cookira_e2e_jwt='), 'Real browser should send created cookie');
    console.log('[E2E] Verified Cookie Create, JWT Inspector, and __Host- validation');

    // 5. File Upload Import (Invalid file -> Valid Playwright JSON file)
    const invalidFile = path.join(fixturesDir, 'corrupt.json');
    fs.writeFileSync(invalidFile, '{invalid-json', 'utf8');
    const validImportFile = path.join(fixturesDir, 'sample.cookies.json');
    fs.writeFileSync(
      validImportFile,
      JSON.stringify([
        {
          name: 'imported_pw',
          value: 'val_999',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ]),
      'utf8',
    );

    await dashPage.getByRole('button', { name: 'Import' }).click();
    const importDialog = dashPage.getByRole('dialog', { name: 'Export and Import Cookies' });
    await importDialog.getByText(/overwrite active website sessions/i).waitFor({ state: 'visible' });
    const fileInput = importDialog.locator('input[type="file"]');

    await fileInput.setInputFiles(invalidFile);
    await importDialog.getByText(/Unrecognized cookie format/i).waitFor({ state: 'visible' });

    await fileInput.setInputFiles(validImportFile);
    await importDialog.getByText('+1 New').waitFor({ state: 'visible' });
    await importDialog.getByRole('button', { name: 'Import 1 Cookies' }).click();
    await dashPage.getByText('Imported 1 cookies').waitFor({ state: 'visible' });

    const echoRes2 = await sitePage.evaluate(async () => {
      const r = await fetch('/echo-cookies');
      return r.json();
    });
    assert.ok(echoRes2.cookieHeader.includes('imported_pw=val_999'), 'Imported cookie must be active in browser');
    console.log('[E2E] Verified file upload import (invalid + valid Playwright JSON)');

    // 6. Encrypted Export download & wrong/right passphrase decryption
    await dashPage.getByRole('button', { name: 'Export' }).click();
    const exportDialog = dashPage.getByRole('dialog', { name: 'Export and Import Cookies' });
    await exportDialog.getByText(/hijack your account/i).waitFor({ state: 'visible' });
    await exportDialog.locator('select').first().selectOption('encrypted');
    await exportDialog.getByText(/AES-256-GCM/i).first().waitFor({ state: 'visible' });
    await exportDialog.getByPlaceholder('Min. 4 characters (never stored)').fill('nrtx-vault-e2e');
    const [download] = await Promise.all([
      dashPage.waitForEvent('download'),
      exportDialog.getByRole('button', { name: 'Download' }).click(),
    ]);
    const encPath = path.join(fixturesDir, download.suggestedFilename());
    await download.saveAs(encPath);
    const encContent = fs.readFileSync(encPath, 'utf8');
    assert.ok(encContent.includes('"cookira-vault"'));
    assert.ok(!encContent.includes('val_999'), 'Encrypted vault must not contain plaintext cookie values');

    await exportDialog.getByRole('button', { name: 'Import Cookies' }).click();
    await exportDialog.locator('input[type="file"]').setInputFiles(encPath);
    await exportDialog.getByPlaceholder('Enter passphrase to decrypt').fill('wrong-pass');
    await exportDialog.getByRole('button', { name: 'Decrypt' }).click();
    await exportDialog.getByText('Wrong passphrase or corrupted encrypted vault.').waitFor({ state: 'visible' });

    await exportDialog.getByPlaceholder('Enter passphrase to decrypt').fill('nrtx-vault-e2e');
    await exportDialog.getByRole('button', { name: 'Decrypt' }).click();
    await exportDialog.getByText('Pre-Import Diff').waitFor({ state: 'visible' });
    await exportDialog.getByRole('button', { name: 'Close modal' }).click();
    console.log('[E2E] Verified AES-256-GCM encrypted export/download/decrypt flow');

    // 7. Account Profiles + Delete + Undo + Domain Lock + Live Watcher + Settings
    await dashPage.getByRole('button', { name: /Save Profile|Profiles/ }).click();
    const profDialog = dashPage.getByRole('dialog', { name: 'Session Profiles' });
    await profDialog.getByPlaceholder(/Save 127.0.0.1/).fill('@e2e_main');
    await profDialog.getByRole('button', { name: 'Save Snapshot' }).click();
    await profDialog.getByText('@e2e_main').waitFor({ state: 'visible' });
    await profDialog.getByRole('button', { name: 'Close profiles modal' }).click();

    await dashPage.getByRole('button', { name: 'Delete imported_pw' }).click();
    await dashPage.getByText('Deleted "imported_pw"').waitFor({ state: 'visible' });
    await dashPage.getByRole('button', { name: 'Undo' }).click();
    await dashPage.getByRole('button', { name: 'Inspect imported_pw' }).waitFor({ state: 'visible' });

    await dashPage.getByRole('button', { name: 'Save Profile' }).or(dashPage.getByRole('button', { name: /Profiles/ })).click();
    await profDialog.getByRole('button', { name: 'Switch' }).click();
    await dashPage.getByText(/Switched to "@e2e_main"/).waitFor({ state: 'visible' });

    await dashPage.getByRole('button', { name: 'Lock', exact: true }).click();
    assert.equal(await dashPage.getByRole('button', { name: 'Add' }).isDisabled(), true);
    await dashPage.getByRole('button', { name: 'Locked', exact: true }).click();

    await dashPage.getByRole('button', { name: /Live Watcher/ }).click();
    await dashPage.getByText('Live Cookie Watcher').waitFor({ state: 'visible' });

    await dashPage.getByRole('button', { name: 'Open Settings' }).click();
    const settingsDialog = dashPage.getByRole('dialog', { name: 'Cookira Settings' });
    await settingsDialog.getByRole('button', { name: 'Dry-Run' }).click();
    await settingsDialog.getByText(/Dry-Run Preview:/).waitFor({ state: 'visible' });
    await settingsDialog.getByRole('button', { name: 'Done' }).click();

    assert.equal(consoleErrors.length, 0, `Console errors observed: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Uncaught page errors observed: ${pageErrors.join('; ')}`);
    console.log('[E2E] ALL real Chromium extension checks PASSED with 0 console/page errors!');
  } finally {
    if (context) await context.close();
    server.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runE2E().catch((err) => {
  console.error('[E2E FAILED]', err);
  process.exit(1);
});
