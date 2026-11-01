import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const userData = await mkdtemp(path.join(tmpdir(), 'haru-smoke-'));
const env = { ...process.env, HARU_TEST_DATA: userData };
delete env.ELECTRON_RUN_AS_NODE;
await mkdir('test-results', { recursive: true });
let application;
const errors = [];
const launch = async () => {
  application = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
  const page = await application.firstWindow();
  page.on('pageerror', e => errors.push(e.message));
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  return page;
};
try {
  let page = await launch();
  await page.getByRole('checkbox', { name: 'Tự sang câu khi đúng' }).uncheck();
  // Incorrect answer, corrected answer, and saved progress.
  await page.getByRole('textbox', { name: 'Từ còn thiếu' }).fill('틀림');
  await page.getByRole('button', { name: 'Kiểm tra đáp án' }).click();
  await expect(page.getByText('Chưa đúng, thử nghe lại nhé.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Từ còn thiếu' }).fill('안녕하세요');
  await page.getByRole('button', { name: 'Kiểm tra đáp án' }).click();
  await expect(page.getByText('Chính xác! 잘했어요!')).toBeVisible();
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
  await page.getByRole('button', { name: '공부해요', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm vào sổ', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }).fill('học');
  await page.getByRole('button', { name: 'Lưu từ mới' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/haru-learn.png', fullPage: true });
  // Vocabulary and actual spaced-repetition scheduling.
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await expect(page.getByText('học', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ôn tập', exact: true }).click();
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click();
  await page.getByRole('button', { name: /BẠN CÒN NHỚ TỪ NÀY/ }).click();
  await page.getByRole('button', { name: /Đã nhớ/ }).click();
  await page.getByRole('button', { name: 'Từ tiếp theo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hôm nay bạn đã làm rất tốt.' })).toBeVisible();
  // Subtitle import with Vietnamese translation and invalid URL error.
  await page.getByRole('button', { name: 'Thêm bài học', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạo bài học', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Đường dẫn video' }).fill('https://evil.test/watch?v=abcdefghijk');
  await page.getByRole('button', { name: 'Tạo bài học', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy mã video');
  await page.getByRole('button', { name: 'Nhập phụ đề', exact: true }).click();
  await page.getByRole('textbox', { name: 'Đường dẫn video' }).fill('');
  await page.getByRole('textbox', { name: 'Tên bài học' }).fill('Quán cà phê');
  await page.getByRole('textbox', { name: 'Phụ đề SRT' }).fill('커피 한 잔 주세요. | Cho tôi một cốc cà phê.\n감사합니다. | Xin cảm ơn.');
  await page.getByRole('button', { name: 'Tạo bài học', exact: true }).click();
  await expect(page.getByText('Quán cà phê', { exact: true })).toBeVisible();
  await expect(page.getByText('Cho tôi một cốc cà phê.', { exact: true })).toBeVisible();
  // A missing API key produces a clear error, without network dependence.
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const translationError = await page.evaluate(async () => {
    try { await window.haru.translate([{ text: '안녕' }]); return ''; } catch (error) { return error.message; }
  });
  expect(translationError).toContain('Hãy thêm khóa Microsoft Translator');
  // Exercise the real main-process translator handler against a deterministic API stub.
  await page.getByRole('textbox', { name: 'Khóa API' }).fill('haru-test-secret');
  await page.getByRole('textbox', { name: 'Vùng tài nguyên' }).fill('southeastasia');
  await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
  await expect(page.getByText('Đã cấu hình khóa dịch')).toBeVisible();
  const storedSettings = await readFile(path.join(userData, 'translator.json'), 'utf8');
  expect(storedSettings).not.toContain('haru-test-secret');
  await application.evaluate(() => {
    global.__haruOriginalFetch = global.fetch;
    global.__haruTranslationCalls = [];
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      global.__haruTranslationCalls.push({ url, length: body.length, keyCorrect: options.headers['Ocp-Apim-Subscription-Key'] === 'haru-test-secret', region: options.headers['Ocp-Apim-Subscription-Region'] });
      return new Response(JSON.stringify(body.map(item => ({ translations: [{ text: 'Bản dịch thử: ' + item.Text, to: 'vi' }] }))), { status: 200 });
    };
  });
  const translated = await page.evaluate(() => window.haru.translate(Array.from({ length: 51 }, () => ({ text: '안녕하세요.', offset: 0, duration: 2 }))));
  expect(translated).toHaveLength(51);
  expect(translated[0].translation).toContain('Bản dịch thử');
  const calls = await application.evaluate(() => { global.fetch = global.__haruOriginalFetch; return global.__haruTranslationCalls; });
  expect(calls.map(c => c.length)).toEqual([50, 1]);
  expect(calls.every(c => c.keyCorrect && c.region === 'southeastasia' && c.url.includes('from=ko&to=vi'))).toBe(true);
  // Native backup dialogs are stubbed; the real export and import handlers run.
  const backupPath = path.join(userData, 'backup.json');
  await application.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, backupPath);
  await page.getByRole('button', { name: 'Xuất bản sao lưu' }).click();
  await expect(page.getByText('Đã xuất bản sao lưu.', { exact: true })).toBeVisible();
  const backup = await readFile(backupPath, 'utf8');
  expect(backup).not.toContain('haru-test-secret');
  await page.getByRole('button', { name: 'Khôi phục dữ liệu' }).click();
  await expect(page.getByRole('dialog', { name: 'Khôi phục bản sao lưu?' })).toBeVisible();
  await page.getByRole('button', { name: 'Khôi phục', exact: true }).click();
  await expect(page.getByText('Đã khôi phục dữ liệu.', { exact: true })).toBeVisible();
  // Corrupted state cannot cross the persistence bridge.
  const invalidRejected = await page.evaluate(async () => { try { await window.haru.save({ version: 1, lessons: [], words: [{}], attempts: [] }); return false; } catch { return true; } });
  expect(invalidRejected).toBe(true);
  await expect(page.getByText('Đã lưu trên máy', { exact: true })).toBeVisible();
  await application.close();
  // Restart with the same Windows data directory and verify persistence.
  page = await launch();
  await expect(page.getByRole('checkbox', { name: 'Tự sang câu khi đúng' })).not.toBeChecked();
  await expect(page.getByText('Quán cà phê', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await expect(page.getByText('học', { exact: true })).toBeVisible();
  await expect(page.getByText('Mức ghi nhớ 1/6')).toBeVisible();
  await page.screenshot({ path: 'test-results/haru-vocabulary.png', fullPage: true });
  await page.getByRole('button', { name: 'Xóa từ 공부해요' }).click();
  await page.getByRole('button', { name: 'Xóa từ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Một cuốn sổ, thật nhiều khả năng' })).toBeVisible();
  await page.getByRole('button', { name: 'Thư viện bài học', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa bài Quán cà phê' }).click();
  await page.getByRole('button', { name: 'Xóa bài học', exact: true }).click();
  await expect(page.getByText('Quán cà phê', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  await application.close(); application = null;
  const saved = JSON.parse(await readFile(path.join(userData, 'learning.json'), 'utf8'));
  expect(saved.lessons).toHaveLength(1);
  expect(saved.words).toHaveLength(0);
  expect(saved.attempts.filter(x => x.correct)).toHaveLength(1);
  console.log('PASS: answer grading, vocabulary, review scheduling, import, validation, encrypted credentials, batched translation (stub API), backup roundtrip, restart persistence, deletion, no renderer errors.');
  console.log(`Screenshots: ${path.resolve('test-results')}`);
} finally { if (application) await application.close(); }

