const fs = require('node:fs');
const path = require('node:path');
function configureStorage(app, env = process.env) {
  const profileRoot = env.HARU_TEST_DATA || env.HARU_TEST_PROFILE || path.join(app.getPath('appData'), 'haru-korean');
  const portable = !env.HARU_TEST_DATA && !!env.PORTABLE_EXECUTABLE_DIR;
  const root = portable ? path.join(path.resolve(env.PORTABLE_EXECUTABLE_DIR), 'HaruData') : profileRoot;
  fs.mkdirSync(profileRoot, { recursive: true }); fs.mkdirSync(root, { recursive: true });
  // Keep browser caches and Windows-encrypted service keys on this machine.
  app.setPath('userData', profileRoot);
  const learningFile = path.join(root, 'learning.json');
  if (portable && !fs.existsSync(learningFile) && fs.existsSync(path.join(profileRoot, 'learning.json'))) fs.copyFileSync(path.join(profileRoot, 'learning.json'), learningFile, fs.constants.COPYFILE_EXCL);
  return { root, profileRoot, portable, learningFile, settingsFile: path.join(profileRoot, 'translator.json'), catalogFile: path.join(root, 'vocabulary.json') };
}
module.exports = { configureStorage };
