import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const userData = await mkdtemp(path.join(tmpdir(), 'haru-tools-'));
const env = { ...process.env, HARU_TEST_DATA: userData }; delete env.ELECTRON_RUN_AS_NODE;
const application = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
const output = path.resolve('test-results'); await mkdir(output, { recursive: true });
try {
  const page = await application.firstWindow();
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  await expect(page.locator('.sidebar-note')).toHaveCount(0);
  await page.locator('nav').getByRole('button', { name: 'Tra từ', exact: true }).click();
  await page.getByRole('textbox', { name: 'Từ cần tra', exact: true }).fill('학교');
  await page.getByRole('button', { name: 'Tra nghĩa', exact: true }).click();
  await expect(page.locator('.dictionary-result')).toContainText('Trường học', { timeout: 20000 });
  await page.getByRole('button', { name: 'Lưu từ', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nghĩa tiếng Việt' })).toHaveValue('Trường học.');
  await page.getByRole('button', { name: 'Lưu từ mới' }).click();
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await expect(page.locator('.word-table')).toContainText('학교');
  // Export enough rows to exercise multipage PDF layout without touching real user data.
  await page.evaluate(async () => {
    const state = await window.haru.load();
    const word = state.words[0];
    state.words = Array.from({ length: 35 }, (_, i) => ({ ...word, id: `export-${i}`, word: i === 0 ? '학교' : `한국어 ${i}`, meaning: i === 0 ? 'Trường học.' : 'Từ vựng tiếng Hàn — nghĩa tiếng Việt có dấu.', context: '저는 매일 한국어를 공부해요.', contextTranslation: 'Tôi học tiếng Hàn mỗi ngày.', note: i === 0 ? 'Nguồn: Wiktionary tiếng Việt · CC BY-SA' : 'Ghi chú ôn tập.' }));
    await window.haru.save(state);
  });
  await page.reload();
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await application.evaluate(({ dialog }, folder) => { dialog.showSaveDialog = async (_window, options) => ({ canceled: false, filePath: `${folder}/${options.defaultPath}` }); }, output.replaceAll('\\', '/'));
  for (const name of ['Word', 'PDF', 'Excel']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByText(new RegExp('Đã xuất 35 từ sang'))).toBeVisible({ timeout: 15000 });
    await page.locator('.toast').getByRole('button', { name: 'Đóng', exact: true }).click();
  }
  expect((await readFile(path.join(output, 'Haru-tu-vung.pdf'))).subarray(0, 5).toString()).toBe('%PDF-');
  expect((await readFile(path.join(output, 'Haru-tu-vung.docx'))).length).toBeGreaterThan(5000);
  expect((await readFile(path.join(output, 'Haru-tu-vung.xlsx'))).length).toBeGreaterThan(5000);
  // Native YouTube browser keeps remote content isolated from the app bridge.
  await page.getByRole('button', { name: 'Thư viện bài học', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm video YouTube' }).fill('한국어 일상 대화');
  const nextWindow = application.waitForEvent('window', { predicate: p => p.url().includes('youtube-search.html'), timeout: 20000 });
  await page.getByRole('button', { name: 'Tìm trên YouTube', exact: true }).click();
  const browser = await nextWindow;
  await expect(browser.getByRole('button', { name: 'Dùng video này' })).toBeVisible();
  let state;
  await expect(async () => { state = await application.evaluate(({ webContents }) => {
    const remote = webContents.getAllWebContents().find(c => c.getURL().startsWith('https://www.youtube.com/results?'));
    return remote ? { url: remote.getURL(), preload: remote.getLastWebPreferences().preload, node: remote.getLastWebPreferences().nodeIntegration } : null;
  }); expect(state?.url).toContain('search_query='); }).toPass({ timeout: 20000 });
  expect(state.node).toBe(false); expect(state.preload).toBeFalsy();
  await expect(page.locator('.busy-banner')).toHaveCount(0, { timeout: 30000 });
  await application.evaluate(async ({ webContents }) => {
    const remote = webContents.getAllWebContents().find(c => c.getURL().startsWith('https://www.youtube.com/results?'));
    try { await remote.loadURL('https://www.youtube.com/watch?v=WaBNd5Jh4fQ'); } catch (error) { if (error.code !== 'ERR_ABORTED' && error.errno !== -3) throw error; }
  });
  await expect(browser.getByRole('button', { name: 'Dùng video này' })).toBeEnabled({ timeout: 20000 });
  await browser.getByRole('button', { name: 'Dùng video này' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Đường dẫn video' })).toHaveValue('https://www.youtube.com/watch?v=WaBNd5Jh4fQ');
  await page.getByRole('button', { name: 'Để sau', exact: true }).click();
  await page.screenshot({ path: path.join(output, 'haru-v02-tools.png'), fullPage: true });
  console.log('PASS: live Korean–Vietnamese dictionary, save found word, Word/PDF/Excel native exports, isolated YouTube search and video selection.');
} catch (error) {
  const page = await application.firstWindow(); await page.screenshot({ path: path.join(output, 'haru-tools-failure.png'), fullPage: true }); throw error;
} finally { await application.close(); }
