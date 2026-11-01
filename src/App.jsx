import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Play, Plus, Headphones, Bookmark, Layers, Settings, ArrowUpRight, ChevronLeft, ChevronRight, Check, X, Volume2, RotateCcw, Search, Download, Upload, Youtube, Link, FileText, Sparkles, BarChart3, ArrowRight, Eye, EyeOff, CheckCircle2, CircleHelp, Trash2, LoaderCircle, FolderOpen } from 'lucide-react';
import { correctAnswer, exercise, normalize, parseSubtitles, scheduleReview, segmentAtTime, segmentEnd, videoId, recordWordResult, isTroublesome } from '../shared/core.mjs';
import YouTubePlayer from './YouTubePlayer.jsx';
import LiveSubtitles from './LiveSubtitles.jsx';
import Dictionary from './Dictionary.jsx';
import QuickLookup from './QuickLookup.jsx';
import Topics from './Topics.jsx';
import Review from './Review.jsx';
import WordClip from './WordClip.jsx';
import Usage from './Usage.jsx';
import StudyPath from './StudyPath.jsx';
import Mistakes from './Mistakes.jsx';
import BackupHistory from './BackupHistory.jsx';
import { videoSnapshot, wordClip, preserveWordVideos } from '../shared/review.mjs';

const navItems = [['learn', Headphones, 'Góc học tập'], ['library', BookOpen, 'Thư viện bài học'], ['dictionary', Search, 'Tra từ'], ['topics', BookOpen, 'Từ vựng chủ đề'], ['paths', ArrowRight, 'Lộ trình chủ đề'], ['usage', BookOpen, 'Cụm từ & dễ nhầm'], ['words', Bookmark, 'Sổ từ vựng'], ['review', Layers, 'Ôn tập flashcard'], ['mistakes', RotateCcw, 'Từ hay sai'], ['progress', BarChart3, 'Tiến độ học tập']];
const formatTime = value => `${Math.floor(value / 60).toString().padStart(2, '0')}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
const shortDate = value => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

function Modal({ title, subtitle, close, children, wide = false }) {
  const box = useRef();
  useEffect(() => {
    const prior = document.activeElement;
    box.current?.focus();
    const key = event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const items = box.current.querySelectorAll('button:not(:disabled), input, textarea, select, [tabindex="0"]');
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prior?.focus(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section ref={box} tabIndex={-1} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><button className="icon close" onClick={close} aria-label="Đóng"><X size={20} /></button><h2>{title}</h2><p className="muted">{subtitle}</p>{children}</section></div>;
}

export default function App() {
  const [data, setData] = useState(null);
  const [fatal, setFatal] = useState('');
  const [page, setPage] = useState('learn');
  const [lessonId, setLessonId] = useState('demo');
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState('exercise');
  const [difficulty, setDifficulty] = useState('normal');
  const [answers, setAnswers] = useState({});
  const [rawResult, setResult] = useState(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveStatus, setSaveStatus] = useState('Đã lưu trên máy');
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState({ configured: false, region: '' });
  const [key, setKey] = useState('');
  const [region, setRegion] = useState('');
  const [importTab, setImportTab] = useState('youtube');
  const [url, setUrl] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [wordDraft, setWordDraft] = useState({ word: '', meaning: '', note: '' });
  const [restoring, setRestoring] = useState(null);
  const [videoTime, setVideoTime] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [pauseForExercise, setPauseForExercise] = useState(true);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupTerm, setLookupTerm] = useState('');
  const [lookupRevision, setLookupRevision] = useState(0);
  const [lessonLookup, setLessonLookup] = useState(null);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [clock, setClock] = useState(Date.now);
  const [dataLocation, setDataLocation] = useState(null);
  const [activeClip, setActiveClip] = useState(null);
  const [clipError, setClipError] = useState('');
  const [reviewQueue, setReviewQueue] = useState(null);
  const [pathTopic, setPathTopic] = useState('food');
  const player = useRef();
  const playback = useRef({ time: null, state: -1, holding: null, target: null });
  const answerRefs = useRef({});
  const saveRevision = useRef(0);
  const result = rawResult?.lessonId === lessonId && rawResult?.index === index && rawResult?.difficulty === difficulty ? rawResult : null;

  useEffect(() => {
    if (!window.haru) { setFatal('Hãy mở Haru bằng ứng dụng Windows: chạy npm start hoặc mở tệp Haru.exe.'); return; }
    window.haru.load().then(value => { setData(preserveWordVideos(value)); setLessonId(value.lessons[0]?.id || ''); setAutoAdvance(value.preferences?.autoAdvance ?? true); setPauseForExercise(value.preferences?.pauseForExercise ?? true); }).catch(e => setFatal(e.message));
    window.haru.settings().then(value => { setSettings(value); setRegion(value.region); }).catch(e => setError(e.message));
    window.haru.dataInfo().then(setDataLocation).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    if (!data) return;
    const revision = ++saveRevision.current;
    setSaveStatus('Đang lưu…');
    window.haru.save(data).then(() => { if (revision === saveRevision.current) setSaveStatus('Đã lưu trên máy'); }).catch(e => { setSaveStatus('Chưa lưu được'); setError(e.message); });
  }, [data]);
  useEffect(() => { setAnswers({}); setResult(null); setLessonLookup(null); }, [lessonId, index, difficulty]);
  useEffect(() => { if (page !== 'learn') setLessonLookup(null); }, [page]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { playback.current = { time: null, state: -1, holding: null, target: null }; setVideoTime(0); setVideoPlaying(false); setWaiting(false); }, [lessonId, page]);
  useEffect(() => {
    if (!result?.correct || !autoAdvance || mode !== 'exercise' || page !== 'learn' || modal || lessonLookup) return;
    const timer = setTimeout(() => {
      if (index + 1 < (lesson?.segments.length || 0)) playSegment(index + 1);
      else { player.current?.pause(); setNotice('Bạn đã hoàn thành câu cuối của bài học.'); }
    }, 750);
    return () => clearTimeout(timer);
  }, [result?.correct, autoAdvance, index, lessonId, page, mode, modal, lessonLookup]);
  useEffect(() => window.haru?.onYoutubeSelected?.(selectedUrl => { setUrl(selectedUrl); setImportTab('youtube'); setModal('import'); setError(''); }), []);

  const lesson = data?.lessons.find(item => item.id === lessonId);
  const segment = lesson?.segments[index];
  const question = useMemo(() => segment ? exercise(segment.text, difficulty) : null, [segment, difficulty]);
  const answerVisible = mode !== 'exercise' || !!(result?.correct || result?.revealed);
  const hiddenWords = useMemo(() => new Set(answerVisible ? [] : question?.blanks.map(blank => normalize(blank.word))), [question, answerVisible]);
  const visibleSavedWords = wordsInLesson => wordsInLesson.filter(word => !hiddenWords.has(normalize(word.word)));
  const maskedContext = segment?.text.split(/\s+/).map(word => hiddenWords.has(normalize(word)) ? '______' : word).join(' ');
  const completed = useMemo(() => new Set(data?.attempts.filter(a => a.correct && a.lessonId === lessonId).map(a => a.index)), [data, lessonId]);
  const due = data?.words.filter(word => word.due <= Math.max(clock, Date.now())) || [];
  const wordsInLesson = data?.words.filter(word => word.lessonId === lessonId) || [];
  const accuracy = data?.attempts.length ? Math.round(data.attempts.filter(a => a.correct).length / data.attempts.length * 100) : 0;
  const run = async (label, fn) => {
    if (busy) return;
    setBusy(label); setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const closeModal = () => { if (!busy) { setModal(null); setKey(''); setRestoring(null); setError(''); } };
  const openImport = () => { setModal('import'); setError(''); };
  const openLesson = item => { setLessonId(item.id); setIndex(0); setPage('learn'); };
  const speak = text => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ko-KR'; utterance.rate = 0.85;
    const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('ko'));
    if (voice) utterance.voice = voice;
    utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) setError('Chưa phát được giọng đọc. Hãy cài giọng Korean trong Windows Settings → Time & language → Speech.'); };
    speechSynthesis.speak(utterance);
  };
  const playSegment = (i = index) => {
    const item = lesson.segments[i];
    setIndex(i); setWaiting(false);
    playback.current = { time: null, state: -1, holding: null, target: i, requestedAt: performance.now() };
    if (!lesson.videoId) { speak(item.text); return; }
    player.current?.playFrom(item.offset);
  };
  const onVideoTime = ({ time, state }) => {
    if (!lesson?.videoId || !Number.isFinite(time)) return;
    setVideoTime(Math.floor(time)); setVideoPlaying(state === 1);
    const previous = playback.current;
    if (previous.target !== null && previous.target !== undefined) {
      const start = lesson.segments[previous.target]?.offset || 0;
      if ((Math.abs(time - start) > 0.5 || state === 3) && performance.now() - previous.requestedAt < 3500) return;
      previous.target = null; previous.time = null;
    }
    const jumped = previous.time !== null && Math.abs(time - previous.time) > 1.25;
    const priorTime = previous.time, priorState = previous.state;
    previous.time = time; previous.state = state;
    if (modal || lessonLookup || activeClip) { if (state === 1) player.current?.pause(); return; }
    if (previous.holding !== null) {
      if (jumped || (state === 1 && priorState === 2) || mode !== 'exercise' || !pauseForExercise) { previous.holding = null; setWaiting(false); }
      else return;
    }
    const boundary = segmentEnd(lesson.segments, index);
    if (mode === 'exercise' && pauseForExercise && !result?.correct && !result?.revealed && !completed.has(index) && state === 1 && priorState === 1 && !jumped && priorTime < boundary && time >= boundary - 0.025) {
      previous.holding = index; setWaiting(true); player.current?.pause();
      answerRefs.current[question?.blanks[0]?.index]?.focus({ preventScroll: true });
      return;
    }
    const next = segmentAtTime(lesson.segments, time);
    if (next >= 0 && next !== index) { setIndex(next); setWaiting(false); }
  };
  const lookup = text => {
    const term = text.trim(); if (!term) return;
    setLookupQuery(term); setModal(null); setError('');
    if (page === 'learn') { player.current?.pause(); setLessonLookup({ term, revision: Date.now() }); }
    else { setLookupTerm(term); setLookupRevision(value => value + 1); setPage('dictionary'); }
  };
  const updatePlaybackPreferences = patch => {
    const preferences = { ...data.preferences, autoAdvance, pauseForExercise, ...patch };
    setAutoAdvance(preferences.autoAdvance); setPauseForExercise(preferences.pauseForExercise);
    setData(previous => ({ ...previous, preferences }));
  };
  const exportWords = format => run(`Đang xuất ${format.toUpperCase()}…`, async () => {
    const words = data.words.filter(word => `${word.word} ${word.meaning}`.toLowerCase().includes(query.toLowerCase()));
    if (await window.haru.exportWords(format, words)) setNotice(`Đã xuất ${words.length} từ sang ${format.toUpperCase()}.`);
  });
  const check = () => {
    if (!question || result?.correct || result?.revealed) return;
    if (question.blanks.some(blank => !answers[blank.index]?.trim())) { setNotice('Điền đủ các ô trống trước khi kiểm tra nhé.'); return; }
    const correct = question.blanks.every(blank => correctAnswer(answers[blank.index], blank.word));
    setResult({ correct, lessonId, index, difficulty });
    setData(previous => ({ ...previous, attempts: [...previous.attempts, { lessonId, index, correct, at: Date.now() }], words: previous.words.map(word => { const blank = question.blanks.find(blank => normalize(blank.word) === normalize(word.word)); return blank ? recordWordResult(word, correctAnswer(answers[blank.index], blank.word)) : word; }) }));
  };
  const reveal = () => {
    setAnswers(Object.fromEntries(question.blanks.map(blank => [blank.index, normalize(blank.word)])));
    setResult({ correct: false, revealed: true, lessonId, index, difficulty });
    setData(previous => ({ ...previous, attempts: [...previous.attempts, { lessonId, index, correct: false, revealed: true, at: Date.now() }], words: previous.words.map(word => question.blanks.some(blank => normalize(blank.word) === normalize(word.word)) ? recordWordResult(word, false) : word) }));
  };
  const addLesson = item => {
    setData(previous => ({ ...previous, lessons: [item, ...previous.lessons] }));
    openLesson(item); setModal(null); setUrl(''); setSubtitleText(''); setImportTitle(''); setNotice('Bài học mới đã sẵn sàng.');
  };
  const importYoutube = () => run('Đang lấy phụ đề tiếng Hàn…', async () => {
    videoId(url);
    const item = await window.haru.youtube(url);
    addLesson(item);
  });
  const importText = () => run('Đang tạo bài học…', async () => {
    const segments = parseSubtitles(subtitleText);
    const id = url.trim() ? videoId(url) : null;
    addLesson({ id: crypto.randomUUID(), title: importTitle.trim() || 'Bài học của tôi', videoId: id, author: 'Phụ đề bạn nhập', source: 'import', createdAt: Date.now(), segments });
  });
  const translateLesson = () => run('Đang dịch Hàn–Việt…', async () => {
    const targetId = lesson.id;
    const translated = await window.haru.translate(lesson.segments);
    setData(previous => ({ ...previous, lessons: previous.lessons.map(item => item.id === targetId ? { ...item, segments: translated } : item) }));
    setNotice('Đã dịch toàn bộ bài học sang tiếng Việt.');
  });
  const openWord = word => { setWordDraft({ word: normalize(word || ''), meaning: '', note: '' }); setModal('word'); setError(''); };
  const saveWord = event => {
    event.preventDefault();
    const word = wordDraft.word.trim();
    if (!word || !wordDraft.meaning.trim()) return;
    if (data.words.some(item => normalize(item.word) === normalize(word))) { setError('Từ này đã có trong sổ từ vựng.'); return; }
    const fromDictionary = wordDraft.fromDictionary;
    setData(previous => ({ ...previous, words: [{ ...wordDraft, word, meaning: wordDraft.meaning.trim(), id: crypto.randomUUID(), lessonId: fromDictionary ? '' : lesson?.id || '', lessonTitle: fromDictionary ? 'Tra từ' : lesson?.title || '', context: fromDictionary ? wordDraft.context || '' : segment?.text || '', contextTranslation: fromDictionary ? wordDraft.contextTranslation || '' : segment?.translation || '', offset: fromDictionary ? 0 : segment?.offset || 0, ...(fromDictionary ? {} : videoSnapshot(lesson, index)), createdAt: Date.now(), level: 0, due: Date.now() }, ...previous.words] }));
    setModal(null); setNotice('Đã lưu từ vào sổ từ vựng.');
  };
  const grade = (id, remembered) => {
    setData(previous => ({ ...previous, words: previous.words.map(word => word.id === id ? scheduleReview(word, remembered) : word) }));
    setReviewQueue(previous => previous?.filter(item => item !== id) ?? null);
  };
  const saveStudyProgress = (id, progress, grade) => setData(previous => {
    if (grade && (previous.studyProgress?.[id]?.results.length || 0) > progress.index) return previous;
    return { ...previous, studyProgress: { ...previous.studyProgress, [id]: progress }, words: grade ? previous.words.map(word => word.catalogId === grade.entry.id || normalize(word.word) === normalize(grade.entry.word) ? scheduleReview(word, grade.correct) : word) : previous.words };
  });
  const openClip = (clip, hideText = false) => { player.current?.pause(); setClipError(''); setActiveClip({ clip, hideText }); };
  const saveTopicWords = (topic, entries) => {
    const existing = new Set(data.words.map(word => normalize(word.word)));
    const now = Date.now();
    const additions = entries.filter(entry => !existing.has(normalize(entry.word))).map(entry => ({ id: crypto.randomUUID(), word: entry.word, meaning: entry.meaning, note: [`Chủ đề: ${topic.title}`, entry.pos, entry.definition, entry.collocations?.length ? `Kết hợp: ${entry.collocations.join(' · ')}` : '', entry.usageNotes?.length ? `Ghi chú gốc: ${entry.usageNotes.join(' · ')}` : '', `Nguồn: NIKL · CC BY-SA 2.0 KR · ${entry.sourceUrl}`].filter(Boolean).join('\n'), lessonId: '', lessonTitle: `Chủ đề: ${topic.title}`, context: entry.examples?.[0]?.text || '', contextTranslation: '', examples: entry.examples, usageNotes: entry.usageNotes, sourceUrl: entry.sourceUrl, catalogId: entry.id, offset: 0, createdAt: now, level: 0, due: now }));
    if (!additions.length) { setNotice('Các từ này đã có trong sổ từ vựng.'); return; }
    setData(previous => ({ ...previous, words: [...additions, ...previous.words] }));
    setNotice(`Đã lưu ${additions.length} từ vào sổ và lịch ôn flashcard.`);
  };
  const navigate = next => { setPage(next); setQuery(''); setReviewQueue(null); setError(''); };
  const startPractice = ids => { navigate('review'); setReviewQueue(ids); };
  const restoreData = () => run('Đang khôi phục dữ liệu…', async () => {
    await window.haru.checkpoint();
    setData(preserveWordVideos(restoring)); setAutoAdvance(restoring.preferences?.autoAdvance ?? true); setPauseForExercise(restoring.preferences?.pauseForExercise ?? true); setLessonId(restoring.lessons[0]?.id || ''); setIndex(0); setReviewQueue(null); setRestoring(null); setModal(null); setNotice('Đã khôi phục dữ liệu.');
  });

  if (fatal) return <main className="fatal"><div className="brand-mark">하</div><h1>Haru chưa thể mở dữ liệu</h1><p>{fatal}</p><p>Dữ liệu nằm trong %APPDATA%\haru-korean. Hãy giữ lại tệp learning.json.</p><button onClick={() => location.reload()} className="primary">Thử lại</button></main>;
  if (!data) return <main className="fatal"><LoaderCircle className="spin" /><p>Đang mở góc học của bạn…</p></main>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">하</div><div><strong>haru<span>.</span></strong></div></div>
      
      <nav aria-label="Điều hướng chính">{navItems.map(([id, Icon, label]) => <button key={id} aria-label={label} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === 'review' && due.length > 0 && <b>{due.length}</b>}{id === 'mistakes' && data.words.some(isTroublesome) && <b>{data.words.filter(isTroublesome).length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings size={19} />Cài đặt</button><div className="profile"><div className="avatar">나</div><div><strong>Góc học của tôi</strong><small><span className={`status-dot ${saveStatus.includes('Chưa') ? 'red' : ''}`} />{saveStatus}</small></div><span className="local-label">LOCAL</span></div></div>
    </aside>

    <div className="main-shell"><header className="topbar"><div className="breadcrumb">Không gian của tôi <ChevronRight size={14} /><strong>{navItems.find(item => item[0] === page)?.[2] || 'Cài đặt'}</strong></div><form className="quick-lookup" onSubmit={e => { e.preventDefault(); if (lookupQuery.trim()) lookup(lookupQuery.trim()); }}><Search size={16} /><input aria-label="Tra nhanh từ tiếng Hàn" value={lookupQuery} onChange={e => setLookupQuery(e.target.value)} placeholder="Tra từ tiếng Hàn…" /><button type="submit">Tra từ</button></form></header>
    <main className="content">
      <div className="page-heading"><div><h1>{({ learn: 'Học cùng video', dictionary: 'Tra từ tiếng Hàn', topics: 'Từ vựng theo chủ đề', paths: 'Lộ trình chủ đề', usage: 'Cụm từ & từ dễ nhầm', mistakes: 'Từ hay sai', library: 'Thư viện bài học', words: 'Sổ từ vựng', review: 'Ôn tập flashcard', progress: 'Tiến độ học tập', settings: 'Cài đặt' })[page]}</h1><p className="muted">{({ learn: 'Phụ đề chạy theo video. Điền đúng để tự tiếp tục câu kế tiếp.', dictionary: 'Tìm nghĩa, nghe phát âm và lưu từ để ôn tập.', topics: 'Chọn chủ đề, nghe từ mới và lưu vào lịch ôn.', paths: 'Học từng chặng nhỏ, kiểm tra rồi đưa vào lịch ôn.', usage: 'Học cách các từ đi cùng nhau và phân biệt nghĩa trong ngữ cảnh.', mistakes: 'Tập trung vào những từ bạn thường quên hoặc trả lời sai.', library: 'Tìm video YouTube hoặc mở bài học đã lưu.', words: 'Tìm, ôn tập và xuất từ đã lưu ra tài liệu.', review: 'Ôn tập theo lịch giãn cách: 1, 3, 7, 14, 30 và 60 ngày.', progress: 'Mỗi câu bạn luyện, mỗi từ bạn nhớ đều được ghi lại.', settings: 'Kết nối dịch thuật và quản lý dữ liệu được lưu trên máy.' })[page]}</p></div><button className="primary" onClick={openImport}><Plus size={18} />Thêm bài học</button></div>

      {error && !modal && <div className="error-banner" role="alert"><CircleHelp size={18} /><span>{error}</span><button className="icon" aria-label="Đóng thông báo" onClick={() => setError('')}><X size={16} /></button></div>}
      {busy && <div className="busy-banner" role="status"><LoaderCircle size={17} className="spin" />{busy}</div>}

      {page === 'learn' && (lesson && segment ? <>
        <div className="lesson-bar"><div className="lesson-bar-title"><div className="small-icon"><BookOpen size={18} /></div><div><strong>{lesson.title}</strong><span>{lesson.source === 'demo' ? 'Bài mẫu · Giọng đọc tổng hợp' : lesson.author} <i />{lesson.segments.length} câu luyện tập</span></div></div><div className="lesson-bar-actions"><span className="pill">{completed.size}/{lesson.segments.length} câu đúng</span><button className="text-button purple" disabled={!!busy || lesson.segments.every(s => s.translation)} onClick={translateLesson}><Sparkles size={14} />{lesson.segments.every(s => s.translation) ? 'Đã có bản dịch' : 'Dịch Hàn–Việt'}</button><button className="text-button" onClick={() => navigate('library')}>Đổi bài học <ChevronRight size={15} /></button></div></div>
        <QuickLookup lookup={lessonLookup} words={visibleSavedWords(data.words)} onLookup={lookup} onClose={() => setLessonLookup(null)} onListen={speak} onSave={(word, meaning, note) => { setWordDraft({ word, meaning, note, fromDictionary: false }); setModal('word'); }} />
        <div className="learning-grid"><div className="learning-left">
          <section className="video-card">{lesson.videoId ? <><YouTubePlayer ref={player} videoId={lesson.videoId} title={lesson.title} onTime={onVideoTime} onError={setError} /><div className="video-footer"><span><Youtube size={16} />YouTube</span><button className="text-button" onClick={() => window.haru.openYoutube(lesson.videoId)}>Mở trên YouTube <ArrowUpRight size={14} /></button></div></> : <div className="sample-audio"><Volume2 size={24} /><div><strong>Bài luyện mẫu · {lesson.segments.length} câu</strong><p>Giọng đọc tổng hợp tiếng Hàn của Windows.</p></div><button className="secondary" onClick={() => playSegment()}><Play size={16} />Nghe câu này</button></div>}</section>
          {lesson.videoId && <LiveSubtitles segments={lesson.segments} index={index} time={videoTime} playing={videoPlaying} mode={mode} difficulty={difficulty} completed={completed} revealed={!!(result?.correct || result?.revealed)} showTranslation={showTranslation} onSelect={playSegment} />}
          <div className="playback-options"><label><input type="checkbox" checked={autoAdvance} onChange={e => updatePlaybackPreferences({ autoAdvance: e.target.checked })} />Tự sang câu khi đúng</label>{lesson.videoId && <label><input type="checkbox" checked={pauseForExercise} onChange={e => { updatePlaybackPreferences({ pauseForExercise: e.target.checked }); if (!e.target.checked) { playback.current.holding = null; setWaiting(false); } }} />Dừng cuối câu để điền</label>}{waiting && <span className="waiting-label">Đang chờ đáp án</span>}</div>


        </div><aside className="learning-right">
          <section className="exercise-card"><div className="section-toolbar"><div className="tabs"><button className={mode === 'exercise' ? 'selected' : ''} onClick={() => setMode('exercise')}><FileText size={16} />Điền từ còn thiếu</button><button className={mode === 'transcript' ? 'selected' : ''} onClick={() => setMode('transcript')}><BookOpen size={16} />Phụ đề đầy đủ</button></div><select aria-label="Độ khó" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="normal">Cơ bản · 1 từ</option><option value="hard">Thử thách · nhiều từ</option></select></div>
            {mode === 'exercise' ? <div className="exercise-body"><div className="exercise-meta"><span><span className="step-dot" />CÂU {String(index + 1).padStart(2, '0')} / {String(lesson.segments.length).padStart(2, '0')}</span><button className="text-button purple" onClick={() => playSegment()}><RotateCcw size={15} />Nghe lại câu này</button></div><form onSubmit={e => { e.preventDefault(); check(); }}><div className="korean-sentence" lang="ko">{question ? question.words.map((word, i) => question.blanks.some(blank => blank.index === i) && !answerVisible ? <input key={i} ref={el => answerRefs.current[i] = el} aria-label={`Từ còn thiếu ${i + 1}`} className={`blank-input ${result?.correct ? 'correct' : result && !result.revealed ? 'wrong' : ''}`} style={{ width: `${Math.max(4, Math.min(11, normalize(word).length + 1))}em` }} value={answers[i] || ''} placeholder="······" disabled={result?.correct || result?.revealed} autoComplete="off" spellCheck={false} onChange={e => { setAnswers(previous => ({ ...previous, [i]: e.target.value })); if (result) setResult(null); }} /> : <button type="button" className={`sentence-word ${question.blanks.some(blank => blank.index === i) ? 'answer-word' : ''}`} aria-label={`Lưu từ ${normalize(word)}`} key={i} onClick={() => lookup(normalize(word))}>{word}</button>) : segment.text}</div><div className="translation-row">{showTranslation ? <p>{segment.translation || 'Chưa có bản dịch. Chọn “Dịch Hàn–Việt” ở thanh bài học.'}</p> : <p className="muted">Bản dịch đang ẩn để bạn tập trung nghe.</p>}<button type="button" className="icon" onClick={() => setShowTranslation(value => !value)} aria-label={showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}>{showTranslation ? <Eye size={17} /> : <EyeOff size={17} />}</button></div>
              {result && <div className={`answer-feedback ${result.correct ? 'success' : result.revealed ? 'revealed' : 'incorrect'}`} role="status">{result.correct ? <CheckCircle2 size={18} /> : <CircleHelp size={18} />}<div><strong>{result.correct ? 'Chính xác! 잘했어요!' : result.revealed ? 'Đáp án để bạn ghi nhớ' : 'Chưa đúng, thử nghe lại nhé.'}</strong>{(result.revealed || result.correct) && <span lang="ko">{segment.text}</span>}</div></div>}
              <div className="exercise-actions"><div><button className="primary" type="submit" disabled={!question || result?.correct || result?.revealed}><Check size={17} />Kiểm tra đáp án</button><button type="button" className="text-button" onClick={reveal} disabled={!question || !!result?.correct || !!result?.revealed}>Xem đáp án</button></div><span className="keyboard-hint"><kbd>↵</kbd> để kiểm tra</span></div></form></div> : <div className="transcript-list">{lesson.segments.map((item, i) => <button key={i} className={`transcript-row ${index === i ? 'current' : ''}`} onClick={() => { playSegment(i); }}><time>{formatTime(item.offset)}</time><div><strong lang="ko">{item.text}</strong><span>{showTranslation && item.translation}</span></div>{completed.has(i) && <CheckCircle2 size={16} />}</button>)}</div>}
            <div className="sentence-navigation"><button disabled={index === 0} className="text-button" onClick={() => playSegment(index - 1)}><ChevronLeft size={16} />Câu trước</button><div className="sentence-dots">{lesson.segments.length <= 16 ? lesson.segments.map((_, i) => <button aria-label={`Đến câu ${i + 1}`} className={`${index === i ? 'current' : ''} ${completed.has(i) ? 'done' : ''}`} key={i} onClick={() => playSegment(i)} />) : <span>{index + 1} / {lesson.segments.length}</span>}</div><button disabled={index === lesson.segments.length - 1} className="text-button purple" onClick={() => playSegment(index + 1)}>Câu tiếp theo <ChevronRight size={16} /></button></div>
          </section>
          <section className="vocab-card"><div className="card-heading"><span className="small-icon lavender"><Bookmark size={18} /></span><h3>Từ vựng trong câu</h3><span className="count-badge">{segment.text.split(/\s+/).length}</span></div><p className="muted compact">Bấm từ gạch chân trong câu để lưu. Từ cần điền chỉ hiện sau khi kiểm tra đúng hoặc xem đáp án.</p><div className="word-chips">{segment.text.split(/\s+/).map((word, i) => hiddenWords.has(normalize(word)) ? <span className="masked-word-chip" key={i} aria-label="Từ cần điền đang ẩn">______</span> : <button lang="ko" key={i} onClick={() => lookup(normalize(word))}>{normalize(word)}<Plus size={13} /></button>)}</div><div className="saved-heading">ĐÃ LƯU TRONG BÀI <span>{wordsInLesson.length}</span></div>{visibleSavedWords(wordsInLesson).length ? <div className="saved-list">{visibleSavedWords(wordsInLesson).slice(0, 4).map(word => <div key={word.id}><strong lang="ko">{word.word}</strong><span>{word.meaning}</span><Check size={14} /></div>)}</div> : <div className="small-empty"><Bookmark size={24} strokeWidth={1.5} /><p>{wordsInLesson.length ? 'Từ đã lưu trùng đáp án đang được ẩn.' : 'Chưa có từ được lưu trong bài.'}</p></div>}<button className="card-footer-button" onClick={() => navigate('words')}>Mở sổ từ vựng <ArrowRight size={15} /></button></section>
        </aside></div>
      </> : <Empty icon={BookOpen} title="Bài học đầu tiên đang chờ bạn" text="Thêm một video YouTube hoặc nhập phụ đề tiếng Hàn để bắt đầu." action="Thêm bài học" onAction={openImport} />)}

      {page === 'library' && <><form className="youtube-search-bar" onSubmit={e => { e.preventDefault(); run('Đang mở tìm kiếm YouTube…', () => window.haru.searchYoutube(youtubeQuery)); }}><Youtube size={22} /><input aria-label="Tìm video YouTube" value={youtubeQuery} onChange={e => setYoutubeQuery(e.target.value)} placeholder="Tìm video trên YouTube, ví dụ: 한국어 일상 대화" /><button className="primary" disabled={!!busy || !youtubeQuery.trim()}><Search size={16} />Tìm trên YouTube</button></form><div className="list-toolbar"><span><strong>{data.lessons.length}</strong> bài học của bạn</span><SearchField value={query} set={setQuery} placeholder="Tìm bài học…" /></div><div className="library-grid">{data.lessons.filter(item => item.title.toLowerCase().includes(query.toLowerCase())).map(item => { const count = new Set(data.attempts.filter(a => a.lessonId === item.id && a.correct).map(a => a.index)).size; return <article className="library-card" key={item.id}><button className={`library-cover ${item.videoId ? 'has-image' : ''}`} onClick={() => openLesson(item)}>{item.videoId ? <img src={`https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`} alt="" /> : <div className="library-hangul">나의 하루<small>MY EVERYDAY KOREAN</small></div>}<span className="cover-badge">{item.source === 'demo' ? 'BÀI MẪU' : item.source === 'import' ? 'PHỤ ĐỀ NHẬP' : 'YOUTUBE'}</span><span className="cover-play"><Play size={20} fill="currentColor" /></span></button><div className="library-body"><p>{item.author}</p><h3>{item.title}</h3><div className="library-meta"><span>{item.segments.length} câu</span><span>{count} câu hoàn thành</span></div><div className="progress-track"><span style={{ width: `${count / Math.max(1, item.segments.length) * 100}%` }} /></div><div className="library-actions"><button className="text-button purple" onClick={() => openLesson(item)}>Vào học <ArrowRight size={15} /></button><button className="icon" aria-label={`Xóa bài ${item.title}`} onClick={() => setModal({ deleteLesson: item })}><Trash2 size={16} /></button></div></div></article>; })}<button className="new-lesson-card" onClick={openImport}><div><Plus size={26} /></div><h3>Thêm bài học</h3><p>Nhập link YouTube hoặc phụ đề.</p></button></div></>}

      {page === 'topics' && <Topics savedWords={data.words} onSaveWords={saveTopicWords} onListen={speak} onLookup={lookup} onStudy={topicId => { setPathTopic(topicId); navigate('paths'); }} />}

      {page === 'paths' && <StudyPath progress={data.studyProgress} onProgress={saveStudyProgress} onSaveWords={saveTopicWords} onListen={speak} initialTopic={pathTopic} />}
      {page === 'usage' && <Usage savedWords={data.words} onSaveWords={saveTopicWords} onListen={speak} onSavePhrase={(phrase, entry) => { setWordDraft({ word: phrase, meaning: '', note: `Cụm gốc từ ${entry.word} (${entry.meaning}) · NIKL · CC BY-SA 2.0 KR · ${entry.sourceUrl}`, context: entry.examples[0]?.text || '', examples: entry.examples, sourceUrl: entry.sourceUrl, fromDictionary: true, phrase: true }); setModal('word'); }} />}
      {page === 'mistakes' && <Mistakes words={data.words} onPractice={startPractice} onListen={speak} />}

      {page === 'dictionary' && <Dictionary key={`${lookupTerm}-${lookupRevision}`} term={lookupTerm} words={data.words} configured={settings.configured} onLookup={lookup} onListen={speak} onSave={(word, meaning, source) => { setWordDraft({ word, meaning, note: source, fromDictionary: true }); setModal('word'); }} />}

      {page === 'words' && <><div className="list-toolbar"><span><strong>{data.words.length}</strong> từ đã lưu · <span className="purple">{due.length} từ đến hạn ôn</span></span><div className="toolbar-buttons"><SearchField value={query} set={setQuery} placeholder="Tìm từ hoặc nghĩa…" /><button className="secondary" onClick={() => openWord('')}><Plus size={16} />Thêm từ</button><button className="primary" onClick={() => navigate('review')}><Layers size={16} />Ôn tập</button></div></div>{data.words.length > 0 && <div className="export-toolbar"><span>Xuất các từ đang hiển thị</span>{[['docx', 'Word'], ['pdf', 'PDF'], ['xlsx', 'Excel']].map(([format, label]) => <button className="secondary" key={format} disabled={!!busy} onClick={() => exportWords(format)}><Download size={15} />{label}</button>)}</div>}{data.words.length ? <div className="word-table"><div className="word-table-head"><span>TỪ TIẾNG HÀN</span><span>NGHĨA & NGỮ CẢNH</span><span>LỊCH ÔN</span><span /></div>{data.words.filter(word => `${word.word} ${word.meaning}`.toLowerCase().includes(query.toLowerCase())).map(word => <div className="word-table-row" key={word.id}><div className="word-with-audio"><button className="icon" onClick={() => speak(word.word)} aria-label={`Nghe ${word.word}`}><Volume2 size={17} /></button><strong lang="ko">{word.word}</strong></div><div><strong>{word.meaning}</strong><p lang="ko">{word.context}</p>{wordClip(word, data.lessons) && <button className="text-button purple word-video-button" onClick={() => openClip(wordClip(word, data.lessons))}><Youtube size={15} />Nghe trong video</button>}{word.note && <small>{word.note}</small>}</div><div><span className={`pill ${word.due <= Date.now() ? 'due-pill' : ''}`}>{word.due <= Date.now() ? 'Đến hạn ôn' : `Ôn ngày ${shortDate(word.due)}`}</span><small>Mức ghi nhớ {word.level}/6</small></div><button className="icon" aria-label={`Xóa từ ${word.word}`} onClick={() => setModal({ deleteWord: word })}><Trash2 size={16} /></button></div>)}</div> : <Empty icon={Bookmark} title="Một cuốn sổ, thật nhiều khả năng" text="Chọn từ trong bài học hoặc tự thêm từ cùng nghĩa tiếng Việt. Từ mới sẽ sẵn sàng để ôn ngay." action="Thêm từ đầu tiên" onAction={() => openWord('')} />}</>}

      {page === 'review' && <Review key={reviewQueue ? 'practice' : 'due'} practice={!!reviewQueue} due={reviewQueue ? data.words.filter(word => reviewQueue.includes(word.id)) : due} words={data.words} lessons={data.lessons} mode={data.preferences?.reviewMode || 'cloze'} onMode={reviewMode => updatePlaybackPreferences({ reviewMode })} onGrade={grade} onListen={speak} onClip={openClip} onHome={() => navigate('learn')} />}

      {page === 'progress' && <><div className="stat-grid">{[[BookOpen, data.lessons.length, 'Bài học trong thư viện'], [CheckCircle2, new Set(data.attempts.filter(a => a.correct).map(a => `${a.lessonId}:${a.index}`)).size, 'Câu đã hoàn thành'], [Bookmark, data.words.length, 'Từ vựng đã lưu'], [BarChart3, `${accuracy}%`, 'Tỷ lệ lượt trả lời đúng']].map(([Icon, number, label]) => <section className="stat-card" key={label}><span className="small-icon lavender"><Icon size={20} /></span><strong>{number}</strong><p>{label}</p></section>)}</div><section className="panel"><h3>Nhịp học 7 ngày gần đây</h3><p className="muted">Số lượt kiểm tra đáp án theo ngày, gồm cả các lượt thử lại.</p><div className="activity-chart">{Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - 6 + i); const count = data.attempts.filter(a => new Date(a.at).toDateString() === date.toDateString()).length; const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => { const d = new Date(); d.setDate(d.getDate() - 6 + j); return data.attempts.filter(a => new Date(a.at).toDateString() === d.toDateString()).length; })); return <div className="chart-column" key={i}><strong>{count}</strong><div className="chart-track"><span style={{ height: `${count / max * 100}%` }} /></div><small>{i === 6 ? 'Hôm nay' : shortDate(date)}</small></div>; })}</div></section></>}

      {page === 'settings' && <div className="settings-grid"><section className="panel"><span className="small-icon lavender"><Sparkles size={20} /></span><h2>Microsoft Translator</h2><p className="muted">Tự động dịch phụ đề tiếng Hàn sang tiếng Việt. Khóa được mã hóa bằng Windows và lưu riêng trên máy.</p><div className={`connection-status ${settings.configured ? 'connected' : ''}`}><span className="status-dot" />{settings.configured ? 'Đã cấu hình khóa dịch' : 'Chưa kết nối dịch thuật'}</div><form onSubmit={e => { e.preventDefault(); run('Đang lưu cấu hình…', async () => { const value = await window.haru.saveSettings({ key, region }); setSettings(value); setKey(''); setNotice('Đã lưu cấu hình Microsoft Translator.'); }); }}><label>Khóa API<input type="password" autoComplete="off" value={key} placeholder={settings.configured ? 'Để trống để giữ khóa hiện tại' : 'Dán khóa Microsoft Translator'} onChange={e => setKey(e.target.value)} /></label><label>Vùng tài nguyên (Region)<input value={region} placeholder="Ví dụ: southeastasia" onChange={e => setRegion(e.target.value.trim().toLowerCase())} pattern="[a-z0-9-]*" /></label><p className="field-help">Lấy Key và Region từ tài nguyên Translator trong Azure Portal. Để trống Region chỉ khi dùng tài nguyên global. Dịch thuật cần Internet và hạn mức trong tài khoản Azure.</p><div className="toolbar-buttons"><button disabled={!!busy} className="primary" type="submit"><Check size={16} />Lưu cấu hình</button>{settings.configured && <button disabled={!!busy} type="button" className="text-button" onClick={() => run('Đang xóa khóa…', async () => { setSettings(await window.haru.saveSettings({ key: '', region, clear: true })); setKey(''); })}>Xóa khóa đã lưu</button>}</div></form></section><div><section className="panel"><span className="small-icon mint"><FolderOpen size={20} /></span><h2>Dữ liệu thuộc về bạn</h2><p className="muted">Bài học, từ vựng và tiến độ được lưu trong thư mục dữ liệu ứng dụng Windows. Bản sao lưu không chứa khóa dịch.</p><div className="data-location"><strong>{dataLocation?.portable ? 'Chế độ mang theo máy (portable)' : 'Thư mục dữ liệu trên máy'}</strong><code>{dataLocation?.root || 'Đang đọc…'}</code><p>Từ điển: vocabulary.json · Từ đã lưu và lịch ôn: learning.json</p><p>Khi chuyển máy: chép cả Haru.exe và thư mục HaruData nằm cạnh ứng dụng, hoặc xuất gói chuyển máy rồi giải nén cạnh EXE trên máy mới.</p></div><div className="backup-actions"><button className="primary" disabled={!!busy} onClick={() => run('Đang tạo gói chuyển máy…', async () => { if (await window.haru.exportTransfer(data)) setNotice('Đã xuất gói chuyển máy gồm bộ từ, ví dụ và tiến độ học.'); })}><Download size={17} />Xuất gói chuyển máy (.zip)</button><button className="secondary" onClick={() => window.haru.openDataFolder()}><FolderOpen size={17} />Mở thư mục dữ liệu</button><button className="secondary" onClick={() => run('Đang xuất bản sao lưu…', async () => { if (await window.haru.exportBackup(data)) setNotice('Đã xuất bản sao lưu.'); })} disabled={!!busy}><Download size={17} />Xuất bản sao lưu</button><button className="secondary" onClick={() => run('Đang đọc bản sao lưu…', async () => { const value = await window.haru.importBackup(); if (value) { setRestoring(value); setModal('restore'); } })} disabled={!!busy}><Upload size={17} />Khôi phục dữ liệu</button></div></section><BackupHistory state={data} onPreview={value => { setRestoring(value); setModal('restore'); }} /><section className="panel about-panel"><div className="brand-mark">하</div><h3>Haru <span className="pill">v0.5.0</span></h3><p>Mỗi ngày một chút tiếng Hàn.</p><small>Ứng dụng Windows · Lưu dữ liệu cục bộ<br />Nguồn phụ đề tự động phụ thuộc khả năng truy cập YouTube. Nếu không lấy được, hãy nhập SRT, VTT hoặc văn bản.</small></section></div></div>}
    </main></div>

    {notice && <div className="toast" role="status"><CheckCircle2 size={18} />{notice}<button className="icon" aria-label="Đóng" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {activeClip && <Modal title="Nghe trong video" subtitle={activeClip.clip.title} close={() => setActiveClip(null)} wide><WordClip clip={activeClip.clip} hideText={activeClip.hideText} onError={setClipError} />{clipError && <div className="inline-error" role="alert">{clipError}</div>}</Modal>}
    {modal === 'import' && <Modal title="Một video, một bài học mới." subtitle="Bắt đầu từ nội dung bạn muốn nghe và hiểu." close={closeModal} wide><div className="import-tabs"><button className={importTab === 'youtube' ? 'selected' : ''} onClick={() => setImportTab('youtube')}><Youtube size={18} />Link YouTube</button><button className={importTab === 'text' ? 'selected' : ''} onClick={() => setImportTab('text')}><FileText size={18} />Nhập phụ đề</button></div><label>Đường dẫn video {importTab === 'text' && '(không bắt buộc)'}<div className="input-with-icon"><Link size={17} /><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></div></label>{importTab === 'youtube' ? <div className="import-info"><CircleHelp size={19} /><p>Haru tìm phụ đề <strong>tiếng Hàn</strong> để tạo bài điền từ. Video cần có phụ đề và cho phép nhúng. Nếu lấy tự động thất bại, chuyển sang “Nhập phụ đề”.</p></div> : <><label>Tên bài học<input value={importTitle} onChange={e => setImportTitle(e.target.value)} placeholder="Ví dụ: Gọi món tại quán cà phê" /></label><label>Phụ đề SRT, VTT hoặc văn bản<textarea rows={7} value={subtitleText} onChange={e => setSubtitleText(e.target.value)} placeholder={'안녕하세요. | Xin chào.\n커피 한 잔 주세요. | Cho tôi một cốc cà phê.'} /></label><button className="text-button purple" disabled={!!busy} onClick={() => run('Đang đọc phụ đề…', async () => { const text = await window.haru.openSubtitles(); if (text !== null) setSubtitleText(text); })}><Upload size={16} />Chọn tệp .srt, .vtt, .txt</button><p className="field-help">Văn bản: mỗi câu một dòng, thêm | để nhập nghĩa tiếng Việt. SRT/VTT giữ đúng mốc thời gian; văn bản thường dùng mốc 5 giây/câu.</p></>}{error && <div className="inline-error" role="alert">{error}</div>}<div className="modal-actions"><button className="secondary" disabled={!!busy} onClick={closeModal}>Để sau</button><button className="primary" disabled={!!busy || (importTab === 'youtube' ? !url.trim() : !subtitleText.trim())} onClick={importTab === 'youtube' ? importYoutube : importText}>{busy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{busy || 'Tạo bài học'}</button></div></Modal>}

    {modal === 'word' && <Modal title="Giữ lại một từ mới." subtitle="Thêm nghĩa của từ trong ngữ cảnh để lần sau nhớ dễ hơn." close={closeModal}><form onSubmit={saveWord}><label>Từ hoặc cụm từ tiếng Hàn<input lang="ko" required value={wordDraft.word} onChange={e => setWordDraft({ ...wordDraft, word: e.target.value })} maxLength={200} /></label>{wordDraft.phrase && <><p className="field-help">Điền nghĩa của cả cụm theo câu ví dụ, không chỉ nghĩa của từ gốc.</p><div className="context-preview"><strong lang="ko">{wordDraft.context}</strong></div></>}<label>Nghĩa tiếng Việt<input required value={wordDraft.meaning} onChange={e => setWordDraft({ ...wordDraft, meaning: e.target.value })} placeholder="Nhập nghĩa bạn muốn ghi nhớ" maxLength={500} /></label>{!wordDraft.fromDictionary && segment && <div className="context-preview"><strong lang="ko">{maskedContext}</strong><p>{segment.translation || 'Câu gốc sẽ được lưu cùng từ mới.'}</p></div>}<button type="button" className="text-button purple" onClick={() => lookup(wordDraft.word)}><Search size={16} />Tra nghĩa từ này</button><label>Ghi chú (không bắt buộc)<input value={wordDraft.note} onChange={e => setWordDraft({ ...wordDraft, note: e.target.value })} placeholder="Cách dùng, dạng từ điển, ví dụ…" maxLength={1000} /></label>{error && <div className="inline-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeModal}>Hủy</button><button className="primary" type="submit"><Bookmark size={17} />Lưu từ mới</button></div></form></Modal>}
    {modal?.deleteLesson && <Modal title="Xóa bài học này?" subtitle={`“${modal.deleteLesson.title}” và lịch sử luyện câu của bài sẽ được xóa. Các từ vựng đã lưu vẫn được giữ lại.`} close={closeModal}><div className="modal-actions"><button className="secondary" onClick={closeModal}>Giữ lại</button><button className="danger" onClick={() => { const id = modal.deleteLesson.id; setData(previous => ({ ...previous, lessons: previous.lessons.filter(item => item.id !== id), attempts: previous.attempts.filter(a => a.lessonId !== id) })); if (lessonId === id) { setLessonId(data.lessons.find(item => item.id !== id)?.id || ''); setIndex(0); } setModal(null); }}>Xóa bài học</button></div></Modal>}
    {modal?.deleteWord && <Modal title="Xóa từ đã lưu?" subtitle={`Từ “${modal.deleteWord.word}” và lịch ôn của từ này sẽ được xóa.`} close={closeModal}><div className="modal-actions"><button className="secondary" onClick={closeModal}>Giữ lại</button><button className="danger" onClick={() => { setData(previous => ({ ...previous, words: previous.words.filter(word => word.id !== modal.deleteWord.id) })); setModal(null); }}>Xóa từ</button></div></Modal>}
    {modal === 'restore' && restoring && <Modal title="Khôi phục bản sao lưu?" subtitle={`Bản sao lưu có ${restoring.lessons.length} bài học và ${restoring.words.length} từ. Thao tác này thay thế dữ liệu hiện tại. App sẽ lưu lại trạng thái hiện tại trước khi khôi phục.`} close={closeModal}>{error && <div className="inline-error" role="alert">{error}</div>}<div className="modal-actions"><button className="secondary" disabled={!!busy} onClick={closeModal}>Hủy</button><button className="primary" disabled={!!busy} onClick={restoreData}>Khôi phục</button></div></Modal>}
  </div>;
}

function SearchField({ value, set, placeholder }) { return <div className="search-field"><Search size={16} /><input aria-label={placeholder} value={value} onChange={e => set(e.target.value)} placeholder={placeholder} /></div>; }
function Empty({ icon: Icon, title, text, action, onAction }) { return <section className="empty-state"><div className="empty-icon"><Icon size={32} strokeWidth={1.5} /></div><h2>{title}</h2><p>{text}</p><button className="primary" onClick={onAction}>{action}<ArrowRight size={16} /></button></section>; }
