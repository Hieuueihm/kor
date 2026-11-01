import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const env = { ...process.env, HARU_TEST_DATA: await mkdtemp(path.join(tmpdir(), 'haru-visibility-')) }; delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
await mkdir('test-results', { recursive: true });
try {
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Tự sang câu khi đúng' }).uncheck();
  const hidden = '안녕하세요';
  const assertHidden = async () => {
    await expect(page.locator('.word-chips')).not.toContainText(hidden);
    await expect(page.locator('.korean-sentence')).not.toContainText(hidden);
    await expect(page.locator('.word-chips [aria-label="Từ cần điền đang ẩn"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: `Lưu từ ${hidden}`, exact: true })).toHaveCount(0);
  };
  await assertHidden();
  // Opening a known word must not leak the missing answer in its context preview.
  await page.getByRole('button', { name: 'Lưu từ 만나서', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm vào sổ', exact: true }).click();
  await expect(page.locator('.context-preview')).not.toContainText(hidden);
  await expect(page.locator('.context-preview')).toContainText('______');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByRole('textbox', { name: 'Từ còn thiếu' }).fill('틀림');
  await page.getByRole('button', { name: 'Kiểm tra đáp án' }).click();
  await assertHidden();
  // The explicit reveal makes the missing word available to add directly in the sentence.
  await page.getByRole('button', { name: 'Xem đáp án', exact: true }).click();
  await expect(page.getByRole('button', { name: `Lưu từ ${hidden}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Lưu từ ${hidden}`, exact: true }).click();
  await page.getByRole('button', { name: 'Thêm vào sổ', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Từ hoặc cụm từ tiếng Hàn' })).toHaveValue(hidden);
  await page.getByRole('textbox', { name: 'Nghĩa tiếng Việt' }).fill('Xin chào');
  await page.getByRole('button', { name: 'Lưu từ mới' }).click();
  // Revisiting the cue starts a new exercise; even the saved list must mask the target.
  await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await page.getByRole('button', { name: 'Câu trước', exact: true }).click();
  await assertHidden();
  await expect(page.locator('.vocab-card')).not.toContainText(hidden);
  await page.getByRole('textbox', { name: 'Từ còn thiếu' }).fill(hidden);
  await page.getByRole('button', { name: 'Kiểm tra đáp án' }).click();
  await expect(page.getByRole('button', { name: `Lưu từ ${hidden}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
  await page.getByRole('button', { name: 'Câu trước', exact: true }).click();
  await assertHidden();
  await page.screenshot({ path: 'test-results/haru-hidden-answers.png', fullPage: true });
  console.log('PASS: no answer leaks in chips, sentence, context dialog or saved words; reveal/correct enables inline word saving; revisiting masks again.');
} finally { await app.close(); }
