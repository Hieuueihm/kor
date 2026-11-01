"""Assemble the EXE and portable study files without deleting existing data."""
import argparse
import hashlib
import json
import pathlib
import shutil
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8-sig'))['version']
parser = argparse.ArgumentParser()
parser.add_argument('--learning', type=pathlib.Path)
args = parser.parse_args()
folder = root / 'release' / f'Haru-Portable-{version}'
data = folder / 'HaruData'
data.mkdir(parents=True, exist_ok=True)
shutil.copy2(root / 'release' / f'Haru-{version}-Windows.exe', folder / 'Haru.exe')
for name in ['vocabulary.json', 'vocabulary.sha256', 'LICENSE-SOURCE.txt']:
    if not (data / name).exists():
        shutil.copy2(root / 'data' / name, data / name)
if args.learning and args.learning.is_file() and not (data / 'learning.json').exists():
    state = json.loads(args.learning.read_text(encoding='utf-8-sig'))
    if state.get('version') != 1 or not isinstance(state.get('words'), list):
        raise ValueError('Invalid study data; original file was not modified')
    shutil.copy2(args.learning, data / 'learning.json')
if args.learning:
    old_backups = args.learning.parent / 'backups'
    if old_backups.is_dir():
        for file in sorted(old_backups.glob('learning-*.json'))[-12:]:
            if not file.is_file() or file.is_symlink():
                continue
            checkpoint = json.loads(file.read_text(encoding='utf-8-sig'))
            if checkpoint.get('version') == 1 and isinstance(checkpoint.get('words'), list):
                (data / 'backups').mkdir(exist_ok=True)
                target = data / 'backups' / file.name
                if not target.exists():
                    shutil.copy2(file, target)
readme = '''HARU PORTABLE — HỌC TIẾNG HÀN

1. Giải nén toàn bộ thư mục này vào vị trí bạn có quyền ghi tệp.
2. Mở Haru.exe. Không cần cài Node.js hay .NET.
3. Khi đổi máy: chép CẢ thư mục, gồm Haru.exe và thư mục HaruData.

Các tệp dữ liệu nằm cạnh ứng dụng:
- HaruData/vocabulary.json: 10.051 từ Hàn–Việt, 39 chủ đề, ví dụ và cách dùng.
- HaruData/learning.json: từ bạn lưu, ví dụ, mức nhớ, ngày ôn, lộ trình và thống kê.
- HaruData/backups/: tối đa 12 bản tự động, khôi phục trong Cài đặt.
- HaruData/LICENSE-SOURCE.txt: nguồn từ điển NIKL và giấy phép CC BY-SA 2.0 KR.
- HaruData/vocabulary.sha256: mã kiểm tra bộ từ.

Chỉ chép mỗi EXE sẽ không mang theo tiến độ mới nhất của bạn.
Trong Cài đặt có nút Xuất gói chuyển máy (.zip). Gói đó chứa HaruData nhưng
không chứa EXE; giải nén cạnh Haru.exe để dùng trên máy mới.

Bộ từ dùng ngoại tuyến. Ví dụ và ghi chú cách dùng là nguyên bản tiếng Hàn;
nghĩa và định nghĩa bằng tiếng Việt. Từ mới được đưa vào lịch ôn khi bạn bấm lưu.
Ôn tập có chế độ điền từ trong câu hoặc lật thẻ. Từ lưu từ video có nút
Nghe trong video để phát lại đúng đoạn; mốc video nằm trong learning.json.
Video, dịch vụ tra trực tuyến và dịch Microsoft cần mạng. Khóa dịch Microsoft
được mã hóa riêng trên từng máy và không nằm trong gói chuyển máy.

ZIP này là bản chụp dữ liệu lúc đóng gói. Sau khi học thêm, hãy chép lại cả thư
mục HaruData hoặc xuất gói chuyển máy mới để có tiến độ cập nhật.
'''
(folder / 'DOC-TRUOC-KHI-CHUYEN-MAY.txt').write_text(readme, encoding='utf-8')
manifest = {'version': version, 'files': {str(file.relative_to(folder)).replace('\\','/'): hashlib.sha256(file.read_bytes()).hexdigest() for file in folder.rglob('*') if file.is_file() and file.name != 'manifest-sha256.json'}}
(folder / 'manifest-sha256.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
archive = root / 'release' / f'Haru-Portable-{version}.zip'
with zipfile.ZipFile(archive, 'w') as zip_file:
    for file in folder.rglob('*'):
        if file.is_file():
            zip_file.write(file, str(pathlib.Path(folder.name) / file.relative_to(folder)), compress_type=zipfile.ZIP_STORED if file.suffix.lower() == '.exe' else zipfile.ZIP_DEFLATED, compresslevel=6)
print(str(archive))
