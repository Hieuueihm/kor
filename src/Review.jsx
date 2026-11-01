import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, CircleHelp, Layers, RotateCcw, Volume2, Youtube } from 'lucide-react';
import { correctAnswer } from '../shared/core.mjs';
import { reviewExercise, wordClip } from '../shared/review.mjs';

export default function Review({ due, words, lessons, mode, onMode, onGrade, onListen, onClip, onHome, practice = false }) {
  const [card, setCard] = useState(() => due[0] || null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [message, setMessage] = useState('');
  const committed = useRef(false);
  const firstInput = useRef();
  const question = useMemo(() => card ? reviewExercise(card) : null, [card]);
  const cloze = mode === 'cloze' && !!question;
  const clip = card && wordClip(card, lessons);
  useEffect(() => { if (!card && due.length) setCard(due[0]); }, [card, due]);
  useEffect(() => { firstInput.current?.focus(); }, [card?.id, mode]);
  const commit = remembered => {
    if (committed.current || !card) return;
    committed.current = true;
    setResult({ remembered }); setReviewed(count => count + 1);
    onGrade(card.id, remembered);
  };
  const check = event => {
    event.preventDefault();
    if (question.blanks.some((_, index) => !answers[index]?.trim())) { setMessage('Điền đủ các ô trống trước khi kiểm tra nhé.'); return; }
    setMessage(''); commit(question.blanks.every((answer, index) => correctAnswer(answers[index], answer)));
  };
  const next = () => {
    setCard(due.find(word => word.id !== card.id) || null);
    setAnswers({}); setResult(null); setFlipped(false); setMessage(''); committed.current = false;
  };
  return <div className="review-container">
    <div className="review-summary"><span><Layers size={17} />{due.length} {practice ? 'từ trong lượt luyện riêng' : 'từ đến hạn'}</span><span>{reviewed} từ đã ôn trong phiên</span></div>
    <div className="tabs review-modes" aria-label="Kiểu ôn tập"><button className={mode === 'cloze' ? 'selected' : ''} disabled={!!result} onClick={() => { onMode('cloze'); setFlipped(false); }}>Điền từ trong câu</button><button className={mode === 'flashcard' ? 'selected' : ''} disabled={!!result} onClick={() => { onMode('flashcard'); setFlipped(false); }}>Lật thẻ</button></div>
    {card ? <>
      {cloze ? <section className="cloze-card panel"><div className="eyebrow">NHỚ TỪ QUA NGỮ CẢNH</div><h2>{card.meaning}</h2><p className="field-help">Điền đúng dạng từ trong câu, gồm cả trợ từ hoặc đuôi chia nếu có.</p>
        <form onSubmit={check}>
          <div className="review-sentence" lang="ko">{question.parts.map((part, index) => <React.Fragment key={index}>{part}{index < question.blanks.length && (result ? <strong className="cloze-answer">{question.blanks[index]}</strong> : <input ref={index === 0 ? firstInput : undefined} aria-label={`Từ cần ôn ${index + 1}`} value={answers[index] || ''} onChange={event => { setAnswers(previous => ({ ...previous, [index]: event.target.value })); setMessage(''); }} autoComplete="off" spellCheck={false} placeholder="······" className="blank-input" />)}</React.Fragment>)}</div>
          {message && <p className="lookup-error" role="alert">{message}</p>}
          {!result && <div className="exercise-actions"><button className="primary" type="submit"><Check size={17} />Kiểm tra từ</button><button className="text-button" type="button" onClick={() => commit(false)}>Xem đáp án</button></div>}
        </form>
        {result && <div className={`answer-feedback ${result.remembered ? 'success' : 'incorrect'}`} role="status">{result.remembered ? <CheckCircle2 size={19} /> : <CircleHelp size={19} />}<div><strong>{result.remembered ? 'Chính xác! Đã giãn lịch ôn.' : 'Đã lưu để ôn lại sau 10 phút.'}</strong><span lang="ko">{card.word}{!result.remembered && Object.values(answers).some(Boolean) ? ` · Bạn đã điền: ${Object.values(answers).join(' / ')}` : ''}</span></div></div>}
        {result && card.contextTranslation && <p className="review-context-translation">{card.contextTranslation}</p>}
      </section> : <>
        {mode === 'cloze' && <p className="review-hint">Chưa tìm được dạng từ rõ ràng trong ví dụ. Ôn bằng lật thẻ cho từ này nhé.</p>}
        <button className={`flashcard ${flipped ? 'flipped' : ''}`} disabled={!!result} onClick={() => setFlipped(value => !value)}><div className="eyebrow">{flipped ? 'NGHĨA TIẾNG VIỆT' : 'BẠN CÒN NHỚ TỪ NÀY CHỨ?'}</div><h2 lang={flipped ? 'vi' : 'ko'}>{flipped ? card.meaning : card.word}</h2><p lang="ko">{flipped ? card.contextTranslation : card.context}</p>{flipped && card.note && <p>{card.note}</p>}<span><RotateCcw size={15} />Nhấn để {flipped ? 'xem từ tiếng Hàn' : 'lật thẻ, xem nghĩa'}</span></button>
        {!result && flipped && <div className="review-actions"><button className="secondary" onClick={() => commit(false)}><RotateCcw size={17} />Chưa nhớ <small>Ôn lại sau 10 phút</small></button><button className="primary" onClick={() => commit(true)}><Check size={17} />Đã nhớ <small>Ôn tiếp sau {[1, 3, 7, 14, 30, 60, 60][card.level]} ngày</small></button></div>}
      </>}
      <div className="review-media">{clip && <button className="secondary" onClick={() => onClip(clip, !result && cloze)}><Youtube size={17} />Nghe trong video</button>}{(!cloze || result) && <button className="text-button audio-button" onClick={() => onListen(card.word)}><Volume2 size={18} />Nghe phát âm</button>}</div>
      {result ? <div className="review-next"><p>{result.remembered ? `Lần ôn tiếp theo sau ${[1, 3, 7, 14, 30, 60, 60][card.level]} ngày.` : 'Từ này sẽ xuất hiện lại sau 10 phút.'}</p><button className="primary" onClick={next}>Từ tiếp theo <ArrowRight size={17} /></button></div> : !cloze && !flipped && <p className="review-hint">Thử nhớ nghĩa trước khi lật thẻ nhé.</p>}
    </> : <section className="empty-state"><div className="empty-icon"><CheckCircle2 size={32} /></div><h2>{words.length ? 'Hôm nay bạn đã làm rất tốt.' : 'Thêm từ mới để bắt đầu ôn tập'}</h2><p>{words.length ? `Bạn đã ôn ${reviewed} từ trong phiên. Lần ôn tới: ${new Date(Math.min(...words.map(word => word.due))).toLocaleString('vi-VN')}.` : 'Những từ bạn lưu trong sổ sẽ trở thành thẻ ôn tập ở đây.'}</p><button className="primary" onClick={onHome}>Về góc học tập <ArrowRight size={16} /></button></section>}
  </div>;
}
