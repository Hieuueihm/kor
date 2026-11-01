import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewExercise, wordClip, videoSnapshot, preserveWordVideos } from '../shared/review.mjs';
import { initialState, validateState } from '../shared/core.mjs';

test('review masks repeated occurrences, particles, regular endings and phrase boundaries', () => {
  const noun = reviewExercise({ word: '밥', context: '밥을 먹어요. 밥이 맛있어요. 김밥은 달라요.' });
  assert.deepEqual(noun.blanks, ['밥을', '밥이']);
  assert.equal(noun.parts.join('______'), '______ 먹어요. ______ 맛있어요. 김밥은 달라요.');
  assert.deepEqual(reviewExercise({ word: '먹다', context: '먹어요. 먹고 먹었다.' }).blanks, ['먹어요', '먹고', '먹었다']);
  assert.deepEqual(reviewExercise({ word: '공부해요', context: '저는 공부해요. 공부해요!' }).blanks, ['공부해요', '공부해요']);
  assert.deepEqual(reviewExercise({ word: '할 수 있다', context: '나는 할 수 있다.' }).blanks, ['할 수 있다']);
  assert.equal(reviewExercise({ word: '차', context: '자동차가 와요.' }), null);
  assert.equal(reviewExercise({ word: '먹다', context: '먹음직스러워요.' }), null);
});

test('review uses alternative examples and NFC; uncertain conjugations have a flashcard fallback', () => {
  assert.deepEqual(reviewExercise({ word: '학교', context: '', examples: [{ text: '학교에 가요.'.normalize('NFD') }] }).blanks, ['학교에']);
  assert.equal(reviewExercise({ word: '듣다', context: '음악을 들어요.' }), null);
  assert.equal(reviewExercise({ word: '없다' }), null);
});

test('legacy video timestamps are preserved without changing review progress and survive lesson deletion', () => {
  const state = initialState();
  state.lessons[0].videoId = 'WaBNd5Jh4fQ';
  state.lessons[0].segments = [{ text: '공부해요.', offset: 12.5, duration: 7 }, { text: '다음.', offset: 16, duration: 3 }];
  state.words = [{ id: 'w', word: '공부해요', meaning: 'học', context: '공부해요.', lessonId: 'demo', lessonTitle: 'Bài cũ', offset: 12.5, level: 4, due: 123456 }];
  const migrated = preserveWordVideos(state);
  assert.equal(state.words[0].videoId, undefined);
  assert.equal(migrated.words[0].level, 4); assert.equal(migrated.words[0].due, 123456);
  assert.deepEqual(videoSnapshot(state.lessons[0], 0), { videoId: 'WaBNd5Jh4fQ', duration: 3.5 });
  migrated.lessons = [];
  const clip = wordClip(migrated.words[0], migrated.lessons);
  assert.equal(clip.start, 12.5); assert.equal(clip.end, 16); assert.equal(clip.videoId, 'WaBNd5Jh4fQ');
  assert.doesNotThrow(() => validateState(migrated));
  assert.equal(wordClip({ ...migrated.words[0], videoId: 'javascript:evil' }), null);
  assert.equal(wordClip({ ...migrated.words[0], offset: -1 }), null);
  assert.equal(wordClip({ ...migrated.words[0], duration: 0 }), null);
  assert.throws(() => validateState({ ...migrated, words: [{ ...migrated.words[0], videoId: 'bad' }] }));
});
