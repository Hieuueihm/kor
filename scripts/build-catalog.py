"""Build a portable, attributed Korean–Vietnamese study catalog from KRDICT."""
import collections
import hashlib
import json
import pathlib
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent.parent

# The source assigns semantic categories. These are Vietnamese navigation labels
# for those categories, not guesses made from the spelling of individual words.
TOPICS = [
 ('food','Đồ ăn','음식',['ăn uống','thức ăn','món ăn','food'],['식생활 > 음식','식생활 > 식재료','식생활 > 과일','식생활 > 채소','식생활 > 곡류']),
 ('drinks','Đồ uống','음료',['nước uống','cà phê','drink'],['식생활 > 음료']),
 ('cooking','Nấu ăn và nhà hàng','요리',['bếp','ẩm thực','đặt món','ăn uống'],['식생활 > 식사','식생활 > 조리','식생활 > 식생활','식생활 > 맛','식생활 > 영양']),
 ('family','Gia đình','가족',['người thân','bố mẹ','anh chị em'],['삶 > 친족','삶 > 가족']),
 ('relationships','Quan hệ và xã hội','인간관계',['bạn bè','giao tiếp','cộng đồng'],['사회 생활 > 인간관계','사회 생활 > 사회']),
 ('shopping','Mua sắm','쇼핑',['cửa hàng','chợ','thanh toán'],['경제 생활 > 경제 행위','경제 생활 > 경제 수단','경제 생활 > 경제 산물']),
 ('economy','Kinh tế và tài chính','경제',['ngân hàng','tiền','kinh doanh'],['경제 생활']),
 ('work','Công việc và nghề nghiệp','직업',['văn phòng','công ty','việc làm'],['사회 생활 > 직장','사회 생활 > 직업','사회 생활 > 직위']),
 ('school','Trường học và giáo dục','교육',['học tập','sinh viên','lớp học'],['교육']),
 ('time','Thời gian','시간',['ngày tháng','giờ','lịch','time'],['개념 > 시간','개념 > 빈도','개념 > 순서']),
 ('feelings','Cảm xúc và trạng thái','감정',['tâm trạng','vui buồn','cảm giác'],['인간 > 감정','삶 > 삶의 상태']),
 ('personality','Tính cách và thái độ','성격',['con người','ứng xử'],['인간 > 성격','인간 > 태도','인간 > 능력']),
 ('body','Cơ thể và giác quan','신체',['bộ phận','ngoại hình'],['인간 > 신체 부위','인간 > 신체 내부','인간 > 용모','인간 > 감각','인간 > 생리','인간 > 신체 변화']),
 ('health','Sức khỏe và y tế','건강',['bệnh viện','bệnh','thuốc'],['삶 > 병','삶 > 약품','삶 > 치료','인간 > 체력']),
 ('clothes','Quần áo và làm đẹp','의복',['thời trang','trang phục','giày'],['의생활']),
 ('home','Nhà cửa và đồ dùng','주생활',['nhà ở','phòng','nội thất'],['주생활 > 주거','주생활 > 주택','주생활 > 건물','주생활 > 생활']),
 ('housework','Việc nhà','가사',['dọn dẹp','lau rửa'],['주생활 > 가사']),
 ('transport','Đi lại và phương tiện','교통',['giao thông','xe','du lịch'],['사회 생활 > 교통']),
 ('communication','Giao tiếp và truyền thông','소통',['điện thoại','tin tức','internet'],['사회 생활 > 언어','사회 생활 > 통신','사회 생활 > 매체','사회 생활 > 소통','사회 생활 > 말']),
 ('nature','Thiên nhiên và địa lý','자연',['núi','biển','môi trường'],['자연 > 지형','자연 > 지표','자연 > 자원','자연 > 천체','개념 > 지역']),
 ('weather','Thời tiết và khí hậu','날씨',['mùa','mưa','nắng','nhiệt độ'],['자연 > 기상','자연 > 재해','개념 > 온도']),
 ('animals','Động vật','동물',['thú','chim','côn trùng'],['동식물 > 동물','동식물 > 곤충']),
 ('plants','Thực vật','식물',['cây','hoa','rau'],['동식물 > 식물','동식물 > 동식물']),
 ('culture','Văn hóa và truyền thống','문화',['phong tục','lễ hội','Hàn Quốc'],['문화 > 전통','문화 > 대중','문화 > 문화']),
 ('arts','Nghệ thuật và giải trí','예술',['âm nhạc','văn học','hội họa','phim'],['문화 > 음악','문화 > 문학','문화 > 미술','문화 > 예술']),
 ('leisure','Sở thích và thời gian rảnh','여가',['du lịch','cuối tuần','nghỉ ngơi'],['삶 > 여가']),
 ('sports','Thể thao','스포츠',['vận động','tập luyện'],['스포츠']),
 ('science','Khoa học và công nghệ','과학',['kỹ thuật','máy móc'],['과학']),
 ('politics','Chính trị và hành chính','정치',['nhà nước','công cộng'],['정치와 행정 > 정치','정치와 행정 > 공공']),
 ('law','Pháp luật và an toàn','법',['cảnh sát','tòa án','an ninh'],['정치와 행정 > 사법','정치와 행정 > 무기']),
 ('religion','Tôn giáo và tín ngưỡng','종교',['tâm linh'],['종교']),
 ('thinking','Suy nghĩ và nhận thức','인지',['hiểu biết','trí nhớ','ý tưởng'],['인간 > 인지']),
 ('actions','Hành động thường ngày','행위',['động tác','sinh hoạt'],['인간 > 신체 행위','인간 > 신체에','삶 > 일상','삶 > 삶의 행위']),
 ('people','Con người và xưng hô','사람',['người','đại từ'],['인간 > 사람','개념 > 인칭']),
 ('space','Vị trí và phương hướng','방향',['đường đi','trái','phải'],['개념 > 위치']),
 ('description','Miêu tả và tính chất','성질',['hình dạng','màu sắc','ánh sáng','đặc điểm'],['개념 > 성질','개념 > 모양','개념 > 색깔','개념 > 밝기','인간 > 소리']),
 ('quantity','Số lượng và mức độ','수량',['con số','đếm','tốc độ'],['개념 > 수','개념 > 양','개념 > 정도','개념 > 세는','개념 > 속도']),
 ('grammar','Từ nối và từ chức năng','접속',['ngữ pháp','chỉ định','nghi vấn'],['개념 > 접속','개념 > 지시','개념 > 의문']),
 ('other','Từ thông dụng khác','기타',['từ vựng cơ bản'],[]),
]

def get_topics(record):
    ids = [item[0] for item in TOPICS if item[4] and any(cat.startswith(prefix) for prefix in item[4] for cat in record['categories'])]
    return ids or ['other']

groups = collections.defaultdict(list)
for line in (ROOT / '.source-cache/krdict-candidates.jsonl').open(encoding='utf-8'):
    entry = json.loads(line)
    if entry['grade'] in ('초급','중급'):
        groups[entry['word']].append(entry)

pos = {'명사':'Danh từ','의존 명사':'Danh từ phụ thuộc','동사':'Động từ','형용사':'Tính từ','부사':'Trạng từ','관형사':'Định từ','대명사':'Đại từ','수사':'Số từ','감탄사':'Thán từ','조사':'Trợ từ','보조 동사':'Trợ động từ','보조 형용사':'Tính từ bổ trợ','접사':'Phụ tố','어미':'Đuôi từ','품사 없음':'Cụm từ'}
entries = []
for word, records in groups.items():
    records.sort(key=lambda row: (row['grade'] != '초급', int(row['id'].split('-')[1])))
    senses = []
    for record in records:
        topics = get_topics(record)
        for sense in record['senses']:
            if not sense['examples']:
                continue
            senses.append({**sense, 'sourceId': record['id'], 'pos': pos.get(record['pos'], record['pos']), 'topicIds': topics, 'sourceUrl': record['sourceUrl'], 'pronunciation': record['pronunciation'], 'usageNotes': list(dict.fromkeys(record['usageNotes'] + sense['usageNotes']))})
    # Preserve one sense per lexical entry before additional senses, so homonyms
    # remain available under their correct semantic topics.
    primary = []
    seen_sources = set()
    for sense in senses:
        if sense['sourceUrl'] not in seen_sources:
            primary.append(sense); seen_sources.add(sense['sourceUrl'])
    primary += [sense for sense in senses if sense not in primary]
    primary = primary[:10]
    first = primary[0]
    entries.append({'id': records[0]['id'], 'word': word, 'meaning': first['meaning'], 'definition': first['definition'], 'pos': first['pos'], 'level': 'Sơ cấp' if records[0]['grade'] == '초급' else 'Trung cấp', 'topicIds': list(dict.fromkeys(t for sense in primary for t in sense['topicIds'])), 'examples': first['examples'], 'collocations': first['collocations'], 'usageNotes': first['usageNotes'], 'sourceUrl': first['sourceUrl'], 'pronunciation': first['pronunciation'], 'senses': primary})

entries.sort(key=lambda entry: (entry['level'] != 'Sơ cấp', entry['word']))
used = {topic_id for entry in entries for topic_id in entry['topicIds']}
topics = [{'id':'all','title':'Tất cả từ vựng','korean':'전체','aliases':['tất cả','tổng hợp','toàn bộ']}] + [{'id':item[0],'title':item[1],'korean':item[2],'aliases':item[3]} for item in TOPICS if item[0] in used]
catalog = {
    'format':'haru-vocabulary','version':1,'catalogVersion':'2026.11-krdict-20261019',
    'title':'Từ vựng Hàn–Việt sơ cấp và trung cấp',
    'source':{'author':'National Institute of Korean Language (국립국어원)', 'title':'한국어기초사전 / Từ điển tiếng Hàn cơ sở', 'url':'https://krdict.korean.go.kr/vie/mainAction','downloadUrl':'https://krdict.korean.go.kr/dicBatchDownload?seq=220','snapshot':'2026-10-19', 'license':'CC BY-SA 2.0 KR','licenseUrl':'https://creativecommons.org/licenses/by-sa/2.0/kr/','policyUrl':'https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo', 'changes':'Haru: chọn mục sơ/trung cấp có nghĩa Việt và ví dụ; gộp mục trùng chính tả; rút gọn số nghĩa/ví dụ; dịch nhãn chủ đề và từ loại. Không dịch máy hoặc sửa câu ví dụ gốc. Không sao chép âm thanh/hình ảnh.'},
    'entryCount':len(entries),'topics':topics,'entries':entries,
}
assert len(entries) >= 5000
assert len({e['word'] for e in entries}) == len(entries)
assert all(e['meaning'] and e['examples'] and e['topicIds'] for e in entries)
out = ROOT / 'data'; out.mkdir(exist_ok=True)
payload = json.dumps(catalog,ensure_ascii=False,separators=(',',':')).encode('utf-8')
(out / 'vocabulary.json').write_bytes(payload)
(out / 'vocabulary.sha256').write_text(hashlib.sha256(payload).hexdigest()+'  vocabulary.json\n',encoding='utf-8')
counts = {t['id']:sum(1 for e in entries if t['id']=='all' or t['id'] in e['topicIds']) for t in topics}
print(json.dumps({'uniqueWords':len(entries),'topics':len(topics)-1,'bytes':len(payload),'withExamples':sum(bool(e['examples']) for e in entries),'withUsageNotes':sum(bool(e['usageNotes'] or e['collocations']) for e in entries),'topicCounts':counts},ensure_ascii=False,indent=2))
