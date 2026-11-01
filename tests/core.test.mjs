import test from 'node:test';
import assert from 'node:assert/strict';
import { videoId, correctAnswer, exercise, parseSubtitles, scheduleReview, validateState, initialState, DAY, decodeEntities, segmentAtTime, segmentEnd } from '../shared/core.mjs';
import dictionary from '../electron/dictionary.cjs';

test('timeline follows seek, gaps, overlaps, duplicate starts and final cue', () => {
  const cues = [{ offset: 3, duration: 4 }, { offset: 9, duration: 5 }, { offset: 12, duration: 4 }, { offset: 12, duration: 2 }];
  assert.equal(segmentAtTime(cues, 0), 0);
  assert.equal(segmentAtTime(cues, 7.5), 0);
  assert.equal(segmentAtTime(cues, 9), 1);
  assert.equal(segmentAtTime(cues, 12), 3);
  assert.equal(segmentAtTime(cues, 4), 0);
  assert.equal(segmentAtTime(cues, 999), 3);
  assert.equal(segmentAtTime([], 0), -1);
  assert.equal(segmentEnd(cues, 1), 12);
  assert.equal(segmentEnd(cues, 3), 14);
});
test('dictionary extracts only Korean definitions, including adjectives', () => {
  assert.deepEqual(dictionary.definitionsFromWiki('{{-kor-}}\n{{-adj-}}\n# [[đẹp|Đẹp]].\n#: Một ví dụ\n{{-eng-}}\n# Wrong language'), ['Đẹp.']);
  assert.deepEqual(dictionary.definitionsFromWiki('{{-eng-}}\n# no Korean'), []);
});

test('YouTube links accept supported forms and reject other hosts/protocols', () => {
  for (const url of ['https://www.youtube.com/watch?v=abcdefghijk&t=42', 'https://youtu.be/abcdefghijk?si=xx', 'https://m.youtube.com/shorts/abcdefghijk', 'https://youtube.com/live/abcdefghijk', 'abcdefghijk']) assert.equal(videoId(url), 'abcdefghijk');
  for (const url of ['https://youtube.com.evil.test/watch?v=abcdefghijk', 'file:///abcdefghijk', 'javascript:alert(1)', 'https://youtu.be/abc', 'https://evil.test/abcdefghijk']) assert.throws(() => videoId(url));
});
test('answer checking tolerates punctuation and NFC but preserves Korean spelling and word boundaries', () => {
  assert.ok(correctAnswer('반갑습니다', '반갑습니다.'));
  assert.ok(correctAnswer('  한국어를  ', '한국어를'));
  assert.ok(correctAnswer('한'.normalize('NFD'), '한'));
  assert.equal(correctAnswer('한 국어', '한국어'), false);
  assert.equal(correctAnswer('', '.'), false);
  assert.equal(correctAnswer('반갑슴니다', '반갑습니다.'), false);
});
test('exercises choose Korean words deterministically and increase blanks for hard mode', () => {
  const text = '저는 매일 한국어를 공부해요.';
  assert.equal(exercise(text).blanks.length, 1);
  assert.equal(exercise(text, 'hard').blanks.length, 2);
  assert.equal(exercise('hello world'), null);
  const repeated = exercise('안녕하세요 안녕하세요.');
  assert.equal(repeated.blanks.length, 2, 'every repeated occurrence of the answer is hidden');
});
test('SRT parser preserves fractional timings, multiline cues, and decoded text', () => {
  const segments = parseSubtitles('1\r\n00:00:01,250 --> 00:00:03,500\r\n<b>안녕하세요.</b>\r\n반갑습니다.\r\n\r\n2\r\n00:01:00,000 --> 00:01:03,000\r\n커피 &amp; 차\r\n');
  assert.equal(segments.length, 2);
  assert.equal(segments[0].offset, 1.25);
  assert.equal(segments[0].duration, 2.25);
  assert.equal(segments[0].text, '안녕하세요. 반갑습니다.');
  assert.equal(segments[1].offset, 60);
  assert.equal(segments[1].text, '커피 & 차');
});
test('VTT accepts short timestamps/settings; plain text keeps optional Vietnamese meanings', () => {
  const vtt = parseSubtitles('WEBVTT\n\n00:01.500 --> 00:04.000 align:start\n안녕하세요.\n\n00:07.000 --> 00:08.000\n감사합니다.');
  assert.equal(vtt[0].offset, 1.5);
  assert.equal(vtt[1].duration, 1);
  const plain = parseSubtitles('안녕하세요. | Xin chào.\n고마워요. | Cảm ơn.');
  assert.equal(plain[0].translation, 'Xin chào.');
  assert.equal(plain[1].offset, 5);
  assert.throws(() => parseSubtitles('hello world'));
  assert.throws(() => parseSubtitles('1\n00:00:09,000 --> 00:00:02,000\n안녕'));
  assert.equal(decodeEntities('&#54620;&#xAE00;'), '한글');
});
test('review scheduling advances with recall and resets after forgetting', () => {
  const first = scheduleReview({ level: 0 }, true, 1000);
  assert.equal(first.due, 1000 + DAY);
  assert.equal(scheduleReview(first, true, 2000).due, 2000 + 3 * DAY);
  const forgotten = scheduleReview({ level: 5 }, false, 1000);
  assert.equal(forgotten.level, 0);
  assert.equal(forgotten.due, 601000);
  assert.equal(scheduleReview({ level: 6 }, true, 0).due, 60 * DAY);
});
test('backup validation rejects malformed nested objects before replacement', () => {
  assert.doesNotThrow(() => validateState(initialState()));
  assert.throws(() => validateState({ version: 1, lessons: [], words: [{}], attempts: [] }));
  const invalid = initialState(); invalid.lessons[0].segments[0].offset = -1;
  assert.throws(() => validateState(invalid));
  const injected = initialState(); injected.lessons[0].videoId = 'bad?x=javascript';
  assert.throws(() => validateState(injected));
  assert.throws(() => validateState({ ...initialState(), attempts: [{ correct: true }] }));
});
