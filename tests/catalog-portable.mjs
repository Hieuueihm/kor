import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
const folder = await mkdtemp(path.join(tmpdir(), 'haru-two-machines-'));
const machineA = path.join(folder, 'machine-A'), machineB = path.join(folder, 'machine-B');
await mkdir(machineA); await mkdir(machineB); await mkdir('test-results', { recursive: true });
let app;
async function launch(directory, suffix) {
  const env = { ...process.env, PORTABLE_EXECUTABLE_DIR: directory, HARU_TEST_PROFILE: path.join(folder, `profile-${suffix}`) };
  delete env.HARU_TEST_DATA; delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
  const page = await app.firstWindow(); await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible(); return page;
}
try {
  let page = await launch(machineA, 'A');
  const sourceCount = await page.evaluate(async () => (await window.haru.catalog()).entryCount);
  expect(sourceCount).toBeGreaterThanOrEqual(5000);
  const info = await page.evaluate(() => window.haru.dataInfo());
  expect(info.portable).toBe(true); expect(info.root).toBe(path.join(machineA, 'HaruData'));
  await page.locator('nav').getByRole('button', { name: 'Từ vựng chủ đề', exact: true }).click();
  await expect(page.locator('.catalog-summary')).toContainText('10.051');
  const search = page.getByRole('textbox', { name: 'Tìm chủ đề từ vựng' });
  await search.fill('밥');
  const rice = page.locator('.catalog-entry').filter({ has: page.getByRole('button', { name: '밥', exact: true }) });
  await expect(rice.locator('.catalog-example')).toContainText('어머니');
  await rice.getByRole('button', { name: /Cách dùng/ }).click();
  await expect(rice.locator('.catalog-senses')).toContainText('cơm');
  await rice.getByRole('button', { name: 'Lưu từ', exact: true }).click();
  await expect.poll(() => page.evaluate(async () => (await window.haru.load()).words.some(word => word.word === '밥'))).toBe(true);
  const reviewDue = Date.now() + 7 * 86400000;
  await page.evaluate(async due => {
    const state = await window.haru.load(); state.words[0].level = 3; state.words[0].due = due; await window.haru.save(state);
  }, reviewDue);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const zipFile = path.join(folder, 'transfer.zip');
  await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }); }, zipFile);
  await page.getByRole('button', { name: 'Xuất gói chuyển máy (.zip)', exact: true }).click();
  await expect(page.getByText('Đã xuất gói chuyển máy gồm bộ từ, ví dụ và tiến độ học.')).toBeVisible({ timeout: 30000 });
  const zip = await JSZip.loadAsync(await readFile(zipFile));
  expect(Object.keys(zip.files).some(name => /translator|runtime|cache/i.test(name))).toBe(false);
  const state = JSON.parse(await zip.file('HaruData/learning.json').async('string'));
  expect(state.words[0].word).toBe('밥'); expect(state.words[0].context).toContain('어머니'); expect(state.words[0].note).toContain('NIKL'); expect(state.words[0].level).toBe(3);
  await app.close(); app = null;
  // A genuinely separate local profile simulates the new Windows machine.
  await mkdir(path.join(machineB, 'HaruData'));
  for (const name of ['learning.json', 'vocabulary.json', 'LICENSE-SOURCE.txt']) await writeFile(path.join(machineB, 'HaruData', name), await zip.file(`HaruData/${name}`).async('nodebuffer'));
  page = await launch(machineB, 'B');
  await app.evaluate(({ session }) => session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => callback({ cancel: !details.url.startsWith('http://127.0.0.1:') })));
  const restored = await page.evaluate(() => window.haru.load());
  expect(restored.words[0].word).toBe('밥'); expect(restored.words[0].level).toBe(3); expect(restored.words[0].due).toBe(reviewDue); expect(restored.words[0].examples.length).toBeGreaterThan(0);
  await page.locator('nav').getByRole('button', { name: 'Từ vựng chủ đề', exact: true }).click();
  await expect(page.locator('.catalog-summary')).toContainText('10.051');
  await page.getByRole('textbox', { name: 'Tìm chủ đề từ vựng' }).fill('밥');
  await expect(page.locator('.catalog-entry').filter({ has: page.getByRole('button', { name: '밥', exact: true }) }).getByRole('button', { name: 'Đã lưu', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'test-results/haru-catalog-portable.png', fullPage: false });
  console.log('PASS: 10,051-word offline catalog, authentic examples/usage, saved context, transfer ZIP, separate Windows profile, and unchanged review level/due after moving data.');
} finally { if (app) await app.close(); }
