const fs = require('node:fs/promises');
const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
async function exportDocx(file, words) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = require('docx');
  const cell = (text, header = false) => new TableCell({ shading: header ? { fill: '7560CB' } : undefined, margins: { top: 130, bottom: 130, left: 130, right: 130 }, children: String(text || '').split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, bold: header, color: header ? 'FFFFFF' : '26283B', font: 'Malgun Gothic', size: 20 })] })) });
  const document = new Document({ creator: 'Haru', title: 'Sổ từ vựng tiếng Hàn', sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 800, right: 800 } } }, children: [
    new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: 'SỔ TỪ VỰNG TIẾNG HÀN', bold: true, font: 'Segoe UI', size: 34, color: '6751B9' })] }),
    new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: `Haru · ${words.length} từ · ${new Date().toLocaleDateString('vi-VN')}`, font: 'Segoe UI', size: 20, color: '747483' })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [2100, 2400, 3500, 2300], rows: [new TableRow({ tableHeader: true, children: ['Tiếng Hàn', 'Nghĩa tiếng Việt', 'Câu ví dụ', 'Ghi chú'].map(text => cell(text, true)) }), ...words.map(word => new TableRow({ cantSplit: true, children: [word.word, word.meaning, [word.context, word.contextTranslation].filter(Boolean).join('\n'), word.note].map(text => cell(text)) }))] })
  ] }] });
  await fs.writeFile(file, await Packer.toBuffer(document));
}
async function exportXlsx(file, words) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook(); workbook.creator = 'Haru'; workbook.created = new Date();
  const sheet = workbook.addWorksheet('Từ vựng', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Tiếng Hàn', key: 'word', width: 25 }, { header: 'Nghĩa tiếng Việt', key: 'meaning', width: 35 },
    { header: 'Câu ví dụ', key: 'context', width: 48 }, { header: 'Dịch câu ví dụ', key: 'contextTranslation', width: 48 },
    { header: 'Ghi chú', key: 'note', width: 40 }, { header: 'Bài học', key: 'lessonTitle', width: 30 },
    { header: 'Mức ghi nhớ', key: 'level', width: 15 }, { header: 'Lần ôn tới', key: 'dueDate', width: 22 }
  ];
  words.forEach(word => {
    // Plain strings, including leading =/+/-, stay strings rather than spreadsheet formulas.
    const row = sheet.addRow({ ...word, dueDate: new Date(word.due) });
    row.height = Math.max(34, Math.min(160, Math.ceil(Math.max((word.meaning || '').length / 28, (word.context || '').length / 30, (word.note || '').length / 32)) * 17 + 10));
  });
  sheet.eachRow((row, index) => {
    row.eachCell(cell => { cell.font = { name: 'Malgun Gothic', size: 11 }; cell.alignment = { vertical: 'top', wrapText: true }; if (index > 1 && index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F2FA' } }; });
  });
  sheet.getRow(1).height = 30;
  sheet.getRow(1).eachCell(cell => { cell.font = { name: 'Malgun Gothic', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7560CB' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
  sheet.getColumn('dueDate').numFmt = 'dd/mm/yyyy hh:mm';
  sheet.autoFilter = { from: 'A1', to: 'H1' };
  sheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  await workbook.xlsx.writeFile(file);
}
function pdfHTML(words) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:A4;margin:16mm 13mm}body{font-family:'Segoe UI','Malgun Gothic',sans-serif;font-size:10px;color:#26283b}h1{font-size:22px;color:#6751b9;margin:0 0 8px}p{color:#777;margin:0 0 20px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}th{background:#7560cb;color:white;text-align:left;padding:10px 8px;font-weight:600}td{vertical-align:top;border-bottom:1px solid #e3deec;padding:10px 8px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}tr{break-inside:avoid}tbody tr:nth-child(even){background:#f8f5fc}.ko{font-family:'Malgun Gothic','Segoe UI',sans-serif;font-size:12px;font-weight:600}.source{font-size:8px;color:#999}small{display:block;color:#888;margin-top:4px}</style></head><body><h1>Sổ từ vựng tiếng Hàn</h1><p>Haru · ${words.length} từ · ${new Date().toLocaleDateString('vi-VN')}</p><table><colgroup><col style="width:20%"><col style="width:25%"><col style="width:32%"><col style="width:23%"></colgroup><thead><tr><th>Tiếng Hàn</th><th>Nghĩa tiếng Việt</th><th>Câu ví dụ</th><th>Ghi chú</th></tr></thead><tbody>${words.map(word => `<tr><td class="ko">${esc(word.word)}</td><td>${esc(word.meaning)}</td><td>${esc(word.context)}<small>${esc(word.contextTranslation)}</small></td><td>${esc(word.note)}</td></tr>`).join('')}</tbody></table></body></html>`;
}
async function exportPdf(file, words, BrowserWindow) {
  const path = require('node:path'); const os = require('node:os');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'haru-pdf-'));
  const htmlFile = path.join(temporary, 'vocabulary.html');
  const printer = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    await fs.writeFile(htmlFile, pdfHTML(words), 'utf8');
    await printer.loadFile(htmlFile);
    await printer.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
    const bytes = await printer.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: 'A4' });
    await fs.writeFile(file, bytes);
  } finally { printer.destroy(); await fs.unlink(htmlFile).catch(() => {}); await fs.rmdir(temporary).catch(() => {}); }
}
module.exports = { exportDocx, exportXlsx, exportPdf, pdfHTML };
