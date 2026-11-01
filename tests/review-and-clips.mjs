import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initialState, DAY } from '../shared/core.mjs';

const folder = await mkdtemp(path.join(tmpdir(), 'haru-review-clips-'));
const state = initialState();
state.lessons = [{ id: 'clip-lesson', videoId: 'WaBNd5Jh4fQ', title: 'Bài video kiểm thử', source: 'import', author: 'Test', segments: [{ text: '저는 매일 공부해요.', translation: 'Tôi học mỗi ngày.', offset: 12.5, duration: 1.2 }] }];
const base = { offset: 0, due: Date.now() - DAY, createdAt: Date.now(), lessonId: '', lessonTitle: '', note: '' };
state.words = [
  { ...base, id: 'study', word: '공부해요', meaning: 'học', context: '저는 매일 공부해요.', contextTranslation: 'Tôi học mỗi ngày.', lessonId: 'clip-lesson', lessonTitle: 'Bài video kiểm thử', offset: 12.5, level: 2 },
  { ...base, id: 'rice', word: '밥', meaning: 'cơm', context: '밥을 먹어요. 밥이 맛있어요.', level: 4 },
  { ...base, id: 'listen', word: '듣다', meaning: 'nghe', context: '음악을 들어요.', level: 0 },
  { ...base, id: 'apple', word: '사과', meaning: 'táo', context: '', level: 1 }
];
await writeFile(path.join(folder, 'learning.json'), JSON.stringify(state));
const env = { ...process.env, HARU_TEST_DATA: folder }; delete env.ELECTRON_RUN_AS_NODE;
let app;
const launch = async () => {
  app = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
  const page = await app.firstWindow(); await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  return page;
};
try {
  let page = await launch();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  // A controlled IFrame API clock tests boundaries/replay without a network dependency.
  await page.addInitScript(() => {
    window.__clipTrace = [];
    window.YT = { Player: class {
      constructor(mount, options) {
        this.time = 0; this.state = -1;
        this.frame = document.createElement('iframe'); this.frame.src = 'about:blank'; mount.replaceWith(this.frame);
        this.timer = setInterval(() => { if (this.state === 1) this.time += .1; }, 100);
        setTimeout(() => options.events.onReady({ target: this }), 0);
      }
      getIframe() { return this.frame; }
      getCurrentTime() { return this.time; }
      getPlayerState() { return this.state; }
      seekTo(time) { this.time = time; window.__clipTrace.push({ action: 'seek', time }); }
      playVideo() { this.state = 1; window.__clipTrace.push({ action: 'play', time: this.time }); }
      pauseVideo() { this.state = 2; window.__clipTrace.push({ action: 'pause', time: this.time }); }
      destroy() { clearInterval(this.timer); this.frame.remove(); }
    } };
  });
  await page.reload(); await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  // Startup upgrades legacy words, then the lesson can be deleted without losing its clip.
  await expect.poll(() => page.evaluate(async () => (await window.haru.load()).words[0].videoId)).toBe('WaBNd5Jh4fQ');
  await page.getByRole('button', { name: 'Thư viện bài học', exact: true }).click();
  await page.getByRole('button', { name: 'Xóa bài Bài video kiểm thử' }).click();
  await page.getByRole('button', { name: 'Xóa bài học', exact: true }).click();
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await page.getByRole('button', { name: 'Nghe trong video', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nghe trong video' });
  await expect(dialog.getByText('저는 매일 공부해요.', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__clipTrace.some(event => event.action === 'pause' && event.time >= 13.7 && event.time < 14))).toBe(true);
  await dialog.getByRole('button', { name: 'Nghe lại đoạn này' }).click();
  await expect.poll(() => page.evaluate(() => window.__clipTrace.filter(event => event.action === 'seek' && event.time === 12.5).length)).toBe(2);
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ôn tập', exact: true }).click();
  const sentence = page.locator('.review-sentence');
  await expect(sentence).not.toContainText('공부해요');
  await expect(page.getByRole('button', { name: 'Nghe phát âm', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Từ cần ôn 1', exact: true }).fill('공부해요');
  await page.getByRole('button', { name: 'Nghe trong video', exact: true }).click();
  await expect(dialog).not.toContainText('공부해요');
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Từ cần ôn 1', exact: true })).toHaveValue('공부해요');
  const beforeCorrect = Date.now();
  await page.getByRole('textbox', { name: 'Từ cần ôn 1', exact: true }).press('Enter');
  await expect(page.getByText('Chính xác! Đã giãn lịch ôn.', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => (await window.haru.load()).words[0].level)).toBe(3);
  const correct = await page.evaluate(async () => (await window.haru.load()).words[0]);
  expect(correct.due).toBeGreaterThanOrEqual(beforeCorrect + 7 * DAY); expect(correct.due).toBeLessThan(Date.now() + 7 * DAY + 1000);
  await page.getByRole('button', { name: 'Từ tiếp theo', exact: true }).click();
  await expect(sentence).not.toContainText('밥');
  await expect(page.getByRole('textbox', { name: /Từ cần ôn/ })).toHaveCount(2);
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/haru-context-review.png', fullPage: false });
  await page.getByRole('textbox', { name: 'Từ cần ôn 1', exact: true }).fill('틀림');
  await page.getByRole('textbox', { name: 'Từ cần ôn 2', exact: true }).fill('밥이');
  const beforeWrong = Date.now();
  await page.getByRole('textbox', { name: 'Từ cần ôn 2', exact: true }).press('Enter');
  await expect(page.getByText('Đã lưu để ôn lại sau 10 phút.', { exact: true })).toBeVisible();
  await expect(sentence).toHaveText('밥을 먹어요. 밥이 맛있어요.');
  await expect.poll(() => page.evaluate(async () => (await window.haru.load()).words[1].level)).toBe(0);
  const wrong = await page.evaluate(async () => (await window.haru.load()).words[1]);
  expect(wrong.due).toBeGreaterThanOrEqual(beforeWrong + 600000); expect(wrong.due).toBeLessThan(Date.now() + 601000);
  await page.getByRole('button', { name: 'Từ tiếp theo', exact: true }).click();
  await expect(page.getByText('Chưa tìm được dạng từ rõ ràng trong ví dụ. Ôn bằng lật thẻ cho từ này nhé.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /BẠN CÒN NHỚ TỪ NÀY/ }).click();
  await page.getByRole('button', { name: /Đã nhớ/ }).click();
  await page.getByRole('button', { name: 'Từ tiếp theo', exact: true }).click();
  await page.getByRole('button', { name: /BẠN CÒN NHỚ TỪ NÀY/ }).click();
  await page.getByRole('button', { name: /Chưa nhớ/ }).click();
  await page.getByRole('button', { name: 'Từ tiếp theo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hôm nay bạn đã làm rất tốt.' })).toBeVisible();
  await expect(page.getByText('4 từ đã ôn trong phiên', { exact: true })).toBeVisible();
  await expect(page.getByText('Đã lưu trên máy', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await app.close(); app = null;
  page = await launch();
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nghe trong video', exact: true })).toBeVisible();
  const persisted = JSON.parse(await readFile(path.join(folder, 'learning.json'), 'utf8'));
  expect(persisted.words[0].due).toBe(correct.due); expect(persisted.words[1].due).toBe(wrong.due); expect(persisted.lessons).toHaveLength(0);
  // Saving a brand-new word from the learning page captures its own video range.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('dictionary:lookup');
    ipcMain.handle('dictionary:lookup', (_event, word) => ({ word, definitions: ['mỗi ngày'], source: 'Test dictionary', url: 'https://example.test/' }));
  });
  await page.getByRole('button', { name: 'Thêm bài học', exact: true }).click();
  await page.getByRole('button', { name: 'Nhập phụ đề', exact: true }).click();
  await page.getByRole('textbox', { name: 'Đường dẫn video' }).fill('https://youtu.be/WaBNd5Jh4fQ');
  await page.getByRole('textbox', { name: 'Tên bài học' }).fill('Bài lưu video mới');
  await page.getByRole('textbox', { name: 'Phụ đề SRT' }).fill('1\n00:00:14,250 --> 00:00:17,750\n저는 매일 공부해요.');
  await page.getByRole('button', { name: 'Tạo bài học', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tra từ ngay trong bài', exact: true }).fill('매일');
  await page.locator('.lesson-lookup').getByRole('button', { name: 'Tra nghĩa', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu nghĩa này', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu từ mới', exact: true }).click();
  await expect.poll(() => page.evaluate(async () => (await window.haru.load()).words[0].word)).toBe('매일');
  const savedVideoWord = await page.evaluate(async () => (await window.haru.load()).words[0]);
  expect(savedVideoWord.videoId).toBe('WaBNd5Jh4fQ'); expect(savedVideoWord.offset).toBe(14.25); expect(savedVideoWord.duration).toBe(3.5);
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  const row = page.locator('.word-table-row').filter({ has: page.locator('.word-with-audio strong', { hasText: '매일' }) });
  await row.getByRole('button', { name: 'Nghe trong video', exact: true }).click();
  await app.evaluate(({ shell }) => { shell.openExternal = async url => { global.__haruOpened = url; }; });
  await page.getByRole('button', { name: 'Mở đoạn trên YouTube', exact: true }).click();
  expect(await app.evaluate(() => global.__haruOpened)).toBe('https://www.youtube.com/watch?v=WaBNd5Jh4fQ&t=14s');
  console.log('PASS: context cloze hides all answers; correct/wrong SRS; flashcard fallback; saved legacy video clip survives lesson deletion/restart; precise seek, stop, replay; no answer leak in clip dialog.');
} finally { if (app) await app.close(); }
