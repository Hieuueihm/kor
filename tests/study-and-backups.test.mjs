import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { initialState, scheduleReview, isTroublesome, validateState } from '../shared/core.mjs';
import { topicUnits, quizChoices, unitProgress } from '../shared/study.mjs';
import { comparisons, usageTerm } from '../shared/usage.mjs';
import createBackups from '../electron/backups.cjs';
const catalog = JSON.parse(await readFile(new URL('../data/vocabulary.json', import.meta.url)));

test('all topic words appear exactly once per topic in stable small units with resumable quiz progress', () => {
  for (const topic of catalog.topics.filter(topic => topic.id !== 'all')) {
    const units = topicUnits(catalog, topic.id);
    const ids = units.flatMap(unit => unit.entries.map(entry => entry.id));
    assert.equal(ids.length, catalog.entries.filter(entry => entry.topicIds.includes(topic.id)).length);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(units.every(unit => unit.entries.length > 0 && unit.entries.length <= 12));
  }
  const unit = topicUnits(catalog, 'food')[0];
  const progress = { ...unitProgress(unit), phase: 'quiz', index: 1, results: [true] };
  assert.equal(unitProgress(unit, progress), progress);
  assert.equal(unitProgress(unit, { ...progress, entryIds: ['wrong'] }).phase, 'study');
  for (let index = 0; index < unit.entries.length; index++) {
    const options = quizChoices(unit, index, catalog.entries);
    assert.equal(options.length, 4); assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(unit.entries[index].meaning));
  }
});

test('comparison examples use the intended dictionary sense, including the homonym 듣다', () => {
  for (const pair of comparisons) for (const term of pair.terms) {
    const entry = usageTerm(catalog, term);
    assert.ok(entry, pair.title); assert.ok(entry.examples[0].text); assert.ok(entry.sourceUrl.startsWith('https://krdict.korean.go.kr/'));
  }
  assert.match(usageTerm(catalog, ['듣다', 'nghe']).meaning, /nghe/);
  assert.doesNotMatch(usageTerm(catalog, ['듣다', 'nghe']).meaning, /nhỏ giọt/);
});

test('two failures enter trouble practice; three consecutive successes remove it without erasing history', () => {
  let card = { id: 'w', word: '밥', meaning: 'cơm', level: 0, due: 0 };
  card = scheduleReview(card, false, 100); assert.equal(isTroublesome(card), false);
  card = scheduleReview(card, false, 200); assert.equal(isTroublesome(card), true);
  card = scheduleReview(card, true, 300); card = scheduleReview(card, true, 400); assert.equal(isTroublesome(card), true);
  card = scheduleReview(card, true, 500); assert.equal(isTroublesome(card), false); assert.equal(card.reviewStats.failures, 2);
  assert.doesNotThrow(() => validateState({ ...initialState(), words: [card] }));
  assert.throws(() => validateState({ ...initialState(), words: [{ ...card, reviewStats: { ...card.reviewStats, failures: -1 } }] }));
});

test('automatic backups preserve the previous state, throttle normal saves, bypass throttle for deletions, and retain 12 valid files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'haru-backup-tests-'));
  const file = path.join(root, 'learning.json'), manager = createBackups(root, validateState, { interval: 600000 });
  let state = initialState();
  state.words = [{ id: 'w', word: '밥', meaning: 'cơm', level: 0, due: 100 }];
  await writeFile(file, JSON.stringify(state));
  assert.equal(await manager.beforeWrite(state), null);
  let next = { ...state, words: state.words.map(word => ({ ...word, due: 200 })) };
  const first = await manager.beforeWrite(next); assert.ok(first);
  assert.equal((await manager.read(first)).words[0].due, 100);
  await writeFile(file, JSON.stringify(next));
  state = next; next = { ...state, words: state.words.map(word => ({ ...word, due: 300 })) };
  assert.equal(await manager.beforeWrite(next), null);
  await writeFile(file, JSON.stringify(next));
  const removed = await manager.beforeWrite({ ...next, words: [] });
  assert.equal((await manager.read(removed)).words.length, 1);
  for (let index = 0; index < 14; index++) {
    next = { ...next, words: next.words.map(word => ({ ...word, due: index + 1000 })) };
    await writeFile(file, JSON.stringify(next)); await manager.checkpoint(true);
  }
  const list = await manager.list(); assert.equal(list.length, 12);
  assert.equal((await manager.read(list[0].id)).words[0].due, 1013);
  assert.equal((await readdir(path.join(root, 'backups'))).length, 12);
  await assert.rejects(() => manager.read('../translator.json'));
  await writeFile(path.join(root, 'backups', list[0].id), 'damaged');
  assert.equal((await manager.list())[0].invalid, true);
  await assert.rejects(() => manager.read(list[0].id));
});
