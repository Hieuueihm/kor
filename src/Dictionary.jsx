import React, { useEffect, useRef, useState } from 'react';
import { Search, Volume2, Bookmark, LoaderCircle, ArrowUpRight, Sparkles } from 'lucide-react';
export default function Dictionary({ term, words, configured, onLookup, onListen, onSave }) {
  const [input, setInput] = useState(term);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const openReference = async provider => { setError(''); try { await window.haru.openReference(provider, input.trim()); } catch (e) { setError(e.message); } };
  const request = useRef(0);
  useEffect(() => {
    setInput(term);
    const revision = ++request.current;
    setResult(null); setError('');
    if (!term.trim()) { setBusy(false); return; }
    setBusy(true);
    window.haru.lookupWord(term).then(value => { if (revision === request.current) setResult(value); }).catch(e => { if (revision === request.current) setError(e.message); }).finally(() => { if (revision === request.current) setBusy(false); });
    return () => { request.current++; };
  }, [term]);
  const saved = term ? words.filter(word => `${word.word} ${word.meaning}`.toLowerCase().includes(term.toLowerCase())) : [];
  const machineTranslate = async () => {
    const revision = ++request.current; setBusy(true); setError('');
    try {
      const translated = await window.haru.translate([{ text: input.trim(), offset: 0, duration: 1 }]);
      if (revision === request.current) setResult({ word: input.trim(), definitions: [translated[0].translation], source: 'Microsoft Translator · Bản dịch tự động', machine: true });
    } catch (e) { if (revision === request.current) setError(e.message); }
    finally { if (revision === request.current) setBusy(false); }
  };
  return <section className="dictionary-page"><form className="dictionary-search" onSubmit={e => { e.preventDefault(); if (input.trim()) onLookup(input.trim()); }}><Search size={22} /><input aria-label="Từ cần tra" lang="ko" value={input} onChange={e => setInput(e.target.value)} placeholder="Nhập từ tiếng Hàn, ví dụ: 학교" maxLength={100} /><button className="primary" disabled={busy || !input.trim()}>Tra nghĩa</button></form>
    <div className="reference-actions"><button className="secondary" disabled={!input.trim()} onClick={() => openReference('naver')}>Tra Naver Hàn–Việt <ArrowUpRight size={14} /></button><button className="secondary" disabled={!input.trim()} onClick={() => openReference('papago')}>Dịch trên Papago <ArrowUpRight size={14} /></button><span>Mở giao diện web trong ứng dụng, không cần khóa API.</span></div><div className="dictionary-help">Tra nghĩa Hàn–Việt từ Wiktionary, không cần khóa API. Nên nhập dạng từ điển, ví dụ 먹다 thay vì 먹어요.</div>
    {busy && <div className="busy-banner" role="status"><LoaderCircle size={17} className="spin" />Đang tra nghĩa…</div>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {saved.length > 0 && <section className="panel local-matches"><h3>Trong sổ từ của bạn</h3>{saved.map(word => <div key={word.id}><strong lang="ko">{word.word}</strong><span>{word.meaning}</span><button className="icon" aria-label={`Nghe từ đã lưu ${word.word}`} onClick={() => onListen(word.word)}><Volume2 size={17} /></button></div>)}</section>}
    {result && <article className="panel dictionary-result"><div className="dictionary-word"><h2 lang="ko">{result.word}</h2><button className="secondary" onClick={() => onListen(result.word)}><Volume2 size={18} />Nghe phát âm</button></div>{result.definitions.length ? <ol>{result.definitions.map((meaning, i) => <li key={i}><span>{meaning}</span><button className="secondary" onClick={() => onSave(result.word, meaning, result.source + (result.url ? ` · ${result.url}` : ''))}><Bookmark size={15} />Lưu từ</button></li>)}</ol> : <p className="dictionary-missing">Chưa có mục từ Hàn–Việt phù hợp. Thử dạng từ điển, tra một từ ngắn hơn hoặc dùng Microsoft Translator bên dưới.</p>}<div className="dictionary-source">{result.url ? <button className="text-button" onClick={() => window.haru.openDictionary(result.word)}>{result.source} · CC BY-SA <ArrowUpRight size={13} /></button> : <span>{result.source}</span>}</div></article>}
    {!busy && input.trim() && <button className="secondary" onClick={machineTranslate}><Sparkles size={16} />Dịch nghĩa bằng Microsoft Translator{!configured && <small> · cần khóa trong Cài đặt</small>}</button>}
    {!term && <div className="dictionary-start"><p>Tra nhanh:</p>{['학교', '사랑', '먹다', '친구'].map(word => <button className="secondary" key={word} onClick={() => onLookup(word)} lang="ko">{word}</button>)}</div>}
  </section>;
}
