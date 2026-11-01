export const DAY = 86400000;
// Last cue that has started; keep it selected through gaps until the next cue.
export function segmentAtTime(segments, time) {
  if (!segments.length || !Number.isFinite(time)) return -1;
  let low = 0, high = segments.length - 1, result = 0;
  while (low <= high) { const middle = (low + high) >> 1; if (segments[middle].offset <= time) { result = middle; low = middle + 1; } else high = middle - 1; }
  return result;
}
export function segmentEnd(segments, index) {
  const item = segments[index];
  const next = segments[index + 1];
  return next && next.offset > item.offset ? Math.min(item.offset + item.duration, next.offset) : item.offset + item.duration;
}
export function videoId(input) {
  const value = String(input ?? '').trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { throw new Error('Hãy nhập đường dẫn YouTube hợp lệ.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Đường dẫn YouTube không hợp lệ.');
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    id = url.searchParams.get('v') || (/^\/(shorts|embed|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : '');
  }
  if (!/^[\w-]{11}$/.test(id ?? '')) throw new Error('Không tìm thấy mã video trong đường dẫn YouTube.');
  return id;
}
export function normalize(text) {
  return String(text ?? '').normalize('NFC').toLocaleLowerCase('ko').replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, ' ').trim();
}
export function correctAnswer(answer, expected) { return !!normalize(answer) && normalize(answer) === normalize(expected); }
export function exercise(text, difficulty = 'normal') {
  const words = text.trim().split(/\s+/);
  const candidates = words.map((word, index) => ({ word, index })).filter(x => /[가-힣]/.test(x.word));
  if (!candidates.length) return null;
  const count = difficulty === 'hard' ? Math.max(1, Math.ceil(candidates.length / 2)) : 1;
  const chosen = [...candidates].sort((a, b) => normalize(b.word).length - normalize(a.word).length || a.index - b.index).slice(0, count);
  const selectedWords = new Set(chosen.map(item => normalize(item.word)));
  return { words, blanks: candidates.filter(item => selectedWords.has(normalize(item.word))) };
}
export function decodeEntities(text) {
  return String(text).replace(/&(?:amp|lt|gt|quot|apos|#39|#(\d+)|#x([\da-f]+));/gi, (m, dec, hex) => {
    const code = dec ? Number(dec) : hex ? parseInt(hex, 16) : null;
    if (code !== null) return code <= 0x10ffff ? String.fromCodePoint(code) : m;
    return { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" }[m.toLowerCase()] || m;
  });
}
function timestamp(value) {
  const pieces = value.replace(',', '.').split(':').map(Number);
  if (pieces.some(x => !Number.isFinite(x)) || pieces.length < 2 || pieces.length > 3) return NaN;
  return pieces.reduce((total, piece) => total * 60 + piece, 0);
}
export function parseSubtitles(input) {
  const text = String(input).replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
  if (!text || text.length > 2_000_000) throw new Error('Phụ đề trống hoặc lớn hơn 2 MB.');
  const segments = [];
  if (text.includes('-->')) {
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split('\n');
      const index = lines.findIndex(line => line.includes('-->'));
      if (index < 0) continue;
      const times = lines[index].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
      if (!times) continue;
      const offset = timestamp(times[1]), end = timestamp(times[2]);
      const content = decodeEntities(lines.slice(index + 1).join(' ').replace(/<[^>]*>/g, '').trim());
      if (Number.isFinite(offset) && offset >= 0 && end > offset && content) segments.push({ text: content, offset, duration: end - offset, translation: '' });
    }
  } else {
    text.split('\n').filter(line => line.trim()).forEach((line, index) => {
      const [source, ...translation] = line.split('|');
      if (source.trim()) segments.push({ text: source.trim(), translation: translation.join('|').trim(), offset: index * 5, duration: 5 });
    });
  }
  const korean = segments.filter(segment => /[가-힣]/.test(segment.text)).sort((a, b) => a.offset - b.offset);
  if (!korean.length) throw new Error('Không tìm thấy câu tiếng Hàn. Dùng SRT/VTT hoặc mỗi dòng: tiếng Hàn | nghĩa tiếng Việt.');
  return korean.slice(0, 2000);
}
export function scheduleReview(card, remembered, now = Date.now()) {
  const level = remembered ? Math.min((card.level || 0) + 1, 6) : 0;
  const days = [0, 1, 3, 7, 14, 30, 60][level];
  return { ...recordWordResult(card, remembered, now), level, due: now + (remembered ? days * DAY : 10 * 60000), reviewedAt: now };
}
export function recordWordResult(card, remembered, now = Date.now()) {
  const prior = card.reviewStats || {};
  return { ...card, reviewStats: { total: (prior.total || 0) + 1, failures: (prior.failures || 0) + (remembered ? 0 : 1), correctStreak: remembered ? (prior.correctStreak || 0) + 1 : 0, lastAt: now, lastCorrect: remembered } };
}
export function isTroublesome(card) { return (card.reviewStats?.failures || 0) >= 2 && (card.reviewStats?.correctStreak || 0) < 3; }
export function validateState(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.lessons) || !Array.isArray(value.words) || !Array.isArray(value.attempts)) throw new Error('Tệp dữ liệu Haru không đúng định dạng.');
  if (value.lessons.length > 200 || value.words.length > 20000 || value.attempts.length > 100000) throw new Error('Tệp dữ liệu vượt giới hạn.');
  if (value.preferences && (typeof value.preferences.autoAdvance !== 'boolean' || typeof value.preferences.pauseForExercise !== 'boolean')) throw new Error('Tùy chọn phát không hợp lệ.');
  if (value.preferences?.reviewMode != null && !['cloze', 'flashcard'].includes(value.preferences.reviewMode)) throw new Error('Kiểu ôn tập không hợp lệ.');
  for (const lesson of value.lessons) {
    if (typeof lesson.id !== 'string' || typeof lesson.title !== 'string' || !Array.isArray(lesson.segments) || lesson.segments.length > 2000 || (lesson.videoId && !/^[\w-]{11}$/.test(lesson.videoId))) throw new Error('Bài học không hợp lệ.');
    for (const segment of lesson.segments) if (typeof segment.text !== 'string' || segment.text.length > 10000 || !Number.isFinite(segment.offset) || segment.offset < 0 || !Number.isFinite(segment.duration) || segment.duration <= 0 || (segment.translation != null && typeof segment.translation !== 'string')) throw new Error('Phụ đề không hợp lệ.');
  }
  for (const word of value.words) {
    if (typeof word.id !== 'string' || typeof word.word !== 'string' || typeof word.meaning !== 'string' || !Number.isFinite(word.due) || !Number.isInteger(word.level) || word.level < 0 || word.level > 6) throw new Error('Từ vựng không hợp lệ.');
    if (word.videoId != null && !/^[\w-]{11}$/.test(word.videoId)) throw new Error('Video của từ vựng không hợp lệ.');
    if (word.videoId && (!Number.isFinite(word.offset) || word.offset < 0 || !Number.isFinite(word.duration) || word.duration <= 0)) throw new Error('Mốc video của từ vựng không hợp lệ.');
    if (word.reviewStats && (!['total', 'failures', 'correctStreak'].every(key => Number.isInteger(word.reviewStats[key]) && word.reviewStats[key] >= 0) || word.reviewStats.failures > word.reviewStats.total || word.reviewStats.correctStreak > word.reviewStats.total || !Number.isFinite(word.reviewStats.lastAt) || typeof word.reviewStats.lastCorrect !== 'boolean')) throw new Error('Thống kê ôn từ không hợp lệ.');
  }
  if (value.studyProgress) {
    if (typeof value.studyProgress !== 'object' || Array.isArray(value.studyProgress) || Object.keys(value.studyProgress).length > 5000) throw new Error('Tiến độ lộ trình không hợp lệ.');
    for (const item of Object.values(value.studyProgress)) if (!item || !['study', 'quiz', 'done'].includes(item.phase) || !Number.isInteger(item.index) || item.index < 0 || item.index > 15 || !Array.isArray(item.results) || item.results.length > 15 || item.results.some(result => typeof result !== 'boolean') || !Number.isFinite(item.updatedAt) || !Array.isArray(item.entryIds) || item.entryIds.length > 15 || item.entryIds.some(id => typeof id !== 'string')) throw new Error('Chặng học không hợp lệ.');
  }
  for (const attempt of value.attempts) if (typeof attempt.lessonId !== 'string' || !Number.isInteger(attempt.index) || attempt.index < 0 || typeof attempt.correct !== 'boolean' || !Number.isFinite(attempt.at)) throw new Error('Tiến độ không hợp lệ.');
  return value;
}
export function initialState() {
  const lines = [
    ['안녕하세요. 만나서 반갑습니다.', 'Xin chào. Rất vui được gặp bạn.'],
    ['저는 매일 한국어를 공부해요.', 'Tôi học tiếng Hàn mỗi ngày.'],
    ['오늘 날씨가 정말 좋아요.', 'Hôm nay thời tiết thật đẹp.'],
    ['저는 아침에 커피를 마셔요.', 'Tôi uống cà phê vào buổi sáng.'],
    ['주말에 친구하고 영화를 봐요.', 'Cuối tuần tôi xem phim với bạn.'],
    ['이 음식은 정말 맛있어요.', 'Món ăn này thật sự rất ngon.'],
    ['도서관에서 책을 읽어요.', 'Tôi đọc sách ở thư viện.'],
    ['내일 다시 만나요.', 'Hẹn gặp lại ngày mai.']
  ];
  return { version: 1, lessons: [{ id: 'demo', title: 'Một ngày thật bình thường', author: 'Haru · Bài học mẫu', videoId: null, source: 'demo', createdAt: Date.now(), segments: lines.map(([text, translation], index) => ({ text, translation, offset: index * 5, duration: 5 })) }], words: [], attempts: [] };
}
