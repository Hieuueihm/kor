import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateCatalog, indexCatalog, entryForTopic, filterTopics } from '../shared/topics.mjs';
const bytes = await readFile(new URL('../data/vocabulary.json', import.meta.url));
const catalog = JSON.parse(bytes.toString());
test('catalog contains at least 5000 distinct words, all with Vietnamese and real examples', () => {
  assert.equal(validateCatalog(catalog).entryCount, 10051);
  assert.equal(new Set(catalog.entries.map(entry => entry.word)).size, 10051);
  assert.ok(catalog.entries.every(entry => entry.meaning && entry.definition && entry.examples.length && entry.examples.every(example => /[가-힣]/.test(example.text))));
  assert.equal(catalog.topics.length - 1, 39);
  assert.ok(catalog.source.license.includes('CC BY-SA'));
});
test('same Korean spelling selects the right source meaning for each topic', () => {
  const cha = catalog.entries.find(entry => entry.word === '차');
  assert.match(entryForTopic(cha, 'drinks').meaning, /trà/);
  assert.ok(entryForTopic(cha, 'transport').sourceId.startsWith('nikl-'));
  const nun = catalog.entries.find(entry => entry.word === '눈');
  assert.match(entryForTopic(nun, 'body').meaning, /mắt/);
  assert.match(entryForTopic(nun, 'weather').meaning, /tuyết/);
  const topics = indexCatalog(catalog);
  assert.ok(filterTopics('do an', topics).some(topic => topic.id === 'food'));
  assert.ok(topics.find(topic => topic.id === 'food').words.length >= 200);
});
test('catalog checksum matches the actual portable JSON file', async () => {
  const expected = (await readFile(new URL('../data/vocabulary.sha256', import.meta.url), 'utf8')).split(/\s+/)[0];
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
  const invalid = { ...catalog, entries: [catalog.entries[0], ...catalog.entries.slice(0, -1)] };
  assert.throws(() => validateCatalog(invalid));
});
