import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import YouTubePlayer from './YouTubePlayer.jsx';

const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
export default function WordClip({ clip, hideText, onError }) {
  const player = useRef();
  const [finished, setFinished] = useState(false);
  useEffect(() => { player.current?.playFrom(clip.start); }, [clip]);
  return <div className="word-clip">
    <YouTubePlayer ref={player} videoId={clip.videoId} title={clip.title} onError={onError} onTime={({ time: position, state }) => { if (position >= clip.end && state === 1) { player.current?.pause(); setFinished(true); } }} />
    <div className="clip-toolbar"><span>{time(clip.start)} – {time(clip.end)} · {finished ? 'Đã nghe hết đoạn' : 'Tự dừng cuối đoạn'}</span><button className="secondary" onClick={() => { setFinished(false); player.current?.playFrom(clip.start); }}><RotateCcw size={16} />Nghe lại đoạn này</button></div>
    <button className="text-button purple" onClick={() => window.haru.openYoutube(clip.videoId, clip.start)}>Mở đoạn trên YouTube <ArrowUpRight size={14} /></button>
    {!hideText && clip.text && <div className="context-preview"><strong lang="ko">{clip.text}</strong>{clip.translation && <p>{clip.translation}</p>}</div>}
    {hideText && <p className="field-help">Câu gốc đang ẩn trong lúc bạn điền từ. Hãy nghe để tìm đáp án.</p>}
  </div>;
}
