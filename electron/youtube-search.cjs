const path = require('node:path');
module.exports = function createYoutubeSearch({ BrowserWindow, WebContentsView, ipcMain, core }) {
  let browser, view, appWindow, appOrigin;
  const load = async url => {
    try { await view.webContents.loadURL(url); }
    catch (error) { if (error.code !== 'ERR_ABORTED' && error.errno !== -3) throw new Error('Không mở được YouTube. Kiểm tra kết nối mạng rồi thử lại.'); }
  };
  const validSender = event => browser && !browser.isDestroyed() && event.senderFrame === browser.webContents.mainFrame && new URL(event.senderFrame.url).origin === appOrigin;
  const notify = () => {
    if (!browser || browser.isDestroyed() || !view) return;
    let canSelect = false;
    try { core.videoId(view.webContents.getURL()); canSelect = true; } catch {}
    browser.webContents.send('search:location', { canSelect, title: view.webContents.getTitle() });
  };
  const queryURL = query => {
    if (typeof query !== 'string' || !query.trim() || query.length > 200) throw new Error('Nhập từ khóa YouTube từ 1 đến 200 ký tự.');
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
  };
  ipcMain.handle('search:query', (event, query) => {
    if (!validSender(event)) throw new Error('Yêu cầu không hợp lệ.');
    return load(queryURL(query));
  });
  ipcMain.handle('search:back', event => {
    if (!validSender(event)) throw new Error('Yêu cầu không hợp lệ.');
    if (view.webContents.navigationHistory.canGoBack()) view.webContents.navigationHistory.goBack();
  });
  ipcMain.handle('search:select', event => {
    if (!validSender(event)) throw new Error('Yêu cầu không hợp lệ.');
    let id;
    try { id = core.videoId(view.webContents.getURL()); } catch { throw new Error('Hãy mở một video trước khi chọn.'); }
    appWindow.webContents.send('youtube:selected', `https://www.youtube.com/watch?v=${id}`);
    appWindow.show(); appWindow.focus(); browser.close();
    return true;
  });
  return async (parent, origin, query) => {
    const url = queryURL(query);
    appWindow = parent; appOrigin = origin;
    if (browser && !browser.isDestroyed()) { browser.show(); browser.focus(); await load(url); return; }
    browser = new BrowserWindow({ title: 'Tìm video YouTube · Haru', width: 1180, height: 850, minWidth: 780, minHeight: 580, parent, autoHideMenuBar: true, backgroundColor: '#ffffff', webPreferences: { preload: path.join(__dirname, 'preload-search.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
    view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    browser.contentView.addChildView(view);
    const resize = () => { if (!browser || browser.isDestroyed()) return; const [width, height] = browser.getContentSize(); view.setBounds({ x: 0, y: 94, width, height: Math.max(0, height - 94) }); };
    resize(); browser.on('resize', resize);
    browser.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    browser.webContents.on('will-navigate', (event, target) => { if (new URL(target).origin !== origin) event.preventDefault(); });
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    view.webContents.on('will-navigate', (event, target) => {
      const host = new URL(target).hostname;
      if (!['www.youtube.com', 'youtube.com', 'm.youtube.com', 'accounts.google.com', 'consent.youtube.com', 'consent.google.com'].includes(host)) event.preventDefault();
    });
    view.webContents.on('did-navigate', notify); view.webContents.on('did-navigate-in-page', notify); view.webContents.on('page-title-updated', notify);
    browser.on('closed', () => { const contents = view?.webContents; browser = null; view = null; if (contents && !contents.isDestroyed()) contents.close({ waitForBeforeUnload: false }); });
    await browser.loadURL(`${origin}/youtube-search.html?q=${encodeURIComponent(query)}`);
    await load(url);
    notify();
  };
};
