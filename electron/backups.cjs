const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const NAME = /^learning-(\d{13})-[a-f0-9-]{36}\.json$/;
module.exports = function createBackups(root, validate, options = {}) {
  const directory = path.join(root, 'backups');
  const learning = path.join(root, 'learning.json');
  const limit = options.limit || 12;
  const interval = options.interval ?? 5 * 60000;
  let lastBackup = 0;
  const digest = state => crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
  const names = async () => {
    try { return (await fs.readdir(directory)).filter(name => NAME.test(name)).sort().reverse(); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  async function read(id) {
    if (!NAME.test(id)) throw new Error('Tên bản sao lưu không hợp lệ.');
    const file = path.join(directory, id);
    const info = await fs.lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 100_000_000) throw new Error('Bản sao lưu không hợp lệ hoặc quá lớn.');
    return validate(JSON.parse(await fs.readFile(file, 'utf8')));
  }
  async function checkpoint(force = false, next) {
    let current;
    try { current = validate(JSON.parse(await fs.readFile(learning, 'utf8'))); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (next && digest(current) === digest(next)) return null;
    const nextWords = new Set(next?.words.map(word => word.id)), nextLessons = new Set(next?.lessons.map(lesson => lesson.id));
    const removed = next && (current.words.some(word => !nextWords.has(word.id)) || current.lessons.some(lesson => !nextLessons.has(lesson.id)) || current.attempts.length > next.attempts.length);
    if (!force && !removed && Date.now() - lastBackup < interval) return null;
    const existing = await names();
    if (existing[0]) {
      try { if (digest(await read(existing[0])) === digest(current)) { lastBackup = Date.now(); return existing[0]; } }
      catch { /* Preserve a fresh valid snapshot even if an older file was damaged. */ }
    }
    await fs.mkdir(directory, { recursive: true });
    const createdAt = Math.max(Date.now(), Number(existing[0]?.match(NAME)?.[1] || 0) + 1);
    const id = `learning-${createdAt}-${crypto.randomUUID()}.json`;
    await fs.writeFile(path.join(directory, id), JSON.stringify(current, null, 2), { encoding: 'utf8', flag: 'wx' });
    lastBackup = Date.now();
    for (const obsolete of (await names()).slice(limit)) await fs.unlink(path.join(directory, obsolete));
    return id;
  }
  async function list() {
    const entries = [];
    for (const id of (await names()).slice(0, limit)) {
      try {
        const state = await read(id);
        entries.push({ id, at: Number(id.match(NAME)[1]), words: state.words.length, lessons: state.lessons.length });
      } catch { entries.push({ id, at: Number(id.match(NAME)[1]), invalid: true }); }
    }
    return entries;
  }
  return { checkpoint, beforeWrite: next => checkpoint(false, next), list, read };
};
