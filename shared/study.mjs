import { entryForTopic, searchKey } from './topics.mjs';
export const UNIT_SIZE = 12;
const foodGroups = [
  ['ingredients', 'Nguyên liệu', /^(?:thịt|rau|củ |quả |hạt |bột|đậu|cá(?:\s|,|$)|tôm|trứng|gạo|muối|đường|dầu|nước mắm|nước tương|gia vị|tiêu(?:\s|,|$))/],
  ['taste', 'Hương vị', /^(?:vị |ngọt|chua|mặn|cay|đắng|mùi|ngon)/],
  ['meals', 'Món ăn và bữa ăn', /.*/]
];
export function topicUnits(catalog, topicId) {
  const topic = catalog.topics.find(item => item.id === topicId && item.id !== 'all');
  if (!topic) return [];
  const buckets = new Map();
  for (const original of catalog.entries.filter(entry => entry.topicIds.includes(topicId))) {
    const entry = entryForTopic(original, topicId);
    const group = topicId === 'food' ? foodGroups.find(([, , pattern]) => pattern.test(entry.meaning.toLowerCase())) : ['general', topic.title];
    const key = `${group[0]}-${entry.level === 'Sơ cấp' ? 'basic' : 'intermediate'}`;
    if (!buckets.has(key)) buckets.set(key, { label: group[1], level: entry.level, entries: [] });
    buckets.get(key).entries.push(entry);
  }
  const units = [];
  for (const [key, bucket] of buckets) {
    const entries = bucket.entries.sort((a, b) => Number(a.id.slice(5)) - Number(b.id.slice(5)));
    for (let start = 0; start < entries.length; start += UNIT_SIZE) {
      const words = entries.slice(start, start + UNIT_SIZE);
      units.push({ id: `${topic.id}:${key}:${words[0].id}`, title: `${bucket.label} · Chặng ${start / UNIT_SIZE + 1}`, topic, level: bucket.level, entries: words });
    }
  }
  return units.sort((a, b) => (a.level === 'Sơ cấp' ? 0 : 1) - (b.level === 'Sơ cấp' ? 0 : 1));
}
export function unitProgress(unit, value) {
  const same = value?.entryIds?.join('|') === unit.entries.map(entry => entry.id).join('|');
  return same && value.index < unit.entries.length && value.results.length <= unit.entries.length ? value : { phase: 'study', index: 0, results: [], entryIds: unit.entries.map(entry => entry.id), updatedAt: Date.now() };
}
export function quizChoices(unit, index, pool) {
  const entry = unit.entries[index];
  const choices = [entry.meaning, ...new Set([...unit.entries, ...pool].filter(other => other.word !== entry.word && other.meaning !== entry.meaning).map(other => other.meaning))].slice(0, 4);
  const hash = text => [...text].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 17);
  return choices.sort((a, b) => hash(entry.id + a) - hash(entry.id + b));
}
export function studySearch(text, query) { return searchKey(text).includes(searchKey(query)); }
