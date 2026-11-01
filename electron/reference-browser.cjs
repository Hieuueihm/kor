const { BrowserWindow } = require('electron');
const windows = new Map();
async function openReference(parent, provider, input) {
  if (!['naver', 'papago'].includes(provider) || typeof input !== 'string' || !input.trim() || input.length > 2000) throw new Error('Nội dung tra cứu không hợp lệ.');
  const term = input.normalize('NFC').trim();
  const url = provider === 'naver'
    ? `https://korean.dict.naver.com/kovidict/#/search?query=${encodeURIComponent(term)}`
    : `https://papago.naver.com/?sk=ko&tk=vi&st=${encodeURIComponent(term)}`;
  let browser = windows.get(provider);
  if (!browser || browser.isDestroyed()) {
    browser = new BrowserWindow({ parent, title: provider === 'naver' ? 'Naver Hàn–Việt · Haru' : 'Papago Hàn–Việt · Haru', width: 1100, height: 800, autoHideMenuBar: true, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    windows.set(provider, browser);
    browser.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    browser.webContents.on('will-navigate', (event, target) => { const uri = new URL(target); if (uri.protocol !== 'https:' || !(uri.hostname === 'naver.com' || uri.hostname.endsWith('.naver.com'))) event.preventDefault(); });
    browser.on('closed', () => windows.delete(provider));
  }
  browser.show(); browser.focus();
  try { await browser.loadURL(url); }
  catch (error) { if (error.code !== 'ERR_ABORTED' && error.errno !== -3) throw new Error('Chưa mở được Naver/Papago. Kiểm tra mạng rồi thử lại.'); }
}
module.exports = { openReference };
