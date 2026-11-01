export function searchKey(text) { return String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().trim(); }
export function validateCatalog(catalog) {
  if (!catalog || catalog.format !== 'haru-vocabulary' || catalog.version !== 1 || !Array.isArray(catalog.entries) || catalog.entries.length < 5000 || catalog.entries.length > 50000 || !Array.isArray(catalog.topics) || !catalog.source?.author) throw new Error('Bộ từ vựng không đúng định dạng Haru hoặc có ít hơn 5.000 từ.');
  const ids = new Set(), words = new Set(), topicIds = new Set(catalog.topics.map(topic => topic.id));
  for (const topic of catalog.topics) if (typeof topic.id !== 'string' || typeof topic.title !== 'string' || !Array.isArray(topic.aliases)) throw new Error('Chủ đề trong bộ từ không hợp lệ.');
  for (const entry of catalog.entries) {
    if (!/^nikl-\d+$/.test(entry.id) || ids.has(entry.id) || typeof entry.word !== 'string' || !/[가-힣]/.test(entry.word) || words.has(entry.word.normalize('NFC')) || typeof entry.meaning !== 'string' || !entry.meaning.trim() || !Array.isArray(entry.examples) || !entry.examples.some(example => typeof example.text === 'string' && example.text.trim()) || !Array.isArray(entry.topicIds) || !entry.topicIds.length || entry.topicIds.some(id => !topicIds.has(id)) || !Array.isArray(entry.senses)) throw new Error('Mục từ bị trùng, thiếu nghĩa, thiếu ví dụ hoặc thiếu chủ đề.');
    ids.add(entry.id); words.add(entry.word.normalize('NFC'));
  }
  if (catalog.entryCount !== catalog.entries.length) throw new Error('Số lượng mục từ không khớp với dữ liệu.');
  return catalog;
}
export function indexCatalog(catalog) {
  const entries = catalog.entries.map(entry => ({ ...entry, searchText: searchKey([entry.word, entry.meaning, ...entry.senses.map(sense => sense.meaning)].join(' ')) }));
  return catalog.topics.map(topic => ({ ...topic, searchText: searchKey([topic.title, topic.korean, ...topic.aliases].join(' ')), words: topic.id === 'all' ? entries : entries.filter(entry => entry.topicIds.includes(topic.id)) }));
}
export function topicMatches(topic, query) { return (topic.searchText || searchKey([topic.title, topic.korean, ...topic.aliases].join(' '))).includes(searchKey(query)); }
export function filterTopics(query, topics) { const key = searchKey(query); return topics.filter(topic => topicMatches(topic, key) || topic.words.some(entry => entry.searchText.includes(key))); }
export function entryForTopic(entry, topicId) {
  const senses = topicId === 'all' ? entry.senses : entry.senses.filter(sense => sense.topicIds.includes(topicId));
  const primary = senses[0] || entry.senses[0];
  return { ...entry, ...primary, id: entry.id, word: entry.word, senses: senses.length ? senses : entry.senses };
}
