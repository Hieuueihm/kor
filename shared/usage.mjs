import { searchKey } from './topics.mjs';
// Vietnamese teaching summaries; definitions and example sentences come from NIKL.
export const comparisons = [
  { id: 'negative', title: '안 và 못', note: '안 phủ định một hành động hoặc trạng thái. 못 nói rằng không làm được một hành động do khả năng hay điều kiện. Chọn theo điều bạn muốn diễn đạt.', terms: [['안', 'không'], ['못', 'không']] },
  { id: 'know', title: '알다 và 알아보다', note: '알다 là đã biết thông tin. 알아보다 có nghĩa tìm hiểu, kiểm tra để biết; từ này còn có nghĩa nhận ra, hãy xem thêm các nghĩa theo ngữ cảnh.', terms: [['알다', 'biết'], ['알아보다', 'tìm hiểu']] },
  { id: 'learn', title: '배우다 và 가르치다', note: '배우다 nhìn từ phía người học, tiếp nhận kiến thức. 가르치다 nhìn từ phía người dạy, truyền đạt kiến thức hoặc kỹ năng.', terms: [['배우다', 'học'], ['가르치다', 'dạy']] },
  { id: 'hear', title: '듣다 và 들리다', note: '듣다 diễn tả nghe một âm thanh. 들리다 diễn tả âm thanh nghe được, lọt đến tai. Chú ý nghĩa “nghe”: 듣다 còn có từ đồng âm nghĩa khác.', terms: [['듣다', 'nghe'], ['들리다', 'nghe']] },
  { id: 'borrow', title: '빌리다 và 빌려주다', note: '빌리다: mượn hoặc thuê từ người khác. 빌려주다: cho người khác mượn hoặc vay. Hai từ khác nhau ở hướng chuyển đồ vật.', terms: [['빌리다', 'mượn'], ['빌려주다', 'cho mượn']] },
  { id: 'lose', title: '잊다 và 잃다', note: '잊다 là quên, không nhớ một điều. 잃다 là mất hoặc đánh mất thứ đang có. Đừng dùng hai từ thay cho nhau khi nói về trí nhớ và đồ vật.', terms: [['잊다', 'quên'], ['잃다', 'mất']] },
  { id: 'wear', title: '입다 và 신다', note: '입다 dùng với quần áo mặc trên người. 신다 dùng với giày, dép và tất mang ở chân. Học cả cụm để chọn đúng động từ.', terms: [['입다', 'mặc'], ['신다', 'mang']] },
  { id: 'eat', title: '먹다 và 마시다', note: '먹다 thường đi với thức ăn; 마시다 với đồ uống. Có kết hợp riêng như 약을 먹다 (uống thuốc), nên tránh dịch từng chữ từ tiếng Việt.', terms: [['먹다', 'ăn'], ['마시다', 'uống']] }
];
export function usageTerm(catalog, [word, keyword]) {
  const original = catalog.entries.find(entry => entry.word === word);
  if (!original) return null;
  const sense = original.senses.find(sense => searchKey(sense.meaning).includes(searchKey(keyword)));
  return sense ? { ...original, ...sense, id: original.id, word, senses: [sense] } : null;
}
