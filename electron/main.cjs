const { app, BrowserWindow, WebContentsView, ipcMain, dialog, safeStorage, shell, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
let window, origin, server, core;
let writeQueue = Promise.resolve();
let backups;
app.setName('Haru');
const storage = require('./storage.cjs').configureStorage(app);
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
const dataFile = () => storage.learningFile;
const settingsFile = () => storage.settingsFile;
let catalogCache, catalogLoading;
function getCatalog() {
  if (catalogCache) return Promise.resolve(catalogCache);
  if (!catalogLoading) catalogLoading = loadCatalog().finally(() => { catalogLoading = null; });
  return catalogLoading;
}
async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const bundled = path.join(__dirname, '../data');
  for (const name of ['vocabulary.json', 'LICENSE-SOURCE.txt', 'vocabulary.sha256']) {
    try { await fs.copyFile(path.join(bundled, name), path.join(storage.root, name), require('node:fs').constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  if ((await fs.stat(storage.catalogFile)).size > 64_000_000) throw new Error('Bộ từ vựng lớn hơn giới hạn 64 MB.');
  const { validateCatalog } = await import('../shared/topics.mjs');
  catalogCache = validateCatalog(await readJSON(storage.catalogFile));
  return catalogCache;
}
async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw new Error('Không đọc được dữ liệu đã lưu. Hãy giữ lại tệp dữ liệu và khôi phục từ bản sao lưu.'); }
}
async function atomicWrite(file, value) {
  const next = writeQueue.catch(() => {}).then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    if (file === dataFile()) await backups.beforeWrite(value);
    await fs.writeFile(file + '.tmp', JSON.stringify(value, null, 2), 'utf8');
    await fs.rename(file + '.tmp', file);
  });
  writeQueue = next;
  return next;
}
function handle(channel, action) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (event.senderFrame !== window.webContents.mainFrame || new URL(event.senderFrame.url).origin !== origin) throw new Error('Yêu cầu không hợp lệ.');
    return action(...args);
  });
}
async function settingsStatus() {
  const saved = await readJSON(settingsFile(), {});
  return { configured: !!saved.encryptedKey, region: saved.region || '', encryptionAvailable: safeStorage.isEncryptionAvailable() };
}
function registerIPC() {
  handle('history:list', async () => { await writeQueue; return backups.list(); });
  handle('history:read', id => backups.read(id));
  handle('history:checkpoint', async () => { await writeQueue; return backups.checkpoint(true); });
  handle('catalog:load', getCatalog);
  handle('catalog:source', async id => {
    if (!/^nikl-\d+$/.test(id)) throw new Error('Mã mục từ không hợp lệ.');
    await shell.openExternal(`https://krdict.korean.go.kr/vie/dicSearch/SearchView?ParaWordNo=${id.slice(5)}`);
  });
  handle('data:info', () => ({ root: storage.root, portable: storage.portable, learningFile: storage.learningFile, catalogFile: storage.catalogFile }));
  handle('data:folder', () => shell.openPath(storage.root));
  handle('transfer:export', async state => {
    core.validateState(state); const catalog = await getCatalog();
    const chosen = await dialog.showSaveDialog(window, { title: 'Xuất dữ liệu để chuyển máy', defaultPath: 'Haru-chuyen-may.zip', filters: [{ name: 'Gói chuyển máy Haru', extensions: ['zip'] }] });
    if (chosen.canceled) return false;
    const JSZip = require('jszip'); const zip = new JSZip();
    zip.file('HaruData/learning.json', JSON.stringify(state, null, 2));
    zip.file('HaruData/vocabulary.json', JSON.stringify(catalog));
    zip.file('HaruData/LICENSE-SOURCE.txt', await fs.readFile(path.join(__dirname, '../data/LICENSE-SOURCE.txt')));
    for (const backup of await backups.list()) if (!backup.invalid) zip.file(`HaruData/backups/${backup.id}`, JSON.stringify(await backups.read(backup.id), null, 2));
    zip.file('HUONG-DAN-CHUYEN-MAY.txt', 'Giải nén gói này vào cùng thư mục với Haru-Windows.exe trên máy mới.\r\nThư mục HaruData phải nằm ngay cạnh tệp EXE. Mở Haru để dùng tiếp từ đã lưu, ví dụ và lịch ôn.\r\nKhông có khóa dịch hay bộ nhớ đệm trong gói này.\r\nCác thay đổi sau lần xuất cần được xuất lại hoặc chép lại cả thư mục HaruData.\r\n');
    await fs.writeFile(chosen.filePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })); return true;
  });
  handle('reference:open', (provider, text) => require('./reference-browser.cjs').openReference(window, provider, text));
  const openYoutubeSearch = require('./youtube-search.cjs')({ BrowserWindow, WebContentsView, ipcMain, core });
  handle('youtube:search', query => openYoutubeSearch(window, origin, query));
  handle('dictionary:lookup', input => require('./dictionary.cjs').lookupWord(input));
  handle('dictionary:open', async term => {
    if (typeof term !== 'string' || term.length > 100 || !/[가-힣]/.test(term)) throw new Error('Từ không hợp lệ.');
    await shell.openExternal(`https://vi.wiktionary.org/wiki/${encodeURIComponent(term)}`);
  });
  handle('words:export', async (format, words) => {
    if (!['docx', 'pdf', 'xlsx'].includes(format) || !Array.isArray(words) || !words.length) throw new Error('Chọn ít nhất một từ để xuất.');
    core.validateState({ version: 1, lessons: [], words, attempts: [] });
    const names = { docx: 'Microsoft Word', pdf: 'PDF', xlsx: 'Microsoft Excel' };
    const chosen = await dialog.showSaveDialog(window, { title: `Xuất từ vựng · ${names[format]}`, defaultPath: `Haru-tu-vung.${format}`, filters: [{ name: names[format], extensions: [format] }] });
    if (chosen.canceled) return false;
    const exporters = require('./export.cjs');
    if (format === 'docx') await exporters.exportDocx(chosen.filePath, words);
    else if (format === 'xlsx') await exporters.exportXlsx(chosen.filePath, words);
    else await exporters.exportPdf(chosen.filePath, words, BrowserWindow);
    return true;
  });
  handle('data:load', async () => core.validateState(await readJSON(dataFile(), core.initialState())));
  handle('data:save', async state => { core.validateState(state); await atomicWrite(dataFile(), state); return true; });
  handle('settings:read', settingsStatus);
  handle('settings:save', async payload => {
    if (!payload || typeof payload.key !== 'string' || typeof payload.region !== 'string' || !/^[a-z0-9-]{0,50}$/.test(payload.region)) throw new Error('Vùng dịch không hợp lệ.');
    const saved = await readJSON(settingsFile(), {});
    if (payload.clear) saved.encryptedKey = null;
    else if (payload.key.trim()) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows chưa hỗ trợ mã hóa khóa dịch trên phiên này.');
      if (payload.key.length > 500) throw new Error('Khóa dịch quá dài.');
      saved.encryptedKey = safeStorage.encryptString(payload.key.trim()).toString('base64');
    }
    saved.region = payload.region;
    await atomicWrite(settingsFile(), saved);
    return settingsStatus();
  });
  handle('lesson:youtube', async input => {
    const id = core.videoId(input);
    const { fetchTranscript } = await import('youtube-transcript-plus');
    try {
      const result = await fetchTranscript(id, { lang: 'ko', videoDetails: true, signal: AbortSignal.timeout(25000) });
      const segments = result.segments.filter(x => /[가-힣]/.test(x.text)).slice(0, 2000).map(x => ({ text: core.decodeEntities(x.text), offset: x.offset, duration: Math.max(x.duration, 0.1), translation: '' }));
      if (!segments.length) throw new Error('Không có câu tiếng Hàn.');
      return { id: crypto.randomUUID(), videoId: id, title: result.videoDetails?.title || 'Bài học YouTube', author: result.videoDetails?.author || 'YouTube', source: 'youtube', createdAt: Date.now(), segments };
    } catch {
      throw new Error('Chưa lấy được phụ đề tiếng Hàn: video có thể không có phụ đề, bị giới hạn hoặc YouTube đang chặn yêu cầu. Bạn có thể nhập SRT/VTT hoặc dán bản chép lời.');
    }
  });
  handle('lesson:translate', async segments => {
    if (!Array.isArray(segments) || segments.length > 2000 || segments.some(s => typeof s.text !== 'string' || s.text.length > 10000)) throw new Error('Nội dung dịch không hợp lệ.');
    const settings = await readJSON(settingsFile(), {});
    if (!settings.encryptedKey) throw new Error('Hãy thêm khóa Microsoft Translator trong Cài đặt để dịch Hàn–Việt.');
    const key = safeStorage.decryptString(Buffer.from(settings.encryptedKey, 'base64'));
    const output = [];
    for (let start = 0; start < segments.length;) {
      const batch = []; let size = 0;
      while (start < segments.length && batch.length < 50 && size + segments[start].text.length <= 45000) { size += segments[start].text.length; batch.push(segments[start++]); }
      let response;
      try {
        response = await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=ko&to=vi', {
          method: 'POST', signal: AbortSignal.timeout(30000),
          headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': key, ...(settings.region ? { 'Ocp-Apim-Subscription-Region': settings.region } : {}) },
          body: JSON.stringify(batch.map(s => ({ Text: s.text })))
        });
      } catch { throw new Error('Không kết nối được Microsoft Translator. Kiểm tra mạng rồi thử lại.'); }
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Khóa hoặc vùng Microsoft Translator chưa đúng, hoặc tài khoản hết hạn mức.' : `Dịch vụ dịch tạm lỗi (${response.status}). Hãy thử lại sau.`);
      const translated = await response.json();
      if (!Array.isArray(translated) || translated.length !== batch.length || translated.some(x => typeof x.translations?.[0]?.text !== 'string')) throw new Error('Dịch vụ trả về dữ liệu không hợp lệ.');
      output.push(...batch.map((s, i) => ({ ...s, translation: translated[i].translations[0].text })));
    }
    return output;
  });
  handle('subtitle:open', async () => {
    const chosen = await dialog.showOpenDialog(window, { title: 'Nhập phụ đề tiếng Hàn', properties: ['openFile'], filters: [{ name: 'Phụ đề', extensions: ['srt', 'vtt', 'txt'] }] });
    if (chosen.canceled) return null;
    if ((await fs.stat(chosen.filePaths[0])).size > 2_000_000) throw new Error('Tệp phụ đề lớn hơn 2 MB.');
    return fs.readFile(chosen.filePaths[0], 'utf8');
  });
  handle('backup:export', async state => {
    core.validateState(state);
    const chosen = await dialog.showSaveDialog(window, { defaultPath: `Haru-backup-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: 'Haru backup', extensions: ['json'] }] });
    if (chosen.canceled) return false;
    await fs.writeFile(chosen.filePath, JSON.stringify(state, null, 2), 'utf8'); return true;
  });
  handle('backup:import', async () => {
    const chosen = await dialog.showOpenDialog(window, { filters: [{ name: 'Haru backup', extensions: ['json'] }], properties: ['openFile'] });
    if (chosen.canceled) return null;
    if ((await fs.stat(chosen.filePaths[0])).size > 100_000_000) throw new Error('Bản sao lưu lớn hơn 100 MB.');
    return core.validateState(JSON.parse(await fs.readFile(chosen.filePaths[0], 'utf8')));
  });
  handle('youtube:open', async (id, start = 0) => { if (!/^[\w-]{11}$/.test(id) || !Number.isFinite(start) || start < 0 || start > 604800) throw new Error('Mã video hoặc mốc phát không hợp lệ.'); await shell.openExternal(`https://www.youtube.com/watch?v=${id}${start ? `&t=${Math.floor(start)}s` : ''}`); });
}
async function serveApp() {
  if (process.env.HARU_DEV_URL && !app.isPackaged) return process.env.HARU_DEV_URL;
  const root = path.resolve(__dirname, '../dist');
  server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const bytes = await fs.readFile(file);
      res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
if (primaryInstance) app.whenReady().then(async () => {
  core = await import('../shared/core.mjs');
  backups = require('./backups.cjs')(storage.root, core.validateState);
  origin = new URL(await serveApp()).origin;
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1080, minHeight: 760, backgroundColor: '#f8f9fb', title: 'Haru · Học tiếng Hàn', icon: path.join(__dirname, '../assets/haru.ico'), autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  registerIPC();
  await window.loadURL(origin);
}).catch(error => { dialog.showErrorBox('Không khởi động được Haru', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
let quitting = false;
app.on('before-quit', event => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  writeQueue.catch(() => {}).finally(() => { server?.close(); app.quit(); });
});
