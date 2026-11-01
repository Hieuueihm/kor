# Haru · Ứng dụng Windows học tiếng Hàn

Học từ video YouTube: nghe từng câu, điền từ còn thiếu, kiểm tra đáp án và lưu từ mới để ôn lại. Giao diện tiếng Việt, dữ liệu học lưu trên máy.

## Mở ứng dụng

Giải nén `release/Haru-Portable-0.5.0.zip`, giữ nguyên thư mục **HaruData** bên cạnh **Haru.exe**, rồi mở Haru.exe trên Windows 10/11 x64. Không cần cài Node.js hay .NET. Bản phát triển chưa có chữ ký số và chưa được đưa lên Microsoft Store. Bản mới dùng tiếp dữ liệu và lịch ôn từ các bản trước; lần chạy portable đầu tiên sẽ sao chép dữ liệu cũ nếu thư mục mới chưa có learning.json, không ghi đè dữ liệu đã có.

## Cách học

1. Chọn **Thêm bài học**, dán link YouTube có phụ đề tiếng Hàn rồi chọn **Tạo bài học**.
2. Phụ đề tự chọn và cuộn theo thời gian phát, kể cả khi tua video. **Dừng cuối câu để điền** tạm dừng video để bạn trả lời; **Tự sang câu khi đúng** phát tiếp sau khi kiểm tra đúng, không cần bấm câu kế. Tắt tùy chọn dừng hoặc dùng **Phụ đề đầy đủ** để xem liên tục. Hai tùy chọn được lưu trên máy. Chế độ thử thách ẩn nhiều từ hơn; ô điền trong phụ đề cũng được che để tránh lộ đáp án.
3. Trong **Cài đặt**, nhập Key và Region từ tài nguyên **Microsoft Translator** trên Azure. Trở lại bài học, chọn **Dịch Hàn–Việt** để dịch phụ đề. Không có khóa dịch vẫn học bằng phụ đề gốc, bản dịch tự nhập hoặc bài mẫu.
4. Bấm vào từ **gạch chân trong câu** hoặc khung **Từ vựng trong câu** để tra nghĩa ngay trong **Góc học tập**. Bạn cũng có thể gõ từ vào ô tra ngay phía trên video. Kết quả không chuyển trang; video tạm dừng, câu đang làm và nội dung đã điền vẫn giữ nguyên. Dùng **Lưu nghĩa này** hoặc **Thêm vào sổ** để lưu kèm ngữ cảnh của bài học. Có nút **Naver** và **Papago** ngay cạnh ô tra. Đóng kết quả bằng nút X để tiếp tục học. Từ cần điền vẫn được che ở câu, khung từ vựng, danh sách đã lưu và ngữ cảnh trong hộp lưu từ cho tới khi trả lời đúng hoặc chọn **Xem đáp án**. Khi quay lại câu để luyện lại, đáp án được che lại.
5. Mở **Ôn tập flashcard → Điền từ trong câu** (mặc định). App che các lần xuất hiện của từ trong câu ví dụ; nhập đúng dạng trong câu, gồm trợ từ/đuôi chia nếu có, rồi bấm Enter hoặc **Kiểm tra từ**. Đúng sẽ giãn lịch ôn 1, 3, 7, 14, 30, 60 ngày; sai hoặc **Xem đáp án** sẽ ôn lại sau 10 phút. Lịch được lưu ngay khi chấm, bấm **Từ tiếp theo** để chuyển thẻ. Có thể chọn **Lật thẻ** để tự đánh giá. Nếu câu không có dạng từ nhận diện chắc chắn (ví dụ một số dạng bất quy tắc), app dùng lật thẻ cho từ đó. Kiểu ôn được ghi nhớ.
6. Từ lưu từ bài YouTube có nút **Nghe trong video** ở **Sổ từ vựng** và khi ôn. Trình phát mở đúng mốc câu, tự dừng cuối đoạn và có nút nghe lại. Trong bài điền từ, câu gốc được ẩn ở hộp video để tránh lộ đáp án; mở/đóng video giữ nguyên câu trả lời. **Mở đoạn trên YouTube** dùng được khi video không cho nhúng (trình duyệt mở đúng mốc bắt đầu, không tự dừng). Mã video/mốc câu được lưu kèm từ và đi theo bản sao lưu, vẫn dùng được sau khi xóa bài học. Từ cũ được bổ sung mốc video từ bài gốc còn trong thư viện, không thay đổi lịch ôn. Video cần Internet và có thể không còn truy cập được nếu chủ video xóa hoặc hạn chế quyền xem.

Ứng dụng chấm theo chính tả sau khi chuẩn hóa Unicode, dấu câu và khoảng trắng ở đầu/cuối; không tự chấp nhận từ đồng nghĩa. Từ được lưu theo dạng xuất hiện trong câu, bạn có thể sửa thành dạng từ điển khi thêm từ. Lịch flashcard là lịch giãn cách cố định theo mức ghi nhớ, chưa dùng thuật toán FSRS hay SM-2.

## Tra từ, xuất tài liệu và tìm video

- Ô **Tra từ tiếng Hàn** ở đầu ứng dụng và mục **Tra từ** cho phép tra nghĩa Hàn–Việt từ Wiktionary, nghe phát âm và **Lưu từ** ngay. Nguồn này cần Internet, không cần API key, nhưng không bao phủ mọi từ và dạng chia. Thử dạng từ điển như 먹다. Có thể dùng thêm **Dịch nghĩa bằng Microsoft Translator** với khóa đã cấu hình; kết quả dịch máy được ghi rõ.
- Trong **Góc học tập**, cả ô tra ở đầu cửa sổ lẫn ô tra trên bài học đều hiển thị kết quả tại chỗ. Mục **Tra từ** riêng vẫn dùng được khi bạn muốn tra ngoài bài học.
- Trong **Tra từ**, có thêm **Tra Naver Hàn–Việt** và **Dịch trên Papago**. Hai nút mở giao diện web gốc trong cửa sổ riêng của Haru và điền sẵn từ cần tra, không cần khóa API. Kết quả không tự đưa vào bản dịch phụ đề hay sổ từ; bạn chọn nghĩa và nhập khi lưu. Papago web là chức năng tra/dịch thủ công; API Papago Translation trên Naver Cloud là dịch vụ trả phí, không được dùng để thay thế tự động phần Microsoft Translator. Nội dung và từ khóa được gửi trực tiếp đến Naver/Papago.
- Trong **Sổ từ vựng**, chọn **Word**, **PDF** hoặc **Excel**. Tệp `.docx` và `.xlsx` chỉnh sửa được; PDF dùng giấy A4, có tiếng Hàn và dấu tiếng Việt. Xuất các từ đang hiển thị theo bộ lọc tìm kiếm. Tài liệu gồm nghĩa, câu gốc, dịch câu và ghi chú; Excel thêm nguồn bài học và lịch ôn.
- Trong **Thư viện bài học**, nhập từ khóa vào **Tìm video YouTube**. Cửa sổ YouTube trong ứng dụng có thể tìm và xem video. Mở video mong muốn rồi bấm **Dùng video này** để đưa link sang hộp tạo bài học. Nội dung YouTube chạy trong WebContentsView riêng, không có preload hay quyền truy cập bridge của ứng dụng.

Nghĩa từ Wiktionary có nguồn trích dẫn và liên kết bài gốc; nội dung theo giấy phép CC BY-SA của Wiktionary. Từ khóa tra cứu được gửi tới Wiktionary; từ khóa video được gửi tới YouTube. Xuất tài liệu thực hiện cục bộ, không gửi sổ từ ra dịch vụ ngoài.

## Từ vựng theo chủ đề

Mục **Từ vựng chủ đề** có **10.051 từ không trùng chính tả**, thuộc **39 chủ đề**: Đồ ăn (304), Đồ uống (54), Nhà hàng/nấu ăn, Gia đình, Công việc, Trường học, Y tế, Du lịch/đi lại, Văn hóa, Công nghệ, Tính cách, Thời tiết… Dữ liệu lấy từ bản JSON toàn bộ **한국어기초사전 / Từ điển tiếng Hàn cơ sở**, Viện Quốc ngữ Hàn Quốc (NIKL), mốc 2026-10-19. Haru chọn các mục sơ cấp/trung cấp có nghĩa tiếng Việt và ví dụ thật, gộp chính tả trùng và dịch nhãn chủ đề/từ loại. Không nhân bản một từ để tăng số lượng và không tự tạo câu mẫu hàng loạt.

Mỗi từ có nghĩa/định nghĩa Việt, từ loại, trình độ, câu ví dụ gốc tiếng Hàn, và các kết hợp thường gặp hoặc ghi chú khi nguồn có. Bấm **Cách dùng & nghĩa khác** để xem thêm nghĩa, mẫu câu và ghi chú gốc. Tất cả 10.051 từ đều có ví dụ; 9.769 từ có mẫu kết hợp hoặc ghi chú. Ví dụ và ghi chú nguồn giữ bằng tiếng Hàn, không có bản dịch máy đính kèm. Cùng chính tả nhưng khác nghĩa được chọn theo đúng chủ đề (ví dụ 차 là trà trong Đồ uống, mắt/tuyết của 눈 ở các nhóm tương ứng).

Nguồn chữ và bộ dữ liệu thích nghi theo **CC BY-SA 2.0 KR**; xem `data/LICENSE-SOURCE.txt`. Phát âm dùng giọng Windows, không sao chép âm thanh/hình ảnh của từ điển. Bộ dữ liệu: `data/vocabulary.json` (khoảng 17 MB), có checksum SHA-256; nằm trong bản đóng gói và được sao chép thành `HaruData/vocabulary.json`. Xem danh mục ngoại tuyến không cần API key hay Internet.

Gõ tên chủ đề có dấu hoặc không dấu (`đồ ăn`, `do uong`), từ tiếng Hàn (`커피`) hoặc nghĩa Việt để lọc; có lọc sơ cấp/trung cấp. Hiển thị 30 từ mỗi trang để không tải hàng nghìn thẻ vào màn hình. **Lưu cả nhóm** lưu mọi từ phù hợp bộ lọc trong nhóm, kể cả các trang khác, trừ từ đã có. Nghĩa, ví dụ, ghi chú và nguồn đi cùng từ khi lưu và xuất Word/PDF/Excel. Từ đã có được giữ nguyên nghĩa/lịch ôn; từ mới vào mức 0 và sẵn sàng ôn ngay.

## Lộ trình, cụm từ và từ hay sai

- **Lộ trình chủ đề** chia toàn bộ từ của từng chủ đề thành các chặng tối đa **12 từ**, tách sơ cấp/trung cấp. Nhóm Đồ ăn chia thêm Nguyên liệu, Hương vị, Món ăn/bữa ăn theo nhãn nghĩa Việt. Bấm **Học và lưu** để thêm từ mới vào sổ; từ đã có giữ nguyên nghĩa và lịch ôn cho đến khi bạn kiểm tra. Có ví dụ và cụm gốc, nghe phát âm, câu hỏi chọn nghĩa cuối chặng. Đáp án đúng/sai cập nhật SRS. Vị trí xem từ, câu kiểm tra, kết quả nằm trong `learning.json` và tiếp tục được sau khi tắt app/chuyển máy. **Học theo chặng 12 từ** trong mục từ chủ đề mở đúng chủ đề tương ứng.
- **Cụm từ & dễ nhầm** có 8 cặp phân biệt: 안/못, 알다/알아보다, 배우다/가르치다, 듣다/들리다, 빌리다/빌려주다, 잊다/잃다, 입다/신다, 먹다/마시다. Định nghĩa/ví dụ chọn đúng nghĩa từ NIKL, phần giải thích Việt do Haru biên soạn. Tab **Cụm thường gặp** tìm trong các cụm của bộ từ, nghe và **Lưu cụm**. Bạn điền nghĩa cả cụm; ví dụ/nguồn đi theo từ khi lưu. Không tự lấy nghĩa của một từ làm nghĩa cả cụm.
- **Từ hay sai** gom từ đã sai/quên từ 2 lần; đúng 3 lần liên tiếp sẽ tự rời nhóm nhưng giữ thống kê. Ghi nhận từ ôn flashcard, điền từ, kiểm tra lộ trình và từ đã lưu trùng đáp án trong bài học. Thống kê bắt đầu từ phiên bản 0.5.0, không suy đoán các lượt ôn cũ. Có thể luyện từng từ hoặc tối đa 10 từ/lượt, kể cả từ chưa đến hạn; lượt luyện chủ động cũng cập nhật lịch ôn.

## Khi YouTube không lấy được phụ đề

Nguồn tự động dùng thư viện `youtube-transcript-plus` và cơ chế không chính thức của YouTube. Có thể thất bại khi video thiếu phụ đề Hàn, bị giới hạn, bị chặn theo IP hoặc YouTube thay đổi. Không tự tạo phụ đề từ âm thanh ở phiên bản này.

Chọn tab **Nhập phụ đề** và nhập tệp `.srt`, `.vtt`, `.txt` hoặc dán văn bản. Có thể thêm link YouTube để phát video song song. SRT/VTT giữ mốc thời gian. Văn bản thường dùng 5 giây mỗi câu nên chỉ là mốc tạm, không đồng bộ chính xác với video.

```text
안녕하세요. | Xin chào.
커피 한 잔 주세요. | Cho tôi một cốc cà phê.
감사합니다. | Xin cảm ơn.
```

Bài mẫu dùng giọng đọc tổng hợp, không gắn với một video. Giọng Hàn phụ thuộc giọng đã cài trên Windows: **Settings → Time & language → Speech**. Video YouTube cần Internet và cho phép nhúng; có nút mở video trong trình duyệt nếu video không phát trong ứng dụng.

## Dữ liệu và sao lưu

- Với EXE portable: bài học, từ mới, ví dụ đã lưu, lịch ôn, đáp án và tùy chọn nằm trong **HaruData/learning.json**, cạnh EXE. Bộ 10.051 từ nằm ở **HaruData/vocabulary.json**. Cùng thư mục có nguồn/giấy phép và checksum.
- **Chuyển máy:** chép cả Haru.exe và HaruData, hoặc dùng **Cài đặt → Xuất gói chuyển máy (.zip)** rồi giải nén cạnh EXE trên máy mới. Gói ZIP chứa bộ từ, ví dụ và tiến độ tại lúc xuất. Sau khi học thêm cần xuất lại hoặc chép lại HaruData để mang theo trạng thái mới nhất. Không có đồng bộ đám mây tự động.
- **Cài đặt → Mở thư mục dữ liệu** cho biết vị trí tệp thực tế. Khi chạy mã nguồn/phát triển, dữ liệu vẫn ở `%APPDATA%/haru-korean/`.
- Khóa dịch được mã hóa bằng Windows DPAPI, lưu riêng theo máy ở `%APPDATA%/haru-korean/translator.json`. Khóa và bộ nhớ đệm trình duyệt không nằm trong gói chuyển máy. Trên máy mới cấu hình lại khóa nếu dùng Microsoft Translator; bộ từ ngoại tuyến không cần khóa.
- **Cài đặt → Xuất bản sao lưu** tạo JSON để chuyển máy. **Khôi phục dữ liệu** kiểm tra định dạng và yêu cầu xác nhận trước khi thay thế dữ liệu hiện tại.
- **Bản sao tự động:** `HaruData/backups/learning-<mốc thời gian>-<uuid>.json`, giữ tối đa 12 bản. Lưu trạng thái trước thay đổi đầu phiên, tối đa mỗi 5 phút khi tiếp tục thay đổi, và trước khi xóa từ/bài học/lịch sử. **Cài đặt → Bản sao tự động** xem ngày, số từ/bài và khôi phục; có nút tạo bản sao ngay. Trước mọi lần khôi phục (kể cả nhập JSON), app tạo điểm quay lại. Tệp hỏng bị đánh dấu, không cho khôi phục. Các bản này chỉ có dữ liệu học, không có khóa dịch. Gói chuyển máy và thư mục portable mang theo lịch sử sao lưu.
- Không có tài khoản hay đồng bộ đám mây. Video/phụ đề gửi đến YouTube; chỉ nội dung bạn bấm dịch được gửi đến Microsoft Translator. Dịch vụ Microsoft cần khóa, kết nối mạng và hạn mức Azure; có thể phát sinh phí theo tài khoản của bạn.

## Phát triển

Node.js 22.12+ và npm. Electron + React + Vite; phần nghiệp vụ dùng các module JavaScript độc lập. Ứng dụng chạy trong cửa sổ Windows riêng. Nội dung giao diện được phục vụ bằng HTTP loopback để trình phát YouTube có origin/referrer, không mở cổng ra mạng LAN.

```powershell
npm install
npm run dev       # Chạy phát triển, tự cập nhật giao diện
npm start         # Build và mở ứng dụng
npm test          # Kiểm tra nghiệp vụ
npm run test:ui   # Luồng Electron, dữ liệu tạm độc lập
npm run dist      # Đóng gói EXE portable x64 vào release/
```

Kiểm tra nguồn YouTube thực, cần Internet:

```powershell
node tests/youtube-live.mjs
node tests/tools-live.mjs
node tests/naver-live.mjs
node tests/learning-and-topics.mjs
```

Kiểm tra bộ từ/chuyển máy và các tính năng học mới (không cần mạng):

```powershell
node tests/catalog-portable.mjs
node tests/paths-usage-backups.mjs
node tests/review-and-clips.mjs
```

Kiểm tra che đáp án và bấm từ trong câu (không cần mạng): `node tests/answer-visibility.mjs`.

Các kiểm tra giao diện bao phủ: đáp án sai/đúng, lưu từ, lịch ôn, nhập phụ đề, chặn URL sai, mã hóa khóa, dịch nhiều lô bằng API giả lập, sao lưu/khôi phục, lưu qua lần mở lại và xóa dữ liệu. Kiểm tra mạng thực bao phủ tua tiến/lùi và cuộn phụ đề, dừng cuối câu, tự chuyển câu đúng, tra từ, xuất ba định dạng và chọn video từ cửa sổ tìm YouTube. PDF 35 từ đã được kiểm tra qua ba trang và trích xuất đúng chữ Hàn, tiếng Việt. Chưa kiểm tra dịch Microsoft trực tiếp khi không có khóa thực. `npm audit` hiện có cảnh báo moderate từ các dependency gián tiếp, gồm bộ đóng gói và ExcelJS; không có cảnh báo high/critical ở lần kiểm tra.

Kiểm tra `catalog-portable.mjs` mô phỏng hai máy bằng hai hồ sơ Windows khác nhau, xuất/chép gói rồi chặn mạng; xác nhận bộ từ, ví dụ, ghi chú, mức nhớ và ngày ôn còn nguyên.

Tạo lại dữ liệu từ bản ZIP chính thức đặt ở `.source-cache/krdict-202610.zip`: chạy `python scripts/extract-krdict.py`, rồi `python scripts/build-catalog.py`. Nguồn thô và tệp trung gian không được đóng gói. Tạo gói portable đầy đủ sau `npm run dist`: `python scripts/package-portable.py --learning <đường-dẫn-learning.json>`; script không ghi đè learning.json đã có trong thư mục gói.

Tài liệu dịch vụ: [Nguồn NIKL](https://krdict.korean.go.kr/vie/mainAction), [Giấy phép dữ liệu](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo), [Microsoft Translator](https://learn.microsoft.com/azure/ai-services/translator/text-translation/reference/v3/translate), [YouTube captions API](https://developers.google.com/youtube/v3/docs/captions/download), [youtube-transcript-plus](https://github.com/ericmmartin/youtube-transcript-plus).
"# kor" 
