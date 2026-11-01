import { _electron as electron, expect } from '@playwright/test';
import executablePath from 'electron';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initialState } from '../shared/core.mjs';
const directory = await mkdtemp(path.join(tmpdir(), 'haru-clip-live-'));
const state = initialState();
state.words = [{ id: 'live', word: '안녕하세요', meaning: 'xin chào', context: '안녕하세요.', videoId: 'WaBNd5Jh4fQ', offset: 3.25, duration: 3.5, lessonTitle: 'Kiểm tra đoạn YouTube', level: 0, due: Date.now() }];
await writeFile(path.join(directory, 'learning.json'), JSON.stringify(state));
const env = { ...process.env, HARU_TEST_DATA: directory }; delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ executablePath: process.env.HARU_EXECUTABLE || executablePath, args: process.env.HARU_EXECUTABLE ? [] : ['.'], env });
try {
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: 'Học cùng video' })).toBeVisible();
  await page.getByRole('button', { name: 'Sổ từ vựng', exact: true }).click();
  await page.getByRole('button', { name: 'Nghe trong video', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nghe trong video' });
  await expect(dialog.locator('.youtube-player')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  const frame = dialog.locator('iframe').contentFrame();
  await expect(frame.locator('video')).toBeVisible({ timeout: 20000 });
  await expect(async () => {
    const playback = await frame.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    expect(playback.time).toBeGreaterThanOrEqual(3.2); expect(playback.time).toBeLessThan(6.8); expect(playback.paused).toBe(false);
  }).toPass({ timeout: 15000 });
  await expect(dialog.getByText('00:03 – 00:06 · Đã nghe hết đoạn', { exact: true })).toBeVisible({ timeout: 12000 });
  const end = await frame.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
  expect(end.time).toBeGreaterThanOrEqual(6.75); expect(end.time).toBeLessThan(7.1); expect(end.paused).toBe(true);
  await dialog.getByRole('button', { name: 'Nghe lại đoạn này' }).click();
  await expect(async () => {
    const playback = await frame.locator('video').evaluate(video => ({ time: video.currentTime, paused: video.paused }));
    expect(playback.time).toBeGreaterThanOrEqual(3.2); expect(playback.time).toBeLessThan(5); expect(playback.paused).toBe(false);
  }).toPass({ timeout: 5000 });
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/haru-word-clip-live.png', fullPage: false });
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  console.log('PASS: real YouTube IFrame API seeks to 3.25s, plays, pauses at 6.75s, replays, and destroys player on close.');
} finally { await app.close(); }
