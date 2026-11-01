import React, { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
export default function BackupHistory({ state, onPreview }) {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = () => window.haru.backupHistory().then(setItems).catch(error => setError(error.message));
  useEffect(() => { refresh(); }, [state]);
  const create = async () => { setBusy(true); setError(''); try { await window.haru.checkpoint(); await refresh(); } catch (error) { setError(error.message); } finally { setBusy(false); } };
  return <section className="panel backup-history"><div className="section-title-row"><h3><History size={18} />Bản sao tự động</h3><button className="secondary" disabled={busy} onClick={create}>Tạo bản sao ngay</button></div><p className="field-help">Giữ tối đa 12 bản trong HaruData/backups. Tự lưu trước thay đổi đầu phiên, mỗi 5 phút khi có thay đổi, và trước khi xóa dữ liệu. Khôi phục luôn giữ lại trạng thái hiện tại.</p>{error && <p className="inline-error" role="alert">{error}</p>}{items.length ? <div className="history-list">{items.map(item => <div key={item.id}><div><strong>{new Date(item.at).toLocaleString('vi-VN')}</strong><small>{item.invalid ? 'Tệp hỏng hoặc không đọc được' : `${item.words} từ · ${item.lessons} bài học`}</small></div><button className="text-button purple" disabled={item.invalid || busy} onClick={async () => { setBusy(true); setError(''); try { onPreview(await window.haru.readHistory(item.id)); } catch (error) { setError(error.message); } finally { setBusy(false); } }}><RotateCcw size={15} />Khôi phục bản này</button></div>)}</div> : <p className="muted">Chưa có bản tự động. Bản đầu sẽ được tạo khi dữ liệu thay đổi.</p>}</section>;
}
