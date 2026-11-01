const cache = new Map();
function cleanWiki(text) {
  return text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{(?:l|m|link)\|[^|}]+\|([^|}]+)(?:\|[^}]*)?\}\}/gi, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<[^>]*>/g, '').replace(/'{2,}/g, '').replace(/\s+/g, ' ').trim();
}
function definitionsFromWiki(wikitext) {
  const start = wikitext.search(/\{\{-(?:kor|ko)-\}\}|^==\s*(?:Tiếng Hàn|Tiếng Triều Tiên|Korean)\s*==\s*$/im);
  if (start < 0) return [];
  const korean = wikitext.slice(start).split('\n');
  const definitions = [];
  for (const line of korean.slice(1)) {
    const marker = line.match(/^\{\{-([a-z]{2,3})-\}\}/);
    if ((marker && !['adj', 'adv', 'num', 'int', 'pro', 'con', 'art', 'det', 'suf', 'pre', 'syn', 'ant', 'rel'].includes(marker[1])) || /^==[^=].*[^=]==\s*$/.test(line)) break;
    const match = line.match(/^#(?![:*#])\s*(.+)/);
    if (match) { const text = cleanWiki(match[1]); if (text) definitions.push(text); }
  }
  return [...new Set(definitions)].slice(0, 12);
}
async function lookupWord(input) {
  const term = String(input ?? '').normalize('NFC').trim();
  if (!term || term.length > 100 || !/[가-힣]/.test(term)) throw new Error('Nhập một từ hoặc cụm từ tiếng Hàn, tối đa 100 ký tự.');
  const cached = cache.get(term);
  if (cached && Date.now() - cached.at < 3600000) return cached.value;
  const url = new URL('https://vi.wiktionary.org/w/api.php');
  url.search = new URLSearchParams({ action: 'parse', page: term, prop: 'wikitext', format: 'json', redirects: '1' });
  let data;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Haru/0.2 (Windows Korean vocabulary learner)' }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error();
    data = await response.json();
  } catch { throw new Error('Chưa kết nối được từ điển. Kiểm tra mạng hoặc thử lại sau.'); }
  if (data.error && data.error.code !== 'missingtitle') throw new Error('Từ điển đang bận. Hãy thử lại sau.');
  const value = { word: data.parse?.title || term, definitions: definitionsFromWiki(data.parse?.wikitext?.['*'] || ''), source: 'Wiktionary tiếng Việt', url: `https://vi.wiktionary.org/wiki/${encodeURIComponent(term)}` };
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  cache.set(term, { at: Date.now(), value });
  return value;
}
module.exports = { lookupWord, definitionsFromWiki, cleanWiki };
