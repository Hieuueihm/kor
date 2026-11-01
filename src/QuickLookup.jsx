import React, { useEffect, useRef, useState } from 'react';
import { Search, Volume2, Bookmark, LoaderCircle, ArrowUpRight, X } from 'lucide-react';

export default function QuickLookup({ lookup, words, onLookup, onClose, onListen, onSave }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const field = useRef();
  useEffect(() => {
    const revision = ++request.current;
    setInput(lookup?.term || ''); setResult(null); setError(''); setBusy(!!lookup);
    if (!lookup) return;
    window.haru.lookupWord(lookup.term).then(value => { if (revision === request.current) setResult(value); })
      .catch(e => { if (revision === request.current) setError(e.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')); })
      .finally(() => { if (revision === request.current) setBusy(false); });
    return () => { request.current++; };
  }, [lookup]);
  const openReference = async provider => {
    setError('');
    try { await window.haru.openReference(provider, input.trim()); }
    catch (e) { setError(e.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')); }
  };
  const saved = lookup ? words.filter(word => word.word.normalize('NFC') === lookup.term.normalize('NFC')) : [];
  return <section className="lesson-lookup" aria-label="Tra từ trong bài học">
    <form className="lesson-lookup-form" onSubmit={e => { e.preventDefault(); if (input.trim()) onLookup(input.trim()); }}>
      <Search size={18} /><input ref={field} aria-label="Tra từ ngay trong bài" lang="ko" value={input} onChange={e => setInput(e.target.value)} placeholder="Tra từ ngay tại đây, hoặc bấm từ gạch chân trong câu…" maxLength={100} />
      <button className="primary" disabled={!input.trim()} type="submit">Tra nghĩa</button>
      <button className="secondary" type="button" disabled={!input.trim()} onClick={() => openReference('naver')}>Naver <ArrowUpRight size={13} /></button>
      <button className="secondary" type="button" disabled={!input.trim()} onClick={() => openReference('papago')}>Papago <ArrowUpRight size={13} /></button>
      {lookup && <button type="button" className="icon" onClick={onClose} aria-label="Đóng kết quả tra từ"><X size={17} /></button>}
    </form>
    {lookup && <div className="lesson-lookup-results" aria-live="polite">
      <div className="lesson-lookup-word"><strong lang="ko">{lookup.term}</strong><button className="icon" aria-label={`Nghe từ đang tra ${lookup.term}`} onClick={() => onListen(lookup.term)}><Volume2 size={17} /></button><button className="text-button purple" onClick={() => onSave(lookup.term, '', '')}><Bookmark size={14} />Thêm vào sổ</button></div>
      {saved.map(word => <div className="lookup-saved-meaning" key={word.id}><span>Đã lưu</span><strong>{word.meaning}</strong></div>)}
      {busy && <p className="lookup-status"><LoaderCircle size={14} className="spin" />Đang tra nghĩa…</p>}
      {error && <p className="lookup-error" role="alert">{error}</p>}
      {result && (result.definitions.length ? <ol className="lesson-lookup-definitions">{result.definitions.map((meaning, i) => <li key={i}><span>{meaning}</span><button className="text-button purple" onClick={() => onSave(result.word, meaning, `${result.source} · ${result.url}`)}><Bookmark size={14} />Lưu nghĩa này</button></li>)}</ol> : <p className="lookup-status">Chưa có nghĩa trong Wiktionary. Bấm Naver/Papago ở trên hoặc nhập dạng từ điển để tra tiếp.</p>)}
      {result && <button className="text-button lookup-attribution" onClick={() => window.haru.openDictionary(result.word)}>Wiktionary tiếng Việt · CC BY-SA <ArrowUpRight size={11} /></button>}
    </div>}
  </section>;
}
