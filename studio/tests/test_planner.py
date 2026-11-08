import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from planner import segment,shots_from,cast_from,literal_guards
from engine import validate_board,CONFIG

class PlanningTests(unittest.TestCase):
    def test_original_narration_survives_segmentation(self):
        story='Đêm ấy, Hạnh về làng.\n\n“Mẹ ơi… con về rồi!”\n\n'+('Không có tiếng trả lời. '*50)+'</script>'
        self.assertEqual(''.join(story.split()),''.join(''.join(s['text'] for s in segment(story)).split()))
    def test_ai_cannot_omit_or_duplicate_scenes(self):
        source=[{'id':'s1','text':'Một.'},{'id':'s2','text':'Hai.'}]
        with self.assertRaises(ValueError):shots_from([{'id':'s1'},{'id':'s1'}],source,{'c1':{}})
    def test_unknown_actor_is_rejected(self):
        with self.assertRaises(ValueError):shots_from([{'id':'s1','cast':[['stranger','idle','neutral']]}],[{'id':'s1','text':'Một.'}],{'c1':{}})
    def test_dialogue_speaker_does_not_become_the_listener(self):
        source=[{'id':'s1','text':'Lan nói: “Về đi.”','quotes':[{'id':'q0001','text':'“Về đi.”','start':9,'end':17}]}]
        rows=[{'id':'s1','cast':[['c1','idle','neutral']],'dialogue_speakers':{'q0001':'c2'}}]
        shots=shots_from(rows,source,{'c1':{'name':'Minh'},'c2':{'name':'Lan'}})
        self.assertEqual(shots[0]['dialogues'][0]['speaker'],'c2');self.assertEqual(shots[0]['actors'][0]['id'],'c1')
    def test_metadata_never_rewrites_narration(self):
        source=[{'id':'s1','text':'Không được sửa lời kể.'}]
        shots=shots_from([{'id':'s1','text':'Lời bịa ra.','location':'room','cast':[]}],source,{})
        self.assertEqual(shots[0]['text'],source[0]['text'])
    def test_literal_standing_and_night_are_respected(self):
        cast=cast_from([{'id':'c1','name':'Minh'},{'id':'c2','name':'Lan'}])
        s={'text':'Đêm ấy, Minh bước vào sân. Lan đứng trước cổng.','lighting':'day','actors':[{'id':'c2','action':'walk','expression':'angry','toX':700}]}
        result=literal_guards(s,cast)
        self.assertEqual(result['lighting'],'night');self.assertEqual(result['actors'][0]['action'],'idle')
    def test_living_actor_does_not_float_and_time_continues(self):
        cast=cast_from([{'id':'c1','name':'Minh'}])
        result=shots_from([{'id':'s1','light':'dusk','cast':[['c1','float','neutral']]}],[{'id':'s1','text':'Minh đứng im bên cửa.'}],cast,previous_light='night')
        self.assertEqual(result[0]['lighting'],'night');self.assertEqual(result[0]['effect'],'none');self.assertEqual(result[0]['actors'][0]['action'],'idle')
    def test_user_cannot_choose_arbitrary_engine_or_file(self):
        p={'title':'Test','voice':CONFIG['voice'],'cast':cast_from([{'id':'c1','name':'Lan'}]),'shots':[{'id':'s1','text':'Đây là một cảnh.','setting':'room','lighting':'night','camera':'wide','actors':[],'engine':'C:/bad.js','background':'C:/secret.txt'}]}
        clean=validate_board(p)
        self.assertNotIn('engine',clean['shots'][0]);self.assertEqual(clean['shots'][0]['background'],'library/room-night.svg')

if __name__=='__main__':unittest.main()
