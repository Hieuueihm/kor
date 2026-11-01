import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exercise, normalize } from '../shared/core.mjs';
const env = { ...process.env, HARU_TEST_DATA: await mkdtemp(path.join(tmpdir(), 'haru-youtube-')) };
delete env.ELECTRON_RUN_AS_NODE;
const application = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
try {
  const page = await application.firstWindow();
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm bài học', exact: true }).click();
  await page.getByRole('textbox', { name: 'Đường dẫn video' }).fill('https://www.youtube.com/watch?v=WaBNd5Jh4fQ');
  await page.getByRole('button', { name: 'Tạo bài học', exact: true }).click();
  await expect(page.locator('iframe')).toBeVisible({ timeout: 35000 });
  await expect(page.locator('.lesson-bar-title')).toContainText('câu luyện tập');
  const frame = page.locator('iframe').contentFrame();
  await expect(frame.locator('#movie_player')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.youtube-player')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await page.getByRole('button', { name: 'Nghe lại câu này', exact: true }).click();
  await expect(async () => {
    const state = await frame.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    expect(state.time).toBeGreaterThanOrEqual(3);
    expect(state.paused).toBe(false);
  }).toPass({ timeout: 20000 });
  const lesson = await page.evaluate(async () => (await window.haru.load()).lessons[0]);
  await expect(page.getByText('Đang chờ đáp án', { exact: true })).toBeVisible({ timeout: 12000 });
  await expect(async () => expect(await frame.locator('video').evaluate(video => video.paused)).toBe(true)).toPass({ timeout: 3000 });
  const firstQuestion = exercise(lesson.segments[0].text);
  await page.getByRole('textbox', { name: 'Từ còn thiếu' }).fill(normalize(firstQuestion.blanks[0].word));
  await page.getByRole('textbox', { name: 'Từ còn thiếu' }).press('Enter');
  await expect(page.locator('.exercise-meta')).toContainText('CÂU 02', { timeout: 5000 });
  await expect(async () => {
    const state = await frame.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    expect(state.time).toBeGreaterThanOrEqual(lesson.segments[1].offset - 0.15); expect(state.paused).toBe(false);
  }).toPass({ timeout: 7000 });
  await page.getByRole('checkbox', { name: 'Dừng cuối câu để điền' }).uncheck();
  const target = Math.min(20, lesson.segments.length - 1);
  const jump = lesson.segments[target].offset + 0.2;
  await frame.locator('video').evaluate((video, time) => { video.currentTime = time; }, jump);
  await expect(page.locator('.exercise-meta')).toContainText(`CÂU ${String(target + 1).padStart(2, '0')}`, { timeout: 5000 });
  await expect(async () => expect(await page.locator('.live-subtitle-list').evaluate(list => list.scrollTop)).toBeGreaterThan(100)).toPass({ timeout: 3000 });
  // Native timeline scrub backwards keeps the form and highlighted subtitle in sync.
  await frame.locator('video').evaluate(video => { video.currentTime = 3.1; video.pause(); });
  await expect(page.locator('.exercise-meta')).toContainText('CÂU 01', { timeout: 5000 });
  await expect(page.locator('.live-subtitle-row[aria-current="true"] strong')).not.toContainText(normalize(firstQuestion.blanks[0].word));
  await expect(async () => expect(await page.locator('.live-subtitle-list').evaluate(list => list.scrollTop)).toBeLessThan(2)).toPass({ timeout: 3000 });
  await mkdir('test-results', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/haru-youtube.png', fullPage: true });
  console.log('PASS: live YouTube import/playback, pause at cue end, correct answer auto-advances and resumes, forward/backward native scrubbing synchronizes and scrolls subtitles.');
} catch (error) {
  const page = await application.firstWindow();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/haru-youtube-failure.png', fullPage: true });
  throw error;
} finally { await application.close(); }

