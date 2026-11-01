"""Extract text-only Vietnamese KRDICT records from the official bulk ZIP.
Source and derivative data: NIKL, CC BY-SA 2.0 KR. No audio/media is copied.
"""
import collections
import html
import io
import json
import pathlib
import re
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / '.source-cache'

def array(value):
    return value if isinstance(value, list) else [] if value is None else [value]

def clean(value):
    return re.sub(r'\s+', ' ', html.unescape(str(value or ''))).strip()

def features(value):
    result = collections.defaultdict(list)
    for item in array(value.get('feat')) if isinstance(value, dict) else []:
        key, val = item.get('att'), clean(item.get('val'))
        if key and val:
            result[key].append(val)
    return result

def first(fields, name, default=''):
    return next(iter(fields.get(name, [])), default)

with zipfile.ZipFile(CACHE / 'krdict-202610.zip') as archive, (CACHE / 'krdict-candidates.jsonl').open('w', encoding='utf-8') as output:
    stats = collections.Counter()
    categories = collections.Counter()
    grade_categories = collections.Counter()
    all_feature_values = collections.defaultdict(collections.Counter)
    for name in archive.namelist():
        source = json.load(io.TextIOWrapper(archive.open(name), encoding='utf-8-sig'))
        for entry in source['LexicalResource']['Lexicon']['LexicalEntry']:
            stats['source_records'] += 1
            fields = features(entry)
            for key, vals in fields.items():
                all_feature_values[key].update(vals)
            word = first(features(entry.get('Lemma', {})), 'writtenForm')
            if not re.search('[가-힣]', word) or first(fields, 'lexicalUnit') != '단어':
                continue
            senses = []
            for sense in array(entry.get('Sense')):
                translation = next((features(e) for e in array(sense.get('Equivalent')) if first(features(e), 'language') == '베트남어'), None)
                if not translation:
                    continue
                lemma, definition = first(translation, 'lemma'), first(translation, 'definition')
                if not definition:
                    continue
                if not lemma or re.search(r'không.*tương.*ứng', lemma, re.I):
                    lemma = definition
                examples = []
                collocations = []
                for block in array(sense.get('SenseExample')):
                    example = features(block)
                    kind = first(example, 'type')
                    lines = example.get('example', [])
                    text = '\n'.join(lines) if kind == '대화' else ' '.join(lines)
                    if not text:
                        continue
                    if kind in ('문장', '대화'):
                        examples.append({'text': text, 'type': 'dialogue' if kind == '대화' else 'sentence'})
                    elif kind == '구':
                        collocations.extend(lines)
                sf = features(sense)
                notes = sf.get('annotation', []) + sf.get('syntacticAnnotation', []) + sf.get('syntacticPattern', [])
                senses.append({'number': str(sense.get('val', '')), 'meaning': lemma, 'definition': definition, 'examples': examples[:2], 'collocations': collocations[:3], 'usageNotes': list(dict.fromkeys(notes))[:3]})
            if not senses or not senses[0]['examples']:
                continue
            grade = first(fields, 'vocabularyLevel')
            categories.update(fields.get('semanticCategory', []))
            if grade in ('초급', '중급', '고급'):
                grade_categories.update(fields.get('semanticCategory', []))
            stats[grade or 'ungraded'] += 1
            pronunciation = ''
            for form in array(entry.get('WordForm')):
                wf = features(form)
                if first(wf, 'type') == '발음':
                    pronunciation = first(wf, 'pronunciation')
                    if pronunciation:
                        break
            record = {'id': f"nikl-{entry['val']}", 'word': word, 'meaning': senses[0]['meaning'], 'definition': senses[0]['definition'], 'pos': first(fields, 'partOfSpeech'), 'grade': grade, 'pronunciation': pronunciation, 'categories': fields.get('semanticCategory', []), 'usageNotes': fields.get('annotation', []), 'senses': senses[:3], 'sourceUrl': f"https://krdict.korean.go.kr/vie/dicSearch/SearchView?ParaWordNo={entry['val']}"}
            output.write(json.dumps(record, ensure_ascii=False, separators=(',', ':')) + '\n')
            stats['candidates'] += 1
        print('Read', name, 'candidates', stats['candidates'], flush=True)
        del source
    (CACHE / 'krdict-stats.json').write_text(json.dumps({'stats': stats, 'categories': categories, 'gradedCategories': grade_categories, 'featureValues': {key: val for key, val in all_feature_values.items() if key != 'writtenForm'}}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(stats, ensure_ascii=False))
