const query = document.getElementById('query');
const selected = document.getElementById('select');
const error = document.getElementById('error');
query.value = new URLSearchParams(location.search).get('q') || '';
async function run(action) { error.textContent = ''; try { await action(); } catch (e) { error.textContent = e.message; } }
document.getElementById('query-form').addEventListener('submit', event => { event.preventDefault(); run(() => window.searchView.search(query.value)); });
document.getElementById('back').addEventListener('click', () => run(() => window.searchView.back()));
selected.addEventListener('click', () => run(() => window.searchView.select()));
window.searchView.onLocation(value => { selected.disabled = !value.canSelect; document.getElementById('hint').textContent = value.canSelect ? value.title : 'Mở một video rồi chọn “Dùng video này” để tạo bài học trong Haru.'; });
