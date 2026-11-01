import { normalize, segmentEnd } from './core.mjs';

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const particles = /^(?:은|는|이|가|을|를|에|에서|에게|께|와|과|도|만|으로|로|의|부터|까지|보다|처럼|하고|이나|나|이라도|라도|이라고|라고|이랑|랑|들)(?:[가-힣]*)$/u;
// Only recognizable regular endings; uncertain/irregular forms fall back to a flashcard.
const endings = /^(?:다|어요|아요|여요|었|았|였|고|는|지|게|기|으|은|을|어|아|여|던|더|자|네|나|니|습니다|습니까|소|세요|도록|지만|거나|든)[가-힣]*$/u;

function inSentence(sentence, headword) {
  const source = sentence.normalize('NFC');
  const exact = new RegExp(`(?<![\\p{L}\\p{N}])${escape(headword)}(?=$|[\\s\\p{P}\\p{S}]|[가-힣])`, 'gu');
  const ranges = [];
  for (const match of source.matchAll(exact)) {
    const suffix = source.slice(match.index + match[0].length).match(/^[가-힣]+/u)?.[0] || '';
    if (!suffix || particles.test(suffix)) ranges.push({ start: match.index, end: match.index + match[0].length + suffix.length });
  }
  if (headword.endsWith('다') && headword.length > 1 && !headword.includes(' ')) {
    const stem = headword.slice(0, -1);
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(stem)}([가-힣]+)`, 'gu');
    for (const match of source.matchAll(pattern)) if (endings.test(match[1]) && !ranges.some(range => range.start === match.index)) ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  if (!ranges.length) return null;
  ranges.sort((a, b) => a.start - b.start);
  const parts = [], blanks = [];
  let cursor = 0;
  for (const range of ranges) {
    parts.push(source.slice(cursor, range.start));
    blanks.push(source.slice(range.start, range.end));
    cursor = range.end;
  }
  parts.push(source.slice(cursor));
  return { text: source, parts, blanks };
}

export function reviewExercise(card) {
  const headword = normalize(card.word);
  if (!headword || !/[가-힣]/u.test(headword)) return null;
  const candidates = [card.context, ...(Array.isArray(card.examples) ? card.examples.map(example => typeof example === 'string' ? example : example?.text) : [])];
  for (const text of candidates) {
    if (typeof text !== 'string' || !text.trim()) continue;
    const result = inSentence(text, headword);
    if (result) return result;
  }
  return null;
}

export function wordClip(word, lessons = []) {
  const lesson = lessons.find(item => item.id === word.lessonId);
  const id = word.videoId || lesson?.videoId;
  if (!/^[\w-]{11}$/.test(id || '') || !Number.isFinite(word.offset) || word.offset < 0) return null;
  const index = lesson?.segments.findIndex(segment => Math.abs(segment.offset - word.offset) < 0.01 && (!word.context || segment.text === word.context)) ?? -1;
  const duration = word.duration > 0 && Number.isFinite(word.duration) ? word.duration : index >= 0 ? segmentEnd(lesson.segments, index) - word.offset : 0;
  if (!(duration > 0)) return null;
  return { videoId: id, start: word.offset, end: word.offset + Math.min(duration, 120), title: word.lessonTitle || lesson?.title || 'Video đã lưu', text: word.context || '', translation: word.contextTranslation || '' };
}

export function videoSnapshot(lesson, index) {
  if (!lesson?.videoId || !lesson.segments[index]) return {};
  return { videoId: lesson.videoId, duration: segmentEnd(lesson.segments, index) - lesson.segments[index].offset };
}

export function preserveWordVideos(state) {
  return { ...state, words: state.words.map(word => {
    if (word.videoId && word.duration > 0) return word;
    const clip = wordClip(word, state.lessons);
    return clip ? { ...word, videoId: clip.videoId, duration: clip.end - clip.start } : word;
  }) };
}
