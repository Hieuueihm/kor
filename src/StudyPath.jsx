import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Volume2 } from 'lucide-react';
import { topicUnits, unitProgress, quizChoices } from '../shared/study.mjs';

export default function StudyPath({ progress: records, onProgress, onSaveWords, onListen, initialTopic = 'food' }) {
  const [catalog, setCatalog] = useState(null), [error, setError] = useState('');
  const [topicId, setTopicId] = useState(initialTopic), [activeId, setActiveId] = useState(null);
  useEffect(() => { window.haru.catalog().then(setCatalog).catch(error => setError(error.message)); }, []);
  const units = useMemo(() => catalog ? topicUnits(catalog, topicId) : [], [catalog, topicId]);
  const active = units.find(unit => unit.id === activeId);
  const progress = active && unitProgress(active, records?.[active.id]);
  const entry = active?.entries[progress?.index];
  const result = progress?.phase === 'quiz' ? progress.results[progress.index] : undefined;
  const patch = update => onProgress(active.id, { ...progress, ...update, updatedAt: Date.now() });
  if (error) return <div className="inline-error" role="alert">{error}</div>;
  if (!catalog) return <p className="muted">Đang mở lộ trình ngoại tuyến…</p>;
  const start = unit => {
    const prior = unitProgress(unit, records?.[unit.id]);
    onSaveWords(unit.topic, unit.entries);
    onProgress(unit.id, prior.phase === 'done' ? { ...prior, phase: 'study', index: 0, results: [], updatedAt: Date.now() } : prior);
    setActiveId(unit.id);
  };
  return <section className="study-path">
    {!active ? <><div className="panel path-intro"><div><h2>Mỗi chặng tối đa 12 từ</h2><p>Học ví dụ và cụm đi kèm, rồi làm bài kiểm tra chọn nghĩa. Bắt đầu chặng sẽ lưu các từ mới vào lịch ôn. Bạn có thể dừng và học tiếp sau.</p></div><label>Chủ đề lộ trình<select aria-label="Chủ đề lộ trình" value={topicId} onChange={event => setTopicId(event.target.value)}>{catalog.topics.filter(topic => topic.id !== 'all').map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label></div><div className="path-unit-list">{units.map(unit => {
      const stored = records?.[unit.id], state = stored && unitProgress(unit, stored);
      return <article className="panel path-unit" data-unit-id={unit.id} key={unit.id}><span className="pill">{unit.level}</span><h3>{unit.title}</h3><p>{unit.entries.length} từ · {unit.entries.slice(0, 4).map(entry => entry.word).join(' · ')}</p>{state?.phase === 'done' ? <strong className="purple">Đã hoàn thành · {state.results.filter(Boolean).length}/{unit.entries.length} câu đúng</strong> : state && <small>Đang học: {state.phase === 'quiz' ? 'Kiểm tra' : 'Xem từ'} {state.index + 1}/{unit.entries.length}</small>}<button className="primary" onClick={() => start(unit)}>{state?.phase === 'done' ? 'Học lại chặng' : state ? 'Tiếp tục chặng' : `Học và lưu ${unit.entries.length} từ`}<ArrowRight size={15} /></button></article>;
    })}</div></> : <>
      <button className="text-button purple" onClick={() => setActiveId(null)}><ArrowLeft size={16} />Về các chặng</button><div className="path-active-heading"><h2>{active.title}</h2><span className="pill">{active.level} · {progress.phase === 'study' ? 'Học từ' : progress.phase === 'quiz' ? 'Kiểm tra' : 'Kết quả'}</span></div>
      {progress.phase === 'done' ? <section className="panel path-result"><CheckCircle2 size={36} /><h2>Hoàn thành chặng!</h2><p>{progress.results.filter(Boolean).length}/{active.entries.length} câu đúng. Từ trả lời sai đã được hẹn ôn lại sau 10 phút.</p><button className="primary" onClick={() => setActiveId(null)}>Chọn chặng tiếp theo <ArrowRight size={16} /></button></section> : progress.phase === 'study' ? <article className="panel path-card"><div className="section-title-row"><span className="eyebrow">TỪ {progress.index + 1} / {active.entries.length}</span><button className="icon" aria-label="Nghe từ trong chặng" onClick={() => onListen(entry.word)}><Volume2 size={19} /></button></div><h2 lang="ko">{entry.word}</h2><h3>{entry.meaning}</h3><p>{entry.definition}</p><div className="context-preview"><strong lang="ko">{entry.examples[0].text}</strong><button className="icon" aria-label="Nghe ví dụ trong chặng" onClick={() => onListen(entry.examples[0].text)}><Volume2 size={17} /></button></div>{entry.collocations?.length > 0 && <p lang="ko"><strong>Cụm thường gặp: </strong>{entry.collocations.join(' · ')}</p>}<div className="path-actions"><button className="secondary" disabled={progress.index === 0} onClick={() => patch({ index: progress.index - 1 })}><ArrowLeft size={16} />Từ trước</button><button className="primary" onClick={() => patch(progress.index + 1 < active.entries.length ? { index: progress.index + 1 } : { phase: 'quiz', index: 0, results: [] })}>{progress.index + 1 < active.entries.length ? 'Từ tiếp theo' : 'Bắt đầu kiểm tra'}<ArrowRight size={16} /></button></div></article> : <article className="panel path-quiz"><span className="eyebrow">CÂU {progress.index + 1} / {active.entries.length} · CHỌN NGHĨA ĐÃ HỌC</span><h2 lang="ko">{entry.word}</h2><div className="quiz-options">{quizChoices(active, progress.index, catalog.entries).map(choice => <button className={`secondary ${typeof result === 'boolean' && choice === entry.meaning ? 'quiz-correct' : ''}`} disabled={typeof result === 'boolean'} key={choice} onClick={() => {
        if (typeof result === 'boolean') return;
        const correct = choice === entry.meaning;
        onProgress(active.id, { ...progress, results: [...progress.results.slice(0, progress.index), correct], updatedAt: Date.now() }, { entry, correct });
      }}>{choice}</button>)}</div>{typeof result === 'boolean' && <><p className={`answer-feedback ${result ? 'success' : 'incorrect'}`} role="status">{result ? 'Đúng!' : `Đáp án: ${entry.meaning}`}</p><button className="primary" onClick={() => patch(progress.index + 1 < active.entries.length ? { index: progress.index + 1 } : { phase: 'done', index: 0 })}>{progress.index + 1 < active.entries.length ? 'Câu tiếp theo' : 'Xem kết quả'}<ArrowRight size={16} /></button></>}</article>}
    </>}
  </section>;
}
