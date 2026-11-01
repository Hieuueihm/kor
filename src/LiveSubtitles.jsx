import React, { useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import { exercise } from '../shared/core.mjs';
const stamp = time => `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
export default function LiveSubtitles({ segments, index, time, playing, mode, difficulty, completed, revealed, showTranslation, onSelect }) {
  const list = useRef();
  const active = useRef();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = useMemo(() => segments.map(item => {
    const question = exercise(item.text, difficulty);
    return question ? question.words.map((word, i) => question.blanks.some(blank => blank.index === i) ? '______' : word).join(' ') : item.text;
  }), [segments, difficulty]);
  useEffect(() => {
    if (list.current && active.current) list.current.scrollTo({ top: active.current.offsetTop - list.current.clientHeight / 2 + active.current.clientHeight / 2, behavior: reduced ? 'instant' : 'smooth' });
  }, [index, mode]);
  return <section className="live-subtitles"><div className="live-subtitle-heading"><strong>Phụ đề theo video</strong><span><i className={playing ? 'playing' : ''} />{stamp(time)}</span></div><div ref={list} className="live-subtitle-list" aria-label="Phụ đề đồng bộ">{segments.map((item, i) => <button ref={i === index ? active : null} aria-current={i === index ? 'true' : undefined} className={`live-subtitle-row ${i === index ? 'current' : ''}`} key={i} onClick={() => onSelect(i)}><time>{stamp(item.offset)}</time><div><strong lang="ko">{mode === 'exercise' && (i === index ? !revealed : !completed.has(i)) ? lines[i] : item.text}</strong>{showTranslation && item.translation && <span>{item.translation}</span>}</div>{completed.has(i) && <Check size={14} />}</button>)}</div></section>;
}
