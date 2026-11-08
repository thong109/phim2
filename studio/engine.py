"""Adapter to the reusable, project-owned video pipeline."""
import importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent
sys.path.insert(0,str(ROOT/'pipeline/scripts'))
spec=importlib.util.spec_from_file_location('film_pipeline',ROOT/'pipeline/scripts/studio.py')
PIPE=importlib.util.module_from_spec(spec);spec.loader.exec_module(PIPE)
CONFIG=PIPE.read(ROOT/'pipeline/assets/local-defaults.json')
if (ROOT/'settings.json').exists():CONFIG.update(PIPE.read(ROOT/'settings.json'))
LOCATIONS=['room','courtyard','warehouse','village','kitchen','altar','street','balcony','hallway']
PIPE.SETTINGS.update(LOCATIONS)
ACTIONS=['idle','walk','talk','sit','point','scared','sleep','float']
EMOTIONS=['neutral','happy','sad','scared','angry']
BACKGROUNDS={('room','day'):'room-day.svg',('room','dusk'):'room-night.svg',('room','night'):'room-night.svg',('warehouse','day'):'warehouse-inside.svg',('warehouse','dusk'):'warehouse-inside.svg',('warehouse','night'):'warehouse-inside.svg',('courtyard','day'):'house-day.svg',('courtyard','dusk'):'courtyard-night.svg',('courtyard','night'):'courtyard-night.svg',('village','day'):'village-day.svg'}
def apply_background(shot):
    name=BACKGROUNDS.get((shot['setting'],shot['lighting']))
    if name:shot['background']='library/'+name
    else:shot.pop('background',None)
    return shot

def validate_board(p):
    if not isinstance(p,dict):raise ValueError('Cấu hình cảnh không hợp lệ.')
    p={k:p[k] for k in ['version','title','voice','speed','width','height','fps','subtitles','cast','shots','planning_backend','warnings'] if k in p}
    p.update(version=1,source_story='story.txt',renderer='canvas',capture_fps=12,fps=24)
    if p.get('voice') not in PIPE.voices(CONFIG):raise ValueError('Giọng đọc chưa được cài trên máy.')
    if len(p.get('cast',{}))>12:raise ValueError('Tối đa 12 nhân vật mỗi tập.')
    shots=[]
    for s in p.get('shots',[]):
        v={k:s[k] for k in ['id','text','setting','lighting','camera','focusX','effect','pause','subtitles','actors','dialogues'] if k in s}
        if not isinstance(v.get('actors',[]),list):raise ValueError('Danh sách nhân vật không hợp lệ.')
        v['actors']=[{k:a[k] for k in ['id','x','y','scale','facing','action','expression','toX','speed','phase','look','walkDuration','speaking'] if k in a} for a in v.get('actors',[])]
        if len({a.get('id') for a in v['actors']})!=len(v['actors']):raise ValueError('Một nhân vật chỉ xuất hiện một lần trong mỗi cảnh.')
        shots.append(apply_background(v))
    p['shots']=shots
    from speech_sync import normalize_dialogues
    normalize_dialogues(p['shots'],p.get('cast',{}))
    PIPE.validate(p)
    if len(''.join(s['text'] for s in shots))>60000:raise ValueError('Kịch bản tối đa 60.000 ký tự.')
    return p
